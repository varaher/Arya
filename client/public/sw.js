const CACHE_NAME = 'arya-pwa-v6';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Do NOT call skipWaiting() here.
  // The app controls when to activate a new version via the SKIP_WAITING message,
  // so users get a proper "Update available" prompt instead of a silent mid-session swap.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// The React app sends this when the user clicks "Update now"
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  const isAsset = /\.(js|css|png|jpg|svg|woff2?|ttf|ico|json)(\?.*)?$/.test(url.pathname);
  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// =============================================
// PUSH NOTIFICATION HANDLER — Alarm & Reminder
// =============================================

const ALARM_TAG    = 'arya-alarm';
const REMINDER_TAG = 'arya-reminder';

function safeAppUrl(value) {
  try {
    const resolved = new URL(value || '/', self.location.origin);
    if (resolved.origin !== self.location.origin) return '/';
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return '/';
  }
}

function requestWithActionToken(url, options, actionToken) {
  const headers = new Headers(options?.headers || {});
  if (actionToken) headers.set('x-arya-notification-action', actionToken);
  return fetch(url, { ...options, headers, credentials: 'same-origin' });
}

async function openOrFocusApp(targetUrl, message) {
  const safeUrl = safeAppUrl(targetUrl);
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  const existing = clientList.find((client) => client.url.startsWith(self.location.origin));
  if (existing) {
    if (message) existing.postMessage(message);
    const current = new URL(existing.url);
    if (`${current.pathname}${current.search}${current.hash}` !== safeUrl && 'navigate' in existing) {
      await existing.navigate(safeUrl);
    }
    return existing.focus();
  }
  return clients.openWindow ? clients.openWindow(safeUrl) : undefined;
}

function showActionFailure(message) {
  return self.registration.showNotification("ARYA couldn't update that", {
    body: message || "Open ARYA to manage it directly.",
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'arya-notification-action-failed',
    requireInteraction: false,
  });
}

self.addEventListener('push', (event) => {
  let data = { title: 'ARYA', body: '', type: 'reminder', icon: '/icons/icon-192.png', url: '/', actionToken: null };
  try {
    if (event.data) data = { ...data, ...JSON.parse(event.data.text()) };
  } catch (e) {}

  const isAlarm = data.type === 'alarm';

  // Include card image if provided by scheduler
  const cardImage = data.image || undefined;

  const notifOptions = isAlarm
    ? {
        body: data.body || data.message || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...(cardImage ? { image: cardImage } : {}),
        vibrate: [500, 200, 500, 200, 500, 400, 200, 400, 500, 200, 500],
        requireInteraction: true,
        silent: false,
        renotify: true,
        tag: ALARM_TAG,
        actions: [
          { action: 'dismiss',   title: '✓ Dismiss' },
          { action: 'snooze_5',  title: '⏰ Snooze 5 min' },
          { action: 'snooze_10', title: '⏰ Snooze 10 min' },
        ],
        data: { reminderId: data.reminderId, type: 'alarm', url: safeAppUrl(data.url), actionToken: data.actionToken },
      }
    : {
        body: data.body || data.message || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...(cardImage ? { image: cardImage } : {}),
        vibrate: [200, 100, 200],
        requireInteraction: false,
        silent: false,
        renotify: true,
        tag: `${REMINDER_TAG}-${data.reminderId || Date.now()}`,
        actions: data.actions || (data.reminderId ? [
          { action: 'dismiss',  title: '✓ Done' },
          { action: 'snooze_5', title: '⏰ Snooze 5 min' },
        ] : []),
        data: {
          reminderId: data.reminderId,
          type: data.type,
          goalId: data.goalId,
          url: safeAppUrl(data.url),
          actionToken: data.actionToken,
        },
      };

  event.waitUntil(
    // Notify any open app windows so they can show the in-app overlay
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({
          type: 'ALARM_FIRING',
          reminderType: data.type,
          reminderId: data.reminderId,
          title: data.title,
          body: data.body || data.message || '',
        });
      }
      return self.registration.showNotification(data.title, notifOptions);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action      = event.action;
  const notifData   = event.notification.data || {};
  const reminderId  = notifData.reminderId;
  const url         = safeAppUrl(notifData.url);

  // Snooze actions
  if (action === 'snooze_5' || action === 'snooze_10') {
    const minutes   = action === 'snooze_5' ? 5 : 10;
    const snoozeAt  = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    event.waitUntil(
      requestWithActionToken('/api/reminders/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId, snoozeUntil: snoozeAt, minutes }),
      }, notifData.actionToken).then((response) => {
        if (!response.ok) throw new Error(`Snooze request failed: ${response.status}`);
        return self.registration.showNotification(`Snoozed ${minutes} min`, {
          body: `ARYA will remind you again at ${new Date(snoozeAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
          icon: '/icons/icon-192.png',
          vibrate: [100],
          requireInteraction: false,
          silent: true,
          tag: 'arya-snooze-confirm',
        });
      }).catch(() => showActionFailure("Your reminder was not snoozed. Open ARYA to try again."))
    );
    return;
  }

  // Goal check-in — evening notification actions (yes / no / skip)
  if (notifData.type === 'goal_checkin') {
    const goalId = notifData.goalId;
    if (action === 'yes') {
      event.waitUntil(
        requestWithActionToken(`/api/user/goals/${encodeURIComponent(goalId)}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        }, notifData.actionToken).then((response) => {
          if (!response.ok) return showActionFailure("Your goal check-in was not saved. Open ARYA to try again.");
          return undefined;
        }).catch(() => showActionFailure("Your goal check-in was not saved. Open ARYA to try again."))
      );
      return;
    }
    if (action === 'skip') {
      event.waitUntil(
        requestWithActionToken(`/api/user/goals/${encodeURIComponent(goalId)}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipped: true }),
        }, notifData.actionToken).then((response) => {
          if (!response.ok) return showActionFailure("Your goal check-in was not saved. Open ARYA to try again.");
          return undefined;
        }).catch(() => showActionFailure("Your goal check-in was not saved. Open ARYA to try again."))
      );
      return;
    }
    // 'no' or default tap — open ARYA with goal context
    event.waitUntil(openOrFocusApp(`${url}${url.includes('?') ? '&' : '?'}context=missed`));
    return;
  }

  // New card actions — open_arya, voice_chat, listen
  if (action === 'open_arya') {
    event.waitUntil(openOrFocusApp('/'));
    return;
  }

  if (action === 'voice_chat') {
    event.waitUntil(openOrFocusApp('/?voice=true', { type: 'OPEN_VOICE_MODE' }));
    return;
  }

  if (action === 'listen') {
    event.waitUntil(openOrFocusApp('/?tab=drishya&autoplay=true', { type: 'OPEN_DRISHYA_AUTOPLAY' }));
    return;
  }

  // Trial upgrade action — open pricing page
  if (action === 'upgrade') {
    event.waitUntil(openOrFocusApp('/pricing', { type: 'NAVIGATE', url: '/pricing' }));
    return;
  }

  // Dismiss action
  if (action === 'dismiss') {
    if (reminderId) {
      event.waitUntil(
        requestWithActionToken(
          `/api/reminders/${encodeURIComponent(reminderId)}/dismiss`,
          { method: 'POST' },
          notifData.actionToken,
        ).then((response) => {
          if (!response.ok) return showActionFailure("Your reminder was not dismissed. Open ARYA to try again.");
          return undefined;
        }).catch(() => showActionFailure("Your reminder was not dismissed. Open ARYA to try again."))
      );
    }
    return;
  }

  // Default tap — focus or open the app
  event.waitUntil(openOrFocusApp(url));
});

// Background sync — for offline snooze replay
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(
      fetch('/api/reminders/sync', { method: 'POST' }).catch(() => {})
    );
  }
});

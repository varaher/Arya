const CACHE_NAME = 'arya-pwa-v5';
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

self.addEventListener('push', (event) => {
  let data = { title: 'ARYA', body: '', type: 'reminder', icon: '/icons/icon-192.png', url: '/' };
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
        data: { reminderId: data.reminderId, type: 'alarm', url: data.url || '/' },
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
        actions: data.actions || [
          { action: 'dismiss',  title: '✓ Done' },
          { action: 'snooze_5', title: '⏰ Snooze 5 min' },
        ],
        data: { reminderId: data.reminderId, type: data.type, goalId: data.goalId, url: data.url || '/' },
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
  const url         = notifData.url || '/';

  // Snooze actions
  if (action === 'snooze_5' || action === 'snooze_10') {
    const minutes   = action === 'snooze_5' ? 5 : 10;
    const snoozeAt  = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    event.waitUntil(
      fetch('/api/reminders/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId, snoozeUntil: snoozeAt, minutes }),
      }).then(() =>
        self.registration.showNotification(`Snoozed ${minutes} min`, {
          body: `ARYA will remind you again at ${new Date(snoozeAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
          icon: '/icons/icon-192.png',
          vibrate: [100],
          requireInteraction: false,
          silent: true,
          tag: 'arya-snooze-confirm',
        })
      ).catch(() => {})
    );
    return;
  }

  // Goal check-in — evening notification actions (yes / no / skip)
  if (notifData.type === 'goal_checkin') {
    const goalId = notifData.goalId;
    if (action === 'yes') {
      event.waitUntil(
        fetch(`/api/user/goals/${goalId}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        }).catch(() => {})
      );
      return;
    }
    if (action === 'skip') {
      event.waitUntil(
        fetch(`/api/user/goals/${goalId}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipped: true }),
        }).catch(() => {})
      );
      return;
    }
    // 'no' or default tap — open ARYA with goal context
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(`/?goalId=${goalId}&context=missed`);
      })
    );
    return;
  }

  // New card actions — open_arya, voice_chat, listen
  if (action === 'open_arya') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow('/');
      })
    );
    return;
  }

  if (action === 'voice_chat') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'OPEN_VOICE_MODE' });
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow('/?voice=true');
      })
    );
    return;
  }

  if (action === 'listen') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'OPEN_DRISHYA_AUTOPLAY' });
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow('/?tab=drishya&autoplay=true');
      })
    );
    return;
  }

  // Trial upgrade action — open pricing page
  if (action === 'upgrade') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'NAVIGATE', url: '/pricing' });
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow('/pricing');
      })
    );
    return;
  }

  // Dismiss action
  if (action === 'dismiss') {
    if (reminderId) {
      fetch(`/api/reminders/${reminderId}/dismiss`, { method: 'POST' }).catch(() => {});
    }
    return;
  }

  // Default tap — focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Track notification close (lightweight — used for analytics/seen status)
self.addEventListener('notificationclose', (event) => {
  const reminderId = event.notification.data?.reminderId;
  if (reminderId) {
    fetch(`/api/reminders/${reminderId}/seen`, { method: 'POST' }).catch(() => {});
  }
});

// Background sync — for offline snooze replay
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(
      fetch('/api/reminders/sync', { method: 'POST' }).catch(() => {})
    );
  }
});

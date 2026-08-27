export async function getPushVapidKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-key");
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSetupResult {
  permission: NotificationPermission;
  supported: boolean;
  subscribed: boolean;
  error?: string;
}

export function supportsPushNotifications(): boolean {
  return typeof window !== "undefined"
    && window.isSecureContext
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

export async function getPushSetupStatus(): Promise<PushSetupResult> {
  if (!supportsPushNotifications()) {
    return { permission: "denied", supported: false, subscribed: false, error: "This app installation does not support web notifications." };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      permission: Notification.permission,
      supported: true,
      subscribed: Boolean(subscription),
    };
  } catch {
    return { permission: Notification.permission, supported: true, subscribed: false, error: "ARYA could not connect this device to notifications." };
  }
}

export async function subscribeUserToPush(token: string): Promise<boolean> {
  try {
    if (!supportsPushNotifications()) return false;

    const vapidKey = await getPushVapidKey();
    if (!vapidKey) return false;

    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const sub = subscription.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: (sub.keys as any)?.p256dh,
        auth: (sub.keys as any)?.auth,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("[Push] Subscribe failed:", err);
    return false;
  }
}

export async function unsubscribeFromPush(token: string): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!response.ok) throw new Error("ARYA could not remove this device from notifications.");
      await subscription.unsubscribe();
    }
  } catch (err) {
    console.error("[Push] Unsubscribe failed:", err);
    throw err;
  }
}

export async function enablePushNotifications(token: string): Promise<PushSetupResult> {
  if (!supportsPushNotifications()) {
    return { permission: "denied", supported: false, subscribed: false, error: "This app installation does not support web notifications." };
  }

  if (Notification.permission === "granted") {
    const subscribed = await subscribeUserToPush(token);
    return {
      permission: "granted",
      supported: true,
      subscribed,
      ...(subscribed ? {} : { error: "Permission is allowed, but ARYA could not subscribe this device." }),
    };
  }
  if (Notification.permission === "denied") {
    return { permission: "denied", supported: true, subscribed: false };
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const subscribed = await subscribeUserToPush(token);
    return {
      permission,
      supported: true,
      subscribed,
      ...(subscribed ? {} : { error: "Permission is allowed, but ARYA could not subscribe this device." }),
    };
  }
  return { permission, supported: true, subscribed: false };
}

export async function requestNotificationPermission(token: string): Promise<NotificationPermission> {
  return (await enablePushNotifications(token)).permission;
}

export async function sendTestPushNotification(token: string): Promise<void> {
  const response = await fetch("/api/push/test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "ARYA could not send a test notification.");
  }
}

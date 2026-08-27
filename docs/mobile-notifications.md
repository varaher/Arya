# Mobile notification delivery

ARYA uses the browser Push API and its installed web app service worker to deliver reminders, goal check-ins, briefings, reflections, insights, and trial notices.

## Verify a Play Store installation

1. Sign in on the installed ARYA app.
2. Open **Reminders & Alarms** from the bell icon.
3. Tap **Enable notifications** and approve the Android permission.
4. Confirm that the panel says **Notifications enabled for this device**.
5. Tap **Send test**, then background ARYA within five seconds.
6. Confirm that the ARYA test notification appears, then tap it to reopen the app.

The test is intentionally delayed for five seconds so it can be tested while ARYA is in the background.

## Play Store packaging requirement

This repository contains a PWA and web-push implementation only. It can deliver notifications from an Android Play Store build when that build is a Trusted Web Activity (TWA) or another wrapper that preserves Chrome's service worker and Push API support.

If the installed Play Store app shows **Notifications unavailable in this app**, it is using a native WebView or a native shell without web-push support. The Android wrapper source must then add Firebase Cloud Messaging (FCM) or an equivalent native push bridge, register its device token with ARYA's server, and handle deep links for notification taps. That Android work cannot be completed from this repository because no Android wrapper project is present here.

## Delivery behavior

- ARYA stores every eligible notification in the in-app notification list and independently sends it to each subscribed device.
- Subscribed devices receive the operating-system notification whether ARYA is open, backgrounded, or closed, so no important notification is silently lost.
- Reminder and goal check-in actions carry short-lived signed action links, so they continue to work even when the regular app session is not accessible to the service worker.
- Expired device subscriptions are removed automatically when the push provider returns an expiry response.
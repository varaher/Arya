---
name: Mobile push action authorization
description: Authorization rule for ARYA notification actions that run from the service worker.
---

Background notification actions must use short-lived, signed action tokens bound to one user, resource, and allowed action. They must not depend on the normal ARYA session token.

**Why:** A service worker cannot safely read the app's browser-only session storage after the app is closed, and including a long-lived session credential in a push payload would expose it to notification delivery infrastructure.

**How to apply:** When adding an action that changes server state from a push notification, issue and validate a scoped token with an expiry; confirm the server response before showing an action-success notification.
---
"@cobaltcore-dev/aurora": patch
---

Fixes a race condition where router analytics subscription was being set up before the `onTrackEvent` callback was available in the router context. This prevented analytics events from being tracked properly.

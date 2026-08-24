---
"@cobaltcore-dev/aurora": minor
---

Remove the public `getAuthToken` endpoint that exposed raw OpenStack bearer tokens to JavaScript.

**Migration:** Clients must stop calling `getAuthToken`. Use the supported server-side authenticated flow instead of requesting raw OpenStack bearer tokens from JavaScript.

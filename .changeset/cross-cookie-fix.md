---
"@cobaltcore-dev/aurora": patch
"@cobaltcore-dev/dashboard": patch
---

fix(server): add COOKIE_HOST env var for correct cross-domain cookie sharing

When running behind a reverse proxy, the server may not see the correct hostname
from the request. Set `COOKIE_HOST` to the external hostname (e.g.,
`dashboard-aurora.qa-de-1.cloud.sap`) to ensure cookies are set with the correct
wildcard domain (e.g., `.qa-de-1.cloud.sap`) for cross-dashboard sharing.

---
"@cobaltcore-dev/aurora": minor
"@cobaltcore-dev/dashboard": patch
---

feat(server): replace crossDomainCookie with explicit cookieDomain config

**Breaking change:** `crossDomainCookie` and `ENABLE_CROSS_DASHBOARD_COOKIE` are removed.

Use the new `cookieDomain` config option (or `COOKIE_DOMAIN` env var) to explicitly set
the cookie domain for cross-subdomain sharing (e.g., `.qa-de-1.cloud.sap`).

When not set, cookies are host-specific (no cross-subdomain sharing).

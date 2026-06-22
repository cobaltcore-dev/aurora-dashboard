---
"@cobaltcore-dev/aurora": patch
---

Fix cookie name configuration not being respected from env var. `DASHBOARD_COOKIE_NAME`, `ENABLE_CROSS_DASHBOARD_COOKIE`, and `INSECURE_COOKIES` env vars are now correctly forwarded by the OSS consumer. The default cookie name is defined once in `SessionCookie` and exported as `DEFAULT_COOKIE_NAME` for use throughout the package.

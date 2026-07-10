---
"@cobaltcore-dev/aurora": patch
---

fix(aurora): distinguish between 401 UNAUTHORIZED and 403 FORBIDDEN errors

Improved error handling to properly differentiate between authentication and authorization failures by utilizing the HTTP status code from Keystone responses.

**Breaking change for API consumers:**
- `protectedProcedure` now throws `FORBIDDEN` (403) instead of `UNAUTHORIZED` (401) when the user is authenticated but lacks permission (e.g., statusCode === 403 from Keystone)
- `projectScopedProcedure` now throws `FORBIDDEN` (403) instead of `UNAUTHORIZED` (401) when rescoping fails due to missing role assignment

**Benefits:**
- 401 (UNAUTHORIZED): No or invalid authentication → client can redirect to login
- 403 (FORBIDDEN): Authenticated but lacks permission → client can show "Access Denied" message

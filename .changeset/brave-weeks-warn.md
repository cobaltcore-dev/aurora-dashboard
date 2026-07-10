---
"@cobaltcore-dev/aurora": patch
---

fix(aurora): distinguish between 401 UNAUTHORIZED and 403 FORBIDDEN errors

Improved error handling to properly differentiate between authentication and authorization failures by utilizing the HTTP status code from Keystone responses.

**Changes:**
- `protectedProcedure` now returns more accurate HTTP status codes based on Keystone responses (403 for permission issues, 401 for authentication issues)
- `projectScopedProcedure` now throws `FORBIDDEN` (403) when rescoping fails due to missing role assignment (previously threw `UNAUTHORIZED`)

**Benefits:**
- 401 (UNAUTHORIZED): No or invalid authentication → client can redirect to login
- 403 (FORBIDDEN): Authenticated but lacks permission → client can show "Access Denied" message

This provides better semantic error codes that align with HTTP standards and improve client-side error handling.

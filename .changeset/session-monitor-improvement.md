---
"@cobaltcore-dev/aurora": patch
---

Consolidate session expiration logic and fix session handling edge cases.

- Both immediate-expiry and timeout branches now call `logout()` for consistent logout handling
- Remove redundant `getCurrentUserSession` fetch in the `/_auth` route guard (session is still probed in the "/" route loader on refresh)
- Fix _auth route to preserve query params in redirect without trailing "?" when empty
- Add comprehensive tests for AuthProvider and _auth route redirect

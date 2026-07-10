---
"@cobaltcore-dev/aurora": patch
---

Consolidate session expiration logic and fix session handling edge cases.

- Both immediate-expiry and timeout branches now call `logout()` for consistent logout handling
- Remove redundant `getCurrentUserSession` fetch in the `/_auth` route guard (session is still probed in the "/" route loader on refresh)
- Use `location.searchStr` in _auth route to preserve exact redirect URL including hash fragments and avoid URLSearchParams re-serialization edge cases
- Add comprehensive tests for AuthProvider and _auth route redirect

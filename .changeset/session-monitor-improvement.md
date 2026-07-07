---
"@cobaltcore-dev/aurora": patch
---

Consolidate session expiration logic and fix session handling edge cases.

- Both immediate-expiry and timeout branches now call `logout()` for consistent logout handling
- Remove redundant `getCurrentUserSession` fetch in the `/_auth` route guard (session is still probed in the "/" route loader on refresh)
- Fix _auth route to preserve query params in redirect without trailing "?" when empty
- Fix sessionCookieProcedure to check cookie existence directly, not ctx.openstack (allows logout when Keystone is down)
- Fix terminateUserSession to await ctx.terminateSession() to ensure cookie deletion completes before response
- Fix trpcClient UNAUTHORIZED handler to skip redirect for auth.terminateUserSession (prevents loops)
- Fix trpcClient UNAUTHORIZED handler to preserve current URL in redirect query param
- Fix App.tsx error handler to only match chunk-loading errors (not all fetch failures)
- Add comprehensive tests for AuthProvider, _auth route redirect, and App error handler

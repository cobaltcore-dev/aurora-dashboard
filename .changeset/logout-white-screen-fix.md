---
"@cobaltcore-dev/aurora": patch
---

Fix logout white screen and server crash during session termination

- **Fixed server crash on logout:** Added try-catch around `openstackSession.terminate()` in server context to handle 404 errors when token is already invalid/expired. Previously, this unhandled error would crash the entire Node.js process, killing the dev server.
- **Fixed logout white screen:** Changed `router.invalidate()` to `router.navigate({ to: "/" })` in AuthProvider to properly navigate away from auth-protected routes after clearing auth state. `router.invalidate()` was triggering auth guard redirects mid-invalidation, causing race conditions.
- Added global error handler in App.tsx for chunk loading failures to show user-friendly error message with reload button instead of white screen when dev server crashes

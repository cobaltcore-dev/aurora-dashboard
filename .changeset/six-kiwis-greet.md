---
"@cobaltcore-dev/aurora": patch
---

Add CSRF token caching to tRPC client to reduce redundant /csrf-token fetches. Concurrent requests now share a single token fetch, and a new `invalidateCsrfToken()` export allows cache invalidation on 403 responses.

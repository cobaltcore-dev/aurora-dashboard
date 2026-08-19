---
"@cobaltcore-dev/aurora": patch
---

Scope upload progress by project and improve session invalidation
- Project-scope upload progress keys to prevent cross-tenant observation
- Require projectId for progress tracking (reject unscoped fallback)
- Validate uploadId format to prevent double-scoping attacks
- Fire session termination in background during auto-logout for immediate UX

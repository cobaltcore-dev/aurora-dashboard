---
"@cobaltcore-dev/aurora": patch
---

- Scope image upload progress tracking by projectId to prevent cross-tenant observation (keys now `projectId:uploadId` instead of bare `uploadId`)
- Validate uploadId format to reject colon-containing values (prevents double-scoping attacks)
- Move server session termination to non-blocking position in logout flow (immediate redirect, termination awaited after)
- Clear local session state even when logout server call fails

---
"@cobaltcore-dev/aurora": patch
---

- Scope image upload progress tracking by projectId to prevent cross-tenant observation (keys now `projectId:uploadId` instead of bare `uploadId`)
- Validate uploadId format to reject colon-containing values (prevents double-scoping attacks)
- Await server session termination before redirect in logout flows; errors now shown to user instead of silently swallowed
- Clear local session state even when server termination fails

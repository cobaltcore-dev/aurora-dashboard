---
"@cobaltcore-dev/aurora": patch
---

Improve search architecture consistency and UX

- Remove duplicate `searchProjects` endpoint (unused by client)
- Unify flavor search to use shared `filterBySearchParams` helper
- Add ARIA live regions announcing search result counts for screen readers
- Distinguish empty states: "No X matching search" vs "No X available"

---
"@cobaltcore-dev/aurora": patch
---

- Standardize 15 deletion/confirmation modals to use TanStack Form + `useModalTracking` instead of `useDeleteConfirmation` hook
- Zod schemas for validation with field-level error display
- Consistent analytics tracking (`.open`/`.close` events) across all modals

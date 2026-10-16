---
"@cobaltcore-dev/aurora": minor
---

Add Networks Management foundation - backend tRPC router and frontend list/detail views for OpenStack Neutron networks

- Network list now shows ID column with copy-to-clipboard, includes toolbar with item count and refresh button, and has proper Zone 1 placement for Create button
- Loading/error/empty states now replace the DataGrid instead of nesting inside it, following Juno guidelines
- Detail page includes back navigation button, allocation pools column in subnet table, and ErrorBoundary wrapper
- Search input is right-aligned in Zone 2 per Juno DataGrid patterns
- Remove redundant query key mapping in networksRouter
- Consistent null checks throughout detail view (use `!= null` pattern)

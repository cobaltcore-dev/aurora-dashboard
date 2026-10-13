---
"@cobaltcore-dev/aurora": minor
---

Add Neutron Networks management (BFF and read-only UI)

- Add `network.networks` tRPC BFF: `list` (the project's own networks and the networks shared with it, with search, status/shared/external/MTU/tag filters and sorting), `getById`, `create`, `update`, `delete`, `setTags` and `listSubnets`
- Resolve subnet names in the list with one batched best-effort lookup that falls back to subnet IDs
- Map network-specific Neutron errors (e.g. ports still in use on delete, sharing still in use, admin-only attributes, quota exceeded) to clear messages
- Add a "Networks" entry under Network in the side navigation and a "Networks" card on the project overview; both require `networks` in `enabledServices`
- Add a Networks list view (Name / ID, Status, Admin State, Subnets, Shared, External, MTU) with search, status and shared filters, sorting and pagination
- Add a network details view with copy-to-clipboard for IDs and a Subnets tab

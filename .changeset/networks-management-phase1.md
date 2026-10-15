---
"@cobaltcore-dev/aurora": minor
---

Add Networks Management foundation - backend tRPC router and frontend list/detail views for OpenStack Neutron networks

- Make network rows fully clickable and use the Status component for empty and no-matches states in the networks list
- Surface Neutron API errors with correct status codes and user-facing messages instead of generic 500s
- Lay out the network detail view with DescriptionList, copy-to-clipboard IDs and the `- -` empty-value placeholder, and search the list on submit instead of on every keystroke

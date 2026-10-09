---
"@cobaltcore-dev/aurora": minor
---

Add Neutron Ports management (BFF and read-only UI)

- Add `network.ports` tRPC BFF: `list` (current project, optionally scoped to one network via `network_id`, with search), `getById`, `create`, `update`, `delete`
- Resolve network, subnet and security group names with batched best-effort lookups that fall back to IDs, and add the IP version of every fixed IP
- Map port-specific Neutron errors (e.g. IP or MAC address already in use, port owned by a router, quota exceeded) to clear messages
- Add a "Ports" entry under Network in the side navigation and a "Ports" card on the project overview; both require `ports` in `enabledServices`
- Add a Ports list view (Name / ID, Description, Network, Fixed IPs / Subnet, Device Owner / ID, Status) with search, sorting and pagination; the list can be reused for a single network, which hides the Network column
- Add a port details view with copy-to-clipboard for IDs, IP addresses and the MAC address

---
"@cobaltcore-dev/aurora": minor
---

Add Neutron Ports management (BFF and read-only UI)

- Add `network.ports` tRPC BFF: `list` (current project, optionally scoped to one network via `network_id`, with search), `getById`, `create`, `update`, `delete`
- Resolve network, subnet and security group names with batched best-effort lookups that fall back to IDs, and add the IP version of every fixed IP
- Map port-specific Neutron errors (e.g. IP or MAC address already in use, port owned by a router, quota exceeded) to clear messages
- Add a "Ports" entry under Network in the side navigation and a "Ports" card on the project overview; both require `ports` in `enabledServices`
- Add a Ports list view (Status, Name / ID, Description, Network, Fixed IPs, Device Owner) with search, sorting and pagination; the list can be reused for a single network, which hides the Network column
- Add a port details view with copy-to-clipboard for IDs, IP addresses and the MAC address
- Show the port and router status as plain text in the first column of the list views
- Add a Status filter to the Ports and Routers lists (kept in the URL as `?status=`, shown as a removable pill); Ports filters client-side, Routers via the BFF `status` parameter
- On an expired session (401), the Ports and Routers list and details views redirect to sign-in and return to the page after authentication; unexpected errors show a generic message instead of the raw backend text
- Keep the active tab of the router details view in the URL (`?tab=`), so it is preserved on reload and when sharing a link

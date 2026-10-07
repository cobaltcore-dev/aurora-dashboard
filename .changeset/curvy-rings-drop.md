---
"@cobaltcore-dev/aurora": minor
"@cobaltcore-dev/dashboard": patch
---

Add Neutron Routers management (BFF and read-only UI)
 
- Add `network.routers` tRPC BFF:
  - Read: `list`, `getById`, `listInterfaces`, `listExtensions`
  - Write: `create`, `update`, `delete`
  - Gateway: `setGateway`, `clearGateway`
  - Interfaces: `addInterface`, `removeInterface`
- Enrich routers with external network, external subnet and private network names, and with the routers' private networks, using batched best-effort lookups that fall back to IDs
- Map router-specific Neutron errors (e.g. router still has interfaces, quota exceeded) to clear messages
- Add a "Routers" entry under Network in the side navigation and a "Routers" card on the project overview
- Add a Routers list view (Name, External Network, External Subnet, Private Network, Status) with search, sorting and pagination; only the router ID is shown in the list
- Add a router details view with an overview and External Networks / Internal Networks tabs

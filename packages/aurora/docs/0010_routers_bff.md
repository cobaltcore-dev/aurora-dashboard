# OpenStack Routers - BFF Implementation

This document describes the Backend for Frontend (BFF) implementation for OpenStack Neutron Router (L3) management in Aurora Portal. The implementation covers the router lifecycle, external gateway configuration and router interfaces, following OpenStack Neutron API v2.0.

## ✅ Verification Status

This implementation is aligned with the official OpenStack Neutron API documentation:

- Routers: https://docs.openstack.org/api-ref/network/v2/index.html#routers-routers
- Ports (router interfaces): https://docs.openstack.org/api-ref/network/v2/index.html#ports
- Extensions: https://docs.openstack.org/api-ref/network/v2/index.html#extensions

## Architecture Overview

### Backend (BFF Layer)

- **Router**: `apps/aurora-portal/src/server/Network/routers/routersRouter.ts`
- **Network Router Mount**: `apps/aurora-portal/src/server/Network/routers/index.ts`
- **Types & Schemas**: `apps/aurora-portal/src/server/Network/types/router.ts`
- **Helpers**: `apps/aurora-portal/src/server/Network/helpers/routerHelpers.ts`
- **Shared Error Handler**: `apps/aurora-portal/src/server/Network/helpers/errorHandling.ts`
- **Project Scoped Procedure**: `apps/aurora-portal/src/server/trpc.ts`

### Frontend (React)

- **Layout Route**: `apps/aurora-portal/src/client/routes/_auth/projects/$projectId/network/routers.tsx`
- **List Route**: `apps/aurora-portal/src/client/routes/_auth/projects/$projectId/network/routers/index.tsx`
- **Components**: `apps/aurora-portal/src/client/routes/_auth/projects/$projectId/network/routers/-components/`

## BFF API Endpoints

All procedures are mounted as `network.routers.*` and use `projectScopedProcedure`, so every input requires `project_id` and the OpenStack session is rescoped to that project.

### List Routers

Retrieves all routers for the scoped project. Supports Neutron filtering and sorting, plus BFF-side search, status and gateway filters.

**Procedure**: `network.routers.list`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/routers`

#### Parameters

Forwarded to Neutron:

| Parameter        | Type    | Description                                                                      | Required |
| ---------------- | ------- | -------------------------------------------------------------------------------- | -------- |
| `project_id`     | string  | Project UUID (also used for session rescoping)                                   | ✅ Yes   |
| `name`           | string  | Filter by router name                                                            | No       |
| `description`    | string  | Filter by description                                                            | No       |
| `admin_state_up` | boolean | Filter by administrative state                                                   | No       |
| `sort_key`       | enum    | `admin_state_up`, `flavor_id`, `id`, `name`, `status`, `project_id`, `tenant_id` | No       |
| `sort_dir`       | enum    | `asc` or `desc`                                                                  | No       |
| `tags`           | string  | Comma-separated tags (all must match)                                            | No       |
| `tags_any`       | string  | Comma-separated tags (any must match), sent as `tags-any`                        | No       |
| `not_tags`       | string  | Comma-separated tags to exclude (all), sent as `not-tags`                        | No       |
| `not_tags_any`   | string  | Comma-separated tags to exclude (any), sent as `not-tags-any`                    | No       |

Applied BFF-side (not sent to Neutron):

| Parameter     | Type    | Description                                                       |
| ------------- | ------- | ----------------------------------------------------------------- |
| `searchTerm`  | string  | Search by `id`, `name` or `description`                           |
| `status`      | string  | Filter by router status (case-insensitive)                        |
| `has_gateway` | boolean | `true` = only routers with an external gateway, `false` = without |

#### Response

Returns `RouterListItem[]`: routers from the Neutron envelope `{ routers: [...] }` with the external gateway enriched with names.

#### Private Networks and Name Enrichment

The router object only references the external network and subnets by ID, and contains no information about the internal (private) networks it is attached to. After BFF-side filtering, the BFF enriches the remaining routers with **batched requests for the whole list** (not per router):

1. **Private networks** - `GET /v2.0/ports?device_id=...&device_owner=...&fields=id&fields=device_id&fields=device_owner&fields=network_id`
   - `device_id` lists the router IDs, in chunks of 50 IDs per request to keep URLs short.
   - `device_owner` is restricted to interface ports (`network:router_interface`, `network:router_interface_distributed`, `network:ha_router_replicated_interface`), so gateway and SNAT ports are not returned.
   - Network IDs are grouped per router and deduplicated into `private_networks`.
2. **Names** - in parallel:
   - `GET /v2.0/networks?id=...&fields=id&fields=name` - one request for external **and** private networks; sets `external_gateway_info.network_name` and `private_networks[].network_name`
   - `GET /v2.0/subnets?id=...&fields=id&fields=name` - sets `external_gateway_info.external_fixed_ips[].subnet_name`

No request is made when there is nothing to look up. All lookups are best-effort, so the list is always returned:

| Failed lookup | Result                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| Ports         | `private_networks` is `undefined` (unknown), gateway names still resolved                                      |
| Networks      | Network names are `undefined`, UI shows network IDs                                                            |
| Subnets       | Subnet names are `undefined`, UI shows subnet IDs (e.g. external subnets not visible under the Neutron policy) |

`private_networks: []` means the router has no interfaces.

#### Error Handling

| HTTP Status | tRPC Code               | Message                       |
| ----------- | ----------------------- | ----------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access to Router |
| 403         | `FORBIDDEN`             | Access forbidden to Router    |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process Router      |

---

### Get Router by ID

Retrieves a single router.

**Procedure**: `network.routers.getById`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/routers/{router_id}`

#### Parameters

| Parameter   | Type   | Description | Required |
| ----------- | ------ | ----------- | -------- |
| `router_id` | string | Router UUID | ✅ Yes   |

#### Response

Returns a single `Router` object.

#### Error Handling

| HTTP Status | tRPC Code               | Message                           |
| ----------- | ----------------------- | --------------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access               |
| 403         | `FORBIDDEN`             | Access forbidden                  |
| 404         | `NOT_FOUND`             | Router {router_id} was not found. |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request         |

---

### Create Router

Creates a router, optionally with an external gateway.

**Procedure**: `network.routers.create`  
**Method**: Mutation  
**OpenStack Endpoint**: `POST /v2.0/routers`

#### Parameters

| Parameter                 | Type     | Description                                                                 | Required |
| ------------------------- | -------- | --------------------------------------------------------------------------- | -------- |
| `name`                    | string   | Router name (trimmed, 1–255 characters)                                     | ✅ Yes   |
| `description`             | string   | Description (max 255 characters)                                            | No       |
| `admin_state_up`          | boolean  | Administrative state                                                        | No       |
| `external_gateway_info`   | object   | External gateway, see [ExternalGatewayInfoInput](#externalgatewayinfoinput) | No       |
| `distributed`             | boolean  | Create as distributed router (requires `dvr`)                               | No       |
| `ha`                      | boolean  | Create as highly available router (requires `l3-ha`)                        | No       |
| `availability_zone_hints` | string[] | Availability zone candidates (requires `router_availability_zone`)          | No       |
| `enable_ndp_proxy`        | boolean  | Enable IPv6 NDP proxy (requires `router-extend-ndp-proxy`)                  | No       |

#### Important Notes

- `project_id` is **not** sent to Neutron. Ownership is derived from the rescoped token.
- Only provided fields are included in the request body.
- `enable_snat`, `external_fixed_ips`, `distributed` and `ha` are admin-only in the default Neutron policy.

#### Request Body Example

```json
{
  "router": {
    "name": "edge-router",
    "description": "Main edge router",
    "external_gateway_info": {
      "network_id": "ext-net-1",
      "external_fixed_ips": [{ "subnet_id": "ext-subnet-1" }]
    }
  }
}
```

#### Response

Returns the created `Router`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                                    |
| ----------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data                                                                                       |
| 401         | `UNAUTHORIZED`          | Unauthorized access                                                                                        |
| 403         | `FORBIDDEN`             | Access forbidden                                                                                           |
| 404         | `NOT_FOUND`             | The selected external network or subnet was not found.                                                     |
| 409         | `CONFLICT`              | Router quota exceeded (if Neutron reports OverQuota), otherwise: external IP already in use or no free IPs |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request                                                                                  |

---

### Update Router

Updates router attributes, including extra routes.

**Procedure**: `network.routers.update`  
**Method**: Mutation  
**OpenStack Endpoint**: `PUT /v2.0/routers/{router_id}`

#### Parameters

| Parameter          | Type                         | Description                                                          | Required |
| ------------------ | ---------------------------- | -------------------------------------------------------------------- | -------- |
| `router_id`        | string                       | Router UUID                                                          | ✅ Yes   |
| `name`             | string                       | Router name (1–255 characters)                                       | No       |
| `description`      | string                       | Description (max 255 characters)                                     | No       |
| `admin_state_up`   | boolean                      | Administrative state                                                 | No       |
| `routes`           | `{ destination, nexthop }[]` | Extra routes: destination CIDR + next-hop IP (requires `extraroute`) | No       |
| `distributed`      | boolean                      | Distributed flag (requires `dvr`)                                    | No       |
| `ha`               | boolean                      | HA flag (requires `l3-ha`)                                           | No       |
| `enable_ndp_proxy` | boolean                      | IPv6 NDP proxy (requires `router-extend-ndp-proxy`)                  | No       |

#### Important Notes

- At least one field must be provided, otherwise the BFF returns `BAD_REQUEST` ("No fields provided to update") without calling Neutron.
- `routes` **replaces** the complete list of extra routes. Send `[]` to remove all extra routes.
- `distributed` and `ha` can only be changed while the router's `admin_state_up` is `false`.
- External gateway changes use the dedicated [setGateway / clearGateway](#set--clear-external-gateway) procedures.

#### Request Body Example

```json
{
  "router": {
    "name": "edge-router-renamed",
    "routes": [{ "destination": "10.1.0.0/16", "nexthop": "10.0.0.5" }]
  }
}
```

#### Response

Returns the updated `Router`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                |
| ----------- | ----------------------- | -------------------------------------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data / No fields provided to update                                    |
| 401         | `UNAUTHORIZED`          | Unauthorized access                                                                    |
| 403         | `FORBIDDEN`             | Access forbidden                                                                       |
| 404         | `NOT_FOUND`             | Router {router_id} was not found.                                                      |
| 409         | `CONFLICT`              | Router state doesn't allow this change (distributed/HA only while admin state is DOWN) |
| 412         | `PRECONDITION_FAILED`   | Precondition failed - revision number mismatch                                         |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request                                                              |

---

### Set / Clear External Gateway

Sets or removes the router's external gateway.

**Procedures**: `network.routers.setGateway`, `network.routers.clearGateway`  
**Method**: Mutation  
**OpenStack Endpoint**: `PUT /v2.0/routers/{router_id}`

#### Parameters

`setGateway`:

| Parameter               | Type   | Description                                                                 | Required |
| ----------------------- | ------ | --------------------------------------------------------------------------- | -------- |
| `router_id`             | string | Router UUID                                                                 | ✅ Yes   |
| `external_gateway_info` | object | External gateway, see [ExternalGatewayInfoInput](#externalgatewayinfoinput) | ✅ Yes   |

`clearGateway`:

| Parameter   | Type   | Description | Required |
| ----------- | ------ | ----------- | -------- |
| `router_id` | string | Router UUID | ✅ Yes   |

#### Request Body Examples

```json
// setGateway
{ "router": { "external_gateway_info": { "network_id": "ext-net-1" } } }

// clearGateway
{ "router": { "external_gateway_info": {} } }
```

#### Response

Returns the updated `Router`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                                   |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data                                                                                      |
| 401         | `UNAUTHORIZED`          | Unauthorized access                                                                                       |
| 403         | `FORBIDDEN`             | Access forbidden                                                                                          |
| 404         | `NOT_FOUND`             | `setGateway`: router or external network not found; `clearGateway`: router not found                      |
| 409         | `CONFLICT`              | `setGateway`: external IP in use or no free IPs; `clearGateway`: floating IPs still associated via router |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request                                                                                 |

---

### Add / Remove Router Interface

Attaches or detaches an internal subnet or port.

**Procedures**: `network.routers.addInterface`, `network.routers.removeInterface`  
**Method**: Mutation  
**OpenStack Endpoints**:

- `PUT /v2.0/routers/{router_id}/add_router_interface`
- `PUT /v2.0/routers/{router_id}/remove_router_interface`

#### Parameters

| Parameter   | Type   | Description      | Required                       |
| ----------- | ------ | ---------------- | ------------------------------ |
| `router_id` | string | Router UUID      | ✅ Yes                         |
| `subnet_id` | string | Subnet to attach | One of `subnet_id` / `port_id` |
| `port_id`   | string | Port to attach   | One of `subnet_id` / `port_id` |

#### Important Notes

- Exactly one of `subnet_id` or `port_id` is required. Providing both or neither fails input validation before Neutron is called.
- The response body is **not** wrapped in a `router` key.

#### Request Body Example

```json
{ "subnet_id": "subnet-1" }
```

#### Response

Returns `RouterInterfaceInfo`:

```json
{
  "id": "router-1",
  "subnet_id": "subnet-1",
  "subnet_ids": ["subnet-1"],
  "port_id": "port-1",
  "network_id": "net-1",
  "project_id": "proj-1"
}
```

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                                        |
| ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | `addInterface`: subnet already attached, no gateway IP, or overlapping CIDR, with Neutron's detail appended    |
| 401         | `UNAUTHORIZED`          | Unauthorized access                                                                                            |
| 403         | `FORBIDDEN`             | Access forbidden                                                                                               |
| 404         | `NOT_FOUND`             | `addInterface`: router or subnet/port not found; `removeInterface`: interface is not attached to router        |
| 409         | `CONFLICT`              | `addInterface`: subnet/port in use or IP allocated; `removeInterface`: floating IPs still associated on subnet |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request                                                                                      |

---

### Delete Router

Deletes a router.

**Procedure**: `network.routers.delete`  
**Method**: Mutation  
**OpenStack Endpoint**: `DELETE /v2.0/routers/{router_id}`

#### Parameters

| Parameter   | Type   | Description | Required |
| ----------- | ------ | ----------- | -------- |
| `router_id` | string | Router UUID | ✅ Yes   |

#### Important Notes

- Neutron rejects deletion while interfaces are attached (`409`). Remove all interfaces first. An external gateway is removed automatically.

#### Response

Returns `true` on success (OpenStack returns `204 No Content`).

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                             |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access                                                                 |
| 403         | `FORBIDDEN`             | Access forbidden                                                                    |
| 404         | `NOT_FOUND`             | Router {router_id} was not found.                                                   |
| 409         | `CONFLICT`              | The router still has attached interfaces. Remove all interfaces before deleting it. |
| 412         | `PRECONDITION_FAILED`   | Precondition failed - revision number mismatch                                      |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request                                                           |

---

### List Router Interfaces

Lists the router's internal interfaces for the detail view.

**Procedure**: `network.routers.listInterfaces`  
**Method**: Query  
**OpenStack Endpoints**:

- `GET /v2.0/ports?device_id={router_id}&fields=...`
- `GET /v2.0/subnets?id=...&fields=id&fields=name&fields=cidr` (enrichment)

#### Parameters

| Parameter   | Type   | Description | Required |
| ----------- | ------ | ----------- | -------- |
| `router_id` | string | Router UUID | ✅ Yes   |

#### Important Notes

- Only interface ports are returned: `network:router_interface`, `network:router_interface_distributed`, `network:ha_router_replicated_interface`. The gateway port (`network:router_gateway`) and DVR SNAT ports (`network:router_centralized_snat`) are excluded.
- Fixed IPs are enriched with subnet name and CIDR in a single batched subnets request. If that request fails, interfaces are still returned with subnet IDs only.
- No subnets request is made when the router has no interfaces.

#### Response

Returns `RouterInterface[]`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                   |
| ----------- | ----------------------- | ------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access       |
| 403         | `FORBIDDEN`             | Access forbidden          |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request |

---

### List Router Extensions

Returns flags for router-related Neutron extensions, used by the UI to show extension-dependent columns and sections.

**Procedure**: `network.routers.listExtensions`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/extensions`

#### Response

Returns `RouterExtensionFlags`:

| Flag                         | Extension alias                | Enables                                                  |
| ---------------------------- | ------------------------------ | -------------------------------------------------------- |
| `dvr`                        | `dvr`                          | `distributed` attribute / Distributed column             |
| `l3Ha`                       | `l3-ha`                        | `ha` attribute                                           |
| `extraRoute`                 | `extraroute`                   | `routes` (Extra Routes section)                          |
| `extGwMode`                  | `ext-gw-mode`                  | `enable_snat` on the external gateway                    |
| `ndpProxy`                   | `router-extend-ndp-proxy`      | `enable_ndp_proxy`                                       |
| `externalGatewayMultihoming` | `external-gateway-multihoming` | `enable_default_route_bfd` / `enable_default_route_ecmp` |
| `availabilityZone`           | `router_availability_zone`     | `availability_zone_hints` / `availability_zones`         |

#### Error Handling

| HTTP Status | tRPC Code               | Message                   |
| ----------- | ----------------------- | ------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access       |
| 403         | `FORBIDDEN`             | Access forbidden          |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request |

---

## Data Types

### Router

```typescript
type Router = {
  id: string
  name: string // defaults to ""
  description: string // defaults to ""
  status: string // e.g. ACTIVE, DOWN, ERROR
  admin_state_up: boolean
  project_id: string
  external_gateway_info?: ExternalGatewayInfo | null // null when no gateway is set
  routes: ExtraRoute[] // defaults to [], requires extraroute extension
  // Optional extension fields
  distributed?: boolean | null // requires dvr extension (admin-only to read by default)
  ha?: boolean | null // requires l3-ha extension (admin-only to read by default)
  enable_ndp_proxy?: boolean | null // requires router-extend-ndp-proxy extension
  enable_default_route_bfd?: boolean | null // requires external-gateway-multihoming extension
  enable_default_route_ecmp?: boolean | null // requires external-gateway-multihoming extension
  availability_zone_hints?: string[] // requires router_availability_zone extension
  availability_zones?: string[] // requires router_availability_zone extension
  flavor_id?: string | null // requires l3-flavors extension
  tenant_id?: string
  revision_number?: number
  tags?: string[] // requires standard-attr-tag extension
  created_at?: string // requires standard-attr-timestamp extension
  updated_at?: string // requires standard-attr-timestamp extension
}
```

### RouterListItem

Returned by `list`. Same as `Router`, with names added to the external gateway and the router's private networks, when they can be resolved.

```typescript
type RouterListItem = Omit<Router, "external_gateway_info"> & {
  external_gateway_info?:
    | (ExternalGatewayInfo & {
        network_name?: string
        external_fixed_ips?: { subnet_id: string; ip_address: string; subnet_name?: string }[]
      })
    | null
  // [] = no interfaces, undefined = interfaces could not be resolved
  private_networks?: { network_id: string; network_name?: string }[]
}
```

### ExternalGatewayInfo

```typescript
type ExternalGatewayInfo = {
  network_id: string
  enable_snat?: boolean // requires ext-gw-mode extension
  external_fixed_ips?: { subnet_id: string; ip_address: string }[]
  qos_policy_id?: string | null // requires qos-gateway-ip extension
}
```

### ExternalGatewayInfoInput

```typescript
type ExternalGatewayInfoInput = {
  network_id: string
  enable_snat?: boolean // admin-only in default Neutron policy
  external_fixed_ips?: { subnet_id?: string; ip_address?: string }[] // each entry needs subnet_id or ip_address
}
```

### ExtraRoute

```typescript
type ExtraRoute = {
  destination: string // CIDR, validated on input (e.g. 10.1.0.0/16)
  nexthop: string // IPv4/IPv6 address, validated on input
}
```

### RouterInterface

Interface port as returned to the UI, enriched with subnet details.

```typescript
type RouterInterface = {
  port_id: string
  port_name: string
  network_id: string
  device_owner: string
  status: "ACTIVE" | "DOWN" | "BUILD" | "ERROR"
  admin_state_up?: boolean
  mac_address?: string
  fixed_ips: {
    subnet_id: string
    subnet_name?: string // undefined if subnet enrichment failed
    subnet_cidr?: string
    ip_address: string
  }[]
}
```

## Helper Functions

### Error Handlers

`RouterErrorHandlers` in `routerHelpers.ts` is built on the shared network `ErrorHandler("Router", overrides)`:

- Default handlers (400, 401, 403, 404, 409, 412) come from `errorHandling.ts` and include Neutron's `statusText`.
- Router-specific overrides provide clearer messages for 404/409 (and 400 on `addInterface`).
- **Quota detection:** Neutron returns `OverQuota` as `409 Conflict` (not 413). Every 409 override checks `statusText` for "quota" and returns a quota message instead of the operation-specific one.

### Response Shaping

- `filterRoutersByBffParams(routers, { status, has_gateway })` - BFF-side list filters
- `isRouterInterfacePort(port)` / `buildRouterInterfaces(ports, subnets)` - interface filtering and subnet enrichment
- `collectSubnetIds(ports)` - unique subnet IDs for the batched subnets request
- `collectGatewayIds(routers)` / `applyGatewayNames(routers, networks, subnets)` - external network/subnet name enrichment for `list`
- `groupPrivateNetworkIdsByRouter(ports)` / `applyPrivateNetworks(routers, idsByRouter, networks)` - private networks for `list`
- `chunk(items, size)` - splits router IDs for the batched ports requests
- `getRouterExtensionFlags(aliases)` - maps extension aliases to `RouterExtensionFlags`

### Request Builders

- `buildExternalGatewayInfoBody(info)` - builds `external_gateway_info`, omitting undefined fields
- `pickDefined(obj)` - drops `undefined` keys, keeps `false`, `0`, `""` and `null`

## Frontend Integration

### Routes

| Route                                         | Description                                              |
| --------------------------------------------- | -------------------------------------------------------- |
| `/_auth/projects/$projectId/network/routers`  | Layout route: breadcrumb and route-level error component |
| `/_auth/projects/$projectId/network/routers/` | Routers list (placeholder)                               |

### Navigation

- **Side Navigation:** "Routers" entry in the _Network_ section (`buildNavSections`), shown when the network service is in the catalog and `routers` is enabled.
- **Project overview:** "Routers" service card in the _Network_ group.

### Permissions

UI actions are gated via `network.canUser` using the existing keys in `permissionRouter.ts`:

| UI Action                      | Permission Key                     | Neutron Rule              |
| ------------------------------ | ---------------------------------- | ------------------------- |
| List / view routers            | `network:routers:list` / `read`    | `get_router`              |
| Create router                  | `network:routers:create`           | `create_router`           |
| Edit router, set/clear gateway | `network:routers:update`           | `update_router`           |
| Delete router                  | `network:routers:delete`           | `delete_router`           |
| Add interface                  | `network:routers:attach_interface` | `add_router_interface`    |
| Remove interface               | `network:routers:detach_interface` | `remove_router_interface` |

`canUser` is a UX aid. Neutron enforces its policy on every request, and a denied request surfaces as `FORBIDDEN`.

## Testing

### Backend Tests

- `routers/routersRouter.test.ts` - procedure tests for all endpoints: success paths, request URLs and bodies, input validation, session/service errors, parse errors and Neutron error mapping
- `types/router.test.ts` - response and input schema validation, IP/CIDR validators, interface and gateway refinements
- `helpers/routerHelpers.test.ts` - error handler overrides (404/409, OverQuota detection, 400 detail), BFF filters, interface building, extension flags
- `helpers/errorHandling.test.ts` - `Router` resource name in the shared error handler

### Frontend Tests

- `buildNavSections.test.ts` - Routers entry in the Network section and `enabledServices` filtering

## Special Notes

1. **Gateway changes use dedicated procedures** (`setGateway` / `clearGateway`) rather than `update`. Clearing sends `external_gateway_info: {}`.
2. **Extra routes are replaced, not merged.** `update` with `routes` overwrites the full list.
3. **Admin-only attributes:** `enable_snat`, `external_fixed_ips`, `distributed`, `ha` and the multihoming flags are admin-only in the default Neutron policy. Regular members may not see `distributed`/`ha` in responses at all.
4. **External networks** for the gateway selector are served by `network.floatingIp.listExternalNetworks`.

## Implementation Status

### ✅ Implemented

- `list`, `getById`, `create`, `update`, `setGateway`, `clearGateway`, `addInterface`, `removeInterface`, `delete`, `listInterfaces`, `listExtensions` BFF procedures
- Zod validation for all request/response types
- Router-specific error handling on top of the shared network error handler
- Routing setup, side navigation entry and project overview card
- Routers list view (Name, Project, External Network, External Subnet, Private Network, Status) with search, sorting and pagination
- External network/subnet names and private networks in `list` via batched lookups
- Backend unit and procedure tests

### 🚧 Planned

- Routers list view filters (status, has gateway) and "Showing X of Y" summary
- Router detail view (Basic Info, External Gateway, Extra Routes, Router Interfaces, Advanced attributes)
- Write operations in the UI (create, edit, gateway, interfaces, delete)

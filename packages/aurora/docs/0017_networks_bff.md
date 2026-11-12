# OpenStack Networks - BFF Implementation

This document describes the Backend for Frontend (BFF) implementation for OpenStack Neutron Network (L2) management in Aurora Portal. The implementation covers the network lifecycle (list, show, create, update, delete), tag management and the subnets of a network, following OpenStack Neutron API v2.0.

## ✅ Verification Status

This implementation is aligned with the official OpenStack Neutron API documentation:

- Networks: https://docs.openstack.org/api-ref/network/v2/index.html#networks
- Tags: https://docs.openstack.org/api-ref/network/v2/index.html#tag-extension-tags
- Subnets: https://docs.openstack.org/api-ref/network/v2/index.html#subnets

## Architecture Overview

### Backend (BFF Layer)

- **Router**: `packages/aurora/src/server/Network/routers/networksRouter.ts`
- **Network Router Mount**: `packages/aurora/src/server/Network/routers/index.ts` (namespace `network.networks`)
- **Types & Schemas**: `packages/aurora/src/server/Network/types/network.ts`
- **Helpers**: `packages/aurora/src/server/Network/helpers/networkHelpers.ts`
- **Shared Request Helpers**: `packages/aurora/src/server/Network/helpers/requestHelpers.ts` (`requestOrThrow`, `pickDefined`, `withQuery`)
- **Shared Lookups**: `packages/aurora/src/server/Network/helpers/lookupHelpers.ts` (`fetchSubnetSummaries`)
- **Shared Error Handler**: `packages/aurora/src/server/Network/helpers/errorHandling.ts`
- **Project Scoped Procedure**: `packages/aurora/src/server/trpc.ts`

### Frontend (React)

- **Layout Route**: `packages/aurora/src/client/routes/_auth/projects/$projectId/network/networks.tsx`
- **List Route**: `packages/aurora/src/client/routes/_auth/projects/$projectId/network/networks/index.tsx`
- **Details Route**: `packages/aurora/src/client/routes/_auth/projects/$projectId/network/networks/$networkId.tsx`
- **Components**: `packages/aurora/src/client/routes/_auth/projects/$projectId/network/networks/-components/`

## BFF API Endpoints

All procedures use `projectScopedProcedure`: `project_id` is required and is used to rescope the session to the project.

### List Networks

Retrieves the networks the project can use: its own networks and the networks shared with it. Supports Neutron filtering and sorting, plus a BFF-side search.

**Procedure**: `network.networks.list`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/networks`

#### Parameters

Forwarded to Neutron:

| Parameter         | Type    | Description                                                                                           | Required |
| ----------------- | ------- | ----------------------------------------------------------------------------------------------------- | -------- |
| `project_id`      | string  | Project UUID (also used for session rescoping). Sent as filter on the "own networks" request only     | ✅ Yes   |
| `name`            | string  | Filter by network name                                                                                | No       |
| `description`     | string  | Filter by description                                                                                 | No       |
| `status`          | string  | Filter by status (`ACTIVE`, `DOWN`, `BUILD`, `ERROR`)                                                 | No       |
| `admin_state_up`  | boolean | Filter by administrative state                                                                        | No       |
| `shared`          | boolean | Controls which requests are sent (see below)                                                          | No       |
| `router:external` | boolean | Filter by external flag                                                                               | No       |
| `mtu`             | number  | Filter by MTU                                                                                         | No       |
| `sort_key`        | enum    | `admin_state_up`, `availability_zone_hints`, `id`, `mtu`, `name`, `status`, `project_id`, `tenant_id` | No       |
| `sort_dir`        | enum    | `asc` or `desc`                                                                                       | No       |
| `tags`            | string  | Comma-separated tags (all must match)                                                                 | No       |
| `tags_any`        | string  | Comma-separated tags (any must match), sent as `tags-any`                                             | No       |
| `not_tags`        | string  | Comma-separated tags to exclude (all), sent as `not-tags`                                             | No       |
| `not_tags_any`    | string  | Comma-separated tags to exclude (any), sent as `not-tags-any`                                         | No       |

Applied BFF-side (not sent to Neutron):

| Parameter    | Type   | Description                             |
| ------------ | ------ | --------------------------------------- |
| `searchTerm` | string | Search by `id`, `name` or `description` |

#### Own and Shared Networks

Neutron's `project_id` filter hides shared networks owned by other projects, although the project can attach ports to them. The `list` procedure therefore sends up to two requests in parallel, with the same filters, and merges the results by ID (the first occurrence wins):

| `shared` input | Requests                                                    |
| -------------- | ----------------------------------------------------------- |
| not set        | `?project_id={project_id}` and `?shared=true`               |
| `true`         | `?shared=true` (includes the project's own shared networks) |
| `false`        | `?project_id={project_id}&shared=false`                     |

Because each request is sorted by Neutron but the concatenation isn't, the merged list is re-sorted BFF-side by `sort_key` / `sort_dir`. Missing values sort last.

External networks that are not shared (e.g. floating IP pools) are not part of this list. They are served by `network.floatingIp.listExternalNetworks`.

#### Response

Returns `NetworkListItem[]`: networks from the Neutron envelope `{ networks: [...] }`, each with `subnet_details`.

#### Subnet Name Enrichment

The list shows the subnets of each network by name. After filtering, the BFF collects the unique subnet IDs of all listed networks and resolves them with one batched request (`GET /v2.0/subnets?id=a&id=b&fields=id&fields=name`, chunked by 50 IDs). No request is sent when no network has subnets.

| Situation                                        | `subnet_details`                                    |
| ------------------------------------------------ | --------------------------------------------------- |
| Network has no subnets                           | `[]`                                                |
| Subnet name resolved                             | `{ id, name }`                                      |
| Subnet name empty, not visible, or lookup failed | `{ id, name: undefined }` (UI falls back to the ID) |

The lookup is best-effort: a failed lookup never fails the list.

#### Error Handling

| HTTP Status | tRPC Code               | Message                        |
| ----------- | ----------------------- | ------------------------------ |
| 401         | `UNAUTHORIZED`          | Unauthorized access to Network |
| 403         | `FORBIDDEN`             | Access forbidden to Network    |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process Network      |

---

### Get Network by ID

**Procedure**: `network.networks.getById`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/networks/{network_id}`

#### Parameters

| Parameter    | Type   | Description  | Required |
| ------------ | ------ | ------------ | -------- |
| `network_id` | string | Network UUID | ✅ Yes   |

#### Response

Returns `Network`. Subnets of the network are served by `listSubnets`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                             |
| ----------- | ----------------------- | ----------------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access                 |
| 403         | `FORBIDDEN`             | Access forbidden                    |
| 404         | `NOT_FOUND`             | Network {network_id} was not found. |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request           |

---

### Create Network

**Procedure**: `network.networks.create`  
**Method**: Mutation  
**OpenStack Endpoint**: `POST /v2.0/networks`

#### Parameters

| Parameter                 | Type     | Description                                      | Required |
| ------------------------- | -------- | ------------------------------------------------ | -------- |
| `name`                    | string   | Network name (1-255 characters)                  | ✅ Yes   |
| `description`             | string   | Description (max 255 characters)                 | No       |
| `admin_state_up`          | boolean  | Administrative state (Neutron default: `true`)   | No       |
| `port_security_enabled`   | boolean  | Default port security for new ports              | No       |
| `mtu`                     | number   | MTU (integer, min 68)                            | No       |
| `shared`                  | boolean  | Share with all projects (admin-only by default)  | No       |
| `router:external`         | boolean  | Mark as external network (admin-only by default) | No       |
| `availability_zone_hints` | string[] | Availability zone candidates                     | No       |

#### Important Notes

- `project_id` is not sent in the body. Neutron derives ownership from the rescoped token.
- Only provided fields are sent; `false` and empty strings are kept.

#### Request Body Example

```json
{
  "network": {
    "name": "app-tier",
    "admin_state_up": true,
    "port_security_enabled": true
  }
}
```

#### Response

Returns the created `Network`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                                                 |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data for Network: {Neutron message}                                                                     |
| 403         | `FORBIDDEN`             | You are not allowed to perform this change. Shared and external networks, ... require admin rights. ({Neutron message}) |
| 409         | `CONFLICT`              | Network quota exceeded. ... (OverQuota) / The network can't be created with these settings.                             |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process Network                                                                                               |

---

### Update Network

**Procedure**: `network.networks.update`  
**Method**: Mutation  
**OpenStack Endpoint**: `PUT /v2.0/networks/{network_id}`

#### Parameters

| Parameter               | Type    | Description                                     | Required |
| ----------------------- | ------- | ----------------------------------------------- | -------- |
| `network_id`            | string  | Network UUID                                    | ✅ Yes   |
| `name`                  | string  | New name (max 255 characters, may be empty)     | No       |
| `description`           | string  | New description                                 | No       |
| `admin_state_up`        | boolean | Administrative state                            | No       |
| `port_security_enabled` | boolean | Default port security for new ports             | No       |
| `mtu`                   | number  | MTU (integer, min 68)                           | No       |
| `shared`                | boolean | Share with all projects (admin-only by default) | No       |
| `router:external`       | boolean | External flag (admin-only by default)           | No       |

#### Important Notes

- At least one field is required; an empty update is rejected with `BAD_REQUEST` before calling Neutron.
- Sharing can't be disabled while other projects use the network (Neutron `409 InvalidSharedSetting`).

#### Request Body Example

```json
{ "network": { "name": "app-tier-renamed", "admin_state_up": false } }
```

#### Response

Returns the updated `Network`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                   |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | No fields provided to update / Invalid request data for {network_id}: {Neutron message}   |
| 403         | `FORBIDDEN`             | You are not allowed to perform this change. ... require admin rights. ({Neutron message}) |
| 404         | `NOT_FOUND`             | Network {network_id} was not found.                                                       |
| 409         | `CONFLICT`              | The network can't be changed in its current state. Sharing can't be disabled while ...    |
| 412         | `PRECONDITION_FAILED`   | Precondition failed - revision number mismatch                                            |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request                                                                 |

---

### Delete Network

**Procedure**: `network.networks.delete`  
**Method**: Mutation  
**OpenStack Endpoint**: `DELETE /v2.0/networks/{network_id}`

#### Parameters

| Parameter    | Type   | Description  | Required |
| ------------ | ------ | ------------ | -------- |
| `network_id` | string | Network UUID | ✅ Yes   |

#### Important Notes

- Neutron deletes the network's subnets and its network-owned ports (e.g. DHCP) automatically.
- Neutron rejects the deletion with `409 NetworkInUse` while other ports exist (instances, router interfaces, reserved ports).

#### Response

Returns `true` on success (OpenStack returns `204 No Content`).

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                                  |
| ----------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access                                                                                      |
| 403         | `FORBIDDEN`             | Access forbidden                                                                                         |
| 404         | `NOT_FOUND`             | Network {network_id} was not found.                                                                      |
| 409         | `CONFLICT`              | The network still has ports in use (e.g. instances or router interfaces). Delete or detach them first... |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request                                                                                |

---

### Set Network Tags

Replaces all tags of a network.

**Procedure**: `network.networks.setTags`  
**Method**: Mutation  
**OpenStack Endpoint**: `PUT /v2.0/networks/{network_id}/tags`

#### Parameters

| Parameter    | Type     | Description                                                                       | Required |
| ------------ | -------- | --------------------------------------------------------------------------------- | -------- |
| `network_id` | string   | Network UUID                                                                      | ✅ Yes   |
| `tags`       | string[] | The complete new tag list. Each tag 1-255 characters, no commas. `[]` removes all | ✅ Yes   |

#### Important Notes

- Tags are trimmed and de-duplicated before sending.
- Commas are rejected because Neutron's tag filters (`tags`, `tags-any`, ...) are comma-separated.

#### Request Body Example

```json
{ "tags": ["env:prod", "team:network"] }
```

#### Response

Returns the new tag list (`string[]`).

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                  |
| ----------- | ----------------------- | -------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data for {network_id}: {Neutron message} |
| 404         | `NOT_FOUND`             | Network {network_id} was not found.                      |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request                                |

---

### List Network Subnets

Lists the subnets of a network for the details view.

**Procedure**: `network.networks.listSubnets`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/subnets?network_id={network_id}&fields=id&fields=name&fields=cidr&fields=ip_version&fields=gateway_ip&fields=enable_dhcp`

#### Parameters

| Parameter    | Type   | Description  | Required |
| ------------ | ------ | ------------ | -------- |
| `network_id` | string | Network UUID | ✅ Yes   |

#### Response

Returns `NetworkSubnet[]`.

#### Error Handling

Shared defaults (401, 403, ...), labelled with the network ID.

## Data Types

### Network

```typescript
interface Network {
  id: string
  name: string // "" when unset
  description: string
  status: string // ACTIVE | DOWN | BUILD | ERROR
  admin_state_up: boolean
  shared: boolean
  subnets: string[] // subnet IDs
  project_id: string
  tenant_id?: string
  mtu?: number | null // net-mtu extension
  "router:external"?: boolean | null // external-net extension
  port_security_enabled?: boolean | null // port-security extension
  qos_policy_id?: string | null
  dns_domain?: string | null
  ipv4_address_scope?: string | null
  ipv6_address_scope?: string | null
  is_default?: boolean | null
  vlan_transparent?: boolean | null
  l2_adjacency?: boolean | null
  availability_zone_hints?: string[]
  availability_zones?: string[]
  "provider:network_type"?: string | null // admin-only
  "provider:physical_network"?: string | null // admin-only
  "provider:segmentation_id"?: number | null // admin-only
  revision_number?: number
  tags?: string[]
  created_at?: string
  updated_at?: string
}
```

### NetworkListItem

```typescript
type NetworkListItem = Network & {
  /** Same IDs and order as `subnets`; `name` is undefined when it can't be resolved */
  subnet_details: Array<{ id: string; name?: string }>
}
```

### NetworkSubnet

```typescript
interface NetworkSubnet {
  id: string
  name: string
  cidr: string
  ip_version: number
  gateway_ip?: string | null
  enable_dhcp?: boolean
}
```

## Helper Functions

### Error Handlers

`NetworkErrorHandlers` (`list`, `get`, `create`, `update`, `delete`, `setTags`, `listSubnets`) are built on the shared `ErrorHandler("Network", overrides)`. Overrides:

- **403 on create / update:** explains that shared and external networks, provider attributes and some MTU changes require admin rights, and appends Neutron's message.
- **404 on get / update / delete / setTags:** `Network {network_id} was not found.`
- **409 on create / update / delete:** checks Neutron's message for "quota" first (Neutron reports OverQuota as 409), then returns the operation-specific message.

Every Neutron request goes through `requestOrThrow`, because signal-openstack rejects every non-2xx response with `SignalOpenstackApiError`.

### Response Shaping

- `getNetworkListScopes(shared)` - which list requests to send (`own`, `shared`)
- `mergeNetworks(...lists)` - merge by ID, first occurrence wins
- `sortNetworks(networks, sortKey, sortDir)` - re-sort the merged list
- `collectSubnetIds(networks)` - unique subnet IDs for the batched lookup
- `applySubnetNames(networks, subnets)` - add `subnet_details`

### Request Builders

- `buildNetworkBody(fields)` - only provided fields (via `pickDefined`)

## Frontend Integration

The UI is read-only: list and details views, no create/edit/delete actions yet.

### Routes

| Route                                                    | Description                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `/_auth/projects/$projectId/network/networks`            | Layout route: breadcrumb and route-level error component                    |
| `/_auth/projects/$projectId/network/networks/`           | Networks list                                                               |
| `/_auth/projects/$projectId/network/networks/$networkId` | Network details: overview and Subnets tab (`?tab=`, default tab is omitted) |

### List View

- **Columns:** Name (with the network ID below), Status, Admin State, Subnets (names, ID as fallback), Shared, External, MTU, actions (`Show Details`).
- **URL state:** `search`, `sortBy` (`name`, `status`, `mtu`), `sortDirection`, `page` (50 per page), and the filters `status` (`ACTIVE`, `DOWN`, `BUILD`, `ERROR`) and `shared` (`true`, `false`).
- **Data fetching:** Promise + `use()` inside `ErrorBoundary` and `Suspense`; a `FORBIDDEN` list is shown inline.

### Navigation

- **Side Navigation:** "Networks" entry, first in the _Network_ section (`buildNavSections`), shown when the network service is in the catalog and `networks` is enabled.
- **Project overview:** "Networks" service card in the _Network_ group.

The service key `networks` must be added wherever `enabledServices` is configured, otherwise both entries stay hidden.

### Permissions

The keys already exist in `permissionRouter.ts`:

| UI Action            | Permission Key                   | Neutron Rule     |
| -------------------- | -------------------------------- | ---------------- |
| List / view networks | `network:networks:list` / `read` | `get_network`    |
| Create network       | `network:networks:create`        | `create_network` |
| Edit network, tags   | `network:networks:update`        | `update_network` |
| Delete network       | `network:networks:delete`        | `delete_network` |

There are no attribute-level keys yet (e.g. `create_network:shared`, `create_network:router:external`). Neutron enforces them on every request, and a denied request surfaces as `FORBIDDEN` with the admin-only message.

## Testing

### Backend Tests

- `routers/networksRouter.test.ts` - procedure tests for all endpoints: own/shared requests and merge, re-sorting, filters and tag key mapping, search, batched subnet lookup and its fallback, request URLs and bodies, input validation, session/service errors, parse errors and Neutron error mapping (`errorMode: "throw"` like the real client, and `"response"`)
- `types/network.test.ts` - response and input schema validation (defaults, nullable extension fields, MTU and tag validation)
- `helpers/networkHelpers.test.ts` - error handler overrides (403/404/409, OverQuota detection), body builder, scopes, merge, sort and subnet name helpers

### Frontend Tests

- `NetworksList.test.tsx` - loading, initial query from URL params, inline `FORBIDDEN`, error boundary and retry, search, status/shared filters, empty-state flag, URL changes, pagination
- `NetworkListContainer.test.tsx` - columns, top alignment, rows, empty states, pagination
- `NetworkTableRow.test.tsx` - cells, fallbacks and dashes, row click and `Show Details` navigation, read-only menu
- `NetworkDetailsView.test.tsx` - overview labels and values, dashes, Subnets tab states, tab type guard
- `NetworkSubnetsTable.test.tsx` - columns, rows, fallbacks, loading / error / empty states
- `buildNavSections.test.ts` - Networks entry in the Network section and `enabledServices` filtering

## Special Notes

1. **Own + shared networks** are merged from two requests, see [Own and Shared Networks](#own-and-shared-networks).
2. **Tags are replaced, not merged.** `setTags` overwrites the full list.
3. **Admin-only attributes:** `shared`, `router:external`, the `provider:*` attributes and (depending on the deployment) `mtu` are admin-only under the default Neutron policy. Regular members may not see `provider:*` in responses at all.
4. **Ports of a network** will be served by the Ports BFF (`network.ports.list` with `network_id`) once it is merged.

## Implementation Status

### ✅ Implemented

- `list`, `getById`, `create`, `update`, `delete`, `setTags`, `listSubnets` BFF procedures
- Zod validation for all request/response types
- Network-specific error handling on top of the shared network error handler
- Own + shared network listing with re-sorting and batched subnet name lookup
- Backend unit and procedure tests
- Routing setup, side navigation entry and project overview card
- Networks list view (Name, Status, Admin State, Subnets, Shared, External, MTU) with search, status and shared filters, sorting and pagination; only the network's own ID is shown in the list
- Network details view (overview with copyable IDs, Subnets tab)
- Frontend component tests

### 🚧 Planned

- Ports tab on the network details view (depends on the Ports BFF)
- Write operations in the UI (create, edit, delete with pre-checks, tag editor, bulk delete)
- E2E tests (create → update → delete)

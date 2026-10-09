# OpenStack Ports - BFF Implementation

This document describes the Backend for Frontend (BFF) implementation for OpenStack Neutron Port management in Aurora Portal. It covers the full port lifecycle (list, show, create, update, delete) including fixed IPs, security groups and allowed address pairs, following OpenStack Neutron API v2.0.

Ports are **first-class resources** in the project scope: a port always belongs to exactly one network, but it can exist on its own (e.g. to reserve a fixed IP before a VM exists) and be attached to a device later. The same procedures therefore serve the global ports view and views scoped to a single network (via the optional `network_id` filter).

## ✅ Verification Status

This implementation is aligned with the official OpenStack Neutron API documentation:

- Ports: https://docs.openstack.org/api-ref/network/v2/index.html#ports
- Networks (name lookup): https://docs.openstack.org/api-ref/network/v2/index.html#networks
- Subnets (name lookup): https://docs.openstack.org/api-ref/network/v2/index.html#subnets
- Security groups (name lookup): https://docs.openstack.org/api-ref/network/v2/index.html#security-groups-security-groups

## Architecture Overview

### Backend (BFF Layer)

- **Router**: `packages/aurora/src/server/Network/routers/portsRouter.ts`
- **Network Router Mount**: `packages/aurora/src/server/Network/routers/index.ts`
- **Types & Schemas**: `packages/aurora/src/server/Network/types/port.ts`
- **Shared Summary Schemas**: `packages/aurora/src/server/Network/types/index.ts` (`NetworkSummary`, `SubnetSummary`, `SecurityGroupSummary`)
- **Helpers**: `packages/aurora/src/server/Network/helpers/portHelpers.ts`
- **Shared Request Helpers**: `packages/aurora/src/server/Network/helpers/requestHelpers.ts` (`requestOrThrow`, `pickDefined`, `chunk`, `withQuery`)
- **Shared Name Lookups**: `packages/aurora/src/server/Network/helpers/lookupHelpers.ts`
- **Shared Error Handler**: `packages/aurora/src/server/Network/helpers/errorHandling.ts`
- **Project Scoped Procedure**: `packages/aurora/src/server/trpc.ts`

### Frontend (React)

Added in the UI phase (see [Frontend Integration](#frontend-integration)).

## BFF API Endpoints

All procedures are mounted as `network.ports.*` and use `projectScopedProcedure`, so every input requires `project_id` and the OpenStack session is rescoped to that project.

### List Ports

Retrieves all ports of the scoped project, optionally only those of one network. Supports Neutron filtering and sorting, plus a BFF-side search.

**Procedure**: `network.ports.list`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/ports`

#### Parameters

Forwarded to Neutron:

| Parameter        | Type    | Description                                                                                                                   | Required |
| ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- |
| `project_id`     | string  | Project UUID (session rescoping, and sent as filter so admin roles also only see the current project's ports)                 | ✅ Yes   |
| `network_id`     | string  | Only ports of this network (used by the network-scoped view)                                                                  | No       |
| `name`           | string  | Filter by port name                                                                                                           | No       |
| `description`    | string  | Filter by description                                                                                                         | No       |
| `status`         | string  | Filter by status (`ACTIVE`, `DOWN`, `BUILD`, `ERROR`)                                                                         | No       |
| `admin_state_up` | boolean | Filter by administrative state                                                                                                | No       |
| `device_id`      | string  | Filter by attached device (e.g. server or router ID)                                                                          | No       |
| `device_owner`   | string  | Filter by device owner (e.g. `compute:qa-de-1b`, `network:router_interface`)                                                  | No       |
| `mac_address`    | string  | Filter by MAC address                                                                                                         | No       |
| `sort_key`       | enum    | `admin_state_up`, `device_id`, `device_owner`, `id`, `mac_address`, `name`, `network_id`, `project_id`, `status`, `tenant_id` | No       |
| `sort_dir`       | enum    | `asc` or `desc`                                                                                                               | No       |
| `tags`           | string  | Comma-separated tags (all must match)                                                                                         | No       |
| `tags_any`       | string  | Comma-separated tags (any must match), sent as `tags-any`                                                                     | No       |
| `not_tags`       | string  | Comma-separated tags to exclude (all), sent as `not-tags`                                                                     | No       |
| `not_tags_any`   | string  | Comma-separated tags to exclude (any), sent as `not-tags-any`                                                                 | No       |

Applied BFF-side (not sent to Neutron):

| Parameter    | Type   | Description                                                                                                                                                             |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `searchTerm` | string | Case-insensitive substring search across ID, name, description, network (ID and name), fixed IPs (address, subnet ID and name), MAC address, device owner and device ID |

#### Response

Returns `PortListItem[]`: ports from the Neutron envelope `{ ports: [...] }`, enriched with the network name and, for every fixed IP, the IP version and subnet name.

#### Name Enrichment

A port only references its network and subnets by ID. The BFF resolves the names with **batched requests for the whole list** (not per port), in parallel:

- `GET /v2.0/networks?id=...&fields=id&fields=name` - sets `network_name`
- `GET /v2.0/subnets?id=...&fields=id&fields=name` - sets `fixed_ips[].subnet_name`

IDs are deduplicated and sent in chunks of at most 50 IDs per request to keep URLs short. No request is made when there is nothing to look up. Names are resolved **before** the search, so the search also matches network and subnet names.

`fixed_ips[].ip_version` (`4` / `6`) is derived from the address itself and is always available, independent of the subnet lookup.

All lookups are best-effort, so the list is always returned:

| Failed lookup | Result                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| Networks      | `network_name` is `undefined`, UI shows the network ID                             |
| Subnets       | `fixed_ips[].subnet_name` is `undefined`, UI shows the subnet ID or the IP version |

#### Error Handling

| HTTP Status | tRPC Code               | Message                       |
| ----------- | ----------------------- | ----------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data for Port |
| 401         | `UNAUTHORIZED`          | Unauthorized access to Port   |
| 403         | `FORBIDDEN`             | Access forbidden to Port      |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process Port        |

---

### Get Port by ID

Retrieves a single port with everything the details view needs.

**Procedure**: `network.ports.getById`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/ports/{port_id}`

#### Parameters

| Parameter | Type   | Description | Required |
| --------- | ------ | ----------- | -------- |
| `port_id` | string | Port UUID   | ✅ Yes   |

#### Response

Returns `PortDetails`: the port with the same network/subnet enrichment as `list`, and `security_groups` resolved from IDs to `{ id, name? }` references via `GET /v2.0/security-groups?id=...&fields=id&fields=name`. All three lookups run in parallel and are best-effort; the security groups request is skipped when the port has none.

#### Error Handling

| HTTP Status | tRPC Code               | Message                       |
| ----------- | ----------------------- | ----------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access to {id}   |
| 403         | `FORBIDDEN`             | Access forbidden to {id}      |
| 404         | `NOT_FOUND`             | Port {port_id} was not found. |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process {id}        |

---

### Create Port

Creates a port on a network.

**Procedure**: `network.ports.create`  
**Method**: Mutation  
**OpenStack Endpoint**: `POST /v2.0/ports`

#### Parameters

| Parameter               | Type                             | Description                                                                            | Required |
| ----------------------- | -------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| `network_id`            | string                           | Network the port is created on                                                         | ✅ Yes   |
| `name`                  | string                           | Max. 255 characters                                                                    | No       |
| `description`           | string                           | Max. 255 characters                                                                    | No       |
| `admin_state_up`        | boolean                          | Administrative state (Neutron default: `true`)                                         | No       |
| `mac_address`           | string                           | Valid MAC address; generated by Neutron when omitted                                   | No       |
| `fixed_ips`             | `{ subnet_id?, ip_address? }[]`  | Each entry needs a subnet ID or an IP address. Omitted: one IP per subnet. `[]`: no IP | No       |
| `security_groups`       | string[]                         | Security group IDs (Neutron default: the project's `default` group)                    | No       |
| `port_security_enabled` | boolean                          | Requires the `port-security` extension                                                 | No       |
| `allowed_address_pairs` | `{ ip_address, mac_address? }[]` | `ip_address` can be an IP or a CIDR                                                    | No       |
| `device_id`             | string                           | ID of the device using the port                                                        | No       |
| `device_owner`          | string                           | Entity type using the port (e.g. `compute:nova`)                                       | No       |
| `dns_name`              | string                           | Requires the `dns-integration` extension                                               | No       |
| `qos_policy_id`         | string \| null                   | Requires the `qos` extension                                                           | No       |

#### Important Notes

- `project_id` is **not** sent: Neutron derives ownership from the rescoped token.
- Only provided fields are sent. Undefined keys inside `fixed_ips` and `allowed_address_pairs` entries are dropped.
- Neutron rejects security groups on a port with port security disabled (`400`).

#### Request Body Example

```json
{
  "port": {
    "network_id": "a87cc70a-3e15-4acf-8205-9b711a3531b7",
    "name": "reserved-ip",
    "fixed_ips": [
      { "subnet_id": "dfcb9d57-20a1-4360-954c-a34816a2177e", "ip_address": "10.180.242.50" },
      { "subnet_id": "54ef3254-7edd-49d5-afac-0c1b2372feed" }
    ],
    "security_groups": ["85cc3048-abc3-43cc-89b3-377341426ac5"]
  }
}
```

#### Response

Returns the created `Port`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                         |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data for Port: {Neutron message}                                                |
| 401         | `UNAUTHORIZED`          | Unauthorized access to Port                                                                     |
| 403         | `FORBIDDEN`             | Access forbidden to Port                                                                        |
| 404         | `NOT_FOUND`             | The selected network, subnet or security group was not found.                                   |
| 409         | `CONFLICT`              | The requested IP or MAC address is already in use, or the subnet has no free IP addresses left. |
| 409 (quota) | `CONFLICT`              | Port quota exceeded. Delete unused resources or contact an administrator to increase the quota. |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process Port                                                                          |

---

### Update Port

Updates a port.

**Procedure**: `network.ports.update`  
**Method**: Mutation  
**OpenStack Endpoint**: `PUT /v2.0/ports/{port_id}`

#### Parameters

`port_id` (✅ required) plus any of the writable fields from [Create Port](#create-port) except `network_id` and `mac_address`: `name`, `description`, `admin_state_up`, `fixed_ips`, `security_groups`, `port_security_enabled`, `allowed_address_pairs`, `device_id`, `device_owner`, `dns_name`, `qos_policy_id`.

#### Important Notes

- `fixed_ips`, `security_groups` and `allowed_address_pairs` **replace** the complete list on the port.
- `qos_policy_id: null` removes the QoS policy.
- An update without any field is rejected with `BAD_REQUEST` ("No fields provided to update") before calling Neutron.
- The network of a port can't be changed. Changing the MAC address is admin-only under the default policy and not exposed.

#### Request Body Example

```json
{
  "port": {
    "name": "db-port",
    "description": "",
    "security_groups": []
  }
}
```

#### Response

Returns the updated `Port`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                         |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data for {port_id}: {Neutron message}                                           |
| 401         | `UNAUTHORIZED`          | Unauthorized access to {port_id}                                                                |
| 403         | `FORBIDDEN`             | Access forbidden to {port_id}                                                                   |
| 404         | `NOT_FOUND`             | Port {port_id} or a referenced subnet or security group was not found.                          |
| 409         | `CONFLICT`              | The requested IP or MAC address is already in use, or the subnet has no free IP addresses left. |
| 409 (quota) | `CONFLICT`              | Port quota exceeded. Delete unused resources or contact an administrator to increase the quota. |
| 412         | `PRECONDITION_FAILED`   | Precondition failed - revision number mismatch in {port_id}                                     |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process {port_id}                                                                     |

---

### Delete Port

Deletes a port.

**Procedure**: `network.ports.delete`  
**Method**: Mutation  
**OpenStack Endpoint**: `DELETE /v2.0/ports/{port_id}`

#### Parameters

| Parameter | Type   | Description | Required |
| --------- | ------ | ----------- | -------- |
| `port_id` | string | Port UUID   | ✅ Yes   |

#### Important Notes

- Ports owned by a service (e.g. router interfaces, `network:router_interface`) can't be deleted via the port API. Neutron returns `409` (`ServicePortInUse`); detach the interface from the router instead.
- Deleting a port that is attached to a server detaches it from the server.

#### Response

Returns `true` on success (OpenStack returns `204 No Content`).

#### Error Handling

| HTTP Status | tRPC Code               | Message                                                                                                                |
| ----------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access to {port_id}                                                                                       |
| 403         | `FORBIDDEN`             | Access forbidden to {port_id}                                                                                          |
| 404         | `NOT_FOUND`             | Port {port_id} was not found.                                                                                          |
| 409         | `CONFLICT`              | The port is still in use by another resource (e.g. a router interface) and can't be deleted directly. Detach it first. |
| 412         | `PRECONDITION_FAILED`   | Precondition failed - revision number mismatch in {port_id}                                                            |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process {port_id}                                                                                            |

## Data Types

### Port

```typescript
interface Port {
  id: string
  name: string // "" when not set
  description: string // "" when not set
  network_id: string
  mac_address: string
  admin_state_up: boolean
  status: string // ACTIVE, DOWN, BUILD, ERROR (plain string, so unknown values don't break the list)
  device_id: string // "" when not attached
  device_owner: string // "" when not attached, e.g. "compute:qa-de-1b"
  fixed_ips: { subnet_id: string; ip_address: string }[]
  security_groups: string[] // security group IDs
  allowed_address_pairs: { ip_address: string; mac_address?: string }[]
  port_security_enabled?: boolean | null // port-security extension
  dns_name?: string | null // dns-integration extension
  qos_policy_id?: string | null // qos extension
  "binding:vnic_type"?: string | null // binding extension
  "binding:host_id"?: string | null // binding extension, admin-only by default
  project_id: string
  tenant_id?: string
  revision_number?: number
  tags?: string[]
  created_at?: string // ISO 8601
  updated_at?: string // ISO 8601
}
```

### PortListItem

```typescript
type PortListItem = Omit<Port, "fixed_ips"> & {
  network_name?: string // undefined = couldn't be resolved
  fixed_ips: PortFixedIpItem[]
}

interface PortFixedIpItem {
  subnet_id: string
  ip_address: string
  ip_version?: 4 | 6 // derived from the address
  subnet_name?: string // undefined = couldn't be resolved
}
```

### PortDetails

```typescript
type PortDetails = Omit<PortListItem, "security_groups"> & {
  security_groups: SecurityGroupRef[]
}

interface SecurityGroupRef {
  id: string
  name?: string // undefined = couldn't be resolved
}
```

## Helper Functions

### Error Handlers

`PortErrorHandlers` in `portHelpers.ts` is built on the shared network `ErrorHandler("Port", overrides)`:

- Default handlers (400, 401, 403, 404, 409, 412) come from `errorHandling.ts` and include Neutron's error message.
- Port-specific overrides provide clearer messages for 404 (`get`, `create`, `update`, `delete`) and 409 (`create`, `update`, `delete`).
- **Quota detection:** Neutron returns `OverQuota` as `409 Conflict` (not 413). Every 409 override checks the error message for "quota" and returns a quota message instead of the operation-specific one.

Every main request goes through `requestOrThrow(request, handler, resourceLabel?)` from `requestHelpers.ts`, which maps the `SignalOpenstackApiError` thrown by signal-openstack for non-2xx responses to the operation's handler (see [Routers BFF](./0010_routers_bff.md#error-handlers) for details).

### Response Shaping

- `collectPortLookupIds(ports)` - unique network and subnet IDs for the batched lookups
- `applyPortNames(ports, networks, subnets)` - adds `network_name`, `fixed_ips[].subnet_name` and `fixed_ips[].ip_version`
- `applySecurityGroupNames(port, securityGroups)` - resolves security group IDs to `{ id, name? }` for `getById`
- `filterPortsBySearchTerm(ports, searchTerm)` - BFF-side search
- `getIpVersion(ip)` - `4`, `6` or `undefined`

### Request Builders

- `buildPortBody(fields)` - builds the `port` body for create/update, dropping undefined keys (also inside `fixed_ips` and `allowed_address_pairs`) and keeping `false`, `""`, `[]` and `null`

### Shared Name Lookups

`lookupHelpers.ts` provides best-effort, batched lookups shared by Ports and Routers:

- `fetchNetworkSummaries(network, ids, context?)` - `GET /v2.0/networks?id=...&fields=id&fields=name`
- `fetchSubnetSummaries(network, ids, fields?, context?)` - `GET /v2.0/subnets?id=...&fields=...`
- `fetchSecurityGroupSummaries(network, ids, context?)` - `GET /v2.0/security-groups?id=...&fields=id&fields=name`

Each deduplicates IDs, sends one request per chunk of 50 IDs, makes no request for an empty list and returns `[]` on any failure.

## Frontend Integration

To be completed in the UI phase.

### Permissions

The permission keys already exist in `permissionRouter.ts`:

| UI Action         | Permission Key                | Neutron Rule  |
| ----------------- | ----------------------------- | ------------- |
| List / view ports | `network:ports:list` / `read` | `get_port`    |
| Create port       | `network:ports:create`        | `create_port` |
| Edit port         | `network:ports:update`        | `update_port` |
| Delete port       | `network:ports:delete`        | `delete_port` |

Note: the epic names the keys `network:port:*` (singular); the implementation uses the existing plural keys. `canUser` is a UX aid. Neutron enforces its policy on every request, and a denied request surfaces as `FORBIDDEN`.

## Testing

### Backend Tests

- `routers/portsRouter.test.ts` - procedure tests for all endpoints: success paths, request URLs and bodies, project and network scoping, batched and chunked lookups with fallbacks, BFF-side search, input validation, session/service errors, parse errors and Neutron error mapping. The network service mock rejects non-2xx responses with `SignalOpenstackApiError`, like the real client (`errorMode: "response"` resolves with `ok: false` instead)
- `types/port.test.ts` - response and input schema validation, IP/CIDR and MAC validators, fixed IP and address pair inputs
- `helpers/portHelpers.test.ts` - error handler overrides (404/409, OverQuota detection), request body builder, name enrichment, search
- `helpers/lookupHelpers.test.ts` - batching, deduplication, chunking and failure fallbacks of the shared lookups
- `helpers/requestHelpers.test.ts` - `requestOrThrow` error dispatch, `pickDefined`, `chunk`, `withQuery`

## Special Notes

1. **Project scoping:** `list` always sends `project_id` as a filter. Without it, admin roles (e.g. `cloud_network_admin`) would see ports of all projects.
2. **Network-scoped view:** pass `network_id` to `list` to show only the ports of one network (e.g. a "Ports" tab in the network details view).
3. **Lists are replaced, not merged:** `update` with `fixed_ips`, `security_groups` or `allowed_address_pairs` overwrites the full list.
4. **Service-owned ports:** ports with a `network:*` device owner (router interfaces, DHCP) are managed by their service. Neutron rejects deleting them directly.

## Implementation Status

### ✅ Implemented

- `list` (optionally scoped to a network), `getById`, `create`, `update`, `delete` BFF procedures
- Zod validation for all request/response types
- Port-specific error handling on top of the shared network error handler
- Network, subnet and security group names via batched, best-effort lookups (shared with Routers)
- Backend unit and procedure tests

### 🚧 Planned

- Read-only UI: ports list and port details view, side navigation entry and project overview card
- Reusable ports overview for the "Ports" tab in the network details view (Epic #1019)
- Write operations in the UI (create, edit, delete, bulk delete)
- Port security toggle, tag editor and allowed address pairs management

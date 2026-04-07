# OpenStack Floating IPs - BFF Implementation

This document describes the Backend for Frontend (BFF) implementation for OpenStack Neutron Floating IP management in Aurora Portal. The implementation covers the core floating IP lifecycle following OpenStack Neutron API v2.0.

## ✅ Verification Status

This implementation is aligned with the official OpenStack Neutron API documentation:

- Floating IPs: https://docs.openstack.org/api-ref/network/v2/index.html#floating-ips-floatingips
- Neutron Extensions: https://docs.openstack.org/api-ref/network/v2/index.html#id5

## Architecture Overview

### Backend (BFF Layer)

- **Router**: `apps/aurora-portal/src/server/Network/routers/floatingIpRouter.ts`
- **Network Router Mount**: `apps/aurora-portal/src/server/Network/routers/index.ts`
- **Protected Procedure**: `apps/aurora-portal/src/server/trpc.ts`
- **Context/Session Types**: `apps/aurora-portal/src/server/context.ts`

### Frontend (React)

- **Mutations Hook**: `apps/aurora-portal/src/client/routes/_auth/accounts/$accountId/projects/$projectId/network/floatingips/-hooks/useFloatingIpMutations.ts`
- **tRPC Client**: `apps/aurora-portal/src/client/trpcClient.ts`
- **Components**: `apps/aurora-portal/src/client/routes/_auth/accounts/$accountId/projects/$projectId/network/floatingips/-components/`

## BFF API Endpoints

All procedures are mounted as `network.floatingIp.*` and use `protectedProcedure`.

### List Floating IPs

Retrieves all floating IPs for the scoped project. Supports filtering, sorting, and BFF-side search by description.

**Procedure**: `network.floatingIp.list`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/floatingips`

#### Parameters

Optional query parameters are supported by the BFF layer.

Commonly used:

- `project_id`
- `sort_key`
- `sort_dir`
- `searchTerm` (BFF-side filter by `description`)

Also supported by schema:

- `id`, `router_id`, `status`, `tenant_id`, `revision_number`, `description`
- `floating_network_id`, `fixed_ip_address`, `floating_ip_address`, `port_id`
- `tags`, `tags-any`, `not-tags`, `not-tags-any`, `fields`
- `limit`, `marker`, `page_reverse`

#### Response

Returns 200 response code with `FloatingIp[]` from the Neutron envelope `{ floatingips: [...] }`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                   |
| ----------- | ----------------------- | ------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access       |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request |

---

### Get Floating IP by ID

Retrieves a single floating IP record.

**Procedure**: `network.floatingIp.getById`  
**Method**: Query  
**OpenStack Endpoint**: `GET /v2.0/floatingips/{floatingip_id}`

#### Parameters

| Parameter       | Type   | Description      | Required |
| --------------- | ------ | ---------------- | -------- |
| `floatingip_id` | string | Floating IP UUID | ✅ Yes   |

#### Response

Returns a single `FloatingIp` object.

#### Error Handling

| HTTP Status | tRPC Code               | Message                   |
| ----------- | ----------------------- | ------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access       |
| 403         | `FORBIDDEN`             | Access forbidden          |
| 404         | `NOT_FOUND`             | Floating IP not found     |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request |

---

### Create Floating IP

Allocates a floating IP from an external network.

**Procedure**: `network.floatingIp.create`  
**Method**: Mutation  
**OpenStack Endpoint**: `POST /v2.0/floatingips`

#### Parameters

| Parameter             | Type    | Description                               | Required |
| --------------------- | ------- | ----------------------------------------- | -------- |
| `tenant_id`           | string  | Tenant UUID                               | ✅ Yes   |
| `project_id`          | string  | Project UUID                              | ✅ Yes   |
| `floating_network_id` | string  | External network UUID                     | ✅ Yes   |
| `fixed_ip_address`    | string  | Specific fixed IP (for multi-IP ports)    | No       |
| `floating_ip_address` | string  | Specific floating IP to request           | No       |
| `port_id`             | string  | Port UUID to associate immediately        | No       |
| `subnet_id`           | string  | External subnet UUID                      | No       |
| `distributed`         | boolean | Create as distributed floating IP         | No       |
| `description`         | string  | Human-readable description                | No       |
| `dns_name`            | string  | DNS hostname (requires `dns_integration`) | No       |
| `dns_domain`          | string  | DNS domain (requires `dns_integration`)   | No       |
| `qos_policy_id`       | string  | QoS policy UUID (requires `qos`)          | No       |

#### Response

Returns created `FloatingIp`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                    |
| ----------- | ----------------------- | -------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data       |
| 401         | `UNAUTHORIZED`          | Unauthorized access        |
| 404         | `NOT_FOUND`             | Floating IP not found      |
| 409         | `CONFLICT`              | Conflict - resource in use |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request  |

---

### Update Floating IP

Updates a floating IP. Used for associating a port (`port_id` set to a UUID), disassociating a port (`port_id` set to `null`) and editing description field.

**Procedure**: `network.floatingIp.update`  
**Method**: Mutation  
**OpenStack Endpoint**: `PUT /v2.0/floatingips/{floatingip_id}`

#### Parameters

| Parameter          | Type           | Description                                        | Required |
| ------------------ | -------------- | -------------------------------------------------- | -------- |
| `floatingip_id`    | string         | Floating IP UUID                                   | ✅ Yes   |
| `port_id`          | string \| null | Port UUID to associate, or `null` to disassociate  | ✅ Yes   |
| `fixed_ip_address` | string         | Specific fixed IP when port has multiple addresses | No       |
| `description`      | string         | Human-readable description                         | No       |
| `distributed`      | boolean        | Update distributed flag                            | No       |

#### Response

Returns updated `FloatingIp`.

#### Error Handling

| HTTP Status | tRPC Code               | Message                    |
| ----------- | ----------------------- | -------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data       |
| 401         | `UNAUTHORIZED`          | Unauthorized access        |
| 404         | `NOT_FOUND`             | Floating IP not found      |
| 409         | `CONFLICT`              | Conflict - resource in use |
| 412         | `PRECONDITION_FAILED`   | Precondition failed        |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request  |

---

### Delete Floating IP

Deletes (releases) a floating IP.

**Procedure**: `network.floatingIp.delete`  
**Method**: Mutation  
**OpenStack Endpoint**: `DELETE /v2.0/floatingips/{floatingip_id}`

#### Parameters

| Parameter       | Type   | Description      | Required |
| --------------- | ------ | ---------------- | -------- |
| `floatingip_id` | string | Floating IP UUID | ✅ Yes   |

#### Response

Returns `true` on success (OpenStack returns `204 No Content`).

#### Error Handling

| HTTP Status | tRPC Code               | Message                   |
| ----------- | ----------------------- | ------------------------- |
| 401         | `UNAUTHORIZED`          | Unauthorized access       |
| 404         | `NOT_FOUND`             | Floating IP not found     |
| 412         | `PRECONDITION_FAILED`   | Precondition failed       |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request |

---

## Data Types

### FloatingIp

```typescript
type FloatingIp = {
  id: string
  floating_ip_address: string
  fixed_ip_address: string | null
  floating_network_id: string
  router_id: string | null
  port_id: string | null
  status: "ACTIVE" | "DOWN" | "ERROR"
  tenant_id: string
  project_id: string
  revision_number: number
  // Optional extension fields
  description?: string | null
  distributed?: boolean // requires floating-ip-distributed extension
  dns_domain?: string // requires dns-integration extension
  dns_name?: string // requires dns-integration extension
  created_at?: string // requires standard-attr-timestamp extension
  updated_at?: string // requires standard-attr-timestamp extension
  port_details?: PortDetails | null // requires fip-port-details extension
  port_forwardings?: PortForwarding[] // requires expose-port-forwarding-in-fip extension
  tags?: string[] // requires standard-attr-tag extension
  qos_policy_id?: string // requires qos extension
  qos_network_policy_id?: string // requires qos-fip extension
}
```

## Frontend Integration

### Main Components

All components are located under `apps/aurora-portal/src/client/routes/_auth/accounts/$accountId/projects/$projectId/network/floatingips/`:

- `-components/FloatingIps.tsx` - Top-level floating IP feature component
- `-components/-table/FloatingIpListContainer.tsx` - List page container
- `-components/-table/FloatingIpTableRow.tsx` - Table row component
- `-components/-details/FloatingIpDetailsView.tsx` - Floating IP detail view
- `-components/-modals/AllocateFloatingIpModal.tsx` - Create/allocate form
- `-components/-modals/AssociateFloatingIpModal.tsx` - Port association form
- `-components/-modals/DetachFloatingIpModal.tsx` - Port disassociation confirmation
- `-components/-modals/EditFloatingIpModal.tsx` - Edit form
- `-components/-modals/ReleaseFloatingIpModal.tsx` - Release confirmation
- `-components/-modals/FloatingIpActionModals.tsx` - Modal orchestration

### Hooks

`-hooks/useFloatingIpMutations.ts` provides `update` and `delete` mutation wrappers:

- `handleUpdate(floatingIpId, data)` — calls `network.floatingIp.update`
- `handleDelete(floatingIpId)` — calls `network.floatingIp.delete`

### React Query Cache Strategy

The `update` mutation applies optimistic updates:

1. Cancel in-flight `list` and `getById` queries.
2. Snapshot the previous `getById` cache entry.
3. Apply the optimistic state to `getById`.
4. Roll back `getById` on error.
5. Invalidate `getById` and `list` on settled.

The `delete` mutation uses invalidate-and-refetch:

1. Cancel in-flight `list` query on mutate.
2. Invalidate `list` on settled.

## UI Workflows

### Allocate Floating IP

1. Open table and click **Allocate IP**.
2. Submit external network and optional metadata.
3. Refetch list on success.

### Associate Floating IP

1. Open actions menu for an unattached floating IP.
2. Submit target port and optional fixed IP.
3. Optimistic update applied; rolled back on error.

### Disassociate Floating IP

1. Confirm detach action.
2. Optimistic update sets `port_id` to `null`; rolled back on error.

### Edit Floating IP

1. Open edit modal.
2. Update description or other supported fields.
3. Optimistic update applied; rolled back on error.

### Release Floating IP

1. Confirm release action.
2. Delete floating IP via `delete` mutation.
3. List invalidated and refetched.

## Special Notes

1. **Associate and disassociate share the same procedure** (`update`) — pass a port UUID to associate, `null` to disassociate.
2. **DNS fields** (`dns_name`, `dns_domain`) require the `dns_integration` extension.
3. **QoS policy field** (`qos_policy_id`) requires the `qos` extension.
4. **Status propagation may lag** in the Neutron L3 path; optimistic updates are reconciled via cache invalidation on settle.

## Error Handling Strategy

All procedures share a unified error handler (`ErrorHandler("Floating IP")`) that maps Neutron HTTP status codes to tRPC error codes:

| HTTP Status | tRPC Code               |
| ----------- | ----------------------- |
| 400         | `BAD_REQUEST`           |
| 401         | `UNAUTHORIZED`          |
| 403         | `FORBIDDEN`             |
| 404         | `NOT_FOUND`             |
| 409         | `CONFLICT`              |
| 412         | `PRECONDITION_FAILED`   |
| default     | `INTERNAL_SERVER_ERROR` |

UI handling patterns:

- Query failures: inline fallback messages in table/detail views
- Mutation failures: inline form errors with optimistic rollback on `update`
- Retry behavior: default React Query retry policy

## Implementation Status

### ✅ Implemented

- `list`, `create`, `getById`, `update`, `delete` BFF procedures
- Zod validation for all request/response types
- React components for the full floating IP lifecycle
- Optimistic update flow for `update` mutation
- Invalidate-and-refetch flow for `delete` mutation

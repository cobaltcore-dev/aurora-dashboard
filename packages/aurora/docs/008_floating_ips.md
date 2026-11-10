# OpenStack Floating IPs - BFF Implementation

This document describes the Backend for Frontend (BFF) implementation for OpenStack Neutron Floating IP management in Aurora Portal. The implementation covers the core floating IP lifecycle following OpenStack Neutron API v2.0.

## ✅ Verification Status

This implementation is aligned with the official OpenStack Neutron API documentation:

- Floating IPs: https://docs.openstack.org/api-ref/network/v2/index.html#floating-ips-floatingips
- Neutron Extensions: https://docs.openstack.org/api-ref/network/v2/index.html#id5

## Architecture Overview

### Backend (BFF Layer)

- **Router**: `packages/aurora/src/server/Network/routers/floatingIpRouter.ts`
- **Network Router Mount**: `packages/aurora/src/server/Network/routers/index.ts`
- **Procedure Base**: `packages/aurora/src/server/trpc.ts` — all procedures use `projectScopedProcedure`
- **Context/Session Types**: `packages/aurora/src/server/context.ts`
- **Permission Router**: `packages/aurora/src/server/Network/routers/permissionRouter.ts`

### Frontend (React)

- **Mutations Hook**: `packages/aurora/src/client/routes/_auth/projects/$projectId/network/floatingips/-hooks/useFloatingIpMutations.ts`
- **tRPC Client**: `packages/aurora/src/client/trpcClient.ts`
- **Components**: `packages/aurora/src/client/routes/_auth/projects/$projectId/network/floatingips/-components/`
- **Utilities**: `packages/aurora/src/client/routes/_auth/projects/$projectId/network/floatingips/-utils/`

## BFF API Endpoints

All procedures are mounted as `network.floatingIp.*` and use `projectScopedProcedure`. Every call requires `project_id` for session rescoping.

### List Floating IPs

Retrieves all floating IPs for the scoped project. Supports filtering, sorting, and BFF-side search across multiple fields.

**Procedure**: `network.floatingIp.list`
**Method**: Query
**OpenStack Endpoint**: `GET /v2.0/floatingips`

#### Parameters

Optional query parameters are supported by the BFF layer.

Commonly used:

- `project_id`
- `sort_key`
- `sort_dir`
- `searchTerm` (BFF-side filter across `id`, `description`, `floating_ip_address`, `fixed_ip_address`, `floating_network_id`)

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
| `project_id`    | string | Project UUID     | ✅ Yes   |
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

> **Security note**: `tenant_id` and `project_id` sent to Neutron are derived from the authenticated session token, not from user-supplied input, to prevent ownership confusion attacks.

#### Parameters

| Parameter             | Type    | Description                                     | Required |
| --------------------- | ------- | ----------------------------------------------- | -------- |
| `project_id`          | string  | Project UUID (for session rescoping only)       | ✅ Yes   |
| `floating_network_id` | string  | External network UUID                           | ✅ Yes   |
| `fixed_ip_address`    | string  | Specific fixed IP (for multi-IP ports)          | No       |
| `floating_ip_address` | string  | Specific floating IP (admin-only)               | No       |
| `port_id`             | string  | Port UUID to associate immediately              | No       |
| `subnet_id`           | string  | External subnet UUID                            | No       |
| `distributed`         | boolean | Create as distributed floating IP               | No       |
| `description`         | string  | Human-readable description                      | No       |
| `dns_name`            | string  | DNS hostname label (requires `dns-integration`) | No       |
| `dns_domain`          | string  | DNS domain (requires `dns-integration`)         | No       |
| `qos_policy_id`       | string  | QoS policy UUID (requires `qos`)                | No       |

#### Response

Returns created `FloatingIp`. On success, the client navigates to the new floating IP's detail page.

#### Error Handling

| HTTP Status | tRPC Code               | Message                     |
| ----------- | ----------------------- | --------------------------- |
| 400         | `BAD_REQUEST`           | Invalid request data        |
| 401         | `UNAUTHORIZED`          | Unauthorized access         |
| 404         | `NOT_FOUND`             | If the port ID is not valid |
| 409         | `CONFLICT`              | Conflict - resource in use  |
| default     | `INTERNAL_SERVER_ERROR` | Failed to process request   |

---

### Update Floating IP

Updates a floating IP. Used for associating a port (`port_id` set to a UUID), disassociating a port (`port_id` set to `null`) or editing the description field.

**Procedure**: `network.floatingIp.update`
**Method**: Mutation
**OpenStack Endpoint**: `PUT /v2.0/floatingips/{floatingip_id}`

#### Parameters

| Parameter          | Type           | Description                                        | Required |
| ------------------ | -------------- | -------------------------------------------------- | -------- |
| `project_id`       | string         | Project UUID                                       | ✅ Yes   |
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
| `project_id`    | string | Project UUID     | ✅ Yes   |
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

### List External Networks

Fetches only external networks (those with `router:external=true`) for populating the External Network select in the Allocate Floating IP modal.

**Procedure**: `network.floatingIp.listExternalNetworks`
**Method**: Query
**OpenStack Endpoint**: `GET /v2.0/networks?router:external=true`

#### Parameters

| Parameter         | Type    | Description                        | Required |
| ----------------- | ------- | ---------------------------------- | -------- |
| `project_id`      | string  | Project UUID                       | ✅ Yes   |
| `router:external` | boolean | Locked to `true` by schema default | (auto)   |

#### Response

Returns `ExternalNetwork[]`.

---

### List DNS Domains

Fetches DNS zones from the Designate service for populating the DNS Domain select in the Allocate Floating IP modal. Falls back to the `designate` service alias if `dns` is not registered.

**Procedure**: `network.floatingIp.listDnsDomains`
**Method**: Query
**OpenStack Endpoint**: `GET /v2/zones` (Designate API)

#### Parameters

| Parameter    | Type   | Description  | Required |
| ------------ | ------ | ------------ | -------- |
| `project_id` | string | Project UUID | ✅ Yes   |

#### Response

Returns `DnsDomain[]` (`{ id, name }`).

---

### List Available Ports

Fetches ports eligible for floating IP association: only ACTIVE, admin-state-UP ports within the project. Returns a reduced field set (`id`, `name`, `fixed_ips`) for efficiency.

**Procedure**: `network.floatingIp.listAvailablePorts`
**Method**: Query
**OpenStack Endpoint**: `GET /v2.0/ports?status=ACTIVE&admin_state_up=true&project_id=...&fields=id,name,fixed_ips`

#### Parameters

| Parameter        | Type    | Description                            | Required |
| ---------------- | ------- | -------------------------------------- | -------- |
| `project_id`     | string  | Project UUID                           | ✅ Yes   |
| `status`         | string  | Locked to `"ACTIVE"` by schema default | (auto)   |
| `admin_state_up` | boolean | Locked to `true` by schema default     | (auto)   |

#### Response

Returns `AvailablePort[]` (`{ id, name?, fixed_ips? }`).

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
  created_at?: string // ISO8601; requires standard-attr-timestamp extension
  updated_at?: string // ISO8601; requires standard-attr-timestamp extension
  port_details?: PortDetails | null // requires fip-port-details extension
  port_forwardings?: PortForwarding[] | null // requires expose-port-forwarding-in-fip extension
  tags?: string[] // requires standard-attr-tag extension
  qos_policy_id?: string // requires qos extension
  qos_network_policy_id?: string // requires qos-fip extension
}
```

### PortDetails

Available when the `fip-port-details` extension is enabled.

```typescript
type PortDetails = {
  status: "ACTIVE" | "DOWN" | "ERROR"
  name: string
  admin_state_up: boolean
  network_id: string
  device_owner: string
  mac_address: string
  device_id: string
}
```

### PortForwarding

Available when the `expose-port-forwarding-in-fip` extension is enabled.

```typescript
type PortForwarding = {
  id: string
  protocol: "tcp" | "udp"
  internal_ip_address: string
  internal_port?: number
  internal_port_range?: string // e.g. "1024:2048"; requires floating-ip-port-forwarding-port-ranges
  internal_port_id?: string // requires floating-ip-port-forwarding-detail
  external_port?: number
  external_port_range?: string // e.g. "8000:9000"; requires floating-ip-port-forwarding-port-ranges
  description?: string | null // requires floating-ip-port-forwarding-description
}
```

### ExternalNetwork

```typescript
type ExternalNetwork = {
  id: string
  name: string
  project_id: string
  "router:external"?: boolean
  shared: boolean
  status: "ACTIVE" | "DOWN" | "BUILD" | "ERROR"
  updated_at?: string
  is_default?: boolean
}
```

### DnsDomain

Reduced type for select options; only fields needed by the UI.

```typescript
type DnsDomain = {
  id: string
  name: string
}
```

### AvailablePort

Optimized type for floating IP association; only essential fields.

```typescript
type AvailablePort = {
  id: string
  name?: string | null
  fixed_ips?: Array<{
    ip_address: string
    subnet_id?: string
  }>
}
```

---

## Frontend Integration

### Main Components

All components are located under `packages/aurora/src/client/routes/_auth/projects/$projectId/network/floatingips/`:

- `-components/FloatingIpsList.tsx` — Top-level list page component; handles filtering, sorting, search, and the allocate button
- `-components/-table/FloatingIpListContainer.tsx` — DataGrid wrapper; renders header row and delegates rows to `FloatingIpTableRow`
- `-components/-table/FloatingIpTableRow.tsx` — Single table row; status is formatted to Title Case via `formatFloatingIpStatus`
- `-components/-modals/AllocateFloatingIpModal.tsx` — Create/allocate form (see [Allocate Modal](#allocate-floating-ip-modal) below)
- `-components/-modals/AssociateFloatingIpModal.tsx` — Port association form
- `-components/-modals/DetachFloatingIpModal.tsx` — Port disassociation confirmation
- `-components/-modals/EditFloatingIpModal.tsx` — Edit description form
- `-components/-modals/ReleaseFloatingIpModal.tsx` — Release confirmation
- `-components/-modals/FloatingIpActionModals.tsx` — Modal orchestration (render-prop pattern)
- `-components/-modals/FloatingIpToastNotifications.tsx` — Toast message factory (updated, associated, detached, released)
- `$floatingIpId/-components/-details/FloatingIpDetailsView.tsx` — Floating IP detail view (Basic Info, Network & Routing, DNS sections)

### Utilities

- `-utils/formatFloatingIpStatus.ts` — Converts uppercase enum (`"ACTIVE"`) to Title Case (`"Active"`) for display in both table rows and the detail view
- `-utils/urlHelpers.ts` — URL ↔ filter state bridge:
  - `parseFiltersFromUrl(searchParams)` — reads URL params → `SelectedFilter[]`
  - `buildFilterParams(selectedFilters, filterDefs)` — `SelectedFilter[]` → API query params; uses `in:` operator for multi-value filters
  - `applyFilterSelection(current, selected, filterDefs)` — merges a new selection (deduplicates; replaces single-value, appends multi-value)
  - `buildUrlSearchParams(selectedFilters, filterDefs, baseParams)` — produces the `FloatingIpsSearchParams` shape for `navigate({ search: ... })`

### Hooks

`-hooks/useFloatingIpMutations.ts` provides `update` and `delete` mutation wrappers:

| Return value       | Type                    | Description                        |
| ------------------ | ----------------------- | ---------------------------------- |
| `handleUpdate`     | `(id, data) => Promise` | Calls `network.floatingIp.update`  |
| `handleDelete`     | `(id) => Promise`       | Calls `network.floatingIp.delete`  |
| `resetUpdateError` | `() => void`            | Clears update mutation error state |
| `resetDeleteError` | `() => void`            | Clears delete mutation error state |
| `isUpdatePending`  | `boolean`               | True while update is in-flight     |
| `updateError`      | `string \| null`        | Latest update error message        |
| `isDeletePending`  | `boolean`               | True while delete is in-flight     |
| `deleteError`      | `string \| null`        | Latest delete error message        |

### React Query Cache Strategy

The `update` mutation applies optimistic updates:

1. Cancel in-flight `list` and `getById` queries.
2. Snapshot the previous `getById` cache entry.
3. Apply the optimistic state to `getById`.
4. Roll back `getById` on error.
5. Invalidate `getById` and `list` on settled.

The `delete` mutation:

1. Cancel in-flight `list` and `getById` queries on mutate.
2. Invalidate `getById` and `list` on settled.

The `create` mutation (in `AllocateFloatingIpModal`):

1. Invalidates `list` on settled.
2. On success, navigates to the new floating IP's detail page.

---

## Permission System

All floating IP views check permissions via `network.canUser.useQuery`, which maps UI-friendly keys to OpenStack Neutron policy rules (see `permissionRouter.ts`).

### Floating IP Permission Keys

| Key                                      | Neutron rule                            | Used by                                                                  |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| `network:floatingips:create`             | `create_floatingip`                     | "Allocate Floating IP" button gate                                       |
| `network:floatingips:update`             | `update_floatingip`                     | "Edit Description" action gate (table row + detail page)                 |
| `network:floatingips:delete`             | `delete_floatingip`                     | "Release" action gate (table row + detail page)                          |
| `network:floatingips:associate`          | `update_floatingip`                     | "Attach" action gate (table row + detail page)                           |
| `network:floatingips:disassociate`       | `update_floatingip`                     | "Detach" action gate (table row + detail page)                           |
| `network:floatingips:specify_ip_address` | `create_floatingip:floating_ip_address` | Shows/hides the Floating IP Address field in Allocate modal (admin-only) |

### Action Gating by Surface

Both the list-row kebab menu (`FloatingIpTableRow.tsx`) and the detail-page action menu (`FloatingIpDetailsView.tsx`) query the same four permission keys (`update`, `disassociate`, `delete`, `associate`) and gate each action. The two surfaces differ in how they present a denied action:

| Surface             | Unpermitted action behavior                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| List-row kebab menu | **Hidden.** In the worst case (no permissions), only **Show Details** remains.                 |
| Detail-page menu    | Edit Description / Detach / Release are **disabled** (shown greyed out); Attach is **hidden**. |

The list row's **Show Details** entry is a pure navigation action and is always present regardless of permissions.

---

## Allocate Floating IP Modal

The Allocate modal (`AllocateFloatingIpModal.tsx`) performs three data queries on open:

| Query                                     | Purpose                               |
| ----------------------------------------- | ------------------------------------- |
| `network.floatingIp.listExternalNetworks` | Populates the External Network select |
| `network.floatingIp.listDnsDomains`       | Populates the DNS Domain select       |
| `network.floatingIp.listAvailablePorts`   | Populates the Port ID select          |

### Form Fields

| Field               | Required | Notes                                                              |
| ------------------- | -------- | ------------------------------------------------------------------ |
| External Network    | ✅ Yes   | Must be selected; gates the Allocate button independently          |
| DNS Domain          | No       | Select with placeholder. "None" option resets field to empty       |
| DNS Name            | No       | Single hostname label only (no dots); max 63 chars                 |
| Description         | No       | Max 255 chars                                                      |
| Floating IP Address | No       | Shown only when `specify_ip_address` permission is granted (admin) |
| Port ID             | No       | Selecting a port with one fixed IP auto-fills Fixed IP Address     |
| Fixed IP Address    | No       | Enabled only when selected port has fixed IPs                      |

### DNS Name / DNS Domain Interdependency

- If **DNS Name** is filled and **DNS Domain** is empty → DNS Domain shows an error: _"DNS domain is required when a DNS name is entered."_
- If **DNS Domain** is selected and **DNS Name** is empty → DNS Name shows an error: _"DNS name is required when a DNS domain is selected."_
- Both validations run on `onChange` (live), so the Allocate button disables immediately.

### DNS Name Validation

DNS Name accepts a single hostname label only (no dots, no domain). Validated live on `onChange`:

1. Length > 63 chars → _"DNS name must be at most 63 characters."_
2. Domain selected but name empty → interdependency error (see above)
3. Non-empty and does not match `^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$` → _"DNS name must use only letters, digits, and hyphens, and must start and end with a letter or digit."_

### Allocate Button Disable Conditions

The Allocate button (`disableConfirmButton`) is disabled when **any** of the following is true:

- Mutation is in-flight (`isPending`)
- No External Network selected (`!currentFloatingNetworkId`)
- Any field has a validation error (`!canSubmit` via `useStore(form.store, s => s.canSubmit)`)
- A server error is present from a previous attempt (`createFloatingIpMutation.isError`)

A server error is **not** a permanent block: a form-level `listeners.onChange` resets the mutation as soon as the user edits any field, which clears both the `isError` blocker and the stale error banner. This lets the user correct their input and retry in place without closing the modal and losing what they typed.

---

## List Page Features

`FloatingIpsList.tsx` manages the full list page state:

- **Sorting**: URL-driven via `sortBy` / `sortDirection` params; defaults to `status asc`.
- **Filtering**: Currently supports `status` filter (`ACTIVE`, `DOWN`, `ERROR`); single-value only.
- **Search**: BFF-side, debounced 500 ms, searches across `id`, `description`, `floating_ip_address`, `fixed_ip_address`, `floating_network_id`.
- **Error handling**: Full-page error when no data is cached; non-blocking banner when cached data is shown during a refetch failure.
- **Stale-while-revalidate**: `placeholderData: (prev) => prev` keeps previous results visible during refetch.

---

## UI Workflows

### Allocate Floating IP

1. Open table; the **Allocate Floating IP** button is shown only when `network:floatingips:create` is permitted.
2. Select External Network (required) and optional metadata (DNS, description, port, IP address).
3. DNS Name and DNS Domain interdependency is validated live.
4. On success, list is invalidated and user is navigated to the new floating IP's detail page.

### Associate Floating IP

1. Open actions menu for an unattached floating IP.
2. Submit target port and optional fixed IP.
3. Optimistic update applied; rolled back on error.

### Disassociate Floating IP

1. Confirm detach action.
2. Optimistic update sets `port_id` to `null`; rolled back on error.

### Edit Floating IP

1. Open edit modal.
2. Update description.
3. Optimistic update applied; rolled back on error.

### Release Floating IP

1. Confirm release action.
2. Delete floating IP via `delete` mutation.
3. `list` and `getById` invalidated on settled.

---

## Special Notes

1. **Associate and disassociate share the same procedure** (`update`) — pass a port UUID to associate, `null` to disassociate.
2. **DNS fields** (`dns_name`, `dns_domain`) require the `dns-integration` extension on the OpenStack side. The UI validates `dns_name` as a single hostname label (no dots); full FQDN assembly (`dns_name.dns_domain`) happens server-side.
3. **QoS policy field** (`qos_policy_id`) requires the `qos` extension.
4. **Floating IP Address field** (`floating_ip_address`) is admin-only and hidden for non-admin users; controlled by the `network:floatingips:specify_ip_address` permission check.
5. **Status display** — the raw API enum (`ACTIVE`, `DOWN`, `ERROR`) is formatted to Title Case (`Active`, `Down`, `Error`) in both the table row and the detail view via `formatFloatingIpStatus`.
6. **Status propagation may lag** in the Neutron L3 path; optimistic updates are reconciled via cache invalidation on settle.

---

## Error Handling Strategy

All procedures share a unified error handler (`withErrorHandling`) that maps Neutron HTTP status codes to tRPC error codes via `FloatingIpErrorHandlers`:

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

- Query failures: inline fallback messages in table/detail views; non-blocking banner when cached data is available
- Mutation failures: inline form errors; optimistic rollback on `update`; the Allocate button stays disabled while `isError` is true, and the error clears when the user next edits a field
- Retry behavior: default React Query retry policy

---

## Implementation Status

### ✅ Implemented

- `list`, `create`, `getById`, `update`, `delete` BFF procedures
- `listExternalNetworks`, `listDnsDomains`, `listAvailablePorts` helper queries
- Zod validation for all request/response types
- React components for the full floating IP lifecycle
- Optimistic update flow for `update` mutation
- Invalidate-and-refetch flow for `delete` and `create` mutations
- URL-driven filtering, sorting, and search on the list page
- Permission gates for all actions (create, update, delete, associate, disassociate, specify IP)
- Live DNS Name/Domain interdependency validation
- DNS Name format validation (single hostname label)
- Status display in Title Case (table row + detail view)
- Toast notifications for all mutation outcomes

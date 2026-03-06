# OpenStack Security Groups - BFF Implementation

This document describes the Backend for Frontend (BFF) implementation for OpenStack Neutron Security Groups. The implementation provides complete CRUD operations for managing security groups and their associated rules, following the OpenStack Neutron API v2.0 specification.

## ✅ Verification Status

This implementation has been verified against the official OpenStack Neutron API documentation:

- Security Groups: https://docs.openstack.org/api-ref/network/v2/index.html#security-groups-security-groups
- Security Group Rules: https://docs.openstack.org/api-ref/network/v2/index.html#security-group-rules-security-group-rules
- RBAC Policies: https://docs.openstack.org/api-ref/network/v2/index.html#rbac-policies

## Architecture Overview

### Backend (BFF Layer)
- **Router**: `apps/aurora-portal/src/server/Network/routers/securityGroupRouter.ts`
- **Types**: `apps/aurora-portal/src/server/Network/types/securityGroup.ts`
- **Helpers**: `apps/aurora-portal/src/server/Network/helpers/securityGroupHelpers.ts`
- **Tests**: `apps/aurora-portal/src/server/Network/routers/securityGroupRouter.test.ts`

### Frontend (React)
- **List Route**: `apps/aurora-portal/src/client/routes/_auth/accounts/$accountId/projects/$projectId/network/$.tsx` (splat routing)
- **Details Route**: `apps/aurora-portal/src/client/routes/_auth/accounts/$accountId/projects/$projectId/network/securitygroups/$securityGroupId.tsx`
- **Components**: `apps/aurora-portal/src/client/routes/_auth/accounts/$accountId/projects/$projectId/network/-components/SecurityGroups/`

## BFF API Endpoints

### List Security Groups

Retrieves a list of security groups with optional pagination, sorting, and filtering.

**Procedure**: `network.securityGroup.list`
**Method**: Query
**OpenStack Endpoint**: `GET /v2.0/security-groups`
**Input Schema**: `listSecurityGroupsInputSchema`

#### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | number | Maximum number of results (1-1000) | - |
| `marker` | string | Pagination marker (security group ID) | - |
| `page_reverse` | boolean | Reverse pagination direction | - |
| `sort_key` | string | Field to sort by | - |
| `sort_dir` | enum | Sort direction (`asc`, `desc`) | - |
| `name` | string | Filter by name | - |
| `description` | string | Filter by description | - |
| `project_id` | string | Filter by project ID | - |
| `tenant_id` | string | Filter by tenant ID | - |
| `shared` | boolean | Filter by shared status | - |
| `tags` | string | Filter by tags (comma-separated) | - |
| `tags_any` | string | Filter by any tags | - |
| `not_tags` | string | Exclude tags | - |
| `not_tags_any` | string | Exclude any tags | - |
| `searchTerm` | string | **BFF-side** client search (filters by name, description, or ID) | - |

#### Response

Returns an array of security group objects:

```typescript
type SecurityGroup = {
  id: string
  name?: string | null
  description?: string | null
  tenant_id?: string | null
  project_id?: string | null
  stateful?: boolean
  shared?: boolean
  tags?: string[]
  security_group_rules?: SecurityGroupRule[]
  revision_number?: number
  created_at?: string
  updated_at?: string | null
}
```

#### Error Handling

| HTTP Status | tRPC Code | Message |
|-------------|-----------|---------|
| 401 | `UNAUTHORIZED` | Unauthorized access |
| 403 | `FORBIDDEN` | Access forbidden |
| 500 | `INTERNAL_SERVER_ERROR` | Failed to list security groups |

---

### Get Security Group by ID

Retrieves a single security group with its associated rules.

**Procedure**: `network.securityGroup.getById`
**Method**: Query
**OpenStack Endpoint**: `GET /v2.0/security-groups/{security_group_id}`
**Input Schema**: `getSecurityGroupByIdInputSchema`

#### Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `securityGroupId` | string | The ID of the security group | ✅ Yes |

#### Response

Returns a single security group object with nested `security_group_rules`.

#### Error Handling

| HTTP Status | tRPC Code | Message |
|-------------|-----------|---------|
| 401 | `UNAUTHORIZED` | Unauthorized access |
| 403 | `FORBIDDEN` | Access forbidden |
| 404 | `NOT_FOUND` | Security group not found: {id} |
| 500 | `INTERNAL_SERVER_ERROR` | Failed to fetch security group |

---

### Create Security Group

Creates a new security group.

**Procedure**: `network.securityGroup.create`
**Method**: Mutation
**OpenStack Endpoint**: `POST /v2.0/security-groups`
**Input Schema**: `createSecurityGroupInputSchema`

#### Parameters

| Parameter | Type | Description | Required | Default |
|-----------|------|-------------|----------|---------|
| `name` | string | Security group name | ✅ Yes | - |
| `description` | string | Security group description | No | - |
| `stateful` | boolean | Stateful or stateless security group | No | `true` |

#### Request Body Example

```json
{
  "security_group": {
    "name": "web-servers",
    "description": "Security group for web servers",
    "stateful": true
  }
}
```

#### Response

Returns the created security group object.

#### Error Handling

| HTTP Status | tRPC Code | Message |
|-------------|-----------|---------|
| 400 | `BAD_REQUEST` | Invalid request |
| 401 | `UNAUTHORIZED` | Unauthorized access |
| 403 | `FORBIDDEN` | Access forbidden |
| 409 | `CONFLICT` | Security group already exists |
| 413 | `BAD_REQUEST` | Quota exceeded for security groups. Please delete an existing security group or contact your administrator. |
| 500 | `INTERNAL_SERVER_ERROR` | Failed to create security group |

---

### Update Security Group

Updates an existing security group's name, description, or stateful attribute.

**Procedure**: `network.securityGroup.update`
**Method**: Mutation
**OpenStack Endpoint**: `PUT /v2.0/security-groups/{security_group_id}`
**Input Schema**: `updateSecurityGroupInputSchema`

#### Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `securityGroupId` | string | The ID of the security group | ✅ Yes |
| `name` | string | New name | No |
| `description` | string | New description | No |
| `stateful` | boolean | New stateful value | No |

#### Important Notes

- **Stateful Restriction**: The `stateful` attribute cannot be updated if the security group is currently in use by one or more ports. The API will return a 409 Conflict error.
- Only fields provided in the request will be updated; omitted fields remain unchanged.

#### Request Body Example

```json
{
  "security_group": {
    "name": "updated-web-servers",
    "description": "Updated description"
  }
}
```

#### Response

Returns the updated security group object.

#### Error Handling

| HTTP Status | tRPC Code | Message |
|-------------|-----------|---------|
| 400 | `BAD_REQUEST` | Invalid request |
| 401 | `UNAUTHORIZED` | Unauthorized access |
| 403 | `FORBIDDEN` | Access forbidden |
| 404 | `NOT_FOUND` | Security group not found: {id} |
| 409 | `CONFLICT` | Cannot update the 'stateful' attribute because this security group is in use by one or more ports. |
| 500 | `INTERNAL_SERVER_ERROR` | Failed to update security group |

---

### Delete Security Group

Deletes a security group.

**Procedure**: `network.securityGroup.deleteById`
**Method**: Mutation
**OpenStack Endpoint**: `DELETE /v2.0/security-groups/{security_group_id}`
**Input Schema**: `deleteSecurityGroupInputSchema`

#### Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `securityGroupId` | string | The ID of the security group to delete | ✅ Yes |

#### Important Notes

- Security groups that are in use by one or more ports cannot be deleted.
- The API will return a 409 Conflict error if deletion is attempted on an in-use security group.
- Default security groups cannot be deleted.

#### Response

Returns void on success.

#### Error Handling

| HTTP Status | tRPC Code | Message |
|-------------|-----------|---------|
| 401 | `UNAUTHORIZED` | Unauthorized access |
| 404 | `NOT_FOUND` | Security group not found: {id} |
| 409 | `CONFLICT` | Cannot delete security group because it is in use by one or more ports. Please remove all associations before deleting. |
| 500 | `INTERNAL_SERVER_ERROR` | Failed to delete security group |

---

## Data Types

### SecurityGroup

```typescript
type SecurityGroup = {
  id: string                              // Unique identifier
  name?: string | null                    // Name of the security group
  description?: string | null             // Description
  tenant_id?: string | null               // Owner tenant ID (deprecated, use project_id)
  project_id?: string | null              // Owner project ID
  stateful?: boolean                      // Stateful (true) or stateless (false)
  shared?: boolean                        // Whether shared with other projects
  tags?: string[]                         // Associated tags
  security_group_rules?: SecurityGroupRule[] // Associated rules
  revision_number?: number                // Revision number
  created_at?: string                     // Creation timestamp (ISO 8601)
  updated_at?: string | null              // Last update timestamp (ISO 8601)
}
```

### SecurityGroupRule

```typescript
type SecurityGroupRule = {
  id: string                              // Unique identifier
  direction?: "ingress" | "egress"        // Traffic direction
  ethertype?: "IPv4" | "IPv6"             // Ethernet type
  description?: string | null             // Rule description
  security_group_id?: string              // Parent security group ID
  protocol?: string | null                // Protocol (tcp, udp, icmp, etc.)
  port_range_min?: number | null          // Minimum port number
  port_range_max?: number | null          // Maximum port number
  remote_ip_prefix?: string | null        // Remote IP prefix (CIDR)
  remote_group_id?: string | null         // Remote security group ID
  remote_address_group_id?: string | null // Remote address group ID
  tenant_id?: string | null               // Owner tenant ID
  project_id?: string | null              // Owner project ID
  revision_number?: number                // Revision number
  tags?: string[]                         // Associated tags
  created_at?: string                     // Creation timestamp (ISO 8601)
  updated_at?: string | null              // Last update timestamp (ISO 8601)
}
```

---

## Helper Functions

### Error Handlers

The `SecurityGroupErrorHandlers` object provides specialized error handling for each operation:

- `SecurityGroupErrorHandlers.list(response)` - Handles list operation errors
- `SecurityGroupErrorHandlers.getById(response, securityGroupId)` - Handles getById errors
- `SecurityGroupErrorHandlers.create(response)` - Handles creation errors with quota detection
- `SecurityGroupErrorHandlers.update(response, securityGroupId)` - Handles update errors with stateful attribute detection
- `SecurityGroupErrorHandlers.delete(response, securityGroupId)` - Handles deletion errors with in-use detection

### Response Parsers

- `parseSecurityGroupResponse(data, operation)` - Parses and validates single security group response using Zod
- `parseSecurityGroupsResponse(data, operation)` - Parses and validates security groups list response using Zod

Both parsers throw `TRPCError` with code `INTERNAL_SERVER_ERROR` if validation fails.

---

## Frontend Integration

### Routes

1. **List Page**: `/accounts/:accountId/projects/:projectId/network/securitygroups`
   - Component: `SecurityGroups` (List.tsx)
   - Features: Filtering, sorting, search, create action

2. **Details Page**: `/accounts/:accountId/projects/:projectId/network/securitygroups/:securityGroupId`
   - Component: RouteComponent in `$securityGroupId.tsx`
   - Features: View details, edit, delete

### React Query Integration

#### Queries

```typescript
// List security groups
const { data: securityGroups } = trpcReact.network.securityGroup.list.useQuery({
  sort_key: "name",
  sort_dir: "asc",
  searchTerm: "web",
})

// Get security group by ID
const { data: securityGroup } = trpcReact.network.securityGroup.getById.useQuery({
  securityGroupId: "abc-123",
})
```

#### Mutations

```typescript
const utils = trpcReact.useUtils()

// Create security group
const createMutation = trpcReact.network.securityGroup.create.useMutation({
  onSuccess: (createdSecurityGroup) => {
    utils.network.securityGroup.list.invalidate()
    navigate({ to: "...", params: { securityGroupId: createdSecurityGroup.id } })
  },
})

// Update security group
const updateMutation = trpcReact.network.securityGroup.update.useMutation({
  onSuccess: () => {
    utils.network.securityGroup.getById.invalidate({ securityGroupId })
    utils.network.securityGroup.list.invalidate()
  },
})

// Delete security group
const deleteMutation = trpcReact.network.securityGroup.deleteById.useMutation({
  onSuccess: () => {
    utils.network.securityGroup.list.invalidate()
  },
})
```

### Cache Invalidation Strategy

- **After Create**: Invalidate `list` query, navigate to details page
- **After Update**: Invalidate both `getById` and `list` queries
- **After Delete**: Invalidate `list` query

---

## UI Components

### Modals

1. **CreateSecurityGroupModal**
   - Fields: Name (required), Description (optional), Stateful (checkbox, default true)
   - Validation: Name is required
   - Success: Navigates to details page

2. **EditSecurityGroupModal**
   - Fields: Name, Description, Stateful
   - Pre-populated with existing values
   - Info message about stateful restrictions
   - Success: Closes modal, refreshes data

3. **DeleteSecurityGroupDialog**
   - Confirmation pattern: User must type "delete" to confirm
   - Warning about permanence
   - Info message about in-use restriction
   - Error handling for 409 Conflict

### Tables

1. **SecurityGroupListContainer**
   - Columns: Name/ID, Description, Stateful, Shared/Owning Project, Created At
   - Row actions: Edit, Delete, Access Control (context menu)
   - Click row to navigate to details
   - Empty state with "Create Security Group" button

2. **SecurityGroupDetailsView**
   - Displays all security group properties
   - Edit button
   - Delete button
   - Tabs: Rules (to be implemented), RBAC Policies (to be implemented)

---

## Testing

### Backend Tests

File: `apps/aurora-portal/src/server/Network/routers/securityGroupRouter.test.ts`

Tests cover:
- ✅ List security groups with pagination and filtering
- ✅ Get security group by ID
- ✅ Create security group
- ✅ Update security group
- ✅ Delete security group
- ✅ Error handling for all operations

### Frontend Tests

Component tests exist for:
- ✅ `List.test.tsx` - List page integration
- ✅ `CreateSecurityGroupModal.test.tsx` - Create modal component
- ✅ `EditSecurityGroupModal.test.tsx` - Edit modal component
- ✅ `DeleteSecurityGroupDialog.test.tsx` - Delete dialog component
- ✅ `SecurityGroupListContainer.test.tsx` - List container
- ✅ `SecurityGroupTableRow.test.tsx` - Table row component
- ✅ `SecurityGroupDetailsView.test.tsx` - Details view

---

## Implementation Status

### ✅ Completed (Part 1: Security Group Management)

**Backend**:
- ✅ All CRUD procedures implemented
- ✅ Comprehensive error handling with specific messages
- ✅ Input validation with Zod schemas
- ✅ Response parsing and validation
- ✅ Unit tests

**Frontend**:
- ✅ List page with filtering, sorting, search
- ✅ Details page with loading/error states
- ✅ Create modal with validation
- ✅ Edit modal with pre-filled values
- ✅ Delete dialog with confirmation pattern
- ✅ Cache invalidation strategy
- ✅ Component tests

### 🔜 To Be Implemented

**Part 2: Security Group Rules Management**:
- [ ] Security group rules router (`securityGroupRuleRouter.ts`)
- [ ] Create rule modal with dynamic form fields
- [ ] Delete rule dialog
- [ ] Rules table component (ingress/egress)

**Part 3: RBAC Policies**:
- [ ] RBAC policies router (`rbacPolicyRouter.ts`)
- [ ] Manage sharing modal
- [ ] RBAC policies table
- [ ] Create/delete RBAC policy operations

---

## Best Practices

### Error Handling

1. **User-Friendly Messages**: All error messages are human-readable and actionable
2. **Specific Error Codes**: Use appropriate tRPC error codes (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, etc.)
3. **Context in Errors**: Include relevant IDs in error messages for debugging
4. **Special Case Detection**: Detect and handle quota exceeded (413) and in-use conflicts (409)

### Validation

1. **Input Validation**: All inputs validated with Zod schemas before sending to OpenStack
2. **Response Validation**: All OpenStack responses parsed and validated with Zod
3. **Type Safety**: Full TypeScript type safety from frontend to backend

### Performance

1. **BFF-Side Search**: The `searchTerm` parameter is filtered in the BFF layer to reduce API calls
2. **Efficient Pagination**: Support for marker-based pagination
3. **Cache Management**: Strategic invalidation of React Query cache

---

## OpenStack API Reference

For complete API documentation, refer to:
- https://docs.openstack.org/api-ref/network/v2/index.html#security-groups-security-groups

### Key API Endpoints Used

- `GET /v2.0/security-groups` - List security groups
- `GET /v2.0/security-groups/{security_group_id}` - Show security group details
- `POST /v2.0/security-groups` - Create security group
- `PUT /v2.0/security-groups/{security_group_id}` - Update security group
- `DELETE /v2.0/security-groups/{security_group_id}` - Delete security group

---

## Notes

1. **Stateful vs Stateless**: By default, security groups are stateful (return traffic is automatically allowed). Stateless groups require explicit rules for both directions.

2. **Default Security Groups**: Each project has a default security group that cannot be deleted.

3. **Shared Security Groups**: Security groups can be shared with other projects using RBAC policies (Part 3).

4. **Tag Filtering**: Tag filters support comma-separated values and follow OpenStack Neutron semantics.

5. **Splat Routing**: The list page uses TanStack Router's splat parameter (`$`) for flexible routing to different network resources (securitygroups, floatingips).

---

## Migration Notes

If migrating from legacy implementation:
- The route changed from `/network/security-groups` to `/network/securitygroups` (no hyphen)
- All operations now use tRPC instead of direct REST API calls
- React Query handles caching automatically
- Error messages are more user-friendly and specific

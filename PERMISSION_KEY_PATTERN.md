# Permission Key Design Pattern

## 🎯 Pattern: `scope:resource:action`

All new permission keys follow this consistent pattern to decouple the UI from OpenStack-specific implementation details.

---

## 📐 Pattern Structure

```
scope:resource:action
  │      │       │
  │      │       └─ CRUD verb or specific operation
  │      └───────── Domain resource (plural, snake_case)
  └──────────────── Service scope (singular)
```

### Examples:

```typescript
"storage:containers:create" // Create a container
"network:routers:attach_interface" // Attach interface to router
"compute:servers:read" // View server details
```

---

## 🏗️ Component Definitions

### 1. **Scope** (Service Domain)

Represents the high-level service area, **not** the backend implementation.

| Scope     | Description               | ❌ Avoid                           |
| --------- | ------------------------- | ---------------------------------- |
| `storage` | Object storage operations | ❌ `swift`, `ceph` (impl. details) |
| `network` | Network operations        | ❌ `neutron` (OpenStack name)      |
| `compute` | Compute operations        | ✅ (already good)                  |

**Why:** UI shouldn't care if storage is Swift or Ceph.

---

### 2. **Resource** (Domain Entity)

The entity being operated on, using **domain-friendly** language.

| Resource          | Description                | ❌ Avoid                 |
| ----------------- | -------------------------- | ------------------------ |
| `containers`      | Storage containers/buckets | ✅ (clear)               |
| `objects`         | Storage objects            | ✅ (clear)               |
| `floatingips`     | Floating IP addresses      | ❌ `fips` (jargon)       |
| `security_groups` | Security groups            | ❌ `secgroups` (abbrev.) |
| `subnet_pools`    | Subnet pools               | ✅ (readable)            |

**Rules:**

- Always **plural** (`servers`, not `server`)
- Use **snake_case** for multi-word (`security_groups`, not `securityGroups`)
- Prefer **full words** over abbreviations

---

### 3. **Action** (Operation)

The operation being performed, using **consistent verbs**.

#### Core CRUD Operations:

| Action   | Use Case                | Maps To (OpenStack)    |
| -------- | ----------------------- | ---------------------- |
| `read`   | Get single resource     | `get_*`, `show_*`      |
| `list`   | List multiple resources | `index`, `get_*s`      |
| `create` | Create new resource     | `create_*`, `add_*`    |
| `update` | Modify resource         | `update_*`, `modify_*` |
| `delete` | Remove resource         | `delete_*`, `remove_*` |

#### Specific Operations:

| Action         | Use Case           | Example                            |
| -------------- | ------------------ | ---------------------------------- |
| `attach`       | Attach/connect     | `network:routers:attach_interface` |
| `detach`       | Detach/disconnect  | `network:routers:detach_interface` |
| `associate`    | Associate resource | `network:floatingips:associate`    |
| `disassociate` | Disassociate       | `network:floatingips:disassociate` |
| `manage_*`     | Complex management | `storage:containers:manage_acls`   |
| `empty`        | Clear contents     | `storage:containers:empty`         |
| `copy`         | Duplicate          | `storage:objects:copy`             |
| `move`         | Relocate           | `storage:objects:move`             |
| `download`     | Retrieve content   | `storage:objects:download`         |

**Why these verbs:**

- ✅ **CRUD consistency** across all services
- ✅ **UI-friendly** (not OpenStack jargon)
- ✅ **RESTful** principles (read = GET, create = POST, etc.)

---

## 📋 Complete Examples

### Storage (`storage:*`)

```typescript
// Container Operations
"storage:containers:read" // Get container details
"storage:containers:list" // List all containers
"storage:containers:create" // Create new container
"storage:containers:update" // Update container metadata
"storage:containers:delete" // Delete container
"storage:containers:empty" // Empty container contents
"storage:containers:manage_acls" // Manage access control
"storage:containers:read_acls" // View ACLs
"storage:containers:update_acls" // Modify ACLs

// Object Operations
"storage:objects:read" // Get object metadata
"storage:objects:list" // List objects in container
"storage:objects:download" // Download object content
"storage:objects:create" // Upload new object
"storage:objects:update" // Update object/metadata
"storage:objects:delete" // Delete object
"storage:objects:copy" // Copy object
"storage:objects:move" // Move object

// Folder Operations
"storage:folders:create" // Create folder
"storage:folders:create_object" // Create object in folder
"storage:folders:delete" // Delete folder
```

### Network (`network:*`)

```typescript
// Network Operations
"network:networks:read" // Get network details
"network:networks:list" // List networks
"network:networks:create" // Create network
"network:networks:update" // Update network
"network:networks:delete" // Delete network

// Subnet Operations
"network:subnets:read" // Get subnet details
"network:subnets:list" // List subnets
"network:subnets:create" // Create subnet
"network:subnets:update" // Update subnet
"network:subnets:delete" // Delete subnet

// Router Operations
"network:routers:read" // Get router details
"network:routers:list" // List routers
"network:routers:create" // Create router
"network:routers:update" // Update router
"network:routers:delete" // Delete router
"network:routers:attach_interface" // Attach subnet to router
"network:routers:detach_interface" // Detach subnet from router

// Floating IP Operations
"network:floatingips:read" // Get floating IP details
"network:floatingips:list" // List floating IPs
"network:floatingips:create" // Allocate floating IP
"network:floatingips:update" // Update floating IP
"network:floatingips:delete" // Release floating IP
"network:floatingips:associate" // Assign to port/instance
"network:floatingips:disassociate" // Unassign from port

// Security Group Operations
"network:security_groups:read" // Get security group
"network:security_groups:list" // List security groups
"network:security_groups:create" // Create security group
"network:security_groups:update" // Update security group
"network:security_groups:delete" // Delete security group

// Security Group Rule Operations
"network:security_group_rules:read" // Get rule
"network:security_group_rules:list" // List rules
"network:security_group_rules:create" // Create rule
"network:security_group_rules:update" // Update rule
"network:security_group_rules:delete" // Delete rule

// Port Operations
"network:ports:read" // Get port details
"network:ports:list" // List ports
"network:ports:create" // Create port
"network:ports:update" // Update port
"network:ports:delete" // Delete port

// RBAC Policy Operations
"network:rbac_policies:read" // Get RBAC policy
"network:rbac_policies:list" // List RBAC policies
"network:rbac_policies:create" // Create RBAC policy
"network:rbac_policies:update" // Update RBAC policy
"network:rbac_policies:delete" // Delete RBAC policy
```

---

## 🔄 Mapping to OpenStack

The permission keys map to OpenStack policy rules in the router:

```typescript
const STORAGE_MAPPINGS = {
  // UI Key (decoupled)          OpenStack Rule (implementation)
  "storage:containers:create": { engine: "swift", rule: "object_storage:container_create" },
  "network:routers:create": { engine: "network", rule: "create_router" },
}
```

**Benefits:**

- ✅ UI uses `storage:containers:create` (clear, consistent)
- ✅ Backend maps to `object_storage:container_create` (OpenStack-specific)
- ✅ Easy to swap backends without changing UI code
- ✅ Consistent permission checks across all services

---

## 🎨 UI Usage Examples

### React Component

```typescript
import { trpc } from "@/lib/trpc"

function ContainerList({ projectId }) {
  // Check multiple permissions at once
  const { data: permissions } = trpc.storage.canUser.useQuery({
    project_id: projectId,
    permission: [
      "storage:containers:list",
      "storage:containers:create",
      "storage:containers:delete"
    ]
  })

  const [canList, canCreate, canDelete] = permissions ?? [false, false, false]

  return (
    <div>
      {canList && <ContainerTable />}
      {canCreate && <CreateButton />}
      {canDelete && <DeleteButton />}
    </div>
  )
}
```

### Conditional Rendering

```typescript
// Check single permission
const [canAttach] = await trpc.network.canUser.query({
  project_id: projectId,
  permission: "network:routers:attach_interface",
})

if (canAttach) {
  showAttachInterfaceButton()
}
```

---

## ✅ Benefits of This Pattern

### 1. **UI Decoupling**

- Frontend doesn't know about Swift, Ceph, or Neutron
- Uses domain language (`storage`, `network`, `containers`)

### 2. **Consistency**

- Same verbs across all services (`read`, `create`, `update`, `delete`)
- Same structure everywhere (`scope:resource:action`)

### 3. **Maintainability**

- Easy to understand what each permission does
- Clear mapping to OpenStack rules
- Self-documenting code

### 4. **Extensibility**

- Can add new backends without changing UI
- Can introduce abstract layers (RBAC capabilities) later
- Custom apps can override mappings

### 5. **Type Safety**

- TypeScript infers all valid permission keys
- Compile-time errors for typos
- Autocomplete in IDE

---

## 🚫 Anti-Patterns to Avoid

### ❌ Implementation Details in Keys

```typescript
// BAD - Exposes backend implementation
"swift:container_list"
"ceph:bucket_list"
"neutron:network_create"

// GOOD - Backend-agnostic
"storage:containers:list"
"storage:containers:list" // Same key for both!
"network:networks:create"
```

### ❌ Inconsistent Verbs

```typescript
// BAD - Mixed terminology
"servers:list" // list
"servers:show" // show
"servers:index" // index
"servers:get" // get

// GOOD - Consistent CRUD
"compute:servers:list" // List all
"compute:servers:read" // Get one
```

### ❌ OpenStack Jargon

```typescript
// BAD - OpenStack-specific terms
"flavor_specs:list"
"tenant_networks:create"
"os_compute_api:servers:index"

// GOOD - Domain language
"compute:flavor_properties:list"
"network:networks:create"
"compute:servers:list"
```

### ❌ Abbreviations

```typescript
// BAD - Unclear abbreviations
"net:fips:create"
"sec:groups:list"

// GOOD - Clear, full words
"network:floatingips:create"
"network:security_groups:list"
```

---

## 🔮 Future Enhancements

### 1. **Runtime Backend Selection**

```typescript
// Future: Select backend at runtime
const [canCreate] = await trpc.storage.canUser.query({
  project_id: projectId,
  permission: "storage:containers:create",
  backend: "ceph", // or "swift"
})
```

### 2. **Abstract Capabilities**

```typescript
// Future: Role-based capabilities
"storage.buckets.viewer" // Can read
"storage.buckets.editor" // Can read + write
"storage.buckets.admin" // Full control
```

### 3. **Custom App Overrides**

```typescript
// Custom apps can define their own mappings
const CUSTOM_MAPPINGS = {
  "myapp:documents:upload": [
    { engine: "swift", rule: "object_storage:object_update" },
    { engine: "ceph", rule: "object_storage:object_update" },
  ],
}
```

---

## 📚 Summary

**Pattern:** `scope:resource:action`

**Rules:**

1. ✅ Use service domain for scope (not implementation)
2. ✅ Use plural, domain-friendly resource names
3. ✅ Use consistent CRUD verbs
4. ✅ Avoid OpenStack jargon
5. ✅ Keep it readable and self-documenting

**Result:**

- Clean, consistent API
- UI decoupled from OpenStack
- Easy to maintain and extend
- Type-safe with great DX

---

## 🎯 Quick Reference

| Old (Bad)              | New (Good)                       | Why              |
| ---------------------- | -------------------------------- | ---------------- |
| `swift:container_list` | `storage:containers:list`        | Backend-agnostic |
| `servers:show`         | `compute:servers:read`           | Consistent verb  |
| `flavor_specs:list`    | `compute:flavor_properties:list` | Domain language  |
| `fips:create`          | `network:floatingips:create`     | No abbreviations |
| `secgroups:list`       | `network:security_groups:list`   | Full words       |

**When in doubt:** Think about what the **user** wants to do, not what **OpenStack** calls it.

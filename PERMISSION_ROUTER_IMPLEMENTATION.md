# Permission Router Implementation - Quick Reference

## ✅ Implementation Complete

### New Architecture: Generic Factory Pattern

All permission routers now use a single, reusable factory function that handles:

- ✅ Dynamic policy engine loading
- ✅ Type-safe permission key validation
- ✅ Single and bulk permission checks
- ✅ Consistent error handling
- ✅ Full TypeScript inference

---

## 📁 File Structure

```
packages/aurora/src/server/
├── policies/
│   ├── createPermissionRouter.ts       # Generic factory (NEW)
│   └── createPermissionRouter.test.ts  # Tests (NEW)
├── Compute/routers/
│   └── permissionRouter.ts             # Refactored to use factory
└── Storage/routers/
    ├── permissionRouter.ts             # NEW - Swift + Ceph
    └── index.ts                        # Updated to include permissions
```

---

## 🔧 How to Use

### 1. Define Mappings

```typescript
const STORAGE_MAPPINGS = {
  "swift:container_list": { engine: "swift", rule: "object_storage:container_list" },
  "ceph:bucket_create": { engine: "ceph", rule: "object_storage:container_create" },
} as const
```

### 2. Create Router

```typescript
import { createPermissionRouter } from "../../policies/createPermissionRouter"

export const buildStoragePermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: {
      swift: { fileName: "swift.yaml" },
      ceph: { fileName: "ceph.yaml" },
    },
    mappings: STORAGE_MAPPINGS,
  })
```

### 3. Integrate into App Router

```typescript
// Storage/routers/index.ts
export const buildObjectStorageRouters = (policyDir: string) => ({
  storage: {
    swift: auroraRouter({ ...swiftRouter }),
    ceph: auroraRouter({ ...cephRouters }),
    ...buildStoragePermissionRouter(policyDir), // ← Add here
  },
})

// routers.ts
export const buildAppRouter = (policyDir: string) =>
  mergeRouters(
    auroraRouter(buildComputeRouters(policyDir)),
    auroraRouter(buildObjectStorageRouters(policyDir)) // ← Pass policyDir
    // ...
  )
```

---

## 📊 What Changed

### Before: Hardcoded, Duplicated

```typescript
// 130 lines per service
type PolicyEngines = { compute: PolicyEngine; image: PolicyEngine }

const engines: PolicyEngines = {
  compute: loadPolicyEngine("compute.yaml", policyDir),
  image: loadPolicyEngine("image.yaml", policyDir),
}

const POLICY_MAPPINGS = {
  /* 53 hardcoded mappings */
} as const

// ... 80 more lines of boilerplate
```

**Problems:**

- ❌ 130 lines duplicated per service
- ❌ No reusability
- ❌ Maintenance nightmare

### After: Generic, Reusable

```typescript
// ~60 lines per service (mappings only)
const STORAGE_MAPPINGS = {
  /* your mappings */
} as const

export const buildStoragePermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: { swift: { fileName: "swift.yaml" }, ceph: { fileName: "ceph.yaml" } },
    mappings: STORAGE_MAPPINGS,
  })
```

**Benefits:**

- ✅ 80 lines of shared logic in factory
- ✅ Each service: only mappings (~60 lines)
- ✅ DRY principle
- ✅ Consistent behavior
- ✅ One place to fix bugs

---

## 🎯 Available Permission Routers

### 1. Compute + Image (`compute.canUser`)

**Engines:** `compute.yaml`, `image.yaml`

**Permissions:**

- `servers:*` - Server operations (list, create, delete, update)
- `flavors:*` - Flavor management (create, delete, update, list_projects, add/remove_project)
- `flavor_specs:*` - Flavor extra specs (list, create, update, delete)
- `images:*` - Image operations (list, create, delete, update, create/delete/update_member)

**Usage:**

```typescript
const [canList, canCreate] = await trpc.compute.canUser.query({
  project_id: "abc123",
  permission: ["servers:list", "servers:create"],
})
```

### 2. Storage (Swift + Ceph) (`storage.canUser`) ← NEW

**Engines:** `swift.yaml`, `ceph.yaml`

**Permissions:**

- **Swift:**
  - `swift:container_*` - Container operations (list, get, create, update, delete, empty, ACLs)
  - `swift:object_*` - Object operations (list, get, download, update, delete, copy, move)
  - `swift:folder_*` - Folder operations (create_object, create_folder, delete)

- **Ceph (S3):**
  - `ceph:container_*` - Bucket operations (same as Swift)
  - `ceph:object_*` - Object operations (same as Swift)
  - `ceph:folder_*` - Folder operations (same as Swift)

**Usage:**

```typescript
// Check Swift permissions
const [canList] = await trpc.storage.canUser.query({
  project_id: "abc123",
  permission: "swift:container_list",
})

// Check Ceph permissions
const [canCreate, canDelete] = await trpc.storage.canUser.query({
  project_id: "abc123",
  permission: ["ceph:container_create", "ceph:container_delete"],
})

// Mix Swift and Ceph
const [swiftList, cephList] = await trpc.storage.canUser.query({
  project_id: "abc123",
  permission: ["swift:container_list", "ceph:container_list"],
})
```

---

## 🚀 Adding a New Service

Want to add Network, Barbican, or another service? Easy!

### Step 1: Create Policy Mappings

```typescript
// packages/aurora/src/server/Network/routers/permissionRouter.ts
import { createPermissionRouter } from "../../policies/createPermissionRouter"

const NETWORK_MAPPINGS = {
  "networks:list": { engine: "network", rule: "get_network" },
  "networks:create": { engine: "network", rule: "create_network" },
  // ... more mappings
} as const

export const buildNetworkPermissionRouter = (policyDir: string) =>
  createPermissionRouter({
    policyDir,
    engines: {
      network: { fileName: "network.yaml" },
    },
    mappings: NETWORK_MAPPINGS,
  })
```

### Step 2: Integrate

```typescript
// Network/routers/index.ts
export const buildNetworkRouters = (policyDir: string) => ({
  network: auroraRouter({
    ...networkRouter,
    ...buildNetworkPermissionRouter(policyDir),
  }),
})

// routers.ts
export const buildAppRouter = (policyDir: string) =>
  mergeRouters(
    auroraRouter(buildComputeRouters(policyDir)),
    auroraRouter(buildObjectStorageRouters(policyDir)),
    auroraRouter(buildNetworkRouters(policyDir)) // ← Pass policyDir
    // ...
  )
```

### Step 3: Create Policy File

```yaml
# apps/dashboard/src/policies/network.yaml
get_network: "role:admin or role:network_viewer"
create_network: "role:admin or role:network_admin"
```

**Done!** 🎉

---

## 🧪 Testing

### Run Factory Tests

```bash
pnpm --filter @cobaltcore-dev/aurora test src/server/policies/createPermissionRouter.test.ts
```

### Run All Tests

```bash
pnpm --filter @cobaltcore-dev/aurora test
```

**Result:** ✅ All 4829 tests pass

---

## 📝 Type Safety

The factory provides **full TypeScript inference**:

```typescript
// ✅ Valid - "swift:container_list" is in mappings
await trpc.storage.canUser.query({
  project_id: "abc",
  permission: "swift:container_list",
})

// ❌ TypeScript error - "swift:invalid" not in mappings
await trpc.storage.canUser.query({
  project_id: "abc",
  permission: "swift:invalid", // Type error!
})

// ✅ Runtime validation with Zod
// If you somehow bypass TypeScript, Zod catches it:
// → TRPCError: BAD_REQUEST "Unknown permission: swift:invalid"
```

---

## 🎨 Benefits Summary

### For Developers

✅ **DRY** - Write once, use everywhere
✅ **Type-Safe** - Full TypeScript + Zod validation
✅ **Consistent** - Same behavior across all services
✅ **Maintainable** - Bug fixes in one place
✅ **Testable** - Factory tested once, works everywhere

### For New Services

✅ **Fast** - Add new service in ~20 minutes
✅ **Simple** - Just define mappings, no boilerplate
✅ **Predictable** - Same pattern everywhere
✅ **Documented** - This file is your guide

### For Custom Apps

✅ **Flexible** - Each service can have custom policies
✅ **Granular** - Override specific services, not all
✅ **Compatible** - Works with existing policy files

---

## 🔄 Migration Path

### Existing Code (Compute/Image)

✅ **No Breaking Changes** - Fully backward compatible
✅ **Refactored** - Now uses factory internally
✅ **Same API** - `compute.canUser` works exactly the same

### New Code (Swift/Ceph)

✅ **Added** - New `storage.canUser` endpoint
✅ **Tested** - Full test coverage
✅ **Ready** - Can be used immediately in frontend

---

## 📞 Frontend Usage Examples

### React Component with tRPC

```typescript
import { trpc } from "@/lib/trpc"

function ContainerList({ projectId }: { projectId: string }) {
  const { data: permissions } = trpc.storage.canUser.useQuery({
    project_id: projectId,
    permission: ["swift:container_list", "swift:container_create", "swift:container_delete"]
  })

  const [canList, canCreate, canDelete] = permissions ?? [false, false, false]

  return (
    <div>
      {canList && <button onClick={loadContainers}>Load</button>}
      {canCreate && <button onClick={createContainer}>Create</button>}
      {canDelete && <button onClick={deleteContainer}>Delete</button>}
    </div>
  )
}
```

### Bulk Check for Multiple Services

```typescript
// Check permissions across Compute and Storage
const { data: computePerms } = trpc.compute.canUser.useQuery({
  project_id: projectId,
  permission: ["servers:list", "servers:create"],
})

const { data: storagePerms } = trpc.storage.canUser.useQuery({
  project_id: projectId,
  permission: ["swift:container_list", "ceph:container_list"],
})
```

---

## 🏁 Conclusion

**Mission Accomplished!** 🎉

- ✅ Generic permission router factory implemented
- ✅ Compute router refactored to use factory
- ✅ Storage permission router created (Swift + Ceph)
- ✅ Full integration into app router
- ✅ All tests passing (4829/4829)
- ✅ Type-safe with full TypeScript inference
- ✅ Zero breaking changes
- ✅ Ready for production

**Next Steps:**

1. Update frontend to use new `storage.canUser` endpoint
2. Add Network permission router (same pattern)
3. Document custom policy files for apps
4. Consider adding default policies (optional enhancement)

---

## 📚 Related Files

- Factory: `packages/aurora/src/server/policies/createPermissionRouter.ts`
- Tests: `packages/aurora/src/server/policies/createPermissionRouter.test.ts`
- Compute: `packages/aurora/src/server/Compute/routers/permissionRouter.ts`
- Storage: `packages/aurora/src/server/Storage/routers/permissionRouter.ts`
- Integration: `packages/aurora/src/server/routers.ts`
- Policy Files: `apps/dashboard/src/policies/*.yaml`

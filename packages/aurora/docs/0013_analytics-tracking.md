# Analytics Tracking in Routes

This guide explains how to add semantic analytics tracking to your routes using TanStack Router's `staticData`.

## Overview

Aurora's analytics system uses the `onResolved` event from TanStack Router to track page views. Instead of tracking raw URLs like `/projects/abc-123/storage/swift/containers`, we track semantic names like `storage.swift.list` that have meaning independent of dynamic parameters.

## Basic Pattern

Add an `analytics` field to your route's `staticData`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/$provider/$storageType/")({
  staticData: {
    section: "storage",
    service: "swift",
    analytics: {
      name: "storage.swift.list"
    }
  } satisfies RouteInfo,
  component: StorageComponent,
})
```

## Naming Convention

Use dot-separated semantic names that describe **what** the user is viewing, not the URL structure:

### ✅ Good Examples
- `storage.swift.list` - List of Swift containers
- `storage.swift.detail` - Single Swift container detail view
- `compute.flavors.list` - List of compute flavors
- `compute.instances.create` - Instance creation form
- `network.floatingips.edit` - Edit floating IP

### ❌ Avoid
- `/_auth/projects/$projectId/storage/swift/` - Raw route paths
- `/projects/abc-123/storage/swift/containers` - URLs with IDs
- `page_view_storage_swift` - Generic prefixes

## Pattern by Route Type

### List Views
```tsx
analytics: {
  name: "storage.swift.list"
}
```

### Detail Views
```tsx
analytics: {
  name: "storage.swift.detail"
}
```

### Action Views (Create/Edit)
```tsx
analytics: {
  name: "compute.instances.create"
}
```

### Section Landing Pages
```tsx
analytics: {
  name: "compute.overview"
}
```

## What Gets Tracked

The analytics event includes:

```typescript
{
  source: "router",
  action: "storage.swift.list",  // From analytics.name, or routeId if not set
  metadata: {
    pathname: "/projects/abc-123/storage/swift/containers",  // For debugging
    search: "?sortBy=name",  // Query params (if present)
  }
}
```

The semantic `action` name contains all the context you need - section, service, and operation are all encoded in the analytics name itself (e.g., `storage.swift.list`).

## Fallback Behavior

If you don't set `analytics.name`, the system falls back to the `routeId`:

```typescript
// Without analytics.name:
action: "/_auth/projects/$projectId/storage/$provider/$storageType/"

// With analytics.name:
action: "storage.swift.list"
```

## Migration Guide

To add analytics tracking to an existing route:

1. **Identify the semantic name** - What is the user actually viewing?
   - Swift containers list → `storage.swift.list`
   - Flavor detail page → `compute.flavors.detail`

2. **Add the analytics field** to staticData:
   ```tsx
   staticData: {
     section: "storage",
     service: "swift",
     analytics: { name: "storage.swift.list" }  // ADD THIS
   } satisfies RouteInfo
   ```

3. **Test** - Navigate to the route and check the console for the track event

## Complete Example

```tsx
import { createFileRoute } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { z } from "zod"

const searchSchema = z.object({
  sortBy: z.enum(["name", "size"]).optional(),
  search: z.string().optional(),
})

export const Route = createFileRoute("/_auth/projects/$projectId/compute/flavors")({
  staticData: {
    section: "compute",
    service: "flavors",
    sectionCrumb: { labelKey: "Compute" },
    crumb: { labelKey: "Flavors" },
    analytics: {
      name: "compute.flavors.list"
    }
  } satisfies RouteInfo,
  validateSearch: searchSchema,
  component: FlavorsComponent,
})
```

## Best Practices

1. **Be consistent** - Use the same naming pattern across your app
2. **Be specific** - `storage.swift.list` is better than `storage.list`
3. **Keep it flat** - 2-3 levels deep is ideal (section.service.action)
4. **Add analytics early** - Add it when creating the route, not as an afterthought
5. **Document unusual names** - If the semantic name isn't obvious, add a comment

## Testing

To verify your analytics tracking works:

1. Start the dev server
2. Navigate to your route
3. Check the console for `>>>>Track event metadata:`
4. Verify the `action` field contains your semantic name

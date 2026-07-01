# Analytics Tracking Guide

This guide explains how to implement analytics tracking in the Aurora dashboard for both route navigation and user actions.

## Overview

The Aurora dashboard uses a semantic analytics system that tracks:

1. **Page views** - Automatic tracking when users navigate between routes
2. **User actions** - Manual tracking when users interact with modals, buttons, and components

## Naming Conventions

### Page View Actions

Format: `section.service.list` or `section.service.detail`

**Examples:**

- `projects.list` - List of all projects
- `projects.detail` - Detail view of a specific project
- `compute.flavors.list` - List of compute flavors
- `compute.flavors.detail` - Detail view of a specific flavor
- `network.securitygroups.list` - List of security groups
- `storage.swift.list` - List of Swift containers (provider dynamically replaced)

### User Action Events

Format: `section.service.resource.action` or `section.service.resource.action.state`

**Examples:**

- `storage.swift.container.create.open` - User opened the create container modal
- `storage.swift.container.create.close` - User closed the modal without creating
- `storage.ceph.bucket.create.open` - User opened the create bucket modal
- `storage.ceph.bucket.create.close` - User closed the modal without creating
- `compute.securitygroups.rule.add.open` - User opened the add rule dialog
- `network.floatingips.associate.open` - User opened the associate floating IP dialog

## Route Tracking

Route tracking happens automatically when users navigate between pages. The system uses TanStack Router's `onResolved` event.

### Implementation

Add the `analytics` field to your route's `staticData`:

```typescript
import { createFileRoute } from "@tanstack/react-router"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/compute/flavors/")({
  staticData: {
    section: "compute",
    service: "flavors",
    analytics: {
      name: "compute.flavors.list",
    },
    sectionCrumb: { labelKey: "Compute" },
    crumb: { labelKey: "Flavors" },
  } satisfies RouteInfo,
  component: RouteComponent,
})
```

### Dynamic Provider Replacement

For storage routes, the system automatically replaces `objectstore` with the actual provider (swift or ceph):

```typescript
export const Route = createFileRoute("/_auth/projects/$projectId/storage/$provider/$storageType/")({
  staticData: {
    section: "storage",
    service: "containers",
    analytics: {
      name: "storage.objectstore.list", // Becomes "storage.swift.list" or "storage.ceph.list"
    },
  } satisfies RouteInfo,
  // ...
})
```

The replacement happens in `setupRouterAnalytics.ts` by checking the `provider` param.

### Fallback Behavior

If a route doesn't have `analytics.name` set, the system falls back to using the `routeId` as the action name. This ensures backward compatibility.

## Action Tracking (User Interactions)

Action tracking is for user-initiated events like creating, deleting, or editing resources. These don't go through the router and must be tracked manually.

### Implementation

1. **Import useRouteContext** to access the tracking callback:

```typescript
import { useRouteContext } from "@tanstack/react-router"
```

2. **Get the tracking function** from context:

```typescript
const { onTrackEvent } = useRouteContext({ strict: false })
```

3. **Call onTrackEvent** when user actions occur:

```typescript
import { useEffect, useState, useRef } from "react"

const [hasSubmitted, setHasSubmitted] = useState(false)
const hasTrackedOpen = useRef(false)

// Track when user opens a modal (only once per session)
useEffect(() => {
  if (isOpen && !hasTrackedOpen.current) {
    onTrackEvent?.({
      source: "user-action",
      action: "storage.swift.container.create.open",
      metadata: {
        accessed: true,
      },
    })
    hasTrackedOpen.current = true
  }
}, [isOpen, onTrackEvent])

// Track submission attempt
const handleSubmit = () => {
  setHasSubmitted(true)
  submitForm()
}

// Track when user closes without submitting
const handleClose = () => {
  if (isOpen && !hasSubmitted) {
    onTrackEvent?.({
      source: "user-action",
      action: "storage.swift.container.create.close",
      metadata: {
        cancelled: true,
      },
    })
  }

  // All cleanup in one place
  setHasSubmitted(false)
  hasTrackedOpen.current = false
  onClose()
}
```

### Complete Example: Create Bucket Modal

This example shows tracking user behavior (accessing and leaving the modal) using `useEffect` with `useRef` to prevent duplicate tracking:

```typescript
import { useState, useEffect, useRef } from "react"
import { useRouteContext } from "@tanstack/react-router"
import { Modal, TextInput } from "@cloudoperators/juno-ui-components"

export const CreateBucketModal = ({ isOpen, onClose }) => {
  const [bucketName, setBucketName] = useState("")
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const { onTrackEvent } = useRouteContext({ strict: false })
  const hasTrackedOpen = useRef(false)

  // Track when user opens the create modal (only once per session)
  useEffect(() => {
    if (isOpen && !hasTrackedOpen.current) {
      onTrackEvent?.({
        source: "user-action",
        action: "storage.ceph.bucket.create.open",
        metadata: {
          accessed: true,
        },
      })
      hasTrackedOpen.current = true
    }
  }, [isOpen, onTrackEvent])

  const createBucketMutation = trpcReact.storage.ceph.containers.create.useMutation({
    onSuccess: () => {
      onSuccess?.(bucketName)
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  const handleSubmit = () => {
    if (!validateName(bucketName)) return
    setHasSubmitted(true)  // Mark that user submitted the form
    createBucketMutation.mutate({ bucketName })
  }

  const handleClose = () => {
    // Track cancellation only if user didn't submit
    if (isOpen && !hasSubmitted) {
      onTrackEvent?.({
        source: "user-action",
        action: "storage.ceph.bucket.create.close",
        metadata: {
          cancelled: true,
        },
      })
    }

    // All cleanup in one place
    setBucketName("")
    setHasSubmitted(false)
    hasTrackedOpen.current = false
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal open={isOpen} onClose={handleClose} onConfirm={handleSubmit}>
      {/* Modal content */}
    </Modal>
  )
}
```

**Key points:**

- `useEffect` = Proper side effect container (React best practice)
- `useRef` = Prevents duplicate tracking on re-opens or re-renders
- Works correctly with React 18 Strict Mode
- `hasSubmitted` flag = Clearly tracks whether user submitted vs. cancelled
- All cleanup logic consolidated in `handleClose` for better maintainability

### Important: Track User Behavior, Not Action Results

**What to track:**

- When the user opens a create/edit modal (`.open` suffix)
- When the user closes a modal without completing (`.close` suffix)
- When the user clicks a button or initiates an action
- When the user selects a tab or filter
- When the user navigates within a feature

**What NOT to track:**

- Whether the backend operation succeeded (that's for error monitoring, not analytics)
- Internal state changes that the user didn't initiate
- Automatic retries or background processes
- API call results or errors

**Example - Wrong Approach:**

```typescript
// ❌ Don't track mutation results
createBucketMutation.onSuccess(() => {
  onTrackEvent({ action: "storage.ceph.bucket.create", metadata: { success: true } })
})
```

**Example - Correct Approach:**

```typescript
// ✅ Track user accessing the feature
useEffect(() => {
  if (isOpen) {
    onTrackEvent({ action: "storage.ceph.bucket.create.open", metadata: { accessed: true } })
  }
}, [isOpen])

// ✅ Track user leaving without completing
const handleClose = () => {
  if (isOpen && !isPending && !isSuccess) {
    onTrackEvent({ action: "storage.ceph.bucket.create.close", metadata: { cancelled: true } })
  }
  onClose()
}
```

## Metadata Guidelines

### Always Include

- `accessed: true` - When user opens/accesses a feature
- `cancelled: true` - When user closes/cancels without completing

### Sometimes Include

- Configuration options that the user selected (e.g., `versioning: boolean`)
- User selections (e.g., selected tab, filter value)
- Context that helps understand user intent

### Never Include

- Success/failure state of backend operations
- Error messages from API calls
- Sensitive data (passwords, tokens, keys)
- Full stack traces
- User personal information beyond what's necessary

## When to Use Router Tracking vs Manual Tracking

### Use Router Tracking (Automatic)

- Page navigation events
- Route changes
- Deep linking
- Back/forward navigation

**Characteristics:**

- Always uses `source: "router"`
- Action is the semantic route name or routeId
- Includes `pathname` and optionally `search` in metadata

### Use Manual Tracking (onTrackEvent)

- Opening modals or dialogs (`.open` suffix)
- Closing modals without completing an action (`.close` suffix)
- Tab changes within a page
- Filter selections
- Button clicks that don't navigate
- Any user-initiated interaction that doesn't change the route

**Characteristics:**

- Always uses `source: "user-action"`
- Action follows `section.service.resource.action.state` pattern
- Tracks user **intent** and **interaction**, not results
- Includes `accessed` or `cancelled` in metadata
- Includes additional context as needed (user selections, configuration)

## Migration Guide

### Updating Existing Routes

If your route doesn't have analytics yet:

1. Add the `analytics` field to `staticData`:

```typescript
staticData: {
  section: "compute",
  service: "images",
  analytics: {
    name: "compute.images.list", // Add this
  },
} satisfies RouteInfo,
```

2. Choose a semantic name following the convention:
   - List pages: `section.service.list`
   - Detail pages: `section.service.detail`
   - Storage: Use `storage.objectstore.X` for automatic provider replacement

### Adding Action Tracking

For modals and components that allow users to create/delete/edit resources:

1. Import useRouteContext and useEffect:

```typescript
import { useRouteContext } from "@tanstack/react-router"
import { useEffect } from "react"
```

2. Get the tracking function:

```typescript
const { onTrackEvent } = useRouteContext({ strict: false })
```

3. Track when user accesses the feature:

```typescript
useEffect(() => {
  if (isOpen) {
    onTrackEvent?.({
      source: "user-action",
      action: "section.service.resource.action.open",
      metadata: { accessed: true },
    })
  }
}, [isOpen, onTrackEvent])
```

4. Track when user leaves without completing:

```typescript
const handleClose = () => {
  if (isOpen && !isPending && !isSuccess) {
    onTrackEvent?.({
      source: "user-action",
      action: "section.service.resource.action.close",
      metadata: { cancelled: true },
    })
  }
  onClose()
}
```

## Current Route Analytics

All major routes in the application already have analytics configured:

- **Projects**: `projects.list`, `projects.detail`
- **Compute**:
  - Flavors: `compute.flavors.list`, `compute.flavors.detail`
  - Images: `compute.images.list`, `compute.images.detail`
- **Network**:
  - Floating IPs: `network.floatingips.list`, `network.floatingips.detail`
  - Security Groups: `network.securitygroups.list`, `network.securitygroups.detail`
- **Services**:
  - PCA: `services.pca.list`, `services.pca.detail`
  - Certificates: `services.pca.certificate.detail`
- **Storage**:
  - Containers/Buckets: `storage.objectstore.list` → `storage.swift.list` / `storage.ceph.list`
  - Objects: `storage.objectstore.detail` → `storage.swift.detail` / `storage.ceph.detail`

## Testing

The analytics system is covered by unit tests in `setupRouterAnalytics.test.ts`:

```bash
pnpm test setupRouterAnalytics.test.ts
```

Key test scenarios:

- Analytics name usage
- Provider replacement for storage routes
- Fallback to routeId when analytics.name is missing
- Metadata structure (pathname, search)
- Error handling

## Architecture

### Files

- `packages/aurora/src/client/routes/routeInfo.ts` - RouteInfo schema with analytics field
- `packages/aurora/src/client/analytics/setupRouterAnalytics.ts` - Router event handler
- `packages/aurora/src/client/analytics/setupRouterAnalytics.test.ts` - Unit tests

### Event Flow

1. User navigates to a route
2. TanStack Router fires `onResolved` event
3. `setupRouterAnalytics` handler extracts route metadata
4. Handler calls `onTrackEvent` with semantic action name
5. Analytics backend receives event with structured data

For user actions, the flow is simpler:

1. User triggers action (e.g., clicks create button)
2. Component calls `onTrackEvent` directly
3. Analytics backend receives event

## Best Practices

1. **Be specific** - Use meaningful names that describe the actual page or action
2. **Be consistent** - Follow the established naming conventions
3. **Track user intent** - Track when users try to do something, not just when it succeeds
4. **Include context** - Add relevant metadata to help analyze user behavior
5. **Protect privacy** - Never track sensitive data
6. **Test thoroughly** - Verify tracking works in both success and error cases
7. **Document new patterns** - Update this guide when adding new tracking patterns

## Troubleshooting

### Analytics not firing

- Verify `onTrackEvent` is provided in router context
- Check that the route has `staticData` with `analytics.name`
- Look for errors in browser console
- Confirm the event handler is called (add console.log temporarily)

### Wrong action name

- Verify `analytics.name` matches the convention
- For storage, confirm provider replacement logic works
- Check that you're not using routeId when you should use analytics.name

### Missing metadata

- Confirm you're including `success` boolean for user actions
- Add relevant context fields based on the action type
- Don't include sensitive data in metadata

## Additional Resources

- [TanStack Router Events](https://tanstack.com/router/latest/docs/framework/react/guide/routing-events)
- [RouteInfo Schema](/packages/aurora/src/client/routes/routeInfo.ts)
- [Analytics Setup](/packages/aurora/src/client/analytics/setupRouterAnalytics.ts)

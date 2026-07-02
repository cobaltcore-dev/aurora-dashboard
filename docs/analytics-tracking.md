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

### Using the useModalTracking Hook (Recommended)

For modal tracking, use the `useModalTracking` hook which handles all the complexity:

```typescript
import { useModalTracking } from "@/client/hooks/useModalTracking"

export const CreateBucketModal = ({ isOpen, onClose, onSuccess, onError }) => {
  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.create",
  })

  // handleClose does NOT call trackClose
  const handleClose = () => {
    // ... cleanup
    resetTracking()     // Reset for next modal open
    onClose()
  }

  const handleSubmit = () => {
    markSubmitted()     // Prevents .close tracking on successful submit
    mutation.mutate(...)
  }

  return (
    <Modal
      open={isOpen}
      onCancel={() => {
        trackClose()    // Track .close ONLY when user cancels
        handleClose()
      }}
      onConfirm={handleSubmit}
    >
      {/* ... */}
    </Modal>
  )
}
```

The hook automatically:

- Tracks `.open` event when the modal opens (once per open)
- Tracks `.close` event when cancelled (only if not submitted)
- Handles React 18 Strict Mode correctly
- Uses `source: "modal"` for all events

### Complete Example: Create Bucket Modal

```typescript
import { useState } from "react"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { Modal, TextInput } from "@cloudoperators/juno-ui-components"

export const CreateBucketModal = ({ isOpen, onClose, onSuccess, onError }) => {
  const [bucketName, setBucketName] = useState("")

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.create",
  })

  const createBucketMutation = trpcReact.storage.ceph.containers.create.useMutation({
    onSuccess: () => {
      onSuccess?.(bucketName)
      handleClose()
    },
    onError: (error) => {
      onError?.(bucketName, error.message)
    },
  })

  const handleSubmit = () => {
    if (!validateName(bucketName)) return
    markSubmitted()
    createBucketMutation.mutate({ bucketName })
  }

  // handleClose does NOT call trackClose - that's done in onCancel
  const handleClose = () => {
    setBucketName("")
    createBucketMutation.reset()
    resetTracking()
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onCancel={() => {
        trackClose()   // Track close ONLY when user cancels
        handleClose()
      }}
      onConfirm={handleSubmit}
    >
      {/* Modal content */}
    </Modal>
  )
}
```

**Key points:**

- `useModalTracking` handles all tracking logic
- Call `trackClose()` in `onCancel`, NOT inside `handleClose` - this ensures `.close` is only tracked when user cancels
- Call `markSubmitted()` before your mutation to prevent `.close` tracking on successful submit
- Call `resetTracking()` at the end of your close handler
- The mutation's `onSuccess` calls `handleClose()` directly (without `trackClose()`) so `.close` is not tracked after submit

### Manual Implementation (Advanced)

If you need custom tracking behavior, you can implement it manually:

```typescript
import { useEffect, useRef, useState } from "react"
import { useRouteContext } from "@tanstack/react-router"

const { onTrackEvent } = useRouteContext({ strict: false })
const hasTrackedOpen = useRef(false)
const [hasSubmitted, setHasSubmitted] = useState(false)

// Track when modal opens
useEffect(() => {
  if (isOpen && !hasTrackedOpen.current) {
    onTrackEvent?.({
      source: "modal",
      action: "storage.ceph.bucket.create.open",
    })
    hasTrackedOpen.current = true
  }
}, [isOpen, onTrackEvent])

// Track close without submit
const handleClose = () => {
  if (isOpen && !hasSubmitted) {
    onTrackEvent?.({
      source: "modal",
      action: "storage.ceph.bucket.create.close",
    })
  }
  setHasSubmitted(false)
  hasTrackedOpen.current = false
  onClose()
}
```

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
// ✅ Use the useModalTracking hook
const { trackClose, markSubmitted, resetTracking } = useModalTracking({
  isOpen,
  actionPrefix: "storage.ceph.bucket.create",
})
```

## Metadata Guidelines

### When to Include Metadata

Metadata is optional. The action name (e.g., `.open`, `.close`) already conveys user intent.

Include metadata only when you need additional context:

- Configuration options the user selected (e.g., `versioning: boolean`)
- User selections (e.g., selected tab, filter value)
- Context that helps understand user behavior

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

- Use `source: "modal"` for modal events
- Use `source: "button"` for button clicks
- Action follows `section.service.resource.action.state` pattern
- Tracks user **intent** and **interaction**, not results
- Metadata is optional - include only when additional context is needed

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

For modals and components that allow users to create/delete/edit resources, use the `useModalTracking` hook:

```typescript
import { useModalTracking } from "@/client/hooks/useModalTracking"

const { trackClose, markSubmitted, resetTracking } = useModalTracking({
  isOpen,
  actionPrefix: "section.service.resource.action",
})

// handleClose does NOT call trackClose
const handleClose = () => {
  // ... cleanup
  resetTracking()
  onClose()
}

const handleSubmit = () => {
  markSubmitted()
  // ... submit logic
}

// In your Modal component:
<Modal
  onCancel={() => {
    trackClose()   // Track .close ONLY when user cancels
    handleClose()
  }}
  onConfirm={handleSubmit}
>
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
- `packages/aurora/src/client/hooks/useModalTracking.ts` - Modal tracking hook

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

- Metadata is optional - include only when additional context is needed
- Don't include sensitive data in metadata

## Additional Resources

- [TanStack Router Events](https://tanstack.com/router/latest/docs/framework/react/guide/routing-events)
- [RouteInfo Schema](/packages/aurora/src/client/routes/routeInfo.ts)
- [Analytics Setup](/packages/aurora/src/client/analytics/setupRouterAnalytics.ts)

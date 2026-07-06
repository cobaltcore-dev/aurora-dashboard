# Analytics Tracking Guide

This guide explains how to implement analytics tracking in the Aurora dashboard for both route navigation and user actions.

## Overview

The Aurora dashboard uses a semantic analytics system that tracks:

1. **Page views** - Automatic tracking when users navigate between routes
2. **User actions** - Manual tracking when users interact with modals, buttons, and components

## Architecture

### The `onTrackEvent` Callback

The `onTrackEvent` callback is the **consumer endpoint** for all analytics events. It's passed as a prop to `<AuroraApp />` and called whenever a trackable event occurs:

```typescript
// Consumer implementation
<AuroraApp
  onTrackEvent={(payload) => {
    // Send to your analytics backend
    analytics.track(payload.action, {
      ...payload.metadata,
      source: payload.source,
    })
  }}
/>
```

**Type definition:** See [`AuroraApp.tsx:37-54`](../src/client/AuroraApp.tsx#L37-L54)

The payload structure:

```typescript
{
  source: string      // "router", "modal", "button", etc.
  action: string      // Semantic name or action identifier
  metadata?: Record<string, string | number | boolean | undefined>
}
```

The callback is available to all components via the router context:

```typescript
const { onTrackEvent } = useRouteContext({ strict: false })

onTrackEvent?.({ source: "modal", action: "storage.ceph.bucket.create.open" })
```

### Router Analytics Implementation

**How it works:**

1. Consumer passes `onTrackEvent` callback to `<AuroraApp />`
2. Callback is added to router context in [`App.tsx:140`](../src/client/App.tsx#L140)
3. `setupRouterAnalytics()` subscribes to TanStack Router's `onResolved` event ([`App.tsx:148`](../src/client/App.tsx#L148))
4. On each navigation, it extracts route metadata and calls `onTrackEvent`

**Implementation:** See [`setupRouterAnalytics.ts`](../src/client/analytics/setupRouterAnalytics.ts)

Key behaviors:

- Uses semantic `analytics.name` from route `staticData` if present, otherwise falls back to `routeId`
- For storage routes with `storage.objectstore.X`, automatically replaces `objectstore` with the actual provider (`swift` or `ceph`)
- Always includes `pathname` in metadata, includes `search` when query params exist

## Naming Conventions

### Page View Actions

Format: `section.service.list` or `section.service.detail`

**Examples:**

- `projects.list` - List of all projects
- `compute.flavors.detail` - Detail view of a specific flavor
- `storage.swift.list` - List of Swift containers (provider dynamically replaced)

### User Action Events

Format: `section.service.resource.action` or `section.service.resource.action.state`

**Examples:**

- `storage.swift.container.create.open` - User opened the create container modal
- `storage.swift.container.create.close` - User closed the modal without creating
- `storage.ceph.bucket.create.open` - User opened the create bucket modal
- `compute.securitygroups.rule.add.open` - User opened the add rule dialog

## Route Tracking

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

For storage routes, use `storage.objectstore.X` as the analytics name. The system automatically replaces `objectstore` with the actual provider:

```typescript
analytics: {
  name: "storage.objectstore.list", // Becomes "storage.swift.list" or "storage.ceph.list"
}
```

**Implementation:** See [`setupRouterAnalytics.ts:54-60`](../src/client/analytics/setupRouterAnalytics.ts#L54-L60)

## Action Tracking (User Interactions)

### Modal Actions (Implemented)

For modal tracking, use the `useModalTracking` hook:

**Implementation:** See [`useModalTracking.ts`](../src/client/hooks/useModalTracking.ts)

The hook handles:

- Tracking `.open` event when modal opens (once per open)
- Tracking `.close` event when cancelled (only if not submitted)
- React 18 Strict Mode compatibility
- Uses `useRef` for state to avoid timing races

**Usage:**

```typescript
import { useModalTracking } from "@/client/hooks/useModalTracking"

const { trackClose, markSubmitted, resetTracking } = useModalTracking({
  isOpen,
  actionPrefix: "storage.ceph.bucket.create",
})

const handleClose = () => {
  resetTracking()
  onClose()
}

const handleSubmit = () => {
  markSubmitted()
  mutation.mutate(...)
}

<Modal
  onCancel={() => {
    trackClose()
    handleClose()
  }}
  onConfirm={handleSubmit}
/>
```

**Reference implementations:**

- [`CreateBucketModal.tsx`](../src/client/routes/_auth/projects/$projectId/storage/-components/Ceph/Buckets/CreateBucketModal.tsx) - Complete modal implementation with useModalTracking
- Test files: `EmptyBucketModal.test.tsx`, `EnableVersioningModal.test.tsx`

### Other Actions (Not Yet Implemented)

**Note:** The following patterns are not yet implemented in the codebase. These are examples showing how to add tracking for other action types when needed.

For tracking other user interactions (buttons, tabs, filters, dropdowns), use `onTrackEvent` directly:

```typescript
import { useRouteContext } from "@tanstack/react-router"

const { onTrackEvent } = useRouteContext({ strict: false })

// Button click
const handleDelete = () => {
  onTrackEvent?.({
    source: "button",
    action: "storage.ceph.bucket.delete",
    metadata: { bucketName }, // Optional
  })
  deleteMutation.mutate({ bucketName })
}

// Tab change
const handleTabChange = (tabId: string) => {
  onTrackEvent?.({
    source: "tab",
    action: `compute.instances.view.${tabId}`,
  })
  setActiveTab(tabId)
}

// Filter/search (debounced)
const trackFilter = useMemo(
  () =>
    debounce((value: string) => {
      onTrackEvent?.({
        source: "filter",
        action: "storage.ceph.buckets.filter.search",
        metadata: { value },
      })
    }, 1000),
  [onTrackEvent]
)

// Dropdown selection
const handleBulkAction = (action: string) => {
  onTrackEvent?.({
    source: "dropdown",
    action: `storage.ceph.buckets.bulk.${action}`,
    metadata: { count: selectedBuckets.length },
  })
  performBulkAction(action, selectedBuckets)
}
```

**Pattern:**

```typescript
onTrackEvent?.({
  source: "button" | "tab" | "filter" | "dropdown" | "custom",
  action: "section.service.resource.action[.state]",
  metadata?: { /* optional context */ }
})
```

**Best practices:**

- Use `useRef` for tracking flags to avoid timing races
- Debounce high-frequency events (search, scroll, resize)
- Track user **intent**, not results
- Don't track: cancel buttons (modal `.close`), navigation buttons (router), submit buttons inside modals (modal `.open`)

**Important:** These are examples only. Currently, only modal tracking is implemented in the codebase. Button, tab, filter, and dropdown tracking patterns are provided as guidance for future implementation.

## What to Track

### Track User Behavior

**Modal interactions (implemented):**

- When the user opens a modal (`.open` suffix)
- When the user closes a modal without completing (`.close` suffix)

**Other interactions (not yet implemented, but can be added):**

- Button clicks for destructive or important actions
- Tab switches and view mode changes
- Filter selections and search queries (debounced)
- Dropdown and context menu selections

### Do NOT Track

- Whether the backend operation succeeded (that's for error monitoring)
- Internal state changes that the user didn't initiate
- Automatic retries or background processes
- API call results or errors

## Metadata Guidelines

Metadata is **optional**. The action name already conveys user intent.

**When to include:**

- Configuration options selected (e.g., `versioning: boolean`)
- User selections (e.g., selected tab)
- Context that helps understand behavior

**Never include:**

- Success/failure state of backend operations
- Error messages from API calls
- Sensitive data (passwords, tokens, keys)
- User personal information beyond what's necessary

## Testing

### Router Analytics

**Tests:** See [`setupRouterAnalytics.test.ts`](../src/client/analytics/setupRouterAnalytics.test.ts)

Key scenarios:

- Analytics name usage
- Provider replacement for storage routes
- Fallback to routeId when analytics.name is missing
- Metadata structure

### Modal Tracking

Every modal using `useModalTracking` should have three tests:

1. **Tracks `.open` event** when modal opens
2. **Tracks `.close` event** when user cancels without submitting
3. **Does NOT track `.close`** on successful submit

**Reference implementations:** See `EmptyBucketModal.test.tsx`, `EnableVersioningModal.test.tsx`, `EmptyBucketsModal.test.tsx`

### Button/Tab/Filter Tracking

For other action types, verify the event is tracked with correct payload:

```typescript
it("tracks button click event", async () => {
  const user = userEvent.setup()
  render(<YourComponent />)

  const deleteButton = screen.getByRole("button", { name: "Delete" })
  await user.click(deleteButton)

  expect(mockOnTrackEvent).toHaveBeenCalledWith({
    source: "button",
    action: "storage.ceph.bucket.delete",
    metadata: expect.objectContaining({ bucketName: "test-bucket" })
  })
})
```

Pattern is the same for tab, filter, and dropdown actions - just verify the correct `source` and `action` are used.

**Test setup:**

```typescript
const mockOnTrackEvent = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useRouteContext: () => ({
    onTrackEvent: mockOnTrackEvent,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})
```

## Migration Guide

### Add Analytics to Existing Routes

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

2. Choose a semantic name:
   - List pages: `section.service.list`
   - Detail pages: `section.service.detail`
   - Storage: Use `storage.objectstore.X` for automatic provider replacement

### Add Modal Tracking

Use the `useModalTracking` hook for modals that create/delete/edit resources:

```typescript
import { useModalTracking } from "@/client/hooks/useModalTracking"

const { trackClose, markSubmitted, resetTracking } = useModalTracking({
  isOpen,
  actionPrefix: "section.service.resource.action",
})
```

**Reference implementation:** See [PR #1007](https://github.com/cobaltcore-dev/aurora-dashboard/pull/1007) for example of adding modal tracking to Ceph storage modals.

## Current Route Analytics

Major routes already configured:

- **Projects**: `projects.list`, `projects.detail`
- **Compute**: `compute.flavors.list`, `compute.images.list`, etc.
- **Network**: `network.floatingips.list`, `network.securitygroups.list`, etc.
- **Services**: `services.pca.list`, `services.pca.detail`, etc.
- **Storage**: `storage.objectstore.list` → `storage.swift.list` / `storage.ceph.list`

## Files

- [`AuroraApp.tsx`](../src/client/AuroraApp.tsx) - Type definitions for `onTrackEvent` callback
- [`App.tsx`](../src/client/App.tsx) - Router context setup and analytics initialization
- [`__root.tsx`](../src/client/routes/__root.tsx) - Root route with RouterContext type
- [`routeInfo.ts`](../src/client/routes/routeInfo.ts) - RouteInfo schema with analytics field
- [`setupRouterAnalytics.ts`](../src/client/analytics/setupRouterAnalytics.ts) - Router event handler
- [`setupRouterAnalytics.test.ts`](../src/client/analytics/setupRouterAnalytics.test.ts) - Unit tests
- [`useModalTracking.ts`](../src/client/hooks/useModalTracking.ts) - Modal tracking hook

## Best Practices

1. **Be specific** - Use meaningful names that describe the actual page or action
2. **Be consistent** - Follow the established naming conventions
3. **Track user intent** - Track when users try to do something, not just when it succeeds
4. **Protect privacy** - Never track sensitive data
5. **Test thoroughly** - Verify tracking works in both success and error cases
6. **Document new patterns** - Update this guide when adding new tracking patterns

## Troubleshooting

### Analytics not firing

- Verify `onTrackEvent` is provided to `<AuroraApp />`
- Check that the route has `staticData` with `analytics.name`
- Look for errors in browser console
- Confirm the event handler is called (add console.log temporarily)

### Wrong action name

- Verify `analytics.name` matches the convention
- For storage, confirm provider replacement logic works
- Check that you're not using routeId when you should use analytics.name

## Additional Resources

- [TanStack Router Events](https://tanstack.com/router/latest/docs/framework/react/guide/routing-events)

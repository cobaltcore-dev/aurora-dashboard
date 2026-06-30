# @cobaltcore-dev/aurora

## 0.11.0

### Minor Changes

- 8689aa9: Add badge support to ContentHeader component. Badges can be passed via the `badges` prop and will display on the left side of the actions row below the divider. Also adds consistent mb-8 margin to the header element.
- c67430d: Add JsonEditor component for bucket policy editing
  - New `JsonEditor` component with line numbers and smart indentation
  - BucketPolicyModal now uses JsonEditor with improved UX:
    - Auto-selects template when loaded policy matches a predefined template
    - Empty policy field deletes the policy from the bucket
    - Save button disabled when no changes made
  - Backend validation improvements:
    - Strict schema validation rejects unknown fields
    - Added NotPrincipal, NotAction, NotResource support
    - Human-readable error messages (Statement 1 instead of Statement.0)

- 32223ac: Integrate Juno NotificationManager and replace legacy `<Toast>` notifications across the Ceph object-storage UI. Bucket, object, and credential-prompt notifications now fire through the centralized NotificationManager (`toast.success` / `toast.error` / `toast.warning`) for consistent placement, lifetime, and dismissal. Notification builders return `{ message, description }` instead of the legacy `{ variant, children }` toast props.
- bd484d5: Add `serviceBanner` slot — renders below the page title divider on service pages, receives `auroraContext.currentService`

### Patch Changes

- 4325092: Remove inactivity timeout logout
- 4325092: fix: add router to useCallback dependencies in AuthProvider

  Fixes stale closure issue where logout and closeInactivityModal callbacks could capture outdated router references.

## 0.10.0

### Minor Changes

- 783d7f0: Ceph global refactor, ui/ux changes, bugs fixing

### Patch Changes

- e232ad0: Improve login error handling to show specific error messages for invalid credentials (401 errors) instead of generic "unexpected error". Simplify SideNavBar implementation by removing complex state management and keeping navigation sections always open.
- 7a5acd1: Fix Swift Object Storage UI findings from UX review (#916)

  **Destructive modals — high-risk pattern**

  Applied `<Message variant="danger">` + type-to-confirm `<TextInput>` to all irreversible bulk actions:
  - `DeleteFolderModal`: danger Message, type `"delete"` to confirm
  - `DeleteObjectsModal`: danger Message, type `"delete"` to confirm, count-aware title (`Delete # Object / Delete # Objects`)
  - `EmptyContainersModal`: danger Message, type `"empty"` to confirm, count-aware title and bulk menu label (`Empty # Containers`), `<DescriptionList>` for container names, removed "Please note:" prefix

  **GenerateTempUrlModal**
  - Title `"Share object:"` → `"Share URL:"`, row menu item renamed to match
  - "No Temp URL key" warning wrapped in `<Message variant="warning">`
  - Generate URL button disabled when no key is configured
  - Cancel label: `"Close"` → `"Cancel"`

  **MoveRename and Copy modals**
  - Title capitalisation: `"object"` → `"Object"`
  - Target path `<TextInput readOnly>` replaced with plain `<p>`
  - Destination picker filters to folders only
  - New folder form: placeholder, button order, and dismiss label (`"Cancel"` → `"Discard"`) corrected

  **ManageContainerAccessModal**
  - Title capitalisation: `"container"` → `"Container"`, `font-mono` removed from container name
  - "Before proceeding" warning wrapped in `<Message variant="warning">`
  - Redundant intro paragraph removed; "Changes take effect immediately" note added above Save
  - ACL preview rows replaced with `<DescriptionList>`
  - Preview headings renamed to `"Read ACLs — Preview"` / `"Write ACLs — Preview"`

  **Bulk action scoping**
  - Folder rows show a disabled `<Checkbox>` with a `<Tooltip>` instead of an empty cell
  - Bulk delete button uses count-aware label (`Delete # Object / Delete # Objects`)

  **DataGrid header cleanup**
  - Select-all header checkbox removed from `ContainerTableView` and `ObjectsTableView`
  - Dead `allSelected` / `handleSelectAll` logic removed

  **Monospace removal**
  - `font-mono` removed from all user-defined name/path values across Swift views

## 0.9.0

### Minor Changes

- 00bfb76: Add new consumer extension points and service filtering:
  - `login` slot — replaces the default login form; useful for OIDC environments
  - `serviceBadge` slot — renders inline next to each service label in the side nav and project home cards; receives `auroraContext.currentService`
  - `servicePageActions` slot — renders beside the service page title in `ContentHeader`; receives `auroraContext.currentService`
  - `projectsBanner` slot — renders below the "Projects" heading on the projects list page
  - `projectOverviewBanner` slot — renders below the project description on the project overview page
  - `enabledServices` prop — whitelist of service keys; when provided, only listed services appear in the nav and project home cards
  - Refactor `SideNavBar` into `buildNavSections` utility for better testability

## 0.8.1

### Patch Changes

- bae772e: upgrade juno-ui-components to 9.0.1; add description to project header; fix non-clickable breadcrumb items showing pointer cursor; redesign project overview service cards to match project card layout

## 0.8.0

### Minor Changes

- ce6bb7a: Adds behavioral analytics support to Aurora through a new generic onTrackEvent callback prop

### Patch Changes

- 2182bff: Expose the `res` (FastifyReply) object in `AuroraPortalContext` to allow consumer tRPC procedures to set response headers and cookies.
- ae3a00b: Upgrade @cloudoperators/juno-ui-components
- e89fdbb: Fixes a race condition where router analytics subscription was being set up before the `onTrackEvent` callback was available in the router context. This prevented analytics events from being tracked properly.
- 874b07d: Fixed pagination in the Flavor and Image pages: the current page now updates based on number input in the pagination component.

## 0.7.0

### Minor Changes

- 662f071: Make `createServer` extensible for consumers. Extra tRPC routers can now be passed via `routers` in `AuroraServerConfig` and are merged into the Aurora router at startup, sharing the same context (session, cookies, OpenStack). The tRPC primitives needed to build compatible routers (`auroraRouter`, `protectedProcedure`, `projectScopedProcedure`, `domainScopedProcedure`, and the scoped input schemas) are now exported from the package. Built-in HTTP metrics collection has been removed from `createServer` — consumers can register their own metrics solution on the `FastifyInstance` returned before calling `.listen()`.

## 0.6.0

### Minor Changes

- 0f4de1b: Adds UI for managing Bucket Policy in Object Storage Ceph

### Patch Changes

- 8185a39: Use SideNavigationGroup for Compute/Network/Storage/Services section headers, bump juno-ui-components to 8.1.0, and remove domain/project breadcrumb from the page header.
- 8185a39: Add domain/project context block to side navigation, replacing the home item.
- 96fe087: Hide the Ceph (Object Storage) navigation item when the Ceph service is not available. The item is now gated on the service-discovery result and the route is guarded so direct navigation when the service is absent no longer leads to a broken view.
- 9f9015a: Fix cookie name configuration not being respected from env var. `DASHBOARD_COOKIE_NAME`, `ENABLE_CROSS_DASHBOARD_COOKIE`, and `INSECURE_COOKIES` env vars are now correctly forwarded by the OSS consumer. The default cookie name is defined once in `SessionCookie` and exported as `DEFAULT_COOKIE_NAME` for use throughout the package.
- aa91ba8: Ceph object storage UI fixes and storage-route improvements:
  - Add an "All buckets" breadcrumb in the object browser so users can navigate directly back to the bucket list.
  - Introduce a dynamic `storageType` route segment (`buckets` for Ceph, `containers` for Swift) and enforce the canonical segment per provider, redirecting non-canonical URLs.
  - Always pass the required `storageType` parameter when navigating back to the bucket/container list, preventing a runtime navigation failure.
  - Scope the bucket list "select all" to the currently visible rows so selections hidden by an active search filter are no longer dropped.
  - Align Ceph terminology with S3 ("container" → "bucket") across types, UI, and locale strings.

## 0.5.0

### Minor Changes

- 3536c95: Migrate policy files from YAML to JSON and unify storage policies
  - Convert all policy files from YAML to JSON format (compute, image, networking, storage)
  - Unify Swift and Ceph policies into single storage.json with consistent Swift terminology
  - Add startup validation for engine configuration in createPermissionRouter
  - Update router definitions to use .json filenames instead of .yaml

  Benefits:
  - Better tooling support (schema validation, editor autocomplete)
  - Consistent naming: storage:containers:_, storage:objects:_, storage:folders:\*
  - Backend-agnostic API (UI doesn't distinguish Swift vs Ceph)
  - Fewer files to maintain (4 instead of 6 policy files)
  - Errors caught at startup instead of runtime

- 33ac5e9: Add branding slots, appName prop, and pageFooter slot to AuroraApp.
  - `slots.logo`: consumers can now supply a custom logo component rendered in the page header, replacing the default Aurora SVG
  - `slots.pageFooter`: consumers can now supply a custom footer component rendered at the bottom of the page, replacing the default empty footer
  - `appName`: string prop that replaces the hardcoded "Aurora" text in the header breadcrumb and logo title

- fe78936: feat(metrics): add Prometheus metrics for infrastructure monitoring

  Added comprehensive Prometheus metrics collection for HTTP requests, including:
  - `aurora_requests_total`: Counter tracking total HTTP requests with labels for status_code, method, route, endpoint_type, and project_id
  - `aurora_request_duration_seconds`: Histogram measuring request latency with the same label dimensions
  - `aurora_exceptions_total`: Counter tracking unhandled exceptions by exception type

  Key features:
  - Intelligent route normalization to control cardinality (tRPC procedures, static assets, SPA routes, Vite dev paths)
  - Per-project visibility via project_id label extracted from URLs and query parameters
  - tRPC batch request support (comma-separated procedures in route label)
  - Excludes /metrics endpoint from collection to prevent recursion
  - Debug logging for skipped metrics to aid troubleshooting

  New endpoint: `GET /metrics` exposes metrics in Prometheus text format for scraping.

  Note: project_id label creates one time series per unique project. Monitor Prometheus memory usage in production deployments with thousands of projects.

- 9b00ac4: implement three-zone DataGrid header for Object Storage (Swift)
- c954a3e: Ceph fixes multiple ui/ux issues
- f73a00f: implement three-zone DataGrid header for Object Storage (Ceph)

### Patch Changes

- 2db15e8: Compute, network, and service overview routes now redirect to the project overview
- 3a5a69b: New styling for project overview and new playwright tests
- 42471fb: feat(portal): compute image and flavor UI improvements

  **Images**
  - Detail page: More Actions button now appears for accepted shared images (pending/suggested images keep inline Accept/Reject via SharedImageBox and do not show the menu) — closes #902
  - Detail page: Accept action added for pending shared images in More Actions; SharedImageBox retains inline Accept button for the detail body
  - Detail page: Image ID and Owner Project ID rendered with ClipboardText for one-click copy
  - Detail page: spacing fixes for SharedImageBox and actions row

  **Flavors**
  - Detail page: users with view-only spec access (`flavor_specs:list`) see a **Metadata** button; users with create/delete access see **Edit Metadata** — closes #907
  - Detail page: Metadata and Manage Access moved into the More Actions menu (action parity with list row)
  - List view: `flavor_specs` permissions fetched and propagated to list row and EditSpecModal
  - List view: Metadata item gated on spec permissions; view-only users see **Metadata**, editors see **Edit Metadata**
  - List view: new **Access Type** column shows Public or Private status for each flavor — closes #908
  - List view: popup menu uses default icon toggle (consistent with Images); Manage Access disabled for public flavors
  - Manage Access modal: Flavor ID column removed for a simpler two-column layout — closes #909

  **Error handling**
  - Overview, Images list, and Flavors list wrapped with ErrorBoundary to catch policy file mismatch errors that reject `canUser`/data promises via `React.use()`

- 42471fb: refactor(portal): remove accept/reject confirmation modals from image table row

## 0.4.0

### Minor Changes

- fc1bc08: show domain name on project cards by fetching auth/domains and using new juno heading system
- 641c699: ceph - apply ui/ux improvements from swift design reviews
- 5ab571f: Remove bundled OpenStack policy files from the aurora package. Consumers must now supply their own policy files via the `policyDir` option in `createServer`. The built-in `permission_policies/` directory is no longer shipped with the package.
- e5d39a9: Add bucket versioning UI with enable/disable/suspend functionality

### Patch Changes

- 711736c: fix(portal): add error component to images route to preserve layout on errors and fix ButtonSize type errors
- fc861d5: Add Clavis CA import certificates functionality

## 0.3.1

### Patch Changes

- a046b17: Image tabs are now in the action bar.

## 0.3.0

### Minor Changes

- ddd8b37: Add extensible slot system for consumer widgets

  Introduces `Slot`, `slots`, and `SlotProps` — a shadow DOM-based mechanism that lets consumers inject custom UI widgets into defined extension points in the Aurora layout.
  - `slots` — object of named slot components passed via `AuroraAppProps`
  - `SlotProps` — typed props supplied to each widget, including `auroraContext.client` for BFF access
  - `Slot` — internal component that renders a widget inside an isolated shadow root
  - `sideNavBanner` — first slot, rendered at the bottom of the project sidebar

### Patch Changes

- 4f41ac0: Deleted project list view, keeping only the card view
  Improved card view: responsive grid, ContentHeading for card titles
  Replaced manual padding divs with Juno Container
  Side nav collapsing text fixed via Juno update
  SideNavigationItem manages its own open/close state internally, so Juno's chevron no longer desyncs from the open prop
  Added routeTree.gen.ts to eslintignore

## 0.2.2

### Patch Changes

- 98db18f: added clavis CA create certificates functionality

## 0.2.1

### Patch Changes

- f14ab83: bump @cloudoperators/juno-ui-components to 6.5.0; add to minimumReleaseAgeExclude in pnpm-workspace.yaml; remove aurora-portal i18n step from pre-commit hook
- a194c98: Fix package publishing issues found during initial consumer testing:
  - Removed `@cobaltcore-dev/policy-engine` and `@cobaltcore-dev/signal-openstack` from published `dependencies` — both are private packages bundled into the server build via tsup and must not be listed as npm dependencies
  - Added `permission_policies/` to the `files` array so OpenStack YAML files are included in the published package

- 717d53f: fixed race condition of setTitle and refactored breadcrumb

## 0.2.0

### Minor Changes

- b8a4cd7: `@cobaltcore-dev/aurora` is now available as a standalone npm package.

  Install it directly:

  ```bash
  npm install @cobaltcore-dev/aurora
  ```

  **Server** — starts a Fastify BFF pre-wired with OpenStack tRPC routes:

  ```ts
  import { createServer } from "@cobaltcore-dev/aurora/server"

  createServer({
    identityEndpoint: process.env.IDENTITY_ENDPOINT,
    bffEndpoint: process.env.BFF_ENDPOINT,
  }).then((server) => server.listen({ host: "0.0.0.0", port: 4000 }))
  ```

  **Client** — self-contained React dashboard UI:

  ```tsx
  import { AuroraApp } from "@cobaltcore-dev/aurora/client"
  ;<AuroraApp bffEndpoint="/polaris-bff" theme="theme-light" />
  ```

  All configuration flows in from the consumer — the package never reads `process.env` or `localStorage` directly. See the [README](https://github.com/cobaltcore-dev/aurora-dashboard/tree/main/packages/aurora) for the full usage guide.

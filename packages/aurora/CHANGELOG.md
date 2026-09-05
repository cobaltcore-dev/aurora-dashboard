# @cobaltcore-dev/aurora

## 1.2.1

### Patch Changes

- b79f440: Swift: the ACL explanation text in the container access-control modal now uses
  the default font colour instead of the low-contrast light colour, improving
  legibility at the small text size.
- 8f993b8: Ensure single primary action button per page on flavor and image detail views

## 1.2.0

### Minor Changes

- c3b52d4: Add server-side pagination to images list
  Fix race condition in pageMarkers state updates
  Fix safePage sync to prevent displaying wrong page
  Fix test to match new behavior of fetching all pages for accurate total count
- ce9aeb7: Gate Ceph/S3 Object Storage mutations behind `storage.canUser` permission checks, client-side, matching every other domain in the app. The following 11 mutation actions are now gated: generating a presigned/share URL for an object, deleting or restoring an object version, toggling bucket versioning, updating or deleting a bucket policy, creating/editing or deleting a CORS rule, creating/editing or deleting a lifecycle rule, and creating S3 (EC2) credentials. Bucket/object/folder create-delete-empty actions and the previously ungated Ceph bulk-action TODOs are also now wired to real permissions instead of hardcoded `true`.

  Read/list/view/download actions (bucket and object listing, downloading, viewing CORS/lifecycle/policy config, viewing version history) are **not** gated - this matches the existing convention across the rest of the app (RBAC differentiates who can change things, not who can see things).

  Operators who maintain a custom `storage.json` policy file need to add the 11 new rules for the gated actions to keep working as before: `storage:object_share`, `storage:object_version_delete`, `storage:object_version_restore`, `storage:container_versioning_update`, `storage:container_policy_update`, `storage:container_policy_delete`, `storage:container_cors_update`, `storage:container_cors_delete`, `storage:container_lifecycle_update`, `storage:container_lifecycle_delete`, `storage:credential_create`. If any of these rules is missing, the corresponding mutation controls simply render hidden (fail-closed) - there is no server error or crash.

  Two of these eleven rules are `rule:storage_viewer` rather than `rule:storage_admin`: `storage:object_share` (a presigned GET URL only re-exports the download access a viewer already has) and `storage:credential_create` (a self-service prerequisite for any Ceph access at all, including read-only browsing). Keep these two at viewer tier unless you deliberately want to lock read-only users out of S3 entirely.

- 0cadedd: Export generic breadcrumb primitives for use in embedded sub-apps and standalone consumers.

  - `useBreadcrumbs()` - reads the breadcrumb chain from any TanStack Router instance (static `crumb` in route `staticData` + dynamic crumbs from `useSetBreadcrumb`). Works outside OSS - suitable for SCI sub-apps with their own `RouterProvider`.
  - `useSetBreadcrumb(routeId, text)` - registers a dynamic breadcrumb label for a route at runtime; deregisters on unmount.
  - `DynamicBreadcrumbContext` / `DynamicBreadcrumbProvider` - context backing the dynamic crumb system; wrap any `RouterProvider` to enable `useBreadcrumbs` and `useSetBreadcrumb` inside it.
  - `usePushBreadcrumbs(breadcrumbs: BreadcrumbItem[])` - pushes a breadcrumb list into OSS's `BreadcrumbExtensionContext` so the OSS `Breadcrumbs` component can append them after its own trail.
  - `BreadcrumbItem` type - unified breadcrumb shape (`label`, `icon`, `onClick`, `active`).

  Internal: `ProjectInfoBox` renamed to `Breadcrumbs` and moved to `components/Breadcrumbs.tsx`.

- 4edfdc8: Replace route-injection pattern with standalone extension sub-app pattern for consumer services, and unify the registration vocabulary on "extension".

  Breaking changes:
  - `AdditionalProjectService` type renamed to `ServiceExtension`, and the `AuroraAppProps.additionalProjectServices` prop renamed to `serviceExtensions`
  - The `routes` field (type `AnyRoute`) is gone; register a `component` (type `FC<ServiceExtensionProps>`) instead: a standalone React component that mounts its own TanStack Router via `RouterProvider basepath={basePath}`
  - The `component` receives `ServiceExtensionProps` = `{ basePath, context }`, where `context` is a `ServiceExtensionContext`. Seed it into your own router (`createRouter({ routeTree, context })`) and read values via `useRouteContext`
  - `useProjectId` is no longer part of the public API. Extensions receive `projectId` via `ServiceExtensionProps.context` and read it from their own router context instead of the shared hook
  - `servicesRoute` export removed; consumers no longer inject routes into the OSS route tree

  New exports:
  - `ServiceExtension` - registration entry for a project-scoped service extension
  - `ServiceExtensionProps` - props type for service extension components (`{ basePath, context }`)
  - `ServiceExtensionContext` - extensible host-context object handed to a mounted extension; seed it into the extension's own router context
  - `PageContentHeader` - re-exported `ContentHeader` component for use in consumer service pages

  Additional changes:
  - On `/services/$serviceType/**` routes, OSS shows no section crumb (consistent with compute/network/storage). The project crumb links back to the project home, and extension sub-apps own every crumb below it via `usePushBreadcrumbs`.

  OSS now provides a dynamic catch-all route at `/_auth/projects/$projectId/services/$serviceType/**` that mounts the registered service extension component.

- 70b0da6: Add Ceph S3 bucket lifecycle configuration management. Implements full CRUD operations for lifecycle rules including expiration policies, noncurrent version expiration, and multipart upload cleanup.

  Lifecycle rules are now managed via a dedicated "Lifecycle Rules" tab on the bucket detail page (accessed via `?view=lifecycle-rules`), using a DataGrid with per-rule edit/delete and multi-select bulk delete. Each mutation refetches and validates the configuration before saving. Deleting the last rule automatically removes the entire lifecycle configuration. Storage-class transitions configured outside Aurora are preserved but not editable in the UI.

  The header menu actions for lifecycle rules have been removed in favor of the tab-based interface, consistent with the CORS rules architecture.

  **Additional improvements in this PR:**
  - Fix And-filter predicate counting to accept 2+ tags without other conditions (previously incorrectly rejected)
  - Improve CORS rules table accessibility with proper aria-labels matching delete modal identifiers
  - Replace O(n) rate-limiter cleanup with O(1) per-key timers in lifecycle/CORS/bucket-policy routers

- 4ade8c9: Add an overflow actions menu to the Swift in-container objects page, mirroring the Ceph bucket page's header/actions position. The menu exposes Manage Access, Preview and Edit metadata, Empty Container, and Delete Container, reusing the existing modals from the Swift container list page but now wired with real container metadata (object count / size) fetched via `getContainerMetadata` instead of a placeholder. Deleting a container while browsing its objects now navigates back to the container list instead of leaving the user on a now-dead page.

  **Additional improvements in this PR:**
  - Renamed several Swift storage action labels for consistency across container and object row menus and their confirmation modals (e.g. "Delete" → "Delete Object" / "Delete Container", "Copy" → "Copy Object", "Move/Rename" → "Move/Rename Object", "Edit Metadata" → "Edit Object Metadata", "Share URL" → "Share Object URL")
  - Reorganized the Swift objects page toolbar: "Create Folder" moved into a new overflow menu, "Upload Object" is now the primary action

### Patch Changes

- 273aebb: Swift: container and object "last modified" times now render in the viewer's
  local timezone. Swift returns these timestamps as UTC without a zone
  designator, which were previously parsed as local time and shown with an
  offset.
- 7c01ea2: Register CSRF protection before routes to prevent bypass
- 2275f02: Fix Ceph bucket list allowing "Empty Bucket" to be triggered on a bucket that already has no content (#1107):

  - `EmptyBucketModal` now re-verifies bucket contents on open and shows an info-only "This bucket is already empty" view (with just a Close button) instead of the destructive confirm form, guarding against stale list-cache data reaching the modal. This matches Swift's existing "Empty Container" behavior: the row action stays visible, and the live check on open decides whether there's anything to actually delete.

- ca098d0: fix: update dependencies to resolve security vulnerabilities

  - Update fastify to 5.12.1 (fixes CVE-2026-3635 trustProxy spoofing)
  - Update @commitlint/cli and @commitlint/config-conventional to 21.2.2
  - fast-uri updated to 3.1.6 and 4.1.3 (fixes CVE-2026-13676 variants)
  - Remove obsolete security overrides from pnpm-workspace.yaml

- 7036789: Prevent sort dropdown option labels from wrapping by increasing the minimum width of SortInput selects in affected views.
- af20f8b: Fixes padding in images data grid. Implements optimistic UI updates for image status changes (activate/deactivate) and triggers proper list refresh after image mutations (create, delete, member changes).
- 16e4e40: Swift: align the info icon in the containers info strip with the adjacent count
  and quota text.
- d35562a: Swift: the inline delete action in the container metadata editor now uses the
  default button colour instead of primary-danger, consistent with the object
  metadata editor.
- fb23589: fix(aurora): optimize DataGrid Action column width and clean up modal title styling
- ecc682a: Move Flavors and Images components from shared compute/-components/ directory to their respective feature directories for better code colocation
- d8da79a: Refactor Flavor EditSpecModal and ManageAccessModal to match the Image EditImageMetadataModal design pattern.

  **EditSpecModal changes:**
  - Add inline editing for existing specs (click to edit key/value)
  - Implement batch save pattern (Save Changes button saves all at once)
  - Use DescriptionList layout matching Images metadata modal
  - Improve hasChanges detection with actual key/value comparison

  **ManageAccessModal changes:**
  - Use two-column layout with fixed "Project" key and editable Project ID value
  - Implement batch save pattern (changes saved on modal confirm, not immediately)
  - Use full-width input field for better usability
  - Improve hasChanges detection with Set comparison of project IDs

- 77c41c6: - Add security warning to session cookie domain configuration about cross-subdomain trust requirements
  - Derive floating IP tenant_id and project_id from authenticated session instead of client input to prevent ownership confusion
- 7b38217: - Scope image upload progress tracking by projectId to prevent cross-tenant observation (keys now `projectId:uploadId` instead of bare `uploadId`)
  - Validate uploadId format to reject colon-containing values (prevents double-scoping attacks)
  - Await server session termination before redirect in logout flows; errors now shown to user instead of silently swallowed
  - Clear local session state even when server termination fails
- ad13a73: Swift: remove the container count from the limits tooltip so it's shown once
  (in the info strip, from the container listing) and no longer mismatches the
  eventually-consistent account metadata count.
- 127d410: Refactor loading and error states to use Juno's Status component for consistent
  UI presentation. Replace custom Spinner+Stack loading layouts and custom error
  layouts with the standardized Status component across route loaders and list
  views.
- 37221d0: Storage: fix incorrect DataGrid usage in the virtualized Swift and Ceph tables.
  The virtualized body now renders as a single grid wrapper with row children
  instead of one grid per row, improving performance, layout, and accessibility.
- f5f1ce0: - Standardize 15 deletion/confirmation modals to use TanStack Form + `useModalTracking` instead of `useDeleteConfirmation` hook
  - Zod schemas for validation with field-level error display
  - Consistent analytics tracking (`.open`/`.close` events) across all modals

## 1.1.0

### Minor Changes

- a9c257a: Consumers can now register additional project-scoped services in Aurora. Pass your service definitions via the `additionalProjectServices` prop on `AuroraApp` to plug in client-side routes, and register your BFF router via the existing `routers` config in `createServer`. Additional services are only shown to users when the service is available in the project's OpenStack service catalog and not excluded by the app's `enabledServices` list.

  This replaces the previously hardcoded PCA (Clavis) integration. PCA and any other consumer-specific service should now be registered this way rather than living inside the OSS package.

- 8e99f07: Remove the public `getAuthToken` endpoint that exposed raw OpenStack bearer tokens to JavaScript.

  **Migration:** Clients must stop calling `getAuthToken`. Use the supported server-side authenticated flow instead of requesting raw OpenStack bearer tokens from JavaScript.

### Patch Changes

- 94476a1: - Add ownership verification for EC2 credential deletion to prevent IDOR attacks
  - Return NOT_FOUND for unauthorized deletion attempts (prevents resource enumeration)
  - Make DELETE idempotent (404 on GET returns success)
  - Map 401/403 from identity service to proper error codes
- 1513d97: Update delete modals to use Modal built-in props and single-column DescriptionList, improve test accessibility using getByRole and getByLabelText queries, fix swap display to show "None" instead of "0 MiB", and replace array index keys with stable IDs

## 1.0.0

### Major Changes

- 2c7bd0e: Redact Swift TempURL and sync keys from metadata responses. Container and account metadata now return presence flags (`hasTempUrlKey`, `hasSyncKey`) instead of raw secret values, preventing unauthorized object access.

### Minor Changes

- 502a1e9: Add pre-signed URL sharing for Ceph (S3) objects. Eligible object rows now have a "Share URL" action that opens a modal to generate a time-limited download link — with 1 hour / 24 hour / 7 day presets or a custom duration (capped at the S3 maximum of 7 days). The link can be copied and shared without Aurora credentials, and the modal shows when it expires.
- b7576db: Add CORS configuration management for Ceph/S3 buckets. The bucket details page now has a "CORS Rules" tab (alongside Overview) with full CRUD for CORS rules — add, edit, delete individual rules, or bulk-delete a selection. The bucket header's actions menu also gained a "Delete CORS Rules" item to clear the entire CORS configuration in one step.
- d00f84a: Cap Swift TempURL lifetime and restrict to read-only by default
- 4c34ce8: feat(portal): offload Swift object downloads to a Web Worker

  Swift object downloads and previews now run in a Web Worker instead of decoding on the main thread, matching the Ceph object browser. Multiple downloads can run at once, each with its own progress and a cancel control, and a download keeps running when you navigate into another folder. Cancelling a transfer now stops it on the server too, rather than letting it finish in the background — which previously could exhaust memory and crash the tab when several large downloads were cancelled.

### Patch Changes

- 163b2d2: Swift: the object-browser breadcrumbs now sit in the table header row instead
  of above the toolbar, matching the Ceph layout.
- 9e817d0: Anchor the object storage tables' height to the page footer's actual position, so a custom footer of any height is accounted for. Previously a fixed allowance for the footer meant a taller custom footer overlapped the last rows and a shorter one left a gap.
- 0bfd055: Address design review on Ceph/S3 bucket CORS management: name the create action "Create CORS Rule" consistently across the trigger, modal title and submit button; demote the tag-input "Add" buttons so the modal has a single primary action; drop the redundant bucket-header "Delete CORS Rules" entry (per-rule and batch delete are unchanged); use the default DataGrid column layout; and tighten the spacing between the toolbar zones and between the bucket tabs and their divider.
- f367c07: - Update eslint 10.2.0 → 10.7.0
  - Update prettier 3.8.3 → 3.9.6
  - Update turbo 2.9.14 → 2.10.6
  - Update @changesets/cli 2.31.0 → 2.31.1
  - Update commitizen 4.3.1 → 4.3.2
  - Update prettier-plugin-tailwindcss 0.7.2 → 0.8.1
  - Update pnpm 10.34.4 → 11.16.0
  - Fix vitest localStorage mock for languageDetection tests
  - Fix e2e breadcrumb tests for Domain/Project combined format
- 10a497c: Rename login form heading from "Login to Your Account" to "Sign In to Your Account" for consistency with the Sign In label used throughout the authentication UI.
- 13e2ae1: Add explicit return type to createMockContext to fix TypeScript build error
- 7d9e6aa: Remove conflicting pnpm dependency that caused Docker builds to fail with version mismatch
- a0407b9: Fix user menu UI inconsistencies: hide the menu entirely when unauthenticated (Sign In button removed until functional), rename "Log Out" to "Sign Out" and remove the exitToApp icon from the sign-out item, apply default text color to User ID and User Domain fields, and replace the browser history entry on logout so the previous authenticated page cannot be reached via the back button.
- 03cde79: Sync floating IP filters, sort, and search to URL with fallback for invalid params
- e04eed1: Improve floating IP list search and UX
  - Unify layout of the datagrid header
  - Add search by floating IP address, fixed IP address, and network ID
  - Keep table visible while searching/filtering (no blocking loading screen)
- f66da80: Add bulk delete functionality for Ceph objects and versions
- 2309942: Aurora: give the filter and sort selects a consistent min-width so their
  menus no longer resize based on the selected value.
- 46256e9: Migrate Glance image notifications from the legacy Juno `<Toast>` component to the app-wide `NotificationManager` (`toast`) API, matching the Swift and Ceph storage views. Toast builders now return `{ message, ...options }` and callers dispatch severity directly (`toast.success` / `error` / `warning` / `info`); the per-screen toast state and `setToastData` plumbing are removed. Also hardens the image create/update/delete handlers against `undefined` error data (optional chaining on `error.data?.path` and null-safe error-message reads) so a failure can no longer throw inside its own `catch`.
- 9cdf0ae: Swift: reorder the objects toolbar so the primary Create Folder action is the
  last (rightmost) button, matching the right-aligned primary-button convention.
- 9645ac6: Add path traversal protection for OpenStack resource IDs via validateAndEncodeResourceId and encodeOpenstackPathSegment helpers
- d2c7efe: Swift: the delete-container versions-confirmation checkbox no longer shows an
  error icon before the user interacts with it, matching the other delete
  modals. Deletion gating is unchanged.
- 0eb35f0: Swift: opening a container that doesn't exist or that you don't have access to
  now shows a friendly notification and returns you to the container list,
  instead of rendering a technical error in the object view.
- 0653da8: Swift: right-align the container count and remaining quota (and the objects
  item count) in the list toolbar, matching Ceph, with bulk actions kept on the
  left.
- 92bbecd: Swift: a failed container-metadata update no longer shows both an inline error
  and a toast. The failure is shown inline in the edit modal, which stays open so
  the user can adjust and retry.
- c65b027: Reject absolute URLs in image pagination to prevent SSRF attacks
- c98bccf: Fix Swift account SSRF vulnerability. Add input validation to prevent SSRF attacks via account parameters. Rejects absolute URLs, path traversal, and malicious formats.
- 13e2ae1: Fix Swift container limits tooltip not appearing on hover
- 7d9e6aa: Update pnpm to 11.20.0
- a7b73a1: Swift: reword the container quota validation error to a positive instruction
  ("Must be a whole number, 0 or greater") instead of the previous
  double-negative phrasing, and reject non-integer quota values (both object
  count and total size), so decimals like "1.5" no longer pass validation.

## 0.23.1

### Patch Changes

- fa875c7: Size the object storage tables to the space actually available below them instead of a fixed viewport offset. Custom banners, wrapped toolbars or breadcrumbs above a table no longer push the page past the viewport and produce a second scrollbar.

## 0.23.0

### Minor Changes

- 1e9ba79: Add object upload for Ceph (S3) buckets. Files can now be uploaded from the
  object browser via a file picker or drag-and-drop, with upload progress,
  cancellation, and success/failure notifications — matching the existing Swift
  upload experience.
- a7ad5d1: Offload Ceph object downloads to a dedicated Web Worker.

  Downloading or previewing an object no longer blocks the UI. The transfer and its base64 decoding run off the main thread, so the object table stays responsive while a large object streams.
  Transfers are owned by a module-scope store rather than by the objects table. A download now survives folder navigation, spinner swaps, and leaving the bucket entirely — which is what the "download started" notification already promised the user. Concurrent transfers share a single persistent "Downloading…" notification, dismissed once the last one ends, however it ended: saved, failed, or cancelled.
  Cancelling is cooperative: the row clears immediately, the worker is asked to abort its request so the BFF stops reading from S3, and it is force-terminated only if it never reports back.
  Two notes for anyone embedding this package. The worker is bundled inline rather than emitted as a separate asset, so it survives being re-bundled by a consuming app — but an inline worker starts from a blob: URL, so a Content-Security-Policy must allow worker-src 'self' blob:. Aurora's own server now sets this; a consumer serving its own CSP needs the same. The library build also substitutes process.env.NODE_ENV, because the worker's bundled dependencies read it and a worker has no process to read it from.

### Patch Changes

- 8b44234: Fix React-dependent packages incorrectly listed as `dependencies` instead of `peerDependencies`, and improve developer experience so workspace package changes are reflected immediately without rebuilding.

  **Dependency fix:** Packages that use React context or hooks (`@lingui/react`, `@tanstack/react-query`, `@tanstack/react-router`, and others) were installed as private dependencies, causing consuming apps to end up with duplicate React instances. This produced "Invalid hook call" errors and silently disconnected context providers from their hooks. All React-context-using packages are now declared as `peerDependencies`. See `docs/0014_dependency_classification.md` for the classification rules.

  **Developer experience:** `packages/policy-engine` and `packages/signal-openstack` had an `exports` field that caused Node to always resolve them from their compiled `dist/` regardless of tsconfig path mappings. Since both packages are private (never published), the `exports` field has been removed. Node now falls back to `main`, and tsx's tsconfig path mappings route to TypeScript source directly. Combined with an updated `dev` script that watches server-side workspace package source, changes to any workspace package are picked up immediately by the dev server, no rebuild step required. Types are always up to date since the editor reads directly from source.

- cb548a4: Security group refactor

  Fixed permission-related bugs where users without appropriate permissions could see and attempt actions, and where error messages persisted when closing and reopening modals.

- 24a187e: Changed List styling to non-monospace
- 8944e74: Fix RouteError always showing default error message instead of tRPC messages from the response
  - \_\_root.tsx / $projectId.tsx — pass safeErrorMessage to RouteError for TRPCClientError to fix generic fallback text
  - Remove errorComponent at projects/index.tsx and images.tsx, it was catching it instead of letting it bubble to ProjectErrorComponent
  - expand ErrorBoundary to wrap the search bar too so it's hidden on error instead of orphaned above the error message
  - remove unused invalidateCsrfToken function

## 0.22.0

### Minor Changes

- 72d58f7: Add slot support for custom login component. Allows injecting a custom login UI via `slots.login` instead of using the default LoginForm.

## 0.21.0

### Minor Changes

- 0021456: Simplify auth flow and improve session handling
  - Move tRPC auth calls into AuthProvider for centralized session management
  - Add auto-logout on session expiry with return URL saved for redirect after re-login
  - Use uncontrolled form inputs in LoginForm for simpler code
  - Remove unnecessary useCallback wrappers (React 19 optimizes automatically)

### Patch Changes

- 566338f: Remove application-level rate limiting configuration from the Aurora server.

## 0.20.3

### Patch Changes

- 45e8c43: fix(aurora): fix CreateBucketModal not rendering when bucket list is empty

  Restructured BucketTableView to conditionally render empty state or table
  content, ensuring CreateBucketModal can be displayed regardless of bucket
  list state. Added test coverage for modal rendering with empty bucket list.

## 0.20.2

### Patch Changes

- 6dd15fd: Optimistically render projects page static content while project cards load via Suspense and useSuspenseQuery

## 0.20.1

### Patch Changes

- 7549dec: Fix project detail page slowdown by fetching single project instead of all projects
- 04cc26d: fix error message when ceph region is not set

## 0.20.0

### Minor Changes

- c55b535: Add `useScope` hook that returns `userDomainId` (from auth context) and `projectId` (from URL params) for convenient scope access

### Patch Changes

- 8679d8a: Consolidate session expiration logic and fix session handling edge cases.
  - Both immediate-expiry and timeout branches now call `logout()` for consistent logout handling
  - Remove redundant `getCurrentUserSession` fetch in the `/_auth` route guard (session is still probed in the "/" route loader on refresh)
  - Use `location.searchStr` in \_auth route to preserve exact redirect URL including hash fragments and avoid URLSearchParams re-serialization edge cases
  - Add comprehensive tests for AuthProvider and \_auth route redirect

## 0.19.1

### Patch Changes

- 622ad68: Fix missing type declarations for exported hooks and auth provider by using glob patterns in vite-plugin-dts configuration.

## 0.19.0

### Minor Changes

- 194a480: Ceph object storage: object downloads and previews can now be cancelled while
  in flight. The abort signal is propagated from the frontend through the BFF, so
  cancelling tears down the request instead of letting it run in the background.
  A toast is shown when a download starts, and a warning toast confirms when one
  is cancelled.

### Patch Changes

- 4518889: Add CSRF token caching to tRPC client to reduce redundant /csrf-token fetches. Concurrent requests now share a single token fetch, and a new `invalidateCsrfToken()` export allows cache invalidation on 403 responses.

## 0.18.0

### Minor Changes

- d2cc53d: Add support for custom tRPC routers with full type safety

  **New exports from `@cobaltcore-dev/aurora/server`:**
  - `AuroraRouterWithCustom<T>` - Type helper to merge custom routers with base Aurora router

  **New exports from `@cobaltcore-dev/aurora/client`:**
  - `CreateTypedTrpcReact<T>` - Generic type for typed React tRPC client
  - `CreateTypedTrpcClient<T>` - Generic type for typed vanilla tRPC client
  - `TrpcReact` - Type alias for the React tRPC client

  **Usage:**
  1. Define custom routers using `auroraRouter` and `protectedProcedure`:

  ```typescript
  import { auroraRouter, protectedProcedure } from "@cobaltcore-dev/aurora/server"

  export const customRouters = auroraRouter({
    feedback: auroraRouter({
      submit: protectedProcedure
        .input(z.object({ message: z.string() }))
        .mutation(async ({ input }) => ({ success: true })),
    }),
  })
  ```

  2. Register with `createServer`:

  ```typescript
  createServer({ routers: [customRouters], ... })
  ```

  3. Create typed client exports:

  ```typescript
  import type { AuroraRouterWithCustom } from "@cobaltcore-dev/aurora/server"
  import { trpcReact, CreateTypedTrpcReact } from "@cobaltcore-dev/aurora/client"

  type AppRouter = AuroraRouterWithCustom<typeof customRouters>
  export const trpc = trpcReact as unknown as CreateTypedTrpcReact<AppRouter>
  ```

  4. Use with full type safety:

  ```typescript
  const mutation = trpc.feedback.submit.useMutation() // ✅ Type-safe!
  ```

- 2f8cca6: Remove InactivityModal and redirect directly to login on session expiration

### Patch Changes

- 914411a: Simplify logout type - remove logoutReason tracking

## 0.17.1

### Patch Changes

- 21584e0: fix: resolve merge conflict in client index exports

## 0.17.0

### Minor Changes

- 2e9d83f: fix(aurora): improve project not found error handling with better UX
  - Add proper 404 error page when project doesn't exist or user lacks access
  - Extract scope resolution logic into reusable resolveProjectScope utility
  - Differentiate between "project not found" vs "scope operation failed" states
  - Catch NOT_FOUND errors from setCurrentScope instead of letting them bubble up
  - Display user-friendly error message with navigation options (back/home)

### Patch Changes

- 1376e9f: Fix useRouter warning by passing router as prop to AuthProvider instead of calling useRouter() hook internally

## 0.16.0

### Minor Changes

- df25d7c: Integrate Juno NotificationManager and replace legacy `<Toast>` notifications across the Swift object-storage UI. Container and object notifications (create, delete, empty, ACL/metadata, upload, download, copy, move, folder operations, temporary URL, and bulk actions) now fire through the centralized NotificationManager (`toast.success` / `toast.error` / `toast.warning`) for consistent placement, lifetime, and dismissal. Notification builders return `{ message, description }` instead of the legacy `{ variant, children }` toast props; the container bulk-empty builder additionally returns a `severity` so the caller dispatches the correct toast style from a single source of truth.

### Patch Changes

- 4291071: Add user ID and domain labels

## 0.15.0

### Minor Changes

- 3966415: refactor(ui): ceph ui improvements

## 0.14.1

### Patch Changes

- 1205d67: feat(aurora): add debug option to AuroraServerConfig

  Add missing `debug` configuration option to AuroraServerConfig and pass it
  through to contextConfig, allowing consumers to explicitly control OpenStack
  session debug logging behavior via server configuration.

## 0.14.0

### Minor Changes

- 219ed22: feat(aurora): make OpenStack session debug logging configurable

  Add optional `debug` field to `ContextConfig` to allow consumers to control
  debug logging in SignalOpenstackSession. Falls back to existing behavior
  (enabled in non-production) when not explicitly set.

## 0.13.1

### Patch Changes

- 40ad7cb: fix(aurora): gate projectOverviewBanner to only show when no service is active

## 0.13.0

### Minor Changes

- 532cf06: Add object download and preview for Ceph object storage, bringing Ceph to parity with the existing Swift capability.
  - Stream downloads through the BFF (`downloadObject`) with live progress tracking via `watchDownloadProgress`. Multiple downloads/previews can be in flight at once, each tracked and reported independently.
  - Row-click on an object previews it in a new browser tab when the type is safely renderable (images excluding SVG, video, audio, PDF, and plain text); everything else downloads directly. Scriptable types (HTML, JSON, XML, SVG) are intentionally excluded from preview since they can execute active content when opened from a blob URL.
  - New context-menu **Download** action always forces a file save, regardless of type.
  - The BFF resolves a reliable MIME type from the object key extension when S3/Ceph reports a generic or incorrect `Content-Type` (e.g. the `binary/octet-stream` default, or values set by some upload tools), so files preview correctly even without proper upload metadata.

- 16a5a52: fix Ceph findings for Q2 go-live

### Patch Changes

- f67c54f: Routes now track with meaningful names like `storage.swift.list` or `compute.flavors.detail` instead of raw URL paths like `/_auth/projects/$projectId/storage/$provider/$storageType/`

## 0.12.1

### Patch Changes

- 4abf513: chore(aurora): update locale message catalogs

## 0.12.0

### Minor Changes

- e070437: feat(server): replace crossDomainCookie with explicit cookieDomain config

  **Breaking change:** `crossDomainCookie` and `ENABLE_CROSS_DASHBOARD_COOKIE` are removed.

  Use the new `cookieDomain` config option (or `COOKIE_DOMAIN` env var) to explicitly set
  the cookie domain for cross-subdomain sharing (e.g., `.example.com`).

  When not set, cookies are host-specific (no cross-subdomain sharing).

  Also changes `SameSite` cookie attribute from `strict` to `lax` for consistency with
  other dashboards and better UX when following external links.

### Patch Changes

- 63e7834: chore(aurora): upgrade Juno UI components to 9.1.0 and fix margins in overview
- 94552b7: Sort projects alphabetically by name on the projects overview page
- 63e7834: Combine domain and project in breadcrumb (domain/project)

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

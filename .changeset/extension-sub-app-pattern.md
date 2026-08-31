---
"@cobaltcore-dev/aurora": minor
---

Replace route-injection pattern with standalone extension sub-app pattern for consumer services, and unify the registration vocabulary on "extension".

Breaking changes:
- `AdditionalProjectService` type renamed to `ServiceExtension`, and the `AuroraAppProps.additionalProjectServices` prop renamed to `serviceExtensions`
- `ServiceExtension.routes` (type `AnyRoute`) removed; replace with `component` (type `FC<ServiceExtensionProps>`) — a standalone React component that mounts its own TanStack Router via `RouterProvider basepath={basePath}`
- `ServiceExtensionProps` reshaped from `{ basePath, projectId }` to `{ basePath, context }`, where `context` is a `ServiceExtensionContext`. Seed it into your own router (`createRouter({ routeTree, context })`) and read values via `useRouteContext`
- `ProjectIdContext` export removed and `useProjectId` is no longer part of the public API. Extensions receive `projectId` via `ServiceExtensionProps.context` and read it from their own router context instead of a shared React context
- `servicesRoute` export removed; consumers no longer inject routes into the OSS route tree
- `AuroraAppProps.router` prop removed; OSS always creates its own router internally

New exports:
- `ServiceExtension` - registration entry for a project-scoped service extension
- `ServiceExtensionProps` - props type for service extension components (`{ basePath, context }`)
- `ServiceExtensionContext` - extensible host-context object handed to a mounted extension; seed it into the extension's own router context
- `usePushBreadcrumbs(crumbs)` - hook for extension components to push breadcrumbs into the OSS breadcrumb bar
- `PageContentHeader` - re-exported `ContentHeader` component for use in consumer service pages
- `createAuroraRouter` - exported so consumers can inspect the router type if needed

Additional changes:
- `SlotProps.auroraContext.client` widened from `TrpcClient` to `TRPCClient<AnyRouter>`, allowing consumers with extended routers to pass their typed client without a cast
- On `/services/$serviceType/**` routes, OSS shows no section crumb (consistent with compute/network/storage). The project crumb links back to the project home, and extension sub-apps own every crumb below it via `usePushBreadcrumbs`.

OSS now provides a dynamic catch-all route at `/_auth/projects/$projectId/services/$serviceType/**` that mounts the registered service extension component.

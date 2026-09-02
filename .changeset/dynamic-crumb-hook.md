---
"@cobaltcore-dev/aurora": minor
---

Export generic breadcrumb primitives for use in embedded sub-apps and standalone consumers.

- `useBreadcrumbs()` - reads the breadcrumb chain from any TanStack Router instance (static `crumb` in route `staticData` + dynamic crumbs from `useSetBreadcrumb`). Works outside OSS - suitable for SCI sub-apps with their own `RouterProvider`.
- `useSetBreadcrumb(routeId, text)` - registers a dynamic breadcrumb label for a route at runtime; deregisters on unmount.
- `DynamicBreadcrumbContext` / `DynamicBreadcrumbProvider` - context backing the dynamic crumb system; wrap any `RouterProvider` to enable `useBreadcrumbs` and `useSetBreadcrumb` inside it.
- `usePushBreadcrumbs(breadcrumbs: BreadcrumbItem[])` - pushes a breadcrumb list into OSS's `BreadcrumbExtensionContext` so the OSS `Breadcrumbs` component can append them after its own trail.
- `BreadcrumbItem` type - unified breadcrumb shape (`label`, `icon`, `onClick`, `active`).

Internal: `ProjectInfoBox` renamed to `Breadcrumbs` and moved to `components/Breadcrumbs.tsx`.

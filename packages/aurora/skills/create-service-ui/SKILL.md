---
name: create-service-ui
description: >-
  Scaffold the UI (client) side of a new OpenStack service in Aurora: file-based
  routes with RouteInfo, and a Suspense + ErrorBoundary list/detail view that fetches
  with useSuspenseQuery, and a nav entry. Builds the actual UI with the juno
  ui-components Intent skills. Use when the user says "build the UI for X", "add the
  client side for service X", "scaffold the pages for X", or when create-service
  delegates the UI.
metadata:
  area: client
sources:
  - src/client/routes/_auth/projects/$projectId/compute/images/index.tsx
  - src/client/routes/_auth/projects/$projectId/compute/images/-components/List.tsx
  - src/client/routes/_auth/projects/$projectId/compute/images/apiHelpers.ts
  - src/client/routes/_auth/projects/index.tsx
  - src/client/routes/routeInfo.ts
  - src/client/components/ContentHeader/ContentHeader.tsx
  - src/client/routes/_auth/projects/-components/buildNavSections.ts
---

Scaffold the client side of a new Aurora service under
`src/client/routes/_auth/projects/$projectId/<section>/<service>/`. The UI is dumb:
it fetches from the BFF tRPC procedures and renders, with no business logic.

**Use an existing service only as a structural reference, never as content.** The
files in `sources` (Compute/images) show the _layout_ a service's client follows -
the route/`staticData` setup, how the route component wires `trpcClient` and
`ContentHeader`, the `apiHelpers` promise pattern, and the nav entry. Read them to
learn the pattern, then derive every service-specific detail (resources, columns,
filters, states, which procedures to call) from the brief / epic and the BFF
procedure shapes. Do **not** copy the images service's columns, filters, or fields.

**When the brief does not make a detail clear, ask the user a clarifying question -
do not guess and do not borrow the answer from the exemplar.** Typical gaps: which
columns and in what order, which filters/sorts, empty/error copy, and whether a
detail page or modals are needed.

## Build the actual UI with the juno ui-components skills

**Always prefer the juno `@cloudoperators/juno-ui-components` Intent skills to
produce the real UI.** They are already loaded in this repo (see the Skill Loading
block in AGENTS.md). Use them whenever one fits, instead of hand-writing components:

- tables / lists of resources -> `datagrid-build`
- loading / empty / error / no-matches states -> `status-build`
- other components -> check `pnpm exec intent list` for a matching juno skill first.

This skill only wires the Aurora-specific shell (route, data fetching, nav) around
the UI those skills generate. If a juno skill is not loaded, load it from the
workspace root: `pnpm exec intent load @cloudoperators/juno-ui-components#datagrid-build`.
Do not duplicate juno component rules here.

## Data fetching (required pattern)

Every read follows the same Suspense-based pattern - do not hand-roll
`useState` + `useEffect` loading flags:

- **Fetch with `useSuspenseQuery`** via the typed React client:
  `trpcReact.<service>.<proc>.useSuspenseQuery({ ... })`. This gives you React Query
  caching, deduping and refetching for free, and suspends while loading instead of
  returning a `loading` flag. See `projects/index.tsx` for the canonical usage.
- **Wrap the fetching component in `<Suspense>` and an `<ErrorBoundary>`**
  (`react-error-boundary`). Suspense catches the pending state; the ErrorBoundary catches
  a thrown query error (e.g. a `TRPCClientError`).
- **Render loading and error with the juno `Status` component**, not custom markup:
  `Status status="progress"` as the `Suspense` fallback, and a `Status` (e.g.
  `status="danger"`) in the ErrorBoundary `fallbackRender`. Produce these with the
  `status-build` juno skill so the copy and placement follow its spec.

Skeleton (names/fields come from the brief, not from here):

```tsx no-check
<ErrorBoundary fallbackRender={({ error }) => <Status status="danger" title={...} />}>
  <Suspense fallback={<Status status="progress" title={t`Loading...`} />}>
    <ResourceList project={projectId} />
  </Suspense>
</ErrorBoundary>
// inside ResourceList:
const [data] = trpcReact.<service>.list.useSuspenseQuery({ project_id, ... })
```

Mutations (create/update/delete) use `trpcReact.<service>.<proc>.useMutation(...)` and
invalidate the relevant query on success so the list refetches.

## What you produce

```
<section>/<service>/
  index.tsx                 # file-based route: staticData (RouteInfo) + component
  -components/
    List.tsx                # Suspense + ErrorBoundary list, useSuspenseQuery, juno Status/DataGrid
    ...                     # detail view, modals, rows as needed
```

## Procedure

1. **Route(s)** with `createFileRoute`. Add `staticData` satisfying `RouteInfo`
   (`src/client/routes/routeInfo.ts`: `section`, `service`, `crumb`, `analytics`),
   following the `compute/images/index.tsx` pattern. Add nested routes for sub-resources or
   detail pages following the same file-based convention.

2. **Route component**. Read `projectId` from `Route.useParams()`, render
   `ContentHeader` (`@/client/components/ContentHeader/ContentHeader`) plus the list
   component. (`trpcClient`/`trpcReact` are available; the list fetches via
   `useSuspenseQuery` per the Data fetching section.)

3. **Fetch the data** following the **Data fetching (required pattern)** above:
   `useSuspenseQuery` for each read, wrapped in `Suspense` + `ErrorBoundary`, with juno
   `Status` for the loading and error states. Call the new
   `trpcReact.<service>.<proc>` procedures built by create-service-bff.

4. **List / detail UI** (`-components/`). Generate the table and forms **with the juno
   skills**: run `datagrid-build` for the table of resources and `status-build` for the
   loading / empty / error / no-matches `Status` states, then wire them into the Suspense
   - ErrorBoundary structure from step 3.

5. **Navigation**. Add the service to
   `src/client/routes/_auth/projects/-components/buildNavSections.ts`: a `NavItem` in the
   right `NavSection`, gated by `isEnabled(<service>)` and (where relevant) service
   availability, mirroring the existing entries.

## Rules

- No business logic or data transformation in the UI - consume the BFF shapes as-is.
  If something needs shaping, it belongs in the BFF (create-service-bff).
- Localize user-facing strings with lingui (`msg` / `useLingui`), as the exemplars do.
- Keep it generic: derive resources, columns and states from the brief / epic and the
  BFF procedure shapes. Never hardcode anything the brief did not state, and never
  carry over a column, filter or field from the exemplar service. When a needed detail
  is missing or ambiguous, ask the user rather than guessing or copying.

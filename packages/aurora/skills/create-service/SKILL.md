---
name: create-service
description: >-
  Generate a new Aurora dashboard service end to end from an epic or task spec:
  a BFF list endpoint that proxies the OpenStack API, plus the client side (a
  side-navigation entry and a project-overview service card, a TanStack file
  route with a breadcrumb, and a Juno DataGrid list view of the entity). Use
  when an epic or task asks to add a new
  service or resource area to Aurora; the first page is always the entity's list
  view. The agent derives the entity shape, columns, and API from the spec, asks
  the developer only for gaps, and mirrors an existing service's architecture
  without copying its content.
metadata:
  library: "@cobaltcore-dev/aurora"
sources:
  - src/client/routes/routeInfo.ts
  - src/client/routes/_auth/projects/-components/buildNavSections.ts
  - src/client/routes/_auth/projects/$projectId/index.tsx
  - src/client/trpcClient.ts
  - src/server/routers.ts
  - src/server/trpc.ts
---

# Create a new Aurora service (BFF list endpoint + client list view)

Use this skill when an epic or task asks for a new **service** in the Aurora
dashboard: a feature area for one OpenStack-backed entity. Deliver the **first
page end to end** - the entity's **list view** on the client, fed by a **BFF
list endpoint** that proxies the OpenStack API.

**Start with the list view.** Every service's first page is a list view of its
entity - build that end to end first; it is the path this skill describes
concretely. A spec may also ask for more (a create form, a detail or nested
view, role-gated actions, other pages) or be organized in a completely different
shape. Build what the spec genuinely asks for by applying the method below to
each part. Do not refuse work the spec clearly requires just because this skill
does not spell it out, and do not invent pages it does not ask for; confirm only
genuine ambiguities with the developer.

This skill describes the **workflow and conventions**, not an exhaustive catalog.
It hardcodes **no** entity, fields, columns, API paths, or file paths - derive
those from the spec and from existing services. When the spec needs something
this skill does not describe (a form control, client-side validation, a copy
affordance, a notification), find the established pattern in an existing service
or the relevant Juno skill and follow it. The same steps must work for any entity
and any spec shape without editing this skill.

## Reuse architecture, not content

On both sides you will **explore one existing service as a reference**. Take
**only its architecture and layout**: how its files are organized, where each
piece lives, and the shape of the wiring. Do **not** copy its entity, fields,
columns, API paths, business logic, or carry over its decisions. Take the idea
of _how it is built_, not _what it contains_.

## The method (applies to every part)

Whatever a spec asks for - a list view, a create form, a detail or nested view -
build it with the same loop:

1. Take the requirement from the spec.
2. Find an existing service that already does that concern and **mirror its
   architecture** (not its content or decisions, per the reuse rule above).
3. Delegate the UI to the matching Juno skill (e.g. `build-data-grids` for
   tables); for anything with no skill, follow the reference and the Juno
   component conventions.
4. Put the logic in a project-scoped BFF procedure - `.query` for reads,
   `.mutation` for writes (invalidate the relevant query on success).

The list-view path below is the worked example of this loop; apply the same loop
to anything the skill does not spell out.

## Before you start

1. The list view is typically a Juno DataGrid (use a different presentation only
   if the spec clearly calls for one). Discover and load the Juno skill, then
   follow it for all column/filter/search/toolbar work:
   run `pnpm exec intent list` from the repository root to confirm the skill id,
   then `pnpm exec intent load "@cloudoperators/juno-ui-components#build-data-grids"`
   (see `AGENTS.md`).
2. Pick one reference service to mirror the structure of - read both its client
   route tree and its server domain. Newer services tend to be the cleaner
   template.

## Step 1 - Read the spec, then fill the gaps

Parse the epic/task for:

- **Service name** - a short key (used in the route path, the route `service`
  field, and the nav entry) plus a human-readable label.
- **Entity shape** - the entity's fields and their types. This drives the list
  columns, filters, search, and the BFF response schema.
- **OpenStack API** - the service-catalog name (e.g. `compute`, `network`,
  `image`) and the list path (e.g. `flavors/detail`, `v2.0/floatingips`).
- **Navigation section** - which existing side-nav section it belongs under.

Ask the developer **only for what the spec does not make clear** - most often
the exact **entity object shape**, and the **OpenStack service/path** if the BFF
is in scope. Infer everything else (file locations, routing, breadcrumb, fetch
pattern, i18n) from the reference service. Keep all user-facing strings in the
project's lingui macros, as the reference does.

## Step 2 - BFF: a list endpoint that proxies OpenStack

Do this when the OpenStack API is known from the spec (or the developer). The
BFF owns the business logic (fetching, filtering, searching, sorting, response
validation); the client stays dumb.

Explore a reference server domain for its structure, then create (or extend) a
domain module beside it with the same layout: `routers/` (tRPC procedures),
`types/` (zod schemas + inferred types), `helpers/` (API calls, filtering, error
mapping).

Define the list endpoint as a **project-scoped query** that proxies OpenStack:

```ts no-check
// <Domain>/routers/<entity>Router.ts - shape only; mirror a real domain.
export const widgetRouter = {
  listWidgets: projectScopedProcedure // auth + rescopes the token to project_id
    .input(projectScopedInputSchema.extend({ searchTerm: z.string().optional().default("") }))
    .query(async ({ input, ctx }): Promise<Widget[]> => {
      const svc = ctx.openstack?.service("<catalog-name>") // base URL + token come from the session
      validateOpenstackService(svc, "<catalog-name>")
      const res = await svc.get("<relative/openstack/path>") // no host, no leading slash
      if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      const { widgets } = parseOrThrow(widgetListResponseSchema, await res.json(), "widgetRouter.list")
      return filterBySearchParams(widgets, input.searchTerm, [/* searchable fields from the entity shape */])
    }),
}
```

Conventions to follow (confirm each against the reference domain):

- Derive the procedure from the shared base in `src/server/trpc.ts`. A list
  endpoint is `projectScopedProcedure`, which already validates and injects
  `project_id` (driving token rescoping) - so `project_id` is present in the
  handler regardless of the per-procedure schema. The recommended convention is
  to declare the input as `projectScopedInputSchema.extend({ ... })`; redeclaring
  `project_id` on a plain `z.object({ ... })`, as some domains do, is equally
  valid. Reads are `.query`, writes `.mutation`.
- Resolve the OpenStack client with `ctx.openstack.service("<catalog-name>")`,
  guard it, then call `.get("<relative path>")` - the host and token come from
  the rescoped session's service catalog. Never build full URLs.
- Define the entity as **zod schemas** in `types/` and infer the TS type; reuse
  the response schema to validate the proxied payload before returning.
- Normalize failures to `TRPCError` (follow the reference's error-handling
  helper); never return raw unvalidated OpenStack JSON.
- **Register the procedure.** Add it to the domain's `build<Domain>Routers`
  factory in `routers/index.ts`. Only if you created a brand-new domain, also add
  that factory to `mergeRouters(...)` in `src/server/routers.ts`; extending an
  existing domain needs no `routers.ts` edit. A missing registration makes the
  endpoint silently absent on the client.

If the OpenStack API is **not** determinable and the developer cannot supply it,
skip the BFF for now and drive the client list from **mock data** (Step 4), so
the page is demonstrable; note the stubbed endpoint for later.

## Step 3 - Client: navigation, route, breadcrumb

Follow the reuse rule above here too: take the reference's layout and wiring, not
its entity, columns, or decisions.

- **Nav entry:** add one item to the chosen section in the side-nav builder
  (`buildNavSections`), matching the shape of the entries already there. The nav
  item's **service key must equal** the route's `staticData.service`, or the
  active item will not highlight. Gate it as its neighbors are gated (real
  services on the OpenStack catalog + config; a mock-only service unconditionally).
- **Project-overview service card:** the project detail (overview) view renders
  one `ServiceCard` per available service from its own `cards` list. Add a card
  entry (`group`, `label`, `to`, `service`) alongside the existing ones, with the
  **same gating** and the same `service` key and `to` target as the nav entry.
  The nav list and the card list are separate and must stay in sync - adding only
  the nav entry leaves the service missing from the project overview.
- **Route (file-based TanStack Router):** add a **layout route** (renders
  `<Outlet />`, carries `staticData` + an `errorComponent`) and an **index/list
  route**. Set `staticData` (typed `RouteInfo`) with `section` + `service`
  matching the nav entry, plus `analytics` as neighbors do. If the service
  extends an **existing** scope/domain, reuse that scope's layout route and
  auth/catalog guards - do not duplicate them; add only the new index/list route.
  The route tree regenerates automatically - never hand-edit it.
- **Breadcrumb:** always set the `crumb` on the route's `staticData` so the
  shared Breadcrumbs component picks it up automatically - a static label via the
  `msg` macro on the layout route (`crumb: { text: msg\`Widgets\` }`), and for a
dynamic label (e.g. a resource name on a detail page) the project's
set-breadcrumb hook. A route without a `crumb` is missing from the trail.
- The index route renders the standard `ContentHeader` and your list component,
  mirroring the reference index route.

## Step 4 - Client: the DataGrid list view

Build the table itself - columns, cells, filters, search, toolbar, and loading/
error/empty states - by **following the `build-data-grids` skill**, driven by
the **entity shape** (not a fixed list). This step covers only the **Aurora
wiring around** the grid: where list state lives and how the view is split.

**Every list view gets a toolbar.** When you invoke `build-data-grids`, always
request a header toolbar with these three, for any entity:

- **Free-text search** - a search input (over the entity's name-like fields).
- **Filters** - derived from the entity's fields (status/enum pickers, boolean
  toggles, etc.); the exact set comes from the entity shape, not a fixed list.
- **Total count** - an item count that shows the total and "X of Y" when a
  filter or search is active.

Pass these to `build-data-grids` as required features (its search, filtering,
and item-count inputs) so the toolbar is present on every list, then let that
skill resolve the concrete toolbar composition.

Mirror the reference's split: a List component that owns search/sort/filter
state (kept in the URL via `useSearch` + `navigate({ replace: true })`, with a
debounced search input) and a `*ListContainer` that renders the Juno `DataGrid`.

Wire the data source to the BFF, **matching the fetch pattern of the reference
service** (do not mix patterns in one service):

- **Vanilla client + `use()` + Suspense:** get `trpcClient` from
  `Route.useRouteContext()`, build a Promise with
  `trpcClient.<domain>.<proc>.query({ project_id, ... })`, read it with React's
  `use()` inside `<Suspense>` + an `ErrorBoundary`.
- **React Query:** `trpcReact.<domain>.<proc>.useQuery({ project_id, ... })` and
  thread `{ data, isLoading, isError }` into the `*ListContainer`.

```tsx no-check
// index route - shape only; match the reference's pattern.
function RouteComponent() {
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()
  return <WidgetList projectId={projectId} client={trpcClient} />
}
```

The `client={trpcClient}` prop above is for the **vanilla-client** pattern; in
the **React Query** pattern the List component imports the `trpcReact` singleton
and takes no client prop (the route may still read `trpcClient` from context only
to assert its presence). List routes do **not** use a route loader for the
collection (loaders are only for a detail page's title). Pass the fetched array
plus loading/error state into the `*ListContainer`, which renders the states as
`Status` rows inside the grid.

**Mock fallback** (no BFF yet): read a module-level mock array from a sibling
file, filter it with `useMemo`, and render it - no `trpcClient`, no loader, no
query. Keep enough varied rows that search and every filter are demonstrable.

## Step 5 - Verify

- BFF (if built): the procedure is registered (domain factory, plus
  `mergeRouters` only for a new domain); the response is zod-validated; the
  OpenStack path is relative.
- Client: the nav entry and the project-overview `ServiceCard` both appear
  (gated the same way, same `service` key as the route `staticData.service`);
  every route carries a `crumb`, so the breadcrumb trail shows the service; the
  list renders via `build-data-grids` (not a raw table) with a toolbar (free-text
  search, entity-derived filters, total/"X of Y" count) and loading/error/empty
  states; list data comes from the endpoint (or mock).
- All user-facing strings use lingui macros; type-check and lint pass; the route
  tree regenerates without manual edits.

## Pitfalls

- **Copying a reference's content or decisions** instead of just its structure
  and layout.
- **Hardcoding** entity fields, columns, API paths, or file paths from this
  skill or from the reference.
- **Building a full OpenStack URL** instead of a relative path, or returning raw
  unvalidated OpenStack JSON.
- **Using a route loader to fetch the list** - loaders are for detail titles;
  the list fetches in the component. Do not mix the two fetch patterns.
- **Updating only the nav entry** and forgetting the project-overview
  `ServiceCard` (or letting the two lists' gating/keys drift apart).
- **Omitting the `crumb`** on a route, which drops it from the breadcrumb trail.
- **Reinventing the table or filters** instead of following `build-data-grids`.

## Done when

A new service works end to end from the spec: at minimum a BFF list endpoint
proxying OpenStack (or a documented mock fallback), a nav entry and
project-overview card, a layout + index route with a breadcrumb, and a Juno
DataGrid list view fed by the endpoint. Anything else the spec asks for is built
by the same method (Step references above are the worked list-view example),
mirroring an existing service's architecture, with nothing hardcoded from this
skill - so a different spec and entity would yield a different correct service
unchanged.

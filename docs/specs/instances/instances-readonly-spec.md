# Epic: Instances (read-only) scope

Source BRD: [instances-readonly-brd.md](instances-readonly-brd.md)
Target surface: Aurora Dashboard — built-in scope (**Pattern A**: file-based TanStack Router routes under `$projectId/compute/instances/`, server tRPC procedure already registered via `buildBaseRouter()`, nav item added to the existing `compute` section in `buildNavSections.ts`)
Development context (source of truth): `.claude/context/aurora-dashboard.md`, `.claude/context/juno.md`
Status: ready-for-engineering

> **Scope framing (BRD §6).** Phase 1 is strictly **read-only** — no create/delete and no power/lifecycle actions (start/stop/reboot/resize/console); mutation is a separate later phase. The MVP is the **instance list + instance detail (metadata)** (sub-issues 3–4). The **network addresses sub-section** (sub-issue 5) is fast-follow within the same phase — headline information, sequenced immediately after the MVP detail page but not blocking first release. Status/empty/error/loading state handling is **folded into each sub-issue** where it applies rather than tracked separately. **There is no data-refresh mechanism in phase 1** (see Engineering decision E1).

> **Backend head-start.** Unlike the Networks scope (where both client and server were net-new), the server side already exists: `compute.getServersByProjectId` (`server/Compute/routers/serverRouter.ts`) calls Nova `GET /servers/detail` and parses with the tolerant `serverSchema` (`server/Compute/types/server.ts`), and it is registered in `buildBaseRouter()`. **Phase-1 work is almost entirely client-side.** See Engineering decision E4 for whether a dedicated `getById` procedure is added.

## Confirmed UX / component decisions (grounded in Juno UX docs + sibling implementations)

These must be used **verbatim** by implementers. The reference list views are the existing compute `flavors` view and the network `routers` view, which compose Juno primitives rather than the monolithic `ListToolbar` wrapper:

1. **List toolbar — composed 3-zone DataGrid header** built from `DataGridToolbar` + `SearchInput` (`@cloudoperators/juno-ui-components`) plus the shared `ListToolbar/{SortInput,FiltersInput,SelectedFilters}` sub-components (`client/components/ListToolbar/`), exactly as `network/routers/-components/RoutersList.tsx` does:
   - **Zone 1:** a sort `Select` (Name / Status / Created) + a sort-direction toggle. No predefined filter tabs.
   - **Zone 2:** a `SearchInput` (placeholder makes clear it matches **Name and ID**) + filter `Select`s for **Status** and **Availability Zone** + active-filter pills with a "clear all" (`SelectedFilters`).
   - **Zone 3:** item count ("N instances"; matching/total when filtered) + last-updated timestamp. **No refresh button** (see E1).
2. **Row navigation — clickable row + scaffolded overflow menu.** The whole row is clickable to open the detail route (`datagrid.md`: a row that navigates to a detail view should be fully clickable; nested interactive elements must call `event.stopPropagation()`). The last column **also** keeps an overflow menu (`⋮`) holding a single **"View details"** item in phase 1 — retained deliberately as the extension point for future power/lifecycle actions and to reserve the column `min-width` now. (Conscious divergence from `popup-and-overflow-menus.md`, which would omit a single-option non-destructive menu; the BRD's extensibility rationale wins here — same decision as the Networks scope.)
3. **Detail presentation — full route page** at `…/projects/$projectId/compute/instances/$instanceId`, implemented in the **single-file route form** (`compute/instances/$instanceId.tsx` with a co-located `compute/instances/-components/` subtree), matching the sibling **`flavors`** resource (`compute/flavors/$flavorId.tsx`), which uses the single-file form. Deep-linkable, bookmarkable, room for the nested addresses sub-section. Not a panel or modal.

## Confirmed engineering decisions

Grounded in the current Aurora codebase (`compute/flavors`, `compute/images`, and the network `routers` as reference implementations):

- **E1 — No refresh mechanism in phase 1.** No `refetchInterval` auto-poll, no SSE subscription, and no manual refresh button. Rationale: `refetchInterval` is unused anywhere in Aurora today; the only real-time pattern (tRPC-over-SSE subscriptions) is purpose-built for in-process upload/download progress and does not watch OpenStack resource state; and a manual refresh button is not an established pattern in the sibling list/detail views. Data loads on route navigation / component mount, subject to query freshness; Aurora disables refetch-on-window-focus globally. The Zone-3 **last-updated timestamp is retained**, fed from the query's `dataUpdatedAt` and rendered relative. Refresh of transitional states (`BUILD`, `REBOOT`, `RESIZE`, …) is deferred to a later phase. _(Resolves BRD Q-F7.)_
- **E2 — Image shown as ID only; no Glance name lookup.** The `image` field on the server object may be a nested `{ id, links }`, a bare string, or absent/null per `serverSchema`. Render the ID with a copy affordance when available, without a Glance lookup. Flavor name/specs come from the same response only with Nova microversion **2.47 or newer**. As an API-gate prerequisite, confirm deployment support and update `compute.getServersByProjectId` to explicitly request `OpenStack-API-Version: compute 2.47`; the existing unversioned request does not supply the required embedded flavor representation.
- **E3 — Status sort order (attention-first):** `ERROR` → transitional (`BUILD`, `REBOOT`, `HARD_REBOOT`, `RESIZE`, `VERIFY_RESIZE`, `MIGRATING`, `REBUILD`) → stopped/parked (`SHUTOFF`, `PAUSED`, `SUSPENDED`, `SHELVED`, `SHELVED_OFFLOADED`) → `ACTIVE`; unknown/other strings sort last. The sort-direction toggle flips it. Sorting by status is treated as "surface what needs attention first".
- **E4 — Reuse the existing flat procedure `compute.getServersByProjectId`; add a thin `getServerById` only if needed.** The compute tRPC namespace is **flat** (`trpc.compute.getServersByProjectId`), **not** nested like `network.networks.*` — do not invent a nested `compute.instances.*` router. Because `servers/detail` returns the full object, the detail view can be served by **selecting the instance from the already-fetched list cache** (preferred for the MVP: zero new server code). If a direct deep-link / page refresh on the detail route must work without the list being loaded, add a minimal **`getServerById`** procedure to `serverRouter.ts` (single `GET /servers/{id}`) following the same `projectScopedProcedure` + tolerant-parse shape. _(See open item O2.)_
- **E5 — No pagination in phase 1.** The list renders all rows; search / sort / filter are entirely client-side over the single `compute.getServersByProjectId` response. (The sibling `routers` view hand-rolls `PAGE_SIZE = 50`; for consistency with the Networks read-only decision and because project-scoped instance counts are typically small, phase 1 renders all rows. Revisit only if real projects show large instance counts.)
- **E6 — Status and Availability-Zone filters are enumerated `Select`s.** Status options are the known Nova status values (E3 list) with a graceful "other" bucket; AZ options are derived from the distinct `OS-EXT-AZ:availability_zone` values present in the response. Leaving a filter unselected means "any" (no pill, no filtering). Addresses are derived client-side from the embedded `addresses` map (no filter in phase 1).

## Epic index

| Sub-issue | Title                                        |   In MVP?   | Blocked by |
| --------- | -------------------------------------------- | :---------: | ---------- |
| 1         | API & environment gate                       |   prereq    | —          |
| 2         | Client scaffold, routing, nav & auth wiring  |   prereq    | 1          |
| 3         | List project instances                       |   ✅ MVP    | 1, 2       |
| 4         | Instance detail — metadata (full route page) |   ✅ MVP    | 3          |
| 5         | Network addresses sub-section                | fast-follow | 4          |

## Dependency graph

```
1  API & environment gate
└─ 2  Client scaffold, routing, nav & auth wiring
   └─ 3  List instances ───────────────────────────── (MVP releasable: 3 + 4)
      └─ 4  Instance detail — metadata
         └─ 5  Network addresses sub-section          (fast-follow)
```

Critical path to MVP: **1 → 2 → 3 → 4**. Fast-follow extends **4 → 5**. The addresses sub-section (5) rides the same `servers/detail` object already fetched for the detail page — no additional server call.

---

# Epic — Instances (read-only) scope

Give Aurora project members a read-only view of their project's Nova instances and their network addresses — in context, no CLI.

## 1 — API & environment gate

**What to build:** Nothing to code — a tracking/verification sub-issue that the backing API and dev environment are ready, so every downstream sub-issue has a clear green light.
**Blocked by:** None (can start immediately) · **Status:** ready-for-agent

**Checklist**

- [ ] Confirm OpenStack **Nova (compute) v2.1** is reachable via the Keystone service catalog (`serviceIndex["compute"]?.["nova"]`).
- [ ] Confirm `compute.getServersByProjectId` returns data for the test project (it calls `GET /servers/detail`).
- [ ] Confirm the test project contains the data shapes every view must render, or seed / fall back to realistic mock data for any missing shape:
  - [ ] an `ACTIVE` instance **with network addresses** (so the addresses sub-section and list primary-IP can be exercised)
  - [ ] an instance in a **transitional or `ERROR`** state (to exercise status rendering + attention-first sort)
  - [ ] instances in **two different availability zones** (to exercise the AZ filter)
  - [ ] ideally an instance **with metadata and tags** present, and one with them absent (to exercise the `- -` empty state)
- [ ] Note: Nova `servers/detail` response shapes are well-known and stable (and already parsed by the tolerant `serverSchema`), so UI implementation may begin against mock data regardless of seed status.

**BRD Reference** — API §7 (Details).

---

## 2 — Client scaffold, routing, nav & auth wiring

**What to build:** The net-new **client** surface for the `instances` resource inside Aurora's existing `compute` scope — the route tree, the per-resource catalog guard, and the nav entry — wired to the **already-existing** server procedure, so that an (initially empty) Instances page renders, is reachable from navigation, and can call Nova through the BFF. This is the foundation the story sub-issues build on.
**Blocked by:** 1 · **Status:** ready-for-agent

**Acceptance Criteria**

- [ ] A new route tree exists under `…/projects/$projectId/compute/instances/` (list route `compute/instances/index.tsx`) and `…/compute/instances/$instanceId.tsx` (detail route, **single-file form**), following the file-based routing used by the sibling `compute/flavors` resource.
- [ ] A per-resource catalog guard `compute/instances.tsx` with a `beforeLoad` that redirects to the project landing page when `serviceIndex["compute"]?.["nova"]` is absent — mirroring `compute/flavors.tsx` (there is no `compute.tsx` parent guard in this codebase; gating is per-resource).
- [ ] An **Instances** navigation item is added to the existing `computeServices` array in `buildNavSections.ts`, gated on `serviceIndex?.["compute"]?.["nova"] && isEnabled("instances")`, pointing to `/projects/$projectId/compute/instances` — alongside the existing Images and Flavors items. (Mirror the same entry in the project landing page `projects/$projectId/index.tsx` service cards.)
- [ ] The client calls the **existing** `trpc.compute.getServersByProjectId` procedure (flat compute namespace — **not** a new nested router), which already uses `projectScopedProcedure` so the server injects `X-Auth-Token` via `signal-openstack` and the browser never holds the token.
- [ ] A user without the Nova read capability for the active project does not see the nav item; a user who reaches the route without the capability sees the standard unauthorized state (not a crash/blank page). Reuses the existing compute permission pattern. _(Residual open item O3: confirm the exact Nova policy key for "list servers" at build.)_

**Aurora / Juno implementation notes**

- Pattern A built-in scope — reference the **`compute/flavors`** resource as the closest implementation model (per-resource guard `compute/flavors.tsx`; list `compute/flavors/index.tsx`; single-file detail `compute/flavors/$flavorId.tsx`; `compute/flavors/-components/`).
- Server data access **already exists**: `compute.getServersByProjectId` in `server/Compute/routers/serverRouter.ts` (`ctx.openstack?.service("compute")` → `compute.get("servers/detail")`), types in `server/Compute/types/server.ts`. No new server router is required for the MVP (see E4 for the optional `getServerById`).
- tRPC call shape: `trpc.compute.getServersByProjectId` (flat) — confirm the exact project-scoped input (`projectScopedInputSchema`) matches the sibling calls.
- Route/URL state (search/sort/filter) via TanStack Router search params, Zod-validated.

**BRD Reference** — Target Surface §3 · API §7 (Auth Mode, Catalog Registration, Discovery) · Auth §8 · Appendix (Framework Notes).

---

## 3 — List project instances

**What to build:** The instances list page — a DataGrid of the current project's instances with the confirmed composed 3-zone toolbar, clickable rows that open the detail route, per-row status, and ID copy. Fully handles its own loading / empty / error / unauthorized states.
**Blocked by:** 1, 2 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see a list of the instances in my project, so that I can get an overview of my project's compute at a glance.

**Acceptance Criteria** (from BRD §5.1 Story 1)

- [ ] Lists all instances in the current project. Each row shows:
  - [ ] **Name** — with the instance's **ID shown beneath the name** (no separate ID column); the ID has a **copy-to-clipboard affordance**
  - [ ] **Status** — a visible status indicator tolerating any Nova status string (`ACTIVE`, `BUILD`, `ERROR`, `SHUTOFF`, `PAUSED`, `SUSPENDED`, `SHELVED`, `REBOOT`, `HARD_REBOOT`, `RESIZE`, `VERIFY_RESIZE`, `MIGRATING`, `RESCUE`, `DELETED`, …)
  - [ ] **Flavor** — the embedded `flavor.original_name` (no extra flavor lookup)
  - [ ] **Image** — the image **ID** with a copy affordance; **not** resolved to a name (E2)
  - [ ] **Availability Zone** — `OS-EXT-AZ:availability_zone`
  - [ ] **Primary IP address(es)** — derived client-side from the embedded `addresses` map; compact in the list (full breakdown in sub-issue 5)
  - [ ] **Created** timestamp
  - [ ] a **row overflow menu** (last column) with a single **"View details"** item (phase-1 extension point)
- [ ] The whole row is clickable and navigates to the instance detail route; nested interactive elements (ID copy, overflow menu) call `event.stopPropagation()`
- [ ] **Searchable** by name and ID (search box placeholder makes the matched fields clear)
- [ ] **Sortable** by name, status, and created timestamp. Status sorts attention-first per E3, flipped by the direction toggle
- [ ] **Filterable** by status and availability zone (each an enumerated `Select`, unselected = any — E6), with active-filter pills + "clear all"
- [ ] Flavor specs, key name, host/VM/task state, metadata, and tags are **not** shown in the list — they live in the detail view
- [ ] **No pagination** (E5): all rows render; search/sort/filter are client-side over the single `compute.getServersByProjectId` response
- [ ] **States:** DataGrid-scoped loading indicator; a friendly empty state ("No instances in this project") distinct from a filtered-empty state ("No instances match your filters"); a DataGrid-scoped error state with a **retry** affordance on backend/5xx/timeout (never a blank page/stack trace); the standard unauthorized state on 403

**Aurora / Juno implementation notes**

- Build the 3-zone header by composing `DataGridToolbar` + `SearchInput` + `ListToolbar/SortInput` / `FiltersInput` / `SelectedFilters` — copy the structure of `network/routers/-components/RoutersList.tsx` (Zone 1 sort; Zone 2 search + Status + AZ filters + pills; Zone 3 count + last-updated).
- All search/sort/filter are **client-side** over the single `compute.getServersByProjectId` response — no extra API calls, no server-side query params in phase 1.
- Copy-to-clipboard uses Aurora's existing clipboard affordance (`ClipboardText`) — no custom component.
- **Refresh:** none (E1). Zone 3 shows count + last-updated (`dataUpdatedAt`, relative); no refresh button.
- Default empty-cell placeholder `- -`; for the Name column, if an instance has no name show its ID (per `datagrid.md` writing rules).

**BRD Reference** — Story §5.1 Story 1 · Error/empty states §7 · Auth §8.

---

## 4 — Instance detail — metadata (full route page)

**What to build:** The instance detail route — a full page with a metadata section (description list) covering everything the single `servers/detail` object carries. Reuses the already-fetched server object (E4). Handles its own load/error/unauthorized states; a failed fetch does not blank the app.
**Blocked by:** 3 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to open an instance and see all its metadata, so that I can understand its configuration — what it runs on and how it is set up.

**Acceptance Criteria** (from BRD §5.1 Story 2)

- [ ] Full route page at `…/compute/instances/$instanceId` (single-file form), reachable by clicking a list row and directly via URL
- [ ] **Metadata section** (description list) shows all list fields plus the fields the list omits: Name, ID (copy affordance), Status, **Power state** (`OS-EXT-STS:power_state`), **VM / task state** (`OS-EXT-STS:vm_state` / `OS-EXT-STS:task_state`), Flavor (`original_name` **and** vCPUs / RAM / disk / ephemeral / swap from the embedded `flavor` object), Image **ID** (copy affordance — E2), Availability Zone, **Key name** (`key_name`), Created / Updated timestamps, Description, Metadata (key/value pairs), Tags
- [ ] Description, key name, metadata, and tags are shown when present; when absent, the field renders an explicit `- -` empty state (not omitted)
- [ ] Host-level attributes (`OS-EXT-SRV-ATTR:host`, `hypervisor_hostname`, `instance_name`, `host_status`) are shown **only when the API returns them** — typically admin-only under project scope and often null/absent; a present-but-null value renders `- -`
- [ ] Shows the instance's **network addresses** as a nested sub-section (sub-issue 5 — mount point built here)
- [ ] Flavor / Image detail pages are **not** embedded; the image is an ID only (no name resolution — E2)
- [ ] **States:** page-scoped loading (Spinner) while the instance loads; a scoped error state with retry on failure; standard unauthorized state on 403

**Aurora / Juno implementation notes**

- **Data source (E4):** prefer selecting the instance from the already-fetched `compute.getServersByProjectId` cache for the MVP (zero new server code). If direct-link / refresh-on-detail must work standalone, add a minimal `getServerById` to `serverRouter.ts` (single `GET /servers/{id}`, same tolerant-parse shape) — _see open item O2._
- Detail layout: follow the sibling `compute/flavors/$flavorId.tsx` + `FlavorDetailsView` description-list pattern.
- **Refresh:** none (E1) — same policy as the list.

**BRD Reference** — Story §5.1 Story 2 · API §7 · Auth §8.

---

## 5 — Network addresses sub-section

**What to build:** The **addresses sub-section** of the instance detail page — the instance's IPs grouped by network, derived entirely from the embedded `addresses` map on the server object already fetched for the detail page. Fills the addresses mount point from sub-issue 4.
**Blocked by:** 4 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see the network addresses attached to an instance, so that I can find its IPs and understand how it is reachable.

**Acceptance Criteria** (from BRD §5.1 Story 3)

- [ ] Addresses shown in a **sub-section of the instance detail** (no standalone project-wide address list in phase 1), following the project's datagrid pattern
- [ ] Addresses are grouped **by network name** (the key of the embedded `addresses` map); for each address show: IP address (copy affordance), IP version (4 / 6), MAC address (`mac_addr`), and address **type** (e.g. `fixed` / `floating`) when the API provides it
- [ ] An empty address set shows the datagrid's inline empty state ("No addresses")
- [ ] Addresses come from the embedded `addresses` map on the same `servers/detail` object — **no extra API call** and no per-item fan-out

**Aurora / Juno implementation notes**

- The `addresses` field is `z.record(networkName, addressItem[])` in `serverSchema` (`addr`, `version`, `mac_addr`, `type`). Grouping is pure client-side over that map — zero additional requests.
- Datagrid-in-detail pattern — reference the `flavors` detail layout for the nested table.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 3 · Error/empty §7 · Out-of-Scope §4 (no name resolution / no N+1).

---

## Open items roll-up

**Resolved during planning:**

- ~~**Refresh mechanism**~~ → **resolved E1:** no refresh in phase 1 (no `refetchInterval`, no SSE, no manual button).
- ~~**tRPC namespace**~~ → **resolved E4:** reuse the existing flat `compute.getServersByProjectId`; do **not** create a nested `compute.instances.*` router.
- ~~**Image name resolution**~~ → **resolved E2:** image shown as ID only, no Glance lookup (no N+1).

**Residual (resolve before/at build):**

- **O1 — Dev data shapes (sub-issue 1):** confirm the test project holds an `ACTIVE` instance with addresses, a transitional/`ERROR` instance, instances across two AZs, and instances with/without metadata & tags — else seed or mock.
- **O2 — Detail data source (sub-issue 4):** decide whether the detail page reuses the list cache (MVP default, no new server code) or requires a new `getServerById` procedure for standalone deep-link/refresh. If the latter, add it to `serverRouter.ts` as a single `GET /servers/{id}` with the same tolerant parse.
- **O3 — Permission policy key (sub-issue 2):** confirm the exact Nova policy keys for "list / show servers" (e.g. `os_compute_api:servers:index` / `:detail`) that gate the nav item and the unauthorized state, against the existing compute permission pattern.
- **Non-blocking BRD deferrals (not required for build):** rollout strategy & go-live comms (Q-N1), Aurora core-team sign-off for a new client resource in an existing scope (Q-N2), Document Control submitter/target quarter (Q-N4). Carried from the BRD; none block engineering.

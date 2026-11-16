# Epic: Fixed IPs / Ports (read-only) scope

Source BRD: [ports-readonly-brd.md](ports-readonly-brd.md)
Target surface: Aurora Dashboard — built-in scope (**Pattern A**: file-based TanStack Router routes under `$projectId/network/ports/`, server tRPC router registered via `buildBaseRouter()`, nav entry added to the existing `network` section in `buildNavSections.ts`)
Development context (source of truth): `.claude/context/aurora-dashboard.md`, `.claude/context/juno.md`
Status: ready-for-engineering

> **Scope framing (BRD §6).** Phase 1 is strictly **read-only** — no create/edit/delete; mutation is a separate later phase. The MVP is the **Fixed IPs / Ports list** (sub-issue 3). The **port detail view** (sub-issue 4) is fast-follow within the same phase — it adds the full Fixed IPs sub-table, MAC address, Security Group IDs, and the router deep-link. Status/empty/error/loading state handling is **folded into each sub-issue** where it applies rather than tracked separately. **There is no data-refresh mechanism in phase 1** (see Engineering decision E1).

> **Relationship to the Networks scope.** The Networks scope (BRD Story 4 / spec sub-issues 6–7) shows ports nested inside a network's detail view, fetched via `GET /v2.0/ports?network_id=<id>`. That answers "which ports belong to this network?" The new Ports scope answers the orthogonal question: "show me all ports in my project" — it uses the unfiltered project-scoped port list. The two views are **complementary, not duplicates**. The device-owner label mapping is **shared** between both (extract to a utility in `Network/helpers/portHelpers.ts`).

---

## Confirmed UX / component decisions (grounded in Juno UX docs + sibling implementations)

These must be used **verbatim** by implementers. The reference list views are the existing network `routers` and `floatingips` resources, which compose Juno primitives rather than the monolithic `ListToolbar` wrapper:

1. **List toolbar — composed 3-zone DataGrid header** built from `DataGridToolbar` + `SearchInput` (`@cloudoperators/juno-ui-components`) plus the shared `ListToolbar/{SortInput,FiltersInput,SelectedFilters}` sub-components (`client/components/ListToolbar/`), exactly as `network/routers/-components/RoutersList.tsx` does:
   - **Zone 1:** a sort `Select` (Name / Status) + a sort-direction toggle.
   - **Zone 2:** a `SearchInput` (placeholder makes clear it matches **Name and ID**) + filter `Select`s for **Status**, **Device type** (the human-friendly label categories), and **Network** (derived from the distinct `network_id` values present in the response, each paired with its ID) + active-filter pills with a "clear all" (`SelectedFilters`).
   - **Zone 3:** item count ("N ports"; matching/total when filtered) + last-updated timestamp. **No refresh button** (see E1).
2. **Row navigation — clickable row + scaffolded overflow menu.** The whole row is clickable to open the detail route (`datagrid.md`: a row that navigates to a detail view should be fully clickable; nested interactive elements must call `event.stopPropagation()`). The last column **also** keeps an overflow menu (`⋮`) holding a single **"View details"** item in phase 1 — retained deliberately as the extension point for future mutation actions and to reserve the column `min-width` now. (Conscious divergence from `popup-and-overflow-menus.md`, same decision as the sibling network scopes.)
3. **Detail presentation — single-file route form** at `…/projects/$projectId/network/ports/$portId`, implemented as `network/ports/$portId.tsx` with a co-located `network/ports/-components/` subtree, matching the `routers` resource which uses the single-file form. Deep-linkable, bookmarkable. Not a panel or modal.

---

## Confirmed engineering decisions

Grounded in the current Aurora codebase (`floatingips` / `routers` / `securitygroups` / `networks` as reference implementations):

- **E1 — No refresh mechanism in phase 1.** No `refetchInterval` auto-poll, no SSE subscription, and no manual refresh button. Rationale: consistent with all sibling network scopes; `refetchInterval` is unused anywhere in Aurora today. Data loads on route navigation / component mount. The Zone-3 **last-updated timestamp is retained**, fed from the query's `dataUpdatedAt` and rendered relative.
- **E2 — Device-owner label mapping is a shared utility.** The mapping (`compute:nova` → "Instance", `network:router_interface` → "Router interface", `network:dhcp` → "DHCP agent", `network:floatingip` → "Floating IP", unrecognized → raw string) is already used in the Networks scope's ports sub-table. Extract it to `Network/helpers/portHelpers.ts` so both the Networks scope and the Ports scope share the same implementation.
- **E3 — No device name-resolution; IDs only + selective deep-links.** `device_id` is shown as a plain ID in the list (the list shows only the device type label, not the `device_id` itself). In the detail view, `device_id` has one deep-link exception: when `device_owner = network:router_interface`, it links to the Routers scope detail (ID-based, no extra API call, graceful degradation). This is the identical pattern used in the Networks scope (networks-readonly-spec.md sub-issue 7).
- **E4 — tRPC namespace `network.ports.*`**, procedures `list` and `getById`. The ports router is a **new server-side router** (`Network/routers/portsRouter.ts`) registered alongside the existing `floatingIpRouter`, `routersRouter`, `securityGroupRouter`, and `networksRouter` in `buildNetworkRouters`. Procedure naming follows the sibling convention (`getById`, not `get`). The existing `network.networks.listPorts` procedure (Networks scope, per-network) is **unchanged**.
- **E5 — No pagination in phase 1.** The list renders all rows; search / sort / filter are entirely client-side over the single `network.ports.list` response. None of the sibling network list views paginate consistently, and project-scoped port counts, while potentially larger than networks, are still manageable in phase 1. Revisit only if real projects show performance issues.
- **E6 — Network filter derives options from the response.** The Network filter `Select` in Zone 2 shows the distinct `network_id` values present in the fetched port list. Each option is labelled with the `network_id` (UUID) — **no Neutron network-name lookup** (consistent with E3; no N+1). The filter is a `Select` with an "All networks" default; leaving it unselected means "any".
- **E7 — Status sort order:** `ERROR` → `BUILD` → `DOWN` → `ACTIVE` (attention-first); the sort-direction toggle flips it. Consistent with the Networks scope's port status handling.

---

## Epic index

| Sub-issue | Title                                    |   In MVP?   | Blocked by |
| --------- | ---------------------------------------- | :---------: | ---------- |
| 1         | API & environment gate                   |   prereq    | —          |
| 2         | Scope scaffold, routing & auth wiring    |   prereq    | 1          |
| 3         | List project Fixed IPs / Ports           |   ✅ MVP    | 1, 2       |
| 4         | Port detail — full metadata + deep-links | fast-follow | 3          |

## Dependency graph

```
1  API & environment gate
└─ 2  Scope scaffold, routing & auth wiring
   └─ 3  List Fixed IPs / Ports ──────────────────── (MVP releasable: 3 alone)
      └─ 4  Port detail — full metadata + deep-links   (fast-follow)
```

Critical path to MVP: **1 → 2 → 3**. Fast-follow extends **3 → 4**.

---

# Epic — Fixed IPs / Ports (read-only) scope

Give Aurora project members a project-wide read-only view of all their Neutron ports, their Fixed IPs, and their device assignments — in context, no CLI.

## 1 — API & environment gate

**What to build:** Nothing to code — a tracking/verification sub-issue that the backing API and dev environment are ready, so every downstream sub-issue has a clear green light.
**Blocked by:** None (can start immediately) · **Status:** ready-for-agent

**Checklist**

- [ ] Confirm OpenStack **Neutron v2.0** is reachable via the Keystone service catalog (`getServiceIndex("network")`). Already confirmed for all sibling network resources; record confirmation here for traceability.
- [ ] Confirm `GET /v2.0/ports` (project-scoped, no `network_id` filter) returns data for the test project.
- [ ] Confirm the test project contains the data shapes every view must render, or seed / fall back to realistic mock data for any missing shape:
  - [ ] a port **with multiple Fixed IPs** (so the Fixed IPs stacked-list and sub-table can be exercised)
  - [ ] a port **without a name** (so the ID-as-primary-cell rendering can be exercised)
  - [ ] a port with `device_owner = compute:nova` (Instance)
  - [ ] a port with `device_owner = network:router_interface` (Router interface — to exercise the deep-link)
  - [ ] a port with `device_owner = network:dhcp` (DHCP agent)
  - [ ] a port with **multiple Security Groups** (to exercise the SG list in the detail)
  - [ ] a port in `DOWN` or `ERROR` status (to exercise status rendering + attention-first sort)
  - [ ] ports belonging to **at least two different networks** (to exercise the Network filter)
- [ ] Note: Neutron response shapes are well-known and stable, so UI implementation may begin against mock data regardless of seed status.

**BRD Reference** — API §7 (Details, Dev Environment).

---

## 2 — Scope scaffold, routing & auth wiring

**What to build:** The net-new `ports` resource inside Aurora's existing `network` scope — the route tree, the server-side tRPC router, and the nav entry — so that an (initially empty) Ports page renders, is reachable from navigation, and can call Neutron through the BFF. This is the foundation sub-issues 3 and 4 build on.
**Blocked by:** 1 · **Status:** ready-for-agent

**Acceptance Criteria**

- [ ] A new route tree exists under `…/projects/$projectId/network/ports/` (list route `network/ports/index.tsx`) and `…/network/ports/$portId.tsx` (detail route, **single-file form**), following the file-based routing used by the sibling `network/routers` and `network/floatingips` resources.
- [ ] A server-side tRPC router for ports (`Network/routers/portsRouter.ts`) is registered alongside the existing network routers in `Network/routers/index.ts` (`buildNetworkRouters`), pulled into `buildBaseRouter()` via `server/routers.ts`. All procedures use `projectScopedProcedure` so the server injects `X-Auth-Token` via `signal-openstack` and the browser never holds the token.
- [ ] A **Fixed IPs / Ports** navigation entry is added in `buildNavSections.ts`, appearing within the existing `network` scope section alongside Floating IPs, Routers, Security Groups, and Networks.
- [ ] The scope is catalog-gated: it only appears when the `network` service is in the Keystone catalog, reusing the existing `getServiceIndex("network")` + `beforeLoad` guard in `network.tsx` (no new guard needed — Ports lives under the already-guarded `network` scope).
- [ ] A user without the Neutron read capability for the active project does not see the nav entry; a user who reaches the route without the capability sees the standard unauthorized state (not a crash/blank page). Reuse `network.canUser` with `network:ports:list` for the list and `network:ports:read` for detail; both already map to Neutron's `get_port` rule in `Network/routers/permissionRouter.ts`. O2 is resolved by these existing mappings.
- [ ] The shared device-owner label mapping utility is extracted to `Network/helpers/portHelpers.ts` and consumed by both the new `portsRouter.ts` and the existing `networksRouter.ts` `listPorts` procedure. If the Networks scope is already implemented, update `networksRouter.ts` to import from `portHelpers.ts` in the same PR. _(If the Networks scope has not yet been implemented, create the utility in `portHelpers.ts` and leave a TODO for the Networks scope to adopt it.)_

**Aurora / Juno implementation notes**

- Pattern A built-in scope — reference the **`floatingips`** resource as the closest implementation model (single-file detail, server router pattern).
- Server data access: `GET /v2.0/ports` (project-scoped list) and `GET /v2.0/ports/{port_id}` (detail) via `signal-openstack`; `projectScopedProcedure` auto-rescopes the token to the active project.
- tRPC namespace: **`network.ports`** with procedures `list` and `getById` (E4).
- Route/URL state (search/sort/filter) via TanStack Router search params, Zod-validated.

**BRD Reference** — Target Surface §3 · API §7 (Auth Mode, Catalog Registration) · Auth §8 · Appendix (Framework Notes).

---

## 3 — List project Fixed IPs / Ports

**What to build:** The project-wide Fixed IPs / Ports list page — a DataGrid of all ports in the current project with the confirmed 3-zone toolbar, clickable rows that open the detail route, per-row status, device type label, Fixed IPs, and Network deep-link. Fully handles its own loading / empty / error / unauthorized states.
**Blocked by:** 1, 2 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see a list of all Fixed IPs / Ports in my project, so that I can get a cross-network overview of my project's port inventory at a glance.

**Acceptance Criteria** (from BRD §5.1 Story 1)

- [ ] Lists all ports in the current project (unfiltered by network). Each row shows:
  - [ ] **Name** — with the port's **ID shown beneath the name** (no separate ID column); the ID has a **copy-to-clipboard affordance**; when a port has no name, the ID is shown as the primary cell value (per `datagrid.md`)
  - [ ] **Status** — a visible status indicator (`ACTIVE`, `DOWN`, `BUILD`, `ERROR`; tolerate any string)
  - [ ] **Admin State** — up / down
  - [ ] **Fixed IPs** — all IP address(es) assigned to the port; multiple IPs shown as a stacked list in the cell; `- -` when none
  - [ ] **Network** — `network_id` shown as a **deep-link to that network's detail view** in the Networks scope (`/projects/$projectId/network/networks/$networkId`); degrades to plain ID when the Networks scope is unavailable (E3)
  - [ ] **Device type** — human-friendly label from the `device_owner` mapping (E2); `- -` when `device_owner` is empty
  - [ ] a **row overflow menu** (last column) with a single **"View details"** item (phase-1 extension point)
- [ ] The whole row is clickable and navigates to the port detail route; nested interactive elements (ID copy, network deep-link, overflow menu) call `event.stopPropagation()`
- [ ] **Searchable** across the existing fields: port name, ID, description, Fixed IP addresses, MAC address, device ID/owner, network ID/name, and subnet ID/name. Search remains client-side over the fetched response, including fields not displayed as columns; the placeholder makes the name, ID, IP, and MAC lookup use cases clear.
- [ ] **Sortable** by name and status. Status sorts attention-first per E7, flipped by the direction toggle
- [ ] **Filterable** by status, device type (the human-friendly label categories), and network (distinct `network_id` values from the response — E6), with active-filter pills + "clear all"
- [ ] MAC address, Security Group IDs, and binding details are **not** shown in the list — they live in the detail view
- [ ] **No pagination** (E5): all rows render; search/sort/filter are client-side over the single `network.ports.list` response
- [ ] **States:** DataGrid-scoped loading indicator; a friendly empty state ("No ports in this project") distinct from a filtered-empty state ("No ports match your filters"); a DataGrid-scoped error state with a **retry** affordance on backend/5xx/timeout (never a blank page/stack trace); the standard unauthorized state on 403

**Aurora / Juno implementation notes**

- Build the 3-zone header by composing `DataGridToolbar` + `SearchInput` + `ListToolbar/SortInput` / `FiltersInput` / `SelectedFilters` — copy the structure of `network/routers/-components/RoutersList.tsx`.
- All search/sort/filter are **client-side** over the single `network.ports.list` response — no extra API calls, no server-side query params in phase 1.
- Copy-to-clipboard uses Aurora's existing `ClipboardText` affordance — no custom component.
- **Refresh:** none (E1). Zone 3 shows count + last-updated (`dataUpdatedAt`, relative); no refresh button.
- Default empty-cell placeholder `- -`; for the Name column, if a port has no name show its ID (per `datagrid.md` writing rules).
- Network deep-link: construct the target route from `network_id` and the active `projectId`; gate on `getServiceIndex("network")` being present and the Networks detail route being available (graceful degradation to plain ID — E3).

**BRD Reference** — Story §5.1 Story 1 · Error/empty states §7 · Auth §8.

---

## 4 — Port detail — full metadata + deep-links

**What to build:** The port detail route — a full page showing all port metadata: Fixed IPs as a sub-table, MAC address, Security Group IDs with deep-links to the Security Groups scope, and the router deep-link for `network:router_interface` ports. Handles its own load/error/unauthorized states.
**Blocked by:** 3 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to open a port and see all its metadata, so that I can understand its full configuration — its IP assignments, what it is attached to, and which security groups apply.

**Acceptance Criteria** (from BRD §5.1 Story 2)

- [ ] Full route page at `…/network/ports/$portId` (single-file form), reachable by clicking a list row and directly via URL
- [ ] **Metadata section** (description list) shows: Name, ID (copy affordance), Status, Admin State, **MAC address** (copy affordance), **Network** (deep-link to Networks scope detail — E3), **Device type** (human-friendly label — E2), **Device ID** (`device_id`, copy affordance), **Port security enabled**, Created / Updated timestamps, Description, Tags
- [ ] **Fixed IPs sub-table:** for each Fixed IP show the IP address (copy affordance) and Subnet ID (copy affordance); empty → explicit empty state ("No Fixed IPs")
- [ ] **Security Groups list:** each Security Group ID shown with a copy affordance and a **deep-link to that Security Group's detail** in the existing Security Groups scope, keyed on the SG ID. Degrades gracefully to plain ID when the Security Groups scope is unavailable. Empty → explicit empty state ("No Security Groups")
- [ ] **Exception — router deep-link:** when `device_owner = network:router_interface`, the Device ID is rendered as a **deep-link to that router's detail view** in the Routers scope (`/projects/$projectId/network/routers/$routerId`). No extra API call. Degrades gracefully to plain ID when the Routers scope is unavailable. _(Same pattern as the Networks scope sub-issue 7.)_
- [ ] Binding attributes (`binding:host_id`, `binding:vif_type`, `binding:vnic_type`) are shown **only when the API returns them** — typically admin-only and absent under project scope; a present-but-null value renders `- -`
- [ ] Description and tags are shown when present; absent → `- -`
- [ ] Breadcrumb updated via `useSetBreadcrumb` on the detail page (port name or ID)
- [ ] **States:** page-scoped loading (Spinner) while the port loads; a scoped error state with retry on failure; standard unauthorized state on 403

**Aurora / Juno implementation notes**

- **Data source:** `network.ports.getById` (`projectScopedProcedure`, `GET /v2.0/ports/{port_id}`). For the MVP it is acceptable to select from the already-fetched `network.ports.list` cache when navigating from the list; support a standalone fetch for direct-link/refresh.
- Detail layout: follow the `routers` single-file detail form (description list pattern).
- **Fixed IPs sub-table:** `fixed_ips` is an array of `{ ip_address, subnet_id }` on the port object — already present in the list response; no extra call.
- **Security Groups:** `network.ports.getById` returns `security_groups` as `{ id, name? }[]` after a best-effort batched lookup; use each reference's `id` for display, copying, and deep-links. If reusing list data (`security_groups: string[]`), normalize its IDs to references before passing it to the detail view. The UI needs no additional lookup. Construct links from the SG ID and `projectId`, falling back to plain IDs when the Security Groups resource is unavailable.
- **Router deep-link:** construct target route `/projects/$projectId/network/routers/$routerId` from `device_id`; gate on the Routers scope being available. Identical to the deep-link in Networks scope sub-issue 7 — share or reference that implementation.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 2 · Out-of-Scope §4 (no name resolution) · Dependencies §8 (soft dependencies) · API §7.

---

## Open items roll-up

**Resolved during planning:**

- ~~**Relationship to Networks scope ports sub-table**~~ → **resolved:** the Networks scope's `listPorts` (per-network, `?network_id=`) and this scope's `ports.list` (project-wide, no `network_id` filter) are separate procedures answering different questions. The device-owner label mapping is shared via `portHelpers.ts`.
- ~~**Refresh mechanism**~~ → **resolved E1:** no refresh in phase 1 (no `refetchInterval`, no SSE, no manual button). Consistent with all sibling network scopes.
- ~~**Detail page form**~~ → **resolved:** single-file form, matching `routers` (not directory form, because the detail has no nested sub-tables that require a full component subtree — only a Fixed IPs array and a SG ID list, both from the same response object).

**Residual (resolve before/at build):**

- **O1 — Dev data shapes (sub-issue 1):** confirm the test project holds ports with multiple Fixed IPs, ports without names, ports of each device type, ports with multiple Security Groups, and ports in varied status — else seed or mock.
- **O2 — Permission policy key (sub-issue 2):** confirm the exact Neutron policy key for "list ports" (expected: `get_ports`) against the `network.canUser` permission router pattern used by sibling resources.
- **O3 — Network filter options (sub-issue 3):** the Network filter derives its options from the distinct `network_id` values present in the port list response. If project members have many networks, the filter `Select` may have many options — confirm this is acceptable for phase 1, or cap / defer the filter to a later phase.
- **Non-blocking BRD deferrals (not required for build):** rollout strategy & go-live comms, Aurora core-team sign-off for a new resource in an existing scope, Document Control submitter/target quarter. Carried from the BRD; none block engineering.

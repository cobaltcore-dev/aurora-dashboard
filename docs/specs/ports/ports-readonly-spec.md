# Epic: Fixed IPs / Ports (read-only) scope

Source BRD: [ports-readonly-brd.md](ports-readonly-brd.md)
Target surface: Aurora Dashboard — built-in scope (**Pattern A**: file-based TanStack Router routes under `$projectId/network/ports/`, server tRPC router registered via `buildBaseRouter()`, nav entry added to the existing `network` section in `buildNavSections.ts`)
Development context (source of truth): `.claude/context/aurora-dashboard.md`, `.claude/context/juno.md`
Status: implemented

> **Baseline (IMPORTANT — read first).** A project-wide read-only Ports feature **already exists on `main`**, merged in [#1377](https://github.com/cobaltcore-dev/aurora-dashboard/pull/1377) (commit `599479d`, "add Neutron Ports BFF and read-only Ports page (list & details)"). That PR shipped: the route tree (`network/ports.tsx`, `network/ports/index.tsx`, `network/ports/$portId.tsx`), the client components (`PortsList`, `PortListContainer`, `PortTableRow`, `PortDetailsView`), the server router `portsRouter.ts` (with `list`, `getById`, **and** `create` / `update` / `delete`), the nav entry, and the permission keys. The polish deltas (Device type label, filters, attention-first sort, Zone-3 timestamp, detail extra fields, deep-links) have been applied on top of that baseline. **This spec is therefore a post-implementation record**, not a build plan.

> **Scope framing (BRD §6).** Phase 1 is strictly **read-only** — no create/edit/delete in the UI; mutation is a separate later phase. The list and detail view are fully implemented. Status/empty/error/loading state handling is **folded into each sub-issue** where it applies. **There is no data-refresh mechanism in phase 1** (see Engineering decision E1).

> **Existing mutations.** `portsRouter.ts` already exposes `create`, `update`, and `delete` (permission keys `network:ports:create|update|delete`). Phase 1 is read-only **in the UI only**: these procedures **stay on the server** (they back no UI in this phase) and the UI exposes no mutation affordances. They are not removed and not surfaced. A later mutation phase will build on them.

> **Relationship to the Networks scope.** The Networks scope shows ports nested inside a network's detail view (`NetworkPortsTable`), fetched via `GET /v2.0/ports?network_id=<id>` (`networksRouter.listPorts`). That answers "which ports belong to this network?" The project-wide Ports scope answers the orthogonal question: "show me all ports in my project" — it uses the unfiltered project-scoped port list (`portsRouter.list`). The two views are **complementary, not duplicates**, and are **separate procedures**. The device-owner label mapping is a **client-side i18n concern** (Lingui `t`) currently defined inline in `NetworkPortsTable.tsx`; the delta is to extract it to a **client-side** helper shared by both client components (see E2) — it is _not_ a BFF/server concern and `networksRouter.listPorts` does no label mapping.

---

## Confirmed UX / component decisions (grounded in Juno UX docs + sibling implementations)

These must be used **verbatim** by implementers. The reference list views are the existing network `routers` and `floatingips` resources, which compose Juno primitives rather than the monolithic `ListToolbar` wrapper:

1. **List toolbar — composed 3-zone DataGrid header** built from `DataGridToolbar` + `SearchInput` (`@cloudoperators/juno-ui-components`) plus the shared `ListToolbar/{SortInput,FiltersInput,SelectedFilters}` sub-components (`client/components/ListToolbar/`), exactly as `network/routers/-components/RoutersList.tsx` does:
   - **Zone 1:** a sort `Select` (Name / Status) + a sort-direction toggle.
   - **Zone 2:** a `SearchInput` (placeholder makes clear it matches **Name, ID, MAC address and Fixed IP**) + filter `Select`s for **Status**, **Device type** (the human-friendly label categories), and **Network** (derived from the distinct `network_id` values present in the response, each paired with its ID) + active-filter pills with a "clear all" (`SelectedFilters`). _Baseline: `PortsList.tsx` already searches name, ID, description, network ID/name, MAC address, device ID/owner, and each fixed IP's address/subnet ID/subnet name, and already has a **Status** filter. The delta is the Device type and Network filters (see E6, I4)._
   - **Zone 3:** item count ("N ports"; matching/total when filtered) + last-updated timestamp. **No refresh button** (see E1).
2. **Row navigation — clickable row + scaffolded overflow menu.** The whole row is clickable to open the detail route (`datagrid.md`: a row that navigates to a detail view should be fully clickable; nested interactive elements must call `event.stopPropagation()`). The last column **also** keeps an overflow menu (`⋮`) holding a single **"Show Details"** item in phase 1 (title case, first item — per `docs/guardrails/guardrails.md`), retained deliberately as the extension point for future mutation actions and to reserve the column `min-width` now. **Already implemented** in `PortTableRow.tsx` (uses `t\`Show Details\``). (Conscious divergence from `popup-and-overflow-menus.md`, same decision as the sibling network scopes.)
3. **Detail presentation — single-file route form** at `…/projects/$projectId/network/ports/$portId`, implemented as `network/ports/$portId.tsx` with a co-located `network/ports/-components/` subtree, matching the `routers` resource which uses the single-file form. Deep-linkable, bookmarkable. Not a panel or modal.

---

## Confirmed engineering decisions

Grounded in the current Aurora codebase (the already-merged Ports feature from #1377, plus `floatingips` / `routers` / `securitygroups` / `networks` as reference implementations). Each decision states whether it is **already satisfied** by #1377 or a **delta** still to build.

- **E1 — No refresh mechanism in phase 1.** No `refetchInterval` auto-poll, no SSE subscription, and no manual refresh button. Rationale: consistent with all sibling network scopes; `refetchInterval` is unused anywhere in Aurora today. Data loads on route navigation / component mount. **Delta:** the existing `PortsList.tsx` has no last-updated label; add a Zone-3 last-updated timestamp fed from the query's `dataUpdatedAt`, rendered relative — following `SecretsList.tsx` (which already uses `dataUpdatedAt`).
- **E2 — Device-owner label mapping is a shared client-side utility.** The mapping (`compute:nova` → "Instance", `network:router_interface` → "Router interface", `network:dhcp` → "DHCP agent", `network:floatingip` → "Floating IP", unrecognized → raw string) already exists, but **inline inside the client component `NetworkPortsTable.tsx`** (using the Lingui `t` macro). **Delta:** extract it to a **client-side** helper (e.g. `network/-helpers/deviceOwnerLabel.ts`) and have both client components — `NetworkPortsTable` and the project-wide `PortTableRow` — consume it. It must **not** go into the server `Network/helpers/portHelpers.ts`: that file is server-only (it imports `node:net`) and cannot be imported by a browser component, and the mapping is a client i18n concern (`t`), not a BFF concern. `networksRouter.listPorts` does **no** label mapping and is left unchanged.
- **E3 — No device name-resolution; `device_id` as ID + selective deep-links.** `device_id` is not resolved to an instance/router _name_ (that would be an N+1 Nova/Neutron call). In the list, the Device type label is shown (the `device_id` itself is not a list column). In the detail view, `device_id` has one deep-link exception: when `device_owner = network:router_interface`, it links to the Routers scope detail (ID-based, no extra API call, graceful degradation). **Note:** the existing `getById` already resolves network, subnet and security-group _names_ (rendered via `NamedResource`); that resolution stays — E3 is only about not resolving the `device_id` device name.
- **E4 — tRPC namespace `network.ports.*`.** The ports router **already exists** (`Network/routers/portsRouter.ts`, registered in `buildNetworkRouters`) and exposes `list`, `getById`, `create`, `update`, `delete`. Phase 1 uses `list` and `getById`; the mutations stay server-side and unused by the UI (see "Existing mutations" above). The existing `network.networks.listPorts` procedure (Networks scope, per-network) is **unchanged**. No new router is created.
- **E5 — Client-side pagination (already implemented).** The existing `PortsList.tsx` already paginates **client-side** at `PAGE_SIZE = 50` over the fully-fetched `network.ports.list` response, with a `page` search param and a `PageInput`. **This is the baseline and is kept.** Search / sort / filter are all client-side. The BFF `portsRouter.list` follows Neutron `ports_links` pagination to fetch the complete inventory before returning it — do not drop that fan-out.
- **E6 — Network & Device-type filters derive options from the response.** **Delta:** the existing list has only a **Status** filter. Add a **Network** filter whose `Select` options are the distinct `network_id` values present in the fetched list (labelled with the UUID — no Neutron network-name lookup, consistent with E3), and a **Device type** filter over the human-friendly label categories (E2). Both default to "all"; unselected means "any".
- **E7 — Status sort order (delta).** The existing list sorts name / status / device_owner with a plain `localeCompare`. **Delta:** change the status sort to attention-first `ERROR` → `BUILD` → `DOWN` → `ACTIVE`; the sort-direction toggle flips it.

---

## Epic index

| Sub-issue | Title                                             |   In MVP?   | Blocked by | Status  |
| --------- | ------------------------------------------------- | :---------: | ---------- | ------- |
| 1         | API & environment gate                            |   prereq    | —          | ✅ done |
| 2         | Verify existing scaffold & extract shared mapping |   prereq    | 1          | ✅ done |
| 3         | List deltas — filters, sort, search, last-updated |   ✅ MVP    | 1, 2       | ✅ done |
| 4         | Port detail deltas — extra fields + deep-links    | fast-follow | 3          | ✅ done |

## Dependency graph

```
1  API & environment gate
└─ 2  Verify existing scaffold & extract shared mapping
   └─ 3  List deltas ──────────────────────────────── (MVP releasable: 3 alone)
      └─ 4  Port detail deltas                          (fast-follow)
```

Critical path to MVP: **1 → 2 → 3**. Fast-follow extends **3 → 4**.

---

# Epic — Fixed IPs / Ports (read-only) scope

Give Aurora project members a project-wide read-only view of all their Neutron ports, their Fixed IPs, and their device assignments — in context, no CLI.

## 1 — API & environment gate

**What to build:** Nothing to code — a tracking/verification sub-issue that the backing API and dev environment are ready, so every downstream sub-issue has a clear green light.
**Blocked by:** None (can start immediately) · **Status:** completed

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

## 2 — Verify existing scaffold & extract shared device-owner mapping

**What to build:** Almost nothing new — #1377 already shipped the `ports` route tree, the `portsRouter`, and the nav entry. This sub-issue **verifies** that scaffold is present and correct, and does the one real refactor: **extract the device-owner label mapping to a shared client-side helper** so both the Networks ports sub-table and the project-wide Ports list use one implementation.
**Blocked by:** 1 · **Status:** completed

**Acceptance Criteria**

- [ ] **Verify (no new work expected):** the route tree already exists under `…/projects/$projectId/network/ports/` — `network/ports.tsx`, `network/ports/index.tsx` (list) and `network/ports/$portId.tsx` (detail, single-file form). Confirm present; do not recreate.
- [ ] **Verify:** `Network/routers/portsRouter.ts` already exists, is registered in `Network/routers/index.ts` (`buildNetworkRouters`) and pulled into `buildBaseRouter()` via `server/routers.ts`, and all procedures use `projectScopedProcedure`. Confirm present; do not recreate.
- [ ] **Verify:** a **Fixed IPs / Ports** navigation entry already exists in `buildNavSections.ts` within the `network` scope section. Confirm present.
- [ ] **Verify:** the scope is catalog-gated via the existing `getServiceIndex("network")` + `beforeLoad` guard in `network.tsx` (Ports lives under the already-guarded `network` scope — no new guard).
- [ ] **Verify:** a user without the Neutron read capability does not see the nav entry and sees the standard unauthorized state on the route. The existing permission keys `network:ports:list` / `network:ports:read` map to the Neutron rule `get_port` (there is no `get_ports` rule; reuse the existing keys).
- [ ] **Delta (the real work):** extract the device-owner label mapping out of the inline definition in `NetworkPortsTable.tsx` into a shared **client-side** helper (e.g. `network/-helpers/deviceOwnerLabel.ts`). Both `NetworkPortsTable` and the project-wide `PortTableRow` import and use it. It must **not** be placed in the server `Network/helpers/portHelpers.ts` (server-only, imports `node:net`; the mapping uses the Lingui `t` macro and is a client i18n concern). `networksRouter.listPorts` is **not** touched.

**Aurora / Juno implementation notes**

- The scaffold already follows Pattern A (reference the existing `network/ports/` tree and `portsRouter.ts`; `floatingips` remains the closest sibling model).
- Server data access already in place: `portsRouter.list` (`GET /v2.0/ports`, following `ports_links` pagination) and `portsRouter.getById` (`GET /v2.0/ports/{port_id}`), both `projectScopedProcedure`.
- tRPC namespace: **`network.ports`** — `list` and `getById` are the read procedures used in phase 1 (E4).
- Shared mapping: extract from `NetworkPortsTable.tsx` to a **client-side** helper; keep the Lingui `t` labels.

**BRD Reference** — Target Surface §3 · API §7 (Auth Mode, Catalog Registration) · Auth §8 · Appendix (Framework Notes).

---

## 3 — List deltas — filters, sort, search, last-updated

**What to build:** Polish deltas on the **already-shipped** project-wide Fixed IPs / Ports list (`PortsList` / `PortListContainer` / `PortTableRow`). The list, its 3-zone toolbar, clickable rows, per-row status, Fixed IPs, Network column, client-side pagination (50/page), and name+ID+MAC+IP search already exist. This sub-issue adds the missing Device type / Network filters, the attention-first status sort, the human-friendly Device type label, and the Zone-3 last-updated timestamp.
**Blocked by:** 1, 2 · **Status:** completed

**User story:** As a Project Member (Viewer), I want to see a list of all Fixed IPs / Ports in my project, so that I can get a cross-network overview of my project's port inventory at a glance.

**Acceptance Criteria** (from BRD §5.1 Story 1 — all implemented)

- [x] ✅ Lists all ports in the current project (unfiltered by network). Each row shows:
  - [x] ✅ **Name** — with the port's **ID shown beneath the name** (no separate ID column); the ID has a **copy-to-clipboard affordance**; when a port has no name, the ID is shown as the primary cell value (per `datagrid.md`)
  - [x] ✅ **Status** — a visible status indicator (`ACTIVE`, `DOWN`, `BUILD`, `ERROR`; tolerate any string)
  - [x] ✅ **Fixed IPs** — all IP address(es) assigned to the port; multiple IPs shown as a stacked list in the cell; `- -` when none
  - [x] ✅ **Network** — `network_id` (with name when resolved) shown in the Network column, rendered as a **deep-link to that network's detail view** in the Networks scope; degrades to plain ID when the Networks scope is unavailable (E3)
  - [x] ✅ **Device type** — human-friendly label from the shared mapping (E2); `- -` when `device_owner` is empty
  - [x] ✅ a **row overflow menu** (last column) with a single **"Show Details"** item (phase-1 extension point) — present in `PortTableRow.tsx`
- [x] ✅ The whole row is clickable and navigates to the port detail route; nested interactive elements call `event.stopPropagation()`
- [x] ✅ **Searchable** by name, ID, MAC address and Fixed IP (and subnet / device fields) — implemented in `PortsList.tsx`
- [x] ✅ **Sortable** by name and status (attention-first: `ERROR` → `BUILD` → `DOWN` → `ACTIVE`), flipped by the direction toggle (E7)
- [x] ✅ **Filterable** by status, **Device type**, and **Network** (E6), with active-filter pills + "clear all"
- [x] ✅ MAC address, Security Group IDs, and binding details are **not** shown in the list — they live in the detail view
- [x] ✅ **Client-side pagination** at 50 rows/page (E5) over the single `network.ports.list` response; search/sort/filter are client-side
- [x] ✅ **Zone-3 last-updated timestamp** — relative last-updated label fed from the query's `dataUpdatedAt` (following `SecretsList.tsx`)
- [x] ✅ **States:** DataGrid-scoped loading indicator; a friendly empty state ("No ports in this project") distinct from a filtered-empty state ("No ports match your filters"); a DataGrid-scoped error state with a **retry** affordance on backend/5xx/timeout; the standard unauthorized state on 403

**Aurora / Juno implementation notes**

- The 3-zone header is composed from `DataGridToolbar` + `SearchInput` + `ListToolbar` sub-components, with Device type and Network filters in Zone 2.
- All search/sort/filter are **client-side** over the single `network.ports.list` response — no extra API calls, no server-side query params.
- Copy-to-clipboard uses Aurora's existing `ClipboardText` affordance.
- **Pagination:** client-side `PAGE_SIZE = 50` + `page` search param (E5).
- **Refresh:** none (E1). Zone 3 shows count + last-updated label (`dataUpdatedAt`, relative) — following `SecretsList.tsx`.
- Default empty-cell placeholder `- -`; for the Name column, if a port has no name the ID is shown (per `datagrid.md` writing rules).
- Network deep-link: constructed from `network_id` and the active `projectId`; degrades to plain ID when the Networks scope is unavailable (E3).

**BRD Reference** — Story §5.1 Story 1 · Error/empty states §7 · Auth §8.

---

## 4 — Port detail deltas — extra fields + deep-links

**What to build:** Deltas on the **already-shipped** port detail (`$portId.tsx` + `PortDetailsView`). That page already renders Port ID, MAC, Network (as a `NamedResource`), Fixed IPs (IP + subnet name/ID), Description, Name, Device Owner (raw), Device ID, Created/Updated, Project ID, Status, and the Security Groups list (each a `NamedResource`), and already sets the breadcrumb. This sub-issue adds the missing fields, the mapped Device type label, and the deep-links.
**Blocked by:** 3 · **Status:** completed

**User story:** As a Project Member (Viewer), I want to open a port and see all its metadata, so that I can understand its full configuration — its IP assignments, what it is attached to, and which security groups apply.

**Acceptance Criteria** (from BRD §5.1 Story 2 — all implemented)

- [x] ✅ Full route page at `…/network/ports/$portId` (single-file form), reachable by clicking a list row and directly via URL
- [x] ✅ Breadcrumb set via `useSetBreadcrumb` (port name or ID) — present
- [x] ✅ **Name resolution kept:** `getById` resolves network, subnet and security-group **names**, rendered via `NamedResource`
- [x] ✅ Metadata shown: Name, ID (copy), Status, Admin State, MAC (copy), Network (`NamedResource`, deep-link), Device type (human-friendly label), Device ID (copy), Created / Updated, Project ID, Description, Tags, Port security enabled
- [x] ✅ **Fixed IPs:** each Fixed IP shows IP address and subnet (name when resolved, else ID). Rendered as a sub-table with an empty state ("No Fixed IPs") when absent
- [x] ✅ **Security Groups list:** each SG rendered as a `NamedResource` (name + copyable ID) with a **deep-link** to the Security Groups scope; empty → explicit empty state ("No Security Groups")
- [x] ✅ **Router deep-link exception:** when `device_owner = network:router_interface`, Device ID links to the Routers scope detail view. Degrades to plain ID when unavailable
- [x] ✅/tolerant Binding attributes (`binding:host_id`, `binding:vif_type`, `binding:vnic_type`) shown **only when the API returns them** — typically admin-only and absent under project scope; a present-but-null value renders `- -`
- [x] ✅ **UI structure:** Fixed IPs and Security Groups shown in separate sections; a TabBar is used if both are sub-tables (per `docs/guardrails/guardrails.md` Detail Views)
- [x] ✅ **States:** page-scoped loading (Spinner); a scoped error state with retry on failure; standard unauthorized state on 403

**Aurora / Juno implementation notes**

- **Data source:** `network.ports.getById` (`projectScopedProcedure`, `GET /v2.0/ports/{port_id}`) — resolves network / subnet / security-group names server-side.
- Detail layout: single-file form in `PortDetailsView`.
- **Fixed IPs:** `fixed_ips` (`{ ip_address, subnet_id }`, plus resolved subnet name).
- **Security Groups:** rendered as `NamedResource` with SG deep-link (constructed from SG ID + `projectId`; gated on the Security Groups scope being in the catalog).
- **Router deep-link:** constructed from `device_id` as `/projects/$projectId/network/routers/$routerId`; gated on the Routers scope being available.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 2 · Out-of-Scope §4 (no name resolution) · Dependencies §8 (soft dependencies) · API §7.

---

## Open items roll-up

**All items resolved:**

- ~~**Relationship to Networks scope ports sub-table**~~ → **resolved:** the Networks scope's `listPorts` (per-network, `?network_id=`) and this scope's `ports.list` (project-wide, no `network_id` filter) are separate procedures answering different questions. The device-owner label mapping is a **client-side** concern, shared by extracting the inline map from `NetworkPortsTable.tsx` into a client helper.
- ~~**Permission policy key**~~ → **resolved (was O2):** the Neutron rule is `get_port` (there is no `get_ports` rule in `networking.json`). The existing keys `network:ports:list` and `network:ports:read` already map to `get_port`.
- ~~**Refresh mechanism**~~ → **resolved E1:** no refresh in phase 1 (no `refetchInterval`, no SSE, no manual button). Consistent with all sibling network scopes.
- ~~**Detail page form**~~ → **resolved:** single-file form, matching the existing `PortDetailsView`.
- ~~**O1 — Dev data shapes**~~ → **resolved:** environment confirmed; test data seeded or verified for all required port shapes.
- ~~**O3 — Network filter options**~~ → **resolved:** Network filter derives options from the distinct `network_id` values in the fetched list, labelled with the resolved network name (falling back to UUID). Acceptable for phase 1.
- ~~**O4 — Detail UI structure**~~ → **resolved:** Fixed IPs rendered as a stacked list in a description list section; Security Groups rendered as a list of `NamedResource` items with deep-links in a separate section. No TabBar (SG list is not a sub-table).
- ~~**Non-blocking BRD deferrals**~~ → closed: rollout is all-at-once (catalog-gated, no feature flag); go-live comms deferred; Document Control fields deferred.

# Epic: Shared File System Storage (read-only) scope

Source BRD: [shared-file-system-readonly-brd.md](shared-file-system-readonly-brd.md)
Target surface: Aurora Dashboard — built-in scope (**Pattern A**: file-based TanStack Router routes under `$projectId/shared-file-system/`, server tRPC router registered via `buildBaseRouter()`, nav section/entry in `buildNavSections.ts`)
Development context (source of truth): `.claude/context/aurora-dashboard.md`, `.claude/context/juno.md`
Status: ready-for-engineering

> **Scope framing (BRD §6).** Phase 1 is strictly **read-only** — no create/extend/shrink/delete, no snapshot-create/revert, no manage/unmanage, no replica create/promote/resync, no access-rule or share-network / security-service mutation; mutation is a separate later phase. The scope is presented as **three tabs — Shares · Share Networks · Security Services** (E7). **Snapshots and replicas are not tabs** — they are nested inside an individual share's detail (E7). The MVP is the **tab shell + Shares tab (list) + share detail (metadata + export locations + nested snapshots + nested replicas) + share-snapshot detail** (sub-issues 2–5). The **Share Networks tab + detail**, the **Security Services tab + detail**, and the **cross-scope deep-links** (sub-issues 6–9) are fast-follow within the same phase — headline functionality, sequenced immediately after the shares MVP but not blocking first release. Status/empty/error/loading state handling is **folded into each sub-issue** where it applies rather than tracked separately. **There is no data-refresh mechanism in phase 1** (see Engineering decision E1).

> **Net-new on both tiers.** **Nothing Manila-related exists in the codebase today** — no client route, no server router, no types. The closest precedents are the **Volumes** scope (net-new, multi-resource tab shell, "snapshots of this X" nested section) and the **Networks** scope (net-new, nested list-in-detail sub-tables, ID-based cross-scope deep-links). Reference `Volume/` and `Network/` for the server layout and the volumes / network `routers`+`floatingips` resources for the client layout.

> **Manila is often absent.** Unlike Neutron/Nova/Cinder, the shared-file-system service is **not** present in every OpenStack deployment. The catalog gate is therefore load-bearing: in regions without Manila the scope simply does not appear (a natural dark-launch). Confirm the catalog registration early (O3).

## Confirmed UX / component decisions (grounded in Juno UX docs + sibling implementations)

These must be used **verbatim** by implementers. The reference list views are the volumes list and the network `routers` / `floatingips` views, which compose Juno primitives rather than the monolithic `ListToolbar` wrapper:

1. **List toolbar — composed 3-zone DataGrid header** built from `DataGridToolbar` + `SearchInput` (`@cloudoperators/juno-ui-components`) plus the shared `ListToolbar/{SortInput,FiltersInput,SelectedFilters}` sub-components (`client/components/ListToolbar/`), exactly as `network/routers/-components/RoutersList.tsx` does. Each of the three list tabs uses the same composition:
   - **Shares — Zone 1:** sort `Select` (Name / Status / Size / Created) + direction toggle. **Zone 2:** `SearchInput` (placeholder: matches Name and ID) + filter `Select`s for Status, Protocol, Share type, Availability Zone, Visibility + active-filter pills with "clear all". **Zone 3:** item count + last-updated timestamp. **No refresh button** (E1).
   - **Share Networks — Zone 1:** sort `Select` (Name / Subnet count / Created) + direction toggle. **Zone 2:** `SearchInput` + pills. **Zone 3:** count + last-updated. (No filters — share networks carry few filterable facets.)
   - **Security Services — Zone 1:** sort `Select` (Name / Type / Created) + direction toggle. **Zone 2:** `SearchInput` + a Type filter `Select` + pills. **Zone 3:** count + last-updated.
2. **Row navigation — clickable row + scaffolded overflow menu.** The whole row is clickable to open the detail route (`datagrid.md`); nested interactive elements (overflow menu, deep-links) call `event.stopPropagation()`. The last column keeps an overflow menu (`⋮`) holding a single **"View details"** item in phase 1 — the extension point for future mutation actions and to reserve the column `min-width` now. (Conscious divergence from `popup-and-overflow-menus.md`, same decision as the Networks / Volumes / Instances scopes.)
3. **Detail presentation — full route pages.** Share detail at `…/shared-file-system/$shareId` and share-snapshot detail at `…/shared-file-system/snapshots/$snapshotId`; share-network detail at `…/shared-file-system/share-networks/$shareNetworkId`; security-service detail at `…/shared-file-system/security-services/$securityServiceId`. Because the **share detail** and the **share-network detail** each have nested sub-tables + sections, implement those two in the **directory route form** (`$shareId/index.tsx` with a co-located `$shareId/-components/` subtree; same for `$shareNetworkId`), matching the `floatingips` resource. The **share-snapshot detail** and the **security-service detail** are simpler and may use the single-file form (`snapshots/$snapshotId.tsx`, `security-services/$securityServiceId.tsx`), matching `routers` / `flavors`.
4. **Scope tab shell — Shares · Share Networks · Security Services (E7).** The scope renders a `TabNavigation` with three peer tabs: **Shares** (default, list at `…/shared-file-system`), **Share Networks** (list at `…/shared-file-system/share-networks`), and **Security Services** (list at `…/shared-file-system/security-services`). Each tab hosts its own full DataGrid list; opening a row navigates to that resource's detail route (the detail pages are full route pages, not nested inside the tab). Snapshots and replicas are **not** tabs — they are nested sections inside the share detail. Tab prior art: the Volumes scope's Volumes · Snapshots `TabNavigation`. The tab shell is part of the MVP (sub-issue 2) so the two fast-follow tabs are drop-ins rather than a re-layout.

## Confirmed engineering decisions

Grounded in the current Aurora codebase (`Volume/` and `Network/` server layouts; the volumes list / `floatingips` / `routers` client resources as reference implementations):

- **E1 — No refresh mechanism in phase 1.** No `refetchInterval` auto-poll, no SSE subscription, and no manual refresh button. Rationale identical to the Networks/Volumes/Instances scopes: `refetchInterval` is unused anywhere in Aurora; the only real-time pattern (tRPC-over-SSE) is purpose-built for upload/download progress and does not watch OpenStack resource state; and a manual refresh button is not an established pattern in the sibling views. Data loads on route navigation / component mount. The Zone-3 **last-updated timestamp is retained**, fed from the query's `dataUpdatedAt` and rendered relative. Refresh of transitional states (`creating`, `extending`, `migrating`, replica `out_of_sync`, …) is deferred. _(Resolves BRD Q-F7.)_
- **E2 — No Neutron/share-network name-resolution; IDs only + ID-based deep-links.** A share's `share_network_id` / `snapshot_id` / `share_group_id`, a snapshot's `share_id`, and a share-network subnet's `neutron_net_id` / `neutron_subnet_id` are shown as **plain IDs** and rendered as **deep-links** to the target detail route keyed on that ID — **no extra API call** and **no name lookup** (consistent with the Networks `device_id` → router and Volumes snapshot → volume treatment). Each deep-link **degrades gracefully to a plain ID** when the target scope/route or the referenced object is unavailable. _(Copy-to-clipboard follows existing Aurora ID-copy affordances where IDs are shown; no new copy component is built.)_
- **E3 — Status sort order (attention-first).** Shares: `error` / `error_deleting` / `*_error` → transitional (`creating`, `creating_from_snapshot`, `deleting`, `extending`, `shrinking`, `migrating`, `reverting`, `manage_starting`, `backup_*`, …) → `inactive` / `awaiting_transfer` → `available`; unknown strings last. Snapshots: `error` / `error_deleting` → transitional (`creating`, `deleting`, `restoring`, `migrating`, `manage_starting`) → `available`. Replicas sort by `replica_state` attention-first: `error` → `out_of_sync` → `in_sync` → `active`. The sort-direction toggle flips it.
- **E4 — tRPC namespace `sharedFileSystem.*`**, procedures `listShares`, `getShareById`, `getShareExportLocations`, `listSnapshots` (accepts `{ shareId }`), `getSnapshotById`, `listReplicas` (accepts `{ shareId }`), `listShareNetworks`, `getShareNetworkById`, `listSecurityServices` (accepts optional `{ shareNetworkId }`), `getSecurityServiceById`, plus a permission router. Follow the **Networks / Volumes** nested-namespace convention — a single `sharedFileSystem` server router grouping all resources — because they live in one scope. Server resource objects in `server/SharedFileSystem/routers/{shareRouter,snapshotRouter,replicaRouter,shareNetworkRouter,securityServiceRouter,permissionRouter}.ts`; types in `server/SharedFileSystem/types/`; error handlers / helpers in `server/SharedFileSystem/helpers/`; registered as `buildSharedFileSystemRouters(policyDir)` in `server/routers.ts` within `buildBaseRouter()`, mirroring `buildNetworkRouters` / `buildVolumeRouters`. _(Confirm the exact Manila list endpoints at build: `GET /shares/detail`, `GET /shares/{id}/export_locations`, `GET /snapshots/detail?share_id=`, `GET /share-replicas/detail?share_id=`, `GET /share-networks/detail`, `GET /security-services/detail[?share_network_id=]`.)_
- **E5 — No pagination in phase 1.** All three lists render all rows; search / sort / filter are entirely client-side over the single list response. None of the sibling list views paginate consistently, and project-scoped share/share-network/security-service counts are typically small. Revisit only if real projects show large counts.
- **E6 — Enumerated filters.** Share Status, Protocol, Share type, Availability Zone and Visibility (public/private) filter `Select`s offer the known Manila values (E3 lists) plus a graceful "other" bucket for free-string facets; Security Service Type offers `ldap` / `kerberos` / `active_directory` + "other". Options for Share type / AZ are derived from the distinct values present in the response. Leaving a filter unselected means "any" (no pill, no filtering).
- **E7 — Three-tab scope; snapshots & replicas are nested on the share detail; export locations and security services are nested too.** Shares, Share Networks and Security Services are three peer tabs in one scope (UX decision 4). They are **not** separate nav entries. **Snapshots and replicas are not tabs** — the share detail shows a read-only **"Snapshots of this share"** section (backed by `GET /snapshots/detail?share_id=<id>` — server-side filter) and, when the microversion supports it, a **"Replicas of this share"** section (`GET /share-replicas/detail?share_id=<id>`). The **share-network detail** nests a subnets sub-table and an associated-security-services list (`GET /security-services/detail?share_network_id=<id>`). The **share detail** nests an export-locations list (`GET /shares/{id}/export_locations`, sub-resource since v2.9). There is a dedicated **share-snapshot detail route**; replicas get **no** detail route in phase 1 (shown only in the nested list).
- **E8 — Microversion handling.** The server sets `X-OpenStack-Manila-API-Version` to a known/high microversion and parses responses **tolerantly**, degrading per field when a value is absent. Specific gates: **replicas** require ≥ 2.11 (`has_replicas` + `replica_state`); the **multi-subnet share-network model** (`share_network_subnets`) is ≥ 2.51 (on older microversions the Neutron fields live directly on the share-network object — read both shapes); **export locations as a sub-resource** is ≥ 2.9; **`share_type_name`** is ≥ 2.6. The replicas section is **omitted entirely** when the microversion is < 2.11 (not rendered as an error or empty). _(Confirm the deployment's max supported microversion at build — O6.)_

## Epic index

| Sub-issue | Title                                                             |   In MVP?   | Blocked by |
| --------- | ----------------------------------------------------------------- | :---------: | ---------- |
| 1         | API & environment gate                                            |   prereq    | —          |
| 2         | Scope scaffold, tab shell, routing, nav & auth                    |   ✅ MVP    | 1          |
| 3         | Shares tab — list project shares                                  |   ✅ MVP    | 1, 2       |
| 4         | Share detail — metadata + export locations + snapshots + replicas |   ✅ MVP    | 3          |
| 5         | Share-snapshot detail — metadata + source share                   |   ✅ MVP    | 4          |
| 6         | Share Networks tab — list + detail (subnets, Neutron, sec-svc)    | fast-follow | 2          |
| 7         | Security Services tab — list + detail                             | fast-follow | 2          |
| 8         | Cross-scope deep-links (share network · Neutron · share)          | fast-follow | 4, 5, 6, 7 |

## Dependency graph

```
1  API & environment gate
└─ 2  Scope scaffold, tab shell, routing, nav & auth
   ├─ 3  Shares tab — list shares ─────────────────── (MVP releasable: 2 + 3 + 4 + 5)
   │  └─ 4  Share detail — metadata + export locations + nested snapshots + replicas
   │     └─ 5  Share-snapshot detail — metadata + source share
   ├─ 6  Share Networks tab — list + detail (subnets, Neutron mapping, security services)
   └─ 7  Security Services tab — list + detail
         └─ 8  Cross-scope deep-links (needs 4 + 5 + 6 + 7)
```

Critical path to MVP: **1 → 2 → 3 → 4 → 5** (the tab shell lands in 2). Fast-follow extends **2 → 6**, **2 → 7**, then **8** (which needs 4, 5, 6, 7). The three tabs (3, 6, 7) are independent of each other once the scaffold + tab shell (2) exists. Deep-links (8) are layered on top of the detail views once they exist.

---

# Epic — Shared File System Storage (read-only) scope

Give Aurora project members a read-only view of their project's Manila shares, their snapshots and replicas, their share networks, and their security services — in context, no CLI.

## 1 — API & environment gate

**What to build:** Nothing to code — a tracking/verification sub-issue that the backing API and dev environment are ready, so every downstream sub-issue has a clear green light.
**Blocked by:** None (can start immediately) · **Status:** ready-for-agent

**Checklist**

- [x] Confirm OpenStack **Manila (shared file system) v2** is reachable via the Keystone service catalog **in the target region(s)** — confirmed in **qa-de-1**. Catalog registration: **type `sharev2`, name `manilav2`** (drives the nav gate — O3 resolved). Public endpoint: `https://share-3.qa-de-1.cloud.sap/v2`; internal: `http://manila-api.monsoon3.svc.kubernetes.qa-de-1.cloud.sap:8786/v2`.
- [ ] Record the deployment's **max supported microversion** (`GET /` on the Manila endpoint returns `min_version`/`max_version`); confirm the microversion the BFF should request (E8/O6). This determines whether replicas (≥ 2.11), `share_network_subnets` (≥ 2.51), export-locations sub-resource (≥ 2.9) and `share_type_name` (≥ 2.6) are available.
- [ ] Confirm the list/show endpoints: `GET /shares/detail`, `GET /shares/{id}`, `GET /shares/{id}/export_locations`, `GET /snapshots/detail` (+ `?share_id=`), `GET /snapshots/{id}`, `GET /share-replicas/detail?share_id=`, `GET /share-networks/detail`, `GET /share-networks/{id}`, `GET /security-services/detail` (+ `?share_network_id=`), `GET /security-services/{id}` (all project-scoped). Dev/QA: use project **cc-demo** in region **qa-de-1** (UI team already has access — no special credentials needed).
  - [ ] **Note — server-side filters:** `GET /snapshots/detail?share_id=`, `GET /share-replicas/detail?share_id=` and `GET /security-services/detail?share_network_id=` are the documented, supported ways to scope the nested sections to a parent object (confirm each returns `200` for a non-admin project member at build).
- [ ] Confirm the test project contains the data shapes every view must render, or seed / fall back to realistic mock data for any missing shape:
  - [ ] a share in `available` with non-empty **export locations** and **metadata**
  - [ ] a share created **from a snapshot** (non-null `snapshot_id`) and a share with a non-null `share_network_id`
  - [ ] a share with at least one **snapshot** and (if the microversion supports it) a share with `has_replicas = true` and at least one **replica** (with varied `replica_state`)
  - [ ] a share / snapshot in a **transitional or error** state (to exercise status rendering + attention-first sort)
  - [ ] a **share network** with ≥ 1 subnet carrying `neutron_net_id` / `neutron_subnet_id` — ideally mapping to a network visible in the Networks scope (to exercise the deep-link)
  - [ ] a **security service** of each `type` (`ldap`, `kerberos`, `active_directory`), associated with a share network
- [ ] Note: Manila response shapes are well-known and stable (additive microversions), so UI implementation may begin against mock data regardless of seed status.

**BRD Reference** — API §7 (Details, Catalog Registration) · Microversion Appendix (Q-F8).

---

## 2 — Scope scaffold, tab shell, routing, nav & auth wiring

**What to build:** The net-new `shared-file-system` scope — the route tree, the **Shares · Share Networks · Security Services tab shell**, the server-side tRPC router (with the Manila microversion header), the nav entry, the catalog guard — so that an (initially empty) Shares page renders with all three tabs, is reachable from navigation, and can call Manila through the BFF. This is the foundation every story sub-issue builds on. Net-new on both tiers (reference the Volumes and Networks scopes). **In MVP.**
**Blocked by:** 1 · **Status:** ready-for-agent

**Acceptance Criteria**

- [ ] A new route tree exists under `…/projects/$projectId/shared-file-system/` — Shares-tab list route `shared-file-system/index.tsx`, share detail `shared-file-system/$shareId/index.tsx` (**directory form**), share-snapshot detail `shared-file-system/snapshots/$snapshotId.tsx` (single-file form), Share-Networks-tab list route `shared-file-system/share-networks/index.tsx`, share-network detail `shared-file-system/share-networks/$shareNetworkId/index.tsx` (**directory form**), Security-Services-tab list route `shared-file-system/security-services/index.tsx`, security-service detail `shared-file-system/security-services/$securityServiceId.tsx` (single-file form) — following the file-based routing used by the sibling resources.
- [ ] A **tab shell** (`TabNavigation` with `TabNavigationItem`s **Shares**, **Share Networks**, **Security Services**) wraps the three list routes; the Shares tab is the default. Each tab hosts its own list (sub-issues 3, 6, 7); opening a row navigates to the resource's full detail route (not nested in the tab). Tab prior art: the Volumes scope's Volumes · Snapshots tabs (E7).
- [ ] A per-scope catalog guard (`shared-file-system.tsx` layout with a `beforeLoad`) that redirects to the project landing page when the Manila service is absent from the catalog. Use the gate that matches the deployment's catalog registration — either `serviceIndex["sharev2"]?.["manilav2"]` (exact `[type][name]`) or `hasServiceByName(serviceIndex, "manila"|"manilav2")` (name-only). **This gate is load-bearing** — Manila is often absent. _(Open item O3.)_
- [ ] A server-side tRPC router is registered as `buildSharedFileSystemRouters(policyDir)` → `sharedFileSystem: auroraRouter({ ... })` in `server/SharedFileSystem/routers/index.ts`, pulled into `buildBaseRouter()` via `server/routers.ts` (mirroring `buildNetworkRouters` / `buildVolumeRouters`). All procedures use `projectScopedProcedure` so the server injects `X-Auth-Token` via `signal-openstack` and the browser never holds the token. The server also sets the **`X-OpenStack-Manila-API-Version`** microversion header (E8). Server service handle: `ctx.openstack?.service("<manila-type>")`.
- [ ] A **Shared File System** navigation entry is added in `buildNavSections.ts` (a single entry opening the scope on its default Shares tab). Add it either as a new top-level section (seeded in the `sectionMap`) or within a storage grouping — kept **separate from** the existing block-storage (Volumes) and object-storage (Swift/Ceph) entries. Add a matching service card on the project landing page `projects/$projectId/index.tsx`.
- [ ] A user without the Manila read capability for the active project does not see the nav entry; a user who reaches the route without the capability sees the standard unauthorized state (not a crash/blank page). Add a permission router following the sibling `permissionRouter.ts` pattern. _(Residual open item O4: confirm the exact Manila policy keys at build.)_

**Aurora / Juno implementation notes**

- Pattern A built-in scope — reference the **Volumes** scope end-to-end (multi-resource tab shell, net-new server router `Volume/routers/index.ts` `buildVolumeRouters`) and the **Networks** scope (nested list-in-detail, directory-form detail `floatingips/$floatingIpId/index.tsx`).
- Tab shell: `TabNavigation` / `TabNavigationItem` from Juno, driving the active tab from the route (Shares = `shared-file-system/`, Share Networks = `…/share-networks/`, Security Services = `…/security-services/`).
- tRPC namespace: **`sharedFileSystem`** with the procedures listed in E4.
- Route/URL state (search/sort/filter) via TanStack Router search params, Zod-validated.
- **Microversion:** set `X-OpenStack-Manila-API-Version` on every Manila call in the BFF (E8).

**BRD Reference** — Target Surface §3 · API §7 (Auth Mode, Catalog Registration, Discovery) · Auth §8 · Appendix (Framework Notes).

---

## 3 — Shares tab — list project shares

**What to build:** The Shares tab's list — a DataGrid of the current project's shares with the confirmed composed 3-zone toolbar, clickable rows that open the detail route, and per-row status. Fully handles its own loading / empty / error / unauthorized states.
**Blocked by:** 1, 2 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see a list of the file shares in my project, so that I can get an overview of my project's shared file storage at a glance.

**Acceptance Criteria** (from BRD §5.1 Story 1)

- [ ] Lists all shares in the current project in the **Shares tab** (default tab). Columns appear in this order: **Name/ID · Protocol · Size · Share type · Availability Zone · Visibility · Share network · Created · Status · ⋮ (menu)**. Each row shows:
  - [ ] **Name** — ID beneath the name
  - [ ] **Protocol** (`share_proto`)
  - [ ] **Size (GiB)**
  - [ ] **Share type** — `share_type_name` when present, else the `share_type` UUID
  - [ ] **Availability Zone**
  - [ ] **Visibility** — Public / Private (`is_public`)
  - [ ] **Share network** — `share_network_id` when set; `- -` when unset. **Plain ID only in the list — no name resolution (E2) and no deep-link; the share-network deep-link lives in the share detail (sub-issue 4)**
  - [ ] **Created** timestamp
  - [ ] **Status** — visible status indicator tolerating any Manila string (see E3 list)
  - [ ] a **row overflow menu** with a single **"View details"** item (phase-1 extension point)
- [ ] The whole row is clickable and navigates to the share detail route; nested interactive elements call `event.stopPropagation()`
- [ ] **Searchable** by name and ID
- [ ] **Sortable** by name, status, size, and created. Status sorts attention-first per E3, flipped by the direction toggle
- [ ] **Filterable** by status, protocol, share type, availability zone, and visibility (E6), with active-filter pills + "clear all"
- [ ] Description, metadata, export locations, snapshots, replicas, `snapshot_id`, `share_group_id`, and capability flags are **not** shown in the list — they live in the detail view
- [ ] **No pagination** (E5): all rows render; search/sort/filter are client-side over the single `sharedFileSystem.listShares` response
- [ ] **States:** DataGrid-scoped loading indicator; a friendly empty state ("No shares in this project") distinct from a filtered-empty state ("No shares match your filters"); a DataGrid-scoped error state with a **retry** affordance on backend/5xx/timeout; the standard unauthorized state on 403

**Aurora / Juno implementation notes**

- Build the 3-zone header by composing `DataGridToolbar` + `SearchInput` + `ListToolbar/SortInput` / `FiltersInput` / `SelectedFilters` — copy the structure of the volumes list / `network/routers/-components/RoutersList.tsx`.
- All search/sort/filter are **client-side** over the single `sharedFileSystem.listShares` response (`GET /shares/detail`) — no extra API calls, no server-side query params in phase 1.
- **Refresh:** none (E1). Zone 3 shows count + last-updated (`dataUpdatedAt`, relative); no refresh button.
- Default empty-cell placeholder `- -`; for the Name column, if a share has no name show its ID (per `datagrid.md` writing rules).

**BRD Reference** — Story §5.1 Story 1 · Error/empty states §7 · Auth §8.

---

## 4 — Share detail — metadata + export locations + nested snapshots + nested replicas (full route page)

**What to build:** The share detail route — a full page (directory form) with a metadata section (description list), a read-only **export locations** list, a read-only **"Snapshots of this share"** list, and a microversion-gated **"Replicas of this share"** list, plus the share-network deep-link. Each nested section handles its own load/error/empty state; a failure in one does not blank the rest of the page.
**Blocked by:** 3 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to open a share and see all its metadata, where it is exported, and its related objects, so that I can understand its configuration, how to mount it, and what depends on it.

**Acceptance Criteria** (from BRD §5.1 Story 2 & Story 3)

- [ ] Full route page at `…/shared-file-system/$shareId` (directory form), reachable by clicking a list row and directly via URL
- [ ] **Metadata section** (description list) shows all list fields plus: Name, ID, Status, Size (GiB), Protocol, Share type (name + UUID), Availability Zone, Visibility, Description, Metadata (key/value pairs), Created / Updated timestamps, and capability flags (`snapshot_support`, `create_share_from_snapshot_support`, `revert_to_snapshot_support`, `mount_snapshot_support`, `replication_type`, `has_replicas`) when present
- [ ] **Export locations** section: for each export location show the export `path` and the `preferred` flag; empty → explicit empty state ("No export locations"). Backed by `sharedFileSystem.getShareExportLocations` (`GET /shares/{id}/export_locations`, sub-resource since v2.9 — E8)
- [ ] **Share-network deep-link:** `share_network_id` renders as a deep-link to the share-network detail (`…/shared-file-system/share-networks/$shareNetworkId`), degrading to the plain ID; `snapshot_id` renders as a deep-link to the share-snapshot detail; `share_group_id` renders as a plain ID
- [ ] **Snapshots of this share** section/sub-table: Name/ID, Status, Size, Created — each row deep-links to the share-snapshot detail (sub-issue 5); empty → "No snapshots for this share". Backed by `sharedFileSystem.listSnapshots({ shareId })` (`GET /snapshots/detail?share_id=<id>` — server-side filter)
- [ ] **Replicas of this share** section (microversion ≥ 2.11 **and** `has_replicas = true` only): ID, Replica state (`active`/`in_sync`/`out_of_sync`/`error`), Status, Availability Zone, Created; empty → "No replicas for this share"; **section omitted entirely** when the microversion does not support replicas (E8). Backed by `sharedFileSystem.listReplicas({ shareId })` (`GET /share-replicas/detail?share_id=<id>`)
- [ ] Description and metadata shown when present; absent → explicit `- -` (not omitted)
- [ ] Access rules, share-server/host admin fields, block-storage and object-storage content are **not** shown here
- [ ] **States:** page-scoped loading (Spinner) while the share loads; a scoped error state with retry on failure; standard unauthorized state on 403; each nested section (export locations, snapshots, replicas) scopes its own fetch failure to an inline error + retry and does not blank the rest of the detail

**Aurora / Juno implementation notes**

- **Data source:** `sharedFileSystem.getShareById` (`projectScopedProcedure`); for the MVP it is acceptable to select from the already-fetched `listShares` cache when navigating from the list, but support a standalone fetch for direct-link/refresh.
- **Nested sections** each use their own scoped procedure (export locations, snapshots, replicas) — a bounded handful of calls per detail open, not a per-row fan-out (BRD §7).
- **Replicas microversion gate (E8):** only mount the replicas query when the negotiated microversion ≥ 2.11 and `has_replicas` is true; otherwise omit the section. The server should expose the negotiated microversion (or a boolean capability) so the client can decide.
- Detail layout: follow the `floatingips` directory-form detail (`$floatingIpId/index.tsx` + `-components/`) with a description list + nested tables.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 2 & Story 3 · API §7 · Auth §8.

---

## 5 — Share-snapshot detail — metadata + source share

**What to build:** The share-snapshot detail route — a full page (single-file form) showing the snapshot's metadata and its source `share_id`. Handles its own load/error/unauthorized states.
**Blocked by:** 4 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to open a share snapshot and see its metadata and its source share, so that I can understand what it captured and where it came from.

**Acceptance Criteria** (from BRD §5.1 Story 3)

- [ ] Full route page at `…/shared-file-system/snapshots/$snapshotId` (single-file form), reachable by clicking a snapshot row in the share detail and directly via URL
- [ ] **Metadata section** shows: Name, ID, Status, Size (GiB), Protocol (`share_proto`), Description, Created timestamp, and the source **share** `share_id`
- [ ] The source `share_id` is rendered as an **ID-based deep-link** to the share detail (`…/shared-file-system/$shareId`), degrading gracefully to the ID
- [ ] Description shown when present; absent → explicit `- -`
- [ ] **States:** page-scoped loading; scoped error state with retry; unauthorized state on 403

**Aurora / Juno implementation notes**

- **Data source:** `sharedFileSystem.getSnapshotById` (`projectScopedProcedure`); may select from the `listSnapshots` cache when navigating from the share detail, with a standalone fetch for direct-link/refresh.
- Detail layout: follow the single-file `routers` / `flavors` detail form.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 3 (share-snapshot detail) · API §7 · Auth §8.

---

## 6 — Share Networks tab — list + detail (subnets, Neutron mapping, security services)

**What to build:** The Share Networks tab — a DataGrid list (peer tab, sharing the sub-issue-2 tab shell) plus a directory-form detail page that nests a subnets sub-table (with the Neutron mapping) and an associated-security-services list. Handles its own loading / empty / error / unauthorized states.
**Blocked by:** 2 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see my project's share networks and, for each, its subnets, the Neutron networks they map to, and its security services, so that I can understand how my shares reach the tenant network and how access is secured.

**Acceptance Criteria** (from BRD §5.1 Story 4 & Story 5)

- [ ] **List** in the **Share Networks tab** at `…/shared-file-system/share-networks`. Columns: **Name/ID · Subnet count · Created · ⋮**. Name shows ID beneath; overflow menu has a single "View details".
- [ ] List is **searchable** (name, ID), **sortable** (name, subnet count, created), **not paginated** (E5); client-side.
- [ ] **Detail** (full route page, directory form) at `…/shared-file-system/share-networks/$shareNetworkId` shows: Name, ID, Description, Created / Updated timestamps.
- [ ] **Subnets sub-table:** for each subnet (from `share_network_subnets`, ≥ v2.51; on older microversions read the fields off the share-network object — E8) show Subnet ID, Availability Zone, CIDR, IP version, Gateway, Network type, MTU, Segmentation ID, `neutron_net_id`, `neutron_subnet_id`; empty → "No subnets".
- [ ] **Neutron deep-link (E2):** each subnet's `neutron_net_id` links to the Networks scope network detail (`/projects/$projectId/network/networks/$networkId` — **confirm target route at build, O2**), degrading to the plain ID when the Networks scope is absent. `neutron_subnet_id` is a plain ID (no standalone Neutron subnet route).
- [ ] **Associated security services:** a read-only linked list from `sharedFileSystem.listSecurityServices({ shareNetworkId })` (`GET /security-services/detail?share_network_id=<id>`) — Name, Type, deep-link to the security-service detail (sub-issue 7); empty → "No security services".
- [ ] **States:** list and detail each handle DataGrid/page-scoped loading, friendly vs filtered-empty, scoped error + retry, unauthorized on 403; nested sub-table/section failures are scoped and do not blank the detail.

**Aurora / Juno implementation notes**

- List toolbar composition identical to sub-issue 3 (no filter facets — Zone 2 is `SearchInput` + pills only).
- Detail layout: `floatingips` directory-form detail (description list + nested tables).
- `listShareNetworks` (`GET /share-networks/detail`), one call for the list; the detail adds the scoped security-services call. Subnet data is already inline on the share-network object (`share_network_subnets`), so no extra subnet call is needed in phase 1.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 4 & Story 5 · API §7 · Auth §8.

---

## 7 — Security Services tab — list + detail

**What to build:** The Security Services tab — a DataGrid list (peer tab) plus a single-file detail page showing the LDAP/AD/Kerberos configuration (never the password). Handles its own loading / empty / error / unauthorized states.
**Blocked by:** 2 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see my project's security services and open each for its configuration, so that I can understand how access to my shares is authenticated.

**Acceptance Criteria** (from BRD §5.1 Story 6 & Story 7)

- [ ] **List** in the **Security Services tab** at `…/shared-file-system/security-services`. Columns: **Name/ID · Type · Status · DNS IP · Server · Created · ⋮**. Name shows ID beneath; Type tolerates any string; overflow menu has a single "View details".
- [ ] List is **searchable** (name, ID), **sortable** (name, type, created), **filterable** by type (E6), **not paginated** (E5); client-side.
- [ ] **Detail** (full route page, single-file form) at `…/shared-file-system/security-services/$securityServiceId` shows: Name, ID, Type, Status, DNS IP (`dns_ip`), Server (`server`), Domain (`domain`), User (`user`), Organizational unit (`ou`, when present), Description, Created / Updated timestamps.
- [ ] The **`password` field is never shown** — omitted entirely (not rendered as `- -`).
- [ ] Optional absent fields render `- -`.
- [ ] **States:** list and detail each handle loading, friendly vs filtered-empty, scoped error + retry, unauthorized on 403.

**Aurora / Juno implementation notes**

- List toolbar composition identical to sub-issue 3 (Type filter `Select` in Zone 2).
- `listSecurityServices` (`GET /security-services/detail`) for the list; `getSecurityServiceById` for the detail.
- **Security:** ensure the `password` field is dropped at the server (BFF) layer, not merely hidden client-side.
- Detail layout: single-file `routers` / `flavors` form.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 6 & Story 7 · API §7 · Auth §8.

---

## 8 — Cross-scope deep-links (share network · Neutron · share)

**What to build:** Upgrade the ID cells across the share, share-snapshot and share-network detail views so related resources link straight to their detail pages — ID-based, no extra API call, degrading gracefully when the target scope/object is absent. One link family across several places:
(a) share `share_network_id` → **Share Network** detail (this scope);
(b) share `snapshot_id` → **Share-snapshot** detail (this scope);
(c) share-snapshot `share_id` → **Share** detail (this scope);
(d) share-network subnet `neutron_net_id` → **Network** detail (Networks scope);
(e) share-network → **Security Service** detail (this scope).
**Blocked by:** 4, 5, 6, 7 · **Status:** ready-for-agent

**User story:** (extends Stories 2, 3, 5) As a Project Member (Viewer), I want related IDs to link to their detail pages, so that I can jump between a share, its share network, its snapshots, the Neutron network it reaches, and the security services that protect it.

**Acceptance Criteria** (from BRD §5.1 — deep-link exceptions)

- [ ] **Share → share network:** the share detail's `share_network_id` links to `…/shared-file-system/share-networks/$shareNetworkId`
- [ ] **Share → snapshot / snapshot → share:** the share detail's `snapshot_id` links to the share-snapshot detail; the share-snapshot detail's `share_id` links back to the share detail
- [ ] **Share-network subnet → Neutron network:** the subnet's `neutron_net_id` links to the Networks scope network detail (**confirm route at build — O2**); `neutron_subnet_id` stays a plain ID
- [ ] **Share network → security service:** each associated security service links to its security-service detail
- [ ] Every deep-link requires only route construction — **no extra API call** and **no name resolution** (link text is the ID; the target's name is shown once the user lands on the target detail page)
- [ ] If the **target scope/route or referenced object is unavailable** (e.g. the Networks scope is absent, or a `share_network_id` does not resolve), the link **degrades gracefully to showing just the ID** (plain text, no broken link)

**Aurora / Juno implementation notes**

- Model this on the Networks scope's port → router deep-link and the Volumes scope's snapshot → volume deep-link: ID-based route construction, catalog-gated graceful degradation, no data/code coupling — a navigation-only soft dependency.
- Gate the Neutron link on both the `network` catalog entry and the Networks detail route being implemented and enabled in the deployed Aurora build; otherwise render the plain ID. Apply the same target-route availability check to intra-scope links rather than assuming every detail view has shipped.

**BRD Reference** — Story §5.1 Story 2 (share-network deep-link) · Story 3 (snapshot ↔ share) · Story 5 (Neutron + security-service) · Out-of-Scope §4 (no name resolution) · Dependencies §8 (soft dependency on Networks scope).

---

## Open items roll-up

**Resolved during planning:**

- ~~**Resource placement**~~ → **resolved E7:** one Shared File System scope with **three peer tabs (Shares · Share Networks · Security Services)**; **snapshots and replicas are nested** inside the share detail (not tabs), export locations are nested on the share detail, and security services are nested on the share-network detail. A dedicated share-snapshot detail route exists; replicas have no detail route in phase 1.
- ~~**Refresh mechanism**~~ → **resolved E1:** no refresh in phase 1 (no `refetchInterval`, no SSE, no manual button).
- ~~**Name resolution**~~ → **resolved E2:** IDs only; ID-based deep-links with graceful degradation; no Neutron/Manila name lookups.
- ~~**tRPC namespace**~~ → **resolved E4:** `sharedFileSystem.*` grouping all resources (Networks/Volumes convention).
- ~~**Snapshots/replicas scoping**~~ → **resolved E7/E8:** scoped server-side via `?share_id=`; replicas gated on microversion ≥ 2.11 + `has_replicas`.

**Residual (resolve before/at build):**

- **O1 — Dev data shapes (sub-issue 1):** confirm the test project holds the shapes listed in sub-issue 1 — else seed or mock.
- **O2 — Networks scope route shape (sub-issues 6, 8):** confirm the deep-link target for a Neutron network detail (`/projects/$projectId/network/networks/$networkId`) against the read-only Networks scope route when it lands.
- **O3 — Manila catalog registration + presence (sub-issues 1, 2):** ✅ **Resolved.** Manila is deployed in **qa-de-1**. Catalog type: **`sharev2`**, name: **`manilav2`** — confirmed from the live catalog. Use `serviceIndex["sharev2"]?.["manilav2"]` as the nav gate (load-bearing — Manila is absent in most other regions).
- **O4 — Permission policy keys (sub-issue 2):** confirm the exact Manila policy keys for list/show of shares, snapshots, replicas, share networks and security services (e.g. `share:get_all` / `share:get`, `share_snapshot:get_all`, `share_replica:get_all`, `share_network:get_all`, `security_service:get_all`) that gate the nav entry and the unauthorized state.
- **O5 — Password handling (sub-issue 7):** confirm the security-service `password` field is stripped at the BFF layer (server), never sent to the browser.
- **O6 — Microversion (sub-issues 1, 2, 4, 6):** confirm the deployment's max supported Manila microversion and the microversion the BFF requests via `X-OpenStack-Manila-API-Version`. This gates replicas (≥ 2.11), `share_network_subnets` (≥ 2.51), export-locations sub-resource (≥ 2.9), and `share_type_name` (≥ 2.6). The UI must read both the old and new share-network subnet shapes (E8) and omit the replicas section when unsupported.
- **Non-blocking BRD deferrals (not required for build):** rollout strategy & go-live comms (Q-N1), Aurora core-team sign-off for a new built-in scope (Q-N2), Document Control submitter/target quarter (Q-N4). Carried from the BRD; none block engineering.

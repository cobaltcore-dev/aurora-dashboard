# Epic: Volumes & Snapshots (read-only) scope

Source BRD: [volumes-readonly-brd.md](volumes-readonly-brd.md)
Target surface: Aurora Dashboard — built-in scope (**Pattern A**: file-based TanStack Router routes under `$projectId/volumes/`, server tRPC router registered via `buildBaseRouter()`, nav section/entry in `buildNavSections.ts`)
Development context (source of truth): `.claude/context/aurora-dashboard.md`, `.claude/context/juno.md`
Status: ready-for-engineering

> **Scope framing (BRD §6).** Phase 1 is strictly **read-only** — no create/extend/attach/detach/delete and no snapshot-create/restore; mutation is a separate later phase. The scope is presented as **two tabs — Volumes · Snapshots** (E7). The MVP is the **tab shell + Volumes tab (list) + volume detail (metadata + attachments)** (sub-issues 2–4). The **Snapshots tab (list) + snapshot detail** and the **ID-based deep-links** (sub-issues 5–7) are fast-follow within the same phase — headline functionality, sequenced immediately after the volume MVP but not blocking first release. Status/empty/error/loading state handling is **folded into each sub-issue** where it applies rather than tracked separately. **There is no data-refresh mechanism in phase 1** (see Engineering decision E1).

> **Net-new on both tiers.** Unlike the Instances scope (where the server procedure already existed), **nothing Cinder-related exists in the codebase today** — no client route, no server router, no types. The closest precedent is the **Networks** scope, which was also net-new and which also uses ID-based cross-scope deep-links (port → router). Reference `Network/` for the server layout and the network `routers` / `floatingips` resources for the client layout.

## Confirmed UX / component decisions (grounded in Juno UX docs + sibling implementations)

These must be used **verbatim** by implementers. The reference list views are the network `routers` and `floatingips` views, which compose Juno primitives rather than the monolithic `ListToolbar` wrapper:

1. **List toolbar — composed 3-zone DataGrid header** built from `DataGridToolbar` + `SearchInput` (`@cloudoperators/juno-ui-components`) plus the shared `ListToolbar/{SortInput,FiltersInput,SelectedFilters}` sub-components (`client/components/ListToolbar/`), exactly as `network/routers/-components/RoutersList.tsx` does. Both the volumes list and the snapshots list use the same composition:
   - **Volumes — Zone 1:** sort `Select` (Name / Status / Size / Created) + direction toggle. **Zone 2:** `SearchInput` (placeholder: matches Name and ID) + filter `Select`s for Status, Volume type, Bootable, Availability Zone + active-filter pills with "clear all". **Zone 3:** item count + last-updated timestamp. **No refresh button** (E1).
   - **Snapshots — Zone 1:** sort `Select` (Name / Status / Size / Created) + direction toggle. **Zone 2:** `SearchInput` + a Status filter `Select` + pills. **Zone 3:** count + last-updated.
2. **Row navigation — clickable row + scaffolded overflow menu.** The whole row is clickable to open the detail route (`datagrid.md`); nested interactive elements (ID copy, overflow menu, deep-links) call `event.stopPropagation()`. The last column keeps an overflow menu (`⋮`) holding a single **"View details"** item in phase 1 — the extension point for future mutation actions and to reserve the column `min-width` now. (Conscious divergence from `popup-and-overflow-menus.md`, same decision as the Networks / Instances scopes.)
3. **Detail presentation — full route pages.** Volume detail at `…/projects/$projectId/volumes/$volumeId` and snapshot detail at `…/projects/$projectId/volumes/snapshots/$snapshotId`, each a full page. Because the volume detail has a nested attachments sub-table + components, implement the volume detail in the **directory route form** (`volumes/$volumeId/index.tsx` with a co-located `volumes/$volumeId/-components/` subtree), matching the `floatingips` resource. The snapshot detail is simpler and may use the single-file form (`volumes/snapshots/$snapshotId.tsx`), matching `routers`/`flavors`.
4. **Scope tab shell — Volumes · Snapshots (E7).** The scope renders a `TabNavigation` with two peer tabs: **Volumes** (default, list at `…/volumes`) and **Snapshots** (list at `…/volumes/snapshots`). Each tab hosts its own full DataGrid list; opening a row navigates to that resource's detail route (the detail pages are full route pages, not nested inside the tab). Tab prior art: the network `securitygroups` detail `TabNavigation` / `TabNavigationItem` usage. The tab shell is part of the MVP (sub-issue 2) so the Snapshots tab is a drop-in fast-follow rather than a re-layout.

## Confirmed engineering decisions

Grounded in the current Aurora codebase (`Network/` server layout; `floatingips` / `routers` client resources as reference implementations):

- **E1 — No refresh mechanism in phase 1.** No `refetchInterval` auto-poll, no SSE subscription, and no manual refresh button. Rationale identical to the Networks/Instances scopes: `refetchInterval` is unused anywhere in Aurora; the only real-time pattern (tRPC-over-SSE) is purpose-built for upload/download progress and does not watch OpenStack resource state; and a manual refresh button is not an established pattern in the sibling list/detail views. Data loads on route navigation / component mount. The Zone-3 **last-updated timestamp is retained**, fed from the query's `dataUpdatedAt` and rendered relative. Refresh of transitional states (`creating`, `attaching`, `restoring`, …) is deferred. _(Resolves BRD Q-F7.)_
- **E2 — No instance/volume name-resolution; IDs only + ID-based deep-links.** A volume's `attachments[].server_id`, a snapshot's `volume_id`, and a volume's `snapshot_id` / `source_volid` are shown as **plain IDs** and rendered as **deep-links** to the target detail route keyed on that ID — **no extra API call** and **no name lookup** (consistent with the Networks `device_id` → router treatment). Each deep-link **degrades gracefully to a plain ID** when the target scope/route is unavailable in the catalog. _(Copy-to-clipboard is out of scope for now; no ID-copy affordance is required.)_
- **E3 — Status sort order (attention-first).** Volumes: `error` / `error_deleting` → transitional (`creating`, `deleting`, `attaching`, `detaching`, `extending`, `backing-up`, `restoring-backup`, `maintenance`) → `reserved` → `in-use` → `available`; unknown strings last. Snapshots: `error` / `error_deleting` → transitional (`creating`, `deleting`, `restoring`) → `available`. The sort-direction toggle flips it.
- **E4 — tRPC namespace `volume.*`**, procedures `listVolumes`, `getVolumeById`, `listSnapshots`, `getSnapshotById`, plus a permission router. Follow the **Networks** nested-namespace convention (`network.routers`, `network.ports`) — a single `volume` server router grouping volumes and snapshots — because both resources live in one scope. Server resource objects in `server/Volume/routers/{volumeRouter,snapshotRouter,permissionRouter}.ts`; types in `server/Volume/types/{volume,snapshot}.ts`; error handlers / helpers in `server/Volume/helpers/`; registered as `buildVolumeRouters(policyDir)` in `server/routers.ts` within `buildBaseRouter()`, mirroring `buildNetworkRouters`. _(Confirm the exact Cinder list endpoints at build: `GET /volumes/detail`, `GET /snapshots/detail`.)_
- **E5 — No pagination in phase 1.** Both lists render all rows; search / sort / filter are entirely client-side over the single list response. None of the sibling network list views paginate consistently, and project-scoped volume/snapshot counts are typically small. Revisit only if real projects show large counts.
- **E6 — Enumerated filters.** Volume Status and Snapshot Status filter `Select`s offer the known Cinder values (E3 lists) plus a graceful "other" bucket; Volume type and Availability Zone options are derived from the distinct values present in the response; Bootable is a boolean true/false `Select`. Leaving a filter unselected means "any" (no pill, no filtering).
- **E7 — Two-tab scope; snapshots are a peer tab, plus a "Snapshots of this volume" section on the volume detail.** Volumes and Snapshots are two peer tabs in one scope (UX decision 4). They are **not** two independent nav entries, and the Snapshots tab lists **all** project snapshots (not scoped to one volume). In addition, the **volume detail** shows a read-only **"Snapshots of this volume"** section, derived by filtering the project snapshot list client-side on `snapshot.volume_id` — exactly what the OpenStack CLI `openstack volume snapshot list --volume <id>` does. There is **no documented server-side `?volume_id` filter** on `GET /snapshots/detail` (see sub-issue 1 note), so this must be derived client-side and must **not** assume a server-side filter. _(Developer confirmation Q-F8: whether this section ships in phase 1 or as fast-follow; it is cheap — reuses `volume.listSnapshots`, no per-volume fan-out — and does not block the volume-detail MVP.)_

## Epic index

| Sub-issue | Title                                          |   In MVP?   | Blocked by |
| --------- | ---------------------------------------------- | :---------: | ---------- |
| 1         | API & environment gate                         |   prereq    | —          |
| 2         | Scope scaffold, tab shell, routing, nav & auth |   ✅ MVP    | 1          |
| 3         | Volumes tab — list project volumes             |   ✅ MVP    | 1, 2       |
| 4         | Volume detail — metadata + attachments         |   ✅ MVP    | 3          |
| 5         | Snapshots tab — list project volume snapshots  | fast-follow | 2          |
| 6         | Snapshot detail — metadata + source volume     | fast-follow | 5          |
| 7         | Cross-scope deep-links (instance / volume)     | fast-follow | 4, 6       |

## Dependency graph

```
1  API & environment gate
└─ 2  Scope scaffold, tab shell, routing, nav & auth
   ├─ 3  Volumes tab — list volumes ──────────────── (MVP releasable: 2 + 3 + 4)
   │  └─ 4  Volume detail — metadata + attachments
   └─ 5  Snapshots tab — list snapshots
      └─ 6  Snapshot detail — metadata + source volume
         └─ 7  Cross-scope deep-links (needs 4 + 6)
```

Critical path to MVP: **1 → 2 → 3 → 4** (the tab shell lands in 2). Fast-follow extends **2 → 5 → 6 → 7** (7 also needs 4). The Volumes tab (3) and Snapshots tab (5) are independent of each other once the scaffold + tab shell (2) exists. Deep-links (7) are layered on top of the volume and snapshot detail views once both exist.

---

# Epic — Volumes & Snapshots (read-only) scope

Give Aurora project members a read-only view of their project's Cinder volumes and volume snapshots — in context, no CLI.

## 1 — API & environment gate

**What to build:** Nothing to code — a tracking/verification sub-issue that the backing API and dev environment are ready, so every downstream sub-issue has a clear green light.
**Blocked by:** None (can start immediately) · **Status:** ready-for-agent

**Checklist**

- [ ] Confirm OpenStack **Cinder (block storage) v3** is reachable via the Keystone service catalog, and record the exact catalog **type** and **name** it registers as (`volumev3`/`cinderv3`, or `block-storage`, or `volume`) — this drives the nav gate (open item O3).
- [ ] Confirm the list endpoints: `GET /volumes/detail` and `GET /snapshots/detail` (both project-scoped list calls).
  - [ ] **Note — snapshots-per-volume:** the Cinder v3 API reference does **not** document a server-side `?volume_id=` query filter on `GET /snapshots/detail` (the documented query params are `all_tenants`, `sort`, `sort_key`, `sort_dir`, `limit`, `offset`, `marker`, `with_count`, `consumes_quota`). Every snapshot object carries a `volume_id` **field** in the response body, so "snapshots of a given volume" must be derived by filtering the project snapshot list client-side on `snapshot.volume_id` — do **not** rely on a server-side `?volume_id` filter (generic attribute filtering is deployment/policy-dependent and can return `400` for non-admins since v3.31). Phase 1 does not need this at all (snapshots are a peer tab listing all project snapshots; volumes and snapshots are linked only by ID deep-links), but record the constraint so a later phase does not assume a server-side filter exists.
- [ ] Confirm the test project contains the data shapes every view must render, or seed / fall back to realistic mock data for any missing shape:
  - [ ] an **attached** volume (`status = in-use`, non-empty `attachments` with a `server_id`) — ideally attached to an instance that exists in the Instances scope (to exercise the deep-link)
  - [ ] an **unattached** `available` volume
  - [ ] a **bootable** volume and an **encrypted** volume
  - [ ] a volume created **from a snapshot** (non-null `snapshot_id`) and/or cloned **from a volume** (`source_volid`)
  - [ ] at least one **snapshot** with a `volume_id` pointing at a volume in the list
  - [ ] a volume / snapshot in a **transitional or error** state (to exercise status rendering + attention-first sort)
- [ ] Note: Cinder response shapes are well-known and stable, so UI implementation may begin against mock data regardless of seed status.

**BRD Reference** — API §7 (Details) · Catalog Registration §7.

---

## 2 — Scope scaffold, tab shell, routing, nav & auth wiring

**What to build:** The net-new `volumes` scope — the route tree, the **Volumes · Snapshots tab shell**, the server-side tRPC router, the nav entry, the catalog guard — so that an (initially empty) Volumes page renders with both tabs, is reachable from navigation, and can call Cinder through the BFF. This is the foundation every story sub-issue builds on. Net-new on both tiers (reference the Networks scope). **In MVP.**
**Blocked by:** 1 · **Status:** ready-for-agent

**Acceptance Criteria**

- [ ] A new route tree exists under `…/projects/$projectId/volumes/` — Volumes-tab list route `volumes/index.tsx`, volume detail `volumes/$volumeId/index.tsx` (**directory form**), Snapshots-tab list route `volumes/snapshots/index.tsx`, snapshot detail `volumes/snapshots/$snapshotId.tsx` (single-file form) — following the file-based routing used by the sibling network resources.
- [ ] A **tab shell** (`TabNavigation` with `TabNavigationItem`s **Volumes** and **Snapshots**) wraps the two list routes; the Volumes tab is the default. Each tab hosts its own list (sub-issues 3 and 5); opening a row navigates to the resource's full detail route (not nested in the tab). Tab prior art: the `securitygroups` detail `TabNavigation` usage (E7).
- [ ] A per-scope catalog guard (`volumes.tsx` layout with a `beforeLoad`) that redirects to the project landing page when the Cinder service is absent from the catalog. Use the gate that matches the deployment's catalog registration — either `serviceIndex["volumev3"]?.["cinderv3"]` (exact `[type][name]`, like compute) or `hasServiceByName(serviceIndex, "cinder"|"cinderv3")` (name-only, like the object-storage nav). _(Open item O3.)_
- [ ] A server-side tRPC router for volumes is registered as `buildVolumeRouters(policyDir)` → `volume: auroraRouter({ ... })` in `server/Volume/routers/index.ts`, pulled into `buildBaseRouter()` via `server/routers.ts` (mirroring `buildNetworkRouters`). All procedures use `projectScopedProcedure` so the server injects `X-Auth-Token` via `signal-openstack` and the browser never holds the token. Server service handle: `ctx.openstack?.service("<cinder-type>")`.
- [ ] A **Volumes** navigation entry is added in `buildNavSections.ts` (a single entry opening the scope on its default Volumes tab). Add it either as a new top-level section (seeded in the `sectionMap`) or within a block-storage grouping — kept **separate from** the existing object-storage `storageServices` entries (Swift/Ceph). Add a matching service card on the project landing page `projects/$projectId/index.tsx`.
- [ ] A user without the Cinder read capability for the active project does not see the nav entry; a user who reaches the route without the capability sees the standard unauthorized state (not a crash/blank page). Add a permission router following the sibling `permissionRouter.ts` pattern. _(Residual open item O4: confirm the exact Cinder policy keys at build.)_

**Aurora / Juno implementation notes**

- Pattern A built-in scope — reference the **Networks** scope end-to-end: client resources `network/routers` (single-file detail) and `network/floatingips` (directory-form detail); server `Network/routers/index.ts` (`buildNetworkRouters` nested namespace), `Network/types/*`, `Network/helpers/*`.
- Tab shell: `TabNavigation` / `TabNavigationItem` from Juno, driving the active tab from the route (Volumes = `volumes/`, Snapshots = `volumes/snapshots/`); reference the `securitygroups` detail tabs.
- tRPC namespace: **`volume`** with procedures `listVolumes`, `getVolumeById`, `listSnapshots`, `getSnapshotById` (E4).
- Route/URL state (search/sort/filter) via TanStack Router search params, Zod-validated.

**BRD Reference** — Target Surface §3 · API §7 (Auth Mode, Catalog Registration, Discovery) · Auth §8 · Appendix (Framework Notes).

---

## 3 — Volumes tab — list project volumes

**What to build:** The Volumes tab's list — a DataGrid of the current project's volumes with the confirmed composed 3-zone toolbar, clickable rows that open the detail route, per-row status, and ID copy. Fully handles its own loading / empty / error / unauthorized states.
**Blocked by:** 1, 2 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see a list of the volumes in my project, so that I can get an overview of my project's block storage at a glance.

**Acceptance Criteria** (from BRD §5.1 Story 1)

- [ ] Lists all volumes in the current project in the **Volumes tab** (default tab). Columns appear in this order: **Name/ID · Availability Zone · Size · Volume type · Bootable · Attached To · Created · Status · ⋮ (menu)**. Each row shows:
  - [ ] **Name** — ID beneath the name
  - [ ] **Availability Zone**
  - [ ] **Size (GiB)**
  - [ ] **Volume type** (`volume_type`)
  - [ ] **Bootable** — yes / no
  - [ ] **Attached to** — the attachment `server_id` when attached; `- -` when unattached. **Plain ID only in the list — no name resolution (E2) and no deep-link; the instance deep-link lives in the volume detail (sub-issue 7)**
  - [ ] **Created** timestamp
  - [ ] **Status** — visible status indicator tolerating any Cinder string (`available`, `in-use`, `creating`, `deleting`, `error`, `error_deleting`, `attaching`, `detaching`, `reserved`, `maintenance`, `backing-up`, `restoring-backup`, `extending`, …)
  - [ ] a **row overflow menu** with a single **"View details"** item (phase-1 extension point)
- [ ] The whole row is clickable and navigates to the volume detail route; nested interactive elements call `event.stopPropagation()`
- [ ] **Searchable** by name and ID
- [ ] **Sortable** by name, status, size, and created. Status sorts attention-first per E3, flipped by the direction toggle
- [ ] **Filterable** by status, volume type, bootable, and availability zone (E6), with active-filter pills + "clear all"
- [ ] Encrypted, description, metadata, multiattach, and full attachment detail are **not** shown in the list — they live in the detail view
- [ ] **No pagination** (E5): all rows render; search/sort/filter are client-side over the single `volume.listVolumes` response
- [ ] **States:** DataGrid-scoped loading indicator; a friendly empty state ("No volumes in this project") distinct from a filtered-empty state ("No volumes match your filters"); a DataGrid-scoped error state with a **retry** affordance on backend/5xx/timeout; the standard unauthorized state on 403

**Aurora / Juno implementation notes**

- Build the 3-zone header by composing `DataGridToolbar` + `SearchInput` + `ListToolbar/SortInput` / `FiltersInput` / `SelectedFilters` — copy the structure of `network/routers/-components/RoutersList.tsx`.
- All search/sort/filter are **client-side** over the single `volume.listVolumes` response (`GET /volumes/detail`) — no extra API calls, no server-side query params in phase 1.
- Copy-to-clipboard is **out of scope for now** — IDs render as plain text (and as deep-links where sub-issue 7 applies); no `ClipboardText` / copy affordance is wired in this phase.
- **Refresh:** none (E1). Zone 3 shows count + last-updated (`dataUpdatedAt`, relative); no refresh button.
- Default empty-cell placeholder `- -`; for the Name column, if a volume has no name show its ID (per `datagrid.md` writing rules).

**BRD Reference** — Story §5.1 Story 1 · Error/empty states §7 · Auth §8.

---

## 4 — Volume detail — metadata + attachments (full route page)

**What to build:** The volume detail route — a full page (directory form) with a metadata section (description list) and a read-only **attachments** sub-table, both served by the single `GET /volumes/detail` object (or a `getVolumeById` fetch). Handles its own load/error/unauthorized states; a failed fetch does not blank the app.
**Blocked by:** 3 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to open a volume and see all its metadata and what it is attached to, so that I can understand its configuration and where it is used.

**Acceptance Criteria** (from BRD §5.1 Story 2)

- [ ] Full route page at `…/volumes/$volumeId` (directory form), reachable by clicking a list row and directly via URL
- [ ] **Metadata section** (description list) shows all list fields plus the fields the list omits: Name, ID, Status, Size (GiB), Volume type, Bootable, Encrypted, Multiattach, Availability Zone, Description, Metadata (key/value pairs), Created / Updated timestamps
- [ ] **Attachments sub-table:** for each attachment show `server_id`, device (e.g. `/dev/vdb`), and attachment ID / attached-at when present; an unattached volume renders an explicit empty state ("Not attached")
- [ ] Shows the volume's **source** when present (`snapshot_id` or `source_volid`) as a plain ID (the deep-link behaviour is sub-issue 7)
- [ ] **Snapshots of this volume** (section/sub-table): a read-only list of the project snapshots whose `volume_id` equals this volume's ID — columns Name/ID, Status, Size, Created — each row deep-linking to the snapshot detail; empty set → explicit empty state ("No snapshots for this volume"). Derived client-side from `volume.listSnapshots`; **no extra per-volume call**, no server-side `?volume_id` filter. _(Gated on Q-F8 / open item O5 — ships in phase 1 if the developer confirms the detail view may reuse the snapshot-list data; otherwise fast-follow. Does not block the rest of this sub-issue.)_
- [ ] Description and metadata are shown when present; absent → explicit `- -` (not omitted)
- [ ] Object-storage content is **not** shown here
- [ ] **States:** page-scoped loading (Spinner) while the volume loads; a scoped error state with retry on failure; standard unauthorized state on 403; if the "Snapshots of this volume" section is included, a snapshot-list fetch failure is scoped to that section (inline error + retry) and does not blank the rest of the detail

**Aurora / Juno implementation notes**

- **Data source:** `volume.getVolumeById` (`projectScopedProcedure`); for the MVP it is acceptable to select from the already-fetched `volume.listVolumes` cache when navigating from the list, but support a standalone fetch for direct-link/refresh.
- **Snapshots-of-this-volume (Q-F8/O5):** reuse `volume.listSnapshots` and filter on `snapshot.volume_id === volumeId` on the client (same mechanism as the CLI `--volume` flag). No new procedure and no server-side `?volume_id` param (not documented — see sub-issue 1). If the developer declines reusing the snapshot list here, defer the section to a fast-follow.
- Detail layout: follow the `floatingips` directory-form detail (`$floatingIpId/index.tsx` + `-components/`) with a description list + nested table.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 2 · API §7 · Auth §8.

---

## 5 — Snapshots tab — list project volume snapshots

**What to build:** The Snapshots tab's list — a DataGrid of the current project's volume snapshots (a peer tab to the Volumes list, sharing the sub-issue-2 tab shell), with the confirmed composed toolbar, clickable rows that open the snapshot detail route, and per-row status. Fully handles its own loading / empty / error / unauthorized states.
**Blocked by:** 2 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see a list of the volume snapshots in my project, so that I can see what point-in-time copies exist and from which volumes.

**Acceptance Criteria** (from BRD §5.1 Story 3)

- [ ] List rendered in the **Snapshots tab** at `…/volumes/snapshots` (a peer tab to the Volumes list in the sub-issue-2 tab shell; lists all project snapshots, not scoped to one volume). Each row shows:
  - [ ] **Name** — ID beneath the name
  - [ ] **Status** — tolerating any Cinder snapshot string (`available`, `creating`, `deleting`, `error`, `error_deleting`, `restoring`, …)
  - [ ] **Size (GiB)**
  - [ ] **Source volume** — `volume_id`; the deep-link to the volume detail is sub-issue 7
  - [ ] **Created** timestamp
  - [ ] a **row overflow menu** with a single **"View details"** item
- [ ] The whole row is clickable and navigates to the snapshot detail route; nested interactive elements call `event.stopPropagation()`
- [ ] **Searchable** by name and ID
- [ ] **Sortable** by name, status, size, and created (status attention-first per E3)
- [ ] **Filterable** by status (E6), with pills + "clear all"
- [ ] **No pagination** (E5): all rows render; search/sort/filter client-side over the single `volume.listSnapshots` response
- [ ] **States:** DataGrid-scoped loading; friendly empty state ("No snapshots in this project") distinct from filtered-empty; scoped error state with retry; unauthorized state on 403

**Aurora / Juno implementation notes**

- Same toolbar composition as sub-issue 3 (`DataGridToolbar` + `SearchInput` + `ListToolbar` sub-components).
- `volume.listSnapshots` (`GET /snapshots/detail`), single call, client-side search/sort/filter.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 3 · Error/empty states §7 · Auth §8.

---

## 6 — Snapshot detail — metadata + source volume

**What to build:** The snapshot detail route — a full page (single-file form) showing the snapshot's metadata and its source `volume_id`. Handles its own load/error/unauthorized states.
**Blocked by:** 5 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to open a snapshot and see its metadata and its source volume, so that I can understand what it captured and where it came from.

**Acceptance Criteria** (from BRD §5.1 Story 4)

- [ ] Full route page at `…/volumes/snapshots/$snapshotId` (single-file form), reachable by clicking a list row and directly via URL
- [ ] **Metadata section** shows: Name, ID, Status, Size (GiB), Description, Metadata (key/value pairs), Created / Updated timestamps, and the **Source volume** `volume_id`
- [ ] The source volume `volume_id` is shown as a plain ID here (the deep-link behaviour is sub-issue 7)
- [ ] Description and metadata shown when present; absent → explicit `- -`
- [ ] **States:** page-scoped loading; scoped error state with retry; unauthorized state on 403

**Aurora / Juno implementation notes**

- **Data source:** `volume.getSnapshotById` (`projectScopedProcedure`); may select from the `volume.listSnapshots` cache when navigating from the list, with a standalone fetch for direct-link/refresh.
- Detail layout: follow the single-file `routers` / `flavors` detail form.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 4 · API §7 · Auth §8.

---

## 7 — Cross-scope deep-links (instance / volume)

**What to build:** Upgrade the ID cells across the volume and snapshot detail views so related resources link straight to their detail pages — ID-based, no extra API call, degrading gracefully when the target scope is absent. One link family across three places:
(a) volume attachment `server_id` → **Instance** detail (Instances scope);
(b) snapshot `volume_id` → **Volume** detail (this scope);
(c) volume `snapshot_id` / `source_volid` → **Snapshot** / **Volume** detail (this scope).
**Blocked by:** 4, 6 · **Status:** ready-for-agent

**User story:** (extends Stories 2 & 4) As a Project Member (Viewer), I want related IDs to link to their detail pages, so that I can jump between a volume, its attached instance, its source, and its snapshots.

**Acceptance Criteria** (from BRD §5.1 Story 2 & Story 4 — deep-link exceptions)

- [ ] **Volume attachment → instance:** in the **volume detail attachments list** (not the Volumes-tab list view, which stays a plain ID), when an attachment has a `server_id`, render it as a **deep-link to that instance's detail view** in the Instances scope, keyed on `server_id`. Target route `/projects/$projectId/compute/instances/$instanceId` (params `{ projectId, instanceId }`). _(Confirm against the Instances scope route at build — open item O2.)_
- [ ] **Snapshot → source volume:** the snapshot's `volume_id` (list row + detail) links to `/projects/$projectId/volumes/$volumeId`
- [ ] **Volume → source:** a volume's `snapshot_id` links to the snapshot detail and `source_volid` links to the volume detail, when present
- [ ] Every deep-link requires only route construction — **no extra API call** and **no name resolution** (link text is the ID; the target's name is shown once the user lands on the target detail page)
- [ ] If the **target scope/route is unavailable** in the catalog (e.g. the Instances scope is absent), the link **degrades gracefully to showing just the ID** (plain text + copy, no broken link)

**Aurora / Juno implementation notes**

- Model this on the Networks scope's port → router deep-link: ID-based route construction, catalog-gated graceful degradation, no data/code coupling — a navigation-only soft dependency.
- Gate the instance link on the catalog presence of the compute/Nova service (the Instances scope's own gate); gate intra-scope volume/snapshot links on the route existing (always true within this scope).

**BRD Reference** — Story §5.1 Story 2 (attachment deep-link) · Story 4 (source volume) · Out-of-Scope §4 (no name resolution) · Dependencies §8 (soft dependency on Instances scope).

---

## Open items roll-up

**Resolved during planning:**

- ~~**Snapshots placement**~~ → **resolved E7:** one Volumes scope with **two peer tabs (Volumes · Snapshots)**, each a full list with its own detail view, cross-linked by ID-based deep-links. **Additionally**, the volume detail shows a read-only **"Snapshots of this volume"** section (client-side filter on `snapshot.volume_id`; no server-side `?volume_id` filter exists) — included in phase 1 pending developer confirmation (Q-F8 / O5), otherwise fast-follow.
- ~~**Refresh mechanism**~~ → **resolved E1:** no refresh in phase 1 (no `refetchInterval`, no SSE, no manual button).
- ~~**Name resolution**~~ → **resolved E2:** IDs only; ID-based deep-links with graceful degradation; no Nova/Cinder name lookups.
- ~~**tRPC namespace**~~ → **resolved E4:** `volume.*` with `listVolumes` / `getVolumeById` / `listSnapshots` / `getSnapshotById`; single `volume` router grouping both resources (Networks convention).

**Residual (resolve before/at build):**

- **O1 — Dev data shapes (sub-issue 1):** confirm the test project holds attached + unattached volumes, bootable/encrypted volumes, a from-snapshot/cloned volume, snapshots referencing in-view volumes, and a transitional/error example — else seed or mock.
- **O2 — Instances scope route shape (sub-issue 7):** confirm the deep-link target `/projects/$projectId/compute/instances/$instanceId` against the read-only Instances scope route when it lands.
- **O3 — Cinder catalog registration (sub-issues 1, 2):** confirm the exact catalog **type** and **name** (`volumev3`/`cinderv3` vs `block-storage` vs `volume`) and whether to gate via `serviceIndex[type]?.[name]` or `hasServiceByName`.
- **O4 — Permission policy keys (sub-issue 2):** confirm the exact Cinder policy keys for list/show volumes and snapshots (e.g. `volume:get_all` / `volume:get`, `volume:get_all_snapshots` / `volume:get_snapshot`) that gate the nav entry and the unauthorized state.
- **O5 — "Snapshots of this volume" in phase 1 (sub-issue 4, Q-F8):** confirm with an Aurora developer whether the volume detail reuses the project snapshot list (`volume.listSnapshots`, filtered client-side on `snapshot.volume_id`) to show the volume's snapshots in phase 1, or whether that section is deferred to a fast-follow. Technically cheap (no extra call, no server-side `?volume_id` filter — which is undocumented); does not block the volume-detail MVP.
- **Non-blocking BRD deferrals (not required for build):** rollout strategy & go-live comms (Q-N1), Aurora core-team sign-off for a new built-in scope (Q-N2), Document Control submitter/target quarter (Q-N4). Carried from the BRD; none block engineering.

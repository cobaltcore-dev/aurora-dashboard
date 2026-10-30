# Epic: Networks (read-only) scope

Source BRD: [networks-readonly-brd.md](networks-readonly-brd.md)
Target surface: Aurora Dashboard — built-in scope (**Pattern A**: file-based TanStack Router routes under `$projectId/network/networks/`, server tRPC router registered via `buildBaseRouter()`, nav entry in `buildNavSections.ts`)
Development context (source of truth): `.claude/context/aurora-dashboard.md`, `.claude/context/juno.md`
Status: ready-for-engineering

> **Scope framing (BRD §6).** Phase 1 is strictly **read-only** — no create/edit/delete; mutation is a separate later phase. The MVP is the **network list + network detail with the subnets sub-table** (sub-issues 3–5). The **ports sub-table + attached-routers list + router deep-link** (sub-issues 6–7) are fast-follow within the same phase — headline functionality, sequenced immediately after the MVP but not blocking first release. Status/empty/error/loading state handling is **folded into each sub-issue** where it applies rather than tracked separately. **There is no data-refresh mechanism in phase 1** (see Engineering decision E1).

## Confirmed UX / component decisions (from the epic planning session, grounded in Juno UX docs)

These were confirmed with the stakeholder against the Juno UX guidelines and must be used **verbatim** by implementers:

1. **List toolbar — standard 3-zone DataGrid header** (`datagrid.md`), built on Aurora's shared `ListToolbar` component (`client/components/ListToolbar`):
   - **Zone 1:** a sort `Select` (Name / Status / Subnet count) + a sort-direction toggle. No predefined filter tabs.
   - **Zone 2:** a `SearchBox` (placeholder makes clear it matches **Name and ID**) + filter `Select`s for **Status** and for the **Shared** and **External** flags + active-filter pills with a "clear all".
   - **Zone 3:** item count ("N networks"; matching/total when filtered) + last-updated timestamp. **No refresh button** (see E1).
2. **Row navigation — clickable row + scaffolded overflow menu.** The whole row is clickable to open the detail route (`datagrid.md`: a row that navigates to a detail view should be fully clickable; nested interactive elements must call `event.stopPropagation()`). The last column **also** keeps an overflow menu (`⋮`) holding a single **"View details"** item in phase 1 — retained deliberately as the extension point for future edit/delete and to reserve the column `min-width` now. (Note: this is a conscious divergence from `popup-and-overflow-menus.md`, which would omit a single-option non-destructive overflow menu; the BRD's extensibility rationale wins here.)
3. **Detail presentation — full route page** at `…/projects/$projectId/network/networks/$networkId`, implemented in the **directory route form** (`networks/$networkId/index.tsx` with a co-located `networks/$networkId/-components/` subtree), matching the `floatingips` resource which uses the directory form precisely because its detail page has a nested component subtree. Deep-linkable, bookmarkable, room for the nested sub-table(s). Not a panel or modal.

## Confirmed engineering decisions (from the grilling session, 2026-10-27)

Grounded in the current Aurora codebase (`floatingips` / `routers` / `securitygroups` as reference implementations):

- **E1 — No refresh mechanism in phase 1.** No `refetchInterval` auto-poll, no SSE subscription, and no manual refresh button. Rationale: `refetchInterval` is unused anywhere in Aurora today; the only real-time pattern (tRPC-over-SSE subscriptions) is purpose-built for in-process upload/download progress and does not watch OpenStack resource state; and a manual refresh button is likewise not an established pattern in the sibling list/detail views. Data loads on route navigation / component mount (and via TanStack Query's default refetch-on-window-focus). The Zone-3 **last-updated timestamp is retained**, fed from the query's `dataUpdatedAt` and rendered relative. Refresh is deferred to a later phase. _(Resolves BRD Q-F7.)_
- **E2 — "Owning project" = `project_id` (UUID) + copy affordance.** For a shared network, the Shared column shows the owning project's `project_id` with a copy-to-clipboard affordance — **no Keystone name lookup** (consistent with the no-name-resolution / no-N+1 principle applied to `device_id`).
- **E3 — Status sort order:** `ERROR` → `BUILD` → `DOWN` → `ACTIVE` (attention-first); the sort-direction toggle flips it. Sorting by status is treated as "surface what needs attention first".
- **E4 — tRPC namespace `network.networks.*`**, procedures `list`, `getById`, `listSubnets`, `listPorts`. Subnets and ports are **procedures on the networks router** (no separate `subnets` router), because phase 1 has no standalone project-wide subnet or port list — they are only ever viewed nested inside a network. Procedure naming follows the sibling convention (`getById`, not `get`).
- **E5 — No pagination in phase 1.** The list renders all rows; search / sort / filter are entirely client-side over the single `network.networks.list` response. None of the sibling list views (`floatingips`, `routers`, `securitygroups`) implement pagination, and project-scoped network counts are typically small. Revisit only if real projects show large network counts. _(Divergence from the original BRD Story-1 pagination AC, which has been marked superseded in the BRD.)_
- **E6 — Shared / External filters are boolean.** `shared` and `router:external` are booleans on the Neutron network object, so each filter `Select` offers **true / false** only; leaving a filter unselected means "any" (no pill, no filtering).

## Epic index

| Sub-issue | Title                                       |   In MVP?   | Blocked by |
| --------- | ------------------------------------------- | :---------: | ---------- |
| 1         | API & environment gate                      |   prereq    | —          |
| 2         | Scope scaffold, routing & auth wiring       |   prereq    | 1          |
| 3         | List project networks                       |   ✅ MVP    | 1, 2       |
| 4         | Network detail — metadata (full route page) |   ✅ MVP    | 3          |
| 5         | Subnets sub-table                           |   ✅ MVP    | 4          |
| 6         | Ports sub-table + attached-routers list     | fast-follow | 4          |
| 7         | Router deep-link from ports                 | fast-follow | 6          |

## Dependency graph

```
1  API & environment gate
└─ 2  Scope scaffold, routing & auth wiring
   └─ 3  List networks ───────────────────────────── (MVP releasable: 3 + 4 + 5)
      └─ 4  Network detail — metadata
         ├─ 5  Subnets sub-table          ── independent of 6
         └─ 6  Ports sub-table + attached-routers list
            └─ 7  Router deep-link
```

Critical path to MVP: **1 → 2 → 3 → 4 → 5**. Fast-follow extends **4 → 6 → 7**. Sub-issues 5 and 6 are independent of each other. The single ports fetch introduced in sub-issue 6 feeds **both** the ports sub-table and the attached-routers list.

---

# Epic — Networks (read-only) scope

Give Aurora project members a read-only view of their project's Neutron networks, subnets, and ports/attached devices — in context, no CLI.

## 1 — API & environment gate

**What to build:** Nothing to code — a tracking/verification sub-issue that the backing API and dev environment are ready, so every downstream sub-issue has a clear green light.
**Blocked by:** None (can start immediately) · **Status:** ready-for-agent

**Checklist**

- [ ] Confirm OpenStack **Neutron v2.0** is reachable via the Keystone service catalog.
- [ ] Confirm test project contains the data shapes every view must render, or seed / fall back to realistic mock data for any missing shape:
  - [ ] a **shared** network (so the "owning project" rendering can be exercised)
  - [ ] an **external** network
  - [ ] a subnet **with host routes** (non-empty `host_routes`)
  - [ ] a **port attached to an instance** (`device_owner = compute:nova`) and ideally one with `device_owner = network:router_interface` (to exercise the deep-link)
- [ ] Note: Neutron response shapes are well-known and stable, so UI implementation may begin against mock data regardless of seed status.

**BRD Reference** — API §7 (Details, Dev Environment).

---

## 2 — Scope scaffold, routing & auth wiring

**What to build:** The net-new `networks` resource inside Aurora's existing `network` scope — the route tree, the server-side tRPC router, the nav entry — so that an (initially empty) Networks page renders, is reachable from navigation, and can call Neutron through the BFF. This is the foundation every story sub-issue builds on.
**Blocked by:** 1 · **Status:** ready-for-agent

**Acceptance Criteria**

- [ ] A new resource route tree exists under `…/projects/$projectId/network/networks/` (list route) and `…/network/networks/$networkId` (detail route, **directory form** `networks/$networkId/index.tsx`), following the file-based routing used by the sibling `floatingips` / `routers` / `securitygroups` resources.
- [ ] A server-side tRPC router for networks is registered as the key `networks` inside `network: auroraRouter({...})` in `Network/routers/index.ts` (`buildNetworkRouters`), which is pulled into `buildBaseRouter()` via `server/routers.ts`. All procedures use `projectScopedProcedure` so the server injects `X-Auth-Token` via `signal-openstack` and the browser never holds the token.
- [ ] A **Networks** navigation entry is added in `buildNavSections.ts`, appearing within the existing `network` scope section.
- [ ] The scope is catalog-gated: it only appears when the `network` service is in the Keystone catalog, reusing the existing `getServiceIndex("network")` + `beforeLoad` guard in `network.tsx` (no new guard needed — Networks lives under the already-guarded `network` scope).
- [ ] A user without the Neutron read capability for the active project does not see the nav entry; a user who reaches the route without the capability sees the standard unauthorized state (not a crash/blank page). Reuses the existing `network.canUser` permission pattern. _(Residual open item O3: confirm the exact Neutron policy key for "list networks" at build.)_

**Aurora / Juno implementation notes**

- Pattern A built-in scope — reference the **`floatingips`** resource as the closest implementation model (`…/$projectId/network/floatingips/` on the client; `Network/routers/floatingIpRouter.ts` on the server).
- Server data access: standard Neutron list/show endpoints via `signal-openstack`; `projectScopedProcedure` auto-rescopes the token to the active project. Access token in a procedure: `ctx.openstackSession?.getToken()?.authToken`.
- tRPC namespace: **`network.networks`** with procedures `list`, `getById`, `listSubnets`, `listPorts` (E4). Server resource object exported from `Network/routers/networksRouter.ts`; types in `Network/types/network.ts`; error handlers / enrichment in `Network/helpers/networkHelpers.ts` — matching the per-resource `routers.ts` / `types.ts` / `helpers.ts` layout of the siblings.
- Route/URL state (search/sort/filter) via TanStack Router search params, Zod-validated.

**BRD Reference** — Target Surface §3 · API §7 (Auth Mode, Catalog Registration, Discovery) · Auth §8 · Appendix (Framework Notes).

---

## 3 — List project networks

**What to build:** The networks list page — a DataGrid of the current project's networks with the confirmed 3-zone toolbar, clickable rows that open the detail route, per-row status, and ID copy. Fully handles its own loading / empty / error / unauthorized states.
**Blocked by:** 1, 2 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see a list of the networks in my project, so that I can get an overview of my project's networking at a glance.

**Acceptance Criteria** (from BRD §5.1 Story 1)

- [ ] Lists all networks in the current project. Each row shows:
  - [ ] **Name** — with the network's **ID shown beneath the name** (no separate ID column); the ID has a **copy-to-clipboard affordance**
  - [ ] **Status** — a visible status indicator; possible values: `ACTIVE`, `DOWN`, `BUILD`, `ERROR`
  - [ ] **Admin State** — up / down
  - [ ] **Shared** — when the network is shared, this column shows the **owning project's `project_id` (UUID) with a copy affordance** (E2; not merely "yes", and not a resolved project name)
  - [ ] **External** — yes / no
  - [ ] **Subnet count** — derived from the network object's embedded `subnets` array (`subnets.length`); no extra API call
  - [ ] a **row overflow menu** (last column) with a single **"View details"** item (phase-1 extension point)
- [ ] The whole row is clickable and navigates to the network detail route; nested interactive elements (ID copy, overflow menu) call `event.stopPropagation()`
- [ ] **Searchable** by name and ID (search box placeholder makes the matched fields clear)
- [ ] **Sortable** by name, status, and subnet count. Status sorts in the order `ERROR` → `BUILD` → `DOWN` → `ACTIVE`, flipped by the direction toggle (E3)
- [ ] **Filterable** by status and by the Shared and External flags (each a boolean true/false `Select`, unselected = any — E6), with active-filter pills + "clear all"
- [ ] MTU and provider/segmentation details are **not** shown in the list — they live in the detail view
- [ ] **No pagination** (E5): all rows render; search/sort/filter are client-side over the single `network.networks.list` response
- [ ] **States:** DataGrid-scoped loading indicator; a friendly empty state ("No networks in this project") distinct from a filtered-empty state ("No networks match your filters"); a DataGrid-scoped error state with a **retry** affordance on backend/5xx/timeout (never a blank page/stack trace); the standard unauthorized state on 403

**Aurora / Juno implementation notes**

- Build the 3-zone header on the shared `ListToolbar` component (Zone 1 sort; Zone 2 search + Status + Shared + External filters + pills; Zone 3 count + last-updated). `ListToolbar` provides the count + last-updated row and 500ms search debounce out of the box.
- All search/sort/filter are **client-side** over the single `network.networks.list` response — no extra API calls, no server-side query params in phase 1.
- Copy-to-clipboard uses Aurora's existing clipboard affordance (`ClipboardText`, default import from `@/client/components/ClipboardText`) — no custom component.
- **Refresh:** none (E1). Zone 3 shows count + last-updated (`dataUpdatedAt`, relative); no refresh button.
- Default empty-cell placeholder `- -`; for the Name column, if a network has no name show its ID (per `datagrid.md` writing rules).

**BRD Reference** — Story §5.1 Story 1 · Error/empty states §7 · Auth §8.

---

## 4 — Network detail — metadata + tab shell (full route page)

**What to build:** The network detail route — a full page with a top metadata section (description list) and a **tab bar** hosting the network's sub-tables. This sub-issue builds the tab shell and the first tab (**Segmentation**, whose data rides the network fetch); the Subnets/Ports/Routers tabs are mount points filled by sub-issues 5–7. Handles its own load/error/unauthorized states; a failed network fetch does not blank the app.
**Blocked by:** 3 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to open a network and see all its metadata and the resources related to it, so that I can understand its configuration and what is connected to it.

**Acceptance Criteria** (from BRD §5.1 Story 2)

- [ ] Full route page at `…/network/networks/$networkId` (directory form), reachable by clicking a list row and directly via URL
- [ ] **Top metadata section** (description list) shows all list fields plus the fields the list omits: Name, ID (copy affordance), Status, Admin State, Shared (+ owning `project_id` when shared — E2), External, MTU, Created / Updated timestamps, Description, tags. (Network type moves into the Segmentation tab — it is a provider attribute.)
- [ ] The top section also shows **counts for every countable collection the network fetch itself returns** (e.g. subnet count from the embedded `subnets` array, segment count) — at-a-glance totals sit with the metadata; per-item detail lives in the tabs
- [ ] Description and tags are shown when present; when absent, the field renders an explicit `- -` empty state (not omitted)
- [ ] **Tab bar** below the metadata section hosts the sub-tables as peer tabs in order **Segmentation · Subnets · Ports · Routers**, defaulting to Segmentation. This sub-issue builds the tab shell + the Segmentation tab; the Subnets (sub-issue 5), Ports (sub-issue 6) and Routers / attached-routers (sub-issues 6 → 7) tabs are mount points filled later. All tab lists follow the project's datagrid pattern
- [ ] **Segmentation tab** (built here — data rides the `getById` fetch, no extra call): a datagrid of the network's segments showing Network type (`vlan`/`vxlan`/`gre`/`geneve`/`flat`/`local`), Physical network, Segmentation ID (e.g. VLAN ID). Count space shows **total segments + count per network type**. Shown **only when the API returns provider/segment data** — under project scope typically admin-only and often null/absent; a present-but-null value renders `- -`, and when no segmentation data is returned at all the tab is empty/omitted
- [ ] Floating IPs and Security Groups are **not** shown here
- [ ] **States:** page-scoped loading (Spinner) while the network loads; a scoped error state with retry on failure; standard unauthorized state on 403

> **Note on attached routers:** the "attached routers" list is **not** part of this MVP sub-issue. It is the **Routers tab**, derived from the ports fetch and built together with the Ports tab in sub-issue 6 (both ride the single `network.networks.listPorts` call). The MVP detail page is metadata + the Segmentation and Subnets tabs.

**Aurora / Juno implementation notes**

- Fetched via `network.networks.getById` (`projectScopedProcedure`).
- Tab bar: use the existing `TabNavigation` / `TabNavigationItem` pattern but with `TabBar` component instead (prior art: `routers` `RouterDetailsView`).
- **Refresh:** none (E1) — same policy as the list.

**BRD Reference** — Story §5.1 Story 2 · API §7 · Auth §8.

---

## 5 — Subnets tab

**What to build:** The **Subnets tab** of the network detail page — the addressing view, including the easily-missed host routes. Fills the Subnets mount point in the tab shell from sub-issue 4. Independent of the Ports tab.
**Blocked by:** 4 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see the subnets belonging to a network, so that I can understand the network's addressing.

**Acceptance Criteria** (from BRD §5.1 Story 3)

- [ ] Subnets shown in the **Subnets tab** of the network detail (no standalone project-wide subnet list in phase 1), following the project's datagrid pattern
- [ ] For each subnet, show: Name, ID (copy affordance), CIDR, IP version (4/6), Gateway IP, DHCP enabled (yes/no), Allocation pools (start–end ranges), DNS nameservers, and **Host routes** (destination CIDR → nexthop pairs)
- [ ] Host routes render with an explicit `- -` empty state when absent (field always shown)
- [ ] Empty subnet set shows the datagrid's inline empty state ("No subnets")
- [ ] **Partial failure:** if the network loaded but the subnets call fails, the error is scoped to the **Subnets tab** (inline error + retry) and the rest of the detail stays usable

**Aurora / Juno implementation notes**

- Fetched via `network.networks.listSubnets` (`GET /v2.0/subnets?network_id=<id>`), a single list call.
- Datagrid-in-tab pattern — reference the `floatingips` / `securitygroups` scopes.

**BRD Reference** — Story §5.1 Story 3 · Error/empty + partial-failure §7.

---

## 6 — Ports tab + Routers tab (attached-routers)

**What to build:** The **Ports tab** of the network detail page — what's attached to the network and how, with human-friendly device-type labels — **plus** the **Routers tab** (read-only attached-routers). Both are derived from a single ports fetch and fill their mount points in the tab shell from sub-issue 4. The most complex view; sequenced as fast-follow. Independent of the Subnets tab.
**Blocked by:** 4 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see the ports on a network and what they are attached to, so that I can see which devices are connected and how — and I want the network's attached routers surfaced explicitly.

**Acceptance Criteria** (from BRD §5.1 Story 4)

- [ ] Ports shown in the **Ports tab**, following the project's datagrid pattern
- [ ] For each port, show: ID (copy affordance), Status (`ACTIVE` / `DOWN` / `BUILD` / `ERROR`), Admin State (`admin_state_up`), Fixed IPs (IP + subnet), MAC address, Device owner, Attached device (`device_id`, copy affordance)
- [ ] `device_owner` is mapped to a human-friendly **type label** (`compute:nova` → "Instance", `network:router_interface` → "Router interface", `network:dhcp` → "DHCP agent", `network:floatingip` → "Floating IP"), with a **graceful fallback to the raw `device_owner` string** for unrecognized values
- [ ] The UI does **not** resolve `device_id` to an instance/router _name_ (no per-row lookups / no N+1)
- [ ] Empty port set shows the datagrid's inline empty state ("No ports")
- [ ] **Routers tab (attached-routers, moved from sub-issue 4):** a read-only linked list derived from the same ports fetch — the ports where `device_owner = network:router_interface`, keyed on `device_id`. When none exist, renders an explicit `- -` empty state. (The link behaviour itself is sub-issue 7.)
- [ ] **Partial failure:** if the network loaded but the ports call fails, the error is scoped to the **Ports and Routers tabs** (inline error + retry); the Subnets tab and the rest of the detail stay usable

**Aurora / Juno implementation notes**

- Both the Ports tab and the Routers tab are driven by **one** Neutron list call — `network.networks.listPorts` / `GET /v2.0/ports?network_id=<id>`. `device_owner` and `device_id` are fields on the port object, so the type-label mapping and the router derivation are pure client-side with **zero per-item fan-out**.
- The router deep-link (sub-issue 7) is layered on top of the Attached-device cell and the Routers tab; build the raw labelled cell + plain-ID list here first.
- **Refresh:** none (E1).

**BRD Reference** — Story §5.1 Story 4 · Out-of-Scope §4 (no name resolution) · API §7.

---

## 7 — Router deep-link from ports

**What to build:** Upgrade the **Ports tab's** "Attached device" cell (and the **Routers tab's** attached-routers list from sub-issue 6) so a router interface links straight to that router's detail page in Aurora's existing Routers scope — one deliberate cross-scope link, ID-based, no extra API call, degrading gracefully when the Routers scope is absent.
**Blocked by:** 6 · **Status:** ready-for-agent

**User story:** (extends Story 4) As a Project Member (Viewer), I want a port attached to a router to link to that router, so that I can jump straight to the router's details.

**Acceptance Criteria** (from BRD §5.1 Story 4 — router deep-link exception)

- [ ] When `device_owner = network:router_interface`, the Attached device is rendered as a **deep-link to that router's detail view** in the existing Routers scope, keyed on the router ID already present in `device_id`
- [ ] The deep-link target route is `/projects/$projectId/network/routers/$routerId` (params `{ projectId, routerId }`), matching the existing Routers detail route (file `…/network/routers/$routerId.tsx`). _(Resolves open item O2.)_
- [ ] The link requires only route construction — **no extra API call** and **no name resolution** (link text is the router ID with its copy affordance; the router's name is shown once the user lands on the Routers detail page)
- [ ] If the **Routers scope is unavailable** in the catalog, the link **degrades gracefully to showing just the ID** (plain text + copy, no broken link)
- [ ] The same `device_id` value also feeds the **Routers tab's** attached-routers list (built in sub-issue 6)

**Aurora / Juno implementation notes**

- Construct the Routers-scope detail route for the active project + `device_id`; gate on the catalog presence of the `network`/routers resource for graceful degradation.
- This is a navigation-only **soft dependency** on the Routers scope route existing (it does today) — not a code/data coupling.

**BRD Reference** — Story §5.1 Story 4 (exception) · Out-of-Scope §4 · Dependencies §8 (soft dependency).

---

## Open items roll-up

**Resolved during the grilling session (2026-10-27):**

- ~~**Refresh mechanism**~~ → **resolved E1:** no refresh in phase 1 (no `refetchInterval`, no SSE, no manual button).
- ~~**Routers-scope route shape (O2)**~~ → **resolved:** `/projects/$projectId/network/routers/$routerId` (file `…/network/routers/$routerId.tsx`).
- ~~**tRPC namespace**~~ → **resolved E4:** `network.networks.*` with `list` / `getById` / `listSubnets` / `listPorts`; no separate subnets router.

**Residual (resolve before/at build):**

- **O1 — Dev data shapes (sub-issue 1):** confirm test project holds a shared network, an external network, a subnet with host routes, and a router-interface port — else seed or mock.
- **O3 — Permission policy key (sub-issue 2):** confirm the exact Neutron policy key for "list networks" (e.g. `get_network`) that gates the nav entry and the unauthorized state, against the `network.canUser` permission router.
- **Non-blocking BRD deferrals (not required for build):** rollout strategy & go-live comms (Q-N1), Aurora core-team sign-off for a new built-in scope (Q-N2), Document Control submitter/target quarter (Q-N4). Carried from the BRD; none block engineering.

# Business Requirements Document (BRD) for Volumes & Snapshots (read-only) scope

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Volumes & Snapshots (read-only) scope for Aurora Dashboard                                                         |
| **Submitted By**                | <!-- fill in -->                                                                                                   |
| **Team**                        | Team 2 – Specs and BRDs                                                                                            |
| **Date**                        | 2026-11-03                                                                                                         |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [x] Medium &nbsp;&nbsp; [ ] Low                                    |
| **Target Release Date/Quarter** | <!-- fill in -->                                                                                                   |
| **Status**                      | [ ] Draft &nbsp;&nbsp; [x] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [ ] Implemented |

> **Note (deferred, non-blocking):** submitter and target release quarter are not yet recorded (Q-N4); priority is provisionally **Medium**. These are nice-to-have document-control fields and do not block engineering review.

---

## 1. Summary (2-3 sentences)

A new **read-only Volumes & Snapshots scope** in the Aurora Dashboard that lets project
members inspect the block-storage volumes (OpenStack Cinder) and volume snapshots in their own
project. Users can list their project's volumes, open a volume to see its full metadata and
attachments, list the project's volume snapshots, and open a snapshot to see its metadata and
its source volume. Phase 1 is strictly read-only — no create, extend, attach/detach, delete,
or snapshot/restore; mutation is a deliberately separate later phase.

---

## 2. Business Justification

### Why does this need a UI implementation?

Today, project members who want to inspect their block storage must use the `openstack volume`
/ `openstack volume snapshot` CLI or the raw Cinder API. That requires credential setup,
knowledge of the right commands, and manually cross-referencing a volume against its
attachments (which instance is it on?) and its snapshots. Aurora already surfaces **Compute**
(Flavors, Images, and now read-only Instances) and **Object Storage** (Swift / Ceph) — but
**block storage is entirely missing**. A read-only UI gives these same users volume and
snapshot visibility **in context, with no CLI**, and surfaces the volume↔instance and
volume↔snapshot relationships that are tedious to assemble by hand.

### Expected Impact

**If we implement this UI:**

- Faster self-service answers to "what volumes do I have, how big, what status, and what are they attached to?" and "which snapshots exist and from which volume?" without leaving Aurora.
- Fewer "can someone check my volume / snapshot?" tickets routed to operators.
- Completes Aurora's storage story — block storage joins the already-present object storage, alongside compute and network.

**If we DON'T implement this UI:**

- Project members stay CLI-dependent for basic block-storage questions.
- Aurora's storage coverage remains object-storage-only; block storage has no surface at all.
- The gap continues to push inspection load onto operators.

---

## 3. Target Surface

**Which UI surface will host this functionality? (single-select)**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other (specify):
- [ ] I don't know

### Why this surface?

This is a new scope, and the general rule is that new scopes go to Aurora directly. Volumes
and snapshots are built-in OpenStack (Cinder) resources, so they use Aurora's **built-in scope
pattern ("Pattern A")**: file-based TanStack Router routes under
`…/projects/$projectId/…`, a navigation entry registered in `buildNavSections.ts`, and a
server-side tRPC router registered via `buildBaseRouter()`. **Neither a client surface nor a
server-side router exists yet for Cinder** — this is net-new on both tiers (unlike Instances,
where the server procedure already existed). Block storage is kept as its **own scope**,
separate from the existing object-storage scope (Swift / Ceph), because block storage and
object storage are distinct concepts that happen to share the word "storage". Within this
scope, **volumes and snapshots are presented as two tabs** (Volumes · Snapshots) rather than as
two independent navigation entries.

---

## 4. Out-of-Scope / Non-Goals

- **No mutation.** Create, extend/resize, attach/detach, delete, snapshot-create, and restore-from-snapshot are explicitly excluded in phase 1. The row overflow menu is scaffolded for future mutation actions but carries only read-only navigation items now.
- **No cross-project / admin-wide or per-host views.** Operation is strictly project-scoped; auditing volumes/snapshots across projects or by storage backend/host is out of scope.
- **No instance name-resolution.** A volume's attachment carries a `server_id`; the UI shows that ID and does **not** resolve it to the instance _name_ (that would require a per-row Nova call — an N+1). See §5.1 Story 2 for the one deliberate exception: an ID-based deep-link to the instance's detail view (no extra API call).
- **No object-storage content.** Swift / Ceph buckets and objects are not surfaced here; they remain owned by the existing object-storage scope.
- **No backup resources.** Cinder _backups_ (as distinct from snapshots) are out of scope in phase 1.

---

## 5.1 User Stories

### Definitions

#### User personas:

| Persona                 | Description                                                                                                                                                                                                                                                                                                | Roles                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Project Member (Viewer) | Any user with read access to the project's block storage. Can inspect volumes, their attachments, and volume snapshots. Performs **no** mutations. In a read-only phase there is no behavioral difference between a developer and an operator within the project — all perform the same read-only actions. | Determined by Aurora's `canI`-style capability check against Cinder's OpenStack policy (see §8), not by a hard-coded role name. |

> A distinct "Storage Admin" persona (create/extend/attach/delete, snapshot/restore) is expected to be introduced in a later mutation phase, but is out of scope here.

#### Summary of UI functionality

A Project Member can: list their project's volumes; open a volume to see its full metadata and
attachments; list their project's volume snapshots; and open a snapshot to see its metadata
and its source volume. Everything is read-only. Volumes and snapshots live in **one Volumes
scope presented as two tabs** (a Volumes tab and a Snapshots tab), each a full list with its
own detail view, cross-linked by ID-based deep-links (snapshot → source volume; volume
attachment → instance).

### Story 1: List project volumes

**As a** Project Member (Viewer)
**I want to** see a list of the volumes in my project
**So that** I can get an overview of my project's block storage at a glance

**Acceptance Criteria:**

- [ ] Lists all volumes in the current project in the **Volumes tab** of the Volumes scope (the default tab; peer to the Snapshots tab — see Story 3). Columns appear in this order: **Name/ID · Availability Zone · Size · Volume type · Bootable · Attached To · Created · Status · ⋮ (menu)**. Each row shows:
  - [ ] **Name** — with the volume's **ID shown beneath the name** (no separate ID column)
  - [ ] **Availability Zone** (`availability_zone`)
  - [ ] **Size (GiB)**
  - [ ] **Volume type** (`volume_type`)
  - [ ] **Bootable** — yes / no
  - [ ] **Attached to** — the attachment's `server_id` when attached; "—" when unattached. In the list this is a **plain ID only — no instance-name resolution and no deep-link** (the instance deep-link lives in the volume detail, see Story 2, to keep the list row lightweight)
  - [ ] **Created** timestamp
  - [ ] **Status** — a visible status indicator; Cinder status values include `available`, `in-use`, `creating`, `deleting`, `error`, `error_deleting`, `attaching`, `detaching`, `reserved`, `maintenance`, `backing-up`, `restoring-backup`, `extending` (the renderer must tolerate any string Cinder returns)
  - [ ] a **row overflow menu** (last column) listing the actions available on that row
- [ ] The list is **searchable** by name and ID
- [ ] The list is **sortable** by name, status, size, and created timestamp
- [ ] The list is **filterable** by status, volume type, bootable, and availability zone
- [ ] The list is **not paginated** in phase 1: all rows render, and search / sort / filter are client-side (see engineering decision E5 in the spec); the page size is not user-configurable
- [ ] Encrypted, description, metadata, multiattach, snapshot count, and full attachment detail are **not** shown in the list — they live in the detail view

**Notes:**

> The row overflow menu is the designated extensibility point for future mutation actions. In phase 1 it contains exactly one item — **"View details"** (navigates to the volume detail view). No other items appear in phase 1; the "View details" action is equivalent to activating the row. All search/sort/filter operates on fields already present in the single `GET /volumes/detail` list response — no extra API calls and no server-side query params required in phase 1.

### Story 2: View volume details

**As a** Project Member (Viewer)
**I want to** open a volume and see all its metadata and what it is attached to
**So that** I can understand its configuration and where it is used

**Acceptance Criteria:**

- [ ] Shows all list fields plus the fields the list omits: Name, ID, Status, Size (GiB), Volume type, Bootable, Encrypted, Multiattach, Availability Zone, Description, Metadata (key/value pairs), Created / Updated timestamps
- [ ] Shows the volume's **attachments** as a read-only list: for each attachment show the `server_id`, the device (e.g. `/dev/vdb`), and the attachment ID / attached-at timestamp when present; an unattached volume renders an explicit empty state ("Not attached")
- [ ] **Exception — instance deep-link:** each attachment's `server_id` is rendered as a **deep-link to that instance's detail view** in the Instances scope, keyed on the ID already present in `server_id`. This requires only route construction (no extra API call). If the Instances scope is unavailable in the catalog, the link **degrades gracefully to showing just the ID**.
- [ ] Shows the volume's **source** when present (created-from-snapshot `snapshot_id` or cloned-from-volume `source_volid`) as an ID-based deep-link to that snapshot / volume detail, degrading gracefully to the ID
- [ ] **Snapshots of this volume** — the volume detail shows a read-only list of the snapshots created from this volume (Name/ID, Status, Size, Created), each row deep-linking to the snapshot detail. Reuse the project snapshot list when cached; otherwise fetch it through `volume.listSnapshots`, then filter client-side on `snapshot.volume_id === volumeId`. No per-snapshot lookup is required. An empty set renders an explicit empty state ("No snapshots for this volume").
  - ⚠️ **To be confirmed with an Aurora developer (Q-F8):** whether this section ships in phase 1. It is desirable and technically cheap (reuses the `volume.listSnapshots` data, no per-volume fan-out, no server-side `?volume_id` filter — which is not documented, see §7). If the developer prefers to keep the volume-detail fetch strictly to the single volume object, this moves to a fast-follow; it does **not** block the volume-detail MVP.
- [ ] Description and metadata are shown when present; when absent, the field renders an explicit empty state (`- -`) rather than being omitted
- [ ] Object-storage (Swift / Ceph) content is **not** shown here

### Story 3: List project volume snapshots

**As a** Project Member (Viewer)
**I want to** see a list of the volume snapshots in my project
**So that** I can see what point-in-time copies exist and from which volumes

**Acceptance Criteria:**

- [ ] Lists all volume snapshots in the current project in the **Snapshots tab** of the Volumes scope (a peer tab to the Volumes list; not nested inside an individual volume's detail). Each row shows:
  - [ ] **Name** — with the snapshot's **ID shown beneath the name**
  - [ ] **Status** — Cinder snapshot status values include `available`, `creating`, `deleting`, `error`, `error_deleting`, `restoring` (tolerate any string)
  - [ ] **Size (GiB)**
  - [ ] **Source volume** — the `volume_id`, rendered as an ID-based deep-link to that volume's detail view (degrading gracefully to the ID when the volume is not in view/catalog)
  - [ ] **Created** timestamp
  - [ ] a **row overflow menu** (last column) with a single **"View details"** item (phase-1 extension point)
- [ ] The list is **searchable** by name and ID
- [ ] The list is **sortable** by name, status, size, and created timestamp
- [ ] The list is **filterable** by status
- [ ] The list is **not paginated** in phase 1 (see E5); all rows render, search / sort / filter are client-side

### Story 4: View volume snapshot details

**As a** Project Member (Viewer)
**I want to** open a snapshot and see its metadata and its source volume
**So that** I can understand what it captured and where it came from

**Acceptance Criteria:**

- [ ] Shows: Name, ID, Status, Size (GiB), Description, Metadata (key/value pairs), Created / Updated timestamps, and the **Source volume** `volume_id`
- [ ] The source volume is rendered as an **ID-based deep-link** to that volume's detail view, degrading gracefully to the ID when the volume is unavailable in the catalog
- [ ] Description and metadata are shown when present; when absent, the field renders an explicit empty state (`- -`)

---

## 5.2 Required User Actions

**Viewer (Project Member):**

- [ ] View the list of volumes (search, sort, filter — see Story 1)
- [ ] View a volume's details (full metadata + attachments)
- [ ] View the list of volume snapshots (search, sort, filter — see Story 3)
- [ ] View a snapshot's details (metadata + source volume)
- [ ] Follow an ID-based deep-link: volume attachment → instance detail; snapshot → source volume detail; volume → source snapshot / volume detail

> There are no Admin actions in phase 1 — the scope is entirely read-only.

---

## 6. Release Scope & Prioritization

Phase 1 is read-only; all mutation is deferred to a later phase.

**Minimum shippable first release (MVP):** the **Volumes scope tab shell** (Volumes · Snapshots)
with the **Volumes tab** (volumes list) + the **volume detail view (metadata + attachments)**.
This alone delivers the core value — "see my volumes, their state and what they're attached
to" — and is independently releasable. The tab shell ships in the MVP so the Snapshots tab is a
drop-in fast-follow rather than a re-layout. The list's **row overflow menu** ships in the MVP
carrying its single phase-1 item ("View details"); it is included now because it is the
designated extension point for later mutation actions, and wiring it in from the start avoids
re-laying-out the list row when those actions arrive.

**Fast-follow (same phase, next increment):** the **Snapshots tab** (snapshots list) + the
**snapshot detail view**, plus the ID-based deep-links (volume attachment → instance; snapshot
→ volume; volume → source). Snapshots are headline functionality but are a distinct second
resource; they are sequenced immediately after the volume MVP without blocking the first
release. "Fast-follow" here means next increment within the same phase, not a lower-priority
backlog item.

**Sequencing dependencies:**

- The volume detail view must exist before the volume attachments / deep-links.
- The snapshots list must exist before the snapshot detail view.
- The snapshot → volume deep-link depends on the volume detail route existing.
- (Later increment) a "Snapshots of this volume" section on the volume detail depends on the project snapshot list being fetchable; it is deferred and not part of phase 1.

---

## 7. API Information

**CRITICAL: This information is required before UI implementation can begin**

### Details

|                           |                                  | Notes                                                        |
| ------------------------- | -------------------------------- | ------------------------------------------------------------ |
| **Service Documentation** | OpenStack Cinder (Block Storage) | Mature, widely-documented service                            |
| **API Docs**              | OpenStack Block Storage API ref  | <!-- fill in: exact link -->                                 |
| **API Spec**              | OpenStack Block Storage v3       | <!-- fill in: exact link -->                                 |
| **API stable?**           | [x] Yes [ ] No                   | Cinder v3 is mature, versioned, no breaking changes expected |
| **API available in QA?**  | [x] Yes [ ] No                   |                                                              |

> ⚠️ **Still needed**: exact links to the Cinder API docs and spec (nice-to-have — the API itself is well-known and stable).

### Authentication Mode

Keystone token via Aurora's **BFF (Backend-for-Frontend) pattern**. The client calls server-side
tRPC procedures using `projectScopedProcedure`; the server injects the `X-Auth-Token` header via
`signal-openstack`. **The browser never handles the raw Keystone token.** All reads are
project-scoped to the active project.

### Rate Limits / Throttling

The backing calls are the standard Cinder list endpoints — `GET /volumes/detail` and
`GET /snapshots/detail` — one list call per view, with no per-item fan-out (the detail views
reuse the same objects). Request volume is low. No special throttling handling is anticipated
for phase 1.

### Error Response Shape

The UI must handle the following states, following **Aurora's existing prior art** (the
compute / network scopes) and the **Juno UX guidelines** for error / loading / empty /
unauthorized states — no new patterns are invented:

- **No volumes / no snapshots in project (authorized):** a friendly empty state ("No volumes in this project" / "No snapshots in this project"), not an error.
- **403 / not authorized:** the standard unauthorized state (ties to the `canI` check in §8).
- **Backend / network error (5xx, timeout):** a generic error state with a retry affordance — never a blank page or stack trace.
- **Empty attachment list:** inline empty state ("Not attached").
- **Partial / tolerant parsing:** the server procedure parses the Cinder response with a tolerant schema; if an individual field is missing the view renders `- -` for it rather than failing the whole page.

### OpenStack Service Catalog Registration

#### Service Catalog Entry

| Property                | Value                                    | Confirmed?     |
| ----------------------- | ---------------------------------------- | -------------- |
| **Service Name**        | cinderv3                                 | [ ] Yes [ ] No |
| **Service Type**        | volumev3 (a.k.a. block-storage / volume) | [ ] Yes [ ] No |
| **Service Description** | OpenStack Cinder block storage           | [ ] Yes [ ] No |
| **API Version**         | v3                                       | [ ] Yes [ ] No |

> ⚠️ **To confirm at build:** the exact catalog **type** and **name** Cinder registers as in the target deployment. Cinder commonly appears as type `volumev3` / name `cinderv3`, but some deployments use `block-storage` or `volume`. The nav gate must match whatever the deployment uses (see Appendix — the codebase supports both an exact `serviceIndex[type]?.[name]` check and a name-only `hasServiceByName` check).

#### How will the UI discover the service:

Via the Keystone catalog. The navigation entry appears only when the Cinder service is in the
catalog, using Aurora's `getServiceIndex(...)` check plus a `beforeLoad` catalog guard on the
new scope route — the same guard pattern the existing scopes use.

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack**

Keystone (OpenStack-backed Aurora), via the BFF pattern described in §7.

**Required roles or equivalent**

Authorization is expressed **behaviorally, not as hard-coded Keystone role names**. Entitlement
is determined by Aurora's `canI`-style capability-validation function, which checks the user's
roles against Cinder's OpenStack (oslo.policy) policy for the relevant read actions — e.g.
`volume:get_all` / `volume:get` and `volume:get_all_snapshots` / `volume:get_snapshot`. The
specific roles are intentionally **not** specified here, because they are authoritatively
defined by whatever Cinder policy the deployment uses.

> **Implementation note (not a stakeholder gap):** the exact policy actions must be confirmed against the actual Cinder policy during implementation.

**Scope**

- [x] Project-scoped
- [ ] Domain-scoped
- [ ] Both
- [ ] Other (specify):

**Who is explicitly denied?**

Any user without the Cinder read capability for the active project. Because Aurora's navigation
is catalog-driven, the Volumes entry simply does not appear where the Cinder service is
unavailable. A user who reaches the view without the capability sees the standard unauthorized
state (not a crash or blank page). Because the scope is entirely read-only, there is no per-row
permission logic.

### Dependencies on Other Teams or Services

**Blocking services**

- **Cinder** in the target region(s) — the one true backing service; already available and stable.

**Prerequisites**

- **New Aurora scope** (routing, catalog guard, nav, server router) — net-new on both client and server; no other team required.

**Soft dependency**

- The **Instances scope** must exist for the volume-attachment → instance deep-link (Story 2). If the read-only Instances scope is absent from the catalog, the deep-link degrades to showing the `server_id` only — a graceful-degradation dependency, not a hard blocker.

**Cross-team approvals needed**

> **Deferred (non-blocking):** whether Aurora core-team sign-off is required to add a new built-in scope has not been confirmed (Q-N2). This is a process question, not an engineering gap, and does not block the BRD from review.

---

## 9. Rollout & Support

### Rollout Strategy

> **Deferred (non-blocking) — Q-N1:** the rollout approach has not been finalized. For a read-only, catalog-gated scope the risk is low; the **recommended default** is to ship it enabled wherever the Cinder service is in the catalog (no feature flag). Confirm before go-live whether a feature flag or region-by-region rollout is preferred.

- [ ] Feature flag:
- [ ] Region-by-region rollout:
- [ ] Dark launch (shipped but hidden):
- [ ] Beta cohort:
- [ ] All-at-once
- [ ] Other (specify):

### Who needs to be informed before go-live?

> **Deferred (non-blocking):** go-live communication list not yet specified (Q-N1).

---

## Appendix: Framework Notes (Aurora)

These are settled framework facts (not open requirements), recorded to orient implementation:

- **Scope registration:** built-in Pattern A — file-based routes under `$projectId/…`, nav section/entry in `buildNavSections.ts`, server tRPC router via `buildBaseRouter()`. **Net-new on both tiers** (unlike Instances; closest precedent is the Networks scope, which was also net-new).
- **Auth:** BFF; `projectScopedProcedure`; server injects `X-Auth-Token`; client never holds the token. Server service handle: `ctx.openstack?.service("<cinder-type>")`.
- **Catalog guard:** `getServiceIndex` builds `index[type][name]`; the codebase also provides a name-only `hasServiceByName(serviceIndex, name)` helper used by the object-storage nav where the catalog type string varies. The Cinder gate should use whichever matches the deployment's catalog registration.
- **Cross-scope deep-link prior art:** the Networks scope's port → router deep-link (ID-based, no extra API call, graceful degradation) is the model for the volume → instance and snapshot → volume links.
- **List toolbar prior art:** sibling list views compose `DataGridToolbar` + `SearchInput` + the shared `ListToolbar/{SortInput,FiltersInput,SelectedFilters}` sub-components.

> ⚠️ **Still needed (Aurora developer, not stakeholder) — Q-F7:** whether any near-real-time refresh of volume/snapshot status is wanted (volumes have transitional states like `creating` / `attaching`). For a read-only phase 1 this is likely unnecessary; if desired later, confirm `refetchInterval` vs. an SSE subscription with an Aurora developer. Not a blocker for phase 1.

> ⚠️ **Still needed (Aurora developer, not stakeholder) — Q-F8:** whether the **"Snapshots of this volume"** section (Story 2) ships in phase 1. It is derived client-side from the project snapshot list (`snapshot.volume_id` filter) with no extra backing call and no documented server-side `?volume_id` filter (§7). Desirable and cheap; confirm with an Aurora developer whether the volume-detail view may reuse the snapshot-list data or should stay limited to the single volume object. Not a blocker for the volume-detail MVP.

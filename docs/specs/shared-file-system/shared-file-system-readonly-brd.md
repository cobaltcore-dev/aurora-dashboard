# Business Requirements Document (BRD) for Shared File System Storage (read-only) scope

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Shared File System Storage (read-only) scope for Aurora Dashboard                                                  |
| **Submitted By**                | <!-- fill in -->                                                                                                   |
| **Team**                        | Team 2 – Specs and BRDs                                                                                            |
| **Date**                        | 2026-11-09                                                                                                         |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [x] Medium &nbsp;&nbsp; [ ] Low                                    |
| **Target Release Date/Quarter** | <!-- fill in -->                                                                                                   |
| **Status**                      | [ ] Draft &nbsp;&nbsp; [x] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [ ] Implemented |

> **Note (deferred, non-blocking):** submitter and target release quarter are not yet recorded (Q-N4); priority is provisionally **Medium**. These are nice-to-have document-control fields and do not block engineering review.

---

## 1. Summary (2-3 sentences)

A new **read-only Shared File System Storage scope** in the Aurora Dashboard that lets project
members inspect the shared file systems (OpenStack Manila) in their own project. Users can list
their project's **shares** and open a share to see its full metadata, export locations, and its
related **snapshots** and **replicas**; they can also list the project's **share networks** and
**security services** and open each for its detail. Phase 1 is strictly read-only — no create,
extend, shrink, delete, snapshot/revert, manage/unmanage, or replica promotion; mutation is a
deliberately separate later phase.

---

## 2. Business Justification

### Why does this need a UI implementation?

Today, project members who want to inspect their file shares must use the `openstack share`
CLI or the raw Manila API. That requires credential setup, knowledge of the right commands, and
manually cross-referencing a share against its snapshots, replicas, the share network it is
exported on, and the security services (LDAP/AD/Kerberos) that network uses. Aurora already
surfaces **Compute**, **Network**, **block storage (Volumes)**, and **object storage
(Swift/Ceph)** — but **shared file storage is entirely missing**. A read-only UI gives these
same users share and share-network visibility **in context, with no CLI**, and surfaces the
share↔snapshot, share↔replica, share↔share-network and share-network↔security-service
relationships that are tedious to assemble by hand.

### Expected Impact

**If we implement this UI:**

- Faster self-service answers to "what shares do I have, how big, what protocol, what status, and what are they exported on?" and "which snapshots / replicas exist for a share?" without leaving Aurora.
- Fewer "can someone check my share / share network?" tickets routed to operators.
- Completes Aurora's storage story — shared file storage joins the already-present block storage and object storage.

**If we DON'T implement this UI:**

- Project members stay CLI-dependent for basic shared-file-storage questions.
- Aurora's storage coverage stays block- and object-only; shared file storage has no surface at all.
- The gap continues to push inspection load onto operators.

---

## 3. Target Surface

**Which UI surface will host this functionality? (single-select)**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other (specify):
- [ ] I don't know

### Why this surface?

This is a new scope, and the general rule is that new scopes go to Aurora directly. Shares,
share networks and security services are built-in OpenStack (Manila) resources, so they use
Aurora's **built-in scope pattern ("Pattern A")**: file-based TanStack Router routes under
`…/projects/$projectId/shared-file-system/…`, a navigation entry registered in
`buildNavSections.ts`, and a server-side tRPC router registered via `buildBaseRouter()`.
**Neither a client surface nor a server-side router exists yet for Manila** — this is net-new on
both tiers (closest precedent is the **Volumes** scope, which was also net-new and also presents
multiple resources as tabs, and the **Networks** scope, which uses nested list-in-detail
sub-tables and ID-based cross-scope deep-links). Shared file storage is kept as its **own
scope**, separate from block storage (Volumes) and object storage (Swift/Ceph), because they are
distinct concepts that happen to share the word "storage". Within this scope, the three
project-wide resources are presented as **three tabs — Shares · Share Networks · Security
Services**; snapshots and replicas are **not** tabs — they are shown nested inside an
individual share's detail (a share's snapshots and a share's replicas), mirroring how the
Networks scope nests subnets/ports inside a network and how the Volumes scope shows
"Snapshots of this volume" on the volume detail.

---

## 4. Out-of-Scope / Non-Goals

- **No mutation.** Create, extend/shrink, delete, snapshot-create, revert-to-snapshot, manage/unmanage, replica create/promote/resync, and share-network / security-service create/update/delete are explicitly excluded in phase 1. The row overflow menu is scaffolded for future mutation actions but carries only read-only navigation items now.
- **No access-rule management.** Viewing/creating/deleting share access rules (`GET/POST /shares/{id}/action` allow/deny access) and mount/export credentials is out of scope in phase 1 (read-only export **locations** are shown; access **rules** are not).
- **No cross-project / admin-wide or per-host views.** Operation is strictly project-scoped; `all_tenants` listing, per-backend/host and share-server (`share_server_id`, `host`) admin views are out of scope.
- **No share groups.** Manila _share groups_ (`share_group_id`) are not surfaced as their own resource in phase 1; a share's `share_group_id` is shown only as a plain ID. (Deferred — see §6.)
- **No share backups.** Manila _backups_ (`source_backup_id`, since v2.80) are out of scope in phase 1.
- **No Neutron name-resolution.** A share network's subnets carry `neutron_net_id` / `neutron_subnet_id`; the UI shows those IDs and may deep-link to the Networks scope by ID, but does **not** resolve them to the Neutron network/subnet _name_ (that would require a per-row Neutron call — an N+1). See §5.1 Story 5 for the deliberate ID-based deep-link exception.
- **No block-storage or object-storage content.** Cinder volumes and Swift/Ceph buckets are not surfaced here; they remain owned by their existing scopes.

---

## 5.1 User Stories

### Definitions

#### User personas:

| Persona                 | Description                                                                                                                                                                                                                                                                                                                                 | Roles                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Project Member (Viewer) | Any user with read access to the project's shared file systems. Can inspect shares, their snapshots and replicas, share networks, and security services. Performs **no** mutations. In a read-only phase there is no behavioral difference between a developer and an operator within the project — all perform the same read-only actions. | Determined by Aurora's `canI`-style capability check against Manila's OpenStack policy (see §8), not by a hard-coded role name. |

> A distinct "Storage Admin" persona (create/extend/delete shares, manage access rules, promote replicas) is expected to be introduced in a later mutation phase, but is out of scope here.

#### Summary of UI functionality

A Project Member can: list their project's shares; open a share to see its full metadata, export
locations, snapshots, and replicas; list their project's share networks; open a share network to
see its subnets (and the Neutron net/subnet each maps to) and its associated security services;
list their project's security services; and open a security service to see its configuration.
Everything is read-only. The three project-wide resources live in **one Shared File System scope
presented as three tabs** (Shares · Share Networks · Security Services), each a full list with
its own detail view, cross-linked by ID-based deep-links (share → share network; share snapshot
→ source share; share network subnet → Neutron network).

### Story 1: List project shares

**As a** Project Member (Viewer)
**I want to** see a list of the file shares in my project
**So that** I can get an overview of my project's shared file storage at a glance

**Acceptance Criteria:**

- [ ] Lists all shares in the current project in the **Shares tab** of the scope (the default tab; peer to the Share Networks and Security Services tabs — see Stories 4 and 6). Columns appear in this order: **Name/ID · Protocol · Size · Share type · Availability Zone · Visibility · Share network · Created · Status · ⋮ (menu)**. Each row shows:
  - [ ] **Name** — with the share's **ID shown beneath the name** (no separate ID column)
  - [ ] **Protocol** (`share_proto`: `NFS`, `CIFS`, `CephFS`, `GlusterFS`, `HDFS`, `MAPRFS`)
  - [ ] **Size (GiB)**
  - [ ] **Share type** — the `share_type_name` when present (falls back to the `share_type` UUID)
  - [ ] **Availability Zone** (`availability_zone`)
  - [ ] **Visibility** — "Public" when `is_public` is true, "Private" otherwise
  - [ ] **Share network** — the `share_network_id` when set; "—" when unset. In the list this is a **plain ID only — no Neutron/share-network name resolution and no deep-link** (the share-network deep-link lives in the share detail, see Story 2)
  - [ ] **Created** timestamp
  - [ ] **Status** — a visible status indicator; Manila share status values include `available`, `creating`, `creating_from_snapshot`, `deleting`, `error`, `error_deleting`, `extending`, `extending_error`, `shrinking`, `shrinking_error`, `migrating`, `reverting`, `reverting_error`, `manage_starting`, `manage_error`, `inactive`, `awaiting_transfer` (the renderer must tolerate any string Manila returns)
  - [ ] a **row overflow menu** (last column) listing the actions available on that row
- [ ] The list is **searchable** by name and ID
- [ ] The list is **sortable** by name, status, size, and created timestamp
- [ ] The list is **filterable** by status, protocol, share type, availability zone, and visibility
- [ ] The list is **not paginated** in phase 1: all rows render, and search / sort / filter are client-side (see engineering decision E5 in the spec); the page size is not user-configurable
- [ ] Description, metadata, export locations, snapshots, replicas, `snapshot_id`, `share_group_id`, and capability flags are **not** shown in the list — they live in the detail view

**Notes:**

> The row overflow menu is the designated extensibility point for future mutation actions. In phase 1 it contains exactly one item — **"View details"** (navigates to the share detail view). No other items appear in phase 1; the "View details" action is equivalent to activating the row. All list search/sort/filter operates on fields already present in the single `GET /shares/detail` list response — no extra API calls and no server-side query params required in phase 1.

### Story 2: View share details

**As a** Project Member (Viewer)
**I want to** open a share and see all its metadata, where it is exported, and its related objects
**So that** I can understand its configuration, how to mount it, and what depends on it

**Acceptance Criteria:**

- [ ] Shows all list fields plus the fields the list omits: Name, ID, Status, Size (GiB), Protocol, Share type (name + UUID), Availability Zone, Visibility (`is_public`), Description, Metadata (key/value pairs), Created / Updated timestamps, and the capability flags (`snapshot_support`, `create_share_from_snapshot_support`, `revert_to_snapshot_support`, `mount_snapshot_support`, `replication_type`, `has_replicas`) when present
- [ ] Shows the share's **export locations** as a read-only list: for each export location show the export `path` and the `preferred` flag; an empty set renders an explicit empty state ("No export locations"). In Manila ≥ v2.9 export locations are a sub-resource (`GET /shares/{id}/export_locations`), so this is one additional scoped call — see §7
- [ ] Shows the share's **source** when present — created-from-snapshot `snapshot_id` as an ID-based deep-link to that snapshot's detail (a share-snapshot detail), and `share_group_id` as a plain ID — each degrading gracefully to the raw ID
- [ ] **Exception — share-network deep-link:** the share's `share_network_id` is rendered as a **deep-link to that share network's detail view** in the Share Networks tab, keyed on the ID already present in `share_network_id`. This requires only route construction (no extra API call). If the ID does not resolve to a visible share network, the link **degrades gracefully to showing just the ID**
- [ ] **Snapshots of this share** — the share detail shows a read-only list of the snapshots created from this share (Name/ID, Status, Size, Created), each row deep-linking to the share-snapshot detail. This section is backed by a scoped Manila call that filters snapshots to the share server-side: `GET /snapshots/detail?share_id=<this share id>`. An empty set renders an explicit empty state ("No snapshots for this share")
- [ ] **Replicas of this share** — when the deployment's negotiated Manila microversion is ≥ **2.11** and the share reports `has_replicas = true`, the share detail shows a read-only list of the share's replicas (ID, Replica state, Status, Availability Zone, Created), backed by `GET /share-replicas/detail?share_id=<this share id>`. The `replica_state` (`active` / `in_sync` / `out_of_sync` / `error`) is shown distinctly from the provisioning `status` (`available` / `creating` / `deleting` / `error` / `error_deleting`). When replicas are unsupported by the microversion the section is **omitted entirely** (not shown as empty); when supported but empty it renders "No replicas for this share". _(Microversion handling — see engineering decision E8 / open item O6.)_
- [ ] Description and metadata are shown when present; when absent, the field renders an explicit empty state (`- -`) rather than being omitted
- [ ] Access rules, share-server/host admin fields, block-storage and object-storage content are **not** shown here

### Story 3: View snapshots and replicas of a share (nested)

**As a** Project Member (Viewer)
**I want to** see the point-in-time snapshots and the replicas that exist for a share
**So that** I can see what recovery points and copies exist and from where

**Acceptance Criteria:**

- [ ] Snapshots and replicas are shown as **nested sections inside the share detail** (there is no standalone project-wide snapshots or replicas list/tab in phase 1 — they are always scoped to their parent share)
- [ ] For each **snapshot**, show: Name, ID, Status (`available`, `creating`, `deleting`, `error`, `error_deleting`, `restoring`, `migrating`, `manage_starting`, `manage_error`, … — tolerate any string), Size (GiB), Created; each row deep-links to the share-snapshot detail
- [ ] For each **replica** (microversion ≥ 2.11 only), show: ID, Replica state (`active` / `in_sync` / `out_of_sync` / `error`), Status (`available` / `creating` / `deleting` / `error` / `error_deleting`), Availability Zone, Created
- [ ] An empty snapshot set shows an inline empty state ("No snapshots for this share"); an empty replica set (when the section is shown at all) shows "No replicas for this share"
- [ ] There is a dedicated **share-snapshot detail route** reachable by clicking a snapshot row: it shows Name, ID, Status, Size (GiB), the source `share_id` (as an ID-based deep-link back to the share detail), Protocol, Description, Created. _(Replicas do **not** get their own detail route in phase 1 — they are shown only in the nested list.)_

### Story 4: List project share networks

**As a** Project Member (Viewer)
**I want to** see a list of the share networks in my project
**So that** I can see which networks my shares are exported on

**Acceptance Criteria:**

- [ ] Lists all share networks in the current project in the **Share Networks tab** of the scope (a peer tab to the Shares list). Each row shows:
  - [ ] **Name** — with the share network's **ID shown beneath the name**
  - [ ] **Subnet count** — the number of entries in `share_network_subnets`
  - [ ] **Created** timestamp
  - [ ] a **row overflow menu** (last column) with a single **"View details"** item (phase-1 extension point)
- [ ] The list is **searchable** by name and ID
- [ ] The list is **sortable** by name, subnet count, and created timestamp
- [ ] The list is **not paginated** in phase 1 (see E5); all rows render, search / sort are client-side

### Story 5: View share network details (subnets + Neutron mapping + security services)

**As a** Project Member (Viewer)
**I want to** open a share network and see its subnets, the Neutron networks they map to, and its security services
**So that** I can understand how my shares reach the tenant network and how access is secured

**Acceptance Criteria:**

- [ ] Shows: Name, ID, Description, Created / Updated timestamps
- [ ] Shows the share network's **subnets** as a nested sub-table. For each subnet (from `share_network_subnets`, Manila ≥ v2.51; on older microversions the fields live directly on the share network — see E8/O6) show: Subnet ID, Availability Zone, CIDR, IP version (4/6), Gateway, Network type, MTU, Segmentation ID, and the **Neutron network** (`neutron_net_id`) and **Neutron subnet** (`neutron_subnet_id`) IDs
- [ ] **Exception — Neutron deep-link:** each subnet's `neutron_net_id` is rendered as a **deep-link to that network's detail view** in the Networks scope, keyed on the ID already present in `neutron_net_id`. This requires only route construction (no extra API call). If the Networks scope is unavailable in the catalog, the link **degrades gracefully to showing just the ID**. (The `neutron_subnet_id` is shown as a plain ID — the Networks scope nests subnets inside a network and has no standalone subnet route.)
- [ ] Shows the share network's **associated security services** as a read-only linked list, derived from `GET /security-services/detail?share_network_id=<this share network id>` — for each, show Name, Type (`ldap` / `kerberos` / `active_directory`), and a deep-link to its security-service detail (Story 7). An empty set renders an explicit empty state ("No security services")
- [ ] An empty subnet set shows an inline empty state ("No subnets")

### Story 6: List project security services

**As a** Project Member (Viewer)
**I want to** see a list of the security services in my project
**So that** I can see the LDAP / Active Directory / Kerberos configurations available to my share networks

**Acceptance Criteria:**

- [ ] Lists all security services in the current project in the **Security Services tab** of the scope (a peer tab). Each row shows:
  - [ ] **Name** — with the security service's **ID shown beneath the name**
  - [ ] **Type** — `ldap` / `kerberos` / `active_directory` (tolerate any string)
  - [ ] **Status** — tolerate any string (observed values include `new`, `active`, `error`)
  - [ ] **DNS IP** (`dns_ip`) and **Server** (`server`) when present
  - [ ] **Created** timestamp
  - [ ] a **row overflow menu** (last column) with a single **"View details"** item
- [ ] The list is **searchable** by name and ID
- [ ] The list is **sortable** by name, type, and created timestamp
- [ ] The list is **filterable** by type
- [ ] The list is **not paginated** in phase 1 (see E5); all rows render, search / sort / filter client-side

### Story 7: View security service details

**As a** Project Member (Viewer)
**I want to** open a security service and see its configuration
**So that** I can understand how access to my shares is authenticated

**Acceptance Criteria:**

- [ ] Shows: Name, ID, Type, Status, DNS IP (`dns_ip`), Server (`server`), Domain (`domain`), User (`user`), Organizational unit (`ou`, when present), Description, Created / Updated timestamps
- [ ] The **`password` field is never shown** (it is sensitive/write-only) — it is omitted entirely, not rendered as empty
- [ ] Description and other optional fields are shown when present; when absent, the field renders an explicit empty state (`- -`)

---

## 5.2 Required User Actions

**Viewer (Project Member):**

- [ ] View the list of shares (search, sort, filter — see Story 1)
- [ ] View a share's details (full metadata + export locations + nested snapshots + nested replicas)
- [ ] View a share snapshot's details (metadata + source share)
- [ ] View the list of share networks (search, sort — see Story 4)
- [ ] View a share network's details (subnets, Neutron mapping, associated security services)
- [ ] View the list of security services (search, sort, filter — see Story 6)
- [ ] View a security service's details
- [ ] Follow an ID-based deep-link: share → share network; share snapshot → source share; share network subnet → Neutron network detail; share network → security service detail

> There are no Admin actions in phase 1 — the scope is entirely read-only.

---

## 6. Release Scope & Prioritization

Phase 1 is read-only; all mutation is deferred to a later phase.

**Minimum shippable first release (MVP):** the **scope tab shell** (Shares · Share Networks ·
Security Services) with the **Shares tab** (shares list) + the **share detail view (metadata +
export locations + nested snapshots + nested replicas)** + the **share-snapshot detail view**.
This alone delivers the core value — "see my shares, their state, how to mount them, and which
snapshots/replicas they have" — and is independently releasable. The tab shell ships in the MVP
so the Share Networks and Security Services tabs are drop-in fast-follows rather than a
re-layout. The list's **row overflow menu** ships in the MVP carrying its single phase-1 item
("View details"); it is included now because it is the designated extension point for later
mutation actions, and wiring it in from the start avoids re-laying-out the list row when those
actions arrive.

**Fast-follow (same phase, next increment):** the **Share Networks tab** (list + detail with
subnets, Neutron mapping, and associated security services) and the **Security Services tab**
(list + detail), plus the ID-based deep-links (share → share network; share network subnet →
Neutron network; share network → security service). Share networks and security services are
headline functionality but are distinct secondary resources; they are sequenced immediately
after the shares MVP without blocking the first release. "Fast-follow" here means next increment
within the same phase, not a lower-priority backlog item.

**Sequencing dependencies:**

- The share detail view must exist before the nested snapshots / replicas and the share-snapshot detail.
- The share-snapshot detail route must exist before the snapshot deep-links resolve.
- The share network detail must exist before its subnets / security-services sub-tables and the Neutron deep-link.
- The security-service detail must exist before the share-network → security-service deep-link.
- The share → share-network deep-link depends on the share-network detail route existing.

**Deferred to a later phase (not phase 1):** share groups (`share_group_id` as its own resource), share backups, access-rule viewing/management, replica detail routes and replica promotion, and any mutation.

---

## 7. API Information

**CRITICAL: This information is required before UI implementation can begin**

### Details

|                           |                                        | Notes                                                            |
| ------------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| **Service Documentation** | OpenStack Manila (Shared File Systems) | Mature, widely-documented service                                |
| **API Docs**              | OpenStack Shared File System API ref   | https://docs.openstack.org/api-ref/shared-file-system/           |
| **API Spec**              | OpenStack Shared File System API v2    | Microversioned (negotiated via `X-OpenStack-Manila-API-Version`) |
| **API stable?**           | [x] Yes [ ] No                         | Manila v2 is mature and microversioned; new fields are additive  |
| **API available in QA?**  | [x] Yes [ ] No                         | Manila is deployed and in the Keystone catalog in qa-de-1        |

### Authentication Mode

Keystone token via Aurora's **BFF (Backend-for-Frontend) pattern**. The client calls server-side
tRPC procedures using `projectScopedProcedure`; the server injects the `X-Auth-Token` header via
`signal-openstack`, and the server sets the microversion header
`X-OpenStack-Manila-API-Version` (see E8). **The browser never handles the raw Keystone token.**
All reads are project-scoped to the active project.

### Rate Limits / Throttling

The backing calls are the standard Manila list endpoints — `GET /shares/detail`,
`GET /share-networks/detail`, `GET /security-services/detail` — one list call per tab view, with
no per-item fan-out. The **share detail view** issues a small number of additional scoped calls:
`GET /shares/{id}/export_locations` (export locations are a sub-resource since v2.9),
`GET /snapshots/detail?share_id=<id>` (snapshots of this share), and — when the microversion
supports replicas and `has_replicas` is true — `GET /share-replicas/detail?share_id=<id>`. The
**share network detail** issues one additional scoped call,
`GET /security-services/detail?share_network_id=<id>` (associated security services). These are a
bounded handful of calls per detail open, not a per-row fan-out. Request volume is low. No
special throttling handling is anticipated for phase 1.

### Error Response Shape

The UI must handle the following states, following **Aurora's existing prior art** (the
Networks / Volumes scopes) and the **Juno UX guidelines** for error / loading / empty /
unauthorized states — no new patterns are invented:

- **No shares / share networks / security services in project (authorized):** a friendly empty state ("No shares in this project", etc.), not an error.
- **403 / not authorized:** the standard unauthorized state (ties to the `canI` check in §8).
- **Backend / network error (5xx, timeout):** a generic error state with a retry affordance — never a blank page or stack trace.
- **Empty nested sections:** inline empty states ("No export locations", "No snapshots for this share", "No subnets", "No security services").
- **Partial failure:** if the share detail loads but a nested call fails (e.g. export locations returns 500 while the share loaded), the error is scoped to that section and the rest of the detail stays usable.
- **Microversion-gated sections:** when the negotiated microversion does not support replicas (< 2.11), the replicas section is omitted entirely (not shown as an error).
- **Partial / tolerant parsing:** the server procedure parses the Manila response with a tolerant schema; if an individual field is missing the view renders `- -` for it rather than failing the whole page.

### OpenStack Service Catalog Registration

#### Service Catalog Entry

| Property                | Value                                | Confirmed?     |
| ----------------------- | ------------------------------------ | -------------- |
| **Service Name**        | manilav2                             | [x] Yes [ ] No |
| **Service Type**        | sharev2                              | [x] Yes [ ] No |
| **Service Description** | OpenStack Manila shared file systems | [x] Yes [ ] No |
| **API Version**         | v2 (microversioned)                  | [x] Yes [ ] No |

#### Endpoint Registration

**Public Endpoint:**

- **Interface Type:** public
- **URL:** `https://share-3.qa-de-1.cloud.sap/v2`
- **Available in Regions:** qa-de-1

**Internal Endpoint:**

- **Interface Type:** internal
- **URL:** `http://manila-api.monsoon3.svc.kubernetes.qa-de-1.cloud.sap:8786/v2`
- **Available in Regions:** qa-de-1

#### How will the UI discover the service:

Via the Keystone catalog. The navigation entry appears only when the Manila service is in the
catalog, using Aurora's `getServiceIndex("sharev2", "manilav2")` check plus a `beforeLoad` catalog guard on the new
scope route — the same guard pattern the existing scopes use. **Because Manila is often absent,
the catalog gate is doing real work here** (unlike Neutron, which is effectively always present).

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack**

Keystone (OpenStack-backed Aurora), via the BFF pattern described in §7.

**Required roles or equivalent**

Authorization is expressed **behaviorally, not as hard-coded Keystone role names**. Entitlement
is determined by Aurora's `canI`-style capability-validation function, which checks the user's
roles against Manila's OpenStack (oslo.policy) policy for the relevant read actions — e.g.
`share:get_all` / `share:get`, `share_snapshot:get_all` / `share_snapshot:get`,
`share_replica:get_all`, `share_network:get_all` / `share_network:get`,
`security_service:get_all` / `security_service:get`. The specific roles are intentionally **not**
specified here, because they are authoritatively defined by whatever Manila policy the deployment
uses.

> **Implementation note (not a stakeholder gap):** the exact policy actions must be confirmed against the actual Manila policy during implementation.

**Scope**

- [x] Project-scoped
- [ ] Domain-scoped
- [ ] Both
- [ ] Other (specify):

**Who is explicitly denied?**

Any user without the Manila read capability for the active project. Because Aurora's navigation
is catalog-driven, the Shared File System entry simply does not appear where the Manila service
is unavailable. A user who reaches the view without the capability sees the standard unauthorized
state (not a crash or blank page). Because the scope is entirely read-only, there is no per-row
permission logic.

### Dependencies on Other Teams or Services

**Blocking services**

- **Manila** in the target region(s) — the one true backing service. ⚠️ **Not guaranteed present** in every region (unlike Neutron/Nova/Cinder); its absence simply hides the scope via the catalog gate.

**Prerequisites**

- **New Aurora scope** (routing, catalog guard, nav, server router) — net-new on both client and server; no other team required.

**Soft dependency**

- The **Networks scope** should exist for the share-network subnet → Neutron network deep-link (Story 5). If the read-only Networks scope is absent from the catalog, the deep-link degrades to showing the `neutron_net_id` only — a graceful-degradation dependency, not a hard blocker.

**Cross-team approvals needed**

No special Aurora core-team sign-off needed. Everything is already set up; standard PR review process applies.

---

## 9. Rollout & Support

### Rollout Strategy

- [ ] Feature flag:
- [ ] Region-by-region rollout:
- [ ] Dark launch (shipped but hidden):
- [ ] Beta cohort:
- [x] All-at-once (catalog-gated)
- [ ] Other (specify):

**Decision:** ship enabled everywhere Manila is in the Keystone service catalog; no feature flag needed. Manila's absence in most regions acts as a natural dark-launch.

### Who needs to be informed before go-live?

UI team handles go-live coordination internally. No external cross-team communication is required.

---

## Appendix: Framework Notes (Aurora)

These are settled framework facts (not open requirements), recorded to orient implementation:

- **Scope registration:** built-in Pattern A — file-based routes under `$projectId/shared-file-system/…`, nav section/entry in `buildNavSections.ts`, server tRPC router via `buildBaseRouter()`. **Net-new on both tiers** (closest precedent is the Volumes scope — also net-new, also multi-resource tabs — and the Networks scope — nested list-in-detail + ID-based deep-links).
- **Auth:** BFF; `projectScopedProcedure`; server injects `X-Auth-Token`; client never holds the token. Server service handle: `ctx.openstack?.service("sharev2")`. The server also sets the Manila microversion header `X-OpenStack-Manila-API-Version`.
- **Catalog guard:** `getServiceIndex("sharev2", "manilav2")` — confirmed catalog type and name. This gate is load-bearing because Manila is frequently absent.
- **Tab-shell prior art:** the Volumes scope's Volumes · Snapshots `TabNavigation` is the model for the three Shared File System tabs.
- **Nested list-in-detail prior art:** the Networks scope nests subnets/ports inside the network detail; the Volumes scope shows "Snapshots of this volume" on the volume detail. The same patterns drive the share detail (export locations, snapshots, replicas) and the share-network detail (subnets, security services).
- **Cross-scope deep-link prior art:** the Networks scope's port → router deep-link and the Volumes scope's snapshot → volume deep-link (ID-based, no extra API call, graceful degradation) are the model for share → share network, share snapshot → share, and share-network subnet → Neutron network.
- **List toolbar prior art:** sibling list views compose `DataGridToolbar` + `SearchInput` + the shared `ListToolbar/{SortInput,FiltersInput,SelectedFilters}` sub-components.

> ⚠️ **Still needed (Aurora developer) — refresh strategy:** whether any near-real-time refresh of share/replica status is wanted in phase 1 (shares have many transitional states like `creating`, `extending`, `migrating`, and replicas have sync states). For a read-only phase 1 this is likely unnecessary; if desired later, confirm `refetchInterval` vs. an SSE subscription with an Aurora developer. Not a blocker for phase 1.

> ⚠️ **Still needed (Aurora developer) — microversion:** the exact Manila **microversion** the BFF should request via `X-OpenStack-Manila-API-Version`. Replicas (≥ 2.11), the multi-subnet share-network model (`share_network_subnets`, ≥ 2.51), export locations as a sub-resource (≥ 2.9), and `share_type_name` (≥ 2.6) all depend on it. Recommended: request a high/known microversion and tolerate missing fields. Confirm the deployment's max supported microversion at build (O6).

> ⚠️ **Still needed (Aurora developer) — microversion header mechanism:** confirm whether `signal-openstack` / Aurora's service handle already supports setting `X-OpenStack-Manila-API-Version` per-request, or whether a new BFF pattern is needed.

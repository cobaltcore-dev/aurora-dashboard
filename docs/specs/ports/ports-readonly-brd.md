# Business Requirements Document (BRD) for Fixed IPs / Ports (read-only) scope

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Fixed IPs / Ports (read-only) scope for Aurora Dashboard                                                           |
| **Submitted By**                | <!-- fill in -->                                                                                                   |
| **Team**                        | Team 2 – Specs and BRDs                                                                                            |
| **Date**                        | 2026-11-11                                                                                                         |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [x] Medium &nbsp;&nbsp; [ ] Low                                    |
| **Target Release Date/Quarter** | <!-- fill in -->                                                                                                   |
| **Status**                      | [ ] Draft &nbsp;&nbsp; [ ] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [x] Implemented |

> **Note (deferred, non-blocking):** submitter and target release quarter are not yet recorded; priority is provisionally **Medium**. These are nice-to-have document-control fields and do not block engineering review.

---

## 1. Summary (2-3 sentences)

A **read-only Fixed IPs / Ports scope** in the Aurora Dashboard that lets project members inspect all
Neutron ports in their own project from a single, project-wide view. Users can list all their
project's ports, filter and search them (e.g. by network, device type, or status), and open a
port to see its full metadata including Fixed IPs, MAC address, device assignment, and Security
Group associations. Phase 1 is strictly read-only in the UI — no create, edit, or delete
affordances; mutation is a deliberately separate later phase.

> **Baseline.** A first version of this scope **already exists on `main`** (merged in
> [#1377](https://github.com/cobaltcore-dev/aurora-dashboard/pull/1377)): the Ports list, the port
> detail page, the `portsRouter` BFF, the nav entry, and the permission keys. The polish deltas
> (Device type label, Network deep-link, Device type / Network filters, attention-first status sort,
> Zone-3 last-updated timestamp, Admin State, Port security enabled, Tags, Security Group
> deep-links, router deep-link) have been applied on top. This BRD is therefore a
> **post-implementation record** describing the full target experience as implemented.

---

## 2. Business Justification

### Why does this need a UI implementation?

Today, project members who want to inspect their ports must use the `openstack port` CLI or the
raw Neutron API. That requires credential setup, knowledge of the right commands, and manually
cross-referencing a port against its network, subnet, and attached device to understand what is
connected and how. Aurora already shows ports **nested inside a specific network's detail view**
(the Networks scope, Story 4) — but that view only answers "which ports belong to this
network?" A project member who wants to answer "show me all ports in my project, regardless of
network" — for example to find all ports attached to instances, or all ports in `DOWN` status,
or all ports with a specific IP address — has no way to do that without the CLI. A standalone
project-wide Ports scope fills this gap: it is the **portfolio view** of all ports, while the
Networks scope's nested ports sub-table remains the **per-network relational view**.

### Expected Impact

**If we implement this UI:**

- Faster self-service answers to "what ports do I have, what are their IPs, and what are they attached to?" without leaving Aurora.
- Cross-network port visibility: users can find ports by IP, MAC, or device type across all networks in one search, which is impossible from the per-network nested view.
- Fewer "can someone find which port has IP x.x.x.x?" tickets routed to operators.
- Completes Aurora's networking picture — the existing Networks scope shows topology per network; the new Ports scope shows the full project port inventory.

**If we DON'T implement this UI:**

- Project members stay CLI-dependent for any cross-network port question.
- The existing nested ports view in the Networks scope remains the only UI surface, which only works when the user already knows which network to look in.
- Debugging connectivity issues ("which port has this IP / MAC address?") continues to require CLI access.

---

## 3. Target Surface

**Which UI surface will host this functionality? (single-select)**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other (specify):
- [ ] I don't know

### Why this surface?

This is a resource within Aurora's existing `network` scope, following Aurora's **built-in scope
pattern ("Pattern A")**: file-based TanStack Router routes under
`…/projects/$projectId/network/ports/`, a navigation entry registered in `buildNavSections.ts`,
and a server-side tRPC router registered via `buildBaseRouter()`. Floating IPs, Routers,
Security Groups, Networks, **and a first version of Ports** already live in the `network` scope —
the Ports list, detail page and `portsRouter` were merged in
[#1377](https://github.com/cobaltcore-dev/aurora-dashboard/pull/1377). The remaining work (this
BRD + spec) refines that shipped feature rather than creating it from scratch.

> **Relationship to the Networks scope:** The Networks scope (BRD §5.1 Story 4) shows ports
> nested inside a network's detail view, scoped to that network (`GET /v2.0/ports?network_id=<id>`).
> That view answers "which ports belong to this network?" and is the right tool when inspecting
> a specific network's topology. The new Ports scope answers the orthogonal question: "show me
> all ports in my project" — it uses the unfiltered project-scoped port list
> (`GET /v2.0/ports?project_id=<id>`) and adds cross-network search, filter, and a dedicated
> detail view. The two views are complementary, not duplicates.

---

## 4. Out-of-Scope / Non-Goals

- **No mutation in the UI.** Create, update, and delete of ports are excluded from phase 1's UI. The `portsRouter` already exposes `create` / `update` / `delete` procedures (from #1377); in phase 1 these **stay on the server**, back no UI, and are not surfaced — they are the foundation for a later mutation phase. The row overflow menu is scaffolded for future mutation actions but carries only the read-only "Show Details" item now.
- **No cross-project / admin-wide views.** Operation is strictly project-scoped; listing ports across projects or with `all_tenants` is out of scope.
- **No device name-resolution.** The UI shows the `device_id` as a plain ID and does not resolve it to the instance or router _name_ (that would require per-row Nova/Neutron calls — an N+1). The one deliberate exception is an ID-based deep-link to the router's detail view when `device_owner = network:router_interface` (no extra API call — same pattern as the Networks scope).
- **No Security Group detail.** Security Groups are shown only as a list of IDs on the port detail; their content is owned by the existing Security Groups scope.
- **No binding extension details.** Port binding attributes (`binding:host_id`, `binding:vif_type`, `binding:vnic_type`, `binding:profile`) are admin-only fields. They are shown only when the API returns them (typically absent under project scope) and are never fetched separately.
- **No standalone "all subnets" or "all fixed IPs" view.** Fixed IPs are shown as a field on the port — there is no separate resource view for subnets or IP addresses in this scope.

---

## 5.1 User Stories

### Definitions

#### User personas:

| Persona                 | Description                                                                                                                                                                                                                                                                                         | Roles                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Project Member (Viewer) | Any user with read access to the project's networking. Can inspect all ports in the project across all networks. Performs **no** mutations. In a read-only phase there is no behavioral difference between a developer and an operator within the project — all perform the same read-only actions. | Determined by Aurora's `canI`-style capability check against Neutron's OpenStack policy (see §8), not by a hard-coded role name. |

> A distinct "Network Admin" persona is expected to be introduced in a later mutation phase, but is out of scope here.

#### Summary of UI functionality

A Project Member can: list all their project's ports across all networks with search, sort, and
filter; open a port to see its full metadata including Fixed IPs, MAC address, device
assignment, and Security Group IDs. Everything is read-only.

### Story 1: List project Fixed IPs / Ports

**As a** Project Member (Viewer)
**I want to** see a list of all Fixed IPs / Ports in my project
**So that** I can get a cross-network overview of my project's port inventory at a glance

**Acceptance Criteria:**

- [x] Lists all ports in the current project (unfiltered by network). Each row shows:
  - [x] **Name** — with the port's **ID shown beneath the name** (no separate ID column); the ID has a **copy-to-clipboard affordance**; when a port has no name, the ID is shown as the primary cell value (per `datagrid.md` writing rules)
  - [x] **Status** — a visible status indicator; possible values: `ACTIVE`, `DOWN`, `BUILD`, `ERROR`
  - [x] **Admin State** — up / down (`admin_state_up`)
  - [x] **Fixed IPs** — the IP address(es) assigned to the port; when a port has multiple Fixed IPs, all are shown (e.g. as a stacked list); when none are assigned, renders `- -`
  - [x] **Network** — the `network_id` shown as an ID with a **deep-link to that network's detail view** in the existing Networks scope; degrades gracefully to plain ID when the Networks scope is unavailable
  - [x] **Device type** — a human-friendly label derived from `device_owner` (e.g. `compute:nova` → "Instance", `network:router_interface` → "Router interface", `network:dhcp` → "DHCP agent", `network:floatingip` → "Floating IP"), with a graceful fallback to the raw `device_owner` string for unrecognized values; when `device_owner` is empty, renders `- -`
  - [x] a **row overflow menu** (last column) listing the actions available on that row
- [x] The list is **searchable** by name, ID, MAC address and Fixed IP (and subnet / device fields) — this cross-network lookup by IP / MAC is the feature's core value (§2); it is not narrowed to name + ID
- [x] The list is **sortable** by name and status (status attention-first)
- [x] The list is **filterable** by status, by device type (the human-friendly label categories above), and by network (`network_id`)
- [x] The list uses **client-side pagination** (50 rows per page); search / sort / filter are client-side (no server-side query params required in phase 1)
- [x] MAC address, Security Group IDs, and binding details are **not** shown in the list — they live in the detail view

**Notes:**

> The row overflow menu is the designated extensibility point for future mutation actions (edit/delete). In phase 1 it contains exactly one item — **"Show Details"** (navigates to the port detail view; title case, first item per `docs/guardrails/guardrails.md`), already implemented in `PortTableRow.tsx`. No other items appear in phase 1; the "Show Details" action is equivalent to activating the row. All search/sort/filter operates on fields already present in the single list response — no extra API calls.

### Story 2: View port details

**As a** Project Member (Viewer)
**I want to** open a port and see all its metadata
**So that** I can understand its full configuration — its IP assignments, what it is attached to, and which security groups apply

**Acceptance Criteria:**

- [x] Shows all list fields plus the fields the list omits: Name, ID (copy affordance), Status, Admin State, **MAC address** (copy affordance), **Fixed IPs** (each IP + subnet ID pair; subnet ID with copy affordance), **Network** (deep-link to Networks scope), **Device type** (human-friendly label), **Device ID** (`device_id`, copy affordance), **Security Groups** (list of Security Group IDs, each with a copy affordance and a deep-link to that Security Group's detail in the existing Security Groups scope), **Port security enabled** (`port_security_enabled`), Created / Updated timestamps, Description, and Tags
- [x] Fixed IPs are shown as a sub-table with two columns: IP address (copy affordance) and Subnet ID (copy affordance); when absent, renders an explicit empty state ("No Fixed IPs")
- [x] Security Groups are shown as a list of IDs with copy affordances and deep-links to the Security Groups scope; when absent, renders an explicit empty state ("No Security Groups")
- [x] **Exception — router deep-link:** when `device_owner = network:router_interface`, the Device ID is rendered as a **deep-link to that router's detail view** in the existing Routers scope, keyed on the router ID in `device_id`. No extra API call. Degrades gracefully to plain ID when the Routers scope is unavailable.
- [x] Binding attributes (`binding:host_id`, `binding:vif_type`, `binding:vnic_type`) are shown **only when the API returns them** — typically admin-only and absent under project scope; a present-but-null value renders `- -`
- [x] Description and tags are shown when present; when absent, renders `- -`

---

## 5.2 Required User Actions

**Viewer (Project Member):**

- [x] View the list of ports (search, sort, filter — see Story 1)
- [x] View a port's details (full metadata)
- [x] Copy any resource ID (port, device, subnet, Security Group) or IP address / MAC address to the clipboard
- [x] Follow a network deep-link from a port to the Networks scope detail view
- [x] Follow a router deep-link from a port (when `device_owner = network:router_interface`) to the Routers scope detail view
- [x] Follow a Security Group deep-link from a port detail to the Security Groups scope detail view

> There are no Admin actions in phase 1 — the scope is entirely read-only.

---

## 6. Release Scope & Prioritization

Phase 1 is read-only; all mutation is deferred to a later phase.

**MVP:** the **port list** — all ports in the project, searchable, sortable, and filterable by status/device-type/network, with client-side pagination and a Zone-3 last-updated timestamp. The list's **row overflow menu** carries a single "Show Details" item as the designated extension point for future mutation actions.

**Fast-follow (same phase):** the **port detail view** with full metadata — Fixed IPs, Security Groups (with deep-links), router deep-link, Admin State, Port security enabled, Tags.

Both are **implemented** as of this document.

---

## 7. API Information

### Details

|                           |                                                      | Notes                                                           |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| **Service Documentation** | OpenStack Neutron (Networking)                       | Mature, widely-documented service                               |
| **API Docs**              | https://docs.openstack.org/api-ref/network/v2/#ports | Neutron v2.0 Ports API reference                                |
| **API Spec**              | OpenStack Networking v2.0                            | Stable, versioned, no breaking changes expected                 |
| **API stable?**           | [x] Yes [ ] No                                       | Neutron v2.0 is mature, versioned, no breaking changes expected |
| **API available in QA?**  | [x] Yes [ ] No                                       | Neutron is the standard network service; present in all regions |

### Authentication Mode

Keystone token via Aurora's **BFF (Backend-for-Frontend) pattern**. The client calls server-side
tRPC procedures using `projectScopedProcedure`; the server injects the `X-Auth-Token` header via
`signal-openstack`. **The browser never handles the raw Keystone token.** All reads are
project-scoped to the active project.

### Rate Limits / Throttling

The client issues one `network.ports.list` request for the active project, without a
`network_id` filter. The BFF preserves the explicit `project_id` ownership filter and
follows Neutron's `ports_links` until all pages are collected. Existing network/subnet
name enrichment uses batched lookups, not per-port fan-out. No **server-side** UI pagination
is required; the shipped list paginates client-side at 50 rows per page.

### Error Response Shape

The UI must handle the following states, following **Aurora's existing prior art** (the
floatingips / routers / securitygroups / networks scopes) and the **Juno UX guidelines** for
error / loading / empty / unauthorized states — no new patterns are invented:

- **No ports in project (authorized):** a friendly empty state ("No ports in this project"), not an error.
- **403 / not authorized:** the standard unauthorized state (ties to the `canI` check in §8).
- **Backend / network error (5xx, timeout):** a generic error state with a retry affordance — never a blank page or stack trace.
- **Partial / tolerant parsing:** the server procedure parses the Neutron response with a tolerant schema; if an individual field is missing the view renders `- -` rather than failing the whole page.

### OpenStack Service Catalog Registration

#### Service Catalog Entry

| Property                | Value                        | Confirmed?     |
| ----------------------- | ---------------------------- | -------------- |
| **Service Name**        | neutron                      | [x] Yes [ ] No |
| **Service Type**        | network                      | [x] Yes [ ] No |
| **Service Description** | OpenStack Neutron networking | [x] Yes [ ] No |
| **API Version**         | v2.0                         | [x] Yes [ ] No |

#### How will the UI discover the service:

Via the Keystone catalog. The navigation entry appears only when the `network` service is in the
catalog, using Aurora's `getServiceIndex("network")` check plus the `beforeLoad` catalog guard in
`network.tsx` — the **same guard the existing Floating IPs / Routers / Security Groups / Networks
views use**. No new catalog integration is needed; Ports lives within the already-guarded
`network` scope.

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack**

Keystone (OpenStack-backed Aurora), via the BFF pattern described in §7.

**Required roles or equivalent**

Authorization is expressed **behaviorally, not as hard-coded Keystone role names**. Entitlement
is determined by Aurora's `canI`-style capability-validation function, which checks the user's
roles against Neutron's OpenStack (oslo.policy) policy for the relevant read action — the rule
`get_port` (Neutron's `networking.json` defines no `get_ports` rule; Aurora's existing
`network:ports:list` / `network:ports:read` keys already map to `get_port`). The specific roles
are intentionally **not** specified here, because they are authoritatively defined by whatever
Neutron policy the deployment uses.

> **Implementation note (not a stakeholder gap):** the exact policy actions must be confirmed
> against the actual Neutron policy during implementation, consistent with the sibling network
> resources.

**Scope**

- [x] Project-scoped
- [ ] Domain-scoped
- [ ] Both
- [ ] Other (specify):

**Who is explicitly denied?**

Any user without the Neutron read capability for the active project. Because Aurora's navigation
is catalog-driven, the Ports entry simply does not appear where the `network` service is
unavailable. A user who reaches the view without the capability sees the standard unauthorized
state (not a crash or blank page). Because the scope is entirely read-only, there is no per-row
permission logic.

### Dependencies on Other Teams or Services

**Blocking services**

- **Neutron** in the target region(s) — the one true backing service; already available and stable.

**Prerequisites (already satisfied)**

- **Aurora `network` scope** (catalog guard, routing, nav) — already present; a first version of Ports is already added within it (#1377). Listed as a prerequisite rather than a blocker because it exists today and requires no other team.

**Soft dependencies**

- The **Networks resource** enables the port → network deep-link (Stories 1 and 2). Render it only when the `network` catalog service is present and `networks` is enabled by the resource allow/deny configuration; otherwise show the plain network ID.
- The **Routers resource** enables the port → router deep-link (Story 2). Apply the same catalog and resource-visibility checks for `routers`; otherwise show the plain router ID.
- The **Security Groups resource** enables the port → Security Group deep-links (Story 2). Apply the same checks for `securitygroups`; otherwise show plain Security Group IDs.

**Cross-team approvals needed**

> **Deferred (non-blocking):** whether Aurora core-team sign-off is required to add a new
> resource within an existing built-in scope has not been confirmed. This is a process question,
> not an engineering gap, and does not block the BRD from review.

---

## 9. Rollout & Support

### Rollout Strategy

> **Deferred (non-blocking):** the rollout approach has not been finalized. For a read-only,
> catalog-gated resource the risk is low; the **recommended default** is to ship it enabled
> wherever the `network` service is in the catalog (no feature flag). Confirm before go-live
> whether a feature flag or region-by-region rollout is preferred.

- [ ] Feature flag:
- [ ] Region-by-region rollout:
- [ ] Dark launch (shipped but hidden):
- [ ] Beta cohort:
- [ ] All-at-once
- [ ] Other (specify):

### Who needs to be informed before go-live?

> **Deferred (non-blocking):** go-live communication list not yet specified.

---

## Appendix: Framework Notes (Aurora)

These are settled framework facts (not open requirements), recorded to orient implementation:

- **Scope registration:** built-in Pattern A — file-based routes under `$projectId/network/ports/…`, nav entry in the `network` section of `buildNavSections.ts`, server tRPC router via `buildBaseRouter()`. **Already in place** (#1377): the `network/ports/` route tree, `portsRouter.ts`, and the nav entry exist; reference them (and `floatingips` / `networks`) as the implementation models.
- **Auth:** BFF; `projectScopedProcedure`; server injects `X-Auth-Token`; client never holds the token.
- **Catalog guard:** `getServiceIndex("network")` + `beforeLoad` guard in `network.tsx` — already in place; no new guard needed.
- **Device-owner label mapping:** `compute:nova` → "Instance", `network:router_interface` → "Router interface", `network:dhcp` → "DHCP agent", `network:floatingip` → "Floating IP", unrecognized → raw string. Implemented as a **client-side** helper shared by `NetworkPortsTable.tsx` and `PortTableRow.tsx` — not in the server `Network/helpers/portHelpers.ts` (that file imports `node:net` and is server-only; the mapping is a client i18n concern).
- **Copy-to-clipboard:** Aurora's existing `ClipboardText` affordance satisfies all ID / IP / MAC copy requirements — no custom component.
- **No refresh in phase 1:** consistent with all sibling network resources (Floating IPs, Routers, Security Groups, Networks). Data loads on navigation; Zone-3 last-updated timestamp fed from `dataUpdatedAt`.
- **Relationship to Networks scope:** the Networks scope's ports sub-table (Story 4) fetches `GET /v2.0/ports?network_id=<id>` via `networksRouter.listPorts` and is scoped to one network. This scope fetches `GET /v2.0/ports` (project-scoped, no `network_id` filter) via `portsRouter.list`. The tRPC procedures are **separate**. `networksRouter.listPorts` performs no device-owner label mapping; the shared mapping is a **client-side** helper only.

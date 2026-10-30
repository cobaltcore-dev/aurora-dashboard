# Business Requirements Document (BRD) for Networks (read-only) scope

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Networks (read-only) scope for Aurora Dashboard                                                                    |
| **Submitted By**                | <!-- fill in -->                                                                                                   |
| **Team**                        | Team 2 – Specs and BRDs (hackathon)                                                                                |
| **Date**                        | 2026-10-19                                                                                                         |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [x] Medium &nbsp;&nbsp; [ ] Low                                    |
| **Target Release Date/Quarter** | <!-- fill in -->                                                                                                   |
| **Status**                      | [ ] Draft &nbsp;&nbsp; [x] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [ ] Implemented |

> **Note (deferred, non-blocking):** submitter and target release quarter are not yet recorded (Q-N4); priority is provisionally **Medium**. These are nice-to-have document-control fields and do not block engineering review.

---

## 1. Summary (2-3 sentences)

A new **read-only Networks scope** in the Aurora Dashboard that lets project members inspect
the networks in their own project. Users can list their project's networks, open a network to
see its full metadata and relevant relationships, and drill into its subnets and its ports /
attached devices. Phase 1 is strictly read-only — no create, edit, or delete; mutation is a
deliberately separate later phase.

---

## 2. Business Justification

### Why does this need a UI implementation?

Today, project members who want to inspect their networks must use the `openstack` CLI or the
raw Neutron API. That requires credential setup, knowledge of the right commands, and manually
cross-referencing a network against its subnets and ports to understand topology. A read-only
UI in Aurora — where these same users already manage Routers, Floating IPs, and Security
Groups — gives them networking visibility **in context, with no CLI**, and surfaces
relationships that are tedious to assemble by hand. Networks is the one core Neutron resource
still missing from Aurora; this completes that picture.

### Expected Impact

**If we implement this UI:**

- Faster self-service debugging of connectivity ("what networks/subnets do I have, and what's attached?") without leaving Aurora.
- Fewer "can someone check my network?" tickets routed to operators.
- Completes Aurora's networking story — Networks joins the already-present Routers, Floating IPs, and Security Groups scopes.

**If we DON'T implement this UI:**

- Project members stay CLI-dependent for the most basic networking question — "what networks do I have?"
- Aurora's networking coverage remains incomplete.
- The gap continues to push inspection load onto operators.

---

## 3. Target Surface

**Which UI surface will host this functionality? (single-select)**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other (specify):
- [ ] I don't know

### Why this surface?

This is a new scope, and the general rule is that new scopes go to Aurora directly. Networks
is a built-in OpenStack (Neutron) resource, so it uses Aurora's **built-in scope pattern
("Pattern A")**: file-based TanStack Router routes under
`…/projects/$projectId/network/…`, a navigation entry registered in `buildNavSections.ts`,
and a server-side tRPC router registered via `buildBaseRouter()`. Floating IPs, Routers, and
Security Groups already live in the `network` scope; **Networks as a resource does not exist
yet** and is net-new within that existing scope.

---

## 4. Out-of-Scope / Non-Goals

- **No mutation.** Create, update, and delete of networks, subnets, and ports are explicitly excluded in phase 1. The row overflow menu is scaffolded for future mutation actions but carries only read-only navigation items now.
- **No cross-project / admin-wide views.** Operation is strictly project-scoped; auditing networks across projects is out of scope.
- **No Floating IP or Security Group content.** These are not surfaced inside the Networks scope; they remain owned by their existing dedicated scopes.
- **No device name-resolution.** The UI does not resolve an attached `device_id` to the instance/router _name_ (that would require per-row Nova/Neutron calls — an N+1). See §5.1 Story 4 for the one deliberate exception: an ID-based deep-link to a router's detail view (no extra API call).
- **No standalone "all subnets in project" view.** Subnets are shown only nested within their parent network's detail.

---

## 5.1 User Stories

### Definitions

#### User personas:

| Persona                 | Description                                                                                                                                                                                                                                                                                          | Roles                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Project Member (Viewer) | Any user with read access to the project's networking. Can inspect networks, subnets, and ports/attached devices. Performs **no** mutations. In a read-only phase there is no behavioral difference between a developer and an operator within the project — all perform the same read-only actions. | Determined by Aurora's `canI`-style capability check against Neutron's OpenStack policy (see §8), not by a hard-coded role name. |

> A distinct "Network Admin" persona is expected to be introduced in a later mutation phase, but is out of scope here.

#### Summary of UI functionality

A Project Member can: list their project's networks; open a network to see its full metadata
and relevant relationships; see the subnets on a network; and see the ports / attached devices
on a network. Everything is read-only.

### Story 1: List project networks

**As a** Project Member (Viewer)
**I want to** see a list of the networks in my project
**So that** I can get an overview of my project's networking at a glance

**Acceptance Criteria:**

- [ ] Lists all networks in the current project. Each row shows:
  - [ ] **Name** — with the network's **ID shown beneath the name** (no separate ID column); the ID has a **copy-to-clipboard affordance**
  - [ ] **Status** — a visible status indicator; possible values: `ACTIVE`, `DOWN`, `BUILD`, `ERROR`
  - [ ] **Admin State** — up / down
  - [ ] **Shared** — when the network is shared, this column shows the **owning project** (not merely "yes")
  - [ ] **External** — yes / no
  - [ ] **Subnet count**
  - [ ] a **row overflow menu** (last column) listing the actions available on that row
- [ ] The list is **searchable** by name and ID
- [ ] The list is **sortable** by name, status, and subnet count
- [ ] The list is **filterable** by status and by the shared / external flags
- ~~[ ] The list is **paginated**: once the network count exceeds the page size (default 20 rows per page), pagination controls appear; at or below the page size no controls are shown. The page size is fixed in phase 1 (not user-configurable)~~ _(superseded by engineering decision E5 in the spec: no pagination in phase 1 — all rows render, search/sort/filter are client-side)_
- [ ] MTU and provider/segmentation details are **not** shown in the list — they live in the detail view

**Notes:**

> The row overflow menu is the designated extensibility point for future mutation actions (edit/delete). In phase 1 it contains exactly one item — **"View details"** (navigates to the network detail view). No other items appear in phase 1; the "View details" action is equivalent to activating the row. All search/sort/filter operates on fields already present in the single list response — no extra API calls and no server-side query params required in phase 1.

### Story 2: View network details

**As a** Project Member (Viewer)
**I want to** open a network and see all its metadata and the resources related to it
**So that** I can understand its configuration and what is connected to it

**Acceptance Criteria:**

- [ ] Shows all list fields plus the fields the list omits: Name, ID (copy affordance), Status, Admin State, Shared (+ owning project when shared), External, MTU, Network type (one of `vlan`, `vxlan`, `gre`, `geneve`, `flat`, or `local`), Created / Updated timestamps, and Description / tags
- [ ] Description and tags are shown when present; when absent, the field renders an explicit empty state ("None") rather than being omitted (mirrors the host-routes treatment in Story 3)
- [ ] Provider segmentation details (e.g. VLAN ID, physical network) are shown **only when the API returns them** — under project scope these are typically admin-only and often null
- [ ] Shows the network's **subnets** as a nested sub-table (see Story 3)
- [ ] Shows the network's **ports / attached devices** as a nested sub-table (see Story 4)
- [ ] Shows **attached routers** as a read-only linked list when present (derived from the network's ports where `device_owner` is `network:router_interface` — see Story 4 for the deep-link behavior); when no such ports exist, the attached-routers list renders an explicit empty state ("None")
- [ ] Floating IPs and Security Groups are **not** shown here

### Story 3: View subnets of a network

**As a** Project Member (Viewer)
**I want to** see the subnets belonging to a network
**So that** I can understand the network's addressing

**Acceptance Criteria:**

- [ ] Subnets are shown as a **nested sub-table inside the network detail** (there is no standalone project-wide subnet list in phase 1)
- [ ] For each subnet, show: Name, ID (copy affordance), CIDR, IP version (4/6), Gateway IP, DHCP enabled (yes/no), Allocation pools (start–end ranges), DNS nameservers, and **Host routes** (destination CIDR → nexthop pairs)
- [ ] Host routes render with an explicit empty state ("None") when absent — they are usually empty but materially change routing when present, which is exactly the non-obvious config a read-only viewer opens the detail to inspect
- [ ] An empty subnet set shows an inline empty state ("No subnets")

### Story 4: View ports / attached devices of a network

**As a** Project Member (Viewer)
**I want to** see the ports on a network and what they are attached to
**So that** I can see which devices are connected and how

**Acceptance Criteria:**

- [ ] Ports are shown as a **nested sub-table inside the network detail**
- [ ] For each port, show: ID (copy affordance), Status (`ACTIVE` / `DOWN` / `BUILD` / `ERROR`), Admin State (`admin_state_up`), Fixed IPs (IP + subnet), MAC address, Device owner, and Attached device (`device_id`, copy affordance)
- [ ] The `device_owner` is mapped to a human-friendly **type label** (e.g. `compute:nova` → "Instance", `network:router_interface` → "Router interface", `network:dhcp` → "DHCP agent", `network:floatingip` → "Floating IP"), with a **graceful fallback to the raw `device_owner` string** for unrecognized values
- [ ] The UI does **not** resolve `device_id` to an instance/router _name_ (no per-row lookups / no N+1)
- [ ] **Exception — router deep-link:** when `device_owner` is `network:router_interface`, the attached device is rendered as a **deep-link to that router's detail view** in the existing Routers scope, keyed on the router ID already present in `device_id`. This requires only route construction (no extra API call). If the Routers scope is unavailable in the catalog, the link **degrades gracefully to showing just the ID**.
- [ ] An empty port set shows an inline empty state ("No ports")

**Notes:**

> The entire ports sub-table is populated by a single Neutron list call (`GET /v2.0/ports?network_id=<id>`); `device_owner` and `device_id` are fields on the port object, so both the type-label mapping and the ID-based router deep-link are pure client-side operations with zero per-item fan-out.

---

## 5.2 Required User Actions

**Viewer (Project Member):**

- [ ] View the list of networks (search, sort, filter, paginate — see Story 1)
- [ ] View a network's details (full metadata + relationships)
- [ ] View the subnets of a network (nested)
- [ ] View the ports / attached devices of a network (nested)
- [ ] Copy any resource ID (network, subnet, port, attached device) to the clipboard
- [ ] Follow a router deep-link from a port to the Routers scope detail view

> There are no Admin actions in phase 1 — the scope is entirely read-only.

---

## 6. Release Scope & Prioritization

Phase 1 is read-only; all mutation is deferred to a later phase.

**Minimum shippable first release (MVP):** the **network list** + the **network detail view
with the subnets sub-table**. This alone delivers the core value — "see my networks and their
addressing" — and is independently releasable. The list's **row overflow menu** ships in the
MVP carrying its single phase-1 item ("View details"); it is included now because it is the
designated extension point for later mutation actions, and wiring it in from the start avoids
re-laying-out the list row when those actions arrive.

**Fast-follow (same phase, next increment):** the **ports / attached devices** sub-table plus
the **router deep-link**. Ports are headline functionality (see §1 and §2 — "what's
attached?") but are the most complex view (device-owner mapping, cross-scope link) and are not
required to answer the primary "what networks/subnets do I have?" question, so they are
sequenced immediately after the MVP without blocking the first release. "Fast-follow" here
means next increment within the same phase, not a lower-priority backlog item.

**Sequencing dependencies:**

- The network detail view must exist before either sub-table.
- The subnets and ports sub-tables are independent of each other.

---

## 7. API Information

**CRITICAL: This information is required before UI implementation can begin**

### Details

|                           |                                    | Notes                                                           |
| ------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| **Service Documentation** | OpenStack Neutron (Networking)     | Mature, widely-documented service                               |
| **API Docs**              | OpenStack Networking API reference | <!-- fill in: exact link -->                                    |
| **API Spec**              | OpenStack Networking v2.0          | <!-- fill in: exact link -->                                    |
| **API stable?**           | [x] Yes [ ] No                     | Neutron v2.0 is mature, versioned, no breaking changes expected |
| **API available in QA?**  | [x] Yes [ ] No                     |                                                                 |

> ⚠️ **Still needed**: exact links to the Neutron API docs and spec (nice-to-have — the API itself is well-known and stable).

### Authentication Mode

Keystone token via Aurora's **BFF (Backend-for-Frontend) pattern**. The client calls server-side
tRPC procedures using `projectScopedProcedure`; the server injects the `X-Auth-Token` header via
`signal-openstack`. **The browser never handles the raw Keystone token.** All reads are
project-scoped to the active project.

### Rate Limits / Throttling

Backing calls are the standard Neutron list/show endpoints. Each view issues a single list call
(networks, or subnets/ports for a given network) with no per-item fan-out, so request volume is
low. No special throttling handling is anticipated for phase 1.

### Error Response Shape

The UI must handle the following states, following **Aurora's existing prior art** (the
floatingips / securitygroups scopes) and the **Juno UX guidelines** for error / loading / empty /
unauthorized states — no new patterns are invented:

- **No networks in project (authorized):** a friendly empty state ("No networks in this project"), not an error.
- **403 / not authorized:** the standard unauthorized state (ties to the `canI` check in §8).
- **Backend / network error (5xx, timeout):** a generic error state with a retry affordance — never a blank page or stack trace.
- **Empty sub-tables:** inline empty rows ("No subnets" / "No ports").
- **Partial failure:** if the network detail loads but a sub-table call fails (e.g. ports returns 500 while the network loaded), the error is scoped to that sub-table and the rest of the detail stays usable.

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
`network.tsx` — the same guard the existing Floating IPs / Routers / Security Groups views use.

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack**

Keystone (OpenStack-backed Aurora), via the BFF pattern described in §7.

**Required roles or equivalent**

Authorization is expressed **behaviorally, not as hard-coded Keystone role names**. Entitlement
is determined by Aurora's `canI`-style capability-validation function, which checks the user's
roles against Neutron's OpenStack (oslo.policy) policy for the relevant read actions — e.g.
`get_network`, `get_subnet`, `get_port`. The specific roles are intentionally **not** specified
here, because they are authoritatively defined by whatever Neutron policy the deployment uses.

> **Implementation note (not a stakeholder gap):** the exact roles / policy actions must be confirmed against the actual Neutron policy during implementation.

**Scope**

- [x] Project-scoped
- [ ] Domain-scoped
- [ ] Both
- [ ] Other (specify):

**Who is explicitly denied?**

Any user without the Neutron read capability for the active project. Because Aurora's navigation
is catalog-driven, the Networks entry simply does not appear where the `network` service is
unavailable. A user who reaches the view without the capability sees the standard unauthorized
state (not a crash or blank page). Because the scope is entirely read-only, there is no per-row
permission logic.

### Dependencies on Other Teams or Services

**Blocking services**

- **Neutron** in the target region(s) — the one true backing service; already available and stable.

**Prerequisites (already satisfied)**

- **Aurora `network` scope** (catalog guard, routing, nav) — already present; Networks is added within it. Listed as a prerequisite rather than a blocker because it exists today and requires no other team.

**Soft dependency**

- The **Routers scope** must exist for the port → router deep-link (Story 4). It exists today. If it is absent from the catalog, the deep-link degrades to showing the router ID only — so this is a graceful-degradation dependency, not a hard blocker.

**Cross-team approvals needed**

> **Deferred (non-blocking):** whether Aurora core-team sign-off is required to add a new built-in scope has not been confirmed (Q-N2). This is a process question, not an engineering gap, and does not block the BRD from review.

---

## 9. Rollout & Support

### Rollout Strategy

> **Deferred (non-blocking) — Q-N1:** the rollout approach has not been finalized. For a read-only, catalog-gated scope the risk is low; the **recommended default** is to ship it enabled wherever the `network` service is in the catalog (no feature flag). Confirm before go-live whether a feature flag or region-by-region rollout is preferred.

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

- **Scope registration:** built-in Pattern A — file-based routes under `$projectId/network/…`, nav entry in `buildNavSections.ts`, server tRPC router via `buildBaseRouter()`.
- **Auth:** BFF; `projectScopedProcedure`; server injects `X-Auth-Token`; client never holds the token.
- **Catalog guard:** `getServiceIndex("network")` + `beforeLoad` guard in `network.tsx`.
- **Nested list-in-detail pattern:** prior art exists in the floatingips / securitygroups scopes.
- **Copy-to-clipboard:** an existing Aurora affordance satisfies the ID-copy requirement (no custom work).

> ⚠️ **Still needed (Aurora developer, not stakeholder) — Q-F7:** whether any near-real-time refresh of network/port status is wanted. For a read-only phase 1 this is likely unnecessary; if desired later, confirm `refetchInterval` vs. an SSE subscription with an Aurora developer. Not a blocker for phase 1.

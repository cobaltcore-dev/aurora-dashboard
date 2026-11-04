# Business Requirements Document (BRD) for Instances (read-only) scope

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Instances (read-only) scope for Aurora Dashboard                                                                   |
| **Submitted By**                | <!-- fill in -->                                                                                                   |
| **Team**                        | Team 2 – Specs and BRDs (hackathon)                                                                                |
| **Date**                        | 2026-11-03                                                                                                         |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [x] Medium &nbsp;&nbsp; [ ] Low                                    |
| **Target Release Date/Quarter** | <!-- fill in -->                                                                                                   |
| **Status**                      | [ ] Draft &nbsp;&nbsp; [x] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [ ] Implemented |

> **Note (deferred, non-blocking):** submitter and target release quarter are not yet recorded (Q-N4); priority is provisionally **Medium**. These are nice-to-have document-control fields and do not block engineering review.

---

## 1. Summary (2-3 sentences)

A new **read-only Instances scope** in the Aurora Dashboard that lets project members inspect
the compute instances (Nova servers) in their own project. Users can list their project's
instances, open an instance to see its full metadata, and see its network addresses. Phase 1
is strictly read-only — no create, delete, or power actions (start / stop / reboot / resize /
console); mutation is a deliberately separate later phase.

---

## 2. Business Justification

### Why does this need a UI implementation?

Today, project members who want to inspect their instances must use the `openstack server`
CLI or the raw Nova API. That requires credential setup, knowledge of the right commands, and
manually cross-referencing an instance against its flavor, image, and addresses to understand
what is actually running. A read-only UI in Aurora — where these same users already browse
**Flavors** and **Images** in the compute scope — gives them compute visibility **in context,
with no CLI**, and surfaces the instance metadata that is tedious to assemble by hand.
Instances is the one core compute resource still missing from Aurora; this completes that
picture.

### Expected Impact

**If we implement this UI:**

- Faster self-service answers to "what instances do I have, what flavor/image are they on, and what are their IPs?" without leaving Aurora.
- Fewer "can someone check my VM?" tickets routed to operators.
- Completes Aurora's compute story — Instances joins the already-present Flavors and Images scopes.

**If we DON'T implement this UI:**

- Project members stay CLI-dependent for the most basic compute question — "what instances do I have?"
- Aurora's compute coverage remains incomplete (Flavors and Images with no Instances).
- The gap continues to push inspection load onto operators.

---

## 3. Target Surface

**Which UI surface will host this functionality? (single-select)**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other (specify):
- [ ] I don't know

### Why this surface?

This is a new resource within an existing scope, and the general rule is that new scopes go
to Aurora directly. Instances is a built-in OpenStack (Nova) resource, so it uses Aurora's
**built-in scope pattern ("Pattern A")**: file-based TanStack Router routes under
`…/projects/$projectId/compute/…`, a navigation entry registered in `buildNavSections.ts`,
and a server-side tRPC procedure already registered via `buildBaseRouter()`. Flavors and
Images already live in the `compute` scope; **Instances has no client surface yet** even
though the server-side list procedure (`compute.getServersByProjectId`) already exists — so
this is primarily a client-side net-new within an existing scope with the backend head-start
already in place.

---

## 4. Out-of-Scope / Non-Goals

- **No mutation.** Create, delete, and all power / lifecycle actions (start, stop, reboot, pause, suspend, resize, rebuild, console access, snapshot) are explicitly excluded in phase 1. The row overflow menu is scaffolded for future mutation actions but carries only read-only navigation items now.
- **No cross-project / admin-wide or per-host views.** Operation is strictly project-scoped; auditing instances across projects or by hypervisor host is out of scope.
- **No image name-resolution.** The UI shows the instance's `image` **ID** and does not resolve it to the image _name_ (that would require a per-row Glance call — an N+1). The same principle applies to any other referenced resource whose name is not already on the server object.
- **No attached-volume, security-group, or port/interface sub-tables.** These each require separate Nova / Cinder / Neutron calls per instance and are deferred; phase 1 renders only what the single `servers/detail` response already contains.
- **No live power-state / status polling.** The view loads on navigation; there is no auto-refresh of transitional states (`BUILD`, `REBOOT`, `RESIZE`, …) in phase 1.

---

## 5.1 User Stories

### Definitions

#### User personas:

| Persona                 | Description                                                                                                                                                                                                                                                                                                        | Roles                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Project Member (Viewer) | Any user with read access to the project's compute. Can inspect instances and their network addresses. Performs **no** mutations and **no** power actions. In a read-only phase there is no behavioral difference between a developer and an operator within the project — all perform the same read-only actions. | Determined by Aurora's `canI`-style capability check against Nova's OpenStack policy (see §8), not by a hard-coded role name. |

> A distinct "Compute Admin" persona (power actions, create/delete) is expected to be introduced in a later mutation phase, but is out of scope here.

#### Summary of UI functionality

A Project Member can: list their project's instances; open an instance to see its full
metadata (flavor, image ID, status, power/VM state, availability zone, key name, metadata,
tags); and see the instance's network addresses. Everything is read-only.

### Story 1: List project instances

**As a** Project Member (Viewer)
**I want to** see a list of the instances in my project
**So that** I can get an overview of my project's compute at a glance

**Acceptance Criteria:**

- [ ] Lists all instances in the current project. Each row shows:
  - [ ] **Name** — with the instance's **ID shown beneath the name** (no separate ID column); the ID has a **copy-to-clipboard affordance**
  - [ ] **Status** — a visible status indicator; Nova status values include `ACTIVE`, `BUILD`, `ERROR`, `SHUTOFF`, `PAUSED`, `SUSPENDED`, `SHELVED`, `REBOOT`, `HARD_REBOOT`, `RESIZE`, `VERIFY_RESIZE`, `MIGRATING`, `RESCUE`, `DELETED`, and others (the renderer must tolerate any string Nova returns)
  - [ ] **Flavor** — the embedded flavor's `original_name` (no separate flavor lookup; it is on the server object)
  - [ ] **Image** — the image **ID** (copy affordance); **not** resolved to the image name (see §4)
  - [ ] **Availability Zone** — `OS-EXT-AZ:availability_zone`
  - [ ] **Primary IP address(es)** — derived from the embedded `addresses` map; shown compactly in the list (full per-network breakdown lives in Story 3)
  - [ ] **Created** timestamp
  - [ ] a **row overflow menu** (last column) listing the actions available on that row
- [ ] The list is **searchable** by name and ID
- [ ] The list is **sortable** by name, status, and created timestamp
- [ ] The list is **filterable** by status and by availability zone
- [ ] The list is **not paginated** in phase 1: all rows render, and search / sort / filter are client-side (see engineering decision E5 in the spec); the page size is not user-configurable
- [ ] Flavor specs (vCPUs / RAM / disk), key name, host/VM/task state, metadata, and tags are **not** shown in the list — they live in the detail view

**Notes:**

> The row overflow menu is the designated extensibility point for future mutation / power actions. In phase 1 it contains exactly one item — **"View details"** (navigates to the instance detail view). No other items appear in phase 1; the "View details" action is equivalent to activating the row. All search/sort/filter operates on fields already present in the single `servers/detail` list response — no extra API calls and no server-side query params required in phase 1.

### Story 2: View instance details

**As a** Project Member (Viewer)
**I want to** open an instance and see all its metadata
**So that** I can understand its configuration — what it runs on and how it is set up

**Acceptance Criteria:**

- [ ] Shows all list fields plus the fields the list omits: Name, ID (copy affordance), Status, **Power state** (`OS-EXT-STS:power_state`) and **VM / task state** (`OS-EXT-STS:vm_state` / `OS-EXT-STS:task_state`), Flavor (name **and** vCPUs / RAM / disk / ephemeral / swap from the embedded flavor object), Image ID (copy affordance), Availability Zone, **Key name** (`key_name`), Created / Updated timestamps, Description, Metadata (key/value pairs), and Tags
- [ ] Description, key name, metadata, and tags are shown when present; when absent, the field renders an explicit empty state (`- -`) rather than being omitted
- [ ] Host-level attributes (`OS-EXT-SRV-ATTR:host`, `hypervisor_hostname`, `instance_name`, `host_status`) are shown **only when the API returns them** — under project scope these are typically admin-only and often null/absent
- [ ] Shows the instance's **network addresses** as a nested sub-section (see Story 3)
- [ ] Flavor / Image detail pages are **not** embedded here; the image is shown as an ID only (no name resolution, see §4)

### Story 3: View network addresses of an instance

**As a** Project Member (Viewer)
**I want to** see the network addresses attached to an instance
**So that** I can find its IPs and understand how it is reachable

**Acceptance Criteria:**

- [ ] Addresses are shown as a **nested sub-section inside the instance detail** (there is no standalone project-wide address list in phase 1)
- [ ] Addresses are grouped **by network name** (the key of the embedded `addresses` map); for each address show: IP address (copy affordance), IP version (4 / 6), MAC address, and the address **type** (e.g. `fixed` / `floating`) when the API provides it
- [ ] When an instance has no addresses, the sub-section shows an inline empty state ("No addresses")
- [ ] The addresses come from the embedded `addresses` map on the same `servers/detail` response — **no extra API call** and no per-item fan-out

**Notes:**

> The `addresses` field is a map keyed by network name, each value an array of address objects (`addr`, `version`, `mac_addr`, `type`). Grouping and the "primary IP" shown in the list (Story 1) are pure client-side operations over that embedded map — zero additional requests.

---

## 5.2 Required User Actions

**Viewer (Project Member):**

- [ ] View the list of instances (search, sort, filter — see Story 1)
- [ ] View an instance's details (full metadata)
- [ ] View the network addresses of an instance (nested)
- [ ] Copy any resource ID (instance, image) or IP address to the clipboard

> There are no Admin actions in phase 1 — the scope is entirely read-only. All power / lifecycle actions are deferred to a later mutation phase.

---

## 6. Release Scope & Prioritization

Phase 1 is read-only; all mutation and power actions are deferred to a later phase.

**Minimum shippable first release (MVP):** the **instance list** + the **instance detail
view** (metadata). This alone delivers the core value — "see my instances and what they run
on" — and is independently releasable. The list's **row overflow menu** ships in the MVP
carrying its single phase-1 item ("View details"); it is included now because it is the
designated extension point for later mutation / power actions, and wiring it in from the start
avoids re-laying-out the list row when those actions arrive.

**Fast-follow (same phase, next increment):** the **network addresses** sub-section. Addresses
are headline information ("what are its IPs?") but ride the same single `servers/detail`
response as the detail view, so they are a small increment sequenced immediately after the MVP
detail page without blocking the first release. "Fast-follow" here means next increment within
the same phase, not a lower-priority backlog item.

**Sequencing dependencies:**

- The instance detail view must exist before the addresses sub-section.
- The list must exist before the detail view.

---

## 7. API Information

**CRITICAL: This information is required before UI implementation can begin**

### Details

|                           |                                 | Notes                                                        |
| ------------------------- | ------------------------------- | ------------------------------------------------------------ |
| **Service Documentation** | OpenStack Nova (Compute)        | Mature, widely-documented service                            |
| **API Docs**              | OpenStack Compute API reference | <!-- fill in: exact link -->                                 |
| **API Spec**              | OpenStack Compute v2.1          | <!-- fill in: exact link -->                                 |
| **API stable?**           | [x] Yes [ ] No                  | Nova v2.1 is mature, versioned, no breaking changes expected |
| **API available in QA?**  | [x] Yes [ ] No                  |                                                              |

> ⚠️ **Still needed**: exact links to the Nova API docs and spec (nice-to-have — the API itself is well-known and stable).

### Authentication Mode

Keystone token via Aurora's **BFF (Backend-for-Frontend) pattern**. The client calls server-side
tRPC procedures using `projectScopedProcedure`; the server injects the `X-Auth-Token` header via
`signal-openstack`. **The browser never handles the raw Keystone token.** All reads are
project-scoped to the active project.

### Rate Limits / Throttling

The backing call is the standard Nova `GET /servers/detail` list endpoint. Each view issues a
single list call with no per-item fan-out (the detail view reuses the same server object), so
request volume is low. No special throttling handling is anticipated for phase 1.

### Error Response Shape

The UI must handle the following states, following **Aurora's existing prior art** (the
flavors / images scopes and the floatingips / routers network scopes) and the **Juno UX
guidelines** for error / loading / empty / unauthorized states — no new patterns are invented:

- **No instances in project (authorized):** a friendly empty state ("No instances in this project"), not an error.
- **403 / not authorized:** the standard unauthorized state (ties to the `canI` check in §8).
- **Backend / network error (5xx, timeout):** a generic error state with a retry affordance — never a blank page or stack trace.
- **Empty sub-section:** inline empty rows ("No addresses").
- **Partial / tolerant parsing:** the server procedure parses the Nova response with a tolerant schema (`.catchall`); if an individual field is missing the view renders `- -` for it rather than failing the whole page.

### OpenStack Service Catalog Registration

#### Service Catalog Entry

| Property                | Value                  | Confirmed?     |
| ----------------------- | ---------------------- | -------------- |
| **Service Name**        | nova                   | [x] Yes [ ] No |
| **Service Type**        | compute                | [x] Yes [ ] No |
| **Service Description** | OpenStack Nova compute | [x] Yes [ ] No |
| **API Version**         | v2.1                   | [x] Yes [ ] No |

#### How will the UI discover the service:

Via the Keystone catalog. The navigation entry appears only when the `compute` service (name
`nova`) is in the catalog, using Aurora's `getServiceIndex(...)` check (`serviceIndex["compute"]?.["nova"]`)
plus a per-resource `beforeLoad` catalog guard in `compute/instances.tsx` — the same per-resource
guard pattern the existing Flavors view (`compute/flavors.tsx`) uses.

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack**

Keystone (OpenStack-backed Aurora), via the BFF pattern described in §7.

**Required roles or equivalent**

Authorization is expressed **behaviorally, not as hard-coded Keystone role names**. Entitlement
is determined by Aurora's `canI`-style capability-validation function, which checks the user's
roles against Nova's OpenStack (oslo.policy) policy for the relevant read actions — e.g.
`os_compute_api:servers:index` and `os_compute_api:servers:detail`. The specific roles are
intentionally **not** specified here, because they are authoritatively defined by whatever Nova
policy the deployment uses.

> **Implementation note (not a stakeholder gap):** the exact policy actions must be confirmed against the actual Nova policy during implementation, consistent with how the sibling compute resources gate their permissions.

**Scope**

- [x] Project-scoped
- [ ] Domain-scoped
- [ ] Both
- [ ] Other (specify):

**Who is explicitly denied?**

Any user without the Nova read capability for the active project. Because Aurora's navigation
is catalog-driven, the Instances entry simply does not appear where the `compute`/`nova`
service is unavailable. A user who reaches the view without the capability sees the standard
unauthorized state (not a crash or blank page). Because the scope is entirely read-only, there
is no per-row permission logic.

### Dependencies on Other Teams or Services

**Blocking services**

- **Nova** in the target region(s) — the one true backing service; already available and stable.

**Prerequisites (already satisfied)**

- **Aurora `compute` scope** (Flavors / Images already present; nav section already seeded) — Instances is added within it.
- **Server-side instances procedure** — `compute.getServersByProjectId` and its tolerant `serverSchema` **already exist and are registered** in `buildBaseRouter()`. Listed as a satisfied prerequisite: the phase-1 work is primarily client-side.

**Soft dependency**

- None hard. Flavor and Image data shown are already embedded on the server object (flavor `original_name`; image ID), so there is no cross-scope data coupling in phase 1.

**Cross-team approvals needed**

> **Deferred (non-blocking):** whether Aurora core-team sign-off is required to add a new client resource to an existing built-in scope has not been confirmed (Q-N2). This is a process question, not an engineering gap, and does not block the BRD from review.

---

## 9. Rollout & Support

### Rollout Strategy

> **Deferred (non-blocking) — Q-N1:** the rollout approach has not been finalized. For a read-only, catalog-gated resource the risk is low; the **recommended default** is to ship it enabled wherever the `compute`/`nova` service is in the catalog (no feature flag). Confirm before go-live whether a feature flag or region-by-region rollout is preferred.

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

- **Scope registration:** built-in Pattern A — file-based routes under `$projectId/compute/instances/…`, nav item added to the existing `compute` section in `buildNavSections.ts`, server procedure already in `buildBaseRouter()`.
- **Server head-start:** `compute.getServersByProjectId` (`Compute/routers/serverRouter.ts`) calls `GET /servers/detail` and parses with the tolerant `serverSchema` (`Compute/types/server.ts`); the compute tRPC namespace is **flat** (`trpc.compute.*`), unlike the nested network namespace.
- **Auth:** BFF; `projectScopedProcedure`; server injects `X-Auth-Token`; client never holds the token.
- **Catalog guard:** `serviceIndex["compute"]?.["nova"]` + a per-resource `beforeLoad` guard in `compute/instances.tsx` (same pattern as `compute/flavors.tsx`).
- **List toolbar / detail prior art:** the sibling list views (`flavors`, and the network `routers`) compose `DataGridToolbar` + `SearchInput` + the shared `ListToolbar/{SortInput,FiltersInput,SelectedFilters}` sub-components; `flavors` uses the single-file detail route form.
- **Copy-to-clipboard:** the existing `ClipboardText` affordance satisfies the ID / IP copy requirement (no custom work).

> ⚠️ **Still needed (Aurora developer, not stakeholder) — Q-F7:** whether any near-real-time refresh of instance status / power-state is wanted. For a read-only phase 1 this is likely unnecessary; if desired later, confirm `refetchInterval` vs. an SSE subscription with an Aurora developer. Not a blocker for phase 1.

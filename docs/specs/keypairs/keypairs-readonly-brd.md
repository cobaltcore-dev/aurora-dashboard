# Business Requirements Document (BRD) for Keypairs (read-only) scope

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Keypairs (read-only) scope for Aurora Dashboard                                                                    |
| **Submitted By**                | Vladislav Schur                                                                                                    |
| **Team**                        | <!-- fill in -->                                                                                                   |
| **Date**                        | 2026-11-26                                                                                                         |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [ ] Medium &nbsp;&nbsp; [x] Low                                    |
| **Target Release Date/Quarter** | <!-- fill in -->                                                                                                   |
| **Status**                      | [x] Draft &nbsp;&nbsp; [ ] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [ ] Implemented |

> **Note (deferred, non-blocking):** owning team and target release quarter are not yet recorded (Q-N1). Priority is **Low** — development of this scope was described as optional. These are document-control fields and do not block engineering review.

---

## 1. Summary (2-3 sentences)

A new **read-only Keypairs scope** in the Aurora Dashboard, added as a net-new resource inside
the existing **Compute** scope. Project members can list the Nova keypairs in their project
and open a keypair to see its full detail — name, type, fingerprint, the full public key, creation
time, and owning user. Phase 1 is strictly read-only — no create, import, or delete; mutation is a
deliberately separate later phase.

---

## 2. Business Justification

### Why does this need a UI implementation?

Today, project members cannot see their project's keypairs (name, fingerprint, type, public key)
in Aurora — inspecting them requires the `openstack` CLI or the raw Nova API. This read-only scope
gives that visibility directly in the dashboard, where members already manage their instances.
Keypairs are also used **with** server instances (a keypair is associated with an instance at
creation), so being able to view them in the UI alongside instances makes the instance workflow
easier and keeps the lookup in-context.

### Expected Impact

**If we implement this UI:**

- Project members can answer "what keypairs do I have, and which key is this?" in Aurora without the CLI.
- The public key and fingerprint are retrievable (copyable) from the dashboard, supporting instance-access workflows.
- Completes a gap relative to the old dashboard (Elektra), which already lists keypairs.

**If we DON'T implement this UI:**

- Members stay CLI/API-dependent for the most basic keypair question.
- Aurora's compute coverage remains incomplete next to instances, flavors, and images.

---

## 3. Target Surface

**Which UI surface will host this functionality? (single-select)**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other (specify):
- [ ] I don't know

### Why this surface?

New scopes go to Aurora directly. Keypairs is a built-in OpenStack (Nova) resource, so it uses
Aurora's **built-in scope pattern ("Pattern A")**: file-based TanStack Router routes under
`…/projects/$projectId/compute/keypairs/`, a navigation entry registered in `buildNavSections.ts`,
and a server-side tRPC router registered via `buildBaseRouter()`. The **Compute scope already
exists** (instances, flavors, images); **Keypairs as a resource does not exist yet** and is net-new
within that existing scope — directly analogous to how Networks was added net-new inside the
existing `network` scope.

---

## 4. Out-of-Scope / Non-Goals

- **No mutation.** Create, import, and delete of keypairs are explicitly excluded in phase 1.
- **No admin cross-user listing.** The List API's `user_id` query parameter (which lets an admin list _other_ users' keypairs) is not surfaced. The view shows only the caller's keypairs in the current project.
- **No instance cross-referencing.** The UI does not resolve which instances use a given keypair. (A keypair → instance deep-link is a plausible later iteration — see §1 — and is the compute analog of the Networks ports → router deep-link.)
- **No username resolution for the owner.** The owning `user_id` is shown as a raw ID; resolving it to a username would require an extra Keystone call per keypair (and an N+1 if ever surfaced in the list view) and is deliberately out of scope (see §5.1 Story 2).
- **Deferred to a later iteration:** pagination (`limit` / `marker`), microversion-specific fields, and search / sort / filter.

---

## 5.1 User Stories

### Definitions

#### User personas:

| Persona                 | Description                                                                                                                                                                                                                             | Roles                                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project Member (Viewer) | Any user with read access to the project's compute resources. Can list keypairs and inspect a keypair's detail. Performs **no** mutations. No behavioral split between developer and operator — all perform the same read-only actions. | Determined by Aurora's `canI`-style capability check against Nova's OpenStack policy for the keypair read actions (see §8), not by a hard-coded role name. |

#### Summary of UI functionality

A Project Member can list their project's keypairs and open a keypair to see its full detail
(including the full public key, which is retrievable via copy-to-clipboard). Everything is read-only.

### Story 1: List project keypairs

**As a** Project Member (Viewer)
**I want to** see a list of the keypairs in my project
**So that** I can get an overview of my project's keypairs and find a specific one

**Acceptance Criteria:**

- [ ] Lists all keypairs in the current project via `GET /os-keypairs`. Each row shows:
  - [ ] **Name**
  - [ ] **Fingerprint**
  - [ ] **Type** — `ssh` or `x509` (with a graceful fallback for any other type the API may return)
- [ ] The full **public key** is **not** shown in the list (it is a long value and belongs on the detail page); it is shown on the detail view (Story 2)
- [ ] A **row action** navigates to the keypair detail view ("View details"), equivalent to activating the row
- [ ] Empty state shown when the project has no keypairs
- [ ] Loading state shown while the request is in flight
- [ ] Error / unauthorized states follow Aurora prior art (the existing instances scope) and the Juno UX guidelines
- [ ] **No** pagination, search, sort, or filter in phase 1 (deferred — see §6)

**Notes:**

> **Open design question:** whether — and if so, how — the public key should ever appear in the list (e.g. truncated / on hover) should be discussed with the design team. Phase 1 keeps it off the list.
> API: `GET /os-keypairs`.

### Story 2: View keypair details

**As a** Project Member (Viewer)
**I want to** open a keypair and see all of its attributes
**So that** I can inspect it and retrieve its fingerprint or public key without the CLI

**Acceptance Criteria:**

- [ ] Opens the keypair detail via `GET /os-keypairs/{keypair_name}` — the detail is keyed by the keypair **name** (not a UUID)
- [ ] Shows all of: **Name**, **Type** (`ssh` / `x509`), **Fingerprint**, **Public key** (full), **Created at**, and **User ID** (the owning user)
- [ ] **Copy-to-clipboard** affordances on: **Fingerprint**, **Public key**, and **User ID**. The **Name is not** copyable.
- [ ] The **User ID** is shown as a **raw ID** — it is **not** resolved to a username. The UI notes that the User ID _could_ be resolved via a Keystone call, but this is deliberately skipped to keep the detail view to a single API call (and to avoid an N+1 if the owner is ever surfaced in the list view)
- [ ] Loading state shown while the request is in flight; error / not-found / unauthorized states follow Aurora prior art (the instances scope)

**Notes:**

> API: `GET /os-keypairs/{keypair_name}`. Keypair names may contain characters that require URL-encoding in the route param.

---

## 5.2 Required User Actions

**Viewer (Project Member):**

- [ ] View the list of keypairs (Name, Fingerprint, Type)
- [ ] View a keypair's details (full metadata, including the full public key)
- [ ] Copy a keypair's **Fingerprint**, **Public key**, or **User ID** to the clipboard

> There are no Admin actions in phase 1 — the scope is entirely read-only.

---

## 6. Release Scope & Prioritization

Phase 1 is read-only; all mutation is deferred to a later phase.

**Minimum shippable first release (MVP):** the **keypair list** + the **keypair detail view**,
**shipping together**. The detail view is reached from the list and both are small, so there is
little value in splitting them. This alone delivers the core value — "see my keypairs and retrieve
a key's fingerprint / public key."

**Deferred to a later iteration:**

- Pagination (`limit` / `marker`)
- Search / sort / filter
- Microversion-specific fields
- All mutation (create / import / delete)

**Sequencing dependencies:** the keypair detail view is reached from the list, so the list exists
first; both ship in the same release.

---

## 7. API Information

**CRITICAL: This information is required before UI implementation can begin**

### Details

|                           |                                                               | Notes                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Service Documentation** | OpenStack Nova (Compute)                                      | Mature, widely-documented service                                                                                                                 |
| **API Docs**              | https://docs.openstack.org/api-ref/compute/#keypairs-keypairs | Keypairs section of the Compute API reference                                                                                                     |
| **API Spec**              | OpenStack Compute API v2.1                                    | Same reference                                                                                                                                    |
| **API stable?**           | [x] Yes [ ] No                                                | Nova Compute v2.1 is mature, versioned, stable                                                                                                    |
| **API available in QA**   | [x] Yes [ ] No                                                | Real data available — keypairs already listable in the old dashboard (Elektra); compute service already used by Aurora's instances/flavors/images |

### Authentication Mode

Keystone token via Aurora's **BFF (Backend-for-Frontend) pattern**. The client calls server-side
tRPC procedures using `projectScopedProcedure`; the server injects the `X-Auth-Token` header via
`signal-openstack`. **The browser never handles the raw Keystone token.** All reads are
project-scoped to the active project.

### Rate Limits / Throttling

Each view issues a single list or show call with no per-item fan-out, so request volume is low. No
special throttling handling is introduced for phase 1 — follow Aurora prior art (the instances scope).

### Error Response Shape

The UI handles loading / empty / error / unauthorized states **following Aurora's existing prior
art (the instances scope)** and the Juno UX guidelines — no new patterns are invented. In
particular: a friendly empty state when the project has no keypairs (not an error), the standard
unauthorized state when Nova policy denies access, a not-found state for an unknown keypair name on
the detail route, and a generic error state with a retry affordance for backend / network failures.

### Dev Environment

| Property                             | Value                                                                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev/QA endpoint URL**              | <!-- fill in -->                                                                                                                                      |
| **Region**                           | <!-- fill in -->                                                                                                                                      |
| **Test tenant / project ID**         | <!-- fill in -->                                                                                                                                      |
| **Seed data or mock data available** | Real keypairs already exist and are listable in the old dashboard (Elektra), so development can proceed against real data; this is **not a blocker**. |
| **Access credentials**               | <!-- fill in -->                                                                                                                                      |

> **Still needed (non-blocking):** exact QA endpoint URL / region / test project ID were not separately captured. Development is unblocked because real keypair data already exists in the environment.

### OpenStack Service Catalog Registration

#### Service Catalog Entry

| Property                | Value             | Confirmed?     |
| ----------------------- | ----------------- | -------------- |
| **Service Name**        | nova              | [x] Yes [ ] No |
| **Service Type**        | compute           | [x] Yes [ ] No |
| **Service Description** | OpenStack Compute | [x] Yes [ ] No |
| **API Version**         | v2.1              | [x] Yes [ ] No |

#### How will the UI discover the service:

Via the Keystone catalog. The navigation entry appears only when the `compute` service is in the
catalog, using Aurora's `getServiceIndex` check plus the `beforeLoad` catalog guard — the same
guard the existing instances / flavors / images views use.

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack**

Keystone (OpenStack-backed Aurora), via the BFF pattern described in §7.

**Required roles or equivalent**

Authorization is expressed **behaviorally, not as hard-coded Keystone role names**. Entitlement is
determined by Aurora's `canI`-style capability-validation function, which checks the user's roles
against Nova's OpenStack (oslo.policy) policy for the relevant keypair read actions.

> **Implementation note (not a stakeholder gap):** the exact roles / policy actions required for
> listing and showing keypairs can be clarified during development — this is **not a blocker** for
> the BRD.

**Scope**

- [x] Project-scoped
- [ ] Domain-scoped
- [ ] Both
- [ ] Other (specify):

**Who is explicitly denied?**

Any user without the Nova read capability for the active project. Because Aurora's navigation is
catalog-driven, the Keypairs entry simply does not appear where the `compute` service is
unavailable. A user who reaches the view without the capability sees the standard unauthorized state
(not a crash or blank page). Because the scope is entirely read-only, there is no per-row permission
logic.

### Dependencies on Other Teams or Services

**Blocking services**

- **Nova** in the target region(s) — the backing service; already available and stable.

**Prerequisites (already satisfied)**

- **Aurora `compute` scope** (catalog guard, routing, nav) — already present; Keypairs is added within it.

**Cross-team approvals needed**

> **Deferred (non-blocking) — Q-N3:** no cross-team approval or security review has been identified.
> Public keys and fingerprints are not secret, so a security review is not expected to be required;
> confirm before go-live if in doubt.

### Expected dependency timelines

No blocking technical dependencies identified — Nova and the Aurora `compute` scope are already in place.

---

## 9. Rollout & Support

### Rollout Strategy

> **Deferred (non-blocking) — Q-N2:** the rollout approach has not been finalized. For a read-only,
> catalog-gated scope the risk is low; the **recommended default** is to ship it enabled wherever the
> `compute` service is in the catalog (no feature flag). Confirm before go-live whether a feature flag
> or phased rollout is preferred.

- [ ] Feature flag:
- [ ] Region-by-region rollout:
- [ ] Dark launch (shipped but hidden):
- [ ] Beta cohort:
- [ ] All-at-once
- [ ] Other (specify):

### Who needs to be informed before go-live?

> **Deferred (non-blocking) — Q-N2:** go-live communication list not yet specified.

---

## Appendix: Framework Notes (Aurora)

These are settled framework facts (not open requirements), recorded to orient implementation:

- **Scope registration:** built-in Pattern A — file-based routes under `$projectId/compute/keypairs/`, nav entry in `buildNavSections.ts`, server tRPC router via `buildBaseRouter()`. Keypairs is net-new inside the existing `compute` scope (alongside instances, flavors, images).
- **Auth:** BFF; `projectScopedProcedure`; server injects `X-Auth-Token`; client never holds the token.
- **Catalog guard:** `getServiceIndex` on the `compute` service + `beforeLoad` guard, as `instances.tsx` / `flavors.tsx` / `images.tsx` already do.
- **Detail routing:** keyed by keypair **name** (`$keypairName`), not a UUID; names may require URL-encoding in the route param.
- **Prior art:** the existing instances / flavors / images list+detail views are the closest in-repo pattern to follow for loading / empty / error / unauthorized states.

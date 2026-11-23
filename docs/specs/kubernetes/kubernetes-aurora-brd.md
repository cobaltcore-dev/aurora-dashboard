# Business Requirements Document (BRD) for Kubernetes (kubernetes_ng) migration to Aurora

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Kubernetes (kubernetes_ng) migration to Aurora Dashboard                                                           |
| **Submitted By**                | <!-- fill in -->                                                                                                   |
| **Team**                        | <!-- fill in -->                                                                                                   |
| **Date**                        | 2026-11-16                                                                                                         |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [x] Medium &nbsp;&nbsp; [ ] Low                                    |
| **Target Release Date/Quarter** | <!-- fill in -->                                                                                                   |
| **Status**                      | [ ] Draft &nbsp;&nbsp; [x] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [ ] Implemented |

> **Note (deferred, non-blocking):** submitter, owning team, and target release quarter are not yet recorded (Q-N4); priority is provisionally **Medium**. These are nice-to-have document-control fields and do not block engineering review.

---

## 1. Summary (2-3 sentences)

Re-implement the existing, production Elektra **kubernetes_ng** plugin ("Kubernetes") inside
the **Aurora Dashboard** at **full feature parity**, using only Juno UI components and Aurora's
established tRPC/BFF + file-based TanStack Router patterns. The plugin is a frontend for
provisioning and managing **Gardener-managed Kubernetes clusters** (via the Persephone
Kubernetes-as-a-Service operator) on SAP Cloud Infrastructure. The primary value is to **retire
the feature from Elektra**: it was originally built in Elektra only because Aurora was not yet
ready; now that Aurora is in production, the feature must live on the current production
dashboard.

---

## 2. Business Justification

### Why does this need a UI implementation?

This is not a net-new UI — it is a **platform migration**. Elektra is the legacy dashboard and
Aurora is the new stack onto which all functionality is being ported. The kubernetes_ng plugin
is already a mature, production UI; it needs to be re-implemented on Aurora so the organization
can consolidate on a single dashboard and decommission Elektra. The feature exists in Elektra
only as an accident of timing (Aurora was not production-ready when the plugin was first built).

### Expected Impact

**If we implement this UI:**

- Gardener Kubernetes cluster management lives natively in Aurora, alongside the rest of the organization's cloud resources, with consistent UX and auth.
- Elektra's kubernetes_ng plugin can be retired, advancing the overall Elektra → Aurora migration.
- No capability regression for users — the Aurora version ships at full 1:1 parity with the production Elektra plugin.

**If we DON'T implement this UI:**

- The feature stays stranded on the legacy stack, contrary to the goal of consolidating all functionality on Aurora.
- Elektra cannot be fully retired while this plugin still lives there.

---

## 3. Target Surface

**Which UI surface will host this functionality? (single-select)**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other (specify):
- [ ] I don't know

### Why this surface?

The feature already lives in Elektra and is being consolidated onto **Aurora**
(`packages/aurora`), re-implemented with Juno UI components and Aurora's tRPC/BFF + file-based
TanStack Router patterns. The backing service is **Gardener/Persephone**. Although Gardener is
not a _standard_ OpenStack service type, it **is offered in the Keystone service catalog**, so
this scope follows Aurora's **normal catalog-gated built-in pattern** — discovered via
`getServiceIndex(<type>)` + a `beforeLoad` catalog guard, with a nav entry that looks and
behaves like any other native Aurora service. The only lookup detail still to confirm is the
exact catalog **service type/name** (see §7).

---

## 4. Out-of-Scope / Non-Goals

- **No long-term Elektra coexistence.** The Elektra/Aurora parallel run is short and transitional (see §9); maintaining both dashboards long-term is explicitly out of scope.
- **No cluster monitoring / metrics / observability.** The Aurora version matches Elektra, which does not provide cluster monitoring; adding it is out of scope.

> The stakeholder deliberately chose **not** to state three other candidate non-goals as explicit exclusions — "no new features beyond parity", "no cross-landscape/aggregated views", and "no backend/API changes". These are implied by the 1:1-parity + frontend/BFF-only framing (§1, §5, §7) but are intentionally not listed as hard boundaries here.

---

## 5.1 User Stories

### Definitions

#### User personas:

| Persona          | Description                                                                                                                                                                                                                                                                                                                               | Roles                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kubernetes Admin | The single persona for this scope. Can perform **all** actions: list and view clusters, create clusters via the wizard, edit worker groups, edit maintenance windows, update the Kubernetes version, replace the raw cluster YAML, delete clusters, download both the garden and admin kubeconfig, and view getting-started instructions. | Requires the Keystone **`kubernetes_admin`** role to operate the backend. Individual actions in the UI are additionally enabled/disabled by the backend capability model (see §8). |

> **There is no read-only "viewer" persona in this scope.** Everyone who can reach the scope is a `kubernetes_admin`. The capability `permissions` booleans (list/get/create/update/delete, plus a separate admin-kubeconfig permission) are still consulted to enable/disable individual actions in the UI, exactly as in Elektra — but there is no distinct lower-privilege role.

#### Landscapes

The scope operates against **three separate Gardener landscapes — `qa`, `canary`, and
`production`** — each a distinct Gardener API endpoint. The user explicitly **switches
landscape via a selector** in the UI. Landscape is **orthogonal to the active Aurora project**:
the same project can view clusters across qa/canary/prod by changing the selected landscape. The
landscape choice determines which Gardener backend the BFF targets.

> **Implementation detail (not a stakeholder gap):** whether landscape is carried as a URL segment or as UI/query state, and exactly how the BFF resolves the per-landscape endpoint, are BFF implementation details to be settled during the build.

#### Summary of UI functionality

A Kubernetes Admin can, within a selected landscape: see a list of their project's clusters;
open a cluster to view its full details (basic info, readiness, latest operation & errors,
worker groups, maintenance); create a cluster through a 3-step wizard; edit worker groups,
maintenance window, and Kubernetes version; replace the raw cluster YAML; delete a cluster (via
a two-step confirmation); download the garden kubeconfig and a cluster admin kubeconfig; and
view getting-started instructions. Everything is a **1:1 re-implementation of the production
Elektra kubernetes_ng plugin**.

### Story 1: List clusters

**As a** Kubernetes Admin
**I want to** see a list of the clusters in my project for the selected landscape
**So that** I can get an overview of my Kubernetes clusters and their health at a glance

**Acceptance Criteria:**

- [ ] Lists the clusters for the current project in the selected landscape. Each row shows, in order:
  - [ ] a **state / status icon**
  - [ ] **Status**
  - [ ] **Name** (with the cluster ID shown)
  - [ ] **Readiness** (readiness conditions)
  - [ ] **Last Operation** (operation summary)
  - [ ] **Kubernetes Version**
  - [ ] a **row actions menu** (last column)
- [ ] The list is **searchable / sortable / filterable client-side** over the already-fetched cluster list
- [ ] Cluster status refreshes automatically (polling) and a manual **Refresh** action is also available (see §8 / Story notes)

**Notes:**

> Column set and behavior mirror the Elektra reference `ClusterList` exactly, unless a Juno DataGrid constraint forces a minor adjustment at build time.

### Story 2: View cluster details

**As a** Kubernetes Admin
**I want to** open a cluster and see all its details and the actions available on it
**So that** I can understand its configuration and operate on it

**Acceptance Criteria:**

- [ ] Shows the cluster's **Overview** with these sections (parity with the reference):
  - [ ] **Basic Information** — Name, ID, Cluster Status (including a "deleted" marker where applicable), Kubernetes Version (with an inline **Update** action), Namespace, Purpose, Add-ons, Created by
  - [ ] **Readiness** — readiness conditions
  - [ ] **Latest Operation & Errors** — last errors, plus operation description / progress / state / type / update time
  - [ ] **Worker Groups** — with an **Edit Worker Groups** action
  - [ ] **Maintenance** — window start / end / timezone and auto-update flags, with an **Edit Maintenance** action
- [ ] Cluster-level actions are available: **Refresh**, **kubeconfig download** (garden + admin — see Story 6), **two-step delete** (see Story 5), and **raw-YAML replace** (see Story 4)
- [ ] Editable from the detail view: Kubernetes version, worker groups, maintenance window (plus raw-YAML replace). All edits behave exactly as in Elektra.

### Story 3: Create a cluster (add-cluster wizard)

**As a** Kubernetes Admin
**I want to** create a new cluster through a guided wizard
**So that** I can provision a Gardener-managed Kubernetes cluster without hand-writing its resource

**Acceptance Criteria:**

- [ ] A 3-step wizard (parity with the reference `ClusterWizard`):
  - [ ] **Step 1 — Basic Info & Infrastructure**: Name, Cloud Profile (default `openstack`), Kubernetes Version, Floating IP Pool (sourced from the external-networks lookup), Pods CIDR, Nodes CIDR
  - [ ] **Step 2 — Worker Groups**: the worker-group editor (add / edit worker groups)
  - [ ] **Step 3 — Summary**: review all inputs, then create the cluster
- [ ] Per-step validation gates progression, mirroring the reference's wizard validation rules
- [ ] On confirm, the cluster is created (reference: `POST /clusters`)

### Story 4: Replace the raw cluster YAML

**As a** Kubernetes Admin
**I want to** edit and replace the raw cluster (shoot) resource as YAML
**So that** I can make advanced changes not exposed through the structured edit dialogs

**Acceptance Criteria:**

- [ ] A YAML editor lets the admin view and edit the raw cluster resource and submit a **full-resource replace** (reference: `PUT …/clusters/{name}/replace`)
- [ ] Behavior matches the Elektra reference (full-resource overwrite semantics)

**Notes:**

> **Implementation detail (not a stakeholder gap):** no YAML editor exists in Aurora yet. Whether to reuse CodeMirror (as the Elektra reference does) or build a Juno-only editor is left to the implementing developer. The **replace feature itself is in scope** at full parity.

### Story 5: Delete a cluster

**As a** Kubernetes Admin
**I want to** delete a cluster through a confirmation flow
**So that** I can decommission a cluster safely without accidental deletion

**Acceptance Criteria:**

- [ ] Deletion uses the reference's **two-step confirmation** flow (confirm → destroy) (reference: `confirm-deletion` → `confirm-deletion-and-destroy`)
- [ ] Behavior matches the Elektra reference

### Story 6: Download kubeconfig

**As a** Kubernetes Admin
**I want to** download the garden kubeconfig and a cluster admin kubeconfig
**So that** I can access the Gardener project and the cluster with `kubectl`

**Acceptance Criteria:**

- [ ] **Garden kubeconfig** download (the "Download garden kubeconfig" feature; reference: `GET …/gardener-api/kubeconfig`)
- [ ] **Cluster admin kubeconfig** download (reference: `GET …/clusters/kubeconfig/{name}`), gated behind the separate `clusters_admin_kubeconfig` capability
- [ ] The BFF fetches the kubeconfig from Gardener (server-side auth; the browser never holds a Gardener token) and the browser downloads it as a file
- [ ] No special expiry / one-time / short-lived-credential handling in the UI beyond whatever Gardener returns

### Story 7: View getting-started instructions

**As a** Kubernetes Admin
**I want to** see getting-started instructions
**So that** I know how to use my clusters and the KaaS offering

**Acceptance Criteria:**

- [ ] Fetches the **scikube getting-started ConfigMap** via the BFF (reference: `GET /api/scikube-getting-started`) and renders its **markdown** content client-side
- [ ] Content source is unchanged from the reference

**Notes:**

> **Implementation detail (not a stakeholder gap):** the markdown rendering approach — reuse/port the reference `markdownParser` or use a Juno-compatible renderer — is left to the developer (same disposition as the YAML editor).

---

## 5.2 Required User Actions

**Kubernetes Admin (the only persona):**

- [ ] Select the landscape (qa / canary / production)
- [ ] View the list of clusters (search / sort / filter — Story 1)
- [ ] View a cluster's details (Story 2)
- [ ] Create a cluster via the 3-step wizard (Story 3)
- [ ] Edit a cluster's Kubernetes version, worker groups, and maintenance window (Story 2)
- [ ] Replace the raw cluster YAML (Story 4)
- [ ] Delete a cluster via the two-step confirmation (Story 5)
- [ ] Download the garden kubeconfig and the cluster admin kubeconfig (Story 6)
- [ ] View getting-started instructions (Story 7)
- [ ] Refresh cluster data manually (auto-refresh also runs)

> Individual actions are additionally enabled/disabled by the backend capability model (§8). There is no separate viewer persona.

---

## 6. Release Scope & Prioritization

**Full 1:1 parity in a single release.** The Aurora version must match the Elektra
kubernetes_ng plugin's **complete read/write surface** before it ships — there is **no**
read-only-first or partial release. In scope for the single release:

- Cluster list (Story 1)
- Cluster details, including inline edit of Kubernetes version, worker groups, and maintenance window (Story 2)
- Add-cluster wizard (Story 3)
- Raw-YAML replace (Story 4)
- Two-step delete (Story 5)
- Garden + admin kubeconfig download (Story 6)
- Getting-started instructions (Story 7)
- External-networks picker and cloud-profiles lookups (supporting the wizard)

Nothing from the reference is dropped. There are no phasing/sequencing deferrals within the
release; the only sequencing is the natural one (the detail view and wizard depend on the
cluster/cloud-profile/network data contracts being in place).

---

## 7. API Information

**CRITICAL: This information is required before UI implementation can begin**

### Details

|                           |                                                 | Notes                                                                     |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| **Service Documentation** | Gardener / Persephone (Kubernetes-as-a-Service) | UI already exists and is in production in Elektra                         |
| **API Docs**              | <!-- fill in: exact link -->                    |                                                                           |
| **API Spec**              | <!-- fill in: exact link -->                    |                                                                           |
| **API stable?**           | [x] Yes [ ] No                                  | Confirmed stable, versioned, production; no breaking changes expected     |
| **API available in QA?**  | [x] Yes [ ] No                                  | QA landscape exists with live Gardener QA data (dev target — see Dev Env) |

> ⚠️ **Still needed (nice-to-have):** exact links to the Gardener / Persephone API docs and spec. The API itself is confirmed stable and in production.

**Reference backend endpoints** (landscape-scoped `/:landscape/api/…` in Elektra; the Aurora BFF
re-implements the equivalent procedures): cluster CRUD; `replace` (raw shoot YAML PUT); two-step
delete (`confirm-deletion` → `confirm-deletion-and-destroy`); `external-networks`;
`cloud-profiles`; garden `kubeconfig` and cluster admin `kubeconfig`; `gardener-api/info`;
`scikube-getting-started` (instructions ConfigMap); and a capability `permissions` endpoint.

### Authentication Mode

The Gardener/Persephone API accepts a **Keystone `X-Auth-Token` directly**, so the Aurora BFF
reuses Aurora's **standard project-scoped auth injection** — the client calls server-side tRPC
procedures (`projectScopedProcedure`), and the server injects the `X-Auth-Token` via
`signal-openstack`. **The browser never holds a Gardener token** — authentication is strictly
server-side, exactly like every other Aurora scope. **No Gardener-specific client library is
needed**; `signal-openstack` plus plain HTTP calls to the Gardener endpoints suffice.

### Rate Limits / Throttling

No special throttling handling is called out. Because cluster provisioning is long-running,
the UI refreshes cluster status automatically via TanStack Query `refetchInterval` **polling**
(exact interval left to the Aurora developer), in addition to a manual Refresh action.

### Error Response Shape

> ⚠️ **Still needed (implementation detail, non-blocking) — Q-I11:** the canonical Gardener error shape, and whether the Aurora BFF faces the Elektra reference's "**HTTP 200 with `{error, code, message}` body**" quirk. That quirk stems from the **oauth2-proxy** in front of Elektra's Rails backend. Aurora's BFF calls Gardener **directly via `signal-openstack`** — a different stack — so the working assumption is that Aurora sees **normal HTTP status codes** handled by the standard `withErrorHandling` helper. The developer must confirm the actual error shape against real Gardener responses during implementation.

### Dev Environment

| Property                             | Value                                                              |
| ------------------------------------ | ------------------------------------------------------------------ |
| **Dev/QA endpoint URL**              | The **QA landscape** Gardener endpoint <!-- fill in: exact URL --> |
| **Region**                           | <!-- fill in -->                                                   |
| **Test tenant / project ID**         | A QA test project <!-- fill in: exact project ID -->               |
| **Seed data or mock data available** | Live Gardener **QA data** is available on the QA landscape         |
| **Access credentials**               | Via the standard Keystone session (project-scoped token)           |

> ⚠️ **Still needed (nice-to-have):** the exact QA endpoint URL, region, and test project ID for the UI team (Q-N3). The environment (QA landscape, live data) is confirmed.

### OpenStack Service Catalog Registration

Gardener/Persephone is **not a standard OpenStack service type**, but it **is offered in the
Keystone service catalog**, and the scope should look and behave like any other native Aurora
service.

#### How will the UI discover the service / gate the nav entry:

The scope uses Aurora's **standard catalog-gated pattern** — `getServiceIndex(<type>)` plus a
`beforeLoad` catalog guard — the same mechanism every other built-in Aurora scope uses. The nav
entry appears only when the service is present in the catalog for the active project.

> ⚠️ **Still needed (lookup detail, non-blocking) — Q-C3:** the exact catalog **service type / name** to look up (and the endpoint interface/region specifics, if any) must be confirmed against the actual Keystone catalog. This is a lookup value, not an architectural decision — the gating mechanism itself (standard catalog guard) is settled.

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack**

Keystone (OpenStack-backed Aurora), via the BFF pattern described in §7 — the Gardener API
accepts the Keystone `X-Auth-Token` directly; the token is injected server-side by
`signal-openstack` and never handled by the browser.

**Required roles or equivalent**

Authorization combines a **named role** with a **behavioral capability model**:

- A specific Keystone role — **`kubernetes_admin`** — is required to operate the backend.
- In addition, the UI carries over Elektra's **capability model**: a backend `permissions`
  endpoint returns `{ list, get, create, update, delete }` booleans (plus a **separate
  `clusters_admin_kubeconfig`** permission), and the UI enables/disables each action on those
  booleans via a `canI`-style check. Per-action gating is **not** done by hard-coding role names.

All actions behave exactly as they do in Elektra.

**Scope**

- [x] Project-scoped
- [ ] Domain-scoped
- [ ] Both
- [ ] Other (specify):

> Landscape selection (qa / canary / production) is **orthogonal** to the project scope — it selects which Gardener backend the BFF targets, not the auth/project context.

**Who is explicitly denied?**

Any user without the `kubernetes_admin` role / the required backend capabilities. There is no
read-only persona: a user who lacks the capability for a given action has that action disabled
in the UI (per the capability booleans), consistent with Elektra's behavior.

### Dependencies on Other Teams or Services

**Blocking services**

- **Gardener / Persephone** (the KaaS operator and backing API) — the one true backing service; already available, stable, and in production across the qa / canary / production landscapes.

**Prerequisites (already satisfied)**

- **Aurora tRPC/BFF + routing + Juno UI** — already present; this scope is added using those patterns. No Gardener-specific client library is required (`signal-openstack` + HTTP suffices).

**Cross-team approvals needed**

> ⚠️ **Still needed (non-blocking) — Q-I12:** required cross-team sign-offs were not confirmed. The natural candidates are the **Persephone/Gardener team** (owns the backing API) and the **Aurora core team** (adding a new, non-catalog scope — ties to Q-C3). Confirm whether either must formally sign off.

**Expected dependency timelines**

Not applicable — the backing service is already in production.

---

## 9. Rollout & Support

### Rollout Strategy

**All-at-once** — the scope is enabled for all entitled (`kubernetes_admin`) projects as soon as
it ships. No feature flag and no landscape-by-landscape phasing.

- [ ] Feature flag:
- [ ] Region-by-region rollout:
- [ ] Dark launch (shipped but hidden):
- [ ] Beta cohort:
- [x] All-at-once
- [ ] Other (specify):

**Elektra coexistence / cutover:** for a **short, transitional period** the legacy Elektra
kubernetes_ng plugin keeps running alongside the new Aurora UI, with **links to the new Aurora
UI surfaced (including from within the legacy plugin)** to direct users to the new location.
After that transition, the Elektra plugin is **retired**. Long-term coexistence is a non-goal
(§4).

### Who needs to be informed before go-live?

> ⚠️ **Still needed (non-blocking) — Q-N2:** the go-live communication list has not been specified.

---

## Appendix: Framework Notes (Aurora)

Settled framework facts and reference-implementation facts recorded to orient implementation
(not open requirements):

- **Target app:** `packages/aurora` (the dashboard app re-exports it).
- **Auth:** BFF; Gardener accepts the Keystone `X-Auth-Token` directly; `projectScopedProcedure`; server injects the token via `signal-openstack`; client never holds a token. No Gardener-specific client library needed.
- **BFF shape:** server-side tRPC router(s) under `src/server/<Domain>/{routers,types,helpers}`, registered via `buildAppRouter(policyDir, extraRouters)` / `buildBaseRouter()`; Zod schemas in `types/`; `withErrorHandling` helper. Closest prior art: `src/server/Network` (read + write procedures).
- **Client:** file-based TanStack Router routes under `src/client/routes/_auth/projects/$projectId/…`; nav entry via `buildNavSections.ts`. Gating uses the **standard catalog guard** (`getServiceIndex(<type>)` + `beforeLoad`) — Gardener is offered in the catalog and presents like a native service; only the exact catalog service type/name is still to be confirmed (Q-C3).
- **UI:** Juno UI components (`@cloudoperators/juno-ui-components`); the cluster list is a Juno DataGrid (Intent `datagrid` skills available).
- **Status refresh:** TanStack Query `refetchInterval` polling (long-running provisioning); interval TBD by the developer; manual Refresh also present.
- **Reference implementation (Elektra):** `plugins/kubernetes_ng` — the authoritative behavioral contract (endpoints, cluster/worker/cloud-profile shapes, wizard steps, kubeconfig flows, capability permissions model, the oauth2-proxy error quirk). Landscape is carried in the Elektra URL basepath (e.g. `/kubernetes-gardener/prod`).

> **Open implementation decisions carried into the spec:** (1) the exact catalog **service type/name** for the standard catalog guard (Q-C3 — a lookup value, mechanism is settled); (2) canonical Gardener error shape and whether the 200-with-error-body quirk applies to the Aurora BFF (Q-I11); (3) YAML-editor component choice — CodeMirror vs. Juno-only (Q-C6); (4) markdown renderer choice for instructions (Q-I9); (5) landscape routing mechanics — URL segment vs. UI state (Q-C2); (6) polling interval (Q-N5).

- **i18n:** English-only is acceptable for the migration (the Elektra plugin is English-only); Aurora's `src/locales/{en,de}` scaffolding remains available if localization is added later.

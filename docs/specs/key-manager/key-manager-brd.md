# Business Requirements Document (BRD) for Key Manager UI (Aurora)

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Key Manager UI — Create, view, and delete browser for OpenStack Barbican secrets, containers, and orders in Aurora |
| **Submitted By**                | Hoda Noori                                                                                                         |
| **Team**                        | Team 2 – Specs and BRDs (hackathon)                                                                                |
| **Date**                        | 2026-11-06                                                                                                         |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [ ] Medium &nbsp;&nbsp; [ ] Low                                    |
| **Target Release Date/Quarter** | (Q-N4)<                                                                                                            |
| **Status**                      | [x] Draft &nbsp;&nbsp; [ ] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [ ] Implemented |

---

## 1. Summary

**What UI functionality are you requesting and why?**

The Key Manager UI adds a **create, view, and delete** browser for OpenStack Barbican secrets, containers, and orders to the Aurora dashboard under a new **Authorization** navigation category. Project members can create, view, and delete secrets (including masked payload reveal, file download, and copy-to-clipboard), manage secret metadata labels, group secrets into containers, and place and track asynchronous key-generation orders — replacing routine Barbican CLI and REST API usage. This release covers all three Barbican resource types in a single scope, gated on the `key-manager` service type in the project's Keystone catalog.

---

## 2. Business Justification

### Why does this need a UI implementation?

Project members who need to store TLS certificates, encryption keys, passphrases, and other secret material for their services currently have no dashboard UI — every lifecycle operation (create, retrieve, rotate, delete) requires direct Barbican CLI or REST API access. This creates a high barrier for operators who are not fluent in Barbican's API surface, leads to credentials stored in less secure ad-hoc locations, and makes it impossible to get a quick visual overview of a project's secrets and their expiration status.

### Expected Impact

**If we implement this UI:**

- Project members can create, view, and delete secrets, containers, and key-generation orders directly in Aurora without CLI or API knowledge.
- Payload reveal, clipboard copy, and file download make certificate and key installation workflows self-service.
- Visibility into expiration dates and order status reduces the risk of unnoticed certificate expiry or failed key-generation jobs.
- Establishes the "Authorization" category in Aurora, providing a natural home for future credential-management features (HSM, PCA, etc.).

**If we DON'T implement this UI:**

- Users remain dependent on the Barbican CLI or raw API calls for every secret lifecycle operation, excluding non-technical operators entirely.
- Credentials risk being stored in less secure locations (files, wikis, chat) because the barrier to using Barbican is too high.
- Aurora's dashboard remains incomplete for projects that use Barbican-backed certificate or key management.

---

## 3. Target Surface

**Which UI surface will host this functionality?**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other
- [ ] I don't know

### Why this surface?

Key Manager is implemented as a **new built-in scope (Pattern A)** under a new top-level **"Authorization"** navigation category in Aurora — at the same level as Storage, Network, and Compute. Routes live under `$projectId/authorization/key-manager/`. A new `authorization.tsx` layout file holds the `beforeLoad` catalog guard (`getServiceIndex("key-manager")`), and the Aurora nav section is registered in `buildNavSections.ts`. The tRPC router is registered via `buildBaseRouter()`. This pattern is consistent with how the existing network scopes (Floating IPs, Routers, Security Groups) are registered.

The "Authorization" category is intentionally broader than Key Manager alone — it serves as the future home for related credential-management scopes.

---

## 4. Out-of-Scope / Non-Goals

**Functionality this UI will explicitly NOT do in this release:**

- **No ACL management** — per-secret and per-container ACL editing (`/v1/secrets/{id}/acl`, `/v1/containers/{id}/acl`) is out of scope. Barbican's own project-level policy applies; users cannot grant cross-project access from this UI.
- **No consumer registration** — the secret consumer and container consumer registration APIs are not surfaced.
- **No secret store backend configuration** — plugin and backend management (admin-only Barbican internals) is out of scope.
- **No quota management** — the `/v1/quotas` endpoint is not surfaced.
- **No cross-project or domain-scoped admin operations** — this UI shows only the current project's resources. Global admin views across all projects are out of scope.
- **No secret payload update** — Barbican payloads are immutable after creation. Users who need to change a payload must delete and recreate the secret; the UI will surface this constraint clearly.
- **No certificate issuance orders** — Barbican's `certificate` order type (TLS certificate issuance via an external CA plugin) is out of scope for the initial release. Orders in scope are `key` (symmetric key generation) and `asymmetric` (key-pair generation) only.

---

## 5.1 User Stories

### Definitions

#### User personas

| Persona                  | Description                                                                                                                                                                                                                                                                                                | Roles                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| OpenStack Project Member | Any authenticated user with a role on the current project. The UI checks Barbican permissions proactively — create and delete controls are hidden for users who lack the corresponding write or delete permission; browse and view actions show an Access Denied error state when Barbican restricts them. | Any Keystone project role that Barbican's policy grants the relevant `key-manager:*` permission to |

#### Summary of UI functionality

All authenticated project members can list, search, sort, and filter secrets; view secret metadata and reveal, copy, or download payloads; create and delete secrets; manage custom metadata labels on secrets; browse, view, create, and delete containers; and place, track, and delete asynchronous key-generation orders. The Key Manager nav entry is shown only when the `key-manager` service type is present in the project's Keystone catalog.

---

### Story 1: Browse, search, sort, and filter secrets

**As a** project member
**I want to** browse all secrets in my project with search, sort, and filter
**So that** I can quickly find a specific secret, check expiration status, and assess the project's secret inventory at a glance

**Acceptance Criteria:**

- [ ] Lists all project secrets via `GET /v1/secrets` (server-side pagination with `offset` + `limit`)
- [ ] Displays per row: **Name** (top) + **ID** (below, with a copy-to-clipboard affordance) / **Status** / **Secret Type** + **Content Type** (stacked) / per-row action controls (Show details, Delete)
- [ ] **Search** by name: server-side (`name` query param, Barbican similarity match), a search field with 300 ms debounce, no full-page reload
- [ ] **Filter** by Secret Type (`secret_type`) and Algorithm (`alg`): server-side query params; each defaults to "All"; active filters compose with AND; a "Clear filters" affordance resets them
- [ ] **Sort** by Name, Status, Secret Type, Created, Expiration, Updated: server-side (`sort=<field>:asc` or `sort=<field>:desc`); clicking a column header toggles ascending / descending
- [ ] Pagination controls; default page size 50 rows
- [ ] Empty state shown when no secrets exist
- [ ] Loading state shown while the request is in flight
- [ ] Error state shown if the API call fails, surfacing the Barbican error message when present

**Notes:**
API: `GET /v1/secrets` — query params: `name`, `secret_type`, `alg`, `mode`, `bits`, `acl_only`, `expiration_from`, `expiration_to`, `created_from`, `created_to`, `updated_from`, `updated_to`, `sort`, `offset`, `limit`

---

### Story 2: View secret details and payload

**As a** project member
**I want to** open a secret and see its full metadata and retrieve its payload
**So that** I can inspect configuration, copy credentials, or download key material without CLI access

**Acceptance Criteria:**

- [ ] Clicking "Show details" opens the secret detail view showing: Name, ID (copy-to-clipboard), Status, Secret Type, Content Type, Algorithm, Bit Length, Mode, Expiration, Created, Updated
- [ ] **Payload section** — the payload is masked by default (hidden behind a toggle); when the user explicitly reveals it, the UI fetches `GET /v1/secrets/{id}/payload` with the appropriate `Accept` header and displays the value
- [ ] Copy-to-clipboard affordance for the payload value
- [ ] **Download affordance** — downloads the payload as a file with the appropriate extension (`.pem` for `application/x-pem-file`; `.bin` for binary types)
- [ ] User-defined metadata labels are shown as a key-value table (separate from payload; loaded via `GET /v1/secrets/{id}/metadata`)
- [ ] Loading state shown while each fetch is in flight; error state shown on failure, surfacing the Barbican error message (`title`/`description`) when present — both for the metadata fetch and the separate payload fetch
- [ ] If the payload fetch fails (e.g. 403 — role lacks payload access), a specific error is shown rather than a generic one

**Notes:**
API: `GET /v1/secrets/{id}` (metadata), `GET /v1/secrets/{id}/payload` (payload, requires `Accept` header matching `content_type`), `GET /v1/secrets/{id}/metadata` (user labels)

---

### Story 3: Create a secret

**As a** project member
**I want to** store a new secret in the Key Manager
**So that** credentials and key material are centrally managed and accessible to my project without insecure ad-hoc storage

**Acceptance Criteria:**

- [ ] A "Create secret" action triggers a creation form
- [ ] Required fields: **Name**, **Secret Type** (symmetric / asymmetric / public / private / passphrase / certificate / opaque), **Payload**, **Payload Content Type**
- [ ] Optional fields: **Algorithm**, **Bit Length**, **Mode**, **Expiration** (date picker)
- [ ] On success: the new secret appears in the list and a success notification is shown
- [ ] On validation error: inline field-level error messages shown without closing the form
- [ ] On API error: error surfaced with Barbican's error message
- [ ] The form surfaces a clear note that payloads are immutable after creation — to change a payload, delete and recreate the secret

**Notes:**
API: `POST /v1/secrets` — fields: `name`, `secret_type`, `payload`, `payload_content_type`, `payload_content_encoding`, `algorithm`, `bit_length`, `mode`, `expiration`

---

### Story 4: Delete a secret

**As a** project member
**I want to** delete a secret I no longer need
**So that** stale credentials are not left in the Key Manager indefinitely

**Acceptance Criteria:**

- [ ] Delete action available both in the per-row action controls and in the secret detail view
- [ ] A confirmation prompt is shown before the deletion proceeds (`DELETE /v1/secrets/{id}`)
- [ ] On success: secret removed from the list, success notification shown
- [ ] On error: error surfaced with Barbican's error message; secret not removed from the list
- [ ] The confirmation prompt notes that deleting a secret referenced by a container does not automatically update the container (the container will have a dangling ref)

**Notes:**
API: `DELETE /v1/secrets/{id}`

---

### Story 5: Manage secret metadata labels

**As a** project member
**I want to** attach, edit, and remove custom key-value labels on a secret
**So that** I can annotate secrets with context (e.g. `env: production`, `owner: team-a`) for easier discovery and governance

**Acceptance Criteria:**

- [ ] The secret detail view shows existing metadata labels as a key-value table
- [ ] **Add label**: key + value inputs; on save, calls `POST /v1/secrets/{id}/metadata` and the new label appears in the table
- [ ] **Edit label**: in-place edit of value; on save, calls `PUT /v1/secrets/{id}/metadata/{key}`
- [ ] **Delete label**: a delete control per label row; calls `DELETE /v1/secrets/{id}/metadata/{key}` after confirmation
- [ ] Loading state shown while each operation is in flight; error state shown on failure, surfacing the Barbican error message (`title`/`description`) when present

**Notes:**
API: `GET /v1/secrets/{id}/metadata`, `POST /v1/secrets/{id}/metadata`, `PUT /v1/secrets/{id}/metadata/{key}`, `DELETE /v1/secrets/{id}/metadata/{key}`

---

### Story 6: Browse, view, create, and delete containers

**As a** project member
**I want to** group related secrets into named containers
**So that** I can manage certificate+key bundles, RSA key pairs, and other related credentials as a single unit

**Acceptance Criteria:**

- [ ] Lists all containers via `GET /v1/containers` (server-side pagination: `offset` + `limit`)
- [ ] Displays per row: **Name** + **ID** (stacked, copy-to-clipboard for ID) / **Status** / **Container Type** / per-row actions (Show details, Delete)
- [ ] Client-side search by Name (substring match) and sort by Name, Status, Container Type, and Created over all fetched pages (Barbican list API provides pagination only; no server-side filter/sort for containers)
- [ ] **Create container** form: Name, Type (generic / rsa / certificate), named secret references (key: ref name, value: secret URI); required secret refs vary by type — `certificate` type requires `certificate`; `rsa` type requires `public_key` and `private_key`; other refs are optional
- [ ] **Detail view**: Name, ID (copy-to-clipboard), Type, Status, Created, Updated, secret_refs list (each ref name + URI, URI with copy-to-clipboard affordance)
- [ ] **Delete** with confirmation prompt
- [ ] Empty state shown when no containers exist; loading state shown while the list request is in flight; error state shown on failure, surfacing the Barbican error message (`title`/`description`) when present; create and delete errors surfaced inline with the Barbican error message

**Notes:**
API: `GET /v1/containers`, `POST /v1/containers`, `GET /v1/containers/{id}`, `DELETE /v1/containers/{id}`
Container types: `generic`, `rsa`, `certificate`

---

### Story 7: Browse, create, view, and delete orders

**As a** project member
**I want to** place asynchronous key-generation orders and track their status
**So that** I can have Barbican generate cryptographic key material on my behalf without managing key generation locally

**Acceptance Criteria:**

- [ ] Lists all orders via `GET /v1/orders` (server-side pagination: `offset` + `limit`)
- [ ] Displays per row: **Name** + **ID** (stacked, copy-to-clipboard for ID) / **Status** (PENDING / ACTIVE / ERROR / CANCELLED) / **Order Type** / per-row actions (Show details, Delete)
- [ ] A visible status indicator communicates the current order state; PENDING state is visually distinct from ACTIVE and ERROR
- [ ] Client-side search by Name (substring match) and sort by Name, Status, Order Type, and Created over the fetched page (Barbican list API provides pagination only; no server-side filter/sort for orders)
- [ ] **Create order** form: Type (key = symmetric key, asymmetric = key pair), Algorithm, Bit Length, Mode (optional), Name (optional), Expiration (optional)
- [ ] **Detail view**: Type, Status, Sub-status detail (`sub_status_message`), Algorithm, Bit Length, Mode, Created, Updated; when ACTIVE — `secret_ref` (for `key` orders) or `container_ref` (for `asymmetric` orders) shown with copy-to-clipboard affordance and a link to the generated secret / container
- [ ] Order status refreshes automatically while in PENDING state (polling interval or subscription — open item, see Q-F6)
- [ ] **Delete** with confirmation prompt
- [ ] Empty state shown when no orders exist; loading state shown while the list request is in flight; error state shown on failure, surfacing the Barbican error message (`title`/`description`) when present; create and delete errors surfaced inline with the Barbican error message

**Notes:**
API: `GET /v1/orders`, `POST /v1/orders`, `GET /v1/orders/{id}`, `DELETE /v1/orders/{id}`
Order types in scope: `key` (symmetric), `asymmetric` (key pair). Certificate order type is out of scope (§4).
Order status values: PENDING, ACTIVE, ERROR, CANCELLED

---

## 5.2 Required User Actions

**All authenticated project members (single persona):**

**Secrets:**

- [ ] Browse, search, sort, and filter the project secrets list
- [ ] View a secret's full metadata attributes
- [ ] Reveal a secret's payload (masked by default)
- [ ] Copy a secret's payload to the clipboard
- [ ] Download a secret's payload as a file
- [ ] Copy a secret's ID to the clipboard
- [ ] Create a new secret
- [ ] Delete a secret
- [ ] Add / edit / delete custom metadata labels on a secret

**Containers:**

- [ ] Browse the project containers list
- [ ] View a container's details and its secret references
- [ ] Copy a container's ID or a secret reference URI to the clipboard
- [ ] Create a container with named secret references
- [ ] Delete a container

**Orders:**

- [ ] Browse the project orders list
- [ ] View an order's details and track its async status
- [ ] Copy an order's ID or the resulting secret/container reference to the clipboard
- [ ] Create a key-generation order (symmetric key or asymmetric key pair)
- [ ] Delete an order

---

## 6. Release Scope & Prioritization

All three Barbican resources — secrets (including payload access and metadata labels), containers, and orders — ship together in the **initial release**. Nothing in this BRD is deferred to a subsequent release.

The initial release does not include ACL management, consumer registration, secret store configuration, quota management, or cross-project/domain-scoped admin operations (§4). Those are explicit non-goals for this BRD and would require a separate future BRD if ever needed.

Certificate-type orders are also deferred — this requires integration with an external CA plugin and is significantly more complex than key/asymmetric orders; it is out of scope for this release (§4).

---

## 7. API Information

### Details

|                           |                                                                                      | Notes                                                   |
| ------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| **Service Documentation** | https://docs.openstack.org/barbican/latest/                                          | OpenStack Barbican Key Manager documentation            |
| **API Docs**              | https://docs.openstack.org/barbican/latest/api/                                      | Barbican v1 API reference                               |
| **API Spec**              | https://docs.openstack.org/barbican/latest/api/reference/secrets.html (and siblings) | Secrets, Containers, Orders reference pages             |
| **API stable?**           | [x] Yes [ ] No                                                                       | Barbican v1 is stable; confirmed available in QA (Q-C6) |
| **API available in QA**   | [x] Yes [ ] No                                                                       | Confirmed stable and available (Q-C6)                   |

### Authentication Mode

Aurora BFF pattern. The browser never holds the Keystone token directly. All tRPC procedures accessing Barbican use `projectScopedProcedure`, which auto-rescopes the session token to the active project; `packages/signal-openstack` injects the `X-Auth-Token` header on every server-side request. Client code calls tRPC procedures only — never Barbican directly.

### Rate Limits / Throttling

> ⚠️ **Still needed**: Barbican rate limiting is deployment-specific. Confirm with the platform/infrastructure team whether rate limiting is active in the target environment and what headers (if any) signal quota exhaustion (Q-N1 not answered).

### Error Response Shape

> ⚠️ **Still needed**: Confirm the Barbican error response schema in the target deployment (Q-N2 not answered). Standard OpenStack Barbican uses:
>
> ```json
> { "title": "...", "description": "...", "code": NNN }
> ```
>
> Verify this applies and note any correlation ID headers.

### Dev Environment

| Property                             | Value           |
| ------------------------------------ | --------------- |
| **Dev/QA endpoint URL**              | ⚠️ Still needed |
| **Region**                           | ⚠️ Still needed |
| **Test tenant / project ID**         | ⚠️ Still needed |
| **Seed data or mock data available** | ⚠️ Still needed |
| **Access credentials**               | ⚠️ Still needed |

> ⚠️ **Still needed**: Dev/QA environment details not provided (Q-N3 not answered).

### OpenStack Service Catalog Registration

#### Service Catalog Entry

| Property                | Value                 | Confirmed?     |
| ----------------------- | --------------------- | -------------- |
| **Service Name**        | barbican              | [x] Yes [ ] No |
| **Service Type**        | key-manager           | [x] Yes [ ] No |
| **Service Description** | OpenStack Key Manager | [x] Yes [ ] No |
| **API Version**         | v1                    | [x] Yes [ ] No |

#### How will the UI discover the service

Via `getServiceIndex("key-manager")` in `buildNavSections.ts`. Each Authorization sub-scope (Key Manager and future scopes) checks for its own service type in its own layout file's `beforeLoad` — there is no shared `authorization.tsx` layout. Key Manager's guard lives in `key-manager.tsx`.

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack**

Keystone (OpenStack identity). Aurora BFF pattern — token stored server-side in an HTTP-only cookie, injected by `signal-openstack` on every Barbican API call. Client code never accesses the token directly.

**Required roles or equivalent**

| Action                           | Required role                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Browse secrets list              | Any authenticated project member — Access Denied shown if Barbican restricts list access  |
| View secret metadata             | Any authenticated project member — Access Denied shown if Barbican restricts get access   |
| Reveal / download secret payload | Any authenticated project member with payload permission — specific error shown if denied |
| Create secret                    | Project members with write permission — control hidden for users without it               |
| Delete secret                    | Project members with delete permission — control hidden for users without it              |
| Manage secret metadata labels    | Project members with update permission — controls hidden for users without it             |
| Browse / view containers         | Any authenticated project member — Access Denied shown if Barbican restricts list access  |
| Create / delete container        | Project members with write / delete permission — controls hidden for users without them   |
| Browse / view orders             | Any authenticated project member — Access Denied shown if Barbican restricts list access  |
| Create / delete order            | Project members with write / delete permission — controls hidden for users without them   |

The UI checks Barbican permissions proactively. Create and delete controls are hidden for users who lack the corresponding write or delete permission. Browse and view actions are available to any authenticated project member; if Barbican restricts list or get access, the UI shows an Access Denied error state instead of the data.

**Scope**

- [x] Project-scoped
- [ ] Domain-scoped
- [ ] Both

All requests use `projectScopedProcedure` — the token is automatically rescoped to the active project before each Barbican API call.

**Who is explicitly denied?**

Unauthenticated users and users with no role in the current project cannot access the scope. The Key Manager nav entry is hidden when the `key-manager` service type is absent from the project's Keystone catalog. If Barbican policy denies an operation for a given role (e.g. 403 on payload retrieval), the UI handles the response with a specific error state rather than a generic one.

### Dependencies on Other Teams or Services

**Blocking services**

- OpenStack Barbican v1 — must be present in the Keystone service catalog. Confirmed stable and available in QA (Q-C6).
- Aurora Dashboard platform — the `authorization/` route tree and layout file are new and must be created as part of this work.

**Cross-team approvals needed**

> ⚠️ **Still needed**: Confirm whether any cross-team approvals or security reviews are required before shipping a UI that surfaces secret payloads and private key material (Q-N4 not answered). A security review is plausible given the sensitivity of Barbican payloads.

**Expected dependency timelines**

No blocking **technical** dependencies identified. Platform prerequisites (Aurora Dashboard, Barbican v1) are already in place. Whether a **security review** is required before launch (Q-N4) is still open — until that is confirmed, cross-team dependencies cannot be declared fully resolved.

---

## 9. Rollout & Support

### Rollout Strategy

> ⚠️ **Still needed**: Rollout strategy not specified (Q-N5 not answered). By default the Key Manager scope becomes visible automatically for any project where the `key-manager` service type is present in the Keystone catalog — this provides implicit per-deployment gating without a separate feature flag, consistent with the existing Aurora scopes.

### Who needs to be informed before go-live?

> ⚠️ **Still needed**: Confirm stakeholders to notify before launch (Q-N5 not answered).

### Post-launch Support

> ⚠️ **Still needed**: Post-launch support ownership, escalation path for bugs, and observability/monitoring plan not specified (Q-N5 not answered).

---

## Appendix: Open Framework Questions (Aurora developer)

| Q-ID | Question                                                                                                                                                            | Status                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-F1 | Confirm that Pattern A (new built-in scope under a new "Authorization" category) is correct and that there is no existing `key-manager` scope in the Aurora repo.   | ✅ Confirmed — Pattern A; guard in `key-manager.tsx`; no prior scope.                                                                                    |
| Q-F2 | How is the Keystone token injected into Barbican requests?                                                                                                          | ✅ BFF — `projectScopedProcedure`; `signal-openstack` injects `X-Auth-Token`.                                                                            |
| Q-F3 | How does the nav entry gate on the `key-manager` service catalog entry?                                                                                             | ✅ Via `getServiceIndex("key-manager")` in `buildNavSections.ts` and the `key-manager.tsx` `beforeLoad` guard.                                           |
| Q-F4 | How should secret payloads be displayed securely (masked, reveal on demand)? Does Juno provide a masked-reveal-on-demand component for this use case?               | ✅ Juno `SecretText` component — controlled (`readOnly`, `value` from local state); reveal calls `getSecretPayload`; hide clears local state.            |
| Q-F5 | For file download (PEM cert, private key payload): is tRPC SSE streaming required, or is a simpler server-side download endpoint acceptable for small PEM payloads? | ✅ Client-side `Blob` + `URL.createObjectURL` — no SSE required. Extensions: `.pem` for cert MIME types, `.txt` for `text/plain`, `.bin` for all others. |
| Q-F6 | For order status polling (PENDING → ACTIVE/ERROR): is `refetchInterval` (TanStack Query) acceptable, or does the team prefer tRPC SSE subscriptions?                | ✅ `refetchInterval: 5000` while any order is `PENDING`; interval disabled once all orders are terminal.                                                 |

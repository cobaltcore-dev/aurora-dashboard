# Epic: Key Manager UI (OpenStack Barbican)

Source BRD: [key-manager-brd.md](../key-manager-brd.md)
Target surface: Aurora — new built-in scope (Pattern A), new top-level "Authorization" navigation category
Development context (source of truth): `.claude/context/aurora-dashboard.md`, `.claude/context/juno.md`
Status: ready-for-engineering

> **Scope:** Full create, view, and delete browser for OpenStack Barbican secrets (including
> masked payload reveal, file download, copy-to-clipboard, and custom metadata labels),
> containers, and asynchronous key-generation orders. All three resources ship in this single
> initial release. The Key Manager nav entry is shown only when the `key-manager` service type
> is present in the project's Keystone catalog.

## Terminology

| Term                           | Definition                                                                                                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Secret Identity URI**        | The `secret_ref` field on a Secret entity — its stable, absolute URI identifier (e.g. `https://barbican.../v1/secrets/abc-123`). Used to derive the Secret's UUID via path extraction. |
| **Container Secret Reference** | A `{ name, secret_ref }` entry inside a Container's `secret_refs` array — a named pointer from a Container slot to a Secret. Distinct from the Secret's own identity.                  |

---

## Epic index

| Epic                                  | Tickets                               | Blocked by                                                 |
| ------------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| Epic 1 — Key Manager: Initial Release | 01 · 02 · 03 · 04 · 05 · 06 · 07 · 08 | None — Barbican v1 is confirmed stable and available in QA |

## Dependency graph

```
[01] Authorization scope scaffold (route tree · nav · tRPC stub)
       │
       ├──[02] Secrets list
       │        ├──[03] Secret detail page
       │        │        └──[06] Secret metadata labels (CRUD in detail)
       │        ├──[04] Create secret (modal)
       │        └──[05] Delete secret (modal confirmation)
       │
       ├──[07] Containers list + detail + create/delete
       │
       └──[08] Orders list + detail + create/delete + PENDING auto-refresh
```

Ticket 01 (scaffold) blocks all feature tickets.
Tickets 02–08 can be built in parallel once 01 is merged.
Ticket 06 (metadata labels CRUD) lives inside the detail page built in 03; start 06 after 03.

---

# Epic 1 — Key Manager: Initial Release

One epic delivering all three Barbican resource types. Ticket 01 is the gating prerequisite —
it installs the route tree, nav entry, and tRPC stub that all feature tickets depend on.

---

## 01 — Authorization scope scaffold

**What to build:** The route tree, catalog guard layout, nav entry, and tRPC stub that gate and
expose the entire Key Manager scope. No visible UI beyond the nav link. All feature tickets
(02–08) depend on this being merged first.

**Blocked by:** None (can start immediately) · **Status:** ready-for-agent

**Acceptance Criteria**

- [ ] A new `key-manager.tsx` layout file exists at `.../authorization/key-manager.tsx`; its `beforeLoad` calls `getServiceIndex("key-manager")` and throws `redirect({ to: "/projects/$projectId" })` (silent, no toast) when the service is absent from the catalog
- [ ] Route directory `authorization/key-manager/` is created under `$projectId/`; an `index.tsx` placeholder (renders nothing or a loading skeleton) confirms TanStack Router picks up the route tree
- [ ] A new "Authorization" section is added to `buildNavSections.ts` (same level as the existing network/compute/storage groups), gated on `getServiceIndex("key-manager")`; a "Key Manager" nav item inside it links to the key-manager index route
- [ ] A stub `keyManagerRouter` tRPC namespace is registered in `packages/aurora/src/server/routers.ts` via `buildBaseRouter()`; the stub has no procedures yet — its purpose is to confirm the namespace compiles and routes correctly before feature work begins
- [ ] TypeScript compiles cleanly; no console errors when navigating to a project with `key-manager` in its catalog

**Aurora implementation notes**

- **Pattern A — new built-in scope.** Key Manager is NOT a service extension (`serviceExtensions` prop). It uses file-based TanStack Router routes, exactly like `network/floatingips/`, `network/routers/`, and `network/securitygroups/`.
- **Authorization category.** The "Authorization" nav category is new — it sits at the same level as "Network", "Compute", "Storage" in `buildNavSections.ts`. Key Manager is the first scope under it; the category is intentionally broader for future credential scopes (HSM, PCA, etc.).
- **Catalog guard.** The guard lives in `authorization/key-manager.tsx`'s `beforeLoad` (not a separate `authorization.tsx` layout). It calls `getServiceIndex("key-manager")` and throws `redirect({ to: "/projects/$projectId" })` when absent — a silent redirect, no toast. Future Authorization scopes under this category each implement their own catalog guard.
- **tRPC namespace.** The stub router lives at `packages/aurora/src/server/KeyManager/keyManagerRouter.ts`. Subresource routers (`secretsRouter`, `containersRouter`, `ordersRouter`) are added in tickets 02–08 and merged into `keyManagerRouter`.

**BRD Reference** — §3 (Target Surface) · §7 (Service Catalog) · §8 (Auth)

---

## 02 — Secrets list

**What to build:** The DataGrid-based list view for all project secrets. Server-side search by
name, filter by Secret Type and Algorithm, column-header sort (all sortable fields), and
server-side pagination. Per-row PopupMenu leading to "View Details" and "Delete".

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to browse all secrets in my project with search,
sort, and filter, so that I can quickly find a specific secret, check expiration status, and
assess the project's secret inventory at a glance.

**Acceptance Criteria**

- [ ] Lists all project secrets via `GET /v1/secrets` (server-side pagination: `offset` + `limit`, default page size 25)
- [ ] Each row displays: **Name** (top line) + **ID** (second line, with `ClipboardText`) / **Status** / **Secret Type** + **Content Type** (stacked) / **PopupMenu** with "View Details" (navigates to detail route) and — separated by a divider — "Delete" (opens confirmation modal from Ticket 05)
- [ ] DataGridToolbar Zone 2: `SearchInput` for name (300 ms debounce, server-side `name` param), "Secret Type" select filter (all `secret_type` values + "All"), "Algorithm" select filter (`alg` param) with static options All | AES | RSA | HMAC | 3DES | DSA | EC; active filters compose with AND; "Clear filters" resets all
- [ ] Sort by column header: Name, Status, Secret Type, Created, Expiration, Updated (server-side `sort=<field>:asc|:desc`); active sort direction indicated in the column header; secrets with `expiration: null` sort last when sorting by Expiration ascending
- [ ] `Pagination` component (`variant="input"`) below the grid
- [ ] Empty state via `Status` component when no secrets exist (with a "Create secret" call-to-action)
- [ ] Loading state scoped to the DataGrid (not full-page) while the request is in flight
- [ ] Error state via inline `Message` (persistent) if the API call fails, surfacing the Barbican error `title`/`description`; `Status` component distinguishes "no data" from "no results match your filters"
- [ ] "Create secret" button in DataGridToolbar Zone 1 opens the Create Secret modal (Ticket 04)

**Aurora / Juno implementation notes**

- **Route file:** `packages/aurora/src/client/routes/_auth/projects/$projectId/authorization/key-manager/index.tsx`
- **tRPC procedure:** `keyManager.secrets.list` — uses `projectScopedProcedure`; accepts `{ name?, secret_type?, alg?, sort?, offset, limit }` and calls `GET /v1/secrets` with those params. Returns `{ secrets, total, next, previous }`.
- **Client state:** `trpcReact.keyManager.secrets.list.useQuery(params)` with `placeholderData: (prev) => prev` for stale-while-revalidate. Route/URL search params (TanStack Router, Zod-validated) hold `name`, `secret_type`, `alg`, `sort`, `offset`.
- **Search debounce:** 300 ms `useState` local delay before updating the URL search param.
- **Juno components:** `DataGrid`, `DataGridToolbar`, `DataGridHeadCell` (sortable), `DataGridRow`, `DataGridCell`, `SearchInput`, `Pagination` (`variant="input"`), `PopupMenu`, `Status`, `Message`; `ClipboardText` from `@aurora/components`.
- **Sort toggle:** clicking an already-active column header flips `:asc` ↔ `:desc`; clicking a new column resets to `:asc`.
- **Barbican `name` filter** uses similarity match on the server side — not exact prefix.

**BRD Reference** — Story 1 §5.1 · API §7 · Auth §8

---

## 03 — Secret detail page

**What to build:** A full-route detail page for a single secret. Shows all metadata fields,
payload masked behind a SecretText reveal toggle (fetched on demand), copy/download affordances,
and a read-only metadata labels table (CRUD added in Ticket 06).

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to open a secret and see its full metadata and
retrieve its payload, so that I can inspect configuration, copy credentials, or download key
material without CLI access.

**Acceptance Criteria**

- [ ] Navigating to the detail route shows: Name, ID (`ClipboardText`), Status, Secret Type, Content Type, Algorithm, Bit Length, Mode, Expiration, Created, Updated
- [ ] **Payload section:** `SecretText` in `readOnly` mode; masked by default; on reveal toggle: calls `GET /v1/secrets/{id}/payload` (with `Accept` header matching `content_type`) and passes the result as the `value` prop; on hide: clears the fetched value from local state
- [ ] Copy-to-clipboard affordance for the payload (SecretText `copy` prop)
- [ ] **Download affordance:** button that triggers a file download of the raw payload bytes; filename extension `.pem` for `application/x-pem-file`, `.txt` for `text/plain`, `.bin` for all other content types
- [ ] **Metadata labels table** (read-only): key-value rows loaded from `GET /v1/secrets/{id}/metadata`; editing and mutation added in Ticket 06
- [ ] Loading states scoped to each section while their respective fetches are in flight; inline `Message` (persistent) on failure — both the metadata fetch and the payload fetch report errors separately
- [ ] If the payload fetch returns 403, the error `Message` specifically notes the role lacks payload access (not a generic error)
- [ ] A "Delete" button (or equivalent) opens the confirmation modal (Ticket 05)

**Aurora / Juno implementation notes**

- **Route file:** `packages/aurora/src/client/routes/_auth/projects/$projectId/authorization/key-manager/secrets.$secretId.tsx`
- **tRPC procedures (add to `secretsRouter`):**
  - `keyManager.secrets.get` — `projectScopedProcedure`; calls `GET /v1/secrets/{id}`
  - `keyManager.secrets.getPayload` — `projectScopedProcedure`; calls `GET /v1/secrets/{id}/payload` with the forwarded `Accept` header; returns the raw payload string
  - `keyManager.secrets.getMetadata` — `projectScopedProcedure`; calls `GET /v1/secrets/{id}/metadata`
- **Payload reveal flow:** `SecretText` is controlled (`readOnly`, `value` from local state). On `onReveal`: fire `trpcReact.keyManager.secrets.getPayload.useQuery` (or imperative `trpcClient.keyManager.secrets.getPayload.query`). On `onHide`: clear the local `value` state.
- **Juno components:** `SecretText` (from `@cloudoperators/juno-ui-components`), `ClipboardText` (from `@aurora/components`), `Message`, `Button`, `DescriptionList`/`DescriptionTerm`/`DescriptionDefinition` (or equivalent for metadata fields).
- **Download:** client-side `Blob` + `URL.createObjectURL` + synthetic `<a>` click. SSE streaming (as in `swiftRouter.ts`) is not required — Barbican payloads are small (typically under 8 KB).

**BRD Reference** — Story 2 §5.1 · API §7 · Auth §8

---

## 04 — Create secret

**What to build:** A Modal containing the Create Secret form. Eight fields. Inline validation.
Payload-immutability note. Toast on success; inline Message on API error.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to store a new secret in the Key Manager, so that
credentials and key material are centrally managed and accessible to my project without
insecure ad-hoc storage.

**Acceptance Criteria**

- [ ] "Create secret" button (in Ticket 02 toolbar) opens a `Modal`
- [ ] **Required fields:** Name (`TextInput`), Secret Type (`Select` — symmetric/asymmetric/public/private/passphrase/certificate/opaque), Payload (`Textarea`), Payload Content Type (`TextInput` or `Select`)
- [ ] **Optional fields:** Algorithm (`TextInput`), Bit Length (`TextInput`, numeric), Mode (`TextInput`), Expiration (`DateTimePicker`)
- [ ] The form displays a prominent note: _"Payloads are immutable after creation — to change a payload, delete and recreate the secret."_
- [ ] Submit calls `POST /v1/secrets`; on success: Modal closes, list revalidates, `toast` success notification shown
- [ ] Inline field-level error messages shown below each field on validation failure; Modal stays open
- [ ] On API error: inline `Message` (persistent) inside the Modal with the Barbican `title`/`description`; Modal stays open

**Aurora / Juno implementation notes**

- **tRPC procedure:** `keyManager.secrets.create` — `projectScopedProcedure`; calls `POST /v1/secrets`; validates and passes all fields through.
- **Client:** `trpcReact.keyManager.secrets.create.useMutation()`; on success call `utils.keyManager.secrets.list.invalidate()` to refresh the list.
- **Juno components:** `Modal`, `Form`, `FormRow`, `TextInput`, `Textarea`, `Select`/`SelectOption`, `DateTimePicker`, `Button` (`primary` for submit, `default` for cancel), `Message`.
- **toast:** call `toast("Secret created successfully")` (imperative, from `@cloudoperators/juno-ui-components`) from the `onSuccess` mutation callback.

**BRD Reference** — Story 3 §5.1 · API §7 · Auth §8

---

## 05 — Delete secret

**What to build:** A Modal confirmation for deleting a secret. Available from the per-row
PopupMenu (Ticket 02) and the detail page Delete button (Ticket 03). Notes dangling-container
risk. Toast on success; inline Message on failure.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to delete a secret I no longer need, so that stale
credentials are not left in the Key Manager indefinitely.

**Acceptance Criteria**

- [ ] "Delete" in the per-row PopupMenu (Ticket 02) and the Delete button on the detail page (Ticket 03) both open the same confirmation `Modal`
- [ ] Modal title: "Delete Secret"; body identifies the secret by name; body notes: _"Deleting a secret referenced by a container does not automatically update the container — the container will have a dangling reference."_
- [ ] `primary-danger` styled confirm button (always enabled — Low risk per Juno modals.md)
- [ ] On confirm: calls `DELETE /v1/secrets/{id}`; on success: Modal closes, list revalidates, `toast` success notification shown; if called from the detail page, navigate back to the secrets list
- [ ] On API error: Modal stays open; inline `Message` (persistent) inside the Modal with the Barbican `title`/`description`; secret is not removed from the list

**Aurora / Juno implementation notes**

- **tRPC procedure:** `keyManager.secrets.delete` — `projectScopedProcedure`; calls `DELETE /v1/secrets/{id}`.
- **Client:** `trpcReact.keyManager.secrets.delete.useMutation()`; on success call `utils.keyManager.secrets.list.invalidate()`.
- **Juno components:** `Modal`, `ModalFooter`, `Button` (`primary-danger` for confirm), `Message`.
- **Navigation:** If the delete is triggered from the detail page, navigate to `../` (the secrets list) after successful deletion.

**BRD Reference** — Story 4 §5.1 · API §7 · Auth §8

---

## 06 — Secret metadata labels

**What to build:** CRUD for custom key-value metadata labels, rendered inside the secret detail
page (Ticket 03). Each mutation has its own loading and error state.

**Blocked by:** 03 · **Status:** ready-for-agent

**User story:** As a project member, I want to attach, edit, and remove custom key-value labels
on a secret, so that I can annotate secrets with context (e.g. `env: production`, `owner: team-a`)
for easier discovery and governance.

**Acceptance Criteria**

- [ ] Existing labels are shown as a key-value table (already loaded in Ticket 03)
- [ ] When no labels exist, an empty state is shown ("No labels yet") with an "Add label" call-to-action button
- [ ] **Add label:** key + value inputs; on save calls `POST /v1/secrets/{id}/metadata`; new label appears in the table; inline loading indicator while in flight; inline `Message` (persistent) on error with Barbican `title`/`description` (Barbican returns 409 for duplicate keys — no client-side pre-check required)
- [ ] **Edit label:** in-place value edit; on save calls `PUT /v1/secrets/{id}/metadata/{key}`; inline loading; error `Message` on failure
- [ ] **Delete label:** per-row delete control; calls `DELETE /v1/secrets/{id}/metadata/{key}` after confirmation; inline loading; error `Message` on failure
- [ ] Each operation's loading and error state is scoped to the affected row (not the full page)

**Aurora / Juno implementation notes**

- **tRPC procedures (add to `secretsRouter`):**
  - `keyManager.secrets.addMetadata` — `POST /v1/secrets/{id}/metadata`
  - `keyManager.secrets.updateMetadataKey` — `PUT /v1/secrets/{id}/metadata/{key}`
  - `keyManager.secrets.deleteMetadataKey` — `DELETE /v1/secrets/{id}/metadata/{key}`
- **Client:** use `useMutation` for each; on success call `utils.keyManager.secrets.getMetadata.invalidate({ secretId })`.
- **Juno components:** `DataGrid` (or `DescriptionList`) for the labels table, `TextInput`, `Button`, `Message`.

**BRD Reference** — Story 5 §5.1 · API §7 · Auth §8

---

## 07 — Containers list + detail + create/delete

**What to build:** Full CRUD browser for containers. The list is client-side searchable and
sortable (Barbican containers API provides pagination only, no server-side filter/sort). Detail
is a full route page. Create and delete use Modals.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to group related secrets into named containers, so
that I can manage certificate+key bundles, RSA key pairs, and other related credentials as a
single unit.

**Acceptance Criteria**

- [ ] Lists all containers via `GET /v1/containers` (server-side pagination: `offset` + `limit`)
- [ ] Each row: **Name** + **ID** (stacked, `ClipboardText` for ID) / **Status** / **Container Type** / **PopupMenu** ("View Details" first, "Delete" last with divider)
- [ ] Client-side search by Name (substring match); client-side sort by Name, Status, Container Type, Created over all fetched data
- [ ] `Pagination` (`variant="input"`) below the grid
- [ ] **Create container** button opens a `Modal`: Name (`TextInput`), Type (`Select` — generic/rsa/certificate); the form shows type-specific named-ref inputs with client-side required-field validation:
  - **generic:** any number of named refs (free key-value list)
  - **rsa:** `public_key` (required), `private_key` (required), `private_key_passphrase` (optional)
  - **certificate:** `certificate` (required), `private_key` (optional), `private_key_passphrase` (optional), `intermediates` (optional)
- [ ] On create success: Modal closes, list revalidates, `toast` success notification
- [ ] **Detail page** (full route `/containers/$containerId`): Name, ID (`ClipboardText`), Type, Status, Created, Updated, `secret_refs` list (each Container Secret Reference shown as ref name + Secret Identity URI; the URI links to the referenced Secret's detail page)
- [ ] **Delete** (from PopupMenu and detail page): `Modal` confirmation, `primary-danger` button, `toast` on success
- [ ] Empty / loading / error states per Ticket 02 pattern; create and delete errors surface Barbican `title`/`description` in inline `Message`

**Aurora / Juno implementation notes**

- **Route files:**
  - `authorization/key-manager/containers.index.tsx` — containers list
  - `authorization/key-manager/containers.$containerId.tsx` — container detail
- **tRPC procedures (new `containersRouter.ts` in `KeyManager/`):**
  - `keyManager.containers.list` — `GET /v1/containers?offset=…&limit=…`
  - `keyManager.containers.get` — `GET /v1/containers/{id}`
  - `keyManager.containers.create` — `POST /v1/containers`
  - `keyManager.containers.delete` — `DELETE /v1/containers/{id}`
- **Client-side filter/sort:** fetch all pages via `useAllKeyManagerPages`; apply `Array.filter` (substring name match) and `Array.sort` (by selected field) over the full dataset before slicing for display. `offset` in URL search params drives client-side pagination; filter/sort state is local (no URL).
- **Juno components:** same as secrets list (DataGrid, DataGridToolbar, SearchInput, Pagination, PopupMenu, Message, Status, Modal).

**BRD Reference** — Story 6 §5.1 · API §7 · Auth §8

---

## 08 — Orders list + detail + create/delete + PENDING auto-refresh

**What to build:** Full CRUD browser for key-generation orders. Orders are asynchronous — PENDING
orders auto-refresh every ~5s (TanStack Query `refetchInterval`) and show a Spinner in the
Status cell. Detail page shows sub-status detail and links to the generated secret/container
when ACTIVE. Create and delete use Modals.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to place asynchronous key-generation orders and
track their status, so that I can have Barbican generate cryptographic key material on my behalf
without managing key generation locally.

**Acceptance Criteria**

- [ ] Lists all orders via `GET /v1/orders` (server-side pagination: `offset` + `limit`)
- [ ] Each row: **Name** + **ID** (stacked, `ClipboardText` for ID) / **Status** (with `Spinner` inline when PENDING) / **Order Type** / **PopupMenu** ("View Details" first, "Delete" last with divider)
- [ ] Client-side search by Name (substring match); client-side sort by Name, Status, Order Type, Created over all fetched data
- [ ] `Pagination` (`variant="input"`) below the grid
- [ ] While any row has `status === "PENDING"`: list query uses `refetchInterval: 5000`; once all visible orders are terminal (ACTIVE / ERROR / CANCELLED) the interval is disabled
- [ ] **Create order** button opens a `Modal`: Type (`Select` — key/asymmetric), Algorithm (`TextInput`), Bit Length (`TextInput`, numeric), Mode (`TextInput`, optional — hidden when Type is `asymmetric`), Name (`TextInput`, optional), Expiration (`DateTimePicker`, optional); `POST /v1/orders`; `toast` on success; inline `Message` on error
- [ ] **Detail page** (full route `/orders/$orderId`): Type, Status, `sub_status_message`, Algorithm, Bit Length, Mode, Created, Updated; when ACTIVE — `secret_ref` (for `key` orders) or `container_ref` (for `asymmetric` orders) shown with `ClipboardText` and a link to the generated secret/container detail route
- [ ] Detail page also auto-refreshes while `status === "PENDING"` (`refetchInterval: 5000`)
- [ ] **Delete** (from PopupMenu and detail page): `Modal` confirmation, `primary-danger` button, `toast` on success; if `order.status === "PENDING"`, the modal body adds: _"This order is still being processed. Deleting it now may leave partial key material in Barbican."_
- [ ] Empty / loading / error states per Ticket 02 pattern; create and delete errors surface Barbican `title`/`description` in inline `Message`

**Aurora / Juno implementation notes**

- **Route files:**
  - `authorization/key-manager/orders.index.tsx` — orders list
  - `authorization/key-manager/orders.$orderId.tsx` — order detail
- **tRPC procedures (new `ordersRouter.ts` in `KeyManager/`):**
  - `keyManager.orders.list` — `GET /v1/orders?offset=…&limit=…`
  - `keyManager.orders.get` — `GET /v1/orders/{id}`
  - `keyManager.orders.create` — `POST /v1/orders`
  - `keyManager.orders.delete` — `DELETE /v1/orders/{id}`
- **Auto-refresh pattern:**
  ```ts
  const hasPending = orders.some((o) => o.status === "PENDING")
  trpcReact.keyManager.orders.list.useQuery(params, {
    refetchInterval: hasPending ? 5000 : false,
  })
  ```
  Same pattern for the detail query when `order.status === "PENDING"`.
- **PENDING Spinner:** render a `Spinner` (small) alongside the Status text in the Status cell when `status === "PENDING"`. For terminal states, render the `Status` component with the appropriate semantic variant (`success` for ACTIVE, `error` for ERROR, `warning` for CANCELLED).
- **Order types in scope:** `key` (symmetric key generation) and `asymmetric` (key-pair generation). Certificate order type is out of scope — do not add it to the Type select.
- **Juno components:** same as containers ticket, plus `Spinner`.

**BRD Reference** — Story 7 §5.1 · API §7 · Auth §8

---

## Open items roll-up (resolve before / at build)

| Open item                                                                                                          | Ticket | Owner                       |
| ------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------- |
| Q-N1: Barbican rate limits in the target deployment                                                                | 02     | Platform/infra team         |
| Q-N2: Barbican error response shape — confirm `{ title, description, code }` schema and any correlation ID headers | 02–08  | Platform/API team           |
| Q-N3: Dev/QA environment — endpoint URL, region, test project, seed data, credentials                              | All    | Platform/DevOps             |
| Q-N4: Cross-team approvals / security review before shipping a UI that surfaces private keys and certificates      | All    | Security/compliance         |
| Q-N5: Rollout strategy + stakeholder notification                                                                  | All    | Stakeholder/release manager |

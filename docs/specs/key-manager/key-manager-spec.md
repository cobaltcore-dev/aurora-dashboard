# Epic: Key Manager UI (OpenStack Barbican)

Source BRD: [key-manager-brd.md](key-manager-brd.md)
Target surface: Aurora — new built-in scope (Pattern A), new top-level "Authorization" navigation category
Development context (source of truth): `.claude/context/aurora-dashboard.md`, `.claude/context/juno.md`
Status: ready-for-engineering

> **Scope:** Full create, view, and delete browser for OpenStack Barbican secrets (including
> masked payload reveal, file download, copy-to-clipboard, and custom metadata labels),
> containers, and asynchronous key-generation orders. All three resources ship in this single
> initial release. The Key Manager nav entry is shown only when the `key-manager` service type
> is present in the project's Keystone catalog.

---

## Terminology

| Term                           | Definition                                                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Secret Identity URI**        | The `secret_ref` field on a Secret entity — its stable, absolute URI (e.g. `https://barbican.../v1/secrets/abc-123`). The UUID is the last path segment; extract it with `uuidFromRef(uri)`.                                    |
| **Container Secret Reference** | A `{ name, secret_ref }` entry inside a Container's `secret_refs` array — a named pointer from a Container slot to a Secret. Distinct from the Secret's own Secret Identity URI.                                                |
| **Status (Mixed Case)**        | Barbican returns status values in ALL_CAPS (`ACTIVE`, `PENDING`, `ERROR`, `CANCELLED`). Render them in Mixed Case throughout the UI: `Active`, `Pending`, `Error`, `Cancelled`. Apply `toMixedCase(value)` at the render layer. |

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

Ticket 01 blocks all feature tickets.
Tickets 02–08 can be built in parallel once 01 is merged.
Ticket 06 depends on 03.

---

## Cross-cutting patterns

These patterns apply across all tickets. Read once; individual tickets reference them by name.

**Status display.** Barbican returns `ACTIVE`, `PENDING`, `ERROR`, `CANCELLED`. Always render in Mixed Case at the UI layer — never display the raw ALL_CAPS value.

**Access Denied error state.** When a user lacks the required list permission, render
`<Status status="error" title="Access Denied" body="You do not have the necessary permissions to view {Resource}." />`
where `{Resource}` is the tab label (`Secrets` / `Containers` / `Orders`) for list views, or `"this Secret"` / `"this Container"` / `"this Order"` for detail views.

**Permission checks.** Use `useKeyManagerPermissions(projectId, [...permissions])`, which calls `keyManager.canUser` and returns a boolean record keyed by permission string. Gate list queries with `{ enabled: canList }`. Hide Create and Delete buttons when the user lacks the corresponding permission.

**Clickable rows.** Add `onClick` to `DataGridRow` to navigate to the detail route. The per-row PopupMenu ("View Details") must also navigate to the same destination — both paths must work.

**Toast on success.** Call `toast.success(message, options)` from the mutation `onSuccess` callback after successful create or delete.

**Cache invalidation on mutation.** Always call `utils.keyManager.<resource>.invalidate()` (tRPC utils) first, then `queryClient.invalidateQueries({ queryKey: [...] })` for aggregate queries. This ensures the tRPC cache is marked stale before any re-fetch fires.

---

# Epic 1 — Key Manager: Initial Release

---

## 01 — Authorization scope scaffold

**What to build:** The route tree, catalog guard, nav entry, and tRPC namespace stub that gate
and expose the entire Key Manager scope. No visible UI beyond the nav link. All feature tickets
(02–08) depend on this being merged first.

**Blocked by:** None · **Status:** ready-for-agent

**Acceptance Criteria**

- [ ] A `key-manager.tsx` layout file at `packages/aurora/src/client/routes/_auth/projects/$projectId/authorization/key-manager.tsx`; its `beforeLoad` calls `getServiceIndex("key-manager")` and throws `redirect({ to: "/projects/$projectId" })` — a silent redirect with no toast — when the service is absent from the catalog
- [ ] Route directory `authorization/key-manager/` exists under `$projectId/`; an `index.tsx` placeholder (renders nothing or a loading skeleton) confirms TanStack Router picks up the route tree
- [ ] A new "Authorization" section added to `buildNavSections.ts` at the same level as "Network", "Compute", "Storage"; gated on `getServiceIndex("key-manager")`; a "Key Manager" nav item inside it links to the key-manager index route
- [ ] A stub `keyManagerRouter` tRPC namespace is registered in `packages/aurora/src/server/routers.ts` via `buildBaseRouter()`; no procedures yet — purpose is compile-time validation of the namespace
- [ ] TypeScript compiles cleanly; no console errors when navigating to a project with `key-manager` in its catalog

**Aurora implementation notes**

- **Pattern A — new built-in scope.** Key Manager uses file-based TanStack Router routes exactly like `network/floatingips/` and `network/routers/`. It is NOT a service extension (`serviceExtensions` prop).
- **Authorization category.** "Authorization" is a new nav category, intentionally broader than Key Manager alone — future credential scopes (HSM, PCA, etc.) will sit alongside it. Key Manager is the first scope.
- **Catalog guard.** The guard lives in `authorization/key-manager.tsx`'s `beforeLoad`, not in a separate `authorization.tsx` layout. Future Authorization scopes each implement their own guard in their own layout file.
- **tRPC namespace.** Stub router at `packages/aurora/src/server/KeyManager/routers/keyManagerRouter.ts`. Subresource routers (`secretsRouter`, `containersRouter`, `ordersRouter`) are added in tickets 02–08 and merged into `keyManagerRouter`.

**BRD Reference** — §3 (Target Surface) · §7 (Service Catalog) · §8 (Auth)

---

## 02 — Secrets list

**What to build:** DataGrid-based list of all project secrets. Server-side search by name, filter
by Secret Type and Algorithm, column-header sort, and server-side pagination.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to browse all secrets in my project with search, sort,
and filter, so that I can quickly find a specific secret, check expiration status, and assess the
project's secret inventory at a glance.

**Acceptance Criteria**

- [ ] Lists all project secrets via `GET /v1/secrets` (server-side pagination with `offset` + `limit`, default page size 50)
- [ ] Each row: **Name** (top line) + **ID** extracted from the Secret Identity URI (second line, `ClipboardText`) / **Status** (Mixed Case) / **Secret Type** + **Content Type** (stacked) / **PopupMenu** with "View Details" (navigates to detail route) and — separated by a divider — "Delete" (opens Ticket 05 modal)
- [ ] Clicking any row navigates to the Secret detail page (see Cross-cutting: Clickable rows)
- [ ] DataGridToolbar Zone 2:
  - `SearchInput` with placeholder "Search by name…" (300 ms debounce, server-side `name` param — Barbican uses similarity match, not exact prefix)
  - "Secret Type" select filter (all `secret_type` values + "All")
  - "Algorithm" select filter with static options: All | AES | RSA | HMAC | 3DES | DSA | EC
  - Active filters compose with AND; "Clear filters" resets all
- [ ] Sort by column header: Name, Status, Secret Type, Created, Expiration, Updated (server-side `sort=<field>:asc|:desc`); active sort direction shown in header; clicking an active column flips direction; clicking a new column resets to `:asc`; `expiration: null` sorts last when sorting by Expiration ascending
- [ ] `Pagination` component (`variant="input"`) below the grid
- [ ] Empty state via `Status` component when no secrets exist (with "Create Secret" call-to-action); distinct message when filters/search are active ("no results match your filters")
- [ ] Loading state scoped to the DataGrid; inline `Message` (persistent) on API failure surfacing Barbican `title`/`description`
- [ ] Access Denied error state (see Cross-cutting) when user lacks `key-manager:secrets:list`
- [ ] "Create Secret" button in Zone 1 (visible only when user has `key-manager:secrets:create`) opens the Create Secret modal (Ticket 04)

**Aurora / Juno implementation notes**

- **Route file:** `packages/aurora/src/client/routes/_auth/projects/$projectId/authorization/key-manager/secrets/index.tsx`
- **tRPC procedure:** `keyManager.listSecrets` — `projectScopedProcedure`; accepts `{ name?, secret_type?, alg?, sort?, offset, limit }`; calls `GET /v1/secrets`; returns `{ secrets, total, next, previous }`.
- **Client state:** `trpcReact.keyManager.listSecrets.useQuery(params, { enabled: canList })` with `placeholderData: (prev) => prev` for stale-while-revalidate. URL search params (TanStack Router, Zod-validated) hold `name`, `secret_type`, `alg`, `sort`, `offset`.
- **Search debounce:** 300 ms `useState` local delay before updating the URL search param.
- **Juno components:** `DataGrid`, `DataGridToolbar`, `DataGridHeadCell` (sortable), `DataGridRow` (with `onClick`), `DataGridCell`, `SearchInput`, `Select`/`SelectOption`, `Pagination` (`variant="input"`), `PopupMenu`, `Status`, `Message`; `ClipboardText` from `@aurora/components`.
- **Sort toggle:** clicking an already-active header flips `:asc` ↔ `:desc`; clicking a new column resets to `:asc`.

**BRD Reference** — Story 1 §5.1 · API §7 · Auth §8

---

## 03 — Secret detail page

**What to build:** A full-route detail page for a single secret. All metadata fields, payload
masked behind a reveal toggle (fetched on demand), copy/download affordances, and a read-only
metadata labels table (CRUD added in Ticket 06).

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to open a secret and see its full metadata and
retrieve its payload, so that I can inspect configuration, copy credentials, or download key
material without CLI access.

**Acceptance Criteria**

- [ ] Navigating to the detail route shows: Name, ID (`ClipboardText` on the Secret Identity URI), Status (Mixed Case), Secret Type, Content Type, Algorithm, Bit Length, Mode, Expiration, Created, Updated
- [ ] **Payload section:** `SecretText` in `readOnly` mode; masked by default; on reveal toggle: calls `GET /v1/secrets/{id}/payload` (with `Accept` header matching `content_type`) and injects the result as the `value` prop; on hide: clears the fetched value from local state
- [ ] Copy-to-clipboard affordance for the payload (`SecretText` `copy` prop)
- [ ] **Download affordance:** button that triggers a client-side `Blob` download of the raw payload bytes; filename extension `.pem` for `application/x-pem-file`, `.txt` for `text/plain`, `.bin` for all other content types
- [ ] If the payload fetch returns 403, the error `Message` specifically states the role lacks payload access — not a generic error
- [ ] **Metadata labels table** (read-only): key-value rows loaded from `GET /v1/secrets/{id}/metadata`; CRUD added in Ticket 06
- [ ] Loading states scoped to each section; inline `Message` (persistent) on failure — the metadata fetch and payload fetch report errors independently
- [ ] "Delete" button opens the confirmation modal (Ticket 05)
- [ ] Access Denied error state (see Cross-cutting) when user lacks `key-manager:secrets:get`

**Aurora / Juno implementation notes**

- **Route file:** `packages/aurora/src/client/routes/_auth/projects/$projectId/authorization/key-manager/secrets/$secretId.tsx`
- **tRPC procedures (add to `secretsRouter`):**
  - `keyManager.getSecret` — `projectScopedProcedure`; calls `GET /v1/secrets/{id}`
  - `keyManager.getSecretPayload` — `projectScopedProcedure`; calls `GET /v1/secrets/{id}/payload` forwarding the `Accept` header; returns the raw payload string
  - `keyManager.getSecretMetadata` — `projectScopedProcedure`; calls `GET /v1/secrets/{id}/metadata`
- **Payload reveal flow:** `SecretText` is controlled (`readOnly`, `value` from local state). On `onReveal`: call `trpcClient.keyManager.getSecretPayload.query(...)` imperatively. On `onHide`: clear local `value` state.
- **Download:** client-side `Blob` + `URL.createObjectURL` + synthetic `<a>` click. SSE streaming is not required — Barbican payloads are typically under 8 KB.
- **Juno components:** `SecretText` (from `@cloudoperators/juno-ui-components`), `ClipboardText` (from `@aurora/components`), `Message`, `Button`, `DescriptionList`/`DescriptionTerm`/`DescriptionDefinition`.

**BRD Reference** — Story 2 §5.1 · API §7 · Auth §8

---

## 04 — Create secret

**What to build:** A Modal containing the Create Secret form. Eight fields, inline validation,
and a payload-immutability notice.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to store a new secret in Key Manager, so that
credentials and key material are centrally managed and accessible to my project without
insecure ad-hoc storage.

**Acceptance Criteria**

- [ ] "Create Secret" button in the Ticket 02 toolbar opens a `Modal`
- [ ] **Required fields:** Name (`TextInput`), Secret Type (`Select` — symmetric/asymmetric/public/private/passphrase/certificate/opaque), Payload (`Textarea`), Payload Content Type (`TextInput` or `Select`)
- [ ] **Optional fields:** Algorithm (`TextInput`), Bit Length (`TextInput`, numeric), Mode (`TextInput`), Expiration (`DateTimePicker`)
- [ ] The form displays a prominent note: _"Payloads are immutable after creation — to change a payload, delete and recreate the secret."_
- [ ] On submit: calls `POST /v1/secrets`; on success: Modal closes, list revalidates, `toast` success notification
- [ ] Inline field-level error messages shown below each field on validation failure; Modal stays open
- [ ] On API error: inline `Message` (persistent) inside the Modal with the Barbican `title`/`description`; Modal stays open

**Aurora / Juno implementation notes**

- **tRPC procedure:** `keyManager.createSecret` — `projectScopedProcedure`; calls `POST /v1/secrets`; passes all fields through.
- **Client:** `useMutation`; on success call `utils.keyManager.listSecrets.invalidate()` (see Cross-cutting: Cache invalidation).
- **Juno components:** `Modal`, `Form`, `FormRow`, `TextInput`, `Textarea`, `Select`/`SelectOption`, `DateTimePicker`, `Button` (`primary` for submit, `default` for cancel), `Message`.
- **`DateTimePicker`** is an established Aurora component.

**BRD Reference** — Story 3 §5.1 · API §7 · Auth §8

---

## 05 — Delete secret

**What to build:** A Modal confirmation for deleting a secret. Accessible from the per-row
PopupMenu (Ticket 02) and the detail page Delete button (Ticket 03). Notes dangling-container
risk.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to delete a secret I no longer need, so that stale
credentials are not left in Key Manager indefinitely.

**Acceptance Criteria**

- [ ] "Delete" in the per-row PopupMenu (Ticket 02) and the Delete button on the detail page (Ticket 03) both open the same confirmation `Modal`
- [ ] Modal title: "Delete Secret"; body identifies the secret by name; body notes: _"Deleting a secret referenced by a container does not automatically update the container — the container will have a dangling reference."_
- [ ] `primary-danger` styled confirm button (always enabled)
- [ ] On confirm: calls `DELETE /v1/secrets/{id}`; on success: Modal closes, list revalidates, `toast` success notification; if triggered from the detail page, navigate back to the secrets list
- [ ] On API error: Modal stays open; inline `Message` (persistent) with Barbican `title`/`description`; secret not removed from the list

**Aurora / Juno implementation notes**

- **tRPC procedure:** `keyManager.deleteSecret` — `projectScopedProcedure`; calls `DELETE /v1/secrets/{id}`.
- **Client:** `useMutation`; on success call `utils.keyManager.listSecrets.invalidate()`.
- **Navigation:** if triggered from the detail page, navigate to `../` (secrets list) after successful deletion.
- **Juno components:** `Modal`, `ModalFooter`, `Button` (`primary-danger` for confirm), `Message`.

**BRD Reference** — Story 4 §5.1 · API §7 · Auth §8

---

## 06 — Secret metadata labels

**What to build:** CRUD for custom key-value metadata labels, rendered inside the secret detail
page (Ticket 03). Each mutation has its own per-row loading and error state.

**Blocked by:** 03 · **Status:** ready-for-agent

**User story:** As a project member, I want to attach, edit, and remove custom key-value labels
on a secret, so that I can annotate secrets with context (e.g. `env: production`,
`owner: team-a`) for easier discovery and governance.

**Acceptance Criteria**

- [ ] Existing labels are shown as a key-value table (data already loaded in Ticket 03)
- [ ] When no labels exist: empty state "No labels yet" with an "Add Label" call-to-action button
- [ ] **Add Label:** key + value inputs; on save calls `POST /v1/secrets/{id}/metadata`; new label appears in the table; inline loading while in flight; inline `Message` (persistent) on error with Barbican `title`/`description`; Barbican returns 409 for duplicate keys — no client-side pre-check required
- [ ] **Edit label:** in-place value edit; on save calls `PUT /v1/secrets/{id}/metadata/{key}`; inline loading; error `Message` on failure
- [ ] **Delete label:** per-row delete control; calls `DELETE /v1/secrets/{id}/metadata/{key}` after confirmation; inline loading; error `Message` on failure
- [ ] Each operation's loading and error state is scoped to the affected row (not the full page)

**Aurora / Juno implementation notes**

- **tRPC procedures (add to `secretsRouter`):**
  - `keyManager.addSecretMetadata` — `POST /v1/secrets/{id}/metadata`
  - `keyManager.updateSecretMetadataKey` — `PUT /v1/secrets/{id}/metadata/{key}`
  - `keyManager.deleteSecretMetadataKey` — `DELETE /v1/secrets/{id}/metadata/{key}`
- **Client:** `useMutation` for each; on success call `utils.keyManager.getSecretMetadata.invalidate({ secretId })`.
- **Juno components:** `DataGrid` (or `DescriptionList`) for the labels table, `TextInput`, `Button`, `Message`.

**BRD Reference** — Story 5 §5.1 · API §7 · Auth §8

---

## 07 — Containers list + detail + create/delete

**What to build:** Full CRUD browser for containers. The list is client-side searchable and
sortable across all fetched data (the Barbican containers API provides pagination only — no
server-side filter or sort). Detail is a full-route page. Create and delete use Modals.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to group related secrets into named containers, so
that I can manage certificate+key bundles, RSA key pairs, and other related credentials as a
single unit.

**Acceptance Criteria**

- [ ] Lists all containers by fetching all API pages and merging them client-side (`GET /v1/containers?offset=…&limit=…` looped until exhausted)
- [ ] Each row: **Name** + **ID** (stacked, `ClipboardText` for ID) / **Status** (Mixed Case) / **Container Type** / **PopupMenu** ("View Details" first, "Delete" last with divider)
- [ ] Clicking any row navigates to the Container detail page (see Cross-cutting: Clickable rows)
- [ ] Client-side search by Name (substring match) and client-side sort by Name, Status, Container Type, Created — both applied over the full merged dataset; 50 items displayed per page; `Pagination` (`variant="input"`) below the grid
- [ ] Access Denied error state (see Cross-cutting) when user lacks `key-manager:containers:list`
- [ ] **Create container** button (visible only when user has `key-manager:containers:create`) opens a `Modal` with:
  - Name (`TextInput`)
  - Type (`Select` — generic / rsa / certificate)
  - Type-specific named-ref inputs with client-side required-field validation:
    - **generic:** any number of named refs (free, repeatable key-value list)
    - **rsa:** `public_key` (required), `private_key` (required), `private_key_passphrase` (optional)
    - **certificate:** `certificate` (required), `private_key` (optional), `private_key_passphrase` (optional), `intermediates` (optional)
- [ ] On create success: Modal closes, list revalidates, `toast` success notification
- [ ] **Detail page** (full route `/containers/$containerId`): Name, ID (`ClipboardText`), Type, Status (Mixed Case), Created, Updated; `secret_refs` list showing each Container Secret Reference as ref name + Secret Identity URI — the URI links to the referenced Secret's detail page (extract UUID with `uuidFromRef`)
- [ ] **Delete** (from PopupMenu and detail page): `Modal` confirmation, `primary-danger` button, `toast` on success
- [ ] Empty / loading / error states per Ticket 02 pattern; create and delete errors surface Barbican `title`/`description` in inline `Message`

**Aurora / Juno implementation notes**

- **Route files:**
  - `authorization/key-manager/containers/index.tsx` — containers list
  - `authorization/key-manager/containers/$containerId.tsx` — container detail
- **tRPC procedures (new `containersRouter.ts` in `KeyManager/`):**
  - `keyManager.listContainers` — `GET /v1/containers?offset=…&limit=…`
  - `keyManager.getContainer` — `GET /v1/containers/{id}`
  - `keyManager.createContainer` — `POST /v1/containers`
  - `keyManager.deleteContainer` — `DELETE /v1/containers/{id}`
- **Client-side filter/sort:** fetch all pages via `useAllKeyManagerPages`; apply `Array.filter` (substring name match) and `Array.sort` (by selected field) over the full merged dataset; slice to 50-item display pages. `search` and `page` are URL search params (TanStack Router, Zod-validated); sort state is local.
- **Cache invalidation on create/delete:** `utils.keyManager.listContainers.invalidate()` first, then `queryClient.invalidateQueries({ queryKey: ["km-all-containers", projectId] })`.
- **Container Secret Reference → Secret link:** `uuidFromRef(secretRef)` extracts the UUID; link navigates to `../../../secrets/$secretId`.
- **Juno components:** same as Ticket 02 (DataGrid, DataGridToolbar, SearchInput, Pagination, PopupMenu, Message, Status), plus `Modal`.

**BRD Reference** — Story 6 §5.1 · API §7 · Auth §8

---

## 08 — Orders list + detail + create/delete + PENDING auto-refresh

**What to build:** Full CRUD browser for key-generation orders. Orders are asynchronous —
PENDING orders auto-refresh every 5 s and show a Spinner in the Status cell. The detail page
shows sub-status detail and links to the generated secret or container when ACTIVE. Create and
delete use Modals.

**Blocked by:** 01 · **Status:** ready-for-agent

**User story:** As a project member, I want to place asynchronous key-generation orders and
track their status, so that I can have Barbican generate cryptographic key material on my behalf
without managing key generation locally.

**Acceptance Criteria**

- [ ] Lists all orders by fetching all API pages and merging them client-side (`GET /v1/orders?offset=…&limit=…` looped until exhausted)
- [ ] Each row: **Name** + **ID** (stacked, `ClipboardText` for ID) / **Status** (Mixed Case, with inline `Spinner` when PENDING) / **Order Type** / **PopupMenu** ("View Details" first, "Delete" last with divider)
- [ ] Clicking any row navigates to the Order detail page (see Cross-cutting: Clickable rows)
- [ ] Client-side search by Name (substring match) and sort by Name, Status, Order Type, Created over all fetched data; 50 items per display page; `Pagination` (`variant="input"`)
- [ ] While any visible order has `status === "PENDING"`: list query uses `refetchInterval: 5000`; interval disabled once all visible orders are terminal (ACTIVE / ERROR / CANCELLED)
- [ ] Status cell semantic variants: `success` for ACTIVE, `error` for ERROR, `warning` for CANCELLED, inline `Spinner` alongside the label for PENDING
- [ ] Access Denied error state (see Cross-cutting) when user lacks `key-manager:orders:list`
- [ ] **Create order** button (visible only when user has `key-manager:orders:create`) opens a `Modal` with:
  - Type (`Select` — key / asymmetric)
  - Algorithm (`TextInput`)
  - Bit Length (`TextInput`, numeric)
  - Mode (`TextInput`, optional — **hidden when Type is `asymmetric`**)
  - Name (`TextInput`, optional)
  - Expiration (`DateTimePicker`, optional)
  - Calls `POST /v1/orders`; on success: Modal closes, list revalidates, `toast` success notification; inline `Message` on error
- [ ] **Detail page** (full route `/orders/$orderId`): Type, Status (Mixed Case), `sub_status_message` (when non-null), Algorithm, Bit Length, Mode, Created, Updated; when ACTIVE:
  - `key` orders: `secret_ref` shown with `ClipboardText` and a navigation link to the Secret detail page
  - `asymmetric` orders: `container_ref` shown with `ClipboardText` and a navigation link to the Container detail page
  - Extract UUID from either ref using `uuidFromRef`
- [ ] Detail page uses `refetchInterval: 5000` while `order.status === "PENDING"`
- [ ] **Delete** (from PopupMenu and detail page): `Modal` confirmation, `primary-danger` button, `toast` on success; when `order.status === "PENDING"`, the modal body adds: _"This order is still being processed. Deleting it now may leave partial key material in Barbican."_
- [ ] Empty / loading / error states per Ticket 02 pattern; create and delete errors surface Barbican `title`/`description` in inline `Message`

**Aurora / Juno implementation notes**

- **Route files:**
  - `authorization/key-manager/orders/index.tsx` — orders list
  - `authorization/key-manager/orders/$orderId.tsx` — order detail
- **tRPC procedures (new `ordersRouter.ts` in `KeyManager/`):**
  - `keyManager.listOrders` — `GET /v1/orders?offset=…&limit=…`
  - `keyManager.getOrder` — `GET /v1/orders/{id}`
  - `keyManager.createOrder` — `POST /v1/orders`
  - `keyManager.deleteOrder` — `DELETE /v1/orders/{id}`
- **Auto-refresh pattern:**
  ```ts
  const hasPending = orders.some((o) => o.status === "PENDING")
  trpcReact.keyManager.listOrders.useQuery(params, {
    refetchInterval: hasPending ? 5000 : false,
  })
  ```
  Same pattern for the detail query when `order.status === "PENDING"`.
- **Order types in scope:** `key` (symmetric key generation, result is a Secret) and `asymmetric` (key-pair generation, result is a Container). Certificate order type is out of scope — do not add it to the Type select.
- **Cache invalidation on create/delete:** `utils.keyManager.listOrders.invalidate()` first, then `queryClient.invalidateQueries({ queryKey: ["km-all-orders", projectId] })`.
- **Juno components:** same as Ticket 07, plus `Spinner`.

**BRD Reference** — Story 7 §5.1 · API §7 · Auth §8

---

## Open items (external teams)

| Open item                                                                                                          | Ticket | Owner                       |
| ------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------- |
| Q-N1: Barbican rate limits in the target deployment                                                                | 02     | Platform/infra team         |
| Q-N2: Barbican error response shape — confirm `{ title, description, code }` schema and any correlation ID headers | 02–08  | Platform/API team           |
| Q-N3: Dev/QA environment — endpoint URL, region, test project, seed data, credentials                              | All    | Platform/DevOps             |
| Q-N4: Cross-team approvals / security review before shipping a UI that surfaces private keys and certificates      | All    | Security/compliance         |
| Q-N5: Rollout strategy + stakeholder notification                                                                  | All    | Stakeholder/release manager |

---
name: aurora-service-reference
description: "Canonical blueprint for how an Aurora resource/service is built end-to-end, using the Flavor service (compute/flavors) as the reference implementation. Load whenever building, reviewing, or reasoning about an Aurora service — a resource with a list + detail + CRUD surface (Flavors, Images, Networks, Keypairs, etc.). Used as an additive core protocol by auto-screenshot-review when reviewing a service screen."
version: 1.0.0
---

# Aurora Service Reference — the house blueprint

Every Aurora resource/service follows the same end-to-end shape. The **Flavor service**
(`compute/flavors`) is the most complete, idiomatic implementation and is the reference for
every layer below. When building a new service, mirror these patterns; when reviewing one,
check against the [Checklist](#checklist).

All paths are relative to the repo root (`aurora-dashboard/`).

---

## When to load

Load this skill whenever the work touches an Aurora **service** — a resource that has a list
screen, a detail screen, and create/edit/delete actions. Examples: Flavors, Images, Keypairs,
Server Groups, Networks, Routers.

Do **not** apply it to pure dashboards, landing pages, or settings panels that are not
resource CRUD surfaces.

---

## Layer map

A service is built in two halves — a tRPC **server** half (`packages/aurora/src/server/…`) and
a React **client** half (`packages/aurora/src/client/routes/…`). Data flows:
`client route → List orchestrator → tRPC query → router → helper → OpenStack`, and back.

| Layer               | Responsibility                                                       | Reference (Flavor)                                                                                           |
| ------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Server router       | tRPC procedures: zod input, service guard, call helpers, wrap errors | `packages/aurora/src/server/Compute/routers/flavorRouter.ts`                                                 |
| Router registration | Spread the router into the service router factory                    | `packages/aurora/src/server/Compute/routers/index.ts`                                                        |
| Types / schema      | zod schema + inferred type; separate create-input type               | `packages/aurora/src/server/Compute/types/flavor.ts`                                                         |
| Helpers             | HTTP calls, status→error maps, id encoding, parse, filter/sort       | `packages/aurora/src/server/Compute/helpers/flavorHelpers.ts`                                                |
| Permissions         | `"service:action"` → policy rule map; `canUser` procedure            | `packages/aurora/src/server/Compute/routers/permissionRouter.ts`                                             |
| Error codes         | `ERROR_CODES` constant (server)                                      | `packages/aurora/src/server/errorCodes.ts`                                                                   |
| Error translation   | `translateError` / `isRetryableError` (client)                       | `packages/aurora/src/client/utils/useErrorTranslation.ts`                                                    |
| List layout route   | search schema, service-availability guard, crumb, `<Outlet/>`        | `…/compute/flavors.tsx`                                                                                      |
| List index route    | `ContentHeader` + feature component                                  | `…/compute/flavors/index.tsx`                                                                                |
| List orchestrator   | promise + `use()` + `Suspense` + `ErrorBoundary`, search/sort/page   | `…/compute/flavors/-components/List.tsx`                                                                     |
| List table          | `DataGrid`, clickable rows, `PopupMenu` actions, empty `Status`      | `…/-components/FlavorListContainer.tsx`                                                                      |
| Detail route        | param route, loader/guard, breadcrumb                                | `…/compute/flavors/$flavorId.tsx`                                                                            |
| Detail view         | read-only presentation; conditional `enabled` sub-queries            | `…/-components/FlavorDetailsView.tsx`                                                                        |
| Mutation modals     | form state, blur + submit validation, mutate → toast → refetch       | `…/-components/CreateFlavorModal.tsx`, `DeleteFlavorModal.tsx`, `EditSpecModal.tsx`, `ManageAccessModal.tsx` |
| Validation          | `validateField` switch (`msg\`\``), `cleanFlavorData` sanitizer      | `…/-components/flavorValidation.ts`                                                                          |
| Toasts              | factory fns returning `{ message, description }`                     | `…/-components/FlavorToastNotifications.tsx`                                                                 |
| Tests               | colocated `*.test.ts(x)`; mocked helpers + caller                    | `…/routers/flavorRouter.test.ts` + per-component tests                                                       |

> Client component paths above are rooted at
> `packages/aurora/src/client/routes/_auth/projects/$projectId/compute/flavors/`.

---

## Patterns per layer

### Server router (`flavorRouter.ts`)

- Every procedure is a `projectScopedProcedure` — `ctx.openstack` is already rescoped to the
  project. `project_id` is always part of the zod `input`.
- First line of the handler body: resolve and guard the service —
  `const compute = ctx.openstack?.service("compute")`; if absent, throw
  `TRPCError({ code: "INTERNAL_SERVER_ERROR", message: ERROR_CODES.COMPUTE_SERVICE_UNAVAILABLE })`.
- Body wrapped in `try/catch`. In `catch`: **re-throw** if `error instanceof TRPCError`,
  otherwise wrap in a new `TRPCError` with a service-specific `ERROR_CODES.*` message and
  `cause: error`. Thin router — business logic lives in helpers.
- Queries use `.query`, mutations use `.mutation`. Mutations return a small
  `{ success: true, message }` or the created resource.

### Router registration (`routers/index.ts`)

- The service router is a plain object of procedures; it is spread into the aggregate:
  `auroraRouter({ ...serverRouter, ...flavorRouter, …, ...buildPermissionRouter(policyDir) })`.

### Types (`types/flavor.ts`)

- A zod schema is the source of truth; the TS type is `z.infer<typeof flavorSchema>`.
- A `*ResponseSchema` wraps the collection (`{ flavors: [...] }`) for parsing API responses.
- A separate hand-written `CreateFlavorInput` type models the mutation payload.

### Helpers (`flavorHelpers.ts`)

- One `const *_STATUS_MAP: Record<number, { code, message }>` per operation, mapping HTTP
  status → `{ TRPCError code, ERROR_CODES message }`. A single `handleHttpError(status, map,
default)` throws from it.
- Validate/encode every id with `validateAndEncodeResourceId(id, "Flavor")` from
  `@cobaltcore-dev/signal-openstack` before building a path; catch `SignalOpenstackError` →
  `BAD_REQUEST`.
- Parse responses with the schema's `safeParse`; on failure throw `PARSE_ERROR`.
- Pure list logic (`includesSearchTerm`, `filterAndSortFlavors`) is exported and unit-tested
  directly.

### Permissions (`permissionRouter.ts` + `List.tsx`)

- A `const … MAPPINGS = { "flavors:create": { engine, rule }, … } as const` maps a stable
  frontend key to an OpenStack policy rule. `buildPermissionRouter(policyDir)` is built via the
  generic `createPermissionRouter` factory.
- Client calls `client.compute.canUser.query({ project_id, permission: [ "flavors:create",
"flavors:delete", … ] })` and receives a **boolean array indexed by request order**. Map it
  into named flags (`canCreate`, `canDelete`, `canManageAccess`, …) and gate every create /
  edit / delete control on them.

### Errors (`errorCodes.ts` + `useErrorTranslation.ts`)

- Server throws stable string codes from `ERROR_CODES`. The client never shows a raw code:
  `translateError(code)` maps it to a lingui `t\`\``user message, and`isRetryableError(code)`
  decides whether to render a "Try Again" affordance.

### List route + orchestrator (`flavors.tsx`, `index.tsx`, `List.tsx`)

- The **layout route** (`flavors.tsx`) declares a zod `validateSearch` (search/sort/page), a
  `beforeLoad` guard that redirects if the backing service is unavailable, `staticData`
  (`section`, `service`, `analytics`, `crumb`), and renders `<Outlet/>`.
- The **index route** renders `<ContentHeader title=… />` plus the feature component.
- The **orchestrator** (`List.tsx`) is the data hub:
  - Fetches via a **promise created once in state** (`createFlavorsPromise`,
    `createPermissionsPromise`) and unwrapped with React `use()` inside a child.
  - Wraps that child in `<ErrorBoundary fallbackRender={… <Status status="error" …/>}>` and
    `<Suspense fallback={<Status status="progress" …/>}>`. **ErrorBoundary is mandatory around
    `use()` + `Suspense`** — a rejected promise crashes the app otherwise.
  - Refetches by swapping the promise inside `startTransition`.
  - Search is debounced (~500ms) and sort/search/page are synced to the URL via `navigate`.

### List table (`FlavorListContainer.tsx`)

- Juno `DataGrid` with `DataGridHeadCell` / `DataGridRow` / `DataGridCell`.
- Rows are clickable → navigate to the detail route; the trailing actions cell calls
  `e.stopPropagation()` so the `PopupMenu` doesn't trigger row navigation.
- `PopupMenu` items are each gated by a permission flag. Empty result renders
  `<Status status="empty" title=… body=… />`; loading renders `<Status status="progress" …/>`.

### Detail (`$flavorId.tsx`, `FlavorDetailsView.tsx`)

- Detail view is presentation-only; sub-resources (e.g. extra specs) are fetched with a
  `useQuery(..., { enabled: … && hasPermission })` conditional. A breadcrumb is set for the
  detail crumb.

### Mutation modals + validation + toasts

- Modals hold local form state, validate per-field `onBlur` and fully on submit via
  `validateField(name, value, t)`, sanitize with `cleanFlavorData` before the mutation, then on
  success fire a toast from a `get*Toast` factory and trigger a list refetch.
- Validation messages use `msg\`\``(deferred) and are rendered with`t(msg\`…\`)`.

### i18n (everywhere)

- `<Trans>…</Trans>` for static JSX strings; `` t`…` `` via `useLingui()` for dynamic strings;
  `` msg`…` `` for deferred messages (validation, toolbar option labels). **No raw
  user-visible string may be hardcoded** — every one goes through lingui.

### Tests (`*.test.ts(x)`, colocated)

- Router tests `vi.mock` the helper module, build a mock context with `shouldFail*` flags, and
  call procedures through a `createCaller` from `createCallerFactory(auroraRouter())`. They
  assert that plain errors are wrapped as `TRPCError` with the right `ERROR_CODES` and that
  helpers were called with the expected args. Helpers and components have their own colocated
  tests.

---

## Checklist

A complete Aurora service has **all** of the following. Use this to review a service screen or PR:

- [ ] **Server router** of `projectScopedProcedure`s with per-procedure zod input, a
      `service(...)` availability guard, and `try/catch` that re-throws `TRPCError` / wraps the
      rest with an `ERROR_CODES.*` message + `cause`.
- [ ] Router **spread into** the service router factory (`routers/index.ts`).
- [ ] **zod schema + inferred type** in `types/`; response wrapper schema for parsing.
- [ ] **Helpers** with per-op status→error maps via `handleHttpError`, id encoding via
      `validateAndEncodeResourceId`, and `safeParse` of responses.
- [ ] **Permissions**: `"service:action"` → policy rule mappings, and every create/edit/delete
      control gated on a `canUser` flag.
- [ ] **Error codes** in `ERROR_CODES` with a matching case in `translateError`
      (+ `isRetryableError` where a retry makes sense).
- [ ] **List layout route** with `validateSearch`, a service-availability `beforeLoad` guard,
      and `staticData` (`section` / `service` / `analytics` / `crumb`).
- [ ] **List orchestrator** using promise + `use()` + `Suspense` + **`ErrorBoundary`**, with
      debounced search and URL-synced sort/page.
- [ ] All three list states present: **loading** (`Status status="progress"`), **error**
      (`Status status="error"`), **empty** (`Status status="empty"`).
- [ ] **Clickable rows** → detail route; row-action menu uses `stopPropagation`.
- [ ] **Detail view** read-only, with conditional sub-queries gated by permission.
- [ ] **Mutation modals**: blur + submit validation, `clean*Data` sanitize, mutate → **toast**
      → **refetch**.
- [ ] **Every user-visible string** goes through lingui (`Trans` / `t\`\``/`msg\`\``).
- [ ] **Colocated tests** for router, helpers, and components.

---

## Repo conventions (house rules)

- **ErrorBoundary around `use()` + `Suspense` is required** — a rejected promise otherwise
  crashes the whole app. Show a `<Message>` / `<Status status="error">` fallback.
  [[feedback_use_suspense_error_boundary]]
- **TanStack `Link`** needs `text-inherit no-underline` (add `block` for block-level links) to
  suppress the browser's default anchor styles. [[feedback_link_styling]]

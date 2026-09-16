# Aurora Dashboard — PR Review Guidelines

## Repository Context

Aurora is an AWS-style cloud management dashboard backed by OpenStack. It provides self-service infrastructure management (compute, storage, networking, identity) for end users and operators. Correctness, security, and a consistent user experience are critical — subtle bugs in permission checks, data fetching, or UI state can expose resources across project boundaries or silently fail infrastructure operations.

---

A PR reviewer or AI assistant **must reject** code that violates these rules unless the PR author provides an explicit justification.

### Review Scope — What NOT to Review

Do **not** flag anything the toolchain already enforces. These are caught before review and reporting them is noise:

- **Component prop values that are typed unions.** `strict` TypeScript rejects any invalid value for props like `Status status`, `Message variant`, `Badge variant`, `Modal size`, `confirmButtonVariant`, etc. Do not check whether a prop value is "allowed" — the type does that. Only review the _semantic_ choice (e.g. `error` vs. `danger` intent, empty-state _wording/reason_), never the enum membership.
- **Formatting** — quotes, semicolons, line width, indentation, Tailwind class ordering. Prettier owns this.
- **Type correctness in general** — wrong prop types, missing required props, incompatible arguments. `strict` mode catches these.
- **i18n hardcoded strings in `packages/aurora`** — enforced by `eslint-plugin-lingui`. Still review i18n manually in `packages/signal-openstack`, `packages/policy-engine`, and `apps/dashboard`, which have no lingui lint rule.

Focus review effort on **semantics, structure, and consistency** that no compiler or linter can verify: correct pattern/zone usage, permission fail-closed behavior, security boundaries, `error`/`danger` intent, empty-state reasoning, ARIA presence, import ordering, and UX writing — none of which are enforced by tooling in this repo.

**Review in three passes — report all findings from all passes before submitting:**

1. **Security & Data** — B.7 (Data Fetching), B.8 (Permissions/RBAC), B.15 (DataGrid/Row Interaction)
2. **UI Correctness** — B.1 (Component Library), B.4 (Color Tokens), B.5 (Modal Structure), B.6 (Empty/Loading/Error), B.9 (URL State), B.11 (Form Validation)
3. **Style & Consistency** — B.2 (List Page Zones), B.3 (Spacing), B.10 (Toast Notifications), B.12 (Naming), B.13 (Import Order), B.14 (Accessibility/i18n), B.16 (Messages vs. Toast), B.17 (Utility Hooks), B.18 (PopupMenu Ordering), B.19 (UX Writing)

---

## Quick Reject Checklist

- [ ] Raw HTML element (`<div>`, `<table>`, `<button>`) where a Juno component exists
- [ ] Hardcoded Tailwind color class (`text-gray-*`, `bg-red-*`) instead of a `text-theme-*` token
- [ ] `error` variant used for a destructive action (should be `danger`), or vice versa
- [ ] Ad-hoc spacing value not in the approved list (B.3)
- [ ] Permission prop not named `can<Verb><Noun>`
- [ ] UI control shown before permissions are resolved (not fail-closed)
- [ ] Bulk-action controls or "Create" button rendered without permission check
- [ ] Nested interactive element in a clickable row without `event.stopPropagation()`
- [ ] `toast.success/error` with inline string instead of delegating to `*ToastNotifications`
- [ ] `toast.error` used for a persistent/actionable error (use `<Message>` instead)
- [ ] `<Message>` variant conflicting with the modal's primary button variant
- [ ] Modal without `disableCancelButton` / `disableCloseButton` during async operations
- [ ] Custom `modalFooter` without explicit `disableCloseButton` on the `Modal` itself
- [ ] Destructive modal without `confirmButtonVariant="primary-danger"`
- [ ] Destructive modal with alarmist/vague title (`"Danger!"`, `"Are You Sure?"`)
- [ ] `PopupMenu` without `PopupMenuToggle` as trigger
- [ ] "Delete" action not the last item in its menu group, or a single-entity menu missing the divider before it (multi-entity menus need no extra divider — group dividers suffice)
- [ ] URL-worthy state held in `useState` instead of search params
- [ ] User-facing string not wrapped in `<Trans>` or `` t`...` `` (skip in `packages/aurora` — enforced by `eslint-plugin-lingui`)
- [ ] Error element without `role="alert"` and `aria-live="assertive"`
- [ ] Icon-only button without `aria-label`
- [ ] `outline-none` suppressing focus ring without replacement
- [ ] File named with lowercase-dash convention or generic name
- [ ] Import using `../../` traversal beyond one level instead of `@/`
- [ ] Re-implementation of a utility hook from B.17
- [ ] String using "Please", "Thanks", "We", exclamation marks, all-caps, or `"Sign In"`/`"Log in"` (use `"Sign in"`)

---

## Part A: Architecture & Code Quality

### A.1 React 19 Best Practices

- **Minimize useEffect:** Critically evaluate every `useEffect` hook. Flag synchronizations, computed states, or event-driven triggers (e.g., click handlers) that can be handled during rendering or inside event handlers instead.
- **React Server Components (RSC) & Actions:** Ensure proper boundaries between Server and Client Components (`"use client"`). Prefer native React 19 Actions (Form Actions) and hooks like `useActionState` for handling form submissions.
- **The `use()` Hook:** Ensure that the new `use()` hook is utilized instead of traditional hooks when resolving Promises or Context conditionally or inside loops.

### A.2 tRPC (API Layer)

- **Type-Safety:** All API requests must be fully type-safe and routed via the generated tRPC routers. Flag any manual `fetch` or Axios calls used for internal API communication.
- **Error Handling:** Verify that tRPC errors (e.g., validation or server errors) are gracefully caught and handled in the UI.
- **Procedures:** Ensure new API endpoints strictly use the correct tRPC procedure types (e.g., `protectedProcedure` for authenticated routes).

### A.3 TanStack Routing & State Management

- **TanStack React Router:**
  - Strictly enforce file-based routing.
  - Data critical for rendering a page must be fetched via the route's `loader` function rather than loading it inside the component body.
  - Enforce the use of `useNavigate` or the `<Link>` component for type-safe navigation.
- **TanStack React Query:**
  - Use React Query for caching and mutating asynchronous server state whenever it is not already managed by native tRPC hooks.
  - Ensure query keys are consistent and well-structured.

### A.4 Design System: @cloudoperators/juno-ui-components

- **Prefer Juno UI Components:** Prefer using Juno UI components for layouts, buttons, forms, and overlays when they provide the needed functionality. Custom CSS classes are allowed when needed for specific design requirements.
- **Layout & Grid:** Mandate the use of Juno's layout utilities (e.g., `<AppShell>`, `<Container>`, `<Grid>`) to maintain UI consistency.
- **Accessibility & Props:** Check that semantic props provided by Juno components (e.g., `variant`, `disabled`, `required`) are used correctly instead of rewriting that logic manually.

### A.5 General Review Instructions

- Provide constructive, concise, and highly actionable feedback.
- Whenever a guideline is violated, provide a brief code snippet demonstrating the correct implementation.

---

## Part B: UI Patterns & Component Standards

Derived from the reference implementations in:

- `packages/aurora/src/client/routes/_auth/projects/$projectId/compute/flavors`
- `packages/aurora/src/client/routes/_auth/projects/$projectId/storage/-components/Ceph`

### B.1 [STANDARD] Component Library

Use Juno UI components for UI primitives; use the application components listed below where they are prescribed. Do not use raw HTML elements (`<div>`, `<table>`, `<button>`) where a Juno component exists.

| Purpose                       | Required component                                                             |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Page header                   | `ContentHeader` from `@/client/components/ContentHeader/ContentHeader`         |
| All tabular data              | `DataGrid`, `DataGridRow`, `DataGridHeadCell`, `DataGridCell`                  |
| Toolbar above a table         | `DataGridToolbar`                                                              |
| Key-value detail views        | `DescriptionList`, `DescriptionTerm`, `DescriptionDefinition`                  |
| Two-column key-value (modal)  | `TwoColumnDescriptionList` from `@/client/components/TwoColumnDescriptionList` |
| Section headings in detail    | `ContentHeading`                                                               |
| Status indicators             | `Badge`                                                                        |
| Loading / empty / error state | `Status`                                                                       |
| Inline banner messages        | `Message`                                                                      |
| Pagination                    | `Pagination` (`variant="input"`)                                               |
| Primary layout primitive      | `Stack`                                                                        |
| All modals / dialogs          | `Modal`                                                                        |
| Form layout                   | `Form`, `FormRow`, `FormSection`                                               |
| Text inputs                   | `TextInput`                                                                    |
| Dropdowns                     | `Select`, `SelectOption`                                                       |
| Search bar                    | `SearchInput`                                                                  |
| Loading spinner               | `Spinner` (`variant="primary"`)                                                |
| Context menus                 | `PopupMenu`, `PopupMenuToggle`, `PopupMenuOptions`, `PopupMenuItem`            |
| Action buttons in a row       | `ButtonRow`                                                                    |
| Tab navigation                | `TabNavigation`, `TabNavigationItem`                                           |
| Toast notifications           | `toast` imperative API (`toast.success`, `toast.error`, `toast.warning`)       |
| Copyable text                 | `ClipboardText` from `@/client/components/ClipboardText`                       |
| Sort control                  | `SortInput` from `@/client/components/ListToolbar/SortInput`                   |

**Reject** any PR that introduces a plain `<table>`, `<input>`, `<select>`, or `<button>` where a Juno equivalent exists.

### B.2 [STANDARD] List Page Zone Structure

Every list page **must** follow this four-zone pattern:

```
Zone 1  [Stack, className="pb-2"]
        Sort controls (SortInput)  +  primary action Button (create/add)
        distribution="between"

Zone 2  [DataGridToolbar]
        SearchInput → distribution="end"

Zone 3  [DataGridToolbar, optional]
        Breadcrumb / prefix navigation
        Only rendered when hierarchical navigation exists

Zone 4  [DataGridToolbar, optional]
        Checkbox (select-all, indeterminate)  +  PopupMenu (bulk actions)  +  item count
        Only rendered when bulk-select feature exists
```

- Zone 1 is outside `DataGridToolbar`; zones 2–4 are inside.
- Each zone is a `Stack` with `direction="horizontal"`.
- **Reject** any structure that mixes zones or skips Zone 2 when search is available.

### B.3 [STYLE] Spacing Rules

Use only these spacing values. Do not invent arbitrary padding or margin classes.

**Padding**

| Context                         | Class              |
| ------------------------------- | ------------------ |
| Toolbar background bar          | `p-2` or `p-4`     |
| Zone 1 bottom (sort+create row) | `pb-2`             |
| Pagination wrapper              | `py-4`             |
| Full-page loading/empty center  | `py-8`             |
| Inline empty paragraph in table | `py-8 text-center` |

**Margin**

| Context                                     | Class        |
| ------------------------------------------- | ------------ |
| `Message` banners                           | `mb-4`       |
| `DescriptionList` in modals                 | `mb-6`       |
| Warning before table                        | `mb-2`       |
| Detail view top offset                      | `mt-6`       |
| Tab nav tight spacing below `ContentHeader` | `-mt-4 mb-8` |

**Stack `gap` values**

| Context                              | Gap     |
| ------------------------------------ | ------- |
| Tight button grouping                | `"0.5"` |
| Standard button row                  | `"2"`   |
| Form fields, modal content           | `"4"`   |
| Section spacing, modal large content | `"6"`   |

**Reject** any use of ad-hoc `mt-3`, `mb-5`, `px-6`, etc. not listed above.

### B.4 [STANDARD] Color Tokens

Use only Juno theme tokens. Do not use raw Tailwind color classes (`text-gray-500`, `bg-red-100`, etc.).

| Purpose                          | Token                                       |
| -------------------------------- | ------------------------------------------- |
| Standard body text               | `text-theme-default`                        |
| Muted / secondary text           | `jn:text-theme-light` or `text-theme-light` |
| High-emphasis keys               | `jn:text-theme-high`                        |
| Error text inline                | `text-theme-error`                          |
| Spinner accompanying text        | `text-juno-grey-light-1 text-sm`            |
| Action toolbar header background | `jn:bg-theme-background-lvl-1`              |
| Danger info box (background)     | `bg-theme-danger-10`                        |
| Danger info box (text)           | `text-theme-danger`                         |

**`error` vs. `danger` variant distinction** — use `error` for system/operation failures (API error, mutation failed). Use `danger` for destructive or irreversible actions the user is about to take (delete confirmation). Never swap them for visual effect.

**Reject** any PR that introduces a raw Tailwind color class for a purpose covered by the tokens above, or that misuses `error`/`danger` semantics.

### B.5 [STANDARD] Modal Structure

All modals **must** follow this skeleton:

```tsx
<Modal
  title={t`...`}
  open={isOpen}
  size="small" | "large"
  onCancel={handleClose}
  onConfirm={handleSubmit}         // omit for info-only modals; use modalFooter instead
  confirmButtonLabel={...}
  confirmButtonVariant="primary" | "primary-danger"
  cancelButtonLabel={t`Cancel`}
  disableConfirmButton={...}       // disabled while loading or validation fails
  disableCancelButton={isLoading}
  disableCloseButton={isLoading}
>
  <Stack direction="vertical" gap="4">
    {error && <Message variant="error" text={error} className="mb-4" onDismiss={clearError} />}
    {/* content */}
  </Stack>
</Modal>
```

- **Titles:** title case, action-oriented. Put the object name in the body, not the title. Use `"Delete Object"` not `"Are You Sure?"`. Reference the affected entity by name/identifier in the body (e.g. body: `"Object 12aB9 will be permanently deleted."`); for multiple items, state the number and type in the body.
- **Confirm labels:** prefer verb + object type: `"Delete Image"`, `"Stop Instance"`. Verb alone when object type is long.
- **One primary action:** exactly one `primary` (or `primary-danger`) button, always rightmost — it is what Enter triggers. A `Cancel`/`Close` sits to its left.
- **Destructive modals:** `confirmButtonVariant="primary-danger"` mandatory. Severity ladder: very low → no modal needed; low → button only (always enabled); mid → checkbox first (confirm enabled after check); high → type a matching phrase first (confirm enabled after match).
- **No redundant confirmation `Message` inside a modal.** A confirmation or destructive modal should not carry an extra informational `Message` in its body. Operation/validation errors are still allowed and should use `variant="error"`; otherwise, a `Message` variant must match the primary button: `info` ↔ blue `primary`, `danger` ↔ `primary-danger`. Never mix conflicting semantic colors in one modal.
- **`disableCloseButton` sync:** built-in footer syncs automatically; custom `modalFooter` requires explicit `disableCloseButton` on `<Modal>`. When a decision cannot be cancelled, disable close-X and Cancel together — never leave one enabled to bypass the restriction.
- **Loading:** render `<Modal open onCancel={...}><Spinner /></Modal>` while loading; pass data to an inner `*Inner` component.
- **Form modals:** keep the primary/confirm button disabled while any required field is empty or any field fails validation; re-evaluate on change.
- Never stack modals. Never open a modal without prior user interaction. Never lock the user in — closing via X or Cancel must always be possible (except transient disabled-during-async states above). Do not use modals for Sign-in.

**Reject** any modal missing `disableCancelButton` / `disableCloseButton` during async ops, using a custom `<dialog>`, with a vague title, using `primary-danger` for a non-destructive action, carrying a redundant `Message` in a confirmation/destructive modal, or with a `Message` variant conflicting with the primary button.

### B.6 [STANDARD] Empty / Loading / Error States

```tsx
// Full-page loading
<Status status="progress" title={t`Loading...`} />

// Full-page error
<Container className="py-8">
  <Status status="error" code={...} title={...} body={...} action={<ButtonRow>...</ButtonRow>} />
</Container>

// Empty state in table cell
<DataGridCell colSpan={N}>
  <Status status="empty" title={...} body={...} />
</DataGridCell>

// Inline banner error (dismissible)
<Message variant="error" text={...} className="mb-4" onDismiss={...} />

// Accessible inline error text
<p className="text-theme-error" role="alert" aria-live="assertive">{error}</p>
```

- Use `Status` as the default for any error, loading, or empty state not covered by a more specific pattern. Its `status` prop is a typed union — do not review which values are valid (TypeScript enforces that); review only whether the chosen state fits the situation.
- Distinguish empty reasons: "no data" → suggest creating; "no filter results" → suggest clearing filters. This is about the `title`/`body` _wording_, not the `status` value.
- Scope loading states to the affected component, not the whole page. Prefer the tightest sensible boundary, but do not multiply spinners — one busy indicator per busy scope (e.g. one on the DataGrid, not one per row).
- Keep tight error boundaries and render as much of the page as possible; never show a blank screen. Always communicate the state and a possible course of action (retry link where feasible).

**Error scope by category:**

| Category                                   | Handling                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| "Big" errors (500/502/503/504, 404, crash) | Dedicated full-page error view with numeric code, title, description; keep PageHeader/navigation or at least a link home.           |
| 401 Unauthenticated                        | Redirect to Sign-in, remember target, redirect back after auth; show an auth error on the Sign-in page.                             |
| 403 Unauthorized (page)                    | Error page reflecting the route in breadcrumb + title, SideNav if applicable, plus an **info** `Message` explaining lack of access. |
| Component/API render error                 | Feedback scoped to the affected component; render the rest of the page.                                                             |
| Operation/CRUD error                       | Non-blocking `Message`/toast with detail; don't block other actions; offer retry.                                                   |
| Validation error                           | Inline per field (see B.11), or a `Message` at form/section top for cross-field.                                                    |
| Network/connectivity                       | Clear offline/timeout state with a manual retry option.                                                                             |

Recommended copy (impersonal, no exclamation): 401 `"Authentication failed. Verify your credentials and try again."`; 403 `"You do not have the required permissions to access this resource."`; 404 `"The requested URL does not exist or may have moved."`; 500 `"An internal error occurred. Try again."`

**Reject** any error element without `role="alert"` and `aria-live="assertive"`, any dismissible `Message` without `onDismiss`, any empty/broken state without explanatory `title`/`body`, a blank/blocking full-page error where a scoped boundary would keep the app usable, or a 401/403 handled inline instead of via redirect / page-level info `Message`.

### B.7 [CRITICAL] Data Fetching

Two approved patterns — match the existing pattern in the surrounding module.

**tRPC React Query (preferred):**

```tsx
const { data, isLoading, error } = trpcReact.namespace.procedure.useQuery(params, {
  enabled: !!projectId,
  retry: false,
  staleTime: N * 1000,
})
const mutation = trpcReact.namespace.procedure.useMutation({
  onSuccess: () => utils.namespace.procedure.invalidate(),
  onError: (err) => setError(translateError(err)),
})
```

**Promise + React `use()` (list pages):**

```tsx
const [promise, setPromise] = useState(() => createResourcePromise(...))
// In child wrapped with <Suspense> + <ErrorBoundary>:
const data = use(promise)
startTransition(() => setPromise(createResourcePromise(...)))
```

**Permissions always default to `false`** while loading (fail-closed). **Reject** any pattern that shows UI controls before permissions are confirmed.

### B.8 [CRITICAL] Permissions / RBAC

- Centralize feature-area permissions in a `use<Feature>Permissions(projectId)` hook with `staleTime: Infinity`.
- Boolean permission props **must** be named `can<Verb><Noun>` (e.g., `canDeleteFlavor`, `canUpdateVersioning`).
- Never optimistically show actions before permissions resolve.

**Rendering unauthorized controls — pick the right strategy:**

| Situation                                                                 | Strategy                                                                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Permission **known**, feature available to most users, current one not    | **Render disabled**, and explain via tooltip / nearby info `Message`.                           |
| Permission **known**, feature only for few/privileged or highly sensitive | **Do not render** the control at all.                                                           |
| Permission **cannot be known** ahead of time                              | Render functional, rely on API response, show a clear "not authorized" error (least desirable). |

An authorized-content-but-unauthorized-action failure is handled as an Operation/CRUD error (B.6) with clear communication of the missing permission.

**Reject** any permission prop named `isAllowed`, `hasPermission`, `allowed`, or anything other than `can<Verb><Noun>`; any always-hidden control that should be a disabled+explained control (or vice versa) per the matrix above.

### B.9 [STANDARD] URL State Management

All persistent UI state **must** live in URL search params.

| State type              | Examples                  |
| ----------------------- | ------------------------- |
| Sort                    | `sortBy`, `sortDirection` |
| Search                  | `search`                  |
| Pagination              | `page`                    |
| Active tab              | `tab`                     |
| Hierarchical navigation | `prefix`                  |

```tsx
navigate({ search: (prev) => ({ ...prev, sortBy: newValue }) })
```

Use a local mirror state for debounced search inputs; sync back on external navigation via `useEffect`.

**Reject** any `useState` for state that should survive a page refresh or be shareable via URL.

### B.10 [STANDARD] Toast Notifications

All toast messages **must** be extracted to a dedicated `<Resource>ToastNotifications.tsx` file.

```tsx
// In *ToastNotifications.tsx
export const getResourceDeletedToast = (name: string): ToastReturnType => ({
  message: <Trans>Resource deleted</Trans>,
  description: <Trans>"{name}" was successfully deleted.</Trans>,
})

// At the call site — invariant pattern
const { message, ...options } = getResourceDeletedToast(name)
toast.success(message, options)
```

**Reject** any `toast.success/error/warning(...)` call with an inline string or JSX not delegated to a `*ToastNotifications` helper.

### B.11 [STANDARD] Form Validation

Preferred: `@tanstack/react-form` with Zod schema validators.

```tsx
const form = useForm({
  defaultValues: { name: "" },
  validators: { onSubmit: z.object({ name: z.string().min(1) }) },
  onSubmit: async ({ value }) => { ... },
})
<form.Field name="name">
  {(field) => (
    <TextInput
      label={t`Name`}
      required
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      invalid={field.state.meta.errors.length > 0}
      errortext={field.state.meta.errors[0]}
    />
  )}
</form.Field>
```

- Validate **on blur** by default; always re-validate all fields **on submit**.
- Validate **as-you-type** only for strict-format fields (slug, key pattern).
- Never show errors on untouched fields before submit.
- Inline errors below the field for single-field failures; `<Message variant="error">` at form top for cross-field or multi-field failures. Never use both for the same error.
- Cross-field errors go on the dependent field, not the first field filled in.
- `autoFocus` on the primary input. `disabled={isMutating}` on all inputs during in-flight mutations.
- **Use a real `label`, not `placeholder`, as the field label** (via the component API's `label`/`helptext`/`errortext` props — never a manual adjacent `<p>`). Mark required fields with a visible indicator, not color alone.
- **Submit button:** primary action rightmost, cancel to its left; show a busy state and disable both on submit to prevent duplicate submissions. Use `primary-danger` when the submit is destructive.
- **On success:** navigate to the new/edited entity's detail view, **or** (modal) close and show a confirming toast, **or** show an inline confirmation — never combine a toast with an inline confirmation for the same action.
- **Distinguish failures:** validation errors stay inline and keep the form open; server-side errors show a `Message` at form top (or inside the modal) explaining what went wrong and whether retry helps.

**Reject** any form that mutates without validation, shows no error state on failure, shows errors on untouched fields before submit, uses `placeholder` as a substitute for a label, or combines a success toast with an inline confirmation for the same action.

### B.12 [STYLE] File & Component Naming

| Artifact       | Convention                                         | Example                        |
| -------------- | -------------------------------------------------- | ------------------------------ |
| Route entry    | `index.tsx`, `$resourceId.tsx`                     | `$flavorId.tsx`                |
| List container | `<Resource>ListContainer.tsx`                      | `FlavorListContainer.tsx`      |
| Table view     | `<Resource>Table.tsx` or `<Resource>TableView.tsx` | `CorsRulesTable.tsx`           |
| Modal          | `<Verb><Resource>Modal.tsx`                        | `CreateFlavorModal.tsx`        |
| Toast helpers  | `<Resource>ToastNotifications.tsx`                 | `BucketToastNotifications.tsx` |
| Tab container  | `<Resource>Tab.tsx`                                | `CorsRulesTab.tsx`             |
| Form           | `<Resource>Form.tsx`                               | `CorsRuleForm.tsx`             |
| Validation     | `<domain>Validation.ts`                            | `flavorValidation.ts`          |
| Utility        | `camelCase.ts`                                     | `corsUtils.ts`                 |
| Hook           | `use<PascalCase>.ts`                               | `useCephPermissions.ts`        |
| Store          | `<resource>Store.ts`                               | `objectDownloadStore.ts`       |
| Test           | `<ComponentName>.test.tsx` (co-located)            | `FlavorListContainer.test.tsx` |

**Reject** any file using lowercase-dash convention (`create-flavor-modal.tsx`), generic names (`Modal.tsx`, `Table.tsx`), or tests placed outside the source directory.

### B.13 [STYLE] Import Order

1. React / framework (`react`, `@tanstack/react-router`, `@tanstack/react-form`, `zod`)
2. i18n (`@lingui/react/macro`, `@lingui/core/macro`)
3. tRPC client (`@/client/trpcClient`)
4. Juno components (`@cloudoperators/juno-ui-components`)
5. Server types (`@/server/...`)
6. Shared client utilities / hooks (`@/client/utils/...`, `@/client/hooks/...`)
7. Local sibling components (`./ComponentName`)
8. Local hooks / stores (`./hooks/...`)

All imports **must** use `@/` path aliases. No relative `../../` traversal beyond one level.

### B.14 [STANDARD] Accessibility & Internationalisation

- All user-facing strings **must** be wrapped in `<Trans>` (JSX) or `` t`...` `` (strings) from `@lingui/react/macro` / `@lingui/core/macro`. In `packages/aurora` this is already enforced by `eslint-plugin-lingui` — only review it manually in `packages/signal-openstack`, `packages/policy-engine`, and `apps/dashboard`.
- Error messages **must** use `role="alert"` and `aria-live="assertive"`. Non-urgent status updates use `role="status"`.
- `DataGrid` header cells must use `DataGridHeadCell`, never plain `<th>`.
- Context menus **must** use `<PopupMenuToggle as="div"><Button icon="moreVert" /></PopupMenuToggle>` as the trigger.
- **Icon-only buttons** must carry `aria-label` describing the action (e.g. `aria-label="Delete item"`).
- **Form inputs with help text or error messages** must link them via `aria-describedby`. Juno's `TextInput` handles this automatically when `helptext`/`errortext` props are used — always use the component API, never place adjacent `<p>` text manually.
- **Do not suppress focus rings.** Juno provides focus ring styles; never override them with `outline-none` without replacement.
- Do not rely on color alone to convey information — pair color with a text label or icon.

**Reject** any hardcoded English string in JSX (outside `packages/aurora`, where lingui lint already covers it), any error element without appropriate ARIA attributes, or any icon-only button without `aria-label`.

### B.15 [CRITICAL] DataGrid Column Structure & Row Interaction

**Column ordering:**

- Leftmost: checkbox column (bulk select) — no header label needed
- Second: most identifying attribute (name, ID) — bold text recommended
- Status/state columns: near the left (users scan for status first)
- Remaining attributes: ordered by relevance
- Rightmost: action column (overflow menu / `PopupMenu`)

**Action column:** Use an overflow `PopupMenu` even for a single action — avoids row clutter. Set a `min-width` on the action cell to prevent the column from collapsing.

**Clickable rows:** When a row navigates or triggers an action, the entire row must be clickable with visible hover feedback. Every nested interactive element (button, link, `PopupMenu`) inside that row **must** call `event.stopPropagation()` on its click handler.

**Permission-based rendering:**

- Do not render bulk-action controls (checkboxes + bulk menu) when the user has no permission for any bulk action.
- Do not render per-row checkboxes when the user has no bulk action permissions.
- Do not render "Create" button when the user has no create permission.

**Bulk selection behavior:**

- Bulk action controls must be **disabled until at least one item is selected**.
- The select-all checkbox is **tri-state**: unchecked (none selected), indeterminate (some selected), checked (all selected). Clicking while unchecked/indeterminate selects all; clicking while checked deselects all.

**Reject** any DataGrid that renders bulk-action or create UI without checking permissions, any nested interactive element in a clickable row without `stopPropagation()`, bulk actions enabled with nothing selected, or a select-all checkbox that is not tri-state.

### B.16 [STANDARD] Messages vs. Toast Notifications — When to Use Which

| Situation                                        | Use                                       |
| ------------------------------------------------ | ----------------------------------------- |
| Background / async operation completed           | `toast` (transient)                       |
| CRUD action confirmed (create, delete, update)   | `toast` (transient)                       |
| Persistent constraint visible for entire session | `<Message>` (persistent, non-dismissible) |
| One-off feedback after a user action, inline     | `<Message dismissible>`                   |
| Error that requires user attention / action      | `<Message variant="error">` (not a toast) |
| Form-level validation failure                    | `<Message variant="error">` at form top   |
| DataGrid/section-level error                     | `<Status status="error">` inside the grid |

- Do not use `toast` for actionable errors — they auto-dismiss and the user may miss them.
- Never make `error` or `warning` messages/toasts auto-dismissing. `autoDismiss` is only for low-stakes `info`/`success` feedback the user need not act on (and be aware it causes a layout shift).
- Only add a `Message` title when the message is prominent or multi-sentence; do not add a title by default. Place a `Message` as close as possible to the content it relates to (form-level → top of form; page-level → below the page header).
- `<Message>` inside a modal must match the primary button variant (`info` → blue primary, `danger` → `primary-danger`) — see B.5; a confirmation/destructive modal should carry no extra `Message` at all.

**Reject** any `toast.error` for a persistent or actionable error, or any `<Message>` variant conflicting with the modal's primary button.

### B.17 [STANDARD] Recurring Utility Hooks (Do Not Reinvent)

| Hook                        | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `useProjectId()`            | Read `projectId` from route params                        |
| `useModal()`                | `[open, toggle]` tuple                                    |
| `useModalTracking()`        | Analytics: `trackClose`, `markSubmitted`, `resetTracking` |
| `useSetBreadcrumb()`        | Set breadcrumb label reactively                           |
| `useErrorTranslation()`     | `translateError(code)`, `isRetryableError(code)`          |
| `useVirtualizedTableBody()` | Virtual scroll for large tables                           |

**Reject** any re-implementation of the above logic inline in a component.

### B.18 [STANDARD] PopupMenu / Overflow Menu Item Ordering

- Sort items **alphabetically** within each group — with one exception: **"Delete [Entity]"** is always **last** in its menu or group.
- **Single-entity menus** (all actions target one entity type): separate the Delete action from the rest with a divider.
- **Multi-entity menus** (multiple groups): put a divider **between groups**. The group dividers already provide separation — do **not** add an extra divider before Delete within a group.
- Include the referenced entity in labels where it aids clarity (`"Edit Bucket"`, not `"Edit"`).

```
// Single entity — divider before Delete
Copy Item
Download Item
View Item
──────────────
Delete Item

// Multiple entities — group dividers only, no extra divider before Delete
Edit Bucket
Empty Bucket
Delete Bucket
──────────────
Edit Policy
Delete Policy
```

**Reject** any menu where "Delete" is not last in its group, a single-entity menu lacking a divider before Delete, or a multi-entity menu with a redundant extra divider before Delete inside a group.

### B.19 [STYLE] UX Writing & Content Standards

- **Title case** for modal titles, page headings, column headers, button labels, toast/message titles, tab labels, lists.
  - **Capitalize:** first and last word (always), nouns, verbs, pronouns, adjectives, adverbs, numbers, and **subordinating conjunctions** (`Although`, `Because`, `If`, `When`).
  - **Lowercase** (unless first/last word): articles (`a`, `an`, `the`), short prepositions (max 5 letters: `at`, `by`, `for`, `in`, `of`, `on`, `to`, `up`, …), short coordinating conjunctions (`and`, `but`, `or`, `nor`, `so`, `yet`), and `"to"` in infinitives.
  - Example: `"How to Use This Guide"`, `"Confirm to Terminate an Action"` — **not** `"How To Use This Guide"`.
- **`"Sign in"`, not `"Sign In"` or `"Log in"`.** This is the one established exception — follow SAP Fiori: use `"Sign in"` (lowercase `in`) consistently everywhere.
- **Never** all-caps (ever), exclamation marks, or double/triple punctuation. An ellipsis (`…`) counts as a single glyph and is allowed (e.g. to signal a follow-up step).
- **No punctuation** at the end of titles unless it conveys actual meaning.
- **Voice:** active and impersonal. No "We", "Us", "Please", "Thanks". Use `"An error occurred"` not `"We encountered an error"` and not `"Your request could not be processed"` (needless passive).
- **Avoid nominalizations:** `"Creating an instance may take…"` not `"The creation of an instance may take…"`.
- **Address the user as "You"** in messages; avoid possessive pronouns in UI labels (`"User Account"`, not `"My Account"` / `"Your Account"`).
- **Precision:** prefer established domain terms (OpenStack, Kubernetes) over vague synonyms; precision over verbosity. Avoid language-specific idioms/metaphors (i18n-readiness).
- **Consistency:** one term per concept. Don't mix "terminate" and "stop" for the same action. When a button refers to an action named in the title/copy, use the same verb, or fall back to a generic `"Confirm"` / `"OK"`.
- **Button labels:** short, infinitive verb, title case. Prefer verb + object type when the object is a single short word (`"Delete Image"`, `"Stop Instance"`); fall back to the verb alone when the object is long or multi-word (`"Delete"`, not `"Delete Kubernetes Node Pool"`). Never `"Click to delete"`. Use `"OK"` only for pure acknowledgement.

**Reject** any string using all-caps, exclamation marks, alarmist language, personal voice ("We"/"Please"/"Thanks"), `"Sign In"`/`"Log in"`, or inconsistent terminology for the same action.

---

## Review Style

- Be concise, specific, and actionable.
- Explain the "why" behind each recommendation — reference the rule it violates and the risk it introduces.
- Always include a short corrected code snippet when a guideline is violated.
- Do not repeat findings already raised in a previous review round on the same PR.
- Prioritize findings: flag `[CRITICAL]` issues first, then `[STANDARD]`, then `[STYLE]`.

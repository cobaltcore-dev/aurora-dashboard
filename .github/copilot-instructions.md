# Aurora Dashboard — PR Review Guidelines

A PR reviewer or AI assistant **must reject** code that violates these rules unless the PR author provides an explicit justification.

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

### B.1 Component Library

All UI components **must** be imported from `@cloudoperators/juno-ui-components`. Do not use raw HTML elements (`<div>`, `<table>`, `<button>`) where a Juno component exists.

| Purpose                       | Required component                                                             |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Page header                   | `ContentHeader` from `@/client/components/ContentHeader/ContentHeader`         |
| All tabular data              | `DataGrid`, `DataGridRow`, `DataGridHeadCell`, `DataGridCell`                  |
| Toolbar above a table         | `DataGridToolbar`                                                              |
| Key-value detail views        | `DescriptionList`, `DescriptionTerm`, `DescriptionDefinition`                  |
| Two-column key-value (modal)  | `TwoColumnDescriptionList` from `@/client/components/TwoColumnDescriptionList` |
| Section headings in detail    | `ContentHeading`                                                               |
| Status indicators             | `Badge` (`variant`: `success`, `warning`, `info`)                              |
| Loading / empty / error state | `Status` (`status`: `progress`, `empty`, `error`)                              |
| Inline banner messages        | `Message` (`variant`: `error`, `warning`, `info`)                              |
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

### B.2 List Page Zone Structure

Every list page **must** follow this four-zone pattern:

```
Zone 1  [Stack, className="pb-2"]
        Sort controls (SortInput)  +  primary action Button (create/add)
        distribution="between"

Zone 2  [DataGridToolbar]
        SearchInput → distribution="end"

Zone 3  [DataGridToolbar, optional]
        Checkbox (select-all, indeterminate)  +  PopupMenu (bulk actions)  +  item count
        Only rendered when bulk-select feature exists

Zone 4  [DataGridToolbar, optional]
        Breadcrumb / prefix navigation
        Only rendered when hierarchical navigation exists
```

- Zone 1 is outside `DataGridToolbar`; zones 2–4 are inside.
- Each zone is a `Stack` with `direction="horizontal"`.
- **Reject** any structure that mixes zones or skips Zone 2 when search is available.

### B.3 Spacing Rules

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

### B.4 Color Tokens

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

### B.5 Modal Structure

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

**Modal titles** must use title case and state the action clearly. Put the affected object's name in the body, not the title.

Do use: `"Delete Object"`, `"Remove User from Project"`, `"Revoke API Key"`
Do not use: `"Danger!"`, `"Delete"`, `"Are You Sure?"`, `"Action Required"`, `"Please Confirm"`

**Confirm button labels** — prefer verb + object type when the object name is short: `"Delete Image"`, `"Revoke Key"`, `"Stop Instance"`. Fall back to the verb alone when the object type is multi-word or long. Be consistent within the application.

**Destructive modals** — `confirmButtonVariant="primary-danger"` is **mandatory**. Severity determines how the user must confirm:

| Severity | Required confirmation                                      |
| -------- | ---------------------------------------------------------- |
| Low      | Modal button only (always enabled)                         |
| Mid      | Checkbox, then button (enabled after check)                |
| High     | Type a specified phrase, then button (enabled after match) |

A toast notification confirming deletion is required for all destructive actions unless the action is very low risk or context makes it obvious.

**`disableCancelButton` / `disableCloseButton` sync rule** — when using the built-in footer, `disableCancelButton` automatically disables the close-X. When using a custom `modalFooter`, you must also pass `disableCloseButton` explicitly — the sync does not apply to custom footers.

- Loading state: render `<Modal open onCancel={...}><Spinner /></Modal>` while loading; pass loaded data to an inner `*Inner` component.
- Conditional footer: when a resource cannot be acted on yet, swap to a "Close"-only footer via the `modalFooter` prop.
- Never stack modals. Never show a modal without prior user interaction.

**Reject** any modal that omits `disableCancelButton` / `disableCloseButton` during async operations, uses a custom `<dialog>` overlay, has an alarmist/vague title, or uses `primary-danger` without matching a mid/high severity destructive action.

### B.6 Empty / Loading / Error States

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

**`Status` is the required default** for any error, loading, or empty state not covered by a more specific pattern. It adapts automatically to DataGrid context when placed inside `DataGridRow` + `DataGridCell`.

**Distinguish empty reasons:**

- "No data exists" → suggest next action (e.g. create first item)
- "No results match current filters" → suggest clearing filters

**Scope loading states tightly** — a DataGrid loading its data must show the spinner scoped to itself, not the whole page. Only use a page-level spinner if the entire page is blocked.

**Reject** any error element without `role="alert"` and `aria-live="assertive"`, any `Message` banner without `onDismiss`, or any component that renders a visibly empty/broken state without explanation.

### B.7 Data Fetching

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

### B.8 Permissions / RBAC

- Centralize feature-area permissions in a `use<Feature>Permissions(projectId)` hook with `staleTime: Infinity`.
- Boolean permission props **must** be named `can<Verb><Noun>` (e.g., `canDeleteFlavor`, `canUpdateVersioning`).
- Never optimistically show actions before permissions resolve.

**Reject** any permission prop named `isAllowed`, `hasPermission`, `allowed`, or anything other than `can<Verb><Noun>`.

### B.9 URL State Management

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

### B.10 Toast Notifications

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

### B.11 Form Validation

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

**Validation timing:**

- **On blur** (default) — validate when user leaves a field; avoids flagging errors mid-typing
- **On submit** — always validate all fields on submit regardless of earlier validation
- **As-you-type** — only for fields with strict format requirements (slug, key pattern); avoid for fields where partial input is always temporarily invalid

Never show errors on required but untouched fields before the user has interacted or submitted.

**Error placement:**

- Inline below the field when the error can be attributed to a specific field
- Summary `<Message variant="error">` at the top of the form for cross-field errors or multi-field submit failures
- Never use both inline and summary for the same error

**Cross-field validation** — show the error on the dependent field (the one whose value is the problem), not the first field filled in.

- `required` + `errortext` on every validated `TextInput`.
- `autoFocus` on the primary confirm input.
- `disabled={isMutating}` on all inputs during in-flight mutations.
- General error banner (`<Message variant="error">`) at the top of the form, with `onDismiss`.

**Reject** any form that mutates without validation, shows no error state on failure, or shows errors on untouched fields before submit.

### B.12 File & Component Naming

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

### B.13 Import Order

1. React / framework (`react`, `@tanstack/react-router`, `@tanstack/react-form`, `zod`)
2. i18n (`@lingui/react/macro`, `@lingui/core/macro`)
3. tRPC client (`@/client/trpcClient`)
4. Juno components (`@cloudoperators/juno-ui-components`)
5. Server types (`@/server/...`)
6. Shared client utilities / hooks (`@/client/utils/...`, `@/client/hooks/...`)
7. Local sibling components (`./ComponentName`)
8. Local hooks / stores (`./hooks/...`)

All imports **must** use `@/` path aliases. No relative `../../` traversal beyond one level.

### B.14 Accessibility & Internationalisation

- All user-facing strings **must** be wrapped in `<Trans>` (JSX) or `` t`...` `` (strings) from `@lingui/react/macro` / `@lingui/core/macro`.
- Error messages **must** use `role="alert"` and `aria-live="assertive"`. Non-urgent status updates use `role="status"`.
- `DataGrid` header cells must use `DataGridHeadCell`, never plain `<th>`.
- Context menus **must** use `<PopupMenuToggle as="div"><Button icon="moreVert" /></PopupMenuToggle>` as the trigger.
- **Icon-only buttons** must carry `aria-label` describing the action (e.g. `aria-label="Delete item"`).
- **Form inputs with help text or error messages** must link them via `aria-describedby`. Juno's `TextInput` handles this automatically when `helptext`/`errortext` props are used — always use the component API, never place adjacent `<p>` text manually.
- **Do not suppress focus rings.** Juno provides focus ring styles; never override them with `outline-none` without replacement.
- Do not rely on color alone to convey information — pair color with a text label or icon.

**Reject** any hardcoded English string in JSX, any error element without appropriate ARIA attributes, or any icon-only button without `aria-label`.

### B.15 DataGrid Column Structure & Row Interaction

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

**Reject** any DataGrid that renders bulk-action or create UI without checking permissions, or any nested interactive element in a clickable row without `stopPropagation()`.

### B.16 Messages vs. Toast Notifications — When to Use Which

| Situation                                        | Use                                       |
| ------------------------------------------------ | ----------------------------------------- |
| Background / async operation completed           | `toast` (transient)                       |
| CRUD action confirmed (create, delete, update)   | `toast` (transient)                       |
| Persistent constraint visible for entire session | `<Message>` (persistent, non-dismissible) |
| One-off feedback after a user action, inline     | `<Message dismissible>`                   |
| Error that requires user attention / action      | `<Message variant="error">` (not a toast) |
| Form-level validation failure                    | `<Message variant="error">` at form top   |
| DataGrid/section-level error                     | `<Status status="error">` inside the grid |

**Key rule:** Do not use `toast` for errors that require user action — they auto-dismiss and the user may miss them. Use `<Message>` placed close to the relevant content instead.

**Semantic variant alignment in modals:** When using `<Message>` inside a modal, its variant must align with the primary action button — `info` for blue primary, `danger` for `primary-danger`. Do not mix conflicting semantic colors in the same modal.

**Reject** any `toast.error` used for a persistent or actionable error, or any `<Message>` variant that conflicts with the modal's primary button variant.

### B.17 Recurring Utility Hooks (Do Not Reinvent)

| Hook                        | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `useProjectId()`            | Read `projectId` from route params                        |
| `useModal()`                | `[open, toggle]` tuple                                    |
| `useModalTracking()`        | Analytics: `trackClose`, `markSubmitted`, `resetTracking` |
| `useSetBreadcrumb()`        | Set breadcrumb label reactively                           |
| `useErrorTranslation()`     | `translateError(code)`, `isRetryableError(code)`          |
| `useVirtualizedTableBody()` | Virtual scroll for large tables                           |

**Reject** any re-implementation of the above logic inline in a component.

### B.16 PopupMenu / Overflow Menu Item Ordering

Items in a `PopupMenu` or overflow menu must follow this order:

1. Sort all items **alphabetically** within each group.
2. **"Delete [Entity]"** is always the **last item**, separated from the rest by a `PopupMenuItem` divider.
3. When the menu contains actions for **multiple entity types**, group them by entity type with a divider between groups. Within each group, the Delete action is last (no extra divider needed inside multi-entity menus — group dividers already provide separation).

```
// Single entity (DataGrid row menu)
Copy Item
Download Item
Share Item URL
View Item
──────────────
Delete Item

// Multiple entities (page-level overflow menu)
Edit Bucket
Empty Bucket
Delete Bucket
──────────────
Edit Policy
Delete Policy
──────────────
Suspend Versioning
Delete Version
```

**Reject** any menu where "Delete" is not the last item in its group, or where a single-entity menu lacks a divider before Delete.

### B.17 UX Writing & Content Standards

These rules apply to all user-visible strings: labels, titles, button text, error messages, toasts, empty states.

**Title case** — use for: modal titles, page headings, DataGrid column headers, button labels, `Message`/toast titles, tab labels.

Capitalize: first + last word, nouns, verbs, pronouns, adjectives, adverbs, subordinating conjunctions.
Do NOT capitalize: articles (`a`, `an`, `the`), short prepositions (`at`, `by`, `for`, `in`, `of`, `on`, `to`), short coordinating conjunctions (`and`, `but`, `or`, `nor`), `"to"` in infinitives.

**Never all-caps. No exclamation marks. No double punctuation.**

**Voice** — active and impersonal. Avoid "We", "Us", "Please", "Thanks".

- Do: `"An error occurred while processing your request."`
- Don't: `"We encountered an error."` / `"Please try again!"`

**Precision** — prefer technical precision over verbosity. Use established domain terms (Kubernetes, OpenStack, etc.) without apology.

**Consistency** — use the same term for the same concept throughout. Don't mix "terminate" and "stop" for the same action.

**Button labels** — short imperative verb (+ short object type when unambiguous): `"Delete"`, `"Create Instance"`, `"Revoke Key"`. Never `"Click to delete"` or `"OK"` unless no better label fits.

**Reject** any string using alarmist language (`"Danger!"`, `"Warning!!!"`), personal voice (`"We're sorry"`), or inconsistent terminology for the same action.

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
- [ ] "Delete" action not the last item in its menu group, or missing divider before it (single-entity menu)
- [ ] URL-worthy state held in `useState` instead of search params
- [ ] User-facing string not wrapped in `<Trans>` or `` t`...` ``
- [ ] Error element without `role="alert"` and `aria-live="assertive"`
- [ ] Icon-only button without `aria-label`
- [ ] `outline-none` suppressing focus ring without replacement
- [ ] File named with lowercase-dash convention or generic name
- [ ] Import using `../../` traversal beyond one level instead of `@/`
- [ ] Re-implementation of a utility hook from B.17
- [ ] String using "Please", "Thanks", "We", exclamation marks, or all-caps

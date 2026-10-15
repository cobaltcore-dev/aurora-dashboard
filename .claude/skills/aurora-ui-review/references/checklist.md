# Analysis checklist

Work through the passes in order. They follow the repo's three review passes, preceded by requirements and followed by component API and tests. For each check, either record a finding, list it under "Verified OK", or mark it "not verified" with the reason. Skip checks for features that are out of scope (e.g. modals in a read-only UI), and say so in the report.

## 0. Prepare

- [ ] Run `scripts/init_findings_dir.sh` and `scripts/locate_juno.sh`. Record the commit SHA, the base ref, the file list and the Juno version.
- [ ] Read every in-scope file completely, plus the parent route files they depend on.
- [ ] Fetch the applicable Juno docs (`juno-guidelines-map.md`) and open `.github/copilot-instructions.md`.

## 1. Requirements traceability (epic)

- [ ] Extract each explicit UI requirement into `REQ-NN`, with its epic section (quote the key phrase) and priority. Typical sources:
  - navigation and route paths;
  - list columns and their content;
  - details sections and fields;
  - copy-to-clipboard;
  - actions and their permission keys;
  - states and error messages;
  - filters, sorting and pagination.
- [ ] For each requirement, record its status: Implemented / Partial / Missing / Out of Scope (cite where it is excluded) / Unclear (→ Open Question). Missing or Partial in-scope requirements are findings (category `Requirements`).
- [ ] Check the reverse too: UI elements the epic or design decisions **exclude** must not be present. Example: a column removed in a design review, or write actions in a read-only scope.
- [ ] If a design is provided, compare the layout and content with it. Report differences only if they also contradict the epic, or if the user said the design is binding.

## 2. Pass 1: Security & Data (repo B.7, B.8, B.15)

- [ ] **Data fetching (B.7, A.2, A.3).** Use typed tRPC only. Page-critical data comes via the route loader or the module's established pattern. tRPC errors are handled, and `FORBIDDEN` gets its own treatment (Juno `error-handling-loading-empty-states.md#authenticationauthorization-errors`).
- [ ] **Server-code imports.** Client code must only use `import type` from `@/server/...` types. A value import pulls server code into the browser bundle.
- [ ] **Permissions (B.8, Juno `ui-for-unauthorized-users.md`, `page-level-actions.md#disabled-vs-hidden-actions`):**
  - Every action uses the permission key the epic names.
  - Checks fail closed: nothing renders before permissions resolve.
  - Hide vs. disable follows the guideline.
  - Props are named `can<Verb><Noun>`.
  - No Create, bulk or selection elements without the corresponding permission (Juno `datagrid.md#render-elements-based-on-user-permissions`).
- [ ] **Project scoping.** Every query passes the current `project_id`. The UI never shows another project's data unless the epic requires it.
- [ ] **Rows (B.15, Juno `datagrid.md#clickable-items--rows`):**
  - If a row navigates, the whole row is clickable, with hover feedback.
  - Nested interactive elements call `event.stopPropagation()`.
  - The identifying column comes first and the action column last.
  - The action column uses a `PopupMenu`.

## 3. Pass 2: UI Correctness (repo B.1, B.4, B.5, B.6, B.9, B.11)

- [ ] **Components (B.1, A.4).** Juno components are used where they exist (Quick Reject: raw `<table>`, `<button>`, ...).
- [ ] **Color tokens (B.4).** Use `text-theme-*` / `bg-theme-*`, no hardcoded Tailwind colors.
- [ ] **States (B.6, Juno `datagrid.md#datagrid-empty-loading-and-error-states`, `error-handling-loading-empty-states.md`):**
  - Loading, empty, **filtered-empty (`"no-matches"`)** and error states use `Status` inside a full-width `DataGridRow` / `DataGridCell`, scoped to the grid.
  - The error state offers a retry where possible.
  - The details page handles pending, error and not-found.
  - Sub-resource sections (tabs) have their own loading, error and empty states.
- [ ] **URL state (B.9).** Search, sort, filters, page and active tab live in search params. Invalid values are dropped in `validateSearch`. The page resets when search, sort or filter change. Check the behaviour against Juno `datagrid.md#filter-and-sort-persistence-on-navigation`.
- [ ] **Modals (B.5, Juno `modals.md`), full mode only:**
  - One primary action; no modal without a prior user interaction.
  - Cancel and close are disabled while the operation is pending.
  - Destructive actions use `confirmButtonVariant="primary-danger"` and a specific, non-alarmist title.
  - Messages inside the modal don't conflict with its variant.
  - The modal has an accessible name.
- [ ] **Forms (B.11, Juno `forms.md`), full mode only:**
  - Field order, required vs optional marking, and labels.
  - Validation timing, inline vs summary errors, and cross-field rules.
  - Submit and cancel placement.

## 4. Pass 3: Style & Consistency (repo B.2, B.3, B.10, B.12–B.14, B.16–B.19)

- [ ] **List zones (B.2, Juno `datagrid.md#datagrid-header--toolbar`).** Each toolbar element is in the right zone (sort and primary action, filters and search, view state, bulk actions, refresh).
- [ ] **Page-level actions (Juno `page-level-actions.md`):**
  - One primary action; the overflow menu composition.
  - Refresh button rules, if present: visible, leftmost, "Refresh Page", disabled while refreshing.
  - Icon-only buttons.
  - Pages with tabs: page actions above the tab bar and static; tab-scoped actions below it.
- [ ] **Spacing (B.3).** Only approved spacing values.
- [ ] **Toasts vs messages (B.10, B.16, Juno `messages-and-notifications.md`):**
  - Toasts go through `*ToastNotifications` helpers.
  - Persistent or actionable errors use `<Message>`, not a toast.
  - Variants are used as intended (Juno `semantic-variants.md`).
- [ ] **Naming and imports (B.12, B.13).** PascalCase resource-specific files; `@/` imports instead of deep `../../` paths; import order.
- [ ] **Accessibility (B.14, Juno `accessibility.md`):**
  - Icon-only buttons have `aria-label`.
  - Error elements use `role="alert"` and `aria-live`.
  - Focus is visible, and rows and menus are keyboard reachable.
  - Modals and tab lists have accessible names.
- [ ] **Hooks (B.17, A.1):**
  - Shared hooks are reused (`useProjectId`, `useModal`, `useSetBreadcrumb`, `useErrorTranslation`, ...).
  - No hooks after an early return.
  - No unnecessary `useEffect`; `use()` where appropriate.
- [ ] **Menus (B.18, Juno `popup-and-overflow-menus.md`).**
  - Item order and grouping.
  - "Delete" is last in its group, with a divider before it in single-entity menus.
  - Read-only scope: only the allowed items, e.g. "Show Details".
- [ ] **UX writing (B.19, Juno `ux-writing-content-design.md`):**
  - **Title Case** for page and section headings, column headers, buttons, tab labels, and modal, message and toast titles.
  - Active, impersonal voice: no "Please", "We", "Thanks", exclamation marks or all-caps.
  - Consistent terminology across list, details and navigation (same names for the same things).
  - Empty-state wording explains why there's nothing to show and what to do next.
- [ ] **Values and IDs.**
  - Placeholders for missing values are consistent within and across the resource's views.
  - IDs shown where the epic or design asks, and copyable where required.
  - No IDs where design decisions exclude them.
- [ ] **Navigation and card.**
  - The navigation label and section match the epic.
  - The card and the nav entry are gated by the same service and `enabledServices` checks.
  - The route's `staticData` section, service, crumb and analytics name are consistent with the sibling routes.

## 5. Juno component API

Follow `juno-components.md`.

- [ ] No deprecated or fallback props.
- [ ] Documented callbacks used rather than DOM pass-through props.
- [ ] Controlled components kept in sync with their state source.
- [ ] Semantic variants are correct.

## 6. Tests

- [ ] Each new component has a test file that follows the existing UI test patterns: row, container, list, details view, sub-resource tables, and modals and hooks in full mode.
- [ ] The tests cover the epic's requirements:
  - columns and fields;
  - states (loading, empty, filtered-empty, error, not found);
  - permission gating (actions hidden or disabled);
  - navigation;
  - URL state (search, sort, page, tab).
- [ ] Assertions test behaviour, not implementation details. No test asserts the exact behaviour a guideline forbids, e.g. a toast for a persistent error.
- [ ] Review the tests **statically**: read them and judge coverage and correctness. Don't run them (see "No tooling runs" in `SKILL.md`).

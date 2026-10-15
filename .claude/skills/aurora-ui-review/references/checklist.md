# Analysis checklist

**Authority is Juno only** — the Juno UX docs (`docs/ux`, mapped in `juno-guidelines-map.md`) and the `juno-ui-components` API (exact detail via the `sap_juno_lookup` agent). **There are no Aurora-specific UI/UX rules here.** A check is a finding only when it is backed by a Juno doc/component or by the epic; cite that source on every finding. (Aurora keeps _technical_ rules for the BFF/server review only — not for UI/UX.)

Work through the passes in order. For each check: record a finding, list it under "Verified OK", or mark it "not verified" with the reason. Skip out-of-scope features (e.g. modals in a read-only UI) and say so.

## 0. Prepare

- [ ] Run `scripts/init_findings_dir.sh` and `scripts/locate_juno.sh`. Record the commit SHA, the base ref, the file list and the Juno version.
- [ ] Read every in-scope file completely, plus the parent route files they depend on.
- [ ] Fetch the applicable Juno docs (`juno-guidelines-map.md`). Every finding cites a Juno doc section or a `juno-ui-components` `file:line` (via `sap_juno_lookup`).

## 1. Requirements traceability (epic)

- [ ] Extract each explicit UI requirement into `REQ-NN`, with its epic section (quote the key phrase) and priority. Typical sources: navigation and route paths; list columns and content; details sections and fields; copy-to-clipboard; actions and their permission keys; states and error messages; filters, sorting and pagination.
- [ ] For each requirement, record its status: Implemented / Partial / Missing / Out of Scope (cite where excluded) / Unclear (→ Open Question). Missing or Partial in-scope requirements are findings (category `Requirements`).
- [ ] Check the reverse too: UI elements the epic or design decisions **exclude** must not be present.
- [ ] If a design is provided, compare layout and content; report differences only if they also contradict the epic or the user said the design is binding.

## 2. Juno components & custom code

- [ ] **Juno components are used where they exist.** Any raw HTML element where a Juno component exists (raw `<table>`, `<button>`, `<input>`, `<select>`, an inline `<svg>` icon instead of Juno `Icon`), or a hand-built widget duplicating a Juno capability, is **Custom Code** (category `Custom Code`): a finding when Juno has an equivalent, Info (still labelled) when it does not. Confirm the Juno equivalent via `sap_juno_lookup`.
- [ ] **Component API** (`juno-components.md`): no deprecated/fallback props; documented callbacks used, not DOM pass-through props; controlled components kept in sync with their state source; semantic variants correct. Verify each via `sap_juno_lookup`.

## 3. Colour & tokens

- [ ] **Every colour utility must resolve to a Juno token.** Juno resets the default Tailwind palette (`global.css` `--color-*: initial`), so raw Tailwind ramps (`text-red-600`, `bg-gray-50`, …) and invented names (`text-juno-red`) render nothing → **invalid** (category `Colour`). Use the semantic `theme-*` tokens (`text-theme-error`, `text-theme-success`, …). `white`/`black` and the `sap-*`/`juno-*` tokens are valid.
- [ ] **Never colour alone** to signal meaning (`semantic-variants.md`) — pair with text/icon.
- [ ] Prefix: utilities use the prefix the app's Tailwind build configures (an inconsistent mix means one set is dead CSS — flag it). The app's own build config may be read to confirm which; it is an implementation fact, not a UX authority.

## 4. States (`datagrid.md`, `error-handling-loading-empty-states.md`)

- [ ] Loading, empty, **no-matches** and error states use `Status` inside a full-width `DataGridRow` / `DataGridCell`, scoped to the grid.
- [ ] **Empty vs no-matches distinguished** — "no data exists" and "no data matches your filters" use different variants/copy.
- [ ] The error state offers a retry where possible. The details page handles pending, error and not-found. Sub-resource sections (tabs) have their own states.

## 5. DataGrid & page structure (`datagrid.md`, `page-level-actions.md`, `page-content-area.md`)

- [ ] Toolbar zones (sort/primary action · filters/search · view state/bulk/refresh). Clickable rows: whole row clickable with hover feedback; nested interactive elements call `event.stopPropagation()`; identifying column first, action column last with a `PopupMenu`. Filter/sort persistence per `datagrid.md`.
- [ ] One `primary` action per page; overflow composition; refresh button rules; tabbed pages keep page actions above the tab bar.
- [ ] Every page has Page Header + Content Area + Page Footer.

## 6. Modals & forms (`modals.md`, `forms.md`) — full mode only

- [ ] Modals: one primary action; no modal without prior user interaction; cancel/close disabled while pending; destructive uses `confirmButtonVariant="primary-danger"` + a specific, non-alarmist title; messages inside don't conflict with the variant; the modal has an accessible name.
- [ ] Forms: field order, required vs optional marking, labels; validation timing (inline vs summary), cross-field rules; submit/cancel placement.

## 7. Messages, toasts, variants (`messages-and-notifications.md`, `semantic-variants.md`)

- [ ] Persistent or actionable errors use `<Message>`, transient feedback uses a toast. Variants used by meaning (`info`/`success`/`warning`/`error`/`danger`).

## 8. UX writing (`ux-writing-content-design.md`)

- [ ] **Title Case** for page/section headings, column headers, buttons, tab labels, and modal/message/toast titles. Active, impersonal voice (no "Please"/"We"/"Thanks", no exclamation marks, no all-caps). Consistent terminology across list, details and navigation. Empty-state wording explains why there's nothing and what to do next.

## 9. Accessibility (`accessibility.md`)

- [ ] Icon-only buttons have an accessible name (`aria-label` or `title`). Dynamic error elements use `role="alert"` / `aria-live`. Focus is visible; rows and menus are keyboard reachable. Modals and tab lists have accessible names.

## 10. Navigation (`navigation-side-navigation.md`)

- [ ] The side-navigation entry label, position and active state follow the Juno rules and match the epic.

## 11. Tests

- [ ] Each new component has a test file following the existing UI test patterns (row, container, list, details, sub-resource tables, modals/hooks in full mode).
- [ ] Tests cover the epic's requirements: columns and fields; states (loading, empty, no-matches, error, not found); permission gating; navigation; URL state.
- [ ] Assertions test behaviour, not implementation details; no test asserts a behaviour a Juno rule forbids (e.g. a toast for a persistent error).
- [ ] Review the tests **statically** — read and judge coverage; don't run them (see "No tooling runs" in `SKILL.md`).

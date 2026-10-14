# Juno Decisions — when to use what

Synthesis only. For a component's exact props/variants read `packages/ui-components/src/components/{Name}/`; for a pattern's full rationale read the cited `docs/ux/` file; or dispatch `sap_juno_lookup`. Don't restate detail from memory.

## Component picker by category

Full inventory lives in `packages/ui-components/src/components/` (one folder per component). Pick here, then read the folder for props.

- **Form inputs**: `TextInput` (default) · `Textarea` · `Select` (custom, single/multi) · `NativeSelect` (OS picker, mobile/long) · `ComboBox` (searchable) · `Checkbox`/`CheckboxGroup` · `Radio`/`RadioGroup` · `Switch` (instant on/off) · `SearchInput` · `SecretText` (reveal/copy) · `DateTimePicker` · `Label` · `InputGroup` · `SignInForm`. Scaffold: `Form` → `FormSection` → `FormRow`. Shared validation props on every input: `invalid`+`errortext`, `valid`+`successtext`, `helptext`, `required`, `disabled`, `readOnly` (rendered via `FormHint`).
- **Actions**: `Button` (variants below) · `ButtonRow` · `ToggleButton` · `SortButton` · `ThemeToggle` · `Pagination`.
- **Layout/containers**: `AppShell`(+`AppShellProvider`) · `Container` (`px`/`py`) · `Box` (callout) · `Card` · `Panel`(+`PanelBody`/`PanelFooter`, right drawer) · `Modal`(+`ModalFooter`) · `Grid`(+`GridRow`/`GridColumn`) · `Stack` · `Divider` · `ContentAreaToolbar`. Internal scaffold (`AppBody`, `MainContainer*`, `HeaderContainer`, `ContentContainer`, `ContentHeading`) — normally only touch `AppShell`+`Container`+`ContentHeading`.
- **Navigation**: `PageHeader` · `PageFooter` · `TopNavigation` · `SideNavigation`(+`List`/`Group`/`Item`) · `Breadcrumb` · `Tabs`(+`Tab`/`TabList`/`TabPanel`) · `MainTabs` · `TabNavigation`.
- **Feedback/overlays**: `Message` (static) · `Toast`+`NotificationManager` (transient) · `Tooltip` · `PopupMenu` · `Spinner` · `LoadingIndicator` · `ProgressBar` · `Status` (empty/error/loading block) · `IntroBox` · `Pill` · `Badge`.
- **Data display**: `DataGrid`(+`DataGridRow`/`DataGridCell`/`DataGridHeadCell`/`DataGridFoot`/`DataGridToolbar`) · `DescriptionList`(+`DescriptionTerm`/`DescriptionDefinition`) · `JsonViewer` · `Code` · `CodeBlock` · `FormattedText`.
- **Typography**: `ContentHeading` (page title) · `Label`.
- **Providers/utils**: `AppShellProvider` · `StyleProvider` · `PortalProvider` · `ShadowRoot` · `Icon` (`KnownIcons` union) · `withDeprecationWarning`.

Button variants: `default` neutral · `subdued` quiet/when crowded · `primary` the preferred action (**max once per page**) · `primary-danger` destructive (sparingly). Sizes: default/small/xs.

## Layout composition — source: `docs/ux/the-appshell.md`, `juno-layout.md`, `page-*.md`, `layout-fundamentals.md`

- **Use `AppShell`** to start any app; it hard-wires the frame (AppBody → HeaderContainer → MainContainer → MainContainerInner → sideNavigation + ContentContainer → children; PageFooter) and provides styles, CSS vars, theme context, portals. Skipping it can leave components not rendering.
- Every page = **Page Header + Content Area + Page Footer** (header mandatory, even on error pages; footer = secondary site-wide links only, never nav/actions).
- Content area has **no padding** — wrap body in `Container py`. Standard content order: Breadcrumb → Page Heading (`ContentHeading`) → Toolbar → Main Content.
- `pageHeader` string → `<PageHeader applicationName=...>`. `embedded` drops header/footer (host renders its own); child keeps its own nav.
- Live-data pages: a visible refresh button, label/tooltip exactly **"Refresh Page"**, never in an overflow menu.

## Navigation — source: `docs/ux/navigation-fundamentals.md`, `navigation-side-navigation.md`

- **Side Navigation is the default top-level nav** (fixed left column). Horizontal top-level nav = legacy/deprecated. Single-page apps may omit nav.
- Not for in-page nav/filtering. Escalate simplest-first: flat list → grouped (only if it adds value) → nested children (sparingly; **max 3 levels**).
- Alternative 2nd-level: horizontal tab bar above content, tied to the active top-level item.
- Exactly one active item; icons only at first level; labels short + Title Case; prefer not rendering permanently-inaccessible items over disabling them.

## App flow — source: `docs/ux/page-and-user-flow.md`

Sign In → Home (overview/orientation) → navigate (Side Nav) → List views (`DataGrid`) → Detail views (dedicated deep-linkable page by default; `Panel` only to stay in list context). Always offer breadcrumb + in-page back; never rely on browser back. List page = page toolbar + DataGrid header (two action zones); detail page toolbar = item actions.

## Container choice — source: `docs/ux/ux-patterns.md` + per-pattern files

| Use | When |
|-----|------|
| Inline (list/form in place) | simple, low-stakes, natural to the view |
| Inline Action Box (`Box`) | optional/secondary action on a notice, no focus-lock |
| Modal | focused single task/decision/confirmation; never multi-step/stacked/sign-in/long |
| Wizard | multi-step ordered, step dependencies |
| Panel / detail / card | one entity or persistent side context |
| Dedicated page | large/long tasks, big forms, "BIG" errors, sign-in |

## Error / loading / empty — source: `docs/ux/error-handling-loading-empty-states.md`

- Default component = **`Status`** (app/page/section/DataGrid level).
- Error by class: BIG (500/404/crash) → full error page (keep header+nav); 401 → redirect to Sign In; 403 → error page + informational `Message`; one component fails → scope feedback to it (tight boundary); CRUD action fails → `Message`/`Toast`, keep app responsive, offer retry; validation → inline on the field.
- Empty: never render nothing; distinguish **no-data vs no-matches vs error** (different actions).
- Loading/busy: always show activity; block only what must block; tightest scope (one grid indicator, not per-row); always time out.

## Transient / progress — source: `docs/ux/transient-states-and-progress.md`

Atomic elements (Button/Select/ComboBox) → built-in busy (also disabled). Views/sections → `Spinner`. `Spinner` when progress unquantifiable / two-state transition / tight space / in doubt. `ProgressBar` when batch over entities and % expressible (indefinite variant when total unknown).

## Modals — source: `docs/ux/modals.md`

- One primary action = Enter = rightmost = `primary`. No modal without prior user action. Never stack. Always closable (unless an uncancellable decision — then disable both X and Cancel together; custom footer needs `disableCloseButton` too).
- Destructive tiers: **very-low** none/toast · **low** modal, confirm always on · **mid** checkbox then confirm · **high** type a phrase then confirm. Destructive primary = `primary-danger`; name the item in the body (not a Danger Message); after success show a confirming Toast.
- Title: state the action in Title Case; don't use "Are you sure?"/"Delete"/"Danger!". Form in modal: disable primary while required empty/invalid.

## Messages vs Notifications — source: `docs/ux/messages-and-notifications.md`

- **Message** = static, anchored, persists; placement near related content (form-level top of form, page-level below header). Never auto-dismiss `error`/`warning`.
- **Toast** = transient, floats, auto-dismiss; for background/async results and out-of-focus events; not for persistent errors needing action. Mount `NotificationManager` once at app root; trigger via `toast()`, never `Toast` directly.
- Never combine a toast and an in-page confirmation Message for the same action.

## Popup / overflow menus — source: `docs/ux/popup-and-overflow-menus.md`

Overflow (⋮) when options tie to an item, multiple per item, or a single cluttering/rare/destructive option. Label with the entity (`Edit Item XYZ`). Order by importance (View first, destructive last with a divider), not alphabetical. Destructive = permanent (Delete/Wipe); Remove/Revoke/Disable are not.

## Forms — source: `docs/ux/forms.md`

Group by user mental model; required marked (never colour-only); single-column default. Validation: on blur (default) + on submit (always); as-you-type only for strict formats; never flag untouched fields. Errors inline when field-attributable, else summary at top (not both). Buttons bottom, primary rightmost + cancel left; destructive = `primary-danger`. Submission: busy on submit button + disable; success → navigate / close+toast / inline; failure → inline validation or error Message.

## DataGrid — source: `docs/ux/datagrid.md`

Use for many items with consistent attributes to scan/compare/sort/filter/act; else list/detail/card. Header zones (render only if used): Zone 1 filter tabs + sort + other-actions overflow + primary action; Zone 2 filter inputs + search (placeholder states scope) + filter pills; Zone 3 bulk actions (left, select-all tri-state) + item count (center) + last-update/Refresh (right). Columns: identifying info left (bold), checkbox first, status near left, actions far right (overflow even for single action). States via `Status` in a full-width row. Distinguish empty-no-data vs empty-filtered.

## Box — source: `docs/ux/box.md`

`Box` = lightweight container for annotations/supplementary context, no Message semantics. Not for system feedback (→ `Message`). Inline Action Box = notice + follow-up action without a modal (max two buttons, right-aligned; not for destructive/confirmation; don't nest).

## Writing & accessibility

Non-negotiables are in SKILL.md. Full rules: `docs/ux/ux-writing-content-design.md` (Title Case, tone, button labels, terminology) and `docs/ux/accessibility.md` (semantic HTML, accessible names, keyboard/focus, contrast, aria-live). Versioning/deprecation: `docs/ux/versioning-and-deprecation-policy.md` (WIP/unstable APIs can change in a minor).

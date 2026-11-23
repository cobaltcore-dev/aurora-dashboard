# Guardrails for Aurora Dashboard

This file collects guardrails for AI generation and validation of the Aurora UI. It contains conventions and patterns that are either specific to Aurora, or that apply more broadly but aren't yet reflected in the shared AI guidance Aurora consumes.

## Scope tags

Each rule carries a `[scope: …]` tag marking where its guidance is expected to live long-term. Tags are maintainer metadata for tracking and migration only — **follow every rule regardless of its tag**. Anything not tagged `aurora` is expected to leave this file.

| Tag             | What kind of rule it is                              | Long-term home                                               |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `component`     | Behavior owned by one ui-components component        | That component's own skill in ui-components via Intent       |
| `pattern`       | A distinct, named pattern in our design system       | Pattern skill in ui-components shipped via Intent            |
| `design-system` | Shared, cross-component design-system guidance       | Design-system guidance shipped via Intent from ui-components |
| `team`          | A decision meant to apply across several of our apps | A shared team-level ruleset (destination TBD)                |
| `aurora`        | Specific to this app                                 | Stays here                                                   |

## General Rules

- `[scope: aurora]` Use a ui-components component whenever possible. Never re-invent or re-create existing components from scratch. Use the component's own props to achieve any effect the props support — never reproduce or override that effect with custom CSS, className, inline styles, or HTML-native attributes.
- `[scope: aurora]` When using className to apply custom CSS to juno-ui components, NEVER use `jn:` or `juno-` prefixes. These are reserved and internal to Juno.
- `[scope: aurora]` NEVER use juno-internal classes to hook in additional functionality or tests, as these may be changed internally and without notice.
- `[scope: aurora]` A page must have exactly one **visual** `h1` — the large page title. Additional `<h1>` elements are valid HTML only where the HTML5 spec permits them (scoped to sectioning content: `<section>`, `<article>`, `<aside>`, `<nav>`); such nested `<h1>`s must never be styled to look like a second page title.
- `[scope: aurora]` Within a given heading outline, don't skip levels (`h1` → `h2` → `h3`, not `h1` → `h3`).
- `[scope: aurora]` When a value is unknown, missing, or not applicable, display `- -` (two hyphens, space-separated) — never `null`, an empty string, `—` (em dash), or `N/A`. This applies anywhere structured data is shown: DataGrid cells, `DescriptionList`s, detail views, and the like.

## List Views

- `[scope: aurora]` Use DataGrid exclusively to render list/tabular data on list views. Do not use or add alternating row backgrounds.
- `[scope: aurora]` Render the individual items' IDs in the name column underneath the name in a subdued text style if possible. In the corresponding column header, use `"Name / ID"` in that exact spelling, unless something else is explicitly specified.
- `[scope: aurora]` DataGrid pagination: page size 30; show pagination only when there is more than one page. Choose the `Pagination` variant by API count precision — no count → `default`; rough count → `number`; exact count ≤ 8 pages → `select`; exact count ≥ 9 pages → `input`.

## Detail Views

- `[scope: aurora]` Build key-value detail data as a single `DescriptionList`, never as separate lists or plain tables. Keep term alignment and columns consistent.
- `[scope: aurora]` From 8 rows upward, lay the `DescriptionList` out in two columns with `gap-6`; with an odd number of rows, put the extra row on the left column. (Juno has no column prop, so this is composed app-side.)

## Popup / Overflow Menus

- `[scope: design-system]` Use an overflow (⋮) menu to group actions bound to a specific item — when an item has multiple actions, or an action is secondary, rarely used, or destructive. Prefer it to crowding the UI with inline controls.
- `[scope: design-system]` Order overflow menu items by importance, never alphabetically: the most relevant/most-used actions first, destructive actions last.
- `[scope: aurora]` When a list item has a detail view, its row's overflow menu must contain a "Show Details" (not "View Details"!) entry, and it must be the first item in the menu.
- `[scope: aurora]` In overflow menus, "Delete [Entity]" must always be the last item in its group. For single-entity menus (all actions target one entity type), separate the Delete action from the rest with a divider. For multi-entity menus (multiple groups separated by dividers), no additional divider before Delete is needed — the group divider already provides separation.

## Forms

- `[scope: design-system]` Every form input element **must have a persistent label**. A placeholder should never act as a label.
- `[scope: design-system]` A placeholder should communicate how the expected input of the element should be formed, not what it should be.
- `[scope: design-system]` A form input with placeholder must also have a label.
- `[scope: design-system]` Use helptext only where it supplies meaningful, additional information that neither the label nor a placeholder convey. A helptext should never just mirror or repeat the label or the placeholder.
- `[scope: design-system]` Set a field's label, help text, and error text through the component's own `label` / `helptext` / `errortext` props — never via a manually placed adjacent `<p>`. Using the props also wires up `aria-describedby` automatically.
- `[scope: design-system]` Mark required fields with a visible indicator, not color alone.
- `[scope: design-system]` Keep validation and error wording consistent across forms: the same failure must produce the same message everywhere (e.g. one agreed phrasing for a required-field error), not ad-hoc per-field variations.

## Displaying multiple distinct datasets

- `[scope: pattern]` When a view must show several discrete, distinct sets of data, render a separate DataGrid for each and switch between them with a `TabBar` using `appearance="tabs"`. This applies regardless of the view type (list view, detail view, …) — it is a concern of the data's shape, not of the page it lives on.
- `[scope: pattern]` Do _NOT_ model this as predefined filters inside a single DataGrid. Predefined filters show a subset of _one_ dataset within _one_ DataGrid and are owned by the datagrid skill in ui-components. Distinct datasets are a different thing: each gets its own DataGrid under its own tab.

## Navigation

- `[scope: aurora]` Use Side Navigation as top-level nav (fixed left; max 3 levels; exactly one active item; parent of active child stays expanded; use icons on top level only; labels short Title Case).

## Messages and Notifications

- `[scope: design-system]` `Message` = use for static, anchored, persistent feedback near related content; Use an anchored `Message` for errors requiring user action.
- `[scope: design-system]` `Toast` = use for floating notifications via `NotificationManager` mounted once at app root (`toast()`, never `Toast` directly). Auto-dismiss only low-stakes `info`/`success` feedback; never auto-dismiss `error`/`warning` messages or toasts. Keep progress toasts visible until their operation finishes and dismiss them explicitly. Never combine a toast and an in-page confirmation Message for the same action.
- `[scope: aurora]` Extract all toast messages into a dedicated `<Resource>ToastNotifications.tsx` file; never pass an inline string or JSX to `toast.*`. Each helper returns a `{ message, description }` object; the call site destructures it and spreads the rest as options:

  ```tsx
  const { message, ...options } = getResourceDeletedToast(name)
  toast.success(message, options)
  ```

## UX Writing

- `[scope: design-system]` Page and section titles, DataGrid column headers, button labels, and overflow- and popup item labels must use Title Case.

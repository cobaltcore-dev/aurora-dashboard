# Guardrails for Aurora Dashboard

This file collects guardrails for AI generation and validation of the Aurora UI. It contains conventions and patterns that are either specific to Aurora, or that apply more broadly but aren't yet reflected in the shared AI guidance Aurora consumes.

All guidance in this document must be followed.

We expect this document to change (shrink or grow) over time, as we move more guidance where it belongs in our skills and references, or as we add more rules and directives that are truly specific to Aurora.

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

- `[scope: aurora]` Use a ui-components component whenever possible. Never re-invent or re-create existing components from scratch. Use native props of the component, do not circumvent or overwrite existing props using className or html native attributes, css classes or style tags.
- `[scope: aurora]` When using className to apply custom CSS to juno-ui components, do not use `jn:` or `juno-` prefixes. These are reserved and internal to Juno.
- `[scope: aurora]` Do not use juno-internal classes to hook in additional functionality or tests, as these may be changed internally and without notice.
- `[scope: aurora]` Allow only exactly one `h1` heading element per page.

## List Views

- `[scope: aurora]` Use DataGrid exclusively to render list/tabular data on list views. Do not use or add alternating row backgrounds.
- `[scope: aurora]` Render the individual items' IDs in the name column underneath the name in a subdued text style if possible. In the corresponding column header, use `"Name / ID"` in that exact spelling, unless something else is explicitly specified.
- `[scope: aurora]` When a list item has a detail view, its row's overflow menu must contain a "Show Details" entry, and it must be the first item in the menu.

## Forms

- `[scope: design-system]` Every form input element **should have a persistent label**. A placeholder should never act as a label.
- `[scope: design-system]` A placeholder should communicate how the expected input of the element should be formed, not what it should be.
- `[scope: design-system]` A form input should never have no label but a placeholder.
- `[scope: design-system]` Use helptext only where it supplies meaningful, additional information that neither the label nor a placeholder convey. A helptext should never just mirror or repeat the label or the placeholder.

## Displaying multiple distinct datasets

- `[scope: pattern]` When a view must show several discrete, distinct sets of data, render a separate DataGrid for each and switch between them with a `TabBar` using `appearance="tabs"`. This applies regardless of the view type (list view, detail view, …) — it is a concern of the data's shape, not of the page it lives on.
- `[scope: pattern]` Do _NOT_ model this as predefined filters inside a single DataGrid. Predefined filters show a subset of _one_ dataset within _one_ DataGrid and are owned by the datagrid skill in ui-components. Distinct datasets are a different thing: each gets its own DataGrid under its own tab.

## Navigation

- `[scope: aurora]` Use Side Navigation as top-level nav (fixed left; max 3 levels; exactly one active item; parent of active child stays expanded; use icons on top level only; labels short Title Case).

## Messages and Notifications

- `[scope: design-system]` `Message` = use for static, anchored, persistent feedback near related content; `Toast` = use for floating notifications via `NotificationManager` mounted once at app root (`toast()`, never `Toast` directly). Auto-dismiss only low-stakes `info`/`success` feedback; never auto-dismiss `error`/`warning` messages or toasts. Keep progress toasts visible until their operation finishes and dismiss them explicitly. Use an anchored `Message` for errors requiring user action. Never combine a toast and an in-page confirmation Message for the same action.

## UX Writing

- `[scope: design-system]` Page and section titles, DataGrid column headers, button labels, and overflow- and popup item labels must use Title Case.

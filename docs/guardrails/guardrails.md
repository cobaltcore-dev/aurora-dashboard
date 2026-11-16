# Guardrails for Aurora Dashboard

This file collects guardrails for AI generation and validation of the Aurora UI. It contains conventions and patterns that are either specific to Aurora, or that apply more broadly but aren't yet reflected in the shared AI guidance Aurora consumes.

All guidance in this document must be followed.

We expect this document to change (shrink or grow) over time, as we move more guidance where it belongs in our skills and references, or as we add more rules and directives that are truly specific to Aurora.

## List Views

- Render the individual items' IDs in the name column underneath the name in a subdued text style if possible.
- When a list item has a detail view, its row's overflow menu must contain a "Show Details" entry, and it must be the first item in the menu.

## Displaying multiple distinct datasets

- When a view must show several discrete, distinct sets of data, render a separate DataGrid for each and switch between them with a `TabBar` using `appearance="tabs"`. This applies regardless of the view type (list view, detail view, …) — it is a concern of the data's shape, not of the page it lives on.
- Do _NOT_ model this as predefined filters inside a single DataGrid. Predefined filters show a subset of _one_ dataset within _one_ DataGrid and are owned by the datagrid skill in ui-components. Distinct datasets are a different thing: each gets its own DataGrid under its own tab.

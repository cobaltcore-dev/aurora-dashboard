# Multiple-dataset guardrails

Rules for views that present several discrete, distinct datasets. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **DATASET-1** `[scope: pattern]` When a view must show several discrete, distinct sets of data, render a separate DataGrid for each and switch between them with a `TabBar` using `appearance="tabs"`. This applies regardless of the view type (list view, detail view, …) — it is a concern of the data's shape, not of the page it lives on.
- **DATASET-2** `[scope: pattern]` Do _NOT_ model this as predefined filters inside a single DataGrid. Predefined filters show a subset of _one_ dataset within _one_ DataGrid and are owned by the datagrid skill in ui-components. Distinct datasets are a different thing: each gets its own DataGrid under its own tab.

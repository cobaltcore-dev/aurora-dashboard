# List view guardrails

Rules for list / tabular views. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **LIST-1** `[scope: aurora]` Use DataGrid exclusively to render list/tabular data on list views. Do not use or add alternating row backgrounds.
- **LIST-2** `[scope: aurora]` Render the individual items' IDs in the name column underneath the name in a subdued text style if possible. In the corresponding column header, use `"Name / ID"` in that exact spelling, unless something else is explicitly specified.
- **LIST-3** `[scope: aurora]` DataGrid pagination: page size 30; show pagination only when there is more than one page. Choose the `Pagination` variant by API count precision — no count → `default`; rough count → `number`; exact count ≤ 8 pages → `select`; exact count ≥ 9 pages → `input`.

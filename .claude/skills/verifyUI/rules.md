# UI rules

<!-- Starter set: replace or extend these with your team's actual Juno rules. One rule per line keeps token usage low. -->

- Use Juno components instead of raw HTML for buttons, inputs, selects, modals and tables.
- Use the component that matches the data shape, not just any Juno component. Key/value or term→definition data (detail/overview panels) uses `DescriptionList` + `DescriptionTerm` + `DescriptionDefinition`, NOT a two-column `DataGrid` with a bold label cell. `DataGrid` is only for genuinely tabular, multi-row/multi-column data.
- Empty, loading and error states REPLACE the data component — they are rendered instead of the `DataGrid`/table, not as a row inside it. A `DataGridHeadCell` header row must never sit above an empty/no-matches/loading panel. Check that the `length === 0` / `isLoading` / `isError` branch returns the state component outside the grid, mirroring how the other branches already do it.
- No inline `style` and no hard-coded colors; use Juno theme tokens and classes.
- `DataGridRow` is natively clickable (`onClick`, `isSelected`) and ships its own hover/active styling — when the row carries the `onClick`, do NOT color a cell's text as a link. `text-theme-link` on a `<span>`/`<div>` inside a clickable row is wrong: remove the color and let the row's built-in affordance stand. Link-colored text belongs only on a standalone interactive element (anchor, `Button`, `router` link) that is itself the click target, with a hover affordance — never to fake a link.
- Every icon-only button has an accessible label.
- Forms show loading, error and empty states.
- No user-facing strings hard-coded outside i18n.

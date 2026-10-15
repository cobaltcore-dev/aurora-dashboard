# House Rules — team decisions beyond the Juno source

**NOT the Juno source of truth.** Everything here is a team decision that fills a gap Juno leaves open, or a convention Juno does not specify. Juno-verified rules live in [decisions.md](decisions.md) / [foundations.md](foundations.md) (cached from the repo) and in `docs/ux/`. Never cite a house rule as if it came from Juno.

These rules apply to **every** Juno app — no app-specific scope.

Entries are added via `UI-Rules:` messages. Keep each one short: the rule, the date, the origin.

## Conventions for reading these rules

- **Juno `docs/ux` wins.** If a rule here would contradict Juno `docs/ux`, the docs take precedence and the rule is NOT recorded. (Verify against the docs before adding a rule.)
- **Spacing values are optical totals.** Every spacing figure below is the _visible_ gap between elements. Margins and paddings are not added on top of it.

## Decided rules

### Heading hierarchy

- **Rule:** - in the context of Aurora the titile is always in ContentHeader and all ather h (h2-7) stays without any tailwind classes

headings below it descend strictly `h2` → `h3` → … Headings not marked up as `h1`–`h6` should still be slotted into the hierarchy, judged by their font size.

- **Date:** 2026-10-14 · **Origin:** session
- _Checked:_ consistent with `docs/ux/accessibility.md` ("heading elements in the correct order").

### Empty-value placeholder

- **Rule:** `- -` (two hyphens, space-separated) is the placeholder for an empty value — never `null`, `undefined`, `""`, `—`, or `N/A`.
- **Date:** 2026-10-15 · **Origin:** session — adopted from the `build-datagrid` spec (Invariant #7) and promoted to the app-wide placeholder. **Supersedes** the prior `—` decision (2026-10-14).
- _Checked (Juno-confirmed, not just a house rule):_ `docs/ux/datagrid.md` §"Content and Writing": _"When a cell value is empty or unknown, render `- -` (two hyphens separated by a space) as a placeholder."_ This is Juno canon — cite the doc, not this entry.

### DescriptionList — two columns

- **Rule:** From 10 rows onward, lay out in two columns with `gap-6` between them. With an odd row count, put more rows on the left than on the right.
- **Date:** 2026-10-14 · **Origin:** session
- _Note:_ app-level layout. Juno's `DescriptionList` has no column prop (only `alignTerms`, internally `grid-cols-4`), so the 2-column split is composed above the component.

### Vertical spacing (optical totals)

- **Rule:**
  - `2rem` between two related containers / element groups.
  - `1rem` within such a container / group.
  - `0.5rem` between a section heading (e.g. a `DescriptionList` or form section) and its content.
- **Date:** 2026-10-14 · **Origin:** session

### Horizontal spacing

- **Rule:** Related elements (e.g. filter pills) = `gap-2`; buttons = `gap-6`. These figures describe only the larger spacings, and need not be implemented via the CSS `gap` property specifically — what matters is the optical total.
- **Date:** 2026-10-14 · **Origin:** session

### Long-text truncation

- **Rule:** If a text does not fit and breaks the structure or violates the defined spacing, it is a defect.
- **Date:** 2026-10-14 · **Origin:** session

### Prop defined but solved via CSS

- **Rule:** If a component exposes its own prop for a behavior but that behavior was solved via CSS / classes instead, flag it.
- **Date:** 2026-10-14 · **Origin:** session

### DataGrid header / toolbar

- **Rule:** ComboBox and Filter are always on the left, Search on the right.
- **Rule:** No vertical space between the DataGrid header (toolbar) and the DataGrid.
- **Date:** 2026-10-14 · **Origin:** session
- _Checked (Juno-corroborated):_ "Search on the right" matches the Juno Storybook `Components/DataGrid/DataGridHeader` → `WithSearchOnly`, where a search-only Zone 2 uses `Stack distribution="end"`. Cite that story alongside this rule.
- _Checked:_ "no vertical space" is consistent with `DataGridToolbar` separating via `border-b`, not margin.
- _Not recorded (contradicts docs):_ "positions stay fixed when one element is absent" — `docs/ux/datagrid.md` says remaining space is redistributed and positions shift ("accepted tradeoff"). Dropped per the Juno-docs-win convention.

- **Zebra striping - never do zebra on DataGrid
- **Density** is not defined and should not be checked

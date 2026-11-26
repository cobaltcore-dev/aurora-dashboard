# Detail view guardrails

Rules for detail views. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **DETAIL-1** `[scope: aurora]` Build key-value detail data as a single `DescriptionList`, never as separate lists or plain tables. Keep term alignment and columns consistent.
- **DETAIL-2** `[scope: aurora]` From 8 rows upward, lay the `DescriptionList` out in two columns with `gap-6`; with an odd number of rows, put the extra row on the left column. (Juno has no column prop, so this is composed app-side.)

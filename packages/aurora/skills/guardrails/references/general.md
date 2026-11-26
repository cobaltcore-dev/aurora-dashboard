# General guardrails

Rules that apply across every Aurora page. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **GEN-1** `[scope: aurora]` Use a ui-components component whenever possible. Never re-invent or re-create existing components from scratch. Use the component's own props to achieve any effect the props support — never reproduce or override that effect with custom CSS, className, inline styles, or HTML-native attributes.
- **GEN-2** `[scope: aurora]` When using className to apply custom CSS to juno-ui components, NEVER use `jn:` or `juno-` prefixes. These are reserved and internal to Juno.
- **GEN-3** `[scope: aurora]` NEVER use juno-internal classes to hook in additional functionality or tests, as these may be changed internally and without notice.
- **GEN-4** `[scope: aurora]` A page must have exactly one **visual** `h1` — the large page title. Additional `<h1>` elements are valid HTML only where the HTML5 spec permits them (scoped to sectioning content: `<section>`, `<article>`, `<aside>`, `<nav>`); such nested `<h1>`s must never be styled to look like a second page title.
- **GEN-5** `[scope: aurora]` Within a given heading outline, don't skip levels (`h1` → `h2` → `h3`, not `h1` → `h3`).
- **GEN-6** `[scope: aurora]` When a value is unknown, missing, or not applicable, display `- -` (two hyphens, space-separated) — never `null`, an empty string, `—` (em dash), or `N/A`. This applies anywhere structured data is shown: DataGrid cells, `DescriptionList`s, detail views, and the like.

# Form guardrails

Rules for forms, inputs, and fields. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **FORM-1** `[scope: design-system]` Every form input element **must have a persistent label**. A placeholder should never act as a label.
- **FORM-2** `[scope: design-system]` A placeholder should communicate how the expected input of the element should be formed, not what it should be.
- **FORM-3** `[scope: design-system]` A form input with placeholder must also have a label.
- **FORM-4** `[scope: design-system]` Use helptext only where it supplies meaningful, additional information that neither the label nor a placeholder convey. A helptext should never just mirror or repeat the label or the placeholder.
- **FORM-5** `[scope: design-system]` Set a field's label, help text, and error text through the component's own `label` / `helptext` / `errortext` props — never via a manually placed adjacent `<p>`. Using the props also wires up `aria-describedby` automatically.
- **FORM-6** `[scope: design-system]` Mark required fields with a visible indicator, not color alone.
- **FORM-7** `[scope: design-system]` Keep validation and error wording consistent across forms: the same failure must produce the same message everywhere (e.g. one agreed phrasing for a required-field error), not ad-hoc per-field variations.

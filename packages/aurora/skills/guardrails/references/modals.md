# Modal guardrails

Rules for modals and confirmation dialogs. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **MODAL-1** `[scope: design-system]` Exactly one `primary` (or `primary-danger`) action per modal, always rightmost — it is what Enter triggers; Cancel/Close sits to its left.
- **MODAL-2** `[scope: design-system]` Never open a modal without a prior user action; never stack modals; never use a modal for Sign-in.
- **MODAL-3** `[scope: design-system]` A modal is always closable (X or Cancel), except transient disabled-during-async states. For an uncancellable decision, disable close-X and Cancel together — never leave one enabled to bypass the restriction.
- **MODAL-4** `[scope: design-system]` Destructive confirmation uses `primary-danger`. Severity ladder: very low → no modal; low → button only (always enabled); mid → checkbox first; high → type a matching phrase first.
- **MODAL-5** `[scope: design-system]` A confirmation or destructive modal carries no extra informational `Message` in its body. Operation/validation errors may use `variant="error"`; otherwise a `Message` variant must match the primary button (`info` ↔ `primary`, `danger` ↔ `primary-danger`). Never mix conflicting semantic colors in one modal.
- **MODAL-6** `[scope: design-system]` While loading, render the modal with a `Spinner`, not empty content. In a form modal, keep the primary button disabled while any required field is empty or invalid; re-evaluate on change. Disable Cancel and Close during async operations (custom footers must set `disableCloseButton` explicitly).
- **MODAL-7** `[scope: aurora]` Modal titles state the **action only**, in Title Case — "Edit Description", not "Edit Floating IP 10.237.208.251 Description". Put the affected entity's name/identifier in the body. Don't use vague or alarmist titles ("Are You Sure?", "Danger!").

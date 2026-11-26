---
name: guardrails-validate
description: >-
  Audit existing Aurora UI against the guardrails and report violations. Use when the user says
  "validate this", "review this UI/page/component", "check this against the guardrails", "does
  this follow the rules", or pastes Aurora UI code to be audited. Relies on the guardrails skill's
  rule set for every check and cites rule IDs in every finding.
requires:
  - guardrails
sources:
  - skills/guardrails/references/general.md
  - skills/guardrails/references/list-views.md
  - skills/guardrails/references/detail-views.md
  - skills/guardrails/references/overflow-menus.md
  - skills/guardrails/references/forms.md
  - skills/guardrails/references/datasets.md
  - skills/guardrails/references/navigation.md
  - skills/guardrails/references/states.md
  - skills/guardrails/references/modals.md
  - skills/guardrails/references/notifications.md
  - skills/guardrails/references/ux-writing.md
---

Audit an Aurora UI implementation against the guardrails and report findings. This skill never
defines what is correct — it only checks, locates, and explains.

## Source of truth — do not restate

Every rule lives in the **guardrails** skill (`requires: [guardrails]`), across
`guardrails/references/*.md`, each rule carrying a stable ID (e.g. `FORM-3`, `MODAL-7`). Read
the reference files for every concern the code touches before reporting. A check that is not
backed by a rule ID is not a finding — do not invent rules.

## Procedure

1. **Scope the audit.** Identify which concerns the code touches (a form, a list view, a modal,
   navigation, states, …) and read the matching `guardrails/references/<concern>.md`.
2. **Check each rule.** For every rule in those concerns, decide whether the code conforms,
   violates, or the rule does not apply.
3. **Report one finding per violation**, each citing the rule ID.

## Finding format

One entry per violation:

| field   | content                                              |
| ------- | ---------------------------------------------------- |
| rule    | the ID being violated, e.g. `FORM-3` or `MODAL-7`    |
| where   | file + location (and the element/component involved) |
| problem | what the code does that breaks the rule              |
| fix     | the concrete change that would make it conform       |

Report findings most-severe first. If no rule is violated in the audited scope, say so plainly
rather than padding with non-findings.

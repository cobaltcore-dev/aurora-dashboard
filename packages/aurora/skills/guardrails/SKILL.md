---
name: guardrails
description: >-
  Mandatory Aurora UI guardrails — the canonical, concern-organized rule set for building or
  reviewing any Aurora dashboard UI (general page rules, list and detail views, overflow menus,
  forms, multiple datasets, navigation, loading/empty/error states, modals, notifications, UX
  writing). Owns the rules as references/*.md with stable IDs. Load before creating or changing
  any Aurora UI and follow every applicable rule; to audit existing UI, use guardrails-validate.
sources:
  - references/general.md
  - references/list-views.md
  - references/detail-views.md
  - references/overflow-menus.md
  - references/forms.md
  - references/datasets.md
  - references/navigation.md
  - references/states.md
  - references/modals.md
  - references/notifications.md
  - references/ux-writing.md
---

The canonical rule set for Aurora dashboard UI. This skill **owns** the guardrails; the rules
themselves live in [`references/`](references/), one file per concern, each rule carrying a
stable ID (e.g. `FORM-3`, `MODAL-7`) and a scope tag.

## Mandatory

Follow every applicable rule when building or reviewing any Aurora UI. A rule holds regardless
of its `[scope: …]` tag. When reviewing, cite the rule ID you are applying; to audit existing
code against this set, use the **guardrails-validate** skill.

## Scope tags

Each rule carries a `[scope: …]` tag marking where its guidance is expected to live long-term.
Tags are maintainer metadata for tracking and migration only — follow every rule regardless of
its tag. Tags are under ongoing discussion and may change; the concern each rule sits under is
the stable axis, not its scope.

| Tag             | What kind of rule it is                              | Long-term home                                               |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `component`     | Behavior owned by one ui-components component        | That component's own skill in ui-components via Intent       |
| `pattern`       | A distinct, named pattern in our design system       | Pattern skill in ui-components shipped via Intent            |
| `design-system` | Shared, cross-component design-system guidance       | Design-system guidance shipped via Intent from ui-components |
| `team`          | A decision meant to apply across several of our apps | A shared team-level ruleset (destination TBD)                |
| `aurora`        | Specific to this app                                 | Stays here                                                   |

## Rules by concern

| Concern           | Reference                                         | Covers                                                                                  |
| ----------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| General           | [general.md](references/general.md)               | Component-first, class prefixes, single visual `h1`, heading outline, `- -` empty value |
| List views        | [list-views.md](references/list-views.md)         | DataGrid-only, Name / ID column, pagination                                             |
| Detail views      | [detail-views.md](references/detail-views.md)     | Single `DescriptionList`, two-column layout                                             |
| Overflow menus    | [overflow-menus.md](references/overflow-menus.md) | When to use, ordering, "Show Details" first, "Delete" placement                         |
| Forms             | [forms.md](references/forms.md)                   | Labels, placeholders, helptext, props, required marker, consistent validation           |
| Multiple datasets | [datasets.md](references/datasets.md)             | DataGrid-per-dataset + `TabBar`, not predefined filters                                 |
| Navigation        | [navigation.md](references/navigation.md)         | Side Navigation, `TabBar` for peer content, stable width                                |
| States            | [states.md](references/states.md)                 | Loading / empty / error, error-category handling, error copy                            |
| Modals            | [modals.md](references/modals.md)                 | Primary action, closability, destructive ladder, titles                                 |
| Notifications     | [notifications.md](references/notifications.md)   | `Message` vs `Toast`, toast extraction                                                  |
| UX writing        | [ux-writing.md](references/ux-writing.md)         | Title Case                                                                              |

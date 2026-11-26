# Guardrails for Aurora Dashboard

Guardrails for AI generation and validation of the Aurora UI — conventions and patterns that
are either specific to Aurora, or that apply more broadly but aren't yet reflected in the shared
AI guidance Aurora consumes.

The rules now live as a structured Intent skill so they can be packaged for consumers of the
`@cobaltcore-dev/aurora` package, while staying mandatory locally. This file is the stable local
entry point that points at that skill; it is intentionally thin so the rules have a single home.

## Mandatory

Before building or reviewing any Aurora UI, load the **guardrails** skill and follow every
applicable rule:

```sh
pnpm exec intent load @cobaltcore-dev/aurora#guardrails
```

The skill owns the rules as per-concern reference files (general, list/detail views, overflow
menus, forms, multiple datasets, navigation, states, modals, notifications, UX writing), each
rule carrying a stable ID (e.g. `FORM-3`, `MODAL-7`) and a scope tag. To audit existing UI
against the rules, use the **guardrails-validate** skill:

```sh
pnpm exec intent load @cobaltcore-dev/aurora#guardrails-validate
```

Both skills live in [../../packages/aurora/skills/](../../packages/aurora/skills/).

## Scope tags

Each rule carries a `[scope: …]` tag marking where its guidance is expected to live long-term.
Tags are maintainer metadata for tracking and migration only — **follow every rule regardless of
its tag**. The tags are under ongoing discussion and may change; the concern a rule sits under is
the stable axis, not its scope. As a rule's guidance lands in its long-term home (most often a
ui-components skill), delete it from the guardrails skill.

| Tag             | What kind of rule it is                              | Long-term home                                               |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `component`     | Behavior owned by one ui-components component        | That component's own skill in ui-components via Intent       |
| `pattern`       | A distinct, named pattern in our design system       | Pattern skill in ui-components shipped via Intent            |
| `design-system` | Shared, cross-component design-system guidance       | Design-system guidance shipped via Intent from ui-components |
| `team`          | A decision meant to apply across several of our apps | A shared team-level ruleset (destination TBD)                |
| `aurora`        | Specific to this app                                 | Stays here                                                   |

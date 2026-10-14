---
name: sap_aurora_app
description: "Orchestrates building Aurora apps with the Juno design system. Activate when building a Juno app, page, screen or layout — wires the planning, UI build, and review flow. Delegates all UI/UX decisions to sap_juno_appkit and detail lookups to the sap_juno_lookup agent. NOT for developing Juno components themselves (use sap_ui_components for that)."
---

# SAP Aurora App — App-Build Orchestrator

Flow controller for building Aurora apps with Juno. Does not duplicate UI rules — those live in `sap_juno_appkit`.

## Flow

### 1. Intent & Plan
- Invoke `superpowers:brainstorming` to align on scope
- Invoke `superpowers:writing-plans` to produce a concrete spec before touching code

### 2. Build
- All UI/UX decisions: load `sap_juno_appkit` (component choice, layout, non-negotiables, tokens, recipes)
- Detail questions (exact props / variants / token values / UX rules): dispatch `sap_juno_lookup` agent

### 3. Review
- Check every UI/UX decision against `sap_juno_appkit` non-negotiables and decision tables
- For detail verification: dispatch `sap_juno_lookup` agent

## Boundaries (strict)

| NOT in this flow | Purpose |
|---|---|
| `sap_ui_components` | Building or modifying Juno components |
| `sap_component_builder` | Scaffolding new Juno components |
| `sap_code_review` | Juno component code review |

`sap_juno_lookup` is the only lookup agent for this flow. Do not call other agents for UI/UX questions.

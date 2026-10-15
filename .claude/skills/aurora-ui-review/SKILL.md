---
name: aurora-ui-review
description: Review and verify an Aurora Dashboard UI implementation (routes, list views, details views, modals, navigation and service cards, component tests under packages/aurora/src/client) against the epic description, the Juno UX guidelines (cloudoperators/juno docs/ux) and the juno-ui-components API. Writes a classified findings report to the gitignored tmp/aurora-reviews/ (alongside the verify and verifyUI reports). It only analyzes and never changes code; findings are fixed separately with the aurora-findings-remediation skill. Use this skill whenever the user asks to review, verify, audit, check or validate UI / frontend / page / component changes, compare a UI with an epic, Figma or the Juno guidelines, even if they don't name the skill.
---

# Aurora UI Review

This skill verifies that a UI implementation in `packages/aurora/src/client` does what the epic requires. It also checks that the UI follows the **relevant** Juno UX guidelines and uses `juno-ui-components` correctly. Existing Aurora UIs are scanned only to understand the structure and as a style reference for suggested fixes, never as a rule.

**This skill only analyzes.** It collects, classifies and documents issues in a Markdown report under `tmp/aurora-reviews/` (gitignored; shared with verify and verifyUI), and it **never changes code**. To fix findings, the user runs `aurora-findings-remediation` with the report. The report is written so that skill can work from it alone.

Talk to the user in the language they write in. The report is in English.

## Ground rules

- **Follow the epic strictly.** Its explicit requirements (pages, columns, sections, actions, permission gating, states, constraints) are the primary yardstick. Quote the epic section for every requirement-related finding.
- **No unreasonable assumptions.** If something needed for a judgment is missing or ambiguous, stop and ask. Examples: the epic link can't be opened; the scope is unclear; it's unclear whether the UI is meant to be read-only or full CRUD; a design screenshot contradicts the epic; a requirement can be read two ways. Items you can't decide go into **Open Questions**, not Findings.
- **Only relevant guidelines.** Apply a Juno guideline only if the reviewed UI contains what it governs (`references/juno-guidelines-map.md`). For example: no modal checks for a read-only UI without modals; no wizard or sign-in checks for resource pages.
- **Read the guideline, don't recall it.** Fetch the actual Juno doc section before writing a finding, and cite it (`docs/ux/<file>.md#<section>`).
- **Check the component API against the real source.** Verify props and variants via the `sap_juno_lookup` agent (`locate_juno.sh` records the installed version for the report), not against memory or Storybook for a different version.
- **Authority — Juno only.** The UI/UX authority is, in order:
  1. The epic's explicit requirements (and design decisions the user provides).
  2. The Juno UX guidelines (`docs/ux`) and the `juno-ui-components` API.

  There is **no Aurora UI/UX rule tier** — the repo's own UI conventions are not an authority here. If the epic contradicts a Juno guideline, follow the epic and note the deviation as Info. Existing Aurora UIs (`references/baseline.md`) are scanned only to understand the structure (where routes, components, hooks and tests live; how routes, `staticData`, data and permissions are wired) and as a style reference for suggested fixes — never a source of findings. No finding may rest on "another page does it differently", and nothing passes because "another page does it too".

- **No tooling runs.** Don't run any pnpm scripts or other checks (typecheck, lint, format, tests, i18n, build) during the review, and don't start the dev server. This keeps the review fast, and it never modifies files (e.g. `lingui extract` rewrites catalogs). Review test files by reading them. Tooling is covered by CI and by `aurora-findings-remediation`, which runs the checks after fixing.
- **Stay in scope.** Review only the in-scope changes. Problems in untouched existing UIs go under "Pre-existing / Out of Scope" (Info). They are listed for awareness only.

## Intake

Collect these before analyzing. Ask in one message only for what's missing (see `references/intake.md`):

| Input                                                   | Required             | Notes                                                                                                       |
| ------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Epic description (text, or a link you can read)         | Yes                  | Ask the user to paste it if the link isn't accessible                                                       |
| Scope: resource / pages and the files or diff to review | Yes                  | Default proposal: `git diff --name-only <base>...HEAD -- packages/aurora/src/client`. Confirm the file list |
| UI mode: read-only or full CRUD                         | Derive from the epic | Ask if the epic or the user doesn't say which part is in scope                                              |
| Design (Figma link, screenshots)                        | No                   | Used for layout and content checks if provided; never invented                                              |
| Design decisions made after the epic (reviews, threads) | No                   | Treated as requirements; cite them                                                                          |

## Analysis

Follow `references/checklist.md`. Summary:

1. **Prepare.** Run `scripts/init_findings_dir.sh` and `scripts/locate_juno.sh`. Record the commit SHA and the Juno version.
2. **Requirements.** Extract every explicit UI requirement from the epic into `REQ-NN`. Record each with its epic section and priority, and map it to the files that implement it. Ambiguous items go to Open Questions.
3. **Pick the relevant guidelines.** Use `references/juno-guidelines-map.md` to select the Juno docs that apply to what's in scope, and fetch them.
4. **Structure and reference UIs.** Scan the existing Aurora UIs only to understand the structure, so you know where to look and how the reviewed code is wired, and for fix style (`references/baseline.md`) — not a source of findings.
5. **Review.** Go through the in-scope files with the checklist: requirements, Juno components & custom code, colour & tokens, states, DataGrid structure (against `build-datagrid` decision trees and Invariants when a DataGrid is in scope) & page structure, modals & forms (full mode), messages & variants, UX writing, accessibility, navigation, component API, tests.
6. **Classify** each finding with severity, category, confidence and the rule source (`references/classification.md`).
7. **Write the report** to `tmp/aurora-reviews/ui-review-<resource>-<YYYY-MM-DD>.md`, using `assets/report-template.md`. If that file already exists, append `-2`, `-3`, ...
8. **Stop and present:**
   - the report path;
   - finding counts by severity;
   - the requirements traceability summary;
   - the Open Questions.

   Then tell the user that fixes are applied separately: `/aurora-findings-remediation <report path>`, with a selection (e.g. "Critical + High" or specific IDs). Open Questions can be answered in that run.

## If the user asks for fixes

Don't fix anything within this skill, even if asked in the same conversation. Hand over to `aurora-findings-remediation` with the report path and the user's selection. That skill re-checks each finding against the current code, plans the fixes, and asks before any change that needs a decision.

## Files in this skill

| File                                | Use                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `references/intake.md`              | Intake questions and scope confirmation                                                                   |
| `references/checklist.md`           | Analysis procedure and all checks per category                                                            |
| `references/juno-guidelines-map.md` | Which Juno UX doc applies to what, with source URLs and the key rules to check                            |
| `references/juno-components.md`     | Verifying usage against the installed `juno-ui-components` API                                            |
| `references/baseline.md`            | Existing Aurora UIs to understand the structure, fix-style references, known anti-patterns (no authority) |
| `references/classification.md`      | Severity, category, confidence and status definitions                                                     |
| `assets/report-template.md`         | Findings report structure                                                                                 |
| `build-datagrid/SKILL.md`           | DataGrid structure authority — decision trees (DT-1…DT-9) and 17 Invariants for validating DataGrid usage |
| `scripts/init_findings_dir.sh`      | Creates the shared `tmp/aurora-reviews/` dir (gitignored) and prints its path                             |
| `scripts/locate_juno.sh`            | Finds the installed `juno-ui-components` (path, version, component types)                                 |

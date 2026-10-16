---
name: aurora-bff-review
description: Review and verify an Aurora Dashboard BFF implementation (tRPC routers, Zod types, helpers, tests, docs under packages/aurora/src/server and packages/aurora/docs) against the epic description and the official OpenStack API documentation. Writes a classified findings report to the gitignored tmp/aurora-reviews/ (alongside the verify and verifyUI reports). It only analyzes and never changes code; findings are fixed separately with the aurora-findings-remediation skill. Use this skill whenever the user asks to review, verify, audit, check or validate BFF / backend / server / tRPC changes for an OpenStack resource, compare an implementation with an epic or with the OpenStack API reference, even if they don't name the skill.
---

# Aurora BFF Review

This skill verifies that a BFF implementation in `packages/aurora/src/server` does what the epic requires and calls the OpenStack API correctly. It also checks that the implementation follows the conventions of its own server module.

**This skill only analyzes.** It collects, classifies and documents issues in a Markdown report under `tmp/aurora-reviews/` (gitignored; shared with verify and verifyUI), and it **never changes code**. To fix findings, the user runs `aurora-findings-remediation` with the report. The report is written so that skill can work from it alone.

Talk to the user in the language they write in. The report is in English.

## Ground rules

- **Follow the epic strictly.** Its explicit requirements (procedures, fields, rules, priorities, permissions, constraints) are the primary yardstick. Quote the epic section for every requirement-related finding.
- **No unreasonable assumptions.** If something needed for a judgment is missing or ambiguous, stop and ask. Examples: the epic is only a link you can't open; the scope (which files, which base branch) is unclear; a requirement can be read two ways; the OpenStack docs and the epic disagree. Never resolve ambiguity silently. Items you can't decide go into the report's **Open Questions**, not into Findings.
- **Evidence for everything.** Every finding cites:
  - its location (`file:line`);
  - the rule it is measured against, either an epic section or an OpenStack API ref URL with section, a repo doc, or a reference implementation;
  - the expected behaviour versus the actual behaviour.

  Prefer quoting the docs over paraphrasing from memory. Your knowledge of OpenStack APIs can be outdated, so read the current docs.

- **Precedence when sources disagree:**
  1. The epic's explicit requirements.
  2. The official OpenStack API docs (facts about endpoints, parameters, responses).
  3. Repo docs and guidelines (`packages/aurora/docs`, `.github/copilot-instructions.md`).
  4. The conventions of existing code in the same module.

  If the epic requires something the API can't do, that is an Open Question, not a finding.

- **No tooling runs.** Don't run any pnpm scripts or other checks (typecheck, lint, format, tests, i18n, build) during the review, and don't start the dev server. This keeps the review fast, and it never modifies files (e.g. `lingui extract` rewrites catalogs). Review test files by reading them. Tooling is covered by CI and by `aurora-findings-remediation`, which runs the checks after fixing.
- **Stay in scope.** Review only the in-scope changes. Problems you notice in untouched existing code go under "Pre-existing / Out of Scope" with severity Info. They are listed for awareness only.

## Intake

Collect these before analyzing. Ask in one message only for what's missing (see `references/intake.md`):

| Input                                                | Required                        | Notes                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic description (text, or a link you can read)      | Yes                             | Ask the user to paste it if the link isn't accessible                                                                                          |
| Scope: resource name and the files or diff to review | Yes                             | Default proposal: `git diff --name-only <base>...HEAD -- packages/aurora/src/server packages/aurora/docs`. Confirm the file list with the user |
| Base branch / ref                                    | If scope is derived from a diff | Default `origin/main`, but confirm                                                                                                             |
| OpenStack service and API reference links            | Derive from the epic            | Ask only if the epic doesn't identify the service / API version                                                                                |

## Analysis

Follow `references/checklist.md` in order. Summary:

1. **Prepare.** Run `scripts/init_findings_dir.sh`. Record the commit SHA under review (`git rev-parse HEAD`).
2. **Requirements.** Extract every explicit requirement from the epic into a numbered list (`REQ-01`, ...). Each item carries its epic section and priority (P1/P2/P3 if given). Ambiguous items go straight to Open Questions.
3. **Official docs.** Fetch the OpenStack API reference for every endpoint in scope (`references/openstack-sources.md`). For each endpoint, note the method, path, query parameters, request body, response fields with their types and optionality, extension-dependent fields, sort keys, and documented status codes.
4. **Baseline.** Read the module's existing implementation and the repo-wide helpers (`references/baseline.md`), so you can judge consistency against that module's real conventions.
5. **Review.** Go through the in-scope files with the checklist categories: requirements coverage, API conformance, schemas, error handling, security and scoping, enrichment and performance, conventions, tests, docs.
6. **Classify** each finding with severity, category, confidence and the rule source (`references/classification.md`).
7. **Write the report** to `tmp/aurora-reviews/bff-review-<resource>-<YYYY-MM-DD>.md`, using `assets/report-template.md`. If that file already exists, append `-2`, `-3`, ...
8. **Stop and present:**
   - the report path;
   - finding counts by severity;
   - the requirements traceability summary;
   - the Open Questions, which need answers.

   Then tell the user that fixes are applied separately: `/aurora-findings-remediation <report path>`, with a selection (e.g. "Critical + High" or specific IDs). Open Questions can be answered in that run.

## If the user asks for fixes

Don't fix anything within this skill, even if asked in the same conversation. Hand over to `aurora-findings-remediation` with the report path and the user's selection. That skill re-checks each finding against the current code, plans the fixes, and asks before any change that needs a decision.

## Files in this skill

| File                              | Use                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `references/intake.md`            | Intake questions and scope confirmation                                       |
| `references/checklist.md`         | Analysis procedure and all checks per category                                |
| `references/openstack-sources.md` | Where to find authoritative OpenStack API facts                               |
| `references/baseline.md`          | Repo-wide helpers and per-module conventions, and how to re-derive them       |
| `references/classification.md`    | Severity, category, confidence and status definitions                         |
| `assets/report-template.md`       | Findings report structure                                                     |
| `scripts/init_findings_dir.sh`    | Creates the shared `tmp/aurora-reviews/` dir (gitignored) and prints its path |

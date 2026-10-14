---
name: aurora-bff-review
description: Review and verify an Aurora Dashboard BFF implementation (tRPC routers, Zod types, helpers, tests, docs under packages/aurora/src/server and packages/aurora/docs) against the epic description and the official OpenStack API documentation, then optionally fix the findings. Phase 1 writes a classified findings report to findings/ in the repo root; Phase 2 remediates selected findings on request. Use this skill whenever the user asks to review, verify, audit, check or validate BFF / backend / server / tRPC changes for an OpenStack resource, compare an implementation with an epic or with the OpenStack API reference, or fix findings from such a review, even if they don't name the skill.
---

# Aurora BFF Review

This skill verifies that a BFF implementation in `packages/aurora/src/server` does what the epic requires and calls the OpenStack API correctly. It also checks that the implementation follows the conventions of its own server module.

It runs in two phases:

1. **Analyze.** Collect, classify and document issues in a Markdown report under `findings/` in the repo root. **No code changes.**
2. **Remediate**, only when the user asks. Fix the selected findings, verify, and update the report.

Talk to the user in the language they write in. The report, code and commit messages are in English.

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

- **Stay in scope.** Review only the in-scope changes. Problems you notice in untouched existing code go under "Pre-existing / Out of Scope" with severity Info. They are not fixed in Phase 2 unless the user explicitly asks.

## Phase 0: Intake

Collect these before analyzing. Ask in one message only for what's missing (see `references/intake.md`):

| Input                                                | Required                        | Notes                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic description (text, or a link you can read)      | Yes                             | Ask the user to paste it if the link isn't accessible                                                                                          |
| Scope: resource name and the files or diff to review | Yes                             | Default proposal: `git diff --name-only <base>...HEAD -- packages/aurora/src/server packages/aurora/docs`. Confirm the file list with the user |
| Base branch / ref                                    | If scope is derived from a diff | Default `origin/main`, but confirm                                                                                                             |
| OpenStack service and API reference links            | Derive from the epic            | Ask only if the epic doesn't identify the service / API version                                                                                |
| Mode: report only, or report + remediation           | No                              | Default: report only; ask after Phase 1                                                                                                        |

## Phase 1: Analyze

Follow `references/checklist.md` in order. Summary:

1. **Prepare.** Ensure `tmp/aurora-reviews/` exists. Record the commit SHA under review (`git rev-parse HEAD`).
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

   Then ask whether to remediate, and which findings: all, by severity (e.g. Critical + High), by IDs, or none.

## Phase 2: Remediate (only when asked)

Follow `references/remediation.md`. Summary:

- **Before changing anything:**
  - Resolve the Open Questions that affect the selected findings.
  - If a fix needs a decision (two valid options, or a public API or behaviour change), ask first.
- **How to fix:**
  - Fix in severity order, with minimal changes that follow the module's conventions.
  - Add or adjust tests for every behavioural fix.
  - Update the BFF docs if the behaviour they describe changes.
- **Verify** with `scripts/verify.sh`, using targeted test paths while iterating and the full run at the end.
- **Update the report:**
  - Set each finding's status (Fixed / Won't Fix (reason) / Deferred / Needs Input).
  - Fill in the Remediation Log: what changed, which files, which verification ran.
  - Propose commit messages (Conventional Commits; allowed scopes from `commitlint.config.mjs`, e.g. `fix(network): ...`).
- **Stop and summarize.** Don't commit unless the user asks.

## Files in this skill

| File                              | Use                                                                     |
| --------------------------------- | ----------------------------------------------------------------------- |
| `references/intake.md`            | Intake questions and scope confirmation                                 |
| `references/checklist.md`         | Phase 1 procedure and all checks per category                           |
| `references/openstack-sources.md` | Where to find authoritative OpenStack API facts                         |
| `references/baseline.md`          | Repo-wide helpers and per-module conventions, and how to re-derive them |
| `references/classification.md`    | Severity, category, confidence and status definitions                   |
| `references/remediation.md`       | Phase 2 procedure                                                       |
| `assets/report-template.md`       | Findings report structure                                               |
| `scripts/verify.sh`               | typecheck, lint, format (changed files), tests                          |

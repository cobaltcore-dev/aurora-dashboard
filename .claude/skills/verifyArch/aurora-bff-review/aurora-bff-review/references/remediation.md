# Phase 2: Remediation

Only start when the user asks, with an explicit selection (all, by severity, or by IDs).

## Before changing code

1. Re-read the report and the selected findings.
2. **Resolve the blockers:**
   - Open Questions that affect the selected findings: ask and wait for the answers.
   - Findings whose fix has several valid options, or changes a public contract (procedure name, input or output shape used by the UI, error codes the UI relies on): present the options and wait for the decision.
3. Check the working tree (`git status`). Don't overwrite uncommitted changes outside the findings' files without asking.

## Fixing

- **Order:** Critical → High → Medium → Low. Info findings are not fixed unless the user picks them explicitly.
- **Minimal and conventional.** Change only what the finding requires, the way the module's reference implementation does it. No drive-by refactors. If a fix naturally touches shared code (e.g. extracting a helper both resources need), say so and ask if it's outside the agreed scope.
- **Tests with every behavioural fix.** Add or adjust tests that would have caught the issue. Error-path tests reject with `SignalOpenstackApiError`.
- **Docs.** Update the BFF doc when the behaviour it describes changes.
- **No masking.** Don't weaken schemas or tests just to make a finding go away. If the real fix is out of reach, mark the finding `Deferred` with the reason.

## Verifying

- While iterating: `scripts/verify.sh -- <changed test files>`.
- At the end: `scripts/verify.sh` (typecheck, lint, format on changed files, all tests). Use `--fix` if only formatting fails.

## Updating the report

- Set each selected finding's status. For `Fixed`, add one line saying how, with the files changed.
- Append to the **Remediation Log**: the date, the findings handled, the files changed, the verification commands and their results.
- Add the proposed commits (Conventional Commits, allowed scopes from `commitlint.config.mjs`). Example: `fix(network): map OpenStack errors in ports router`. Group fixes into logical commits; don't make one commit per finding unless they're unrelated.

## Finish

Summarize: the fixed / deferred / won't-fix counts, the verification result, the proposed commits, and the remaining Open Questions. Don't commit or push unless asked.

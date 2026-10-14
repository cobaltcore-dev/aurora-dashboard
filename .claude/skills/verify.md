---
name: verify
description: Verify an Aurora epic against code changes. Use when the user wants an epic, feature or service checked for security, architecture or UI. Routes to security-and-hardening, verifyArch, verifyUI.
argument-hint: <epic> [PR number | branch | commit | path]
---

# verify

The epic is the spec, not the thing being verified. Always check the **code** against the epic, even if the epic is only a plan and nothing is built yet.

Ask only when the epic or service is genuinely unclear: ONE short question about that gap. Never ask what kind of verification to do (status, PR, runtime, branch); the scope rules below decide that. State your choices in the report.

**Local dev credentials**: Domain `Default`, User `admin`, Password `password`

1. **Scope**: If the epic is an issue number, load it with `gh issue view <n> --json title,body`. Then turn the input into a file list once:
   - no scope → current branch: `git diff --name-only main...HEAD`
   - empty diff (e.g. on `main`) → Grep the repo for the epic's feature keywords (e.g. `network`) and use the matching files
   - PR number → `gh pr diff <n> --name-only`
   - branch or commit → `git diff --name-only main...<ref>`
   - path → files under it

   If the epic is missing or can't be matched to a service, ask. Runtime testing is out of scope; don't offer it.

2. **Route**: Pick only the subskills that match the epic or the files.

   | Signal                                                                      | Subskill                 |
   | --------------------------------------------------------------------------- | ------------------------ |
   | auth, tokens, secrets, permissions, user input, API/BFF, deps, CSP          | `security-and-hardening` |
   | new module/route, tRPC router, data flow, Zustand state, package boundaries | `verifyArch`             |
   | `*.tsx` changes, Juno, layout, forms, a11y, i18n                            | `verifyUI`               |

   An explicit user choice wins ("only UI"). If nothing matches, ask which checks to run; run all three only if the user says "full".

3. **Run**: Invoke the selected subskills with the Skill tool, one at a time. Pass each one only the epic goal, the acceptance criteria and the file list. Use Grep before Read, and don't read files outside the list.

4. **Coverage**: Map each phase and requirement of the epic to the code: ✅ done, 🚧 partial, ⏳ not started. Not started is status, not a finding. If no code exists at all, say so in one line and still save the report.

5. **Save**: Write the report to `tmp/aurora-reviews/verify-<feature>-<YYYY-MM-DD>.md` in the repo root. `<feature>` is a short kebab-case name from the epic, for example `networks`. If the file exists, append `-2`, `-3`, and so on. Reply in chat with only the path and the ❌ count.

   ```
   # verify: <feature> – <epic>
   Scope: PR #456 (12 files) · Ran: security, ui · Skipped: arch (no signal)

   ## Findings
   ❌ file:line – problem → fix
   ⚠️ file:line – risk → suggestion

   ## Coverage
   Phase 1 ✅ · Phase 2 🚧 · Phase 3 ⏳ · Phase 4 ⏳
   ✅ <requirement> – file
   🚧 <requirement> – what's missing
   ⏳ <requirement>
   ```

   List at most ~10 findings, highest severity first. If nothing is found, write `✅ No findings`.

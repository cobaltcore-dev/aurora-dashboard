---
name: aurora-verify
description: Static code review of Aurora feature code against an epic, with security, BFF/architecture and UI checks. Use when the user runs /aurora-verify or asks to check an epic's code. Routes to security-and-hardening, verifyArch, verifyUI. Not a runtime or bug-fix check.
argument-hint: <epic number or URL> [sec] [bff] [ui] [PR number | branch | commit | path]
---

# aurora-verify

The epic is the spec, not the thing being verified, and not a bug report. Check the **feature code** against the epic, even if the epic is only a plan and most of it isn't built yet. Don't run the app. Never stop with "nothing to verify": always finish all steps and save the report.

Questions: ask ONE short question when the epic or service is unclear, plus the check selection in step 2. Never ask what kind of verification to do (status, PR, runtime, branch); the scope rules below decide that. State your choices in the report.

**Local dev credentials**: Domain `Default`, User `admin`, Password `password`

1. **Scope**: Load the epic with `gh issue view <n> --json title,body`. If `gh` fails (e.g. not logged in), WebFetch the issue URL instead. Then build the file list once:
   - no scope → all branch work, committed and uncommitted: `git diff --name-only $(git merge-base origin/main HEAD)`
   - PR number → `gh pr diff <n> --name-only`
   - branch or commit → `git diff --name-only origin/main...<ref>`
   - path → files under it

   Then filter the list:
   - Drop `.claude/**`, `tmp/**` and `*.md`. Skills, reports and docs are never the subject.
   - Keep only files related to the epic's feature (keywords in path or content, e.g. `network`).
   - If nothing is left, Grep the repo for the feature keywords and use those files.

   Runtime testing is out of scope; don't offer it.

2. **Route**: If the input names checks (`sec`, `bff`, `ui`), run exactly those. Otherwise preselect the ones that match the epic or files, then ask ONE multi-select question with AskUserQuestion: "Which checks? sec / bff / ui", with the matches marked as recommended. `bff` means `verifyArch`.

   | Signal                                                                      | Subskill                 |
   | --------------------------------------------------------------------------- | ------------------------ |
   | auth, tokens, secrets, permissions, user input, API/BFF, deps, CSP          | `security-and-hardening` |
   | new module/route, tRPC router, data flow, Zustand state, package boundaries | `verifyArch`             |
   | `*.tsx` changes, Juno, layout, forms, a11y, i18n                            | `verifyUI`               |

   `full` in the input runs all three without asking.

3. **Run**: Invoke the selected subskills with the Skill tool, one at a time. Pass each one only the epic goal, the acceptance criteria and the file list. Use Grep before Read, and don't read files outside the list.

4. **Coverage**: Map each phase and requirement of the epic to the code: ✅ done, 🚧 partial, ⏳ not started. Not started is status, not a finding. If no feature code exists at all, say so in one line and still save the report.

5. **Save**: Write the report to `tmp/aurora-reviews/verify-<feature>-<YYYY-MM-DD>.md` in the repo root. `<feature>` is a short kebab-case name from the epic, for example `networks`. If the file exists, append `-2`, `-3`, and so on. Reply in chat with only the path and the ❌ count.

   ```
   # verify: <feature> – <epic>
   Scope: branch hack-valid (14 files) · Ran: security, ui · Skipped: arch (no signal)

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

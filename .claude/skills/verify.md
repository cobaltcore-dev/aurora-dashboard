---
name: verify
description: Runtime verification of a change — build the app, run it, drive it to where the changed code executes, and capture what you see. Use when the user runs /verify or asks to verify a PR/issue/epic, confirm a fix works, test a change manually, or validate local changes. Observation, not static review.
argument-hint: <epic/issue/PR number or URL | branch | commit | path>
---

# verify

**Verification is runtime observation.** Build the app, run it, drive it to where the
changed code executes, and capture what you see. That capture is your evidence. Don't
run tests, don't typecheck, don't import-and-call — those prove CI runs, not that the
change works. Go to the real surface (CLI, socket, pixels) and drive it.

**Always save the report as a markdown file** under `tmp/aurora-reviews/` (see step 6) —
every verify run, no exception. An inline-only reply is not acceptable; the chat reply is
just the path plus the verdict and ❌ count.

**Local dev credentials**: Domain `Default`, User `admin`, Password `password`.

**Artifacts — all under `tmp/aurora-reviews/`.** This is the only `tmp/` path that is
gitignored (`.gitignore` has `tmp/aurora-reviews/`, not `tmp/` itself). Everything this
skill produces goes there and nowhere else:

- Report md → `tmp/aurora-reviews/verify-<feature>-<YYYY-MM-DD>.md`
- Screenshots → `tmp/aurora-reviews/screenshots/<name>.png`

Always pass an **absolute** path to the screenshot tool, e.g.
`<repo>/tmp/aurora-reviews/screenshots/<name>.png`. The Playwright MCP defaults to the
repo root, so a bare filename lands in a tracked path — never do that. If any tool wrote a
screenshot to the repo root, to `tmp/` directly, or to any other path, move it into
`tmp/aurora-reviews/screenshots/` before replying.

## 1. Scope — find the change

Load the spec: `gh issue view <n> --json title,body` (or `gh pr view`/`gh pr diff`); if
`gh` fails, WebFetch the URL. An epic/issue is the spec, not the thing verified — verify
the feature code against it, even if most of the epic isn't built yet. Then establish the
diff:

- no scope → `git diff --stat $(git merge-base origin/main HEAD)` (all branch work, committed + uncommitted)
- PR number → `gh pr diff <n>`
- branch or commit → `git diff origin/main...<ref>`
- path → files under it

State the commit count. The diff is ground truth; any description is a claim about it —
if they disagree, that's a finding. No runtime surface at all (docs-only, types-only,
tests-only) → **SKIP**, one line, still save the report.

## 2. Get a handle

Check `.claude/skills/` for a `verifier-*`/`run-*` helper first. For BFF/backend/server/tRPC
changes under `packages/aurora/src/server`, use the `aurora-bff-review` skill from
`.claude/skills/verifyArch/` instead of this generic verify protocol — it validates against
the epic and OpenStack API docs. Otherwise cold-start from README/package.json. For this repo
the app is the dashboard: `pnpm dev` (serves on `:4001` against the configured
`IDENTITY_ENDPOINT`). Confirm the backend is reachable before driving. Timebox cold start
~15 min; stuck → **BLOCKED** with exactly where it stopped.

## 3. Surface — where a user meets the change

| Change reaches              | Surface          | You                                    |
| --------------------------- | ---------------- | -------------------------------------- |
| CLI / TUI                   | terminal         | type the command, capture the pane     |
| Server / API / tRPC         | socket           | send the request, capture the response |
| GUI (`*.tsx`, routes, Juno) | pixels           | drive via Playwright MCP, screenshot   |
| Library                     | package boundary | call through the public export         |

Internal function is not a surface — follow it to the CLI/request/render that reaches it
and drive that. Tests in the diff are the author's evidence, not a surface.

**GUI surface → also check it against Juno.** When the change reaches pixels (`*.tsx`,
routes, Juno components), "it works" is not enough — the running screen must obey the Juno
design system. After you've captured the screen (step 4), hand the screenshots and the code
scope to the **`verifyUI`** skill: it runs the 12-point UX checklist and the source
Juno-usage check against `sap_juno_appkit` + the real Juno source, and writes its own report
to `tmp/aurora-reviews/`. Fold its ❌/⚠️ into your findings (cite the Juno rule). A visible
UX-rule violation is a ❌. (CLI/server/library surfaces skip this.)

## 4. Drive it

Smallest path that makes the changed code execute, end-to-end through the real interface.
If users click buttons, click buttons — don't curl the API underneath. For GUI work: log
in with the dev credentials above, navigate to the changed screen, capture a screenshot to
`tmp/aurora-reviews/screenshots/`.

**Destructive path** (deletes, publishes, sends, writes outside the workspace) with no
dry-run/safe target → don't drive it live; verify around it and say which path you skipped.

## 5. Push on it

Confirming the happy path is step one, not the job. Probe _around_ the change at the same
surface: new flag → empty/dupe/conflicting value; new route → wrong method, malformed body;
changed error path → trigger the error and the adjacent ones; state → do it twice. At least
one probe (🔍). A step list that's all ✅ is a happy-path replay.

For GUI surfaces, one probe is the **Juno pass**: run `verifyUI` on the captured screen (step 3) and record its verdict as a 🔍 — even when it holds. Each UX-rule violation it finds is a ❌
cited to its Juno rule.

Capture everything — response bodies, screenshots, pane dumps. Unexpected output is a
finding, not noise. Isolate shared state (ports, tmux) so you don't collide with the host.

## 6. Save

Write the report to `tmp/aurora-reviews/verify-<feature>-<YYYY-MM-DD>.md`. `<feature>` is a
short kebab-case name from the spec (e.g. `networks`). If the file exists, append `-2`,
`-3`, etc. Reply in chat with only the path, the verdict and the ❌ count.

```
# verify: <feature> – <epic/PR> (runtime)
Scope: branch <name> (<n> commits) · Backend: <endpoint>
Screenshots: tmp/aurora-reviews/screenshots/<...>.png

**Verdict:** PASS | FAIL | BLOCKED | SKIP

## Claim
<your read of the diff and/or stated claim; note any mismatch>

## Steps
1. ✅/❌/⚠️/🔍 <what you did to the running app> → <what you observed + evidence>

## Findings
❌ file:line – problem → fix
⚠️ file:line – risk → suggestion
🔍 <probe> → <result, even when it held>
   (GUI: run verifyUI; cite each Juno-rule violation, e.g. ux-writing-content-design – not Title Case)

## Coverage   (only when verifying against a multi-phase epic)
Phase 1 ✅ · Phase 2 🚧 · Phase 3 ⏳
```

**Verdicts:** PASS — ran it, change works at its surface. FAIL — ran it, doesn't, or breaks
something else, or claim/diff disagree. BLOCKED — couldn't reach an observable state (say
where). SKIP — no runtime surface. No partial pass; "3 of 4" is FAIL until explained. When
in doubt, FAIL. List at most ~10 findings, worst first; if nothing, write `✅ No findings`.

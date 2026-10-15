---
name: verify
description: Runtime verification of a change — build the app, run it, drive it to where the changed code executes, and capture what you see. Use when the user runs /verify or asks to verify a PR/issue/epic, confirm a fix works, test a change manually, or validate local changes. Observation, not static review.
argument-hint: <epic/issue/PR number or URL | branch | commit | path>
---

# verify

**verify is the center.** It establishes a running app, then orchestrates the review
subagents around it — `verifyUI` (UI screenshot + Juno source), `aurora-bff-review`
(BFF/server), and `code-review` (diff bugs/cleanups). verify owns the login, the report,
and the verdict; the subagents produce findings it folds in. It does not guess what to
run or whether the app is up — it **asks** (steps 1.5 and 2).

**Verification is runtime observation.** Build the app, run it, drive it to where the
changed code executes, and capture what you see. That capture is your evidence. Don't
run tests, don't typecheck, don't import-and-call — those prove CI runs, not that the
change works. Go to the real surface (CLI, socket, pixels) and drive it.

**Always save the report as a markdown file** under `tmp/aurora-reviews/` (see step 6) —
every verify run, no exception. An inline-only reply is not acceptable; the chat reply is
just the path plus the verdict and ❌ count.

**Login — never auto-fill credentials.** The backend may differ from run to run,
and real credentials are the user's to enter. When a GUI run hits a login form, open
the browser to it, leave every field blank, and **pause** — tell the user the login
screen is up and ask them to type their domain / user / password and sign in. Only
after they confirm they're authenticated do you navigate to the changed screen. Do not
hardcode or guess a domain/user/password, and do not read them from `.env` to fill the
form on the user's behalf.

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

## 1.5 Ask — context & plan

Before touching the app, pause once and ask the user two things (one message):

1. **More context?** Offer to pull the spec — user stories, epic, issue, acceptance
   criteria. If the user names or pastes one, read it (`gh issue view <n>` /
   `gh pr view <n>` / WebFetch the link) and fold it into the Claim. If they say the diff
   is enough, skip it.
2. **Which reviews?** Propose a default from the diff surfaces (`*.tsx`/routes → UI,
   `packages/aurora/src/server` → BFF, any diff → code-review) and let the user pick which
   subagent reviews to run — any combination of:
   - **`verifyUI`** — UI screenshot + 12-point visual UX check against the Juno design
     system (GUI surfaces, pixels).
   - **`aurora-ui-review`** — static review of the `*.tsx`/component source against the
     epic + Juno guidelines; writes a classified report to `tmp/aurora-reviews/`.
   - **`aurora-bff-review`** — BFF/server/tRPC vs the epic + OpenStack API docs.
   - **`code-review`** — diff bugs and cleanups.

Run exactly what the user selects in steps 3–5; don't add reviews they didn't ask for.

## 2. Get a handle — ask running? then URL

**Don't assume you must cold-start, and don't guess from turbo/ports.** Ask the user:

1. **Is the app already running?**
2. **If yes →** ask the user to paste the URL. Use that as the surface. Do not start
   `pnpm dev`, do not probe ports to guess the URL.
3. **If no →** start `pnpm dev` yourself (serves on `:4001` against the configured
   `IDENTITY_ENDPOINT`), open the browser to the login screen, and **pause** — tell the
   user the login screen is up and ask them to sign in (see the never-auto-fill login rule
   above). Only after they confirm they're authenticated do you navigate to the changed
   screen.

For BFF/backend/server/tRPC changes under `packages/aurora/src/server`, use the
`aurora-bff-review` skill instead of this generic verify protocol — it validates against
the epic and OpenStack API docs. Confirm the backend is reachable before driving. Timebox
cold start ~15 min; stuck → **BLOCKED** with exactly where it stopped.

## 3. Surface — where a user meets the change

| Change reaches              | Surface          | You                                    |
| --------------------------- | ---------------- | -------------------------------------- |
| CLI / TUI                   | terminal         | type the command, capture the pane     |
| Server / API / tRPC         | socket           | send the request, capture the response |
| GUI (`*.tsx`, routes, Juno) | pixels           | drive via Playwright MCP, screenshot   |
| Library                     | package boundary | call through the public export         |

Internal function is not a surface — follow it to the CLI/request/render that reaches it
and drive that. Tests in the diff are the author's evidence, not a surface.

**GUI surface → run the reviews the user chose (step 1.5).** When the change reaches
pixels (`*.tsx`, routes, Juno components), "it works" is not enough — the running screen
must obey the Juno design system. After you've captured the screen (step 4), spin up the
selected review subagents, each writing its own report to `tmp/aurora-reviews/`:

- **`verifyUI`** — hand it the screenshots and the code scope; it runs the 12-point UX
  checklist and the source Juno-usage check against `sap_juno_appkit` + the real Juno
  source.
- **`aurora-ui-review`** — static `*.tsx`/component review vs the epic + Juno guidelines,
  if selected (writes to `tmp/aurora-reviews/`).
- **`code-review`** — the diff bugs/cleanups pass, if selected.

Fold every ❌/⚠️ back into your findings, cited to the subagent and the rule (e.g. the Juno
rule). A visible UX-rule violation is a ❌. (CLI/server/library surfaces skip the UI
reviews; BFF/server changes go through `aurora-bff-review` instead — step 2.)

## 4. Drive it

Smallest path that makes the changed code execute, end-to-end through the real interface.
If users click buttons, click buttons — don't curl the API underneath. For GUI work: open
the browser to the login screen and let the **user** enter their own credentials (see the
login rule above — never auto-fill), then navigate to the changed screen and capture a
screenshot to `tmp/aurora-reviews/screenshots/`.

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

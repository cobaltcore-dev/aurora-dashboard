---
name: aurora-service-verify
description: "Prove an Aurora service fulfills its acceptance criteria with evidence, instead of eyeballing it. Given a service (name or route) and its acceptance criteria (pasted, or a GitHub issue URL), produces a pass/fail evidence table by combining three sources: a static read against aurora-service-reference, a live runtime check via Playwright MCP, and the colocated vitest suite — plus a blast-radius map of what else the change touches. Use when closing a service epic/issue (e.g. #1019), before marking a service done, or to re-check after changes."
version: 1.0.0
---

# Aurora Service Verify — prove it, don't eyeball it

Turn "looks done" into "proven done." A service screen can render perfectly and still be a
scaffold — row clicks that `console.log`, a Create button that does nothing, `canCreate = true`
instead of a permission check. A green server test suite hides none of that. This skill judges
each acceptance criterion against **real evidence** and writes a verdict you can attach to an
issue.

Two borrowed habits drive it:

- **Prove-it-works** — every ✅ needs concrete evidence (a `file:line`, a screenshot, a test
  name). No evidence → not ✅.
- **Blast-radius** — before declaring done, name what else the change touches, so a green target
  screen doesn't hide a regression next door.

---

## When to use

- Closing a service epic/issue (the first consumer is Networks / issue #1019).
- Before marking any Aurora service "done".
- Re-checking a service after changes.

Not for pure dashboards/landing pages — this verifies **services** (list + detail + CRUD). For a
visual-only pass, use `screenshot-review` / `auto-screenshot-review`.

---

## Inputs

Collect from the user (ask only for what's missing):

- **Service** — a name/nav label (e.g. "Networks") or a route
  (`/projects/$projectId/network/networks`). If only a label is given, resolve the route from the
  nav config (`packages/aurora/.../buildNavSections.ts`) rather than guessing.
- **Acceptance criteria** — pasted text, OR a GitHub issue URL to fetch (e.g. #1019). Each
  criterion becomes one row in the verdict table. If criteria are vague, split them into
  checkable statements and say you did.
- **Base URL / projectId** — optional; defaults as in `auto-screenshot-review` (local dev
  `http://localhost:4001`, pick a real `projectId` from `/projects`).

---

## Evidence sources

Every criterion is judged by **at least one** source. UI-behavior criteria need the runtime
source — see Honesty rules.

### 1. Static — read the code against the reference

Load the `aurora-service-reference` skill (via the Skill tool) and walk its Checklist against the
service's files. This catches stubs the running UI hides. Grep the service dir for red flags and
record every hit as evidence (`file:line`):

- `console\.log` — dead handlers (row click / create that only logs).
- `TODO` / `FIXME` / `Placeholder` — unfinished wiring.
- `canCreate = true`, `can\w+ = true` — hardcoded permissions instead of a `canUser` query.
- Missing: detail route in `routeTree.gen.ts`, mutation modals, `*ToastNotifications`, a
  `beforeLoad` service-availability guard.

Also confirm the positives: `projectScopedProcedure` + error wrapping on the server, zod
schema/types, loading/empty/error `Status` states, i18n on every string.

### 2. Runtime — drive the live app (behavior, not internals)

Reuse `auto-screenshot-review`'s prerequisites and auth verbatim:

- Confirm a server is listening (`lsof -iTCP:4001 -sTCP:LISTEN` / `:3000`). If none, runtime
  checks are **blocked** — see Honesty rules.
- One browser session: set viewport, load `apps/dashboard/e2e/playwright-results/storageState.json`;
  if stale (lands on "Sign In to Your Account"), fall back to `Default` / `admin` / `password`.

Then **observe behavior** for each interactive criterion — not source, actual effect:

- Row click → does the URL change to the detail route? (not just a styled link)
- Create / Edit / Delete button → does a modal open? does submit mutate + toast + refresh?
- Permission-gated action → is it hidden/disabled for a user who lacks the policy? (if a
  low-privilege account is available; otherwise mark ⚠️ with the reason)
- Empty / error states → force them if feasible (empty search term, bad id) and confirm the
  `Status` surface.

Capture a screenshot per runtime check as evidence (`screenshots/verify-<service>-<check>-<date>.png`).

### 3. Tests — run the colocated suite

Run the service's vitest files, filtered to its dirs:

```
pnpm --filter @cobaltcore-dev/aurora exec vitest run <client-service-dir> <server-router-glob>
```

e.g. for Networks: the client `.../network/networks/` tree and the server
`packages/aurora/src/server/Network/routers/` suite (glob `networks*` — note that as of writing
there is **no** `networksRouter.test.ts` and no client test for the networks screen, which is
itself a ❌/⚠️ against a "comprehensive test coverage" criterion). Record pass/fail counts and
name the specific tests that back a criterion. Note any criterion with **no** test as a coverage
gap (⚠️), since "comprehensive test coverage" is itself usually an acceptance criterion.

---

## Output

Write `verify-[service]-[YYYY-MM-DD].md` to the current working directory.

### Verdict table

One row per acceptance criterion:

| #   | Criterion | Source(s)                | Evidence                                    | Verdict      |
| --- | --------- | ------------------------ | ------------------------------------------- | ------------ |
| 1   | …         | static / runtime / tests | `file:line`, `screenshots/…png`, `testName` | ✅ / ⚠️ / ❌ |

- **✅ Proven** — concrete evidence shows it works.
- **⚠️ Unverified / partial** — couldn't be proven (blocked, no low-priv account, no test) — state
  why.
- **❌ Not met** — evidence shows it's missing or broken.

### Blast-radius

Before the roll-up, a short section naming what the service's changes touch, each marked
checked / not-checked:

- **Route tree** — new/edited entries in `routeTree.gen.ts` (and whether the detail route is even
  registered).
- **Shared client components** the service imports (`ContentHeader`, `DataGridToolbar`,
  `Status`, …) — a change here affects other screens.
- **Permission keys / policy rules** added (server permission router) — do siblings rely on the
  same keys?
- **Server registration** — `routers/index.ts` spread.
- **Sibling routes** under the same section (e.g. other `network/*` screens) that share the
  guard/components — flag them for re-verification.

Keep it read-only and grep-driven: name the edges a reviewer must look at; don't try to test the
whole app.

### Roll-up

End with one line: `N/M criteria proven; K blocked/unverified; B blast-radius edges flagged.`

---

## Honesty rules

1. **❌/⚠️ is the default.** A criterion is not ✅ until evidence promotes it. Never mark ✅ from
   intuition or from the code "looking right".
2. **Green tests ≠ working UI.** A passing server suite does **not** pass a UI-behavior criterion;
   the runtime check must also pass. (This is the exact Networks trap: server tests green, row
   click dead.)
3. **Never fabricate a pass.** If the app can't be driven (no server, or auth won't recover), mark
   runtime criteria **⚠️ unverified** with the blocker. Static + tests may still proceed.
4. **Evidence is mandatory and concrete** — a `file:line`, a screenshot path, or a test name. "It
   works" is not evidence.
5. State every assumption and every criterion you had to split or interpret.

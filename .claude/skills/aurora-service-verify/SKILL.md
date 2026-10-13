---
name: aurora-service-verify
description: "Prove an Aurora service fulfills its acceptance criteria with evidence, instead of eyeballing it. Given a service (name or route) and its acceptance criteria (pasted, or a GitHub issue URL), produces a pass/fail evidence table by combining three sources: a static read against aurora-service-reference, a live runtime check via Playwright MCP, and a security-hardening pass via security-and-hardening — plus a blast-radius map of what else the change touches. Use when closing a service epic/issue (e.g. #1019), before marking a service done, or to re-check after changes."
version: 1.0.0
---

# Aurora Service Verify — prove it, don't eyeball it

Turn "looks done" into "proven done." A service screen can render perfectly and still be a
scaffold — row clicks that `console.log`, a Create button that does nothing, `canCreate = true`
instead of a permission check (which is also a security hole, not just a UX gap). Reading the
code "looking right" hides none of that. This skill judges each acceptance criterion against
**real evidence** and writes a verdict you can attach to an issue.

Two borrowed habits drive it:

- **Prove-it-works** — every ✅ needs concrete evidence (a `file:line`, a screenshot, a named
  trust boundary). No evidence → not ✅.
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

Capture a screenshot per runtime check as evidence
(`tmp/aurora-reviews/verify-<service>-<check>-<date>.png`).

### 3. Security — harden the service's boundaries

Load the `security-and-hardening` skill (via the Skill tool) and run its threat-model + three-tier
checks against **this service's** trust boundaries. A service that lists, creates, and deletes
cloud resources is attack surface, so this source carries weight for any epic that touches input,
authz, or external APIs (most do — see #1019's permission and error-handling criteria).

Walk STRIDE over the service's boundaries and record each as evidence (`file:line`):

- **Input validation (Tampering / A03)** — every tRPC procedure validates input with a zod schema
  at the boundary; ids are encoded/validated before building external paths. Flag any procedure
  taking raw `input` without a schema.
- **Authorization (Elevation / A01)** — actions are gated by a real `canUser`/policy check, not a
  client-side `canCreate = true`. A hardcoded or missing permission check is a **security** finding
  here, not just a UX gap. Confirm `projectScopedProcedure` scopes every call to the caller's
  project (no cross-tenant read/write).
- **Information disclosure (A05/A09)** — errors return user-friendly messages, not raw upstream
  (Neutron/OpenStack) bodies or stack traces; no secrets/tokens logged (`console.log` of a
  response, request, or `ctx` is a finding).
- **DoS (input size / rate)** — list/search inputs are bounded; note unbounded fan-out
  (e.g. per-row N+1 external calls) as a risk.
- **Spoofing / Repudiation** — security-relevant mutations (create/delete) are attributable
  (project-scoped, logged where appropriate).

Also run the "Always Do" tier that applies to a BFF service: parameterized/encoded external calls,
no secret leakage, authz mandatory. If the service adds a dependency, run the package-manager audit
per the skill. Mark each security criterion ✅ only with a concrete boundary + `file:line`;
unprovable → ⚠️ with the reason.

---

## Output

Write `verify-[service]-[YYYY-MM-DD].md` to `tmp/aurora-reviews/` (a gitignored scratch dir —
create it if absent). These reports are disposable artifacts; never write them to the repo root
or commit them.

### Verdict table

One row per acceptance criterion:

| #   | Criterion | Source(s)                   | Evidence                                  | Verdict      |
| --- | --------- | --------------------------- | ----------------------------------------- | ------------ |
| 1   | …         | static / runtime / security | `file:line`, `screenshots/…png`, boundary | ✅ / ⚠️ / ❌ |

- **✅ Proven** — concrete evidence shows it works.
- **⚠️ Unverified / partial** — couldn't be proven (blocked, no low-priv account, boundary not
  reachable) — state why.
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
2. **Code reading ≠ working UI.** The server source "looking right" does **not** pass a
   UI-behavior criterion; the runtime check must also pass. (This is the exact Networks trap:
   server CRUD present, row click dead.)
3. **Never fabricate a pass.** If the app can't be driven (no server, or auth won't recover), mark
   runtime criteria **⚠️ unverified** with the blocker. Static + security may still proceed.
4. **Evidence is mandatory and concrete** — a `file:line`, a screenshot path, or a named trust
   boundary. "It works" / "it's secure" is not evidence.
5. State every assumption and every criterion you had to split or interpret.

---
name: auto-screenshot-review
description: "This skill should be used when the user asks to 'screenshot and review a screen', 'auto-capture and review Aurora UI', 'review the networks page in the running app', 'take screenshots of X and review them', or any request to BOTH capture screenshots of a running Aurora/Juno app AND produce a review — without the user manually pasting images. Drives the Playwright MCP browser to log in, navigate, and screenshot each screen, then chains into the screenshot-review skill. Use the plain screenshot-review skill instead when the user already has screenshots."
version: 1.0.0
---

Capture screenshots of a running Aurora/Juno app with the Playwright MCP browser, then review them automatically.

This skill is the automated front end to `screenshot-review`: it removes the manual
"take a screenshot and paste it" step. It captures, then hands the images to the review skill.

---

## Prerequisites — verify before anything else

### 1. Playwright MCP server must be connected

The capture step uses `mcp__playwright__browser_*` tools. If those tools are not available in
this session, STOP and tell the user to run this one-time setup, then restart Claude Code:

```
claude mcp add playwright npx @playwright/mcp@latest
```

Do not attempt to shell out to `npx playwright` as a substitute — this skill is built around the
MCP browser tools, which keep one browser/session alive across navigation and screenshots.

### 2. A running Aurora app

Screenshots are taken against a live server. Confirm the base URL with the user. The local dev
server commonly runs on `http://localhost:4001` — check what is actually listening
(`lsof -iTCP:4001 -sTCP:LISTEN` / `:3000`) before assuming. The Playwright `baseURL` in
`apps/dashboard/playwright.config.ts` is `http://localhost:3000`.

If nothing is running, tell the user to start it first (in `apps/dashboard`):

- Dev: `pnpm dev`
- Prod preview: `pnpm preview`

Do not start the server yourself unless the user asks — it is a long-running foreground process.

### 3. Authentication — reuse Aurora's stored session

Aurora's Playwright setup logs in once and saves the session to
`apps/dashboard/e2e/playwright-results/storageState.json`.

Reuse it so you land authenticated instead of on the login screen:

1. Read the file with the Read tool. If it is missing, go straight to the credential fallback below.
2. Load it into the MCP browser with `mcp__playwright__browser_set_storage_state`
   (or `browser_cookie_set` + `browser_localstorage_set` from its contents) BEFORE the first navigation.
   Note the cookie `domain` is `localhost` (host-only), so add cookies without a port.
3. After the first navigation, confirm you are not on the login/SSO page. If you are, the stored
   state is stale — fall back to logging in with credentials.

#### Credential fallback — local dev sign-in form

When the stored state is missing or stale and the app shows the **"Sign In to Your Account"** form,
log in directly. The form fields have ids `#domain`, `#user`, `#password` (labels "Domain", "User",
"Password"), with a "Sign In" button.

Known-good local dev credentials (verified against `localhost:4001`):

- **Domain:** `Default`
- **User:** `admin`
- **Password:** `password`

Fill all three with `browser_fill_form`, click **Sign In**, then wait and confirm the URL left the
login page (e.g. redirected to `/projects`). Casing matters — the backend rejected `default`/`god`
and `Default`/`god`; only `Default` / `admin` / `password` worked.

If these fail, the credentials are environment-specific — the e2e setup reads them from
`apps/dashboard/e2e/.env` as `TEST_DOMAIN` / `TEST_MEMBER_USER` / `TEST_MEMBER_PASSWORD`. Read that
file if present, otherwise ask the user for the exact values. Do not brute-force guess beyond the
known-good set above.

---

## Inputs

Collect from the user (ask only for what is missing):

- **Which screen(s)** — a route, a nav label, or a description. Accept several in one run.
- **Base URL** — if not the default.
- **Viewport** — default `1280×800`. Honor explicit requests (e.g. mobile `390×844`).
- **Any notes / change requests** — passed through verbatim to the review, same as chat notes
  in `screenshot-review`.

If the user names a screen but not its route, resolve the route from the repo nav config
(`apps/dashboard` / `packages/aurora/.../buildNavSections.ts`) rather than guessing. For example
"Networks" → `/projects/$projectId/network/networks`. Ask for the concrete `projectId` if a route
needs one and the user has not given it.

---

## Capture flow

For the whole run, do this once:

1. (If not already) set viewport with `mcp__playwright__browser_resize`.
2. Load storage state (see Prerequisite 3).

Then for EACH requested screen, in order:

1. `mcp__playwright__browser_navigate` to the full URL.
2. Wait for the screen to settle — `mcp__playwright__browser_wait_for` on a stable element
   (heading, DataGrid, table) or a short network-idle wait. Do not screenshot a spinner.
3. If the screen loaded an error or empty state, note it — a screenshot of an error IS a valid
   finding, but say so explicitly in the review.
4. `mcp__playwright__browser_take_screenshot` with:
   - `fullPage: true` (capture the whole scrollable screen, not just the viewport)
   - a descriptive `filename` → `shot-[screen-name]-[YYYY-MM-DD].png`
   - save into a `screenshots/` folder in the current working directory
5. Record the URL and visible breadcrumb for the review's **Location** line.

If a screen requires interaction to reveal the target (open a modal, expand a row), use
`browser_click` / `browser_hover` / `browser_fill_form` to reach the state, then screenshot.
Keep interactions minimal and describe each one you took.

Announce each capture as you go: `Captured: <screen> → screenshots/<file>`.

---

## Review flow — chain into screenshot-review

Once all screenshots are captured:

1. Invoke the `screenshot-review` skill (via the Skill tool). Treat the captured PNGs as its input
   screenshots and the user's notes as its chat notes.
2. Follow `screenshot-review` exactly — including its mandatory `juno-live-ref` core protocols,
   the numbered-findings format, Juno component identification, tag sections, and `⚠️ Needs:` flags.
3. **If the captured screen is an Aurora service/resource screen** (a list/detail/CRUD surface —
   Flavors, Images, Networks, Keypairs, etc.), ALSO load the `aurora-service-reference` skill (via
   the Skill tool) and check the screen against its Checklist. Report deviations as additional
   numbered findings in the SAME `screenshot-review` format, under the existing `Aurora` tag —
   e.g. a missing empty/error/loading `Status` state, an ungated create/edit/delete action, a
   mutation with no success toast, or a hardcoded (non-lingui) string. This step is **additive**:
   it never replaces or reformats the visual review. Skip it for non-service screens (dashboards,
   landing pages, settings panels) — see Rule 8.
4. The review's **Location** line should use the real URL/breadcrumb you recorded during capture,
   not a guess.
5. Let `screenshot-review` write the `review-[screen-name]-[YYYY-MM-DD].md` report. Do not
   duplicate its output format here.

---

## Output summary

After the review file is written, give the user a short summary:

- The list of screenshots captured (paths).
- The review report path.
- Any screens that failed to load / landed on an error or login page.

---

## Rules

1. Prerequisites are blocking. No MCP browser or no running app → stop and tell the user exactly what
   to do. Auth is NOT blocking: if stored state is missing/stale, use the credential fallback
   (Prerequisite 3). Do not fabricate screenshots or review a screen you could not load.
2. One browser session for the whole run. Set storage state and viewport once; reuse across screens.
3. Capture settled screens only — never a loading spinner.
4. `fullPage: true` unless the user explicitly wants viewport-only.
5. Prefer reusing `storageState.json`. If it is missing or stale, fall back to the known-good local
   dev credentials in Prerequisite 3; only ask the user if those fail.
6. The review is owned by `screenshot-review` — this skill captures and delegates; it does not
   re-implement the review format.
7. Keep interactions reproducible and minimal; describe every click/fill you performed to reach a state.
8. The `aurora-service-reference` check (Review flow step 3) is additive and applies ONLY to
   service/resource screens (list/detail/CRUD). Skip it for dashboards, landing pages, and
   settings panels — those are not services and the service Checklist does not apply.

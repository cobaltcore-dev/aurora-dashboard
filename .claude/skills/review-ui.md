---
name: review-ui
description: UI review of Aurora pages against the 12-point UX checklist. Accepts screenshots (paste into chat) and optionally a service path or diff for code-level checks. Routes to reviewVisual, juno-live-ref, verifyUI, and aurora-service-reference. Use when the user runs /review-ui or asks to review a page screenshot.
argument-hint: [service path | files | "diff"] [-- any page-type hint or notes]
---

# review-ui

Accepts: screenshots pasted into chat (required) and optionally a service path, file list, or `"diff"` for code-level checks.

Always save the report. Never reply inline only — write to `tmp/aurora-reviews/` and reply with the path plus the ❌ count. This holds even if there are no findings.

**Local dev credentials**: Domain `Default`, User `admin`, Password `password`

---

## 1. Identify inputs

- **Screenshots**: check if one or more screenshots are in the current conversation context. If none, ask the user to paste or supply a screenshot before continuing.
- **Code scope** (optional): if a service path, file list, or `"diff"` was passed as an argument, note it. If none, proceed with visual-only mode and note it in the report.

State what mode you are running:

- `visual-only` — screenshots only, no code supplied
- `full` — screenshots + code scope

---

## 2. Quick read of the screenshot(s)

Before invoking sub-skills, spend one pass on the screenshot(s) to establish:

- How many pages / views are shown
- The likely page type of each (list, detail, modal, etc.)
- Whether this is an Aurora service/resource screen (list + detail + CRUD — e.g. Networks, Flavors, Keypairs)
- Any immediately obvious issues to flag

This primes the sub-skills and lets you pass a page-type hint.

---

## 3. Run sub-skills

Run the sub-skills appropriate to the mode. Run them one at a time, in the order listed.

### 3a. Always: juno-live-ref — Part A only (freshness guard)

Invoke the `juno-live-ref` skill but run **only Part A** (change detection against repo shas). Its sole job here is to tell us whether the Juno repo has changed since the cached synthesis in `sap_juno_appkit` was last verified.

Do **not** run Part B (full component/pattern lookup) or Part D (its own review) — both are redundant here. Part B's exact-prop lookup is owned by `sap_juno_lookup`; Part D's review is owned by `reviewVisual`.

Carry the result forward:

- **Unchanged** → `sap_juno_appkit`'s cached rules and tokens are trusted as-is.
- **Changed** → record which components/docs changed. For exactly those, `reviewVisual` must prefer a live `sap_juno_lookup` read over `sap_juno_appkit`'s cached values, because the cache may be stale.

### 3b. Always: reviewVisual

Invoke the `reviewVisual` skill. Pass:

- The screenshot(s) from context
- The page-type hint from step 2
- Any relevant notes from step 2
- The list of Juno components flagged "changed" by step 3a (so it knows which to look up live)

`reviewVisual` loads `sap_juno_appkit` internally and dispatches the `sap_juno_lookup` agent when it needs an exact prop/variant/token/rule.

### 3c. If Aurora service screen: aurora-service-reference

If step 2 identified this as a service/resource screen (list/detail/CRUD), invoke the `aurora-service-reference` skill and check the screen against its Checklist. Report deviations as additional findings. Skip for dashboards, landing pages, and settings panels.

### 3d. If code scope is present: verifyUI

Invoke the `verifyUI` skill with the code scope (service path, file list, or `"diff"`).

---

## 4. Merge findings

Combine findings from all sub-skills into a single deduplicated list. Where multiple sub-skills flag the same issue, merge into one finding and note all sources.

**Code supersedes visual.** `reviewVisual` items 10 (detail nav) and 12 (Juno components) are visual _guesses_. In `full` mode, `verifyUI`'s source-based verdict on the same point is authoritative — replace the visual guess with the code finding, don't list both. If they disagree, trust `verifyUI` and drop the visual guess.

Severity order:

1. ❌ correctness / functional problems
2. ⚠️ risks / quality issues
3. ➖ not applicable (document why)

---

## 5. Save report

Write the report to `tmp/aurora-reviews/review-ui-<page>-<YYYY-MM-DD>.md`. `<page>` is a short kebab-case name from the page type or route (e.g. `networks-list`, `router-detail`). If the file exists, append `-2`, `-3`, etc.

```
# review-ui: <page type> – <page name>
Date: <YYYY-MM-DD>
Mode: visual-only | full
Screenshots: <count>
Code scope: <path or "none">
Juno state: ✅ unchanged | ⚠️ N components changed (see juno-live-ref output)

## Findings
❌ <item #> – problem → fix  [source: visual | juno-live | aurora-service | code | combined]
⚠️ <item #> – risk → suggestion  [source: ...]

## Checklist summary
1. Page type        ✅ / ❌ / ⚠️ / ➖
2. Breadcrumb       ...
3. Typography       ...
4. Layout           ...
5. Primary action   ...
6. Nomenclature     ...
7. Overflow menus   ...
8. DataGridToolbar  ...
9. Tables           ...
10. Detail nav      ...
11. Positioning     ...
12. Juno components ...

## Aurora service checklist (if applicable)
<aurora-service-reference checklist items with ✅ / ❌ / ⚠️>

## Code findings (full mode only)
<verifyUI findings if code was checked>
```

List at most ~10 findings in the top **Findings** summary, highest severity first. This cap applies to the summary only — the per-section detail below (Aurora service checklist, Code findings) is never truncated, so a real `verifyUI` or service-checklist finding is never silently dropped. If nothing is found anywhere, write `✅ No findings`.

Reply in chat with only the report path and the ❌ count, e.g.:
`tmp/aurora-reviews/review-ui-networks-list-2026-10-14.md — 2 ❌`

---

## Phase 2 note (browser interaction — not yet active)

When browser interaction becomes available (Playwright MCP), extend step 2 with:

- Navigate to the page and verify hover states live (item 10)
- Resize the viewport to test table responsiveness (item 9)
- Click overflow menus to confirm item order at runtime (item 7)
- Confirm DataGridToolbar controls are functional, not just rendered (item 8)

The report format and checklist numbering do not change — just add `[verified live]` to the source tag on those items.

**Capture flow:** `auto-screenshot-review` already implements the Playwright login + navigate + screenshot flow. Reuse its capture logic (prerequisites, storage-state auth, settled-screen capture). Note: `auto-screenshot-review` currently chains into `juno-live-ref`'s Part D review, which is a _different, older_ review format than this skill's 12-point checklist. When wiring Phase 2, point the capture flow at `review-ui` instead so there is one review format, not two.

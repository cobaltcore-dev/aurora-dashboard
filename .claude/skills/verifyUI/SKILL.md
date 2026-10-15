---
name: verifyUI
description: The single UI-review skill for Aurora pages. Reviews a screen against the Juno design system and the 12-point UX checklist — both visually (from screenshots) and against the source (Juno component usage in the *.tsx code). All UI-review machinery lives under this folder — the 12-point visual checklist, the source Juno-usage check, the Juno freshness guard, and the Juno reference (sap_juno_appkit + the sap_juno_lookup agent). Use when the user runs /verifyUI, asks to review a page / screenshot / UI, or when called by verify for a GUI surface. Always writes findings + screenshots to the gitignored tmp/aurora-reviews/.
argument-hint: [service path | files | "diff"] [-- page-type hint or notes]
---

# verifyUI — Aurora UI review

The one place UI review lives. Everything the old `review-ui` / `reviewVisual` skills did is now
part of this skill. It checks a screen against the Juno design system two ways:

- **Visually** — from screenshots in context, against the 12-point UX checklist (step 4).
- **In source** — Juno component usage in the scoped `*.tsx` code (step 5).

Both lean on the Juno reference under this folder: `sap_juno_appkit/` (the synthesis — hard rules, decision tables, tokens, recipes, house rules) and the `sap_juno_lookup` agent (`agents/`, exact props/variants/tokens/rules from the real Juno source in `tmp/juno`). `sap_juno_appkit` + the Juno source it cites is the **single authority** for any Juno/UI question; no other source (model knowledge, the web) overrides it. For any exact detail not synthesized there, dispatch `sap_juno_lookup` — do not guess.

When a `DataGrid` is in scope, `build-datagrid/` is the deterministic structural authority: its decision trees (DT-1…DT-9) and Invariants are the spec the source check (step 5) compares each DataGrid call site against, and the zone-layout reference behind visual items 8–9. It defers to `sap_juno_appkit` + the Juno source for anything outside DataGrid structure.

**Always save the report** to `tmp/aurora-reviews/` (step 7). Never reply inline only — the chat reply is just the path, the verdict, and the ❌ count. This holds even with zero findings.

## Artifacts — all under `tmp/aurora-reviews/`

This is the only `tmp/` path that is gitignored (`.gitignore` has `tmp/aurora-reviews/`, not `tmp/`). Everything this skill produces goes there and nowhere else:

- Report md → `tmp/aurora-reviews/verifyUI-<page>-<YYYY-MM-DD>.md`
- Screenshots → `tmp/aurora-reviews/screenshots/<name>.png`

Always pass an **absolute** path to the screenshot tool (`<repo>/tmp/aurora-reviews/screenshots/<name>.png`). The Playwright MCP defaults to the repo root, so a bare filename lands in a tracked path — never do that. If any tool wrote a screenshot to the repo root or any other path, move it into `tmp/aurora-reviews/screenshots/` before replying.

**Login — never auto-fill credentials.** When a live-review run hits a login form, open the browser to it, leave every field blank, and **pause** — ask the user to type their own domain / user / password and sign in. The backend may differ and the credentials are theirs to enter. Don't hardcode or guess them, and don't read them from `.env` to fill the form for the user.

## 1. Identify inputs & mode

- **Screenshots**: are one or more screenshots in the conversation context (or passed as paths)? If this skill was invoked by `verify`, `verify` captures them live and hands them over.
- **Code scope** (optional): a service path, file list, or `"diff"` (= `git diff --name-only $(git merge-base origin/main HEAD)`) passed as an argument.

State the mode:

- `visual-only` — screenshots only, no code
- `source-only` — code scope only, no screenshot (static Juno-usage check; skip step 4)
- `full` — screenshots + code scope (run everything)

If neither a screenshot nor a code scope is available, ask the user to paste a screenshot or name a path before continuing.

## 2. Quick read

One pass over the screenshot(s) / scope to establish:

- how many pages/views are shown and the likely page type of each (list, detail, modal, drawer, form, empty state)
- whether this is an Aurora service/resource screen (list + detail + CRUD — Networks, Flavors, Keypairs…)
- any immediately obvious issue

This primes the checklist with a page-type hint.

## 3. Juno freshness guard

Check whether the Juno source in `tmp/juno` has moved since `sap_juno_appkit`'s cached synthesis was verified: compare the current `tmp/juno` HEAD sha against the baseline, and list any changed components/`docs/ux` files.

- **Unchanged** → trust `sap_juno_appkit`'s cached rules and tokens as-is.
- **Changed** → for exactly those components/docs, prefer a live `sap_juno_lookup` read over the cache when judging them in steps 4–5.

(If no baseline sha is recorded yet, note it and treat the cache as current.)

## 4. Visual checklist — 12 points (visual-only / full)

Load `sap_juno_appkit` first; its UX non-negotiables and decision index are the authority for items 5–8 and 12. Dispatch `sap_juno_lookup` for any exact prop/variant/token/rule beyond it. Work through every item in order; output one line each: ✅ pass · ❌ finding · ⚠️ risk · ➖ n/a (one-line reason). Never skip silently.

1. **Page type** — list/landing, entity detail, modal, drawer, form, empty state, other. State it; the rest depends on it.
2. **Breadcrumb & IA** — present? correct hierarchy? parent labels match the rest of the app?
3. **Typography** — one clear `ContentHeading` page title, consistent heading hierarchy, appropriate sizes. Titles Title Case, not sentence case.
4. **Layout** — expected order Breadcrumb → Heading → Toolbar → Main Content; spacing/grouping/hierarchy sound; no breaks or misalignment.
5. **Primary action — one per page** — exactly one `primary` (or `primary-danger` on a destructive surface). Zero or >1 is a finding. In a modal, confirm = the one primary, Cancel = `default`/`subdued`.
6. **Nomenclature** — consistent terms for one concept (not "Delete" vs "Remove"); no vague labels; no casing mix. Cross-page too if multiple screenshots.
7. **Overflow menus (⋮)** — labels clear & consistent with item 6; destructive last, common/primary first.
8. **DataGridToolbar** — present above any DataGrid; contains search/filter (if filterable), bulk controls (if selectable), Add/Create (if applicable). ComboBox/Filter left, Search right (house rule). No vertical gap between toolbar and grid. Zone layout authority: `build-datagrid` (DT-2 inclusion, DT-3/4/5 contents).
9. **Tables** — real/representative data (not placeholder); no cells truncating/overflowing; narrow-viewport handling (scroll or responsive). Long text that breaks structure/spacing is a defect (house rule).
10. **Detail nav** — on a list page with a detail view: visible row hover affordance (cursor/highlight) and clicking a row navigates. Static rows with no hover/click affordance is a finding. (In `full` mode, item 5 of the source check is authoritative — see step 6.)
11. **Positioning** — CTAs placed consistently (page actions top-right); badges/icons/labels aligned; nothing out of place or overlapping.
12. **Juno components** — standard Juno buttons/inputs/selects/modals, Juno DataGrid (not a plain table), Juno nav/breadcrumb/shell. Flag anything hand-rolled. Visual inspection is approximate — in `full` mode the source check (step 5) supersedes.

## 5. Source Juno-usage check (source-only / full)

For the scoped `*.tsx` files:

1. **Collect usage** — grep for `from "@cloudoperators/juno-` imports; build the unique list of imported components. Only these get checked.
2. **Look up Juno** — read the component in `tmp/juno/packages/ui-components/src/components/{Name}/` (`.component.tsx` for props/types/deprecations, `.stories.tsx` for endorsed variants and compositions). If `tmp/juno` is absent, fall back to the installed package under `node_modules` (`find node_modules -path '*@cloudoperators/juno-ui-components/package.json'`); that build ships only `*.stories.d.ts` — the exported story **names** are still the catalog of blessed compositions (`NoHead`, `HoverableRow`, `ColSpanCell`…) and you must read them. Note in the report whether stories were full source or types-only.
3. **Check each call site**:
   - props exist and values are valid (`variant`, `size`…); required props set; no deprecated component/prop
   - composition matches the stories (children, parent/child pairs); a hand-rolled thing a story already blesses is a finding
   - no raw HTML / custom component where a Juno one exists
   - **right component for the data**: key/value attributes of one entity → `DescriptionList`, not a two-column `DataGrid` with a bold label cell. `text-theme-link` inside a `DataGridRow` that already has `onClick` is wrong — the row is natively clickable; remove the colour, don't fake a link
   - **empty/loading/error structure**: for each `DataGrid`/table, its `length === 0` / `isLoading` / `isError` branch must return the state component (`Status`/`Message`) **instead of** the grid, not nested as a row below the head cells
   - **DataGrid structure** (only if a `DataGrid` is imported): check the call site against `build-datagrid`'s decision trees and Invariants — column assembly/order (checkbox `_select` first, primary identifier, status near left, `_actions` last and min-content), zone/toolbar wrapping (Zone 1 a bare `Stack`; Zones 2 & 3 each their own `DataGridToolbar`, never merged), `colSpan={columns}` on state rows, `e.stopPropagation()` on every interactive child of a row with `onClick`, empty cell `- -`, no `DataGridFoot` unless requested. Any Invariant violation is a finding.
   - no inline `style`, no hard-coded colours — only `theme-*` tokens
4. **Check house rules** — read `sap_juno_appkit/references/house-rules.md` and check each against the scoped files (empty value `- -`, heading hierarchy, spacing totals, prop-vs-CSS, DataGrid toolbar order…).

## 6. Merge findings

Combine every finding into one deduplicated list; where multiple checks flag the same issue, merge and note the sources.

**Source supersedes visual.** Checklist items 10 (detail nav) and 12 (Juno components) are visual _guesses_. In `full` mode, the source check's verdict on the same point is authoritative — replace the visual guess with the source finding, don't list both. If they disagree, trust the source.

Severity order: ❌ correctness/functional → ⚠️ risk/quality → ➖ n/a (document why).

## 7. Save report

Write to `tmp/aurora-reviews/verifyUI-<page>-<YYYY-MM-DD>.md`. `<page>` is a short kebab-case name from the page/route (e.g. `networks-list`, `router-detail`). If the file exists, append `-2`, `-3`, …

```
# verifyUI: <page type> – <page name>
Date: <YYYY-MM-DD>
Mode: visual-only | source-only | full
Screenshots: <count> → tmp/aurora-reviews/screenshots/<...>.png
Code scope: <path or "none">
Juno state: ✅ unchanged | ⚠️ N components changed (step 3)

**Verdict:** PASS | FAIL

## Findings
❌ <ref> – problem → fix   [source: visual | source | house-rule | aurora-service | combined]
⚠️ <ref> – risk → suggestion   [source: ...]

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

## Aurora service checklist (if a service screen)
<aurora-service-reference checklist items with ✅ / ❌ / ⚠️>

## Source findings (source-only / full)
Checked: Button, Modal, DataGrid (stories ✅ full / ⚠️ types only)
<per-call-site findings>
```

The top **Findings** summary lists at most ~10, worst first — this cap is the summary only; the per-section detail below (service checklist, source findings) is never truncated, so a real finding is never silently dropped. If nothing is found anywhere, write `✅ No findings`.

**Verdict:** PASS — the screen obeys the Juno design system and the checklist holds. FAIL — one or more ❌ (a visible UX-rule violation, a wrong/misused Juno component, a broken state structure). When in doubt, FAIL.

Reply in chat with only the path and ❌ count, e.g.
`tmp/aurora-reviews/verifyUI-networks-list-2026-10-14.md — 2 ❌`

## Aurora service screens

If step 2 identified a service/resource screen (list/detail/CRUD), also check it against the `aurora-service-reference` skill's checklist and fold deviations into Findings under "Aurora service checklist". Skip for dashboards, landing pages, settings panels.

## Capture (when driving the app yourself)

When invoked standalone to review a live screen (not handed screenshots by `verify`), reuse the Playwright login→navigate→screenshot flow: open the browser to the login screen and let the **user** enter their own credentials (see the login rule above — never auto-fill), navigate to the screen, capture a settled screenshot to `tmp/aurora-reviews/screenshots/`. `verify` already does this and hands the screenshots over — in that case start at step 1 with the images it captured.

---
name: ux-wireframe-designs
description: "This skill should be used when the user asks to 'review wireframe designs', 'analyse this wireframe', 'review UX designs', 'check design handoff', 'audit wireframes against Juno', 'review handoff notes', or wants a structured developer-ready design review comparing wireframes against Juno components, UX docs, user stories, and handoff notes. Covers BRD coverage, Juno compliance, UX patterns, empty/loading states, UX writing, handoff quality, and Juno gap analysis."
version: 1.0.0
---

Analyse UI wireframe screenshots against Juno, UX docs, user stories, and handoff notes. Produce a structured developer-ready review report.

## Before You Start

### 0. Run core skill: juno-live-ref

Invoke the `juno:juno-live-ref` skill (via the Skill tool) before reading any screenshot.

This runs both mandatory protocols:

- **Protocol 1** — Change detection: fetch GitHub API shas, output visual diff or unchanged one-liner
- **Protocol 2** — Component lookup: for every component/pattern in this review, announce each fetch, list ALL props in a full table, cross-reference the entire repo, search everywhere for patterns/concepts

Do not skip or abbreviate either protocol.

---

### 1. Load all four Juno memory files before reading any screenshot:

- `juno_reference.md` — repo/Storybook URL
- `juno_storybook_components.md` — full component catalog
- `juno_ux_foundations.md` — layout, AppShell, navigation, semantic variants, glossary
- `juno_ux_patterns.md` — DataGrid, Modals, Messages, Overflow Menus, Sign-In, Unauthorized
- `juno_ux_design_guidelines.md` — UX writing, error handling, loading/empty/busy states

2. Read every screenshot fully before writing anything. Read annotation boxes AND any text the user typed in chat — treat both as input.

3. Identify what context was provided alongside the screenshots:
   - User story card (role, goal, acceptance criteria)
   - Handoff notes panel (usually a dark banner at the bottom of the frame)
   - BRD or spec text pasted in chat
   - Inline sticky notes or annotation boxes on the design

---

## Analysis Dimensions

Evaluate each screen against all of the following. Do not skip a dimension because it seems fine — state it either way.

### 1. BRD / Acceptance Criteria Coverage

For each AC bullet visible in the user story card, determine:

- ✅ Covered — design addresses it
- ⚠️ Partial — design hints at it but is incomplete
- ❌ Missing — no design evidence of this requirement

### 2. Juno Component Compliance

Check every visible UI element against the Juno component library:

- Is the correct Juno component used?
- Are variant and props correct (semantic variants: `info`, `success`, `warning`, `error`, `danger`)?
- Are button labels correct (short infinitive verb, action-specific, no "Save" for create/register flows)?
- Are modal rules followed (user-triggered only, always closeable, one primary action, no stacking, Cancel always present)?
- Is title case applied correctly to headings, column headers, button labels, modal titles?
- Are status indicators using `<Badge>` with semantic variants, not raw circles or colour alone?

### 3. UX Foundations

- AppShell structure present (header, side nav, content area, footer)?
- Navigation depth ≤ 3 levels?
- Breadcrumb reflects actual route?
- Page title is real content, not placeholder?
- Role-based rendering strategy annotated (disabled vs hidden vs error-on-use)?

### 4. UX Patterns

**DataGrid:** Columns ordered correctly (identifier leftmost, status near left, actions far right)? Status column shows icon + text in same cell? Row interaction (hover state, click-to-detail) annotated? Overflow menu actions defined? Filter categories specified? Sort behaviour defined? **Header zones correctly composed?** (Zone 1 — sort/primary action — is a bare `Stack`, no `DataGridToolbar`; Zones 2 and 3 each get their own `DataGridToolbar`; bulk-action checkbox and menu only present if user has bulk-action permissions; create button absent if user cannot create)

**Modals:** Title action-oriented and specific? Correct button variant? Primary action rightmost? Loading state on submit button annotated?

**Messages/Notifications:** Correct semantic variant for intent? Dismissible vs persistent correctly chosen? Never auto-dismiss error or warning?

**Empty + Loading states:** Separate states designed for every list view that requires them per AC?

### 5. UX Writing

- No placeholder text (Lorem, "Page subtitle", "Title", "Content", "Primary action")?
- Title case applied correctly to headings, column headers, button labels?
- No "Please", "Thanks", "We", "Log in"?
- Button labels are short infinitive verbs?
- Error messages say what happened AND what to do?
- Status vocabulary consistent across all screens?

### 6. Handoff Quality

- Are all open questions in handoff notes actually answered, or do they remain open?
- Is any annotation mid-sentence or cut off?
- Does a developer have enough context to build each screen without a follow-up meeting?
- Is copy (warning text, empty state text, error messages, instructions) provided verbatim?

### 7. Juno Gap Analysis — Missing Components or Patterns

Read the BRD, AC, handoff notes, and visible design elements. For every required UI element, interaction, or pattern, ask: **does Juno have a component or documented pattern that covers this?**

Use the full component catalog from `juno_storybook_components.md` and the pattern docs from `juno_ux_patterns.md` as the reference.

Classify each gap as one of three types:

- **Truly missing** — no Juno component or pattern exists; must be built custom or contributed back to Juno
- **Composable** — no single component, but can be assembled from existing Juno primitives (name the primitives)
- **Uncertain** — may exist but could not be confirmed from available Juno docs; needs verification against the live Storybook

For each gap found, state:

- What the product needs (from BRD/design)
- What Juno currently provides (or doesn't)
- Recommended approach (custom build, composition, or check Storybook)
- Whether this is a **Juno contribution candidate** — i.e. generic enough that it should be proposed back to the Juno team rather than built as a one-off

Do not flag things that are clearly composable from standard HTML + Tailwind/CSS — only flag when the gap is at the component or interaction-pattern level.

---

## Output Structure

Write the review to a markdown file.

**Filename:** `review-[app-name]-[YYYY-MM-DD].md` using today's date and the app/screen name from the screenshots (lowercase, hyphens).

**Write the file to the current working directory.** Confirm the path to the user after writing.

---

Use this exact structure:

```
# [App Name] — Design Review
**Date:** YYYY-MM-DD
**Screens covered:** [list all stories/screens]
**Reviewer note:** [one line on what context was available: user stories, handoff notes, BRD, etc.]

---

## Summary — Handoff Readiness

| Screen | Placeholder Content? | Missing States? | Missing Interactions? | Form Spec Complete? | Ready to Build? |
|---|---|---|---|---|---|
| [Story N — Name] | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/N/A | ✅/❌ |

[One sentence verdict on the overall readiness.]

---

## Cross-Cutting Issues

Issues that appear on multiple screens get one entry here, not repeated per screen.

### Design
[Numbered items]

### Juno
> Juno tag — design system task, not a product fix.
[Numbered items]

---

## [Story N] — [Screen Name]

**Location:** `breadcrumb › path`
**AC coverage:** [summary of which AC items are met/partial/missing]

### Design
[Numbered items]

### Juno
> Juno tag — design system task, not a product fix.
[Numbered items]

### Handoff Notes
[Verbatim quotes from the handoff panel, labelled Changes or Question, each as a separate numbered item]

---

## Juno Component Compliance — All Screens

| Observation | Current (implied) | Correct Juno Approach |
|---|---|---|

---

## Open Questions — Decision Log

Classify every unresolved question into one of three resolver buckets:

| # | Screen | Question | Resolver Bucket | Blocks |
|---|---|---|---|---|

**Resolver Buckets:**
- **API schema** — answer is in the API response/request body schema; resolve when API access is available
- **API + UX decision** — API provides the raw data but a UX rendering call is still needed (e.g. status string → semantic variant mapping, role strategy)
- **Product/copy decision** — human answer required regardless of API access (security policy, warning text, instruction copy, interaction pattern choice)

---

## Juno Gap Analysis — Missing Components or Patterns

| # | What the product needs | Juno currently provides | Gap type | Recommended approach | Juno contribution candidate? |
|---|---|---|---|---|---|

**Gap types:**
- **Truly missing** — no Juno component or pattern covers this; must be built custom
- **Composable** — no single component, but assembles from named Juno primitives
- **Uncertain** — may exist; verify against live Storybook before building custom
```

---

## Item Format Rules

Each numbered finding must follow this format:

```
N. **[Short title]**
   [Current state. Desired state. Triggering condition if relevant. Juno component + prop if identifiable.]
   ⚠️ *Needs: [what is missing for a developer to action this — omit entirely if nothing is missing]*
```

**Check before writing each item:**

- [ ] Current state described?
- [ ] Desired state described?
- [ ] Triggering condition clear?
- [ ] Component identified?
- [ ] Exact copy included (if text change)?

---

## Juno Quick-Reference

| What you see                                | Component                              | Correct usage                                                                                                                                                                                                                            |
| ------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coloured message box                        | `<Message>`                            | `variant="info\|warning\|error\|success\|danger"` — pick by semantic intent, never aesthetics                                                                                                                                            |
| Status badge/pill                           | `<Badge>`                              | `variant` matches semantic intent of the status value                                                                                                                                                                                    |
| Primary create/register button              | `<Button variant="primary">`           | Label = infinitive verb matching the action ("Create", "Register") — never "Save"                                                                                                                                                        |
| Destructive action button                   | `<Button variant="primary-danger">`    | For delete, terminate, irreversible actions                                                                                                                                                                                              |
| Button in loading/submit state              | `<Button>`                             | Add `progress={true} progressLabel="Creating…"` — disable inputs during submission                                                                                                                                                       |
| Row action menu                             | `<PopupMenu>`                          | `<PopupMenuToggle>` / `<PopupMenuOptions>` / `<PopupMenuItem label="View Detail">` — label must identify the item where possible. Also exposed as dot-notation sub-components: `PopupMenu.Toggle`, `PopupMenu.Options`, `PopupMenu.Item` |
| Copy icon next to a value                   | `<CopyToClipboard>`                    | Inline with the field value                                                                                                                                                                                                              |
| Attribute key-value display                 | `<DescriptionList>`                    | For detail pages showing entity properties                                                                                                                                                                                               |
| Modal                                       | `<Modal title="[Action + Subject]">`   | Title must be specific and action-oriented; Cancel always present; one primary action                                                                                                                                                    |
| Full-page/section loading                   | `<Spinner>` or DataGrid loading prop   | Scoped to the loading area — do not block the full page                                                                                                                                                                                  |
| Empty list                                  | Custom empty state inside `<DataGrid>` | Explain why empty + suggest next action                                                                                                                                                                                                  |
| DataGrid header — sort + primary action     | Bare `<Stack>` (no DataGridToolbar)    | Zone 1: `Select`+`SortButton` for sort; `Button variant="primary"` for create; optional `PopupMenu` overflow for global actions                                                                                                          |
| DataGrid header — filters + search          | `<DataGridToolbar>`                    | Zone 2: `InputGroup` with `Select`+`ComboBox` for filters; `SearchInput`; active `Pill`s + "Clear filters" `Button size="xs"`                                                                                                            |
| DataGrid header — item count + bulk actions | Second `<DataGridToolbar>`             | Zone 3: select-all `Checkbox` + bulk `PopupMenu` on left; item count span in middle; last-update + refresh `Button size="xs"` on right. Omit bulk controls if user lacks permission                                                      |

Full Juno component API is in memory: [[juno-storybook-full-analysis]]

---

## Placeholder Detection

Flag as a finding if you see any of the following in the design:

- Column headers: Lorem, Dolor, Ipsum, or any Latin placeholder
- Page/modal titles: "Title", "Page Title", "HSM Partition N Detail Page"
- Body text: "Content", "Page subtitle", "Description"
- Button labels: "Primary action", "Secondary action", "Save" on create/register flows
- Status values: "Status" as a literal data value
- Attribute pairs: "Title / Description" repeated rows
- Timestamps: timezone abbreviations that are not standard (e.g. "CTA" instead of CET/UTC)

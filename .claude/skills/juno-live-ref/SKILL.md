---
name: juno-live-ref
description: "Juno screenshot-review skill. ALWAYS starts with two core protocols (Part A — change detection against repo shas; Part B — component/pattern lookup: announce every fetch, list ALL props, cross-reference entire repo), then produces a structured developer-ready markdown review of Aurora/Juno UI screenshots (Part D). Use when the user asks to 'review UI screenshots', 'review this screen', 'check this screenshot', 'give feedback on this design', 'annotate this screenshot', or 'review Aurora UI'."
version: 2.0.0
---

# Juno Live Reference — Screenshot Review Skill

Produces a structured developer-ready markdown review of Aurora/Juno UI screenshots. It always runs the two core protocols first, then does the review.

## How to use this skill

1. **Always run Part A** (Protocol 1 — Change Detection), then **Part B** (Protocol 2 — Component and Pattern Lookup). Both run before any output is produced. Do not skip or abbreviate either.
2. **Then do Part D** — review the UI screenshots and produce the markdown report. For every component identified in the screenshots, Part B's lookup applies.
3. **If invoked only as the core reference** (another skill or step asked for the protocols, with no review task of its own) → stop after Parts A and B.

---
---

# Part A — Protocol 1: Change Detection

**Purpose:** Detect if the Juno repo has changed since the last check. Always run first, before touching memory or producing output.

### Step 1A — Read baseline

Read the baseline file bundled with this skill (in this skill's own directory):
`juno_last_known_state.md`

- If `Last checked` is **absent**: run the full diff now (first-time initialisation).
- If `Last checked` is **older than 24 hours**: run the full diff now.
- If `Last checked` is **within 24 hours**: output the "unchanged" one-liner and skip to Part B.

### Step 1B — Fetch current state

Run both fetches in parallel:

> `🔍 Fetching: https://api.github.com/repos/cloudoperators/juno/contents/packages/ui-components/src/components`

> `🔍 Fetching: https://api.github.com/repos/cloudoperators/juno/contents/docs/ux`

For each response, extract the `name` and `sha` fields from every entry.

### Step 1C — Compare and output visual diff

Compare fetched names+shas against the stored lists. Then output exactly one of the following:

**If changes detected:**

```
╔══════════════════════════════════════════════════╗
║  JUNO REPO CHANGES DETECTED — [today's date]     ║
╚══════════════════════════════════════════════════╝

COMPONENTS  (packages/ui-components/src/components/)
  ✅ ADDED     [ComponentName]
  ❌ REMOVED   [ComponentName]
  ⚠️  MODIFIED  [ComponentName]  (sha: [old] → [new])

UX DOCS  (docs/ux/)
  ✅ ADDED     [filename.md]
  ❌ REMOVED   [filename.md]
  ⚠️  MODIFIED  [filename.md]  (sha: [old] → [new])

No changes: [N] components, [N] UX docs unchanged.
```

**If nothing changed:**

```
✅  Juno repo unchanged since [last-checked date]. [N] components, [N] UX docs — all shas match.
```

### Step 1D — Update memory and reference site

Write the new state back to `juno_last_known_state.md`:
- Set `Last checked` to today's date
- Replace the component list and UX doc list tables with the freshly fetched names + shas
- Append a row to the Change log table

If any files changed, fetch the modified files from GitHub and update the affected Juno memory files (`juno_storybook_components.md`, `juno_ux_foundations.md`, `juno_ux_patterns.md`, `juno_ux_design_guidelines.md`).

**If any COMPONENT shas changed**, also update `~/juno-reference.html`:

Find this line in the JS section:

```js
const CHANGED_COMPONENTS = [];
```

Replace the `[]` with an array of change objects for every added, modified, or removed component:

```js
const CHANGED_COMPONENTS = [
  { name: 'ComponentName', change: 'added' },     // for new components
  { name: 'ComponentName', change: 'modified' },  // for sha changes
  { name: 'ComponentName', change: 'removed' },   // for removed components
];
```

Each changed component will then show a 🐱 indicator on its badge in the reference site.

---
---

# Part B — Protocol 2: Component and Pattern Lookup

**Purpose:** Ensure every component, pattern, or concept search is complete, transparent, and cross-referenced across the entire repo.

### Rule

For every component, pattern, or concept referenced in this session — follow all steps below. No exceptions, no skipping.

**Why:** Stale memory, partial props, and missed cross-references have caused incorrect guidance. Full transparency on every lookup prevents this.

---

### Step 2A — Announce every fetch

Before each GitHub request, output one line:

> `🔍 Fetching: [full URL]`

Never silently fetch. The user must see exactly what is being looked up and where from.

---

### Step 2B — Components: list ALL props

Fetch both the source file (`{ComponentName}.tsx`) and the stories file (`{ComponentName}.stories.tsx`).

List every prop in a complete table:

| Prop | Type | Default | Required | Description |
|---|---|---|---|---|

Rules:
- Never summarise. Never omit a prop.
- If a prop exists in the source, it must appear in the table.
- Include deprecated props — mark them `(deprecated)` in the Description column.
- Include props inherited via `...rest` or spreads if documented.

---

### Step 2C — All stories for this component

List every named story and what variant/state it demonstrates:

| Story name | Variant / state demonstrated |
|---|---|

---

### Step 2D — Cross-reference: everything that imports or uses this component

Search the entire repo for `import.*{ComponentName}`. Cover:
- Other component source files (composition and dependency relationships)
- Story files from other components (usage examples in context)
- UX doc files and any README that imports or names the component
- Pattern pages and index files

List each result: `[file path] — [relevant import line]`

---

### Step 2E — UX doc and pattern mentions

Search `docs/ux/` for every mention of the component name or concept. Also search top-level `README.md` files.

For each hit: `[doc file] > [section heading] — [short excerpt]`

---

### Step 2F — Pattern or concept searches: search everywhere

When the query is a pattern or concept (e.g. "empty state", "confirmation modal", "loading states", "error handling", "role-based rendering", "pagination") — search ALL of:

- Every file in `docs/ux/`
- Every component source and story under `packages/ui-components/src/components/`
- Every `README.md` in the repo
- Any `CHANGELOG.md` files referencing the pattern
- GitHub search API for broad-text searches

List every hit. Synthesise only after all results are shown.

---

### Step 2G — Present findings before answering

Output the complete prop table, stories list, cross-references, and doc mentions BEFORE incorporating findings into any answer, code, or design decision.

Never answer from memory alone when a live lookup is possible. Memory is a starting point, not a substitute for the live repo.

### Step 2H — docs/ux/ full inventory
The `docs/ux/` directory is the source of truth for Juno UX guidance. The current live file set (fetch to confirm shas each session — see Part A):

| File | Topic | Memory file it maps to |
|---|---|---|
| `0_contents.md` | Table of contents / index | — |
| `introduction.md` | Introduction | — |
| `core-concepts.md` | Core concepts | `juno_ux_foundations.md` |
| `foundations.md` | Foundations | `juno_ux_foundations.md` |
| `getting-started-with-juno-ui-components.md` | Getting started | — |
| `glossary.md` | Glossary of terms | `juno_ux_foundations.md` |
| `resources.md` | Resources / links | `juno_reference.md` |
| `semantic-variants.md` | info/success/warning/error/danger | `juno_ux_foundations.md` |
| `the-appshell.md` | AppShell structure | `juno_ux_foundations.md` |
| `layout-and-application-structure.md` | Layout + app structure | `juno_ux_foundations.md` |
| `layout-fundamentals.md` | Layout fundamentals | `juno_ux_foundations.md` |
| `juno-layout.md` | Juno layout | `juno_ux_foundations.md` |
| `embedded-application-layout.md` | Embedded app layout | `juno_ux_foundations.md` |
| `legacy-application-layout.md` | Legacy app layout | `juno_ux_foundations.md` |
| `page-and-user-flow.md` | Page + user flow | `juno_ux_foundations.md` |
| `page-layout-elements.md` | Page layout elements | `juno_ux_foundations.md` |
| `page-content-area.md` | Content area | `juno_ux_foundations.md` |
| `page-header.md` | Page header | `juno_ux_foundations.md` |
| `page-footer.md` | Page footer | `juno_ux_foundations.md` |
| `page-level-actions.md` | Page-level actions | `juno_ux_patterns.md` |
| `navigation.md` | Navigation | `juno_ux_foundations.md` |
| `navigation-fundamentals.md` | Navigation fundamentals | `juno_ux_foundations.md` |
| `navigation-side-navigation.md` | Side navigation | `juno_ux_foundations.md` |
| `datagrid.md` | DataGrid pattern | `juno_ux_patterns.md` |
| `modals.md` | Modals pattern | `juno_ux_patterns.md` |
| `messages-and-notifications.md` | Messages + notifications | `juno_ux_patterns.md` |
| `popup-and-overflow-menus.md` | Popup / overflow menus | `juno_ux_patterns.md` |
| `forms.md` | Forms | `juno_ux_patterns.md` |
| `inline-adding-editing-and-deleting.md` | Inline add/edit/delete | `juno_ux_patterns.md` |
| `wizard.md` | Wizard pattern | `juno_ux_patterns.md` |
| `box.md` | Box | `juno_ux_patterns.md` |
| `sign-in.md` | Sign-in | `juno_ux_patterns.md` |
| `authentication-and-access.md` | Auth + access | `juno_ux_patterns.md` |
| `ui-for-unauthorized-users.md` | Unauthorized users | `juno_ux_patterns.md` |
| `ux-patterns.md` | UX patterns index | `juno_ux_patterns.md` |
| `interaction-guidelines.md` | Interaction guidelines | `juno_ux_design_guidelines.md` |
| `application-design-guidelines.md` | Application design guidelines | `juno_ux_design_guidelines.md` |
| `ux-writing-content-design.md` | UX writing / content design (ToV) | `juno_ux_design_guidelines.md` |
| `error-handling-loading-empty-states.md` | Error handling, loading, empty states | `juno_ux_design_guidelines.md` |
| `transient-states-and-progress.md` | Transient states + progress | `juno_ux_design_guidelines.md` |
| `accessibility.md` | Accessibility | `juno_ux_design_guidelines.md` |
| `versioning-and-deprecation-policy.md` | Versioning + deprecation policy | `juno_ux_design_guidelines.md` |
| `images/` | Image assets (not a doc) | — |

If a live fetch returns a file NOT in this table, treat it as **ADDED** (Part A), read it, and extend the mapping. If a file here is missing from the live fetch, treat it as **REMOVED**.

---
---

# Part D — Review UI Screenshots

Use when the user asks to review/check/annotate UI screenshots or give feedback on a design. Produces a structured developer-ready markdown report. Parts A and B above have already run — for every component identified in the screenshots, Part B's lookup applies.

## Input

One or more screenshots, plus notes provided either:
- As annotation boxes visible in the screenshot (red "Changes" or teal "Question")
- As text typed in the chat by the user

Read both sources. Apply the same rules to both.

## Output

Write the review to a markdown file using the Write tool.

Name the file `review-[screen-name]-[YYYY-MM-DD].md` using today's date and the main screen name from the screenshots (lowercase, hyphens, no spaces).

Write the file to the current working directory. After writing, confirm the file path to the user.

---

### [App] — [Screen or modal title as shown in the UI]

**Location:** `breadcrumb › path › as › visible › in › screenshot`  
**Annotation:** [Changes | Question] · [Date from annotation, or omit if notes came from chat]

---

1. **[Short title of the change]**  
   [Description of current state, desired state, triggering condition if relevant, and Juno component + prop if identifiable.]  
   ⚠️ *Needs: [what is missing for a developer to action this — omit line if nothing is missing]*

---

## Rules

1. Read every annotation box and any chat notes fully before writing. Do not paraphrase — use the exact copy where provided.
2. Extract the **Location** breadcrumb from what is visible in the screenshot (top page breadcrumb and/or in-modal path).
3. A single annotation box may contain multiple issues. Treat each as a **separate numbered item**.
4. Separate sections by tag — `Aurora`, `Juno`, `Design`, `Bug` each get their own section with their own heading. Items tagged `Juno` are design system tasks, not product fixes — add a `> Juno tag — design system task, not a product fix.` callout below the heading.
5. When no P or Tag is stated, default to **Aurora**.
6. Annotation type matters — label it:
   - `Changes` = confirmed change request
   - `Question` = open question, decision still needed
7. Name the Juno component when identifiable:
   - Coloured message box → `<Message variant="info|warning|error">`
   - Action button → `<Button variant="primary|primary-danger|default|subdued">`
   - Dropdown menu item → `<PopupMenu.Item label="...">`
   - Modal title or size → `<Modal title="..." size="...">`
   - Select, ComboBox, TextInput, Checkbox, DataGrid, DescriptionList — name them if visible
8. If exact replacement copy is provided, include it verbatim.
9. After each item, check if a developer has enough context to act. Flag anything missing with `⚠️ Needs:`. Check for:
   - Current state described?
   - Desired state described?
   - Triggering condition clear?
   - Component identified?
   - Exact copy included (if text change)?

## Juno component reference

| What you see | Component | Fix |
|---|---|---|
| Coloured message box | `<Message variant="info\|warning\|error">` | Replace with `<p>` |
| Teal/primary button on destructive action | `<Button variant="primary">` | Change to `variant="primary-danger"` |
| Wide modal needed | `<Modal>` | Add `size="xl"` or `size="2xl"` |
| Row action menu item | `<PopupMenu.Item>` | Update `label` prop |
| Button in progress state | `<Button>` | Add `progress={true} progressLabel="..."` |

Full Juno component API is in memory: [[juno-storybook-full-analysis]]

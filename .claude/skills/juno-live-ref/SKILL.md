---
name: juno-live-ref
description: "Core Juno live-reference skill. Two protocols that ALWAYS run in any Juno session: (1) change-detection — compare repo shas against baseline, output visual diff; (2) component lookup — announce every fetch, list ALL props, cross-reference entire repo, search everywhere for patterns/concepts. Baked into juno-wireframes, ux-wireframe-designs, screenshot-review. Load this skill whenever working with Juno UI components, patterns, UX docs, wireframes, or handover reviews."
version: 1.0.0
---

# Juno Live Reference — Core Skill

Two mandatory protocols for every Juno session. Both run before any output is produced.

---

## Protocol 1 — Change Detection

**Purpose:** Detect if the Juno repo has changed since the last check. Always run first, before touching memory or producing output.

### Step 1A — Read baseline

Read the memory file:
`/Users/C5385762/.claude/projects/-Users-C5385762/memory/juno_last_known_state.md`

- If `Last checked` is **absent**: run the full diff now (first-time initialisation).
- If `Last checked` is **older than 24 hours**: run the full diff now.
- If `Last checked` is **within 24 hours**: output the "unchanged" one-liner and skip to Protocol 2.

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
const CHANGED_COMPONENTS = []
```

Replace the `[]` with an array of change objects for every added, modified, or removed component:

```js
const CHANGED_COMPONENTS = [
  { name: "ComponentName", change: "added" }, // for new components
  { name: "ComponentName", change: "modified" }, // for sha changes
  { name: "ComponentName", change: "removed" }, // for removed components
]
```

Each changed component will then show a 🐱 indicator on its badge in the reference site.

---

## Protocol 2 — Component and Pattern Lookup

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
| ---- | ---- | ------- | -------- | ----------- |

Rules:

- Never summarise. Never omit a prop.
- If a prop exists in the source, it must appear in the table.
- Include deprecated props — mark them `(deprecated)` in the Description column.
- Include props inherited via `...rest` or spreads if documented.

---

### Step 2C — All stories for this component

List every named story and what variant/state it demonstrates:

| Story name | Variant / state demonstrated |
| ---------- | ---------------------------- |

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

---
name: juno-sync
description: "Juno repo change-detection skill. Fetches current component + UX doc shas from GitHub, compares against the stored baseline, outputs a visual diff, updates the baseline file, reconciles hard-rejects, and writes on-page change entries. Run this skill first, before any Juno task. Triggers: 'sync Juno', 'check Juno changes', 'refresh Juno state', or invoked automatically as the first step in any Juno skill chain."
version: 1.0.0
---

# juno-sync — Juno Repo Change Detection

Detects whether the Juno repo has changed since the last check. Always run this before any Juno task. It is the first step in every Juno skill chain.

## How to use this skill

1. Run **Step 1A** — read the baseline.
2. Decide whether to run a full diff (Step 1B onward) or skip.
3. Output the result (Step 1C).
4. Write updated state back (Step 1D).
5. Return to the calling skill (or stop here if invoked standalone).

---

## Step 1A — Read baseline

Read the baseline file in this skill's own directory:
`juno_last_known_state.md`

- If `Last checked` is **absent**: run the full diff now (first-time initialisation).
- If `Last checked` is **older than 24 hours**: run the full diff now.
- If `Last checked` is **within 24 hours**: output the unchanged one-liner and stop.

```
✅  Juno repo unchanged since [last-checked date]. [N] components, [N] UX docs — all shas match.
```

---

## Step 1B — Fetch current state

Run both fetches in parallel:

> `🔍 Fetching: https://api.github.com/repos/cloudoperators/juno/contents/packages/ui-components/src/components`

> `🔍 Fetching: https://api.github.com/repos/cloudoperators/juno/contents/docs/ux`

For each response, extract the `name` and `sha` fields from every entry.

Note: the `docs/ux` listing includes an `images/` directory (doc assets). It is not a UX doc — ignore it in all comparisons and exclude it from the doc count. Only `.md` files are tracked.

---

## Step 1C — Compare and output visual diff

Compare fetched names + shas against the stored lists in `juno_last_known_state.md`. Then output exactly one of the following:

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

---

## Step 1D — Update state and downstream systems

### 1D-i — Write new state to baseline

Write the updated state back to `juno_last_known_state.md` (in this skill's directory):

- Set `Last checked` to today's date.
- Replace the component list and UX doc list tables with the freshly fetched names + shas.
- Append a row to the Change log table.

### 1D-ii — Update memory files (if anything changed)

If any UX doc shas changed, fetch the modified files from GitHub and update the affected Juno memory files:

| Changed doc(s)                                                                                                                                                                                                                                                                                  | Memory file to update          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `core-concepts.md`, `foundations.md`, `glossary.md`, `semantic-variants.md`, `the-appshell.md`, `layout-*.md`, `juno-layout.md`, `embedded-*.md`, `legacy-*.md`, `page-*.md`, `navigation*.md`                                                                                                  | `juno_ux_foundations.md`       |
| `datagrid.md`, `modals.md`, `messages-and-notifications.md`, `popup-and-overflow-menus.md`, `forms.md`, `inline-adding-editing-and-deleting.md`, `wizard.md`, `box.md`, `sign-in.md`, `authentication-and-access.md`, `ui-for-unauthorized-users.md`, `ux-patterns.md`, `page-level-actions.md` | `juno_ux_patterns.md`          |
| `interaction-guidelines.md`, `application-design-guidelines.md`, `ux-writing-content-design.md`, `error-handling-loading-empty-states.md`, `transient-states-and-progress.md`, `accessibility.md`, `versioning-and-deprecation-policy.md`                                                       | `juno_ux_design_guidelines.md` |

### 1D-iii — Update juno-reference.html (if component shas changed)

Find this line in `~/juno-reference.html`:

```js
const CHANGED_COMPONENTS = []
```

Replace the `[]` with an array of change objects for every added, modified, or removed component:

```js
const CHANGED_COMPONENTS = [
  { name: "ComponentName", change: "added" },
  { name: "ComponentName", change: "modified" },
  { name: "ComponentName", change: "removed" },
]
```

Each changed component will then show a 🐱 indicator on its badge in the reference site.

### 1D-iv — Reconcile hard-rejects

If any component or UX-doc sha changed, lift the matching hard-rejects. Drop entries in `juno_review_store.json` (`hardRejected`) whose `sb`/`ux` name is in the changed set, so dismissed findings can surface again. See [[project-juno-review-store]].

### 1D-v — Write on-page change entries

Append every added/removed/modified component or doc to `juno_changes.json`. See [[project-juno-sync-mechanism]] for the full entry shape and deduplication rules.

Entry shape:

```json
{
  "id": "kind:name:newSha",
  "kind": "component" | "ux",
  "name": "ComponentName or filename.md",
  "status": "added" | "modified" | "removed",
  "oldSha": "...",
  "newSha": "...",
  "summary": "one-line description of what changed",
  "url": "https://github.com/cloudoperators/juno/...",
  "date": "YYYY-MM-DD",
  "seen": false
}
```

Rules:

- Dedupe by `id` — if an entry with the same `id` already exists, preserve its `seen` value and update other fields.
- A no-change run only updates `lastChecked` and leaves prior unseen entries in place.

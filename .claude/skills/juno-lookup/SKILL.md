---
name: juno-lookup
description: "Juno component and pattern lookup skill. Ensures every component, pattern, or concept search is complete, transparent, and cross-referenced across the entire repo. Announces every fetch, lists ALL props, stories, imports, and UX doc mentions. Run after juno-sync. Triggers: 'look up [component]', 'what props does [component] have', 'find the Juno pattern for X', 'check Juno docs for X', or invoked automatically as the second step in any Juno skill chain."
version: 1.0.0
---

# juno-lookup — Juno Component and Pattern Lookup

Ensures every component, pattern, or concept search is complete, transparent, and cross-referenced across the entire Juno repo. Always run after `juno-sync`. Never skip or abbreviate any step.

**Why full lookups matter:** Stale memory, partial props, and missed cross-references have caused incorrect guidance. Full transparency on every lookup prevents this.

---

## How to use this skill

1. Run **juno-sync** first (if it has not already run this session).
2. Identify what needs to be looked up from the user's request or the screenshots being reviewed.
3. Run Steps 2A through 2G for every component, pattern, or concept in scope.
4. Present all findings before producing any answer, code, or design decision.

---

## Step 2A — Announce every fetch

Before each GitHub request, output one line:

> `🔍 Fetching: [full URL]`

Never silently fetch. The user must see exactly what is being looked up and where from.

---

## Step 2B — Components: list ALL props

Fetch both files for the component:

> `🔍 Fetching: https://raw.githubusercontent.com/cloudoperators/juno/main/packages/ui-components/src/components/{ComponentName}/{ComponentName}.tsx`

> `🔍 Fetching: https://raw.githubusercontent.com/cloudoperators/juno/main/packages/ui-components/src/components/{ComponentName}/{ComponentName}.stories.tsx`

List every prop in a complete table:

| Prop | Type | Default | Required | Description |
| ---- | ---- | ------- | -------- | ----------- |

Rules:

- Never summarise. Never omit a prop.
- Every prop present in the source file must appear in the table.
- Include deprecated props — mark them `(deprecated)` in the Description column.
- Include props inherited via `...rest` or spreads if documented.

---

## Step 2C — All stories for this component

List every named export from the stories file and what variant or state it demonstrates:

| Story name | Variant / state demonstrated |
| ---------- | ---------------------------- |

---

## Step 2D — Cross-reference: everything that imports or uses this component

Search the entire repo for `import.*{ComponentName}`. Cover:

- Other component source files (composition and dependency relationships)
- Story files from other components (usage examples in context)
- UX doc files and any README that imports or names the component
- Pattern pages and index files

> `🔍 Fetching: https://api.github.com/search/code?q=import+{ComponentName}+repo:cloudoperators/juno`

List each result:

`[file path] — [relevant import line]`

---

## Step 2E — UX doc and pattern mentions

Search `docs/ux/` for every mention of the component name or concept. Also check top-level `README.md` files.

For each hit:

`[doc file] > [section heading] — [short excerpt]`

---

## Step 2F — Pattern or concept searches (when query is not a single component)

When the query is a pattern or concept (for example: "empty state", "confirmation modal", "loading states", "error handling", "role-based rendering", "pagination") — search ALL of:

- Every file in `docs/ux/`
- Every component source and story under `packages/ui-components/src/components/`
- Every `README.md` in the repo
- Any `CHANGELOG.md` referencing the pattern
- GitHub search API for broad-text searches

> `🔍 Fetching: https://api.github.com/search/code?q={concept}+repo:cloudoperators/juno`

List every hit. Synthesise only after all results are shown.

---

## Step 2G — Present findings before answering

Output the complete prop table, stories list, cross-references, and doc mentions **before** incorporating findings into any answer, code, or design decision.

Never answer from memory alone when a live lookup is possible. Memory is a starting point, not a substitute for the live repo.

---

## Step 2H — docs/ux/ full inventory (reference)

The `docs/ux/` directory is the source of truth for Juno UX guidance. Current live file set (shas confirmed by juno-sync each session):

| File                                         | Topic                                 | Memory file                    |
| -------------------------------------------- | ------------------------------------- | ------------------------------ |
| `0_contents.md`                              | Table of contents / index             | —                              |
| `introduction.md`                            | Introduction                          | —                              |
| `core-concepts.md`                           | Core concepts                         | `juno_ux_foundations.md`       |
| `foundations.md`                             | Foundations                           | `juno_ux_foundations.md`       |
| `getting-started-with-juno-ui-components.md` | Getting started                       | —                              |
| `glossary.md`                                | Glossary of terms                     | `juno_ux_foundations.md`       |
| `resources.md`                               | Resources / links                     | `juno_reference.md`            |
| `semantic-variants.md`                       | info/success/warning/error/danger     | `juno_ux_foundations.md`       |
| `the-appshell.md`                            | AppShell structure                    | `juno_ux_foundations.md`       |
| `layout-and-application-structure.md`        | Layout + app structure                | `juno_ux_foundations.md`       |
| `layout-fundamentals.md`                     | Layout fundamentals                   | `juno_ux_foundations.md`       |
| `juno-layout.md`                             | Juno layout                           | `juno_ux_foundations.md`       |
| `embedded-application-layout.md`             | Embedded app layout                   | `juno_ux_foundations.md`       |
| `legacy-application-layout.md`               | Legacy app layout                     | `juno_ux_foundations.md`       |
| `page-and-user-flow.md`                      | Page + user flow                      | `juno_ux_foundations.md`       |
| `page-layout-elements.md`                    | Page layout elements                  | `juno_ux_foundations.md`       |
| `page-content-area.md`                       | Content area                          | `juno_ux_foundations.md`       |
| `page-header.md`                             | Page header                           | `juno_ux_foundations.md`       |
| `page-footer.md`                             | Page footer                           | `juno_ux_foundations.md`       |
| `page-level-actions.md`                      | Page-level actions                    | `juno_ux_patterns.md`          |
| `navigation.md`                              | Navigation                            | `juno_ux_foundations.md`       |
| `navigation-fundamentals.md`                 | Navigation fundamentals               | `juno_ux_foundations.md`       |
| `navigation-side-navigation.md`              | Side navigation                       | `juno_ux_foundations.md`       |
| `datagrid.md`                                | DataGrid pattern                      | `juno_ux_patterns.md`          |
| `modals.md`                                  | Modals pattern                        | `juno_ux_patterns.md`          |
| `messages-and-notifications.md`              | Messages + notifications              | `juno_ux_patterns.md`          |
| `popup-and-overflow-menus.md`                | Popup / overflow menus                | `juno_ux_patterns.md`          |
| `forms.md`                                   | Forms                                 | `juno_ux_patterns.md`          |
| `inline-adding-editing-and-deleting.md`      | Inline add/edit/delete                | `juno_ux_patterns.md`          |
| `wizard.md`                                  | Wizard pattern                        | `juno_ux_patterns.md`          |
| `box.md`                                     | Box                                   | `juno_ux_patterns.md`          |
| `sign-in.md`                                 | Sign-in                               | `juno_ux_patterns.md`          |
| `authentication-and-access.md`               | Auth + access                         | `juno_ux_patterns.md`          |
| `ui-for-unauthorized-users.md`               | Unauthorized users                    | `juno_ux_patterns.md`          |
| `ux-patterns.md`                             | UX patterns index                     | `juno_ux_patterns.md`          |
| `interaction-guidelines.md`                  | Interaction guidelines                | `juno_ux_design_guidelines.md` |
| `application-design-guidelines.md`           | Application design guidelines         | `juno_ux_design_guidelines.md` |
| `ux-writing-content-design.md`               | UX writing / content design (ToV)     | `juno_ux_design_guidelines.md` |
| `error-handling-loading-empty-states.md`     | Error handling, loading, empty states | `juno_ux_design_guidelines.md` |
| `transient-states-and-progress.md`           | Transient states + progress           | `juno_ux_design_guidelines.md` |
| `accessibility.md`                           | Accessibility                         | `juno_ux_design_guidelines.md` |
| `versioning-and-deprecation-policy.md`       | Versioning + deprecation policy       | `juno_ux_design_guidelines.md` |
| `images/`                                    | Image assets (not a doc — ignore)     | —                              |

If a live fetch returns a file NOT in this table, treat it as ADDED, read it, and add it to the mapping. If a file listed here is missing from the live fetch, treat it as REMOVED.

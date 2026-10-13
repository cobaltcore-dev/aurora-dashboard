---
name: screenshot-review
description: "This skill should be used when the user asks to 'review UI screenshots', 'review this screen', 'check this screenshot', 'give feedback on this design', 'annotate this screenshot', 'review Aurora UI', or wants a structured developer-ready markdown review report of Aurora/Juno UI screenshots. Produces numbered, tagged findings with Juno component names and ⚠️ Needs: flags."
version: 1.0.0
---

Review UI screenshots and produce a structured developer-ready markdown report.

## Before You Start — Run core skill: juno-live-ref

Invoke the `juno:juno-live-ref` skill (via the Skill tool) before reading any screenshot.

This runs both mandatory protocols:

- **Protocol 1** — Change detection: fetch GitHub API shas, output visual diff or unchanged one-liner
- **Protocol 2** — Component lookup: for every component identified in the screenshots, announce each fetch, list ALL props, cross-reference the entire repo, search everywhere for patterns/concepts

Do not skip or abbreviate either protocol.

---

## Input

One or more screenshots, plus notes provided either:

- As annotation boxes visible in the screenshot (red "Changes" or teal "Question")
- As text typed in the chat by the user

Read both sources. Apply the same rules to both.

## Output

Write the review to a markdown file using the Write tool.

Name the file `review-[screen-name]-[YYYY-MM-DD].md` using today's date and the main screen name from the screenshots (lowercase, hyphens, no spaces).

Write the file to `tmp/aurora-reviews/` (a gitignored scratch dir — create it if absent; not the
repo root). After writing, confirm the file path to the user.

---

### [App] — [Screen or modal title as shown in the UI]

**Location:** `breadcrumb › path › as › visible › in › screenshot`  
**Annotation:** [Changes | Question] · [Date from annotation, or omit if notes came from chat]

---

1. **[Short title of the change]**  
   [Description of current state, desired state, triggering condition if relevant, and Juno component + prop if identifiable.]  
   ⚠️ _Needs: [what is missing for a developer to action this — omit line if nothing is missing]_

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

| What you see                              | Component                                  | Fix                                       |
| ----------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| Coloured message box                      | `<Message variant="info\|warning\|error">` | Replace with `<p>`                        |
| Teal/primary button on destructive action | `<Button variant="primary">`               | Change to `variant="primary-danger"`      |
| Wide modal needed                         | `<Modal>`                                  | Add `size="xl"` or `size="2xl"`           |
| Row action menu item                      | `<PopupMenu.Item>`                         | Update `label` prop                       |
| Button in progress state                  | `<Button>`                                 | Add `progress={true} progressLabel="..."` |

Full Juno component API is in memory: [[juno-storybook-full-analysis]]

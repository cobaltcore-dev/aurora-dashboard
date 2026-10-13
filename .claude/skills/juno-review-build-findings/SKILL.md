---
name: juno-review-build-findings
description: "Step 3C of the Juno review chain. Takes the recorded inputs (3A) and identified components (3B) and builds the structured finding list. Assigns tags (Aurora/Juno/Design/Bug), annotation types (Changes/Question), component references, and ⚠️ Needs flags. Triggered automatically after juno-review-identify-components."
version: 1.0.0
---

# juno-review-build-findings — Build the Finding List (Step 3C)

Third step of the Juno screenshot review chain. Turns raw inputs into a structured, developer-actionable finding list.

**Position in chain:** `juno-sync` → `juno-lookup` → `juno-review-read-inputs` → `juno-review-identify-components` → **`juno-review-build-findings`** → `juno-review-write-report` → `juno-review-confirm-output`

---

## Process each input

Work through every item recorded in Step 3A (annotation boxes and chat notes) one at a time.

### 3C-1 — Split multi-issue annotations

A single annotation box may contain multiple issues. Treat each issue as a **separate numbered finding**. Do not bundle them.

### 3C-2 — Extract location breadcrumb

Read the breadcrumb visible in the screenshot (top of the page and/or within a modal). Record it as:

`App name › Section › Sub-section › Screen or modal title`

### 3C-3 — Assign a tag

| Tag      | When to use                                                                       |
| -------- | --------------------------------------------------------------------------------- |
| `Aurora` | Product-level fix in the Aurora application — the default when no tag is stated   |
| `Juno`   | Design system task — a change needed in the Juno component library, not in Aurora |
| `Design` | Visual or layout decision that does not map directly to a component change        |
| `Bug`    | Broken behaviour, incorrect rendering, or regression                              |

### 3C-4 — Assign annotation type

| Type       | Source                                                      |
| ---------- | ----------------------------------------------------------- |
| `Changes`  | Red annotation box or a confirmed instruction from the user |
| `Question` | Teal annotation box or an open question from the user       |

### 3C-5 — Name the Juno component

Use the component list from `juno-review-identify-components` (Step 3B) and the `juno-lookup` results. Name the specific component and relevant prop where possible.

Examples:

- `<Button variant="primary">` → should be `variant="primary-danger"`
- `<Message variant="info">` → should be `variant="warning"`
- `<Modal>` → needs `size="xl"`

### 3C-6 — Check developer completeness

After writing each finding, check whether a developer has enough context to act. Flag anything missing with `⚠️ Needs:`.

Check for:

- Current state described?
- Desired state described?
- Triggering condition or context clear?
- Component and prop identified?
- Exact replacement copy included (if the finding is a text change)?

If nothing is missing, omit the `⚠️ Needs:` line entirely.

---

## Finding format

Each finding takes this shape:

```
[number]. **[Short title — 4-8 words, describes the change]**
   [One or two sentences: current state, desired state, triggering condition if relevant, component + prop.]
   ⚠️ Needs: [what is missing — omit this line if nothing is missing]
```

Rules:

- Be brief and concise. One or two sentences per finding is enough.
- Only report what is actually visible or stated. Do not invent issues.
- If you spot something that looks like a problem but was not annotated, you may include it — but clearly label it as a suggestion: `💡 Suggestion:`
- Use the exact copy from the annotation when replacement text is provided.

---

## Grouping by tag

Collect all findings and group them by tag in this order:

1. Aurora findings
2. Juno findings
3. Design findings
4. Bug findings

Number findings continuously across all groups (1, 2, 3 ... — do not restart per group).

Omit any group that has no findings.

Juno findings get an additional callout line below the heading:

> Juno tag — design system task, not a product fix.

---

## Output of this step

The complete grouped finding list, held in working context and ready to be written to a file by `juno-review-write-report`.

Output the full list before proceeding to `juno-review-write-report`.

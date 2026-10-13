---
name: juno-review-write-report
description: "Step 3D of the Juno review chain. Takes the completed finding list from juno-review-build-findings and writes it to a named markdown file in the current working directory. Handles file naming, header structure, and section formatting. Triggered automatically after juno-review-build-findings."
version: 1.0.0
---

# juno-review-write-report — Write the Report (Step 3D)

Fourth step of the Juno screenshot review chain. Writes the structured finding list to a markdown file.

**Position in chain:** `juno-sync` → `juno-lookup` → `juno-review-read-inputs` → `juno-review-identify-components` → `juno-review-build-findings` → **`juno-review-write-report`** → `juno-review-confirm-output`

---

## File naming

`review-[screen-name]-[YYYY-MM-DD].md`

- `[screen-name]`: main screen or modal name from the screenshots — lowercase, hyphens, no spaces (e.g. `create-image-modal`, `floating-ips-list`, `hsm-partition-dashboard`)
- `[YYYY-MM-DD]`: today's date
- Write to the current working directory

---

## File structure

```markdown
### [App name] — [Screen or modal title as shown in the UI]

**Location:** `breadcrumb › path › as › visible › in › screenshot`
**Annotation:** [Changes | Question] · [Date from annotation, or omit if notes came from chat]

---

## Aurora

1. **[Short title]**
   [Current state. Desired state. Triggering condition if relevant. Component + prop.]
   ⚠️ _Needs: [missing context — omit line if nothing is missing]_

2. **[Short title]**
   ...

---

## Juno

> Juno tag — design system task, not a product fix.

3. **[Short title]**
   ...

---

## Design

4. **[Short title]**
   ...

---

## Bug

5. **[Short title]**
   ...
```

---

## Writing rules

1. Include only sections that have findings — omit empty sections entirely.
2. Numbering is continuous across all sections (1, 2, 3 ... — never restart per section).
3. Be brief and concise — one or two sentences per finding.
4. When replacement copy is provided in the annotation, include it verbatim.
5. If a finding is a Question (not a confirmed change), say so explicitly at the start of the finding text.

---

## STRICT RULE — no invented findings

- **Only write a finding if it is directly supported by an annotation box in the screenshot OR an explicit note typed in chat.**
- If you observe something that looks wrong but has no annotation, you MAY note it — but you MUST prefix it with: `[Suggestion — not annotated]` and state what you observed.
- Never infer intent. Never assume a change was requested.
- If the annotation is ambiguous, write what it says and mark it `⚠️ Needs: clarification`.

---

## Write the file

Use the Write tool. Do not print the file contents to chat — just write it and pass control to `juno-review-confirm-output`.

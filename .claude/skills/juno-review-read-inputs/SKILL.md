---
name: juno-review-read-inputs
description: "Step 3A of the Juno review chain. Reads and records all inputs before any finding is written — annotation boxes visible in the screenshot (Changes / Question) and notes typed in chat. Triggered automatically as the first step of juno-review-build-findings or juno-review. Do not paraphrase annotation text."
version: 1.0.0
---

# juno-review-read-inputs — Read All Inputs (Step 3A)

First step of the Juno screenshot review chain. Read everything before writing a single finding.

**Position in chain:** `juno-sync` → `juno-lookup` → **`juno-review-read-inputs`** → `juno-review-identify-components` → `juno-review-build-findings` → `juno-review-write-report` → `juno-review-confirm-output`

---

## What to read

### Source 1 — annotation boxes in the screenshot

Scan every screenshot for visible annotation boxes. Two types exist:

| Box colour | Label        | Meaning                                                     |
| ---------- | ------------ | ----------------------------------------------------------- |
| Red        | **Changes**  | Confirmed change request — developer must action it         |
| Teal       | **Question** | Open question — a decision is still needed before actioning |

For each box, record:

- Box type (Changes or Question)
- Exact text content — copy word for word, do not paraphrase or summarise
- Date shown in the annotation, if visible

### Source 2 — notes typed in the chat

Read any notes the user has typed in the current message alongside the screenshots. Apply the same rules: record exact wording, do not paraphrase.

---

## Rules

1. **Read all annotation boxes before writing anything.** A single box may contain multiple issues — do not miss any.
2. **Never paraphrase.** If the annotation says "Change button label to 'Save changes'", that exact phrase must appear in the finding, not a rephrased version.
3. **Both sources are equal.** Chat notes carry the same weight as annotation boxes.
4. **Record, do not interpret yet.** This step is pure input gathering. Analysis and component identification happen in the next steps.

---

## Output of this step

An internal record (held in working context, not written to a file) containing:

```
INPUTS RECORDED
---------------
Annotation boxes: [N found]
  [1] Type: Changes | Date: [date or "not shown"] | Text: "[exact text]"
  [2] Type: Question | Date: [date or "not shown"] | Text: "[exact text]"
  ...

Chat notes: [present | none]
  "[exact text of chat notes]"
```

Output this summary before proceeding to `juno-review-identify-components`.

---
name: juno-review-confirm-output
description: "Step 3E of the Juno review chain. Final step: confirms the file path of the written review report to the user. Triggered automatically after juno-review-write-report."
version: 1.0.0
---

# juno-review-confirm-output — Confirm Output (Step 3E)

Final step of the Juno screenshot review chain. Tells the user where the review file was written.

**Position in chain:** `juno-sync` → `juno-lookup` → `juno-review-read-inputs` → `juno-review-identify-components` → `juno-review-build-findings` → `juno-review-write-report` → **`juno-review-confirm-output`**

---

## What to output

After `juno-review-write-report` has written the file, output exactly one confirmation line:

> `Review written to: [full absolute file path]`

Then stop. Do not summarise the findings, do not reprint the file contents, do not add commentary.

---

## If the write failed

If the Write tool returned an error in the previous step:

1. State what went wrong in one sentence.
2. State the path that was attempted.
3. Suggest a fix (e.g. the directory does not exist, a file with that name already exists).

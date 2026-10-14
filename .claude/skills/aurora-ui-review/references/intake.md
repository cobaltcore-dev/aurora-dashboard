# Intake

Ask for everything that is missing in **one** message, in the user's language. Don't ask for what the conversation already contains.

## Questions

1. **Epic.** Paste the epic description (or a readable link). Required: the review is measured against it.
2. **Resource and pages.** Which resource and which pages (list, details, modals, navigation, card)? Should I review the changes on the current branch, or specific files?
3. **Base for the diff.** Compare against `origin/main`, or another branch or commit?
4. **UI mode.** Is this change read-only (list and details only), or full CRUD? Ask only if the epic doesn't make clear which part is in scope.
5. **Design (optional).** A Figma link or screenshots of the expected pages.
6. **Decisions after the epic (optional).** Design reviews, Slack threads, changed requirements. Treat these as requirements, and cite them in the report.

## Derive yourself, then confirm

- **File list.** Show it to the user grouped as routes / components / hooks / modals / navigation / tests / i18n / other:

  ```bash
  git diff --name-only <base>...HEAD -- packages/aurora/src/client
  git status --porcelain -- packages/aurora/src/client
  ```

- **Juno version:** `scripts/locate_juno.sh`.
- **Applicable Juno docs:** `juno-guidelines-map.md`. List them in the report under "Sources".

## When to stop and ask during the review

- The epic and the design contradict each other, or the design shows data the BFF doesn't provide.
- A requirement can be read two ways, and the readings lead to different verdicts.
- The Juno guidelines and the repo rules (`.github/copilot-instructions.md`) contradict each other.
- A Juno doc can't be fetched and the check depends on it. Mark the check "not verified"; don't judge from memory.

Record each as an Open Question in the report, and continue with everything else.

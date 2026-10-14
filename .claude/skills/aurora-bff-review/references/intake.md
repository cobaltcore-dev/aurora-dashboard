# Intake

Ask for everything that is missing in **one** message, in the user's language. Don't ask for what the conversation already contains.

## Questions

1. **Epic.** Paste the epic description (or a readable link). Required: the review is measured against it.
2. **Resource and scope.** Which resource (e.g. Neutron ports)? Should I review the changes on the current branch, or specific files?
3. **Base for the diff.** Compare against `origin/main`, or another branch or commit?
4. **Anything else that counts as a requirement.** For example, design review decisions or comments from colleagues that changed the epic's requirements. Treat these as requirements too, and cite them as such in the report.

## Derive yourself, then confirm

- **File list.** List the in-scope files and show them to the user before the analysis starts, grouped as types / helpers / routers / tests / docs / other:

  ```bash
  git diff --name-only <base>...HEAD -- packages/aurora/src/server packages/aurora/docs
  git status --porcelain -- packages/aurora/src/server packages/aurora/docs   # uncommitted changes
  ```

  If the diff contains changes to shared helpers or other resources, ask whether they are in scope.

- **Server module and tRPC namespace,** from the file paths.
- **OpenStack service, API version and endpoints,** from the epic. Ask only if the epic doesn't make them clear.

## When to stop and ask during the review

- **A requirement can be read two ways, and the readings lead to different verdicts.**
- **The epic and the OpenStack docs contradict each other** (e.g. the epic expects a field the API doesn't return).
- **The docs are unavailable** (fetch fails) and the check depends on them. Don't fall back to memory for a verdict; mark the check "not verified" and say why.
- **The intended behaviour of the code is unclear**, and there's no test, comment or doc to settle it.

Record each of these as an Open Question in the report, so the analysis doesn't stall: continue with everything else.

---
name: create-pr
description: >-
  Sync the branch with main and walk through conflict resolution and the
  merge commit, then generate a PR description from
  .github/pull_request_template.md and open a draft PR on GitHub via the gh
  CLI. Use when the user asks to open/create a PR, write a PR description, or
  sync/update a PR branch with main.
---

# Create PR

Automates this repo's PR flow: sync with `main` → resolve conflicts → merge
commit (hooks run lint/typecheck/i18n/format) → description → draft PR.

## Hard rules

- Never run `git push --force`, `git reset --hard`, or skip hooks (`--no-verify`).
- Confirm with the user before creating the merge commit (Step 1). Steps 2
  and 3 (description, push, draft PR) run automatically without pausing for
  approval.
- Never resolve `.po` file conflicts or conflicts outside `locales/` yourself
  — those require the user's judgment. Surface them and wait.

## Step 1 — Sync with main

1. `git status --porcelain` — if there are uncommitted changes (staged or
   unstaged), stop and tell the user to commit or stash them first. This
   repo's pre-commit hook ends with `git add -u`, which stages _every_
   dirty tracked file — if stray uncommitted changes are still sitting in
   the working tree when the merge commit happens (step 5 below), they get
   silently swept into it.
2. Run `git fetch origin main` and `git pull origin main`.
3. No conflicts → done, move to Step 2.
4. Conflicts → list them with `git diff --name-only --diff-filter=U` and sort
   into three buckets:

   **a. `**/locales/**/messages.ts`**
   Confirm with the user, then for each:

```bash
git rm <path/to/locales/<lang>/messages.ts>
```

Once all conflicted `messages.ts` files are removed, regenerate them:

```bash
pnpm check-i18n
git add packages/aurora/src/locales
```

**b. `**/locales/**/\*.po`**
Do not touch. Tell the user these need manual resolution and wait for
them to resolve and `git add` the files themselves.

**c. Anything else**
List the files and wait for the user to resolve them manually. Don't
guess at business-logic conflict resolution.

5. Once the user confirms everything is resolved, verify with
   `git status` (no remaining `U` entries), confirm with the user, then:

```bash
git commit
```

This runs the pre-commit hook (`lint`, `typecheck`, i18n extract/compile,
`format`) — let it run. If it fails, surface the failure and let the user
decide the fix; never bypass with `--no-verify`.

## Step 2 — Generate the PR description

### Step 2.1 — Analyze similar PRs for style

Before writing the description, look at recent merged/open PRs to understand the team's style:

```bash
gh pr list --limit 5 --state all -R <repo>
```

Pick 1-2 similar PRs (same area of codebase) and read their descriptions to understand:

- How detailed the "Changes Made" section is
- Whether they use subsections (Core Changes, DataGrid, Permissions, etc.)
- Whether they include "Key Technical Details" section
- How they link issues
- Level of technical detail expected

### Step 2.2 — Deep analysis of changes

1. Read `.github/pull_request_template.md`.
2. **Thoroughly inspect the branch's changes**:
   - `git log main..HEAD` — read full commit messages, not just summaries
   - `git diff main...HEAD --stat` — understand scope of changes
   - `git diff main...HEAD` — read actual code changes to understand:
     - New hooks/utilities added
     - Component refactoring details
     - Permission checks added
     - Test updates
     - Config/infrastructure changes

3. **Identify the architecture and patterns**:
   - New hooks or utilities introduced (e.g., `useSecurityGroupPermissions`, `urlHelpers.ts`)
   - React Query configuration details
   - Permission structure (map permissions to capabilities)
   - Why certain decisions were made (e.g., why files were deleted, why refactoring was needed)

### Step 2.3 — Structure the description

Fill in the template following this structure:

**Summary**:

- 2-3 sentences explaining the high-level purpose
- Mention key architectural additions (new hooks, utilities, patterns)

**Changes Made** — Organize into logical subsections:

Structure based on the type of changes:

- **Infrastructure** / **Core Changes**: New hooks, utilities, helpers
- **Feature Implementation**: Main feature code (DataGrid, Permissions Integration, etc.)
- **Component Updates**: List affected components by category (Details view, List view, Modals, etc.)
- **Test Updates**: Which test files were updated
- **Cleanup**: What was deleted/removed and why
- **i18n** / **Localization**: Translation updates

For each subsection, be specific:

- Name the actual files/hooks/components
- Explain what they do and why they're needed
- Include implementation details (e.g., "debounced search with 500ms delay", "3-zone toolbar pattern")

**Related Issues**:

- Link to specific GitHub issues (search commit messages for issue numbers)
- Don't leave placeholder if you find real issues
- Format: `Fixes #123`, `Closes #456`, or descriptive links

**Key Technical Details** (add this section if changes involve architecture):

Include this section when:

- New patterns/hooks are introduced
- Permission/auth structure is changed
- React Query or state management is configured
- OpenStack/API integration details matter
- Architectural decisions need explanation

Include:

- Permission structure with full mapping
- React Query/cache configuration
- Why architectural decisions were made
- API/backend integration details

**Testing Instructions**:

- Keep template defaults (`pnpm i`, `pnpm run test`)
- Add specific manual testing steps if needed:
  - Test with different permission levels
  - Test specific UI interactions
  - Test edge cases introduced by changes

**Checklist**:

- Check off all items (`- [x]`)

### Step 2.4 — Quality check

Before finalizing, verify:

- ✅ Changes Made has subsections (not just bullet points)
- ✅ Specific file/hook/component names are mentioned
- ✅ Technical implementation details are included
- ✅ Related Issues are filled (or explicitly state "None")
- ✅ Key Technical Details section exists if applicable
- ✅ Description explains "why" not just "what"

4. Move straight to Step 3 — no need to pause for approval here.

## Step 3 — Create the draft PR

1. Check `gh --version`. If missing, tell the user and stop here — offer the
   generated description for them to paste into GitHub manually. Don't
   install `gh` yourself.
2. Check `gh auth status`. If not authenticated, same as above — hand off
   the description and stop.
3. Check whether a PR already exists for this branch:
   `gh pr list --head <branch> --state open`. If one does, tell the user
   and ask whether they want the existing PR's description updated
   (`gh pr edit <number> --body "..."`) instead of creating a new one —
   `gh pr create` will just fail here otherwise.
4. If the branch has no upstream or has unpushed commits,
   `git push -u origin <branch>` (regular push, never `--force`).
5. Run, passing the body via a heredoc rather than an inline string — the
   description is multi-paragraph markdown (headers, checklist items) and
   a quoted CLI argument is an easy way to mangle it on quote/escaping edge
   cases:

```bash
gh pr create --draft --base main --title "<conventional-commit-style title>" --body "$(cat <<'EOF'
<description>
EOF
)"
```

6. Report the PR URL and the description used back to the user. Related
   Issues stays empty — that's expected.

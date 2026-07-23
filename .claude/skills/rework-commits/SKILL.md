---
name: rework-commits
description: >-
  Rework the current branch's most recent commit into a sequence of small,
  semantic, reviewable commits ordered database/schema first, backend second,
  frontend last, with a recovery point and a before/after diff check so
  nothing is lost. Optionally rebase on main first. Use when the user asks
  to split a commit into multiple commits, clean up history for review, or
  reorganize a messy commit into logical commits.
---

# Rework commits

Split a branch's changes into small, self-contained commits for human
review, without losing or altering anything in the diff.

## Hard rules

- Never run `git push --force` or `git reset --hard` on the user's actual
  branch without having created the backup branch first (Step 2).
- Always use `--no-verify` flag when committing to skip pre-commit hooks.
  This is necessary because hooks often check the entire project, not just
  staged files, which blocks creating partial commits during rework.
- Prepend `GIT_EDITOR=true` to any git command that could open an editor
  (`git commit` without `-m`, `git rebase --continue`, `git merge` without
  `-m`) — the Bash tool is non-interactive and will hang waiting for it.
  Use `git --no-pager diff` / `git --no-pager log` for anything that would
  otherwise stream to a pager, for the same reason.
- If final validation (Step 7) fails, stop immediately, tell the user, and
  give them the Step 2 backup branch name. Never force past a mismatched diff.

## Step 1 — Preflight

1. `git status --porcelain` — abort if there are any uncommitted changes
   (staged or unstaged). This skill only reworks commits already on the
   branch; tell the user to commit or stash first and stop.

2. **Optional rebase check:** Ask the user if they want to rebase on main first.
   Rebasing ensures the branch is up-to-date and makes it easier to see which
   changes are actually new. If the user says yes:

```bash
git fetch origin main
git rebase origin/main
```

If conflicts occur during rebase, stop and tell the user to resolve them
manually. Once resolved, they can re-run this skill.

**Note:** Rebasing is not required for rework-commits to work. The skill
can split commits whether the branch is rebased or not. However, rebasing
first makes it clearer which commits contain the work to be split.

3. Determine the base reference for diff comparison:
   - If currently at HEAD (no specific commit provided), use HEAD's parent: `HEAD^`
   - This ensures we only rework the most recent commit's changes
   - Store this as BASE_REF for use in later steps

4. Check whether the pre-commit hook auto-stages beyond what's staged —
   e.g. `git add -u` / `git add -A` / `git add .` after a format or
   lint-fix step. `.husky/pre-commit` is the common case, but any repo can
   wire a hook straight into `.git/hooks/pre-commit` (that file is never
   checked into git, so grep it directly rather than assuming a specific
   framework) — check both:

```bash
cat .husky/pre-commit 2>/dev/null
cat .git/hooks/pre-commit 2>/dev/null
```

**Note:** This check is informational only. Since we use `--no-verify` for all
commits during rework, auto-staging hooks won't affect the process. This step
helps understand the repo's hook setup for future reference.

## Step 2 — Save a recovery point

```bash
git branch rework-commits-backup/<branch-name>-<short-hash> HEAD
```

A bare hash from `git rev-parse` isn't enough — with no ref pointing at
it, it only survives via reflog (which expires, typically ~90 days) and
won't show up in `git branch` or GUI tools like Fork. A real branch is
durable and visible everywhere. Tell the user the backup branch name
before touching anything. Recovery, if needed later, is
`git reset --hard rework-commits-backup/<branch-name>-<short-hash>`.
Delete the backup branch once the user confirms the rework is good.

## Step 3 — Save the original diff

```bash
WORKDIR=$(mktemp -d /tmp/rework-commits.XXXXXX)
# Use HEAD^ as base to rework only the most recent commit
BASE_REF="HEAD^"
git --no-pager diff ${BASE_REF}..HEAD > "$WORKDIR/original-diff.patch"
echo "BASE_REF=$BASE_REF" > "$WORKDIR/base_ref"
wc -l "$WORKDIR/original-diff.patch"  # Show line count for confirmation
```

Use a fresh `mktemp -d` directory, not a fixed path like `/tmp/rework-commits` —
if this skill runs more than once concurrently (two repos, two terminals, a
background agent), a shared fixed path gets clobbered mid-run by the other
invocation, silently corrupting the Step 7 comparison. Keep `$WORKDIR` for
the rest of this run and reuse it in Steps 4, 7 and 8.

## Step 4 — Reset to base

```bash
BASE_REF=$(cat "$WORKDIR/base_ref" | cut -d= -f2)
git reset $BASE_REF
```

Unstages everything but leaves it all in the working tree.

## Step 5 — Plan the commits

Read through _all_ the changes carefully (`git --no-pager diff`). Plan a
breakdown into small, sequential, semantic commits and record one task per
commit with `TaskCreate` (update status with `TaskUpdate` as you go instead
of a scratch file) — if those tools aren't available in this environment,
just track the plan in your own reasoning instead. Order:

1. Database/schema changes
2. Backend
3. Frontend

## Step 6 — Create the commits

Work through the tasks one at a time using `git add` / `git add <path>` to
stage just that commit's files, then:

```bash
git commit --no-verify --signoff -m "<type>(<scope>): <summary>" -m "<why, for human reviewers>"
```

Always use `--no-verify` to skip pre-commit hooks. Hooks that run lint/typecheck
on the entire project will block partial commits, making it impossible to create
focused, incremental commits during the rework process.

Always use `--signoff` (or `-s`) to add a `Signed-off-by` line to the commit
message for DCO (Developer Certificate of Origin) compliance. This is required
by many projects' CI/CD checks.

Each commit should be self-contained and reviewable on its own. Write the
message for a human reviewer — explain _why_, not just _what_. After each
commit, confirm with `git show --stat HEAD` that only the intended files
were included before moving to the next task.

## Step 7 — Validate

```bash
BASE_REF=$(cat "$WORKDIR/base_ref" | cut -d= -f2)
GIT_EDITOR=true git --no-pager diff ${BASE_REF}..HEAD > "$WORKDIR/new-diff.patch"
diff "$WORKDIR/original-diff.patch" "$WORKDIR/new-diff.patch"
```

Empty output means nothing was lost or altered. Any output — stop, show
the user what differs, and give them the Step 2 backup branch name. If
`$WORKDIR` was somehow lost (new shell, crashed session), regenerate the
"original" side from the Step 2 backup branch instead of trusting a stale
file: `git diff ${BASE_REF}...rework-commits-backup/<branch-name>-<short-hash>`.

## Step 8 — Run hooks on final commit

After validation passes, run pre-commit hooks on the last commit to ensure
all checks pass:

```bash
git commit --amend --no-edit --signoff
```

This triggers all pre-commit hooks (lint, typecheck, format, translation
extraction, etc.) on the final state. The `--signoff` flag ensures the
`Signed-off-by` line is preserved (or added if somehow missing).

**Check for hook-generated changes:**

Pre-commit hooks may automatically modify files (e.g., format code, extract
translations, update lock files). After the amend completes successfully,
check if any files were modified:

```bash
git status --porcelain
```

If there are unstaged changes after the hook runs:

```bash
# Stage all changes made by hooks (e.g., updated translations, formatted code)
git add -A

# Amend the commit again to include these changes
git commit --amend --no-edit

# Verify working tree is now clean
git status --porcelain
```

Repeat until `git status --porcelain` returns empty output.

**If hooks fail:**

The commit will not be created and the user sees the error. Tell the user
what failed and that they can:

1. Fix the issues in the working tree (e.g., failing tests, lint errors)
2. Run `git add <fixed-files>` to stage fixes
3. Run `git commit --amend --no-edit` to retry (hooks run again)
4. Repeat until hooks pass
5. Or run `git reset --soft HEAD~1` to uncommit and re-split differently

**Why run hooks only on the last commit?**

- Intermediate commits may not pass checks (e.g., adding a component without
  its tests yet)
- What matters is that the final state is correct
- Running hooks on every commit during rework would block creating focused
  commits and defeat the purpose of splitting changes

## Step 9 — Generate changeset summary

After all commits are created and validated, generate a brief summary for the
user to use in their changeset description. List what was changed in a
bullet-point format, focusing on the key changes rather than repeating commit
messages verbatim.

```bash
# Get list of all commits created (from BASE_REF to HEAD)
BASE_REF=$(cat "$WORKDIR/base_ref" | cut -d= -f2)
git log ${BASE_REF}..HEAD --oneline
git diff ${BASE_REF}..HEAD --stat
```

**Format the summary as:**

- Start with a brief description of what the rework accomplished
- List key changes as bullet points with file paths or component names
- Focus on what was added, fixed, or refactored
- Keep it concise and changeset-ready

**Guardrails for summary generation:**

- **DO NOT mention tests** — exclude any references to test files, test coverage, or testing changes
- **DO NOT mention translations/i18n** — exclude references to PO files, translation updates, or locale changes
- **Focus on user-facing changes** — components, routes, utilities, API changes, bug fixes
- **Use technical but clear language** — file paths, component names, function names are good
- **Group related changes** — if multiple files serve one feature, describe the feature, not each file

**Example output format:**

```
## Summary for changeset

Fixed RouteError always showing default error message instead of tRPC messages from the response
- __root.tsx / $projectId.tsx — pass safeErrorMessage to RouteError for TRPCClientError to fix generic fallback text
- Remove errorComponent at projects/index.tsx and images.tsx, it was catching it instead of letting it bubble to ProjectErrorComponent
- Expand ErrorBoundary to wrap the search bar too so it's hidden on error instead of orphaned above the error message
- Remove unused invalidateCsrfToken function
```

## Step 10 — Cleanup

Once validation passes and summary is provided:

```bash
rm -rf "$WORKDIR"
git branch -D rework-commits-backup/<branch-name>-<short-hash>
```

Confirm with the user before deleting the backup branch.

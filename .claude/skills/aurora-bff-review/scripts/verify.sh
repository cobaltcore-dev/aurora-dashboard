#!/usr/bin/env bash
# Runs the checks for packages/aurora (the same checks as CI), on demand or after changes.
#
# Usage:
#   bash verify.sh                        # typecheck, lint, format (changed files), all tests
#   bash verify.sh -- <paths...>          # same, but run only the given test files/dirs
#   bash verify.sh --i18n                 # additionally lingui extract + compile (UI changes)
#   bash verify.sh --build                # additionally pnpm build (e.g. route changes)
#   bash verify.sh --fix                  # format changed files with prettier --write instead of --check
#   bash verify.sh --format-only          # only the format check
#   bash verify.sh --pr-title "<title>"   # additionally validate a PR title with commitlint
#   bash verify.sh --base <ref>           # base for "changed files" (default: merge-base with origin/main)
#
# "Changed files" = files changed on this branch since <base> + uncommitted + untracked files.
# Prettier checks the same extensions as the root `format:check` script and respects .prettierignore.
set -uo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
pkg="@cobaltcore-dev/aurora"
run_i18n=false
run_build=false
fix=false
format_only=false
pr_title=""
base=""
test_paths=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --i18n) run_i18n=true; shift ;;
    --build) run_build=true; shift ;;
    --fix) fix=true; shift ;;
    --format-only) format_only=true; shift ;;
    --pr-title) pr_title="${2:-}"; shift 2 ;;
    --base) base="${2:-}"; shift 2 ;;
    --) shift; test_paths=("$@"); break ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

cd "$root" || exit 1
failed=()

step() {
  local name="$1"; shift
  echo ""
  echo "=== $name ==="
  if "$@"; then
    echo "--- $name: OK"
  else
    echo "--- $name: FAILED"
    failed+=("$name")
  fi
}

changed_files() {
  local ref="$base"
  if [[ -z "$ref" ]]; then
    ref="$(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo HEAD)"
  fi
  {
    git diff --name-only --diff-filter=ACMR "$ref" 2>/dev/null
    git ls-files --others --exclude-standard
  } | sort -u | grep -E '\.(js|jsx|ts|tsx|md)$' | while read -r f; do [[ -f "$f" ]] && echo "$f"; done
}

format_step() {
  local files
  mapfile -t files < <(changed_files)
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No changed js/jsx/ts/tsx/md files."
    return 0
  fi
  echo "${#files[@]} changed file(s)"
  if $fix; then
    pnpm exec prettier --config ./.prettierrc --write "${files[@]}"
  else
    pnpm exec prettier --config ./.prettierrc --check "${files[@]}"
  fi
}

pr_title_step() {
  echo "$pr_title" | pnpm exec commitlint
}

if ! $format_only; then
  step "typecheck" pnpm --filter "$pkg" typecheck
  step "lint" pnpm --filter "$pkg" lint
fi

step "format$($fix && echo ' (fix)')" format_step

if ! $format_only; then
  if [[ ${#test_paths[@]} -gt 0 ]]; then
    # vitest runs from the package dir, so make paths relative to it
    rel=()
    for p in "${test_paths[@]}"; do rel+=("${p#packages/aurora/}"); done
    step "tests (${#rel[@]} path(s))" pnpm --filter "$pkg" exec vitest run "${rel[@]}"
  else
    step "tests" pnpm --filter "$pkg" test
  fi

  if $run_i18n; then
    step "i18n extract" pnpm --filter "$pkg" extract
    step "i18n compile" pnpm --filter "$pkg" compile
  fi

  if $run_build; then
    step "build" pnpm build
  fi
fi

if [[ -n "$pr_title" ]]; then
  step "PR title (commitlint)" pr_title_step
fi

echo ""
if [[ ${#failed[@]} -gt 0 ]]; then
  echo "FAILED: ${failed[*]}"
  $fix || [[ ! " ${failed[*]} " =~ " format " ]] || echo "Hint: run with --fix to format the changed files."
  exit 1
fi
echo "All checks passed."

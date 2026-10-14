#!/usr/bin/env bash
# Creates findings/ in the repo root and prints its path.
# By default the folder is added to .git/info/exclude (a local ignore that doesn't change the
# repo's .gitignore), because review reports are working documents.
# Pass --track to keep the reports visible to git instead (e.g. if the team commits them).
set -euo pipefail

track=false
[[ "${1:-}" == "--track" ]] && track=true

root="$(git rev-parse --show-toplevel)"
dir_name="findings"
mkdir -p "$root/$dir_name"

if ! $track; then
  exclude="$(git rev-parse --git-path info/exclude)"
  [[ "$exclude" = /* ]] || exclude="$root/$exclude"
  mkdir -p "$(dirname "$exclude")"
  touch "$exclude"
  if ! grep -qxF "/$dir_name/" "$exclude"; then
    printf '\n# review skill reports (local working documents)\n/%s/\n' "$dir_name" >> "$exclude"
    echo "Added /$dir_name/ to $exclude" >&2
  fi
fi

echo "$root/$dir_name"

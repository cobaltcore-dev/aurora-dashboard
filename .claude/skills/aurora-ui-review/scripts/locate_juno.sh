#!/usr/bin/env bash
# Prints the path and version of the @cloudoperators/juno-ui-components package used by packages/aurora.
# Usage: bash locate_juno.sh
#
# Component types are in <path>/build/components/<Name>/<Name>.component.d.ts.
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
pkg_dir=""

# 1. The package's own node_modules link (pnpm symlinks it into the .pnpm store)
link="$root/packages/aurora/node_modules/@cloudoperators/juno-ui-components"
if [[ -e "$link" ]]; then
  pkg_dir="$(cd "$link" && pwd -P)"
fi

# 2. Fallback: search the pnpm store (pick the version declared in packages/aurora/package.json if several exist)
if [[ -z "$pkg_dir" ]]; then
  wanted="$(grep -o '"@cloudoperators/juno-ui-components": *"[^"]*"' "$root/packages/aurora/package.json" | sed 's/.*: *"\(.*\)"/\1/' | tr -d '^~')"
  while IFS= read -r candidate; do
    dir="$(dirname "$candidate")"
    version="$(grep -m1 '"version"' "$candidate" | sed 's/.*: *"\(.*\)".*/\1/')"
    pkg_dir="$dir"
    [[ -n "$wanted" && "$version" == "$wanted" ]] && break
  done < <(find "$root/node_modules/.pnpm" -path "*node_modules/@cloudoperators/juno-ui-components/package.json" -maxdepth 6 2>/dev/null)
fi

if [[ -z "$pkg_dir" || ! -f "$pkg_dir/package.json" ]]; then
  echo "juno-ui-components not found. Run 'pnpm install' first." >&2
  exit 1
fi

version="$(grep -m1 '"version"' "$pkg_dir/package.json" | sed 's/.*: *"\(.*\)".*/\1/')"
echo "path:       $pkg_dir"
echo "version:    $version"
echo "components: $pkg_dir/build/components"

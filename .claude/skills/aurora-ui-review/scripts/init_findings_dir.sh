#!/usr/bin/env bash
# Creates the review-reports dir under tmp/aurora-reviews/ and prints its path.
# This is where every Aurora review artifact lives — the verify report, verifyUI, and the
# aurora-*-review reports all share it, so a single run's findings sit together. The path
# is already gitignored (.gitignore has `tmp/aurora-reviews/`), so no local-exclude hack
# is needed.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
dir="$root/tmp/aurora-reviews"
mkdir -p "$dir"

echo "$dir"

#!/bin/bash
# Check commit message format
# Usage: ./scripts/check-commit-msg.sh "feat(portal): add feature"

if [ -z "$1" ]; then
  echo "❌ Error: No commit message provided"
  echo "Usage: pnpm commit:check \"your commit message\""
  exit 1
fi

echo "$1" | pnpm dlx commitlint

#!/bin/bash
# Centralized Output Functions for DevStack CLI

# Source colors if not already loaded
if [ -z "$RED" ]; then
    _OUTPUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$_OUTPUT_DIR/colors.sh"
fi

# Output functions
info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

success() {
    echo -e "${GREEN}✓ ${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠ ${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1" >&2
}

# Print a formatted header with border
# Usage: print_header "Title"
print_header() {
    local title="$1"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    printf "║ %-58s ║\n" "$title"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
}

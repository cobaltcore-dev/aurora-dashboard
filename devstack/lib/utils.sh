#!/bin/bash
# General Utility Functions

# Source output functions if not already loaded
if ! declare -f error &>/dev/null; then
    _UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$_UTILS_DIR/output.sh"
fi

# Check if running in WSL2
# Usage: is_wsl2
# Returns: 0 if WSL2, 1 otherwise
is_wsl2() {
    if grep -qEi "(Microsoft|WSL)" /proc/version &> /dev/null; then
        return 0
    fi
    return 1
}

# Show WSL2 port forwarding reminder
# Usage: show_wsl2_reminder
show_wsl2_reminder() {
    if is_wsl2; then
        echo ""
        warning "Running under WSL2 detected!"
        info "To access DevStack from Windows, start port forwarding:"
        echo "   └─ ./scripts/wsl2-port-forward.sh"
        echo ""
    fi
}

# Confirmation dialog with yes/no prompt
# Usage: confirm "message"
# Returns: 0 for yes, 1 for no
confirm() {
    local message="$1"
    read -p "$message (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Confirmation dialog with default yes
# Usage: confirm_yes "message"
# Returns: 0 for yes, 1 for no
confirm_yes() {
    local message="$1"
    read -p "$message (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        return 1
    else
        return 0
    fi
}

# Cross-platform sed wrapper (handles macOS and Linux differences)
# Usage: fix_sed "s/pattern/replacement/" file
fix_sed() {
    local pattern="$1"
    local file="$2"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "$pattern" "$file"
    else
        # Linux
        sed -i "$pattern" "$file"
    fi
}

# Get script directory and change to project root
# Usage: navigate_to_root
# Sets: SCRIPT_DIR variable
navigate_to_root() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    cd "$SCRIPT_DIR/.." || exit 1
}

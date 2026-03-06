#!/bin/bash
# Environment Variable Loading and Validation

# Source output functions if not already loaded
if ! declare -f error &>/dev/null; then
    _ENV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$_ENV_DIR/output.sh"
fi

# Load .env file with fallback to .env.example
# Usage: load_env
# Returns: 0 on success, exits on failure
load_env() {
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            info ".env file not found, creating from .env.example..."
            cp .env.example .env
            success ".env file created with default values"
            echo ""
        else
            error ".env.example not found"
            exit 1
        fi
    fi

    source .env
}

# Load .env file (strict - no fallback)
# Usage: load_env_strict
# Returns: 0 on success, exits on failure
load_env_strict() {
    if [ ! -f .env ]; then
        error ".env file not found"
        exit 1
    fi

    source .env
}

# Ensure .env exists (with fallback)
# Usage: ensure_env
ensure_env() {
    load_env
}

# Get VM name from environment with default
# Usage: get_vm_name
# Returns: VM name (defaults to "devstack")
get_vm_name() {
    local vm_name="${VM_NAME:-devstack}"
    echo "$vm_name"
}

#!/bin/bash
# Cleanup script - destroys the DevStack VM

set -e

VM_NAME=${1:-devstack}

echo "⚠️  WARNING: This will delete the VM: $VM_NAME"
echo ""
read -p "Are you sure? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo "Deleting VM: $VM_NAME"
multipass delete "$VM_NAME"
multipass purge

echo "✅ VM deleted and purged"
echo ""
echo "To recreate, run: ./setup.sh"

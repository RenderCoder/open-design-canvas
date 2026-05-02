#!/usr/bin/env bash
# Alias for reset-beads.sh kept for backward compatibility.
# macOS /bin/bash 3.2 compatible.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SCRIPT_DIR/reset-beads.sh" "$@"

#!/usr/bin/env bash
# Alias for setup-tracking-epic.sh.
# macOS /bin/bash 3.2 compatible.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SCRIPT_DIR/setup-tracking-epic.sh" "$@"

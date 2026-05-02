#!/usr/bin/env bash
# Reset and rebuild the Open Design Canvas Beads task graph.
# macOS /bin/bash 3.2 compatible.
set -eu
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

bash "$SCRIPT_DIR/reset-beads.sh" --yes
bash "$SCRIPT_DIR/init-beads-tasks.sh" --force

echo "Beads task graph rebuilt."

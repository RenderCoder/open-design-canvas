#!/usr/bin/env bash
# Reset all Beads data for this repository, then run bd init again.
# macOS /bin/bash 3.2 compatible.
set -eu
set -o pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

YES="0"
if [ "${1:-}" = "--yes" ] || [ "${1:-}" = "--force" ] || [ "${ODC_RESET_BEADS:-}" = "1" ]; then
  YES="1"
fi

if [ "$YES" != "1" ]; then
  cat >&2 <<'MSG'
This will reset local Beads state for this repository.
It will archive existing Beads state under .ai/figma-codex/backups/ and remove generated Beads ID logs.
Run:
  bash .ai/figma-codex/scripts/reset-beads.sh --yes
MSG
  exit 2
fi

if ! command -v bd >/dev/null 2>&1; then
  echo "bd not found in PATH." >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".ai/figma-codex/backups/beads-reset-$STAMP"
mkdir -p "$BACKUP_DIR"

BACKED_UP="0"
for path in .beads beads.jsonl .beads.jsonl beads.db .beads.db; do
  if [ -e "$path" ]; then
    echo "Archiving $path to $BACKUP_DIR/"
    mv "$path" "$BACKUP_DIR/"
    BACKED_UP="1"
  fi
done

if [ "$BACKED_UP" = "0" ]; then
  echo "No existing Beads state found to archive."
fi

mkdir -p .ai/figma-codex/logs
rm -f .ai/figma-codex/.beads-tasks-initialized
rm -f .ai/figma-codex/logs/bd-id-*.txt
rm -f .ai/figma-codex/logs/bd-create-*.json
rm -f .ai/figma-codex/logs/bd-dep-*.log
rm -f .ai/figma-codex/logs/bd-track-*.log
rm -f .ai/figma-codex/logs/odc-epic-id.txt
rm -f .ai/figma-codex/logs/odc-tracking-epic-id.txt
rm -f .ai/figma-codex/logs/odc-tracking-epic-create.json

if [ -d .ai/figma-codex/logs/autopilot ]; then
  mv .ai/figma-codex/logs/autopilot "$BACKUP_DIR/autopilot-logs"
fi

echo "Running bd init..."
bd init

echo "Beads reset complete. Backup: $BACKUP_DIR"
echo "Next: bash .ai/figma-codex/scripts/init-beads-tasks.sh"

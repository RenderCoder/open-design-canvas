#!/usr/bin/env bash
# Install/refresh Open Design Canvas local overlay helpers.
# macOS /bin/bash 3.2 compatible.
set -eu
set -o pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "[figma-codex] repo root: $ROOT"
mkdir -p .codex .agents/skills .ai/figma-codex/logs

AGENTS_FILE="AGENTS.md"
APPEND_FILE="AGENTS.figmacodex.append.md"
MARKER_START="<!-- FIGMA_CODEX_UPGRADE_START -->"
MARKER_END="<!-- FIGMA_CODEX_UPGRADE_END -->"

if [ -f "$APPEND_FILE" ]; then
  if [ ! -f "$AGENTS_FILE" ]; then
    echo "# AGENTS.md" > "$AGENTS_FILE"
    echo >> "$AGENTS_FILE"
  fi
  if grep -q "$MARKER_START" "$AGENTS_FILE"; then
    echo "[figma-codex] AGENTS.md already contains Figma Codex block; skipping append."
  else
    {
      echo
      echo "$MARKER_START"
      cat "$APPEND_FILE"
      echo "$MARKER_END"
    } >> "$AGENTS_FILE"
    echo "[figma-codex] appended Figma Codex guidance to AGENTS.md"
  fi
fi

if [ -f .codex/config.example.toml ] && [ ! -f .codex/config.toml ]; then
  cp .codex/config.example.toml .codex/config.toml
  echo "[figma-codex] created .codex/config.toml from example. Review before use."
else
  echo "[figma-codex] .codex/config.toml exists or example missing; not overwriting."
fi

chmod +x .ai/figma-codex/scripts/*.sh 2>/dev/null || true

echo "[figma-codex] install complete."
echo "Clean rebuild: bash .ai/figma-codex/scripts/rebuild-beads.sh"
echo "Autopilot:     ODC_AUTOPILOT_MAX_RUNS=80 bash .ai/figma-codex/scripts/codex-autopilot.sh"

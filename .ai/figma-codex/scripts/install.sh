#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "[figma-codex] repo root: $ROOT"

mkdir -p .codex .agents/skills .ai/figma-codex/logs

# Append AGENTS guidance safely.
AGENTS_FILE="AGENTS.md"
APPEND_FILE="AGENTS.figmacodex.append.md"
MARKER_START="<!-- FIGMA_CODEX_UPGRADE_START -->"
MARKER_END="<!-- FIGMA_CODEX_UPGRADE_END -->"

if [[ -f "$APPEND_FILE" ]]; then
  if [[ ! -f "$AGENTS_FILE" ]]; then
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

# Copy config example to active config only if no project config exists.
if [[ -f .codex/config.example.toml && ! -f .codex/config.toml ]]; then
  cp .codex/config.example.toml .codex/config.toml
  echo "[figma-codex] created .codex/config.toml from example. Review before use."
else
  echo "[figma-codex] .codex/config.toml exists or example missing; not overwriting."
fi

chmod +x .ai/figma-codex/scripts/*.sh 2>/dev/null || true

echo "[figma-codex] install complete. Next: bd init && bash .ai/figma-codex/scripts/init-beads-tasks.sh"

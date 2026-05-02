#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"
mkdir -p .ai/figma-codex/logs
LOG=".ai/figma-codex/logs/codex-work-next-$(date +%Y%m%d-%H%M%S).jsonl"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found in PATH" >&2
  exit 1
fi

codex exec --cd "$ROOT" --sandbox workspace-write --json - < .ai/figma-codex/prompts/work-next.md | tee "$LOG"
echo "[figma-codex] JSONL log: $LOG"

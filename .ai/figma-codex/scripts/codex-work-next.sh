#!/usr/bin/env bash
# Ask Codex to work the next ready Beads task according to the saved work-next prompt.
# For fully unattended iteration, prefer codex-autopilot.sh.
# macOS /bin/bash 3.2 compatible.
set -eu
set -o pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

mkdir -p .ai/figma-codex/logs
LOG=".ai/figma-codex/logs/codex-work-next-$(date +%Y%m%d-%H%M%S).jsonl"
PROMPT_FILE=".ai/figma-codex/prompts/work-next.md"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found in PATH" >&2
  exit 1
fi
if [ ! -f "$PROMPT_FILE" ]; then
  echo "Missing prompt file: $PROMPT_FILE" >&2
  exit 2
fi
PROMPT_CONTENT="$(cat "$PROMPT_FILE")"
codex exec --sandbox workspace-write -c 'approval_policy="never"' --json "$PROMPT_CONTENT" | tee "$LOG"
echo "[figma-codex] JSONL log: $LOG"

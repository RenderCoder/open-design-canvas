#!/usr/bin/env bash
# Syntax-check all figma-codex shell scripts with the current bash.
# macOS /bin/bash 3.2 compatible.
set -eu
set -o pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

SCRIPT_DIR=".ai/figma-codex/scripts"
failures=0

for f in "$SCRIPT_DIR"/*.sh; do
  [ -f "$f" ] || continue
  echo "Checking $f"
  if ! bash -n "$f"; then
    failures=$((failures + 1))
  fi
done

if [ "$failures" -ne 0 ]; then
  echo "$failures script(s) failed syntax check." >&2
  exit 1
fi

echo "All scripts passed bash -n."

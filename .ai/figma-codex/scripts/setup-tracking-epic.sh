#!/usr/bin/env bash
# Create or refresh the non-blocking tracking epic for already-created Beads tasks.
# macOS /bin/bash 3.2 compatible.
set -eu
set -o pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

LOG_DIR=".ai/figma-codex/logs"
LABEL_MAIN="odc-upgrade"
LABEL_FIGMA="figma-native"
EPIC_MODE="${ODC_EPIC_MODE:-track}"
mkdir -p "$LOG_DIR"

if ! command -v bd >/dev/null 2>&1; then
  echo "bd not found in PATH." >&2
  exit 1
fi

json_first_field() {
  field="$1"
  file="$2"
  grep -o '"'"$field"'"[[:space:]]*:[[:space:]]*"[^"]*"' "$file" 2>/dev/null | head -n 1 | sed 's/^[^:]*:[[:space:]]*"//; s/"$//' || true
}

parse_id() {
  file="$1"
  id="$(json_first_field id "$file")"
  if [ -n "$id" ] && [ "$id" != "null" ]; then
    printf '%s
' "$id"
    return 0
  fi
  grep -Eo '[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9_.-]+' "$file" 2>/dev/null | head -n 1 || true
}

if [ -s "$LOG_DIR/odc-tracking-epic-id.txt" ]; then
  EPIC_ID="$(cat "$LOG_DIR/odc-tracking-epic-id.txt")"
  echo "Using existing tracking epic: $EPIC_ID"
else
  OUT="$LOG_DIR/odc-tracking-epic-create.json"
  bd create "Open Design Canvas: Figma-native upgrade" -t epic -p 0 --json > "$OUT"
  EPIC_ID="$(parse_id "$OUT")"
  if [ -z "$EPIC_ID" ]; then
    echo "Could not parse epic ID from $OUT" >&2
    cat "$OUT" >&2 || true
    exit 2
  fi
  printf '%s
' "$EPIC_ID" > "$LOG_DIR/odc-tracking-epic-id.txt"
  printf '%s
' "$EPIC_ID" > "$LOG_DIR/odc-epic-id.txt"
  echo "Created tracking epic: $EPIC_ID"
fi

bd update "$EPIC_ID" --add-label odc-epic --add-label "$LABEL_FIGMA" --status in_progress --json >/dev/null 2>&1 || true

count=0
for file in "$LOG_DIR"/bd-id-*.txt; do
  [ -f "$file" ] || continue
  key="$(basename "$file" .txt | sed 's/^bd-id-//')"
  TASK_ID="$(cat "$file")"
  [ "$key" = "ODC_EPIC" ] && continue
  [ -z "$TASK_ID" ] && continue

  echo "Linking $key ($TASK_ID) to tracking epic $EPIC_ID"
  bd update "$TASK_ID" --add-label "$LABEL_MAIN" --add-label "$LABEL_FIGMA" --json >/dev/null 2>&1 || true

  if [ "$EPIC_MODE" = "parent" ]; then
    bd update "$TASK_ID" --parent "$EPIC_ID" --json >/dev/null 2>&1 || true
  fi

  bd dep add "$EPIC_ID" "$TASK_ID" --type tracks >/dev/null 2>&1 || true
  count=$((count + 1))
done

echo "Linked $count tasks. Tracking epic: $EPIC_ID. Epic mode: $EPIC_MODE"
if ! bd ready --label "$LABEL_MAIN" --json 2>/dev/null; then
  bd ready --json || true
fi

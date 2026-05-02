#!/usr/bin/env bash
# Unattended one-task-at-a-time Codex runner for Open Design Canvas Beads tasks.
# macOS /bin/bash 3.2 compatible. No associative arrays. jq is optional, not required.
set -eu
set -o pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

LABEL="${ODC_AUTOPILOT_LABEL:-odc-upgrade}"
MAX_RUNS="${ODC_AUTOPILOT_MAX_RUNS:-80}"
LOG_DIR=".ai/figma-codex/logs/autopilot"
CODEX_MODEL="${ODC_CODEX_MODEL:-gpt-5.4}"
CODEX_REASONING_EFFORT="${ODC_CODEX_REASONING_EFFORT:-high}"
mkdir -p "$LOG_DIR"

if ! command -v bd >/dev/null 2>&1; then
  echo "bd not found in PATH." >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "codex not found in PATH." >&2
  exit 1
fi

json_first_field() {
  field="$1"
  file="$2"
  grep -o '"'"$field"'"[[:space:]]*:[[:space:]]*"[^"]*"' "$file" 2>/dev/null | head -n 1 | sed 's/^[^:]*:[[:space:]]*"//; s/"$//' || true
}

write_ready_json() {
  out_file="$1"
  err_file="$2"

  if bd ready --unassigned --label "$LABEL" --sort priority --json > "$out_file" 2> "$err_file"; then
    return 0
  fi
  if bd ready --label "$LABEL" --json > "$out_file" 2> "$err_file"; then
    return 0
  fi
  bd ready --json > "$out_file" 2> "$err_file" || return 1
}

show_ready_queue() {
  if ! bd ready --label "$LABEL" --json 2>/dev/null; then
    bd ready --json || true
  fi
}

write_prompt() {
  task_id="$1"
  task_title="$2"
  prompt_file="$3"

  cat > "$prompt_file" <<EOF_PROMPT
You are running one unattended iteration of the Open Design Canvas upgrade autopilot.

Target Beads task:
- ID: $task_id
- Title: $task_title

Global project goal:
Transform this fork of nexu-io/open-design into Open Design Canvas: a maintainable, open-source-quality, Figma-native AI design workbench built on Open Design, Codex CLI, Beads, and Figma MCP.

Non-negotiable workflow:
1. Do not ask the human for clarification.
2. Do not wait for human approval.
3. Do not switch to another Beads task unless this target task is already closed or no longer valid.
4. First run exactly these inspections:
   - bd show $task_id --long
   - git status --short
5. Read the relevant project context before editing:
   - GOLDEN_PROMPT.md
   - README.FIGMA_CODEX_UPGRADE.md
   - AGENTS.figmacodex.append.md
   - .ai/figma-codex/docs/ARCHITECTURE.md
   - .ai/figma-codex/docs/IMPLEMENTATION_GUIDE.md
   - .ai/figma-codex/docs/OPEN_DESIGN_PATCH_GUIDE.md
   - .ai/figma-codex/docs/QA_CHECKLIST.md
   - any task-specific files referenced by bd show.
6. Claim the task:
   - bd update $task_id --claim --json
7. Complete exactly this task.
8. Keep the implementation small, maintainable, and aligned with the existing Open Design architecture.
9. Preserve existing behavior unless the task acceptance criteria explicitly require a change.
10. When the task involves Figma-native canvas behavior:
    - Treat Open Design as orchestration, skills, design-system, and prompt-composition layer.
    - Treat Codex as the agent execution layer.
    - Treat Figma MCP as the canvas write/read layer.
    - Do not implement a custom Figma REST write-canvas path.
    - If real Figma MCP access is unavailable, implement mocked tests/fixtures and document that limitation.
11. Run relevant validation:
    - Discover and use the repo's own lint/test/typecheck/build commands when available.
    - Run the smallest useful validation first.
    - If broader checks fail due unrelated pre-existing issues, document that precisely.
12. Completion:
    - Update Beads notes with summary, files changed, validation results, and residual risks.
    - Close the task only when its acceptance criteria are met:
      bd close $task_id --reason "Completed: <short reason>" --json
    - If the task cannot be completed because of missing external credentials, Figma auth, network, or unclear repository state:
      - do not ask the human;
      - append detailed notes;
      - set an appropriate blocked/open status if Beads supports it;
      - leave a clear remediation note.
13. Git hygiene:
    - Prefer one small commit per completed Beads task.
    - Include code changes and Beads database/log changes in the commit when appropriate.
    - Use commit message format:
      bead($task_id): <concise task summary>
    - If git commit fails due missing git user config, leave changes in the working tree and document it in Beads notes.

Output requirements:
- Be concise.
- Report what changed, validation commands/results, and whether the Beads task was closed.
- Do not start the next Beads task in this Codex invocation.
EOF_PROMPT
}

echo "Starting Open Design Canvas autopilot."
echo "Label: $LABEL"
echo "Max runs: $MAX_RUNS"
echo "Logs: $LOG_DIR"

run_count=0
while [ "$run_count" -lt "$MAX_RUNS" ]; do
  run_count=$((run_count + 1))
  READY_FILE="$LOG_DIR/ready-$run_count.json"
  READY_ERR="$LOG_DIR/ready-$run_count.err"

  if ! write_ready_json "$READY_FILE" "$READY_ERR"; then
    echo "bd ready failed. See $READY_ERR" >&2
    cat "$READY_ERR" >&2 || true
    exit 1
  fi

  TASK_ID="$(json_first_field id "$READY_FILE")"
  if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
    echo "No ready tasks found."
    echo "Last ready output: $READY_FILE"
    exit 0
  fi

  TASK_TITLE="$(json_first_field title "$READY_FILE")"
  if [ -z "$TASK_TITLE" ] || [ "$TASK_TITLE" = "null" ]; then
    TASK_TITLE="Untitled task"
  fi

  SAFE_TASK_ID="$(printf '%s' "$TASK_ID" | tr '/:' '__')"
  PREFIX="$(printf '%03d' "$run_count")-$SAFE_TASK_ID"
  OUT_FILE="$LOG_DIR/$PREFIX.jsonl"
  LAST_MSG_FILE="$LOG_DIR/$PREFIX.final.md"
  PROMPT_FILE="$LOG_DIR/$PREFIX.prompt.md"

  write_prompt "$TASK_ID" "$TASK_TITLE" "$PROMPT_FILE"
  PROMPT_CONTENT="$(cat "$PROMPT_FILE")"

  echo
  echo "============================================================"
  echo "Run $run_count / $MAX_RUNS"
  echo "Task: $TASK_ID"
  echo "Title: $TASK_TITLE"
  echo "Log: $OUT_FILE"
  echo "============================================================"

  set +e
  codex exec -c "model=\"$CODEX_MODEL\"" -c "model_reasoning_effort=\"$CODEX_REASONING_EFFORT\"" -c approval_policy=never -c sandbox_mode=workspace-write --json --output-last-message "$LAST_MSG_FILE" "$PROMPT_CONTENT" 2>&1 | tee "$OUT_FILE"
  CODEX_RC=${PIPESTATUS[0]}
  set -e

  if [ "$CODEX_RC" -ne 0 ]; then
    echo "Codex exited with non-zero status: $CODEX_RC"
    bd update "$TASK_ID" --append-notes "Autopilot stopped: codex exec exited with status $CODEX_RC. See $OUT_FILE and $LAST_MSG_FILE." --json >/dev/null 2>&1 || true
    exit "$CODEX_RC"
  fi

  echo "Finished Codex run for $TASK_ID. Current ready queue:"
  show_ready_queue
  sleep "${ODC_AUTOPILOT_SLEEP_SECONDS:-1}"
done

echo "Reached max runs: $MAX_RUNS"
show_ready_queue

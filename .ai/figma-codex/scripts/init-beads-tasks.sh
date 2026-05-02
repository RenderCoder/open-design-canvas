#!/usr/bin/env bash
# Initialize the Open Design Canvas Beads task graph.
# macOS /bin/bash 3.2 compatible: no associative arrays, no Bash 4-only syntax.
set -eu
set -o pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

SENTINEL=".ai/figma-codex/.beads-tasks-initialized"
LOG_DIR=".ai/figma-codex/logs"
TASK_DIR=".ai/figma-codex/tasks"
LABEL_MAIN="odc-upgrade"
LABEL_FIGMA="figma-native"
EPIC_MODE="${ODC_EPIC_MODE:-track}"
mkdir -p "$LOG_DIR"

if [ "${1:-}" != "--force" ] && [ -f "$SENTINEL" ]; then
  echo "Tasks already initialized. Use --force to create another set, or run reset-beads.sh --yes first."
  exit 0
fi

if ! command -v bd >/dev/null 2>&1; then
  echo "bd not found. Install Beads first." >&2
  exit 1
fi

if ! bd ready --json >/tmp/odc-bd-ready-check.json 2>/tmp/odc-bd-ready-check.err; then
  echo "bd is not initialized or not usable here. Run: bd init" >&2
  cat /tmp/odc-bd-ready-check.err >&2 || true
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
  id="$(grep -Eo '[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9_.-]+' "$file" 2>/dev/null | head -n 1 || true)"
  if [ -n "$id" ]; then
    printf '%s
' "$id"
    return 0
  fi
  echo "Could not parse Beads issue id from $file" >&2
  cat "$file" >&2 || true
  return 2
}

id_file() {
  printf '%s/bd-id-%s.txt' "$LOG_DIR" "$1"
}

set_id() {
  key="$1"
  value="$2"
  printf '%s
' "$value" > "$(id_file "$key")"
}

get_id() {
  key="$1"
  file="$(id_file "$key")"
  if [ ! -s "$file" ]; then
    echo "Missing Beads id for task key: $key" >&2
    exit 1
  fi
  cat "$file"
}

label_issue() {
  issue_id="$1"
  bd update "$issue_id" --add-label "$LABEL_MAIN" --add-label "$LABEL_FIGMA" --json >/dev/null 2>&1 || true
}

label_epic() {
  epic_id="$1"
  # Do not add odc-upgrade to the epic; autopilot should select tasks only.
  bd update "$epic_id" --add-label odc-epic --add-label "$LABEL_FIGMA" --status in_progress --json >/dev/null 2>&1 || true
}

create_epic() {
  out="$LOG_DIR/bd-create-ODC_EPIC.json"
  echo "Creating tracking epic: Open Design Canvas: Figma-native upgrade"
  bd create "Open Design Canvas: Figma-native upgrade" -t epic -p 0 --json > "$out"
  epic_id="$(parse_id "$out")"
  set_id ODC_EPIC "$epic_id"
  printf '%s
' "$epic_id" > "$LOG_DIR/odc-epic-id.txt"
  printf '%s
' "$epic_id" > "$LOG_DIR/odc-tracking-epic-id.txt"
  label_epic "$epic_id"
  echo "  -> $epic_id"
}

create_task() {
  key="$1"
  pri="$2"
  title="$3"
  body="$TASK_DIR/$key.md"
  out="$LOG_DIR/bd-create-$key.json"

  if [ ! -f "$body" ]; then
    echo "Missing task body file: $body" >&2
    exit 1
  fi

  echo "Creating $key: $title"
  bd create "$title" -t task -p "$pri" --body-file "$body" --json > "$out"
  task_id="$(parse_id "$out")"
  set_id "$key" "$task_id"
  label_issue "$task_id"

  if [ "$EPIC_MODE" = "parent" ]; then
    epic_id="$(get_id ODC_EPIC)"
    bd update "$task_id" --parent "$epic_id" --json >/dev/null 2>&1 || true
  fi

  echo "  -> $task_id"
}

add_dep() {
  child_key="$1"
  parent_key="$2"
  child_id="$(get_id "$child_key")"
  parent_id="$(get_id "$parent_key")"
  bd dep add "$child_id" "$parent_id" >/dev/null 2>&1 || {
    echo "Warning: failed to add dependency $child_key -> $parent_key" >&2
  }
}

track_task_from_epic() {
  task_key="$1"
  epic_id="$(get_id ODC_EPIC)"
  task_id="$(get_id "$task_key")"
  # Optional non-blocking tracking relationship. If unsupported, labels still group tasks.
  bd dep add "$epic_id" "$task_id" --type tracks >/dev/null 2>&1 || true
}

show_ready() {
  if ! bd ready --label "$LABEL_MAIN" --json 2>/dev/null; then
    bd ready --json || true
  fi
}

create_epic

TASKS_FILE="$LOG_DIR/odc-task-list.tmp"
cat > "$TASKS_FILE" <<'TASKS'
A00|0|[Phase 0] 建立 repo map 与基线理解
A01|0|[Phase 0] 合并 AGENTS 指南与 Codex/Figma MCP 配置说明
A02|0|[Phase 0] 确认 Figma-native 架构 ADR 与 schema
A03|0|[Phase 0] 发现并记录 build/test/lint/check 命令
B10|0|[Phase 1] 扩展 skill registry 支持 od.mode=figma
B11|0|[Phase 1] 添加 Figma-native prompt directive
B12|0|[Phase 1] 扩展 project metadata 支持 Figma target
B13|1|[Phase 1] Discovery flow 适配 Figma-native 任务
B14|1|[Phase 1] 添加 Figma result report schema 与 parser
B15|1|[Phase 2] 实现 Figma result card UI
B16|1|[Phase 2] New project / chat 输入支持 Figma target
C20|0|[Phase 2] 现代化 Codex adapter 执行参数
C21|0|[Phase 2] 解析 Codex JSONL 中的 MCP tool call 事件
C22|1|[Phase 2] 将 MCP/Figma 事件流映射到 Open Design UI
C23|1|[Phase 2] 增加 Figma MCP health check 与文档
D30|0|[Phase 3] 接入 figma-native-screen skill
D31|1|[Phase 3] 接入 figma-native-landing skill
D32|1|[Phase 3] 接入 figma-native-dashboard skill
D33|1|[Phase 3] 接入 figma-native-mobile-flow skill
D34|1|[Phase 3] 接入 figma-canvas-critique / lint skill
D35|0|[Phase 3] 建立 FIGMA.md / tokens / component-map 设计系统桥梁
D36|1|[Phase 3] 让 prompt composer 同时读取 DESIGN.md 与 FIGMA.md
E40|0|[Phase 4] 单元测试：skill registry 与 prompt composer
E41|0|[Phase 4] 单元测试：Codex JSONL parser MCP fixtures
E42|1|[Phase 4] Mocked E2E：Figma-native 生成流程
E43|2|[Phase 4] Optional real Figma smoke test
E44|1|[Phase 5] 完善用户文档与 maintainer guide
E45|1|[Phase 5] License / trademark / attribution audit
E46|1|[Phase 5] Release readiness 与开源贡献清单
TASKS

while IFS='|' read key pri title; do
  if [ -n "$key" ]; then
    create_task "$key" "$pri" "$title"
  fi
done < "$TASKS_FILE"
rm -f "$TASKS_FILE"

echo "Adding blocking dependencies..."
add_dep A01 A00
add_dep A02 A00
add_dep A03 A00
add_dep B10 A02
add_dep B11 B10
add_dep B12 B10
add_dep B13 B11
add_dep B13 B12
add_dep B14 B12
add_dep B15 B14
add_dep B16 B12
add_dep C20 A03
add_dep C21 C20
add_dep C22 C21
add_dep C22 B15
add_dep C23 C20
add_dep D30 B10
add_dep D30 B11
add_dep D31 D30
add_dep D32 D30
add_dep D33 D30
add_dep D34 D30
add_dep D34 B14
add_dep D35 B10
add_dep D36 D35
add_dep D36 B11
add_dep E40 B11
add_dep E40 D30
add_dep E41 C21
add_dep E42 B15
add_dep E42 C22
add_dep E42 D30
add_dep E42 E40
add_dep E42 E41
add_dep E43 E42
add_dep E43 C23
add_dep E43 D35
add_dep E44 E42
add_dep E44 D31
add_dep E44 D32
add_dep E44 D33
add_dep E44 D34
add_dep E44 D36
add_dep E45 E44
add_dep E46 E40
add_dep E46 E41
add_dep E46 E42
add_dep E46 E44
add_dep E46 E45

echo "Adding optional non-blocking epic tracking edges..."
for file in "$LOG_DIR"/bd-id-*.txt; do
  [ -f "$file" ] || continue
  key="$(basename "$file" .txt | sed 's/^bd-id-//')"
  [ "$key" = "ODC_EPIC" ] && continue
  track_task_from_epic "$key"
done

date > "$SENTINEL"
echo "Beads task graph initialized."
echo "Tracking epic: $(get_id ODC_EPIC)"
echo "Epic mode: $EPIC_MODE"
echo "Labels: $LABEL_MAIN, $LABEL_FIGMA"
echo "Ready tasks:"
show_ready

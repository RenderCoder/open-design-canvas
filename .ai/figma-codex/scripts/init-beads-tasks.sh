#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

SENTINEL=".ai/figma-codex/.beads-tasks-initialized"
if [[ "${1:-}" != "--force" && -f "$SENTINEL" ]]; then
  echo "Tasks already initialized. Use --force to create another set."
  exit 0
fi

if ! command -v bd >/dev/null 2>&1; then
  echo "bd not found. Install Beads first." >&2
  exit 1
fi

if ! bd ready --json >/tmp/bd-ready-check.json 2>/tmp/bd-ready-check.err; then
  echo "bd is not initialized or not usable here. Run: bd init" >&2
  cat /tmp/bd-ready-check.err >&2 || true
  exit 1
fi

mkdir -p .ai/figma-codex/logs

# macOS ships Bash 3.x by default, which does not support associative arrays.
# Store task ids in small files instead so this script remains portable.
id_file() {
  printf '.ai/figma-codex/logs/bd-id-%s.txt' "$1"
}

parse_id() {
  local path="$1"
  local id

  # Prefer a direct JSON id field. This works for compact or pretty-printed Beads output.
  id="$(sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$path" | head -n 1 || true)"
  if [[ -n "$id" ]]; then
    printf '%s\n' "$id"
    return 0
  fi

  # Fallback for non-JSON or mixed output.
  id="$(grep -Eo '[A-Za-z][A-Za-z0-9_-]*-[A-Za-z0-9_.-]+' "$path" | head -n 1 || true)"
  if [[ -n "$id" ]]; then
    printf '%s\n' "$id"
    return 0
  fi

  echo "Could not parse Beads issue id from $path" >&2
  cat "$path" >&2 || true
  return 2
}


create_task() {
  local key="$1"
  local title="$2"
  local pri="$3"
  local body=".ai/figma-codex/tasks/${key}.md"
  local out=".ai/figma-codex/logs/bd-create-${key}.json"
  local id

  echo "Creating $key: $title"
  bd create "$title" -t task -p "$pri" --body-file="$body" --json > "$out"
  id="$(parse_id "$out")"
  printf '%s\n' "$id" > "$(id_file "$key")"
  echo "  -> $id"
}

id_for() {
  local key="$1"
  local f
  f="$(id_file "$key")"
  if [[ ! -s "$f" ]]; then
    echo "Missing Beads id for task key: $key" >&2
    exit 1
  fi
  cat "$f"
}

dep() {
  local child_key="$1"
  local parent_key="$2"
  local child_id
  local parent_id
  child_id="$(id_for "$child_key")"
  parent_id="$(id_for "$parent_key")"
  bd dep add "$child_id" "$parent_id" || true
}

create_task "A00" "[Phase 0] 建立 repo map 与基线理解" "0"
create_task "A01" "[Phase 0] 合并 AGENTS 指南与 Codex/Figma MCP 配置说明" "0"
create_task "A02" "[Phase 0] 确认 Figma-native 架构 ADR 与 schema" "0"
create_task "A03" "[Phase 0] 发现并记录 build/test/lint/check 命令" "0"
create_task "B10" "[Phase 1] 扩展 skill registry 支持 od.mode=figma" "0"
create_task "B11" "[Phase 1] 添加 Figma-native prompt directive" "0"
create_task "B12" "[Phase 1] 扩展 project metadata 支持 Figma target" "0"
create_task "B13" "[Phase 1] Discovery flow 适配 Figma-native 任务" "1"
create_task "B14" "[Phase 1] 添加 Figma result report schema 与 parser" "1"
create_task "B15" "[Phase 2] 实现 Figma result card UI" "1"
create_task "B16" "[Phase 2] New project / chat 输入支持 Figma target" "1"
create_task "C20" "[Phase 2] 现代化 Codex adapter 执行参数" "0"
create_task "C21" "[Phase 2] 解析 Codex JSONL 中的 MCP tool call 事件" "0"
create_task "C22" "[Phase 2] 将 MCP/Figma 事件流映射到 Open Design UI" "1"
create_task "C23" "[Phase 2] 增加 Figma MCP health check 与文档" "1"
create_task "D30" "[Phase 3] 接入 figma-native-screen skill" "0"
create_task "D31" "[Phase 3] 接入 figma-native-landing skill" "1"
create_task "D32" "[Phase 3] 接入 figma-native-dashboard skill" "1"
create_task "D33" "[Phase 3] 接入 figma-native-mobile-flow skill" "1"
create_task "D34" "[Phase 3] 接入 figma-canvas-critique / lint skill" "1"
create_task "D35" "[Phase 3] 建立 FIGMA.md / tokens / component-map 设计系统桥梁" "0"
create_task "D36" "[Phase 3] 让 prompt composer 同时读取 DESIGN.md 与 FIGMA.md" "1"
create_task "E40" "[Phase 4] 单元测试：skill registry 与 prompt composer" "0"
create_task "E41" "[Phase 4] 单元测试：Codex JSONL parser MCP fixtures" "0"
create_task "E42" "[Phase 4] Mocked E2E：Figma-native 生成流程" "1"
create_task "E43" "[Phase 4] Optional real Figma smoke test" "2"
create_task "E44" "[Phase 5] 完善用户文档与 maintainer guide" "1"
create_task "E45" "[Phase 5] License / trademark / attribution audit" "1"
create_task "E46" "[Phase 5] Release readiness 与开源贡献清单" "1"

echo "Adding dependencies..."
dep "A01" "A00"
dep "A02" "A00"
dep "A03" "A00"
dep "B10" "A02"
dep "B11" "B10"
dep "B12" "B10"
dep "B13" "B11"
dep "B13" "B12"
dep "B14" "B12"
dep "B15" "B14"
dep "B16" "B12"
dep "C20" "A03"
dep "C21" "C20"
dep "C22" "C21"
dep "C22" "B15"
dep "C23" "C20"
dep "D30" "B10"
dep "D30" "B11"
dep "D31" "D30"
dep "D32" "D30"
dep "D33" "D30"
dep "D34" "D30"
dep "D34" "B14"
dep "D35" "B10"
dep "D36" "D35"
dep "D36" "B11"
dep "E40" "B11"
dep "E40" "D30"
dep "E41" "C21"
dep "E42" "B15"
dep "E42" "C22"
dep "E42" "D30"
dep "E42" "E40"
dep "E42" "E41"
dep "E43" "E42"
dep "E43" "C23"
dep "E43" "D35"
dep "E44" "E42"
dep "E44" "D31"
dep "E44" "D32"
dep "E44" "D33"
dep "E44" "D34"
dep "E44" "D36"
dep "E45" "E44"
dep "E46" "E40"
dep "E46" "E41"
dep "E46" "E42"
dep "E46" "E44"
dep "E46" "E45"

date > "$SENTINEL"
echo "Beads task graph initialized."
bd ready --json || true

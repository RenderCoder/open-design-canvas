# Open Design Patch Guide：代码改造提示

这份文档给 Codex 提供“该往哪里看”的方向。真实仓库代码始终优先。

## 先做 repo inspection

每个任务开始前运行类似命令：

```bash
rg "type ProjectMetadata|interface ProjectMetadata|ProjectMetadata" apps packages . -n
rg "composeSystemPrompt|DISCOVERY_AND_PHILOSOPHY|DECK_FRAMEWORK" apps packages . -n
rg "listSkills|parseFrontmatter|previewType|skillMode" apps packages . -n
rg "codex exec|full-auto|--json|json-event-stream|spawn" apps packages . -n
rg "artifact|preview|lint|parser" apps packages . -n
cat package.json
find . -maxdepth 3 -name package.json -o -name pnpm-workspace.yaml -o -name Makefile
```

不要假设文件一定存在；Open Design 更新很快。

## 可能需要改的区域

### Skill registry

可能文件：

- `apps/daemon/src/skills.ts`
- `docs/skills-protocol.md`
- 前端 skill picker 类型/组件

要点：

- `inferMode` 增加 `figma`。
- `normalizeSurface` 支持 `figma`。
- `previewType` 支持 `figma-canvas`。
- 保留现有 prototype/deck/template/image/video/audio 行为。

### Prompt composer

可能文件：

- `apps/web/src/prompts/system.ts`
- `apps/web/src/prompts/discovery.ts`
- 新建 `apps/web/src/prompts/figma-native.ts`

要点：

- Figma mode 时注入 `FIGMA_NATIVE_DIRECTIVE`。
- directive 在 design system 和 skill body 之后，metadata 之后也可，但要压过“输出 HTML artifact”的旧指令。
- Figma mode 禁止最终输出 `<artifact>` 作为交付；可以允许输出 JSON report 或 markdown report。
- Discovery 仍保留，但问题应包含 Figma target / create new / existing file / screen count / platform。

### Project metadata / types

可能文件：

- `apps/web/src/types.ts`
- `apps/daemon/src/*project*`
- SQLite project metadata 相关 API

要点：

- 添加 `figmaTarget` 和 `figmaOutputSettings`。
- 迁移要 backward compatible；旧 project 没这些字段也能打开。

### Codex adapter

可能文件路径需要搜索。目标：

- 不使用 `--full-auto`。
- 支持 `codex exec --json --sandbox workspace-write`。
- 解析 JSONL 事件。
- 捕获 MCP tool call 事件。

事件映射建议：

```ts
type AgentEvent =
  | { type: 'agent_message'; text: string }
  | { type: 'plan_update'; items: unknown[] }
  | { type: 'command'; command: string; status: string }
  | { type: 'file_change'; path: string; action: string }
  | { type: 'mcp_tool_call'; server?: string; tool: string; status?: string; input?: unknown; output?: unknown }
  | { type: 'figma_progress'; phase: string; detail: string }
  | { type: 'error'; message: string };
```

### UI result card

目标字段：

- status
- fileUrl
- pageName
- rootFrame name/nodeId
- created/updated counts
- reusedComponents
- variables/styles
- hardcodedValues
- checks
- knownIssues
- nextIteration

### Canvas lint

MVP 先不写深度 Figma parser。让 agent 返回结构化 report，并用 schema 校验格式。后续再引入更强的 parser / MCP metadata analyzer。

## 防止回归的测试

至少加入：

1. `od.mode: figma` skill 能被 listSkills 发现。
2. Figma mode prompt 包含 `use_figma`、`search_design_system`、`get_metadata`、`get_screenshot`、`get_variable_defs`，并包含 “not HTML final deliverable”。
3. Codex JSONL parser 能解析 MCP tool call fixture。
4. Figma result schema 能校验成功/失败。
5. 旧 prototype/deck skill 不受影响。

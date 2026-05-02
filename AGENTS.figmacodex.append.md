# Figma Native + Codex Upgrade Working Agreements

这些规则适用于 Open Design → Figma-native 改造计划。

## Beads 是长期任务来源

- 长周期任务必须用 `bd`，不要只依赖临时 todo 或聊天上下文。
- 每个会话开始运行：`bd prime || true`、`bd ready --json`。
- 开始做任务前必须运行：`bd show <id> --long`，然后 `bd update <id> --claim`。
- 不允许只看任务标题就动手。
- 工作中出现关键决策、发现风险、依赖变化时，用 `bd update <id> --notes "..."` 记录。
- 完成任务后运行验证命令，并用 `bd close <id> --reason "Completed: ..."` 关闭。
- 发现新工作，创建新 bead；不要扩大当前 bead 的范围。

## Figma-native 改造原则

- Open Design 的定位：设计流程、prompt stack、skill system、design systems、质检与编排层。
- Codex CLI 的定位：工程改造、脚本执行、非交互式/交互式 agent 执行层。
- Figma Remote MCP 的定位：真实 Figma-native canvas 写入层。
- 不要把 Figma REST API 当作主写画布通道；画布创建/更新优先通过 Figma MCP 的 `use_figma`。
- Figma 写入必须产生可编辑结构：frames、components、instances、variables、styles、Auto Layout、semantic layer names。
- 禁止把 screenshot-only mockup、HTML artifact 或一张静态图片当成 Figma-native 交付物。

## Figma MCP 使用规则

- 配置 Codex 的 Figma Remote MCP：

  ```bash
  codex mcp add figma --url https://mcp.figma.com/mcp
  ```

  按提示完成 Figma OAuth；不要把 OAuth token、私有 file ID 或客户设计内容写入仓库。普通工程任务不要强制依赖 OAuth，真实 Figma smoke test 再验证连接。
- 真实写画布前，必须确认 Figma MCP 已连接。
- 需要新文件时优先使用 `create_new_file`；已有文件必须要求用户提供 Figma file URL 或 selection URL。
- `use_figma` 前必须加载/遵守 Figma 官方 `figma-use` skill；若环境不可用，要把问题记录为阻塞或验证风险。
- 先用 `search_design_system` 查 components / variables / styles，再创建 primitives。
- 大型上下文先用 `get_metadata` 获取 sparse tree，不要一次性拉取巨大 frame。
- 需要视觉校验时用 `get_screenshot`；需要 token 校验时用 `get_variable_defs`。
- Web app 有可运行 UI 且含图片时，采用 `generate_figma_design` 捕获作为视觉参考，再用 `use_figma` 生成/整理 design-system-linked 结构。

## Codex 工程规则

- 真实仓库代码优先于本包文档。任何文件路径都要先 `rg` / `find` / `sed` 确认。
- 不要使用过时的 `--full-auto`。脚本和文档优先使用 `--sandbox workspace-write`。
- 使用 Codex JSONL 时，要解析 MCP tool calls、plan updates、file changes、command executions。
- 每次改动后运行项目实际支持的 lint/test/check 命令；如果命令不存在，先查 `package.json`、`pnpm-workspace.yaml`、`Makefile`、`tools` 目录。
- 开源质量要求：文档、测试、可扩展 schema、错误处理、边界说明同步完成。

## 产物质量标准

Figma-native MVP 通过的最低标准：

- 用户能选择 Figma-native skill。
- 用户能提供或新建 Figma file target。
- Prompt composer 能进入 Figma-native mode，并明确禁止 HTML 作为最终交付。
- Codex adapter 能运行现代 `codex exec`，并可解析 JSONL 中的 MCP 事件。
- UI 能显示 Figma result card：file URL、page/frame、created/updated nodes、reused components、variables/styles、screenshots/metadata checks、known issues。
- 至少一个 figma-native-screen skill 能被发现、被注入、被测试。

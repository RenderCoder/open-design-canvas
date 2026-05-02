# Research Brief：AI 操作 Figma 与 Codex 改造 Open Design 的方法论

更新时间：2026-05-02

## 核心结论

1. **Figma-native canvas 写入应走 Figma Remote MCP，而不是自研 REST 写画布。**
   Figma 文档明确说明 remote MCP 的 `use_figma` 能通过 Plugin API 语境在 Figma 文件中创建或更新 frames、components、variants、variables、auto layout 等真实结构。Open Design 应把这层当成执行工具，而不是自己重写一套 Figma 编辑器。

2. **Open Design 最有价值的是 prompt stack、Skills、Design Systems、discovery form、方向选择和自检文化。**
   这些应被保留，并扩展成 Figma-native mode，而不是推倒重来。

3. **Codex CLI 是合适的工程和 agent 执行器。**
   Codex 支持 MCP、AGENTS.md、repo skills、JSONL 非交互输出、sandbox 配置。改造应把 Codex 作为“读项目、改项目、调用 Figma MCP”的统一 agent 层。

4. **长期改造需要 Beads。**
   这个项目会跨多次会话、多阶段实现。`bd ready`、`bd show --long`、`bd update --claim`、`bd dep add` 可以减少上下文丢失和执行顺序混乱。

## 来自 Figma 官方文档的实践要点

### 1. 使用 Remote MCP

Figma remote MCP 可连接 Figma 文件，不需要安装桌面端。启用后能：写入 canvas、捕获 live UI、从 selected frames 生成代码、生成 FigJam diagrams、提取 variables/components/layout data、结合 Code Connect 保持设计系统一致性。

推荐实现策略：

- Open Design 只编排 prompt 和任务。
- Codex 通过 Figma MCP 调用 `use_figma` / `search_design_system` / `get_metadata` / `get_screenshot` / `get_variable_defs` / `create_new_file`。
- 不在 Open Design 内自研 Figma 认证和 Plugin API 执行器。

### 2. `use_figma` 是写画布核心

`use_figma` 是 remote-only 通用工具，可创建、编辑、删除或检查 Figma Design / FigJam 对象。Figma Design 中可操作 pages、frames、components、variants、variables、styles、text、images 等。

项目里的 Figma-native skill 必须明确：

- final deliverable is Figma-native canvas, not HTML.
- use `search_design_system` before drawing primitives.
- use `use_figma` for native canvas writes.
- after writing, run metadata/screenshot/token validation.

### 3. Skills 是稳定工作流的关键

Figma 官方建议把可重复工作流封装成 skills，避免每次重写长提示词。它们还强调 `use_figma` 最好配合 `figma-use` skill 使用；官方 skill 包含 Plugin API 规则、字体加载、颜色范围、错误恢复等细节。

因此本项目要有两类 skills：

- Open Design skills：用于 OD UI 选择和 prompt composition。
- Codex repo skills：放在 `.agents/skills`，让 Codex 在工程改造和 Figma 调用时自动加载正确 SOP。

### 4. 设计系统优先

Figma 官方 Build / Update Screens skill 强调：应复用已有 design system 的 components、variables、styles，而不是用硬编码矩形和 hex 画出“看起来像”的静态稿。

本项目需要：

- `DESIGN.md` 继续表达视觉风格。
- 新增 `FIGMA.md` 表达 Figma variables、styles、component sets、variant naming、Auto Layout 规则。
- 新增 `component-map.json` 和 `tokens.json` 作为 agent 可解析桥梁。

### 5. Hybrid：code-to-canvas + native cleanup

对于 Web app 或 HTML preview，可用 `generate_figma_design` 捕获 live UI 成 editable Figma frames，然后用 `use_figma` 根据 design system 重建或修复结构。尤其当页面含图片时，官方 Build / Update Screens skill 指出 `generate_figma_design` 可提供 imageHash，避免 `use_figma` 无法直接 fetch 外部图片的问题。

推荐方案：

- 早期 MVP：直接 `use_figma` 写 native canvas。
- 可运行 Web UI 的场景：并行跑 `generate_figma_design` 作为视觉参考，再让 `use_figma` 输出组件化结构。

### 6. 避免过大 Figma 上下文

Figma 官方建议不要选择巨大、深层嵌套 frame。大型选择会拖慢或产生不完整响应。应先用 `get_metadata` 获取 sparse tree，再针对小块节点调用设计上下文或截图。

Open Design 的 canvas lint / review 应当内置这个策略。

## 来自 Codex 官方文档的实践要点

### 1. AGENTS.md 是 repo 级约束入口

Codex 会读取 AGENTS.md，项目级指令应包含 repo layout、运行命令、工程规范、do-not rules、验证标准。这个包提供 `AGENTS.figmacodex.append.md`，安装脚本会追加到现有 `AGENTS.md`。

### 2. Skills 用于可重复 workflow

Codex 支持 `.agents/skills`，skill 以 `SKILL.md` 为核心，可带 references/scripts/assets。Codex 初始只加载 skill metadata，真正使用时才读取完整内容，适合存放 Figma-native SOP、Beads SOP、OD 改造 SOP。

### 3. MCP 用于外部上下文和工具

Codex 支持 STDIO 和 Streamable HTTP MCP server。Figma MCP 可通过：

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
```

连接。项目配置可放 `.codex/config.toml`，但本包只提供 `.codex/config.example.toml`，避免强行覆盖已有配置。

### 4. 非交互执行用 JSONL

Codex `exec --json` 会输出 JSON Lines，事件中包括 agent message、reasoning、command executions、file changes、MCP tool calls、web searches、plan updates 等。Open Design 改造后应能解析这些事件，显示 Figma MCP 进度。

### 5. 不要使用过时 `--full-auto`

Codex CLI 参考文档把 `--full-auto` 标为兼容性/弃用路径，建议使用 `--sandbox workspace-write`。本包脚本遵循这个方向。

## 行业共识：AI 生成设计稿的可靠性策略

1. **先约束，再生成。** 先锁定目标用户、surface、平台、tone、brand、scale、constraints，再产出设计。
2. **让用户选择方向，而不是让模型自由发挥。** 视觉方向卡、palette、font stack、布局姿态应 deterministic。
3. **复用设计系统，而不是“画得像”。** 优先复用 components/variables/styles/Auto Layout。
4. **小块上下文，逐步构建。** 大型 frame 先 metadata，再局部处理。
5. **每次生成后必须自检。** 检查 token 使用、组件复用、layer 命名、Auto Layout、hardcoded colors、accessibility、空状态/错误状态。
6. **保留任务记忆。** 长周期工程必须有持久任务图，避免每个会话重新规划。
7. **把 prompt 变成文件和 skill。** 不要依赖一次性口头提示；把 SOP 写成 AGENTS.md、SKILL.md、references、checklists。

## 参考链接

- Figma MCP introduction: https://developers.figma.com/docs/figma-mcp-server/
- Figma remote MCP setup: https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/
- Figma write to canvas: https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/
- Figma tools and prompts: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
- Figma code to canvas: https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/
- Figma create skills: https://developers.figma.com/docs/figma-mcp-server/create-skills/
- Figma Build / Update Screens skill: https://developers.figma.com/docs/figma-mcp-server/skill-figma-generate-design/
- Figma structure your file: https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/
- Figma prompt best practices: https://developers.figma.com/docs/figma-mcp-server/write-effective-prompts/
- Figma custom rules: https://developers.figma.com/docs/figma-mcp-server/add-custom-rules/
- Figma avoid large frames: https://developers.figma.com/docs/figma-mcp-server/avoid-large-frames/
- Figma plans/access/rate limits: https://developers.figma.com/docs/figma-mcp-server/plans-access-and-permissions/
- Codex MCP: https://developers.openai.com/codex/mcp
- Codex AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- Codex Skills: https://developers.openai.com/codex/skills
- Codex config basics: https://developers.openai.com/codex/config-basic
- Codex config reference: https://developers.openai.com/codex/config-reference
- Codex non-interactive mode: https://developers.openai.com/codex/noninteractive
- Codex CLI reference: https://developers.openai.com/codex/cli/reference
- Codex best practices: https://developers.openai.com/codex/learn/best-practices
- Beads: https://github.com/gastownhall/beads
- Open Design: https://github.com/nexu-io/open-design

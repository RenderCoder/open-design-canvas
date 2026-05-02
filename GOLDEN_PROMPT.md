# 黄金提示词：启动 Open Design → Figma Native + Codex CLI 改造

把下面整段粘贴给 Codex CLI，工作目录必须是你的 open-design fork 仓库根目录。

```text
你现在是这个 open-design fork 的架构改造负责人。目标是把项目改造成一个可维护、可开源、可扩展的 Figma-native AI design workbench：Open Design 负责设计方法论、skills、prompt composition、design systems、任务编排和质量检查；Codex CLI 负责工程改造；Figma Remote MCP 负责真实 Figma canvas 的 native 写入。

先不要直接写代码。你必须按下面顺序工作：

1. 读取并理解这些文件：
   - README.md
   - README.FIGMA_CODEX_UPGRADE.md
   - AGENTS.md（如果存在）
   - AGENTS.figmacodex.append.md
   - .ai/figma-codex/docs/RESEARCH_BRIEF.md
   - .ai/figma-codex/docs/ARCHITECTURE.md
   - .ai/figma-codex/docs/IMPLEMENTATION_GUIDE.md
   - .ai/figma-codex/docs/OPEN_DESIGN_PATCH_GUIDE.md
   - .ai/figma-codex/docs/QA_CHECKLIST.md
   - .ai/figma-codex/task_manifest.json

2. 使用 Beads 作为唯一任务来源。先运行：
   - `bd prime || true`
   - `bd ready --json`
   如果没有任何任务，运行：
   - `bash .ai/figma-codex/scripts/init-beads-tasks.sh`
   然后重新运行 `bd ready --json`。

3. 只选择一个 unblocked task 开始。选择优先级最高、依赖已满足、范围最小的任务。必须运行：
   - `bd show <id> --long`
   - `bd update <id> --claim`
   不允许只看任务标题就开始做事。

4. 开始实现前，先做 repo inspection：用 `rg` / `find` / `sed` 阅读真实代码路径，确认 open-design 当前版本的结构。不要假设文件路径一定和文档完全一致；文档是方向，真实仓库代码是事实。

5. 每个任务只完成它自己的范围。不要跨任务重构。发现需要新增工作时，用 `bd create` 创建后续任务，或者用 `bd update <id> --notes` 记录，不要在当前任务里偷偷扩张。

6. 任何涉及 Figma canvas 写入的设计必须遵守：
   - 优先使用 Figma Remote MCP，不自研 Figma REST 写画布通道。
   - `use_figma` 前必须加载/遵守 `figma-use` 规则；如果当前 Codex 环境没有该官方 skill，必须在说明中标记为待安装/待验证。
   - 先 `search_design_system`，再决定是否创建 primitives。
   - 优先复用 components / variables / styles / Auto Layout。
   - 不输出 screenshot-only mockup，不把 HTML 当最终 Figma 交付物。
   - 写完后必须要求 `get_metadata`、`get_screenshot`、`get_variable_defs` 或等价检查。

7. 每个任务完成时必须：
   - 更新相关文档或测试。
   - 运行与变更范围相称的验证命令，例如 `pnpm lint`、`pnpm test`、`pnpm tools-dev check`，如果命令不存在要说明并查找项目实际命令。
   - 用 `bd update <id> --notes "..."` 写入完成摘要、验证结果、遗留风险。
   - 如果验收通过，运行 `bd close <id> --reason "Completed: ..."`。
   - 最后运行 `bd ready --json`，告诉我下一项推荐任务。

8. 输出格式：
   - 当前任务 ID 和标题
   - 读过的关键文件
   - 实施摘要
   - 修改文件列表
   - 验证命令和结果
   - Beads 状态更新
   - 下一项推荐任务

现在开始，先读取上下文，再进入 Beads 工作流。
```

## 后续会话提示词

后续每次继续时，使用 `.ai/figma-codex/prompts/work-next.md`。

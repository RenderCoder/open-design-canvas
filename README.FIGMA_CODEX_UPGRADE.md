# Open Design → Figma Native + Codex CLI 改造作战包

这个压缩包用于把 `nexu-io/open-design` 的 fork 改造成一个更适合 **AI 直接操作 Figma 画布、生成可维护设计稿** 的开源项目基准。

它不是一次性代码补丁，而是一套给 Codex CLI 使用的长期改造框架：

- repo 级 `AGENTS.md` 规则追加片段
- Codex + Figma MCP 配置模板
- 可复用 Codex Skills
- Open Design 可识别的 Figma-native Skills 草案
- Figma-native Design System 模板
- 研究结论、架构方案、schema、验收清单
- Beads / `bd` 任务初始化脚本与任务详情
- 黄金提示词与持续执行提示词


## 推荐项目名

我建议这个 fork 的长期名字使用：

```text
Open Design Canvas
```

推荐 repo slug：

```text
open-design-canvas
```

推荐 tagline：

```text
A Figma-native AI design workbench built on Open Design, Codex CLI, and Figma MCP.
```

原因：它保留 Open Design 的来源，又不会把项目品牌完全绑死在 Figma 这个单一 vendor 上。Figma 仍然是第一优先级 backend，但项目未来可以扩展到其他 native canvas。详细命名说明见 `.ai/figma-codex/docs/PROJECT_NAMING.md`。

## 推荐使用顺序

在你的 open-design fork 仓库根目录执行：

```bash
# 1. 解压本包到仓库根目录后，安装/合并 agent 指南与模板
bash .ai/figma-codex/scripts/install.sh

# 2. 初始化 Beads。你已经计划执行 bd init；这里保留为明确步骤
bd init

# 3. 创建 AI 专用任务图，带依赖关系
bash .ai/figma-codex/scripts/init-beads-tasks.sh

# 4. 配置 Figma Remote MCP 给 Codex CLI
codex mcp add figma --url https://mcp.figma.com/mcp
# 按提示完成 Figma OAuth 授权

# 5. 启动 Codex，让它按任务图逐项改造
cat GOLDEN_PROMPT.md
```

然后把 `GOLDEN_PROMPT.md` 里的提示词粘贴给 Codex CLI。后续每个会话使用：

```bash
cat .ai/figma-codex/prompts/work-next.md
```

或者直接运行：

```bash
bash .ai/figma-codex/scripts/codex-work-next.sh
```

## 目录说明

```text
.ai/figma-codex/
  docs/                       # 调研、架构、实施、QA、维护文档
  prompts/                    # 黄金提示词、下一任务提示词、Figma canvas prompt 合约
  scripts/                    # 安装脚本、Beads 初始化脚本、Codex 执行脚本
  tasks/                      # 每个 bd 任务的详细 body 文件
  task_manifest.json          # 任务和依赖图 manifest

.agents/skills/               # Codex 仓库级 skills
.codex/config.example.toml    # Codex 配置模板，不会强行覆盖已有 config.toml
design-systems/figma-native-base/
                              # Figma-native DESIGN.md / FIGMA.md / tokens.json / component-map.json
skills/figma-native-*/        # Open Design 新增 Figma-native skill 草案
AGENTS.figmacodex.append.md   # install.sh 会追加到 AGENTS.md
GOLDEN_PROMPT.md              # 启动整个改造计划的黄金提示词
README.FIGMA_CODEX_UPGRADE.md # 本文件
```

## 总体原则

这次改造的目标不是把 Open Design 变成一个自研 Figma 插件，也不是让它绕过 Figma 官方能力。目标是：

> Open Design 负责设计方法论、prompt stack、skill system、设计系统、任务编排与质检；Codex CLI 负责代码改造和 agent 执行；Figma Remote MCP 负责真实 Figma-native canvas 写入。

改造完成后，用户应该能在 Open Design 里选择 Figma-native skill，输入设计需求和 Figma 文件链接，让 AI 生成或更新 Figma 画布，并获得结构化结果报告、截图/metadata 检查、变量/组件复用说明和后续迭代建议。

## 最小闭环

第一阶段不要追求“全自动替代设计师”。先完成这个闭环：

```text
用户需求 + Figma file URL
  ↓
Open Design discovery / direction / design system
  ↓
Codex CLI 读取 Figma-native skill
  ↓
Figma MCP search_design_system + use_figma 写 native canvas
  ↓
get_metadata / get_screenshot / get_variable_defs 自检
  ↓
Open Design 显示 Figma result card 与 lint report
```

完成这个闭环后，再扩展 landing、dashboard、mobile flow、canvas critique、design system import、Code Connect 等能力。

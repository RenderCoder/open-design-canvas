# QA Checklist：Figma-native 改造验收

## 工程验收

- [ ] `pnpm install` 成功。
- [ ] 项目实际支持的 lint 命令通过。
- [ ] 项目实际支持的 test 命令通过。
- [ ] 旧的 HTML prototype / deck / template skill 不回归。
- [ ] 新的 `figma` mode 不影响旧 catalog。
- [ ] TypeScript 类型无明显 any 泄漏；必要时解释过渡策略。
- [ ] 错误状态有 UI 或日志可见。

## Skill registry 验收

- [ ] `skills/figma-native-screen/SKILL.md` 能被发现。
- [ ] `od.mode: figma` 被保留为 mode。
- [ ] `preview.type: figma-canvas` 被保留为 preview type。
- [ ] skill picker 能按 platform/scenario 展示。
- [ ] 没有把 figma mode 错当成 prototype HTML。

## Prompt composer 验收

- [ ] Figma mode prompt 明确 final deliverable 是 Figma-native canvas。
- [ ] Figma mode prompt 禁止把 HTML artifact / screenshot-only mockup 当最终交付。
- [ ] Prompt 包含 `search_design_system` → `use_figma` → validation 的顺序。
- [ ] Prompt 要求 Auto Layout、variables/styles、semantic layer names。
- [ ] Prompt 要求 structured result report。
- [ ] Discovery form 仍可锁定 surface/audience/tone/brand/scale/constraints。

## Figma MCP 验收

- [ ] 文档说明如何运行 `codex mcp add figma --url https://mcp.figma.com/mcp`。
- [ ] 文档说明 Full seat / edit permission 要求。
- [ ] 文档说明 rate limits 和 large frame 限制。
- [ ] 真实 smoke test 前检查 MCP connected。
- [ ] `use_figma` 前要求加载/遵守 `figma-use` skill。
- [ ] design system search 在 primitives 之前。

## Canvas 输出质量验收

- [ ] 生成的是可编辑 Figma nodes，不是图片贴图。
- [ ] 主要容器使用 Auto Layout。
- [ ] layer/frame/component 命名语义化。
- [ ] 尽量使用 variables/styles，hardcoded value 有报告。
- [ ] 复用 components，缺失组件有说明。
- [ ] 核心 layout 能 resize 或至少有响应意图说明。
- [ ] 有 screenshot / metadata / variable defs 检查。
- [ ] 有 known issues 和 next iteration。

## 开源质量验收

- [ ] README 说明 Figma-native feature 的目标和限制。
- [ ] Maintainer guide 说明如何新增 Figma-native skill。
- [ ] License / attribution 保留 Apache-2.0 要求。
- [ ] 品牌风格系统只作为 inspiration，不暗示官方授权。
- [ ] 贡献者能按 docs 跑 MVP。

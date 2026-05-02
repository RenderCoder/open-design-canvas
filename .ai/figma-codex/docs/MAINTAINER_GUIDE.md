# Maintainer Guide：如何扩展 Figma-native Open Design

## 新增一个 Figma-native skill

1. 在 `skills/<skill-id>/SKILL.md` 新建 skill。
2. frontmatter 使用：

```yaml
---
name: figma-native-xxx
description: Create or update ... directly in Figma using Figma MCP.
triggers:
  - figma xxx
od:
  mode: figma
  surface: figma
  platform: desktop
  scenario: design
  preview:
    type: figma-canvas
  design_system:
    requires: true
  figma:
    requires_mcp: true
    requires_full_seat: true
    output_kind: native-canvas
---
```

3. references 至少包括：
   - `figma-mcp-contract.md`
   - `canvas-lint.md`
   - 与该 skill 相关的 layout / component patterns。

4. Skill body 必须包含：
   - input requirements
   - workflow
   - validation
   - structured result report
   - failure recovery

## 新增设计系统

每个 Figma-native design system 建议包含：

```text
DESIGN.md          # 视觉语言和品牌规则
FIGMA.md           # Figma variables/styles/components/Auto Layout/naming 规则
tokens.json        # agent 可解析 token starter
component-map.json # 组件查询与 fallback 规则
```

## 增量发展路线

1. MVP：Figma-native screen/landing。
2. Quality：canvas lint + result card。
3. System：design system import / component map / token bridge。
4. Hybrid：HTML preview → generate_figma_design → use_figma cleanup。
5. Productization：plugin / examples / contributor docs。

## 开源边界

- 保留原项目 license 与 attribution。
- 对第三方品牌 design system 使用 “inspired by / reference style” 表达，避免暗示品牌授权。
- 对 Figma MCP 的 beta、seat、permission、rate limit 明确说明。

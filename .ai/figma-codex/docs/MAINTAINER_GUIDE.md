# Maintainer Guide：如何扩展 Figma-native Open Design

Use this guide when changing the Figma-native surface itself: skills, design
systems, result schema, prompt composition, Codex JSONL parsing, or UI result
rendering. User setup and first-run instructions live in
[`USER_GUIDE.md`](USER_GUIDE.md); MCP setup details live in
[`FIGMA_MCP_SETUP.md`](FIGMA_MCP_SETUP.md).

## 维护边界

- Open Design Canvas owns orchestration, skills, design systems, discovery,
  prompt composition, lint expectations, and result review.
- Codex CLI owns the agent execution layer and JSONL event stream.
- Figma Remote MCP owns native canvas writes and reads.
- Do not add a custom Figma REST write-canvas path for frames, components,
  variables, styles, or Auto Layout.
- Keep Figma-native mode additive. Existing prototype, deck, template, image,
  video, and audio workflows must continue to work.

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
    supports_existing_file: true
    supports_create_new_file: true
    output_kind: native-canvas
    validation:
      metadata: true
      screenshot: true
      variable_defs: true
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
   - explicit instruction that final output is editable Figma-native canvas, not
     HTML, screenshots, or pasted bitmap mockups.

5. Verify discovery and prompt composition:

```bash
pnpm --filter @open-design/daemon test -- skills
pnpm --filter @open-design/e2e test -- figma-native-mocked-flow.test.tsx
```

## 新增设计系统

每个 Figma-native design system 建议包含：

```text
DESIGN.md          # 视觉语言和品牌规则
FIGMA.md           # Figma variables/styles/components/Auto Layout/naming 规则
tokens.json        # agent 可解析 token starter
component-map.json # 组件查询与 fallback 规则
```

Rules for design-system files:

- `DESIGN.md` describes visual language and brand rules.
- `FIGMA.md` describes Figma variables, styles, component sets, variant naming,
  Auto Layout, resizing, and semantic layer naming.
- `tokens.json` gives agents parseable starter tokens. Keep it generic and do
  not include private brand secrets.
- `component-map.json` names preferred component queries and acceptable
  primitive fallbacks.
- Third-party brand systems must be described as references or inspiration
  unless there is explicit authorization.

## Schema, parser, and UI changes

When adding or changing the Figma-native result shape:

1. Update the contract docs in `docs/schemas/figma-native.md` and, when needed,
   `.ai/figma-codex/schemas/figma-native-result.schema.json`.
2. Update parser fixtures under `apps/web/src/artifacts/fixtures/`.
3. Update result parser tests and result card tests.
4. Update `e2e/tests/figma-native-mocked-flow.test.tsx` so contributors can
   validate the flow without Figma credentials.
5. Preserve permissive parsing for extra fields, but keep required core fields
   stable enough for the result card.

When adding a new Figma MCP event mapping:

1. Extend the daemon JSONL event parser or mapper.
2. Keep raw tool names available for debugging.
3. Add user-friendly labels for common Figma phases such as design-system
   search, file creation, canvas write, metadata check, screenshot check, and
   variable check.
4. Test with a mocked Codex JSONL fixture before relying on real Figma access.

## Validation matrix

Use the smallest relevant command first:

| Change | Suggested validation |
|---|---|
| Skill metadata or registry | `pnpm --filter @open-design/daemon test -- skills` |
| Prompt directive or project metadata | `pnpm --filter @open-design/daemon test -- prompts` |
| Result parser or card | `pnpm --filter @open-design/web test -- FigmaResultCard` |
| Mocked end-to-end Figma path | `pnpm --filter @open-design/e2e test -- figma-native-mocked-flow.test.tsx` |
| Shared contracts or broad TS changes | `pnpm typecheck` |

Real Figma smoke tests are optional unless a task explicitly requires them. When
they are required, first run the mocked flow, then verify MCP configuration with
`.ai/figma-codex/scripts/check-figma-mcp.sh`, then use a non-private test file.

## Troubleshooting and maintainer risks

- Missing MCP: keep normal engineering flows unblocked with `required = false`;
  real canvas tasks must stop before `use_figma` and report the remediation.
- Permissions: existing-file writes require the authenticated Figma user to have
  edit access and the needed seat.
- Rate limits and large files: prefer `get_metadata` on the page or parent
  node, then inspect or update smaller frames.
- Malformed result: fix the parser only when the report contract is genuinely
  too strict; otherwise fix the skill/prompt so the agent returns valid
  `figma_native_result` JSON.
- Hardcoded tokens: treat raw hex, spacing, or type values as review findings.
  Prefer improving `FIGMA.md`, `tokens.json`, or `component-map.json` before
  weakening lint expectations.
- Secrets: never commit OAuth tokens, private Figma file IDs, customer file
  URLs, or screenshots containing private design content.

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
- 发布前复查 [`LICENSE_TRADEMARK_ATTRIBUTION.md`](LICENSE_TRADEMARK_ATTRIBUTION.md)。
- 不要提交官方第三方 logo、wordmark、品牌模板、私有 Figma file ID 或客户设计内容；需要 logo 时使用中性 placeholder，并让用户提供已授权资产。

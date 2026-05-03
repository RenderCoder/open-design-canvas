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
- Never store OAuth tokens, private file IDs, customer file URLs, or private
  screenshots in fixtures, logs, docs, Beads notes, or commits.

## 授权 / preflight contract

The visual wizard is the user path. CLI scripts are developer diagnostics and
fallbacks. Keep the app contract stable enough that Web, Electron, daemon, and
Codex behavior can evolve independently.

Shared contract:

- `packages/contracts/src/figma-preflight.ts` owns `FigmaPreflightSummary`,
  `FigmaPreflightStepCode`, default step-to-status/action mapping, safe details,
  target fingerprints, and the generation gate helper.
- `packages/contracts/src/api/projects.ts` owns
  `FigmaMcpSetupActionRequest`, `FigmaMcpSetupAction`, and the allowed setup
  action statuses.
- `FigmaPreflightSummary.canGenerate` is true only after the selected target has
  a ready status and a passed `write_probe_passed` step.
- `validateFigmaPreflightForTarget` rejects missing preflight, missing target,
  stale target fingerprints, not-ready summaries, and summaries without a
  passed write probe.

Daemon contract:

- `POST /api/projects/:id/figma/preflight` runs the checks for the selected
  target and stores `metadata.figmaPreflight` on the project.
- `POST /api/projects/:id/figma/mcp-action` accepts `prepare_mcp_setup`,
  `start_mcp_login`, and `poll_mcp_status`.
- `apps/daemon/src/server.ts` blocks Figma-native generation when the target is
  missing, the preflight is stale, or write permission has not passed.
- `apps/daemon/src/figma-preflight.ts` owns the runner logic and must keep
  `safeDetails` redacted. It may expose command text, expected MCP URL, safe
  host names, retry hints, probe names, and error classes; it must not expose
  tokens or private design content.

Setup action contract:

- `FigmaMcpSetupAction` supports `manual_command` today because Codex exposes
  `codex mcp login figma` as an interactive command.
- `canOpenExternal` and `url` exist for future Codex/Figma flows that can return
  an authorization URL. Electron already hands external `http(s)`, `figma:`, and
  `mailto:` links to the system browser.
- Web must always keep a copy-command and recheck fallback.

Write probe contract:

- The probe page is `ODC MCP Probe`; the probe frame is
  `ODC MCP Write Probe`.
- Repeated probes reuse the same page/frame instead of creating unbounded test
  nodes.
- Cleanup instructions must name only Open Design Canvas-owned nodes. Never ask
  users or agents to delete arbitrary pages, selected content, or nearby design
  nodes.

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

## Figma process snapshot archive

Figma-native completion must archive one high-resolution PNG process snapshot
after the final validation pass. Keep this path tied to the existing project
file store and Design Files panel; do not create a second snapshot filesystem or
a Figma-only gallery.

Implementation contract:

- The agent exports raw PNG bytes with Figma MCP / Plugin API `exportAsync`,
  normally through `use_figma`, and saves the bytes through
  `POST /api/projects/:id/figma/snapshot`.
- The daemon owns filename allocation, slug normalization, PNG IHDR dimension
  validation, low-resolution rejection, and collision-safe writes.
- Filenames use `figma-YYYYMMDD-HHmmss-<purpose-slug>.png`, capped to the
  contract limit. Same-second collisions append `-2`, `-3`, and so on without
  overwriting older Design Files.
- Export planning defaults to 2x and targets about 2800px minimum width for
  narrower frames, while capping the longest edge at 8192px. Any cap-induced
  degradation must be reported in `snapshot.warnings`.
- A snapshot failure must not roll back a successful Figma canvas write. Return
  a `partial` Figma result with `snapshot.status: "failed"` and a clear issue
  explaining that only the PNG archive failed.
- Do not use `get_screenshot` as the primary high-resolution archive path. It is
  validation evidence and can be lower resolution than the editable canvas.
- Do not place base64 PNG data in chat messages, logs, Beads notes, or result
  prose. Save the image as a project file and report only the structured
  `snapshot` object.

Relevant code and tests:

- `apps/daemon/src/figma-snapshot.ts`
- `packages/contracts/src/figma-result.ts`
- `packages/contracts/src/api/files.ts`
- `packages/contracts/src/prompts/figma-native.ts`
- `apps/web/src/artifacts/figma-result.ts`
- `apps/web/src/components/FigmaResultCard.tsx`
- `apps/web/src/components/FileViewer.tsx`
- `apps/daemon/tests/figma-snapshot.test.ts`
- `apps/web/src/components/FileViewer.test.tsx`
- `e2e/tests/figma-native-mocked-flow.test.tsx`

## Validation matrix

Use the smallest relevant command first:

| Change | Suggested validation |
|---|---|
| Skill metadata or registry | `pnpm --filter @open-design/daemon test -- skills` |
| Prompt directive or project metadata | `pnpm --filter @open-design/daemon test -- prompts` |
| Figma preflight runner or setup action | `pnpm --filter @open-design/daemon test -- figma-preflight` |
| Figma preflight routes or stale-target gate | `pnpm --filter @open-design/daemon test -- figma-preflight-route` |
| Figma preflight contract helpers | `pnpm --filter @open-design/web test -- figma-preflight-contract` |
| Authorization wizard UI | `pnpm --filter @open-design/web test -- FigmaMcpAuthorizationWizard` |
| Web daemon provider actions | `pnpm --filter @open-design/web test -- registry` |
| Result parser or card | `pnpm --filter @open-design/web test -- FigmaResultCard` |
| Figma snapshot export/save route | `pnpm --filter @open-design/daemon test -- figma-snapshot` |
| Image snapshot zoom and Design Files UI | `pnpm --dir apps/web exec vitest run -c vitest.config.ts src/components/FileViewer.test.tsx src/components/FileWorkspace.test.tsx src/components/FigmaResultCard.test.tsx` |
| Mocked end-to-end Figma path | `pnpm --filter @open-design/e2e test -- figma-native-mocked-flow.test.tsx` |
| Shared contracts or broad TS changes | `pnpm typecheck` |

Real Figma smoke tests are optional unless a task explicitly requires them. When
they are required, first run the mocked flow, then verify MCP configuration with
`.ai/figma-codex/scripts/check-figma-mcp.sh`, then use a non-private test file.

The mocked authorization matrix lives in
[`FIGMA_MCP_SETUP.md`](FIGMA_MCP_SETUP.md). Keep fixtures sanitized: use
placeholder file keys, redacted URLs, and synthetic Codex JSONL. Do not add real
OAuth sessions, real customer file IDs, screenshots, or private design text to
tests.

## Troubleshooting and maintainer risks

- Missing MCP: keep normal engineering flows unblocked with `required = false`;
  real canvas tasks must stop before `use_figma`, show the wizard action, and
  report the remediation.
- Wrong MCP URL: classify it as `figma_mcp_url_invalid`, expose only the safe
  host and expected official URL, and keep the fix inside setup actions.
- OAuth cancelled: classify it as `auth_required` / `authorize_figma`; do not
  treat a cancelled interactive login as write-permission failure.
- Permissions: existing-file writes require the authenticated Figma user to have
  edit access and the needed seat.
- Target stale: if the URL, node, page, root frame, plan, or new-file setting
  changes after a passed check, generation must re-run preflight before sending
  the Codex job.
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
- 发布候选版本前复查 [`RELEASE_READINESS.md`](RELEASE_READINESS.md)，并更新 pass/defer 状态、验证结果、known limitations 和 roadmap。
- 不要提交官方第三方 logo、wordmark、品牌模板、私有 Figma file ID 或客户设计内容；需要 logo 时使用中性 placeholder，并让用户提供已授权资产。

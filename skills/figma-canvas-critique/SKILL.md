---
name: figma-canvas-critique
description: Critique an existing Figma-native output using metadata, screenshot, variables/styles, design-system reuse, Auto Layout, semantic naming, accessibility, and AI-design quality checks.
triggers:
  - critique figma canvas
  - review figma design
  - figma lint
od:
  mode: figma
  surface: figma
  platform: desktop
  scenario: design
  preview:
    type: figma-canvas
  design_system:
    requires: false
  figma:
    requires_mcp: true
    requires_full_seat: false
    default_editor: design
    output_kind: critique-report
    supports_existing_file: true
    supports_create_new_file: false
    validation:
      metadata: true
      screenshot: true
      variable_defs: true
---

# Figma Canvas Critique

> Read `references/figma-mcp-contract.md`, `references/canvas-lint.md`, and `references/result-report.md` before reviewing canvas.

## Deliverable

A structured critique report and repair plan for an existing Figma frame/selection. Do not create a new canvas and do not emit HTML as the deliverable.

## Inputs to resolve

- User brief and intended audience, if available.
- Existing Figma file URL or selection URL.
- Target frame/page/node IDs from the URL or user context.
- Active `DESIGN.md` and optional `FIGMA.md` guidance.
- Prior `figma_native_result` report, if the run being reviewed produced one.

## Workflow

1. Read `references/figma-mcp-contract.md`, `references/canvas-lint.md`, and `references/result-report.md`.
2. Resolve the existing Figma target. Prefer a focused selection or frame over a whole page.
3. Use `get_metadata` for structure, node naming, hierarchy, Auto Layout hints, dimensions and frame count.
4. Use `get_screenshot` for visual hierarchy, content specificity, accessibility and interaction-state review.
5. Use `get_variable_defs` or equivalent variable/style inspection for token usage and hardcoded-value risk.
6. Compare any prior `figma_native_result` report against the real metadata/screenshot/variables evidence.
7. Score the canvas from 1-5 on intent fit, hierarchy, system reuse, structure, specificity, accessibility and extensibility.
8. Return severity-ranked issues and a repair plan. Every issue must include:
   - `priority`: `P0`, `P1` or `P2`.
   - `severity`: `error`, `warning` or `info` for parser compatibility.
   - `check`: the failing lint dimension.
   - `message`: specific evidence, not generic design advice.
   - `nodeId` when metadata identifies a concrete node.
   - `repair`: the concrete `use_figma` cleanup action to perform if repair is requested.

## Report format

Return a final fenced `figma_native_result` JSON object. Use `status: "completed"` when the audit ran, `status: "partial"` when one validation source is missing, and `status: "blocked"` when the Figma target or MCP access is unavailable.

Include:

- `fileUrl`, `fileKey`, `pageName`, and `rootFrames` when known.
- `checks.metadata`, `checks.screenshot`, `checks.variables`, `checks.autoLayout`, and `checks.semanticNames`.
- `issues` sorted by `P0`, then `P1`, then `P2`.
- `nextActions` as the repair plan in execution order.
- `mcpEvents` listing the MCP checks attempted.

## Do not

- Modify the file unless explicitly asked.
- Pull huge frames all at once when a smaller selection exists.
- Give generic visual feedback without tying it to metadata, screenshot or variable evidence.

# Figma-Native Contracts

**Parent:** [`../architecture.md`](../architecture.md) · **ADR:** [`../adr/figma-native-mode.md`](../adr/figma-native-mode.md)

This document defines the stable Phase 0 contract for Open Design Canvas Figma-native work. It is a documentation contract for later code tasks; app implementations may start with permissive parsers but should keep these names stable.

## Skill Metadata

Figma-native Open Design skills use the existing `od:` frontmatter shape with additive Figma fields.

```yaml
od:
  mode: figma
  surface: figma
  platform: desktop | mobile | tablet | responsive
  scenario: design | marketing | operation | engineering | product | sales | personal
  preview:
    type: figma-canvas
  design_system:
    requires: true
  figma:
    requires_mcp: true
    requires_full_seat: true
    default_editor: design
    output_kind: native-canvas
    supports_existing_file: true
    supports_create_new_file: true
    validation:
      metadata: true
      screenshot: true
      variable_defs: true
```

Compatibility rules:

- `od.mode: figma` is a mode value, not a replacement for existing modes.
- `preview.type: figma-canvas` means the primary preview is a Figma target/result card, not an iframe HTML artifact.
- Unknown `od.figma` fields should be retained where practical.
- Existing non-Figma skills must not require Figma metadata.

## Project Metadata

`figmaTarget` is optional project metadata. It identifies the write target for a Figma-native run.

```ts
export type FigmaTarget = {
  mode: "existing-file" | "existing-selection" | "new-file";
  fileUrl?: string;
  fileKey?: string;
  nodeId?: string;
  pageName?: string;
  frameName?: string;
  planKey?: string;
  editorType?: "design" | "figjam";
};
```

`figmaOutputSettings` records run preferences. Defaults should be conservative and backward-compatible.

```ts
export type FigmaOutputSettings = {
  outputMode: "figma-native" | "html-artifact" | "hybrid-code-to-canvas";
  preferDesignSystemReuse: boolean;
  allowPrimitiveFallback: boolean;
  runCanvasLint: boolean;
  requireScreenshotCheck: boolean;
  requireVariableCheck: boolean;
};
```

Compatibility rules:

- Projects without `figmaTarget` are not Figma-native by default.
- Missing settings should use product defaults; old project records must remain readable.
- `fileUrl`, `fileKey`, `nodeId`, and `planKey` must not be logged as secrets, but private customer file IDs should not be committed in fixtures or docs.

## Result Envelope

Agents should return a structured `figma_native_result` envelope at the end of a Figma-native run.

```json
{
  "kind": "figma_native_result",
  "status": "completed",
  "fileUrl": "https://www.figma.com/design/...",
  "fileKey": "...",
  "pageName": "AI Landing Exploration",
  "rootFrame": {
    "name": "Landing / Desktop / 1440",
    "nodeId": "...",
    "width": 1440,
    "height": 3200
  },
  "created": [
    { "type": "FRAME", "name": "Hero", "nodeId": "..." }
  ],
  "updated": [],
  "reusedComponents": [
    { "name": "Button / Primary", "source": "team library" }
  ],
  "variablesUsed": ["color/bg/default", "space/8"],
  "stylesUsed": ["Text/Display/Large"],
  "hardcodedValues": [],
  "checks": {
    "metadata": "passed",
    "screenshot": "passed",
    "variables": "passed",
    "autoLayout": "passed",
    "semanticNames": "passed"
  },
  "knownIssues": [],
  "nextIteration": ["Add mobile variant"]
}
```

Required fields for the first parser:

- `kind` must equal `figma_native_result`.
- `status` must be one of `completed`, `partial`, `blocked`, or `failed`.
- `fileUrl` identifies the target Figma file when one exists. For blocked runs before file creation, implementations may accept an empty string plus a known issue.
- `checks` reports validation status.

Recommended fields:

- `fileKey`, `pageName`, and `rootFrame`.
- `created` and `updated` node summaries.
- `reusedComponents`, `variablesUsed`, `stylesUsed`, and `hardcodedValues`.
- `knownIssues` and `nextIteration`.

The seed JSON Schema lives at [`.ai/figma-codex/schemas/figma-native-result.schema.json`](../../.ai/figma-codex/schemas/figma-native-result.schema.json). Later implementation should either promote that schema into project-owned code or generate runtime validation from it.

## MCP Events

`mcp_events` are Open Design's normalized representation of Codex JSONL MCP tool calls.

```ts
export type McpEvent = {
  type: "mcp_event";
  server?: string;
  tool: string;
  status?: "started" | "completed" | "failed";
  phase?: "design_system_search" | "file_created" | "canvas_updated" | "metadata_checked" | "screenshot_checked" | "variables_checked" | "canvas_lint";
  input?: unknown;
  output?: unknown;
  error?: string;
};
```

Figma-native UI should derive friendly progress from these events, but the raw tool name should remain available for debugging. At minimum:

| MCP tool | Suggested phase |
| --- | --- |
| `search_design_system` | `design_system_search` |
| `create_new_file` | `file_created` |
| `use_figma` | `canvas_updated` |
| `get_metadata` | `metadata_checked` |
| `get_screenshot` | `screenshot_checked` |
| `get_variable_defs` | `variables_checked` |

## Canvas Write Boundary

Figma-native canvas writes must go through Figma Remote MCP. Open Design should not add a custom REST write-canvas implementation for frames, components, variables, styles, or Auto Layout.

Allowed responsibilities in Open Design:

- Prompt composition and skill/design-system context.
- Target metadata capture.
- Codex adapter invocation.
- MCP event parsing and progress display.
- Result envelope parsing.
- Mocked fixtures and schema tests.

Disallowed for this mode:

- Treating HTML, screenshots, or pasted bitmaps as the final Figma-native deliverable.
- Building a custom Figma REST canvas writer as the primary output path.
- Committing OAuth tokens, private file IDs, or customer design data.

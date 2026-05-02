# Figma-native Schemas

## Skill frontmatter schema

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

## Project metadata extension

```json
{
  "kind": "figma",
  "figmaTarget": {
    "mode": "existing-file",
    "fileUrl": "https://www.figma.com/design/...",
    "fileKey": "...",
    "nodeId": "...",
    "pageName": "AI Explorations",
    "frameName": "Landing / Desktop / 1440",
    "editorType": "design"
  },
  "figmaOutputSettings": {
    "outputMode": "figma-native",
    "preferDesignSystemReuse": true,
    "allowPrimitiveFallback": true,
    "runCanvasLint": true,
    "requireScreenshotCheck": true,
    "requireVariableCheck": true
  }
}
```

## Result report schema

See `.ai/figma-codex/schemas/figma-native-result.schema.json`.

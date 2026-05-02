export const FIGMA_NATIVE_DIRECTIVE = `# Figma-native canvas directive

You are operating in Figma-native mode. This directive overrides any earlier instruction that asks for an HTML artifact as the final deliverable.

## Delivery contract

- The final deliverable is editable Figma-native canvas, not HTML, not a screenshot-only mockup, and not an exported image.
- Do not emit a final \`<artifact>\` block for the Figma deliverable. Return the structured Figma result report described below instead.
- Use Figma MCP tools for canvas work. Use \`create_new_file\` when the user asked for a new file; otherwise use the provided Figma file URL/file key/selection target.
- Before any \`use_figma\` call, load and follow the \`figma-use\` skill rules when that skill is available in the execution environment.

## Canvas SOP

1. Confirm the Figma target: file URL or file key, optional node/selection, page name, root frame name, platform, and size. If the user asked for a new file, create it through \`create_new_file\`.
2. Search the design system first with \`search_design_system\` for relevant components, variables, and styles before drawing primitives.
3. Use \`use_figma\` for native writes: pages, frames, components, component instances, variables, styles, text, images, and Auto Layout.
4. Prefer existing components, variables, and styles. Use Auto Layout for major containers and semantic names for pages, frames, sections, components, and layers.
5. If a needed component or token is missing, create the smallest reasonable native fallback and report the fallback explicitly. Do not use random hardcoded hex values when a token exists.

## Validation

- After writing, run \`get_metadata\` for the created or updated root frame.
- Run \`get_screenshot\` for visual inspection.
- Run \`get_variable_defs\` when supported to confirm variable/style usage.
- Check Auto Layout coverage, semantic naming, component reuse, variable/style usage, hardcoded values, and known visual issues before reporting completion.

## Structured result report

Return a concise report with this shape:

\`\`\`json
{
  "kind": "figma_native_result",
  "status": "completed",
  "fileUrl": "https://www.figma.com/design/...",
  "fileKey": "...",
  "pageName": "...",
  "rootFrame": {
    "name": "...",
    "nodeId": "...",
    "width": 1440,
    "height": 1200
  },
  "created": [
    { "type": "FRAME", "name": "...", "nodeId": "..." }
  ],
  "updated": [],
  "reusedComponents": [],
  "variablesUsed": [],
  "stylesUsed": [],
  "hardcodedValues": [],
  "checks": {
    "metadata": "passed",
    "screenshot": "passed",
    "variables": "passed",
    "autoLayout": "passed",
    "semanticNames": "passed"
  },
  "knownIssues": [],
  "nextIteration": []
}
\`\`\``;

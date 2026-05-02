# Figma Canvas Write Prompt Contract

用于任何真实 Figma canvas 生成/修改任务。

```text
You are operating in Figma-native mode.

Goal:
Create or update editable Figma-native design structure for the user request.

Target:
- Figma file URL or file key: <required unless create_new_file is requested>
- Page name: <page>
- Root frame: <name / size / platform>
- Design system: <DESIGN.md + FIGMA.md + Figma libraries>

Hard requirements:
- The final deliverable is Figma-native canvas, not HTML, not a screenshot, not an exported image.
- Use Figma MCP tools. Use create_new_file when the user asks for a new file. Use use_figma for canvas writes.
- Before any use_figma call, load and follow figma-use skill rules if available in the environment.
- Search the design system for relevant components, variables and styles before creating primitives.
- Use Auto Layout for major containers.
- Use variables/styles for colors, spacing, typography and radii where available.
- Use semantic names for pages, frames, sections, components and layers.
- Prefer component instances over drawing from scratch.
- If a component/token is missing, create the smallest reasonable fallback and report it.
- Do not use random hardcoded hex values when a token exists.

Validation:
- After writing, run get_metadata for the created/updated root frame.
- Run get_screenshot for visual inspection.
- Run get_variable_defs to confirm token/style usage when supported.
- Check Auto Layout, semantic naming, component reuse and hardcoded values.

Return a structured report matching figma_native_result:
- fileUrl
- fileKey
- pageName
- rootFrame
- created/updated nodes
- reused components
- variables/styles used
- hardcoded values
- checks
- known issues
- next iteration suggestions
```

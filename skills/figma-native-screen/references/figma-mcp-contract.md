# Figma MCP Contract

## Required tools by purpose

- `whoami`: identify authenticated Figma account and available plans when needed.
- `create_new_file`: create a blank design file when user asks for a new file.
- `search_design_system`: find components, variables and styles before primitives.
- `use_figma`: create, edit, delete or inspect Figma-native objects.
- `get_metadata`: inspect sparse tree and validate names/types/sizes.
- `get_screenshot`: verify visual result.
- `get_variable_defs`: verify token/style usage.
- `generate_figma_design`: optional hybrid capture for live Web UI, especially when images are present.
- Project snapshot save route: after MCP export, POST raw PNG bytes to `OD_DAEMON_URL` + `/api/projects/${OD_PROJECT_ID}/figma/snapshot`.

## Invariants

- Native canvas > screenshot.
- Design-system reuse > primitive drawing.
- Variables/styles > hardcoded values.
- Auto Layout > absolute layout.
- Semantic names > default layer names.
- Small context chunks > huge frame dumps.
- Figma `exportAsync` PNG bytes > low-resolution screenshot fallback for process snapshots.
- Design Files snapshot persistence > base64 image data in chat logs.

## Process snapshot

After final validation and repair, export exactly one PNG snapshot of the final
root frame/page through `use_figma` and Plugin API `exportAsync`. Use a SCALE
constraint of at least `2`, or higher when needed to target about 2800px width
for narrow frames. Keep the longest edge at or below 8192px.

Save the resulting raw PNG bytes to:

```text
${OD_DAEMON_URL}/api/projects/${OD_PROJECT_ID}/figma/snapshot?purpose=<short-purpose>&sourceWidth=<frame-width>&sourceHeight=<frame-height>&sourceFileKey=<file-key>&sourceNodeId=<node-id>&sourceNodeName=<node-name>
```

The daemon owns filename allocation, collision handling, PNG dimension
validation, and Design Files persistence. If the route returns a failed
snapshot, report that failure in the final result but do not roll back completed
Figma canvas work.

## Final report

Always return a structured `figma_native_result` report.

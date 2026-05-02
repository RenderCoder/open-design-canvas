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

## Invariants

- Native canvas > screenshot.
- Design-system reuse > primitive drawing.
- Variables/styles > hardcoded values.
- Auto Layout > absolute layout.
- Semantic names > default layer names.
- Small context chunks > huge frame dumps.

## Final report

Always return a structured `figma_native_result` report.

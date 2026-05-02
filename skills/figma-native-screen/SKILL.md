---
name: figma-native-screen
description: Create or update one editable Figma-native product screen or composed view using Figma MCP, design-system components, variables, styles, Auto Layout, semantic layer names, and validation checks.
triggers:
  - figma screen
  - create figma view
  - update figma canvas
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
    default_editor: design
    output_kind: native-canvas
    supports_existing_file: true
    supports_create_new_file: true
    validation:
      metadata: true
      screenshot: true
      variable_defs: true
---

# Figma Native Screen

> Read `references/figma-mcp-contract.md`, `references/layout-patterns.md`, `references/canvas-lint.md`, and `references/result-report.md` before writing canvas.

## Deliverable

A real editable Figma-native screen or composed view. Not HTML. Not screenshot-only.

## Inputs to resolve

- User brief.
- Figma target: existing file/selection URL or create new file.
- Platform and frame size.
- Active `DESIGN.md` and optional `FIGMA.md`.
- Existing design system components/tokens.

## Workflow

1. Ask discovery questions unless the user explicitly says to skip.
2. Resolve Figma target.
3. Search design system for relevant components, variables and styles.
4. Plan sections and component reuse.
5. Use `use_figma` to write native canvas.
6. Validate with metadata, screenshot and variable defs.
7. Run canvas lint.
8. Return structured result report.

## Must not

- Emit an HTML `<artifact>` as the final deliverable.
- Draw everything from primitives when design-system components exist.
- Use hardcoded random colors without reporting them.
- Leave default layer names.

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

## Deliverable

A structured critique report and repair plan for an existing Figma frame/selection.

## Workflow

1. Resolve selection URL.
2. Use `get_metadata` for structure.
3. Use `get_screenshot` for visual review.
4. Use `get_variable_defs` for token/style usage.
5. Score dimensions: intent, hierarchy, system reuse, structure, specificity, accessibility, extensibility.
6. Return P0/P1/P2 issues and repair steps.

## Do not

- Modify the file unless explicitly asked.
- Pull huge frames all at once when a smaller selection exists.

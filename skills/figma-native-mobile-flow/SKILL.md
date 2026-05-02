---
name: figma-native-mobile-flow
description: Create an editable multi-screen mobile flow in Figma using Figma MCP, mobile frame conventions, Auto Layout, design-system variables/components, semantic names, and validation checks.
triggers:
  - figma mobile flow
  - mobile app screens in figma
  - ios flow figma
od:
  mode: figma
  surface: figma
  platform: mobile
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

# Figma Native Mobile Flow

## Deliverable

2–5 editable mobile frames representing a coherent user flow.

## Workflow

1. Lock target platform, device size, flow steps and primary action.
2. Search design system for mobile nav, buttons, inputs, cards, icons, typography, tokens.
3. Create one frame per screen with order numbering, e.g. `01 Welcome`, `02 Choose Plan`.
4. Use vertical Auto Layout and mobile-safe tap targets.
5. Add state labels and annotations where behavior matters.
6. Validate metadata, screenshot and variables.

## P0 checks

- Each screen has semantic name and purpose.
- Tap targets are reasonable.
- CTA hierarchy is clear.
- Flow order is obvious on canvas.

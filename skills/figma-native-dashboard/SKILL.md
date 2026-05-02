---
name: figma-native-dashboard
description: Create an editable Figma-native dashboard or admin tool screen using Figma MCP, dense data-layout patterns, design-system components, variables, styles, Auto Layout, and canvas lint.
triggers:
  - figma dashboard
  - admin ui in figma
  - analytics dashboard figma
od:
  mode: figma
  surface: figma
  platform: desktop
  scenario: operation
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

# Figma Native Dashboard

## Deliverable

Editable dashboard screen with sidebar/topbar/content grid/table/chart areas.

## Workflow

1. Lock domain, user role, KPIs, data density and required states.
2. Search design system: Sidebar, NavItem, Card, Table, Chart, Tabs, Filter, Button, Input, Badge.
3. Use dashboard layout pattern from references.
4. Build with Auto Layout and component reuse.
5. Include realistic data and at least one empty/error/loading consideration if relevant.
6. Validate and report.

## P0 checks

- Sidebar/content hierarchy is clear.
- Data cards and tables use consistent spacing.
- Major containers use Auto Layout.
- Hardcoded data/copy is plausible and specific.

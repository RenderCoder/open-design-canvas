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

> Read `references/figma-mcp-contract.md`, `references/layout-patterns.md`, `references/canvas-lint.md`, and `references/result-report.md` before writing canvas.

## Deliverable

A real editable Figma-native dashboard or admin tool screen. Not HTML. Not screenshot-only.

The canvas should be optimized for repeated operational use: dense but scannable information hierarchy, tabular readability, realistic dashboard data, and explicit default/empty/loading/error states where relevant.

## Inputs to resolve

- User brief, domain, user role, and primary jobs-to-be-done.
- Figma target: existing file/selection URL or create new file.
- Dashboard density: executive overview, analyst workspace, operations console, or admin CRUD.
- Required KPIs, tables, charts, filters, and state variants.
- Active `DESIGN.md` and optional `FIGMA.md`.
- Existing design system components/tokens.

## Workflow

1. Read `references/figma-mcp-contract.md`, `references/layout-patterns.md`, `references/canvas-lint.md`, and `references/result-report.md`.
2. Ask discovery questions unless the user explicitly says to skip.
3. Resolve the Figma target and dashboard scope.
4. Search design system for relevant components, variables and styles before primitives: Sidebar, NavItem, Topbar, Card, Table, Chart, Tabs, Filter, Button, Input, Select, Badge, EmptyState, Alert, Skeleton, Tooltip.
5. Plan the dashboard structure:
   - fixed sidebar or app shell navigation;
   - topbar with title, search, filters, date range and account/status controls;
   - KPI strip with tabular numbers and deltas;
   - primary chart region with readable axes/legend;
   - tabular or list region with aligned columns, row states, sort/filter affordances;
   - secondary panels for incidents, cohorts, activity, alerts, or operational queues as the brief requires.
6. Use `use_figma` to write native canvas with Auto Layout, semantic names and reusable components.
7. Include realistic sample data and state coverage. At minimum document default plus any relevant empty, loading and error states; create compact state frames or named side panels when they fit the brief.
8. Validate with metadata, screenshot and variable defs.
9. Run canvas lint for alignment, tabular readability and hierarchy.
10. Return structured result report.

## P0 checks

- Sidebar/content hierarchy is clear.
- KPI cards, charts, filters and tables use consistent spacing and alignment.
- Tables use readable column alignment, row rhythm and tabular numerals.
- Filters and state controls are discoverable without crowding the content.
- Major containers use Auto Layout.
- Existing design-system components were reused before primitive fallback.
- Hardcoded data/copy is plausible and specific.
- Empty/loading/error states are included or explicitly reported as not applicable.

## Must not

- Emit an HTML `<artifact>` as the final deliverable.
- Draw everything from primitives when design-system components exist.
- Use chart decoration that obscures actual values, labels, axes or legends.
- Leave columns misaligned, rows uneven, or numeric values hard to compare.
- Leave default layer names.

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

> Read `references/figma-mcp-contract.md`, `references/layout-patterns.md`, `references/canvas-lint.md`, and `references/result-report.md` before writing canvas.

## Deliverable

2-5 editable mobile root frames representing a coherent mobile user flow. Not HTML. Not screenshot-only.

The canvas must make screen order, navigation relationships, mobile Auto Layout, and interaction states clear. Each screen should be a real native Figma frame using device-aware dimensions, design-system components, variables, styles, semantic layer names, and mobile-safe tap targets.

## Inputs to resolve

- User brief, app domain, target user, and flow goal.
- Figma target: existing file/selection URL or create new file.
- Target device and platform convention: iOS, Android, or generic mobile.
- Flow steps, screen count, primary CTA per screen, and navigation relationships.
- Relevant states: default, empty, loading, error, disabled, success, or permission state.
- Active `DESIGN.md` and optional `FIGMA.md`.
- Existing mobile design system components/tokens.

## Workflow

1. Read `references/figma-mcp-contract.md`, `references/layout-patterns.md`, `references/canvas-lint.md`, and `references/result-report.md`.
2. Ask discovery questions unless the user explicitly says to skip.
3. Resolve the Figma target, target device, flow goal, and screen count.
4. Search design system for mobile components, variables and styles before primitives: StatusBar, BottomNav, TabBar, Header, Button, IconButton, Input, Select, Card, ListItem, Stepper, Progress, Toast, EmptyState, Alert, Skeleton, Sheet, Modal, and mobile typography/spacing/radius variables.
5. Plan the flow map before writing:
   - one root frame per screen;
   - left-to-right order matching the user journey;
   - screen names with order, purpose and state, for example `01 Onboarding / Default`, `02 Plan Selection / Loading`, `03 Checkout / Error`;
   - navigation notes or connector labels describing primary transitions.
6. Use `use_figma` to write native mobile frames with Auto Layout, semantic names, reusable components, and device-safe dimensions such as `Mobile / iOS / 390x844` unless the brief specifies another target.
7. Keep each screen structured as mobile app chrome, content region and persistent action/navigation region where relevant.
8. Enforce mobile interaction quality: tap targets at least 44px, thumb-reachable primary actions when appropriate, visible focus/error messaging, and no clipped text.
9. Include state coverage. Create separate root frames for important empty/loading/error/success states, or explicitly report why a state is not applicable.
10. Validate with metadata, screenshot and variable defs.
11. Run canvas lint for flow order, Auto Layout, tap targets, navigation clarity, state coverage, component reuse, variables/styles, semantic names and hardcoded values.
12. Return a structured `figma_native_result` report with `rootFrames` containing every screen in order.

## P0 checks

- Each screen has semantic name and purpose.
- Screen order is obvious on canvas.
- Every screen is a separate mobile root frame.
- Root frame names include order and purpose.
- Navigation relationships and primary transitions are labeled.
- Tap targets are at least 44px.
- Mobile app chrome, content, and action/navigation regions use Auto Layout.
- Relevant default, empty, loading, error, success, or permission states are included or explicitly marked not applicable.
- CTA hierarchy is clear.
- Existing design-system components were reused before primitive fallback.
- Result report uses `rootFrames` and includes metadata, screenshot and variable check status for the flow.

## Must not

- Emit an HTML `<artifact>` as the final deliverable.
- Collapse the whole flow into one giant non-device frame.
- Draw everything from primitives when design-system components exist.
- Use tap targets below 44px without recording a known issue.
- Leave default layer names.

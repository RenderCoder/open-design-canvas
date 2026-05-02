---
name: figma-native-landing
description: Create an editable Figma-native SaaS or marketing landing page using Figma MCP, reusable components, variables, styles, Auto Layout, and a structured canvas lint report.
triggers:
  - figma landing
  - saas landing in figma
  - marketing page figma
od:
  mode: figma
  surface: figma
  platform: desktop
  scenario: marketing
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

# Figma Native Landing Page

> Read references before canvas writes.

## Deliverable

One desktop landing page root frame, optionally with mobile variant later.

## Recommended sections

- Hero with headline, subcopy, primary/secondary CTAs
- Social proof / logo cloud
- Feature grid
- Workflow / product story
- Pricing or plan comparison
- FAQ
- Final CTA / footer

## Workflow

1. Lock audience, offer, tone, brand and sections.
2. Search design system: Button, Card, Badge, Nav, PricingCard, FAQItem, Footer, text styles, color/spacing variables.
3. Create page and root desktop frame.
4. Build sections with Auto Layout and semantic names.
5. Reuse components; report fallbacks.
6. Validate and return result report.

## P0 checks

- Landing page is native Figma structure.
- Every section is a named Auto Layout frame.
- CTA buttons use components or consistent reusable frames.
- Typography scale is consistent.
- No generic filler copy.

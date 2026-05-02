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

> Read `references/figma-mcp-contract.md`, `references/layout-patterns.md`, `references/canvas-lint.md`, and `references/result-report.md` before writing canvas.

## Deliverable

A real editable Figma-native landing page for SaaS, product, campaign, or marketing launches. Not HTML. Not screenshot-only.

The canvas must be a multi-section desktop frame optimized for conversion and scanning. It should use specific copy, concrete proof points, design-system components, variables, styles, Auto Layout, and semantic layer names. Include responsive notes for mobile or tablet behavior, but keep the required deliverable to one desktop root frame unless the brief asks for variants.

## Inputs to resolve

- User brief, offer, audience, brand constraints, conversion goal, and primary CTA.
- Figma target: existing file/selection URL or create new file.
- Landing page scope: launch page, waitlist, pricing page, product overview, event/campaign, or docs/product-led page.
- Required sections, proof sources, pricing/CTA needs, and FAQ depth.
- Active `DESIGN.md` and optional `FIGMA.md`.
- Existing design system components/tokens.

## Recommended sections

- Hero with headline, subcopy, product/offer signal, primary and secondary CTAs.
- Social proof / logo cloud with named proof points.
- Feature grid with benefit-led cards and realistic details.
- Workflow / product story showing how the offer works.
- Pricing, plan comparison, or CTA section when relevant.
- FAQ that handles real adoption objections.
- Final CTA and footer with navigation and secondary links.

## Workflow

1. Read `references/figma-mcp-contract.md`, `references/layout-patterns.md`, `references/canvas-lint.md`, and `references/result-report.md`.
2. Ask discovery questions unless the user explicitly says to skip.
3. Resolve the Figma target and landing page scope.
4. Search design system for relevant components, variables and styles before primitives: Button, Card, Badge, NavItem, PricingCard, FAQItem, Footer, text styles, color variables, spacing variables, radius variables, and desktop layout grid styles.
5. Plan the root desktop frame and major sections:
   - `Landing / Desktop / 1440` root frame with vertical Auto Layout;
   - `Hero Section` with visible product/offer signal and CTAs;
   - `Proof Section` or `Logo Cloud`;
   - `Feature Grid`;
   - `Workflow Section` or product story;
   - `Pricing Section`, `CTA Section`, or both when relevant;
   - `FAQ Section`;
   - `Footer`.
6. Use `use_figma` to write native canvas with Auto Layout, semantic names and reusable components.
7. Use specific, brief-aware copy and realistic proof metrics. Avoid generic filler.
8. Add responsive notes as named annotations or a small side note frame, covering how the sections collapse on mobile.
9. Validate with metadata, screenshot and variable defs.
10. Run canvas lint for section coverage, hierarchy, component reuse, variables/styles, hardcoded values and responsive intent.
11. Return a structured `figma_native_result` report that identifies the root frame and each major section in `created` or `updated`.

## P0 checks

- Landing page is native Figma structure, not an HTML artifact.
- Root frame is named `Landing / Desktop / 1440` or another explicit desktop width.
- Every major section is a named Auto Layout frame.
- Hero, proof, features, workflow/story, CTA or pricing, FAQ, and footer are present or explicitly marked not applicable.
- CTA buttons use existing components or consistent reusable Figma fallback frames.
- Typography scale is consistent and uses styles when available.
- Variables/styles are used when available; hardcoded fallbacks are reported.
- Result report identifies major sections/root frames and includes metadata, screenshot and variable check status.
- Responsive notes are included for desktop-to-mobile collapse intent.
- Copy is specific to the brief; no generic filler.

## Must not

- Emit an HTML `<artifact>` as the final deliverable.
- Draw everything from primitives when design-system components exist.
- Use vague placeholder logos, metrics or testimonials without labeling them as placeholders.
- Hide the actual offer/product until below the fold.
- Leave default layer names.

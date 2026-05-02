# Figma Layout Patterns

## Landing page / desktop 1440

- Root frame: vertical Auto Layout, width 1440.
- Sections: Hero, LogoCloud, FeatureGrid, Workflow, Pricing, FAQ, CTA/Footer.
- Section padding: 96 top/bottom, 80 horizontal unless design system overrides.
- Max content width: 1120–1200.
- Use one display headline per section.

## Dashboard / desktop app

- Root frame: horizontal Auto Layout.
- Sidebar fixed width 240–280.
- Content frame fill container.
- Topbar height 64–72.
- Cards use grid / wrap patterns.
- Tables use header/body row components where available.

## Mobile flow

- Use device-specific frame sizes.
- One screen per root frame, grouped in logical order.
- Navigation, content, CTA areas use vertical Auto Layout.
- Tap targets >= 44px.
- Include state labels in frame names.

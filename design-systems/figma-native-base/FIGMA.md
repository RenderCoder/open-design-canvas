# FIGMA.md — Figma-specific rules

## Variables

Use these names when creating or mapping variables:

```text
color/bg/default
color/bg/subtle
color/surface/default
color/surface/elevated
color/text/primary
color/text/secondary
color/text/inverse
color/border/default
color/action/primary
color/action/primary-hover
color/status/success
color/status/warning
color/status/danger
space/0
space/2
space/4
space/8
space/12
space/16
space/24
space/32
space/48
radius/0
radius/4
radius/8
radius/12
radius/16
text/display/lg
text/display/md
text/heading/lg
text/heading/md
text/body/md
text/body/sm
text/caption
```

## Component search priority

Before primitives, search for:

- Button / Primary
- Button / Secondary
- Input / Default
- Card / Default
- Badge / Default
- NavItem / Default
- Table / Default
- PricingCard / Default
- FAQItem / Default

## Auto Layout

- Root frame uses vertical or horizontal Auto Layout according to surface.
- Major sections are frames with Auto Layout.
- Cards use internal vertical Auto Layout.
- Button/icon/text groups use horizontal Auto Layout.
- Use fixed width only for intentional rails/nav; use fill/hug elsewhere where appropriate.

## Naming

Good:

- `Landing / Desktop / 1440`
- `Hero Section`
- `Feature Card / Automation`
- `CTA Button / Primary`
- `Pricing / Pro Plan`

Bad:

- `Frame 123`
- `Group 5`
- `Rectangle 18`
- `Untitled`

## Fallback rule

If a component or variable cannot be found, create the smallest reasonable fallback and report it in `hardcodedValues` or `knownIssues`.

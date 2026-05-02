# Figma Native Base Implementation Rules

Use this file with `DESIGN.md` for native Figma canvas delivery. `DESIGN.md`
defines the visual intent; this file defines variable names, style names,
component lookup order, Auto Layout expectations, and validation reporting.

## MCP workflow

1. Use `search_design_system` for variables, styles, and components before
   drawing primitives.
2. Use `use_figma` for editable Figma nodes: pages, frames, components,
   instances, variables, styles, text, and Auto Layout.
3. Prefer imported component instances over rebuilt lookalikes.
4. After writing, run `get_metadata`, `get_screenshot`, and
   `get_variable_defs` when available.
5. Return a structured Figma result report with reused components,
   variables/styles used, hardcoded fallbacks, checks, known issues, and next
   iteration notes.

## Variables

Use these names when creating, searching, or mapping variables:

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

## Text styles

Search or create these style names when text styles are available:

```text
Text/Display/Large
Text/Display/Medium
Text/Heading/Large
Text/Heading/Medium
Text/Body/Medium
Text/Body/Small
Text/Caption
```

## Effect and grid styles

- `Effect/Focus Ring` for keyboard focus outlines.
- `Effect/Surface/Elevated` for subtle raised surfaces only.
- `Grid/Desktop/12` for desktop marketing and application layouts.
- `Grid/Mobile/4` for mobile flows.

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

If a design-system search returns variant-capable component sets, map variants
instead of importing a one-off default. For example, `Button / Primary` should
map to `Button` with `variant=primary`, not a detached primitive.

## Auto Layout

- Root frame uses vertical or horizontal Auto Layout according to surface.
- Major sections are frames with Auto Layout.
- Cards use internal vertical Auto Layout.
- Button/icon/text groups use horizontal Auto Layout.
- Use fixed width only for intentional rails/nav; use fill/hug elsewhere where appropriate.
- Avoid grouping as a layout substitute. Groups are acceptable only for imported
  assets or temporary references.

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

## Validation checklist

- Metadata shows semantic frame/layer names rather than defaults.
- Screenshot matches the intended viewport and is not blank or cropped.
- Variable definitions include the expected color, spacing, radius, and text
  tokens where the file supports them.
- Major containers use Auto Layout or explicitly document why they cannot.
- The result report lists all primitive fallbacks and hardcoded values.

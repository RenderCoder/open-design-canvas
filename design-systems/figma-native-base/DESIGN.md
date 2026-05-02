# Figma Native Base Design System

> Category: Figma Native
> Surface: figma
> Neutral, editable baseline for Figma-native canvas work. Pair with
> `FIGMA.md`, `tokens.json`, and `component-map.json` for MCP implementation
> guidance.

## 1. Color

- **Background:** `#F8F7F4` for page/canvas backgrounds.
- **Subtle background:** `#EFEEE9` for alternate bands and quiet panels.
- **Surface:** `#FFFFFF` for cards, tool surfaces, and modals.
- **Elevated surface:** `#FCFCFA` for nested surfaces that need a slight lift.
- **Primary text:** `#151515`, high contrast and never opacity-dimmed for body copy.
- **Secondary text:** `#5F6368`, only for metadata and supporting copy.
- **Default border:** `#E4E1DA` for dividers, card outlines, and input borders.
- **Primary action:** `#2563EB`, used sparingly for core commands.
- **Status:** success `#15803D`, warning `#B45309`, danger `#DC2626`; reserve
  these for state communication.

## 2. Typography

- Display: expressive but restrained; large enough to anchor one focal point.
- Heading: clear scale with visible hierarchy and short line lengths.
- Body: Inter or system sans, 16px base, generous line-height.
- Caption: 12px or 13px only for metadata, never for primary instructions.
- Mono: only for technical metadata, node IDs, or code-like labels.

## 3. Spacing

Use an 8-point rhythm with small exceptions for optical balance. Primary
section gaps should come from `space/32` or `space/48`; dense controls should
use `space/8`, `space/12`, or `space/16`.

## 4. Layout

- Prefer Auto Layout containers.
- One clear focal point per screen/section.
- Use max-width containers on desktop.
- Avoid ornamental clutter.
- Name top-level frames by surface, viewport, and width, for example
  `Landing / Desktop / 1440`.

## 5. Components

Prioritize reusable Figma components or component sets before primitives:

- Button
- Input
- Card
- Badge
- NavItem
- Modal/Dialog
- Table
- PricingCard
- FAQItem

If a library component is unavailable, create a small semantic fallback frame
and report it in the final Figma result.

## 6. Motion

Motion is optional. When used, document intent as annotations rather than hiding meaning in animation.

## 7. Voice

Specific, calm, concise. No generic “unlock your potential” filler unless user asks for that style.

## 8. Brand

This is a neutral base system for AI-generated Figma work. It should adapt to user-provided brand constraints.

## 9. Anti-patterns

- Random gradients.
- Hardcoded colors when tokens exist.
- Default layer names.
- Screenshot-only mockups.
- Overly generic SaaS copy.
- Absolute-positioned frame soup.
- Detached primitives where a component instance or variable exists.

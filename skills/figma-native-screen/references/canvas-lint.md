# Canvas Lint Checklist

## P0 — must pass

- Output is editable Figma-native structure.
- Root frame exists and is named semantically.
- Major containers use Auto Layout.
- Component search was performed before primitive fallback.
- Variables/styles are used when available.
- No dominant hardcoded random hex palette.
- Metadata and screenshot validation were attempted.

## P1 — should pass

- Layer names communicate intent.
- Repeated UI elements use components or reusable frames.
- Empty/loading/error states included when relevant.
- Responsive behavior or resize intent is clear.
- Copy and metrics are specific to the brief.

## P2 — polish

- Motion/interaction annotations.
- Dev handoff notes.
- Alternative variants.
- Token gaps filed for design system maintainers.

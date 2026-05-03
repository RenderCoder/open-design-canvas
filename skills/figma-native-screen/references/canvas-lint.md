# Canvas Lint Checklist

## P0 — must pass

- Output is editable Figma-native structure.
- Root frame exists and is named semantically.
- Major containers use Auto Layout.
- Component search was performed before primitive fallback.
- Variables/styles are used when available.
- No dominant hardcoded random hex palette.
- Metadata and screenshot validation were attempted.
- Text readability check was attempted after the initial layout. Check only visible TEXT nodes and do not fail for text overlapping images, backgrounds, shapes, vectors, rectangles, or frames.
- `text-text-overlap`: fail with `severity: "error"` when two visible, non-ignored TEXT bounding boxes intersect by at least 3% of the smaller text box, or 2% for display/title/subtitle/body hierarchy pairs.
- `text-too-close`: warn with `severity: "warning"` when stacked visible TEXT nodes do not overlap but their vertical gap is below one line-height.
- `ignored-text-overlap`: report with `severity: "info"` when overlapping text includes a node named or marked `od-lint-ignore:text-overlap`; include the ignored count.

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

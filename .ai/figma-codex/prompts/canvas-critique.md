# Canvas Critique Prompt

```text
Review this Figma-native output as a senior product designer and design-system maintainer.

Use Figma MCP metadata/screenshot/variable information if available.

Score 1-5:
1. Design intent: does it match the brief, audience and tone?
2. Hierarchy: is there one obvious focal point per screen/section?
3. System reuse: are components, variables and styles reused correctly?
4. Structure: Auto Layout, semantic layer names, maintainable frame tree.
5. Specificity: copy, data and UI states are specific, not generic filler.
6. Accessibility: contrast, tap targets, state clarity.
7. Extensibility: can this become a reusable screen/flow/component system?

Fail P0 if:
- final output is screenshot-only or HTML-only
- major frames are absolute-positioned chaos
- hardcoded colors dominate despite available tokens
- default layer names make the tree unusable
- no validation report exists

Return:
- score table
- P0/P1/P2 issues
- exact repair plan
- whether the agent should run another use_figma cleanup pass
```

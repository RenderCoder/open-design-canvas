# Figma-native Best Practices for Agents

## Canvas write workflow

```text
1. Resolve target
   - Existing file URL / selection URL
   - Or create_new_file → file_url / file_key

2. Inspect design system
   - search_design_system for Button, Card, Nav, Input, tokens, text styles
   - get_variable_defs if working from an existing selection

3. Plan structure
   - page name
   - root frame size
   - sections/screens
   - component reuse plan
   - primitive fallback plan

4. Write canvas
   - use_figma
   - frames + Auto Layout
   - components/instances where available
   - variables/styles binding
   - semantic layer names

5. Validate
   - get_metadata
   - get_screenshot
   - get_variable_defs
   - canvas lint checklist

6. Report
   - created/updated nodes
   - reused components
   - variables/styles
   - hardcoded values
   - issues
   - next iteration
```

## Prompt clauses that reliably reduce AI slop

Use these in Figma-native skills:

- “Create editable Figma-native structure, not a screenshot or HTML artifact.”
- “Search the design system for components, variables and styles before creating primitives.”
- “Use Auto Layout for all major containers.”
- “Use semantic layer names; never leave `Frame 12`, `Group 5`, `Rectangle 8` except for decorative primitives.”
- “Bind colors, spacing, typography and radii to variables/styles where available.”
- “Report every hardcoded value that could not be mapped to a token.”
- “After writing, inspect with metadata, screenshot and variable defs before marking complete.”

## Token naming starter

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
space/6
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
radius/24

text/display/lg
text/display/md
text/heading/lg
text/heading/md
text/body/md
text/body/sm
text/caption
```

## Component reuse priority

1. Published team library component.
2. Local component in target file.
3. Component-like frame built once, then duplicated as instance only if the workflow supports it.
4. Primitive fallback with clear note in result report.

## Common failure modes

- Draws everything as rectangles with hardcoded hex.
- Creates a beautiful screenshot but non-editable structure.
- Uses absolute positioning for every child.
- Pulls too much Figma context and gets truncated.
- Ignores available design system components.
- Leaves default layer names.
- Forgets error / empty / loading states.
- Produces generic copy and fake metrics.

## Recovery protocol

When `use_figma` fails:

1. Stop; do not blindly retry.
2. Inspect partial state with `get_metadata`.
3. Identify orphaned or duplicate nodes/styles.
4. Clean up or rename partial nodes.
5. Retry only the failed minimal operation.
6. Record the cause in result report.

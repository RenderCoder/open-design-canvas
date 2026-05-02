# Project Naming Recommendation

## Recommended name

**Open Design Canvas**

Recommended repo slug:

```text
open-design-canvas
```

Recommended short name:

```text
OD Canvas
```

Recommended tagline:

```text
A Figma-native AI design workbench built on Open Design, Codex CLI, and Figma MCP.
```

## Why this name

- It keeps continuity with the upstream `open-design` project.
- It describes the real product direction: AI agents operating on editable design canvases.
- It avoids making the whole project brand dependent on one vendor name.
- It leaves room to support other native canvas backends later, while the first-class backend remains Figma.
- It is clearer than abstract names and better for maintainers/contributors.

## Names considered

### open-design-figma

Very clear, but less ideal as a public project brand because it can imply unofficial affiliation with Figma and narrows the roadmap to one backend.

Use it as:

- a branch name
- a feature folder name
- a temporary internal fork name
- a descriptive subtitle

Do not use it as the long-term product brand unless you add a clear non-affiliation disclaimer.

### Open Design Native

Good for "native canvas" direction, but less vivid and less intuitive than Canvas.

### Open Design Studio

Good product feel, but too broad and likely to collide with many existing design-tool names.

### Canvas Agent

Descriptive, but loses the upstream Open Design identity.

## Suggested branding block

```text
Open Design Canvas
Figma-native AI design workbench for Open Design.

Open Design Canvas turns Open Design's skills, design systems, and agent workflows into a native-canvas workflow for Figma via Codex CLI and Figma MCP.

This project is not affiliated with or endorsed by Figma, Inc.
```

## Suggested README opening

```markdown
# Open Design Canvas

> Figma-native AI design workbench for Open Design.

Open Design Canvas is a fork of Open Design that adds native-canvas generation, Figma MCP workflows, Codex CLI orchestration, design-system-aware prompt composition, canvas linting, and structured result reports.

It keeps Open Design as the design workflow layer, Codex as the agent execution layer, and Figma MCP as the official native-canvas write layer.

This project is not affiliated with or endorsed by Figma, Inc.
```

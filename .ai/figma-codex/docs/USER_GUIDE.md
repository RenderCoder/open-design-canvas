# User Guide: Figma-native mode

Figma-native mode lets Open Design Canvas generate or update editable Figma
canvas content through Codex CLI and Figma Remote MCP. The final deliverable is
Figma-native structure: pages, frames, components, instances, variables, styles,
Auto Layout, and semantic layer names. Screenshots and HTML can be validation or
reference material, but they are not the final Figma-native output.

## What runs where

- Open Design Canvas owns discovery, skill selection, design-system context,
  prompt composition, result parsing, and the result card.
- Codex CLI owns the agent execution loop and reads the selected skill,
  design-system files, and project metadata.
- Figma Remote MCP owns all Figma canvas reads and writes. Do not use a custom
  Figma REST write-canvas path for native frames, components, variables, styles,
  or Auto Layout.

## Run the mocked flow without Figma credentials

Use the mocked flow when you are setting up the repo, reviewing UI behavior, or
contributing without Figma OAuth:

```bash
corepack enable
pnpm install
pnpm --filter @open-design/e2e test -- figma-native-mocked-flow.test.tsx
```

The mocked test exercises skill discovery, Figma-native prompt composition,
Codex JSONL MCP events, Figma result parsing, and the UI result card without
calling the real Figma MCP server.

## Configure real Figma MCP access

Install the official Remote MCP server in Codex CLI:

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
codex mcp login figma
```

Then run the repo health check:

```bash
bash .ai/figma-codex/scripts/check-figma-mcp.sh
```

Keep `.codex/config.toml` set to `required = false` for normal engineering work.
Use real Figma writes only when the authenticated account has the required plan,
seat, and file permissions. More setup detail lives in
[`FIGMA_MCP_SETUP.md`](FIGMA_MCP_SETUP.md).

## First canvas generation

1. Start the app with the normal local lifecycle:

   ```bash
   pnpm tools-dev run web
   ```

2. Create a project and choose a Figma-native skill such as
   `figma-native-screen`, `figma-native-landing`, `figma-native-dashboard`, or
   `figma-native-mobile-flow`.
3. Choose a design system. `figma-native-base` is the starter system for native
   canvas work because it includes `DESIGN.md`, `FIGMA.md`, `tokens.json`, and
   `component-map.json`.
4. Provide a Figma target:
   - an existing Figma file URL,
   - a selection URL when updating a specific node, or
   - a request to create a new Figma Design file.
5. Send the brief. A good first brief names the surface, audience, platform,
   content requirements, and the target Figma file.

Example prompt:

```text
Create a Figma-native SaaS landing page for an AI writing tool in this file:
https://www.figma.com/design/example/Product

Use the active design system, create a desktop 1440 frame, include hero,
feature proof, pricing, FAQ, and final CTA sections. Reuse components and
variables where available. Return a figma_native_result report.
```

## What the result card means

The Figma result card summarizes the structured `figma_native_result` report:

- File and frame fields identify the target Figma file, page, root frame, and
  node IDs created or updated.
- Reused components, variables, and styles show whether the agent used the
  design system before falling back to primitives.
- Hardcoded values list any raw colors, spacing, type sizes, or one-off values
  that should be reviewed.
- Checks report the metadata, screenshot, variables, Auto Layout, and semantic
  naming validation requested from Figma MCP.
- Known issues and next iteration items are the handoff for refinement.

Treat a completed result with known issues as a reviewable draft, not as a
silent pass. The result card should make remaining work explicit.

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| Figma MCP missing | Codex has no enabled `figma` MCP server | Run `codex mcp add figma --url https://mcp.figma.com/mcp`, then `codex mcp login figma`, then the repo health check. |
| Auth or permission error | OAuth expired, wrong account, no Full seat, or no edit access | Re-run `codex mcp login figma`; confirm the authenticated account can edit the file. |
| New-file flow asks for a plan | Figma requires a team/org target | Use `whoami` through Figma MCP, choose the intended plan, and pass the returned plan key to the create-new-file flow. |
| Rate-limit or timeout | Large file, large selection, network limits, or Figma throttling | Retry with a smaller selected frame, call `get_metadata` first, and work on smaller nodes. |
| Malformed result card | Agent returned prose without a valid `figma_native_result` JSON object | Ask the agent to return only the structured report after the canvas write, then keep the previous canvas nodes. |
| Hardcoded token warnings | Missing component, variable, or style mapping | Add or fix `FIGMA.md`, `tokens.json`, or `component-map.json`, then rerun or ask for a targeted cleanup pass. |
| Screenshot-only output | Agent treated an image or HTML capture as the deliverable | Reject the run and request editable Figma nodes through `use_figma`; screenshots are validation evidence only. |

## Safety rules

- Never commit OAuth tokens, private Figma file IDs, customer file URLs, or
  screenshots containing private design content.
- Real canvas writes must use Figma MCP tools such as `search_design_system`,
  `use_figma`, `get_metadata`, `get_screenshot`, and `get_variable_defs`.
- Use the mocked flow for CI and contributor verification unless a task
  explicitly requires real Figma access.

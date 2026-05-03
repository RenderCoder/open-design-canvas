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

## UI-first authorization flow

普通用户优先走 Open Design Canvas 里的可视化向导，而不是先读命令行
JSON 或手动跑脚本：

1. Create or open a project and choose a Figma-native skill.
2. Select the Figma target: an existing file URL, a selection URL, or a new-file
   request.
3. Click **Check** in the Figma MCP authorization wizard. The app checks Codex
   CLI, the configured Figma MCP server, OAuth state, and read access.
4. If setup or OAuth is missing, click **Prepare setup** or **Authorize Figma**.
   The wizard shows the safest available action for the current runtime.
5. After completing the setup step, click **Recheck**.
6. Click **Check write permission**. This runs the small write probe described
   below. Generation stays blocked until this check passes.
7. Send the design brief only after the wizard says the target is ready.

Runtime differences:

- In Electron and packaged desktop builds, external `http(s)`, `figma:`, and
  `mailto:` links opened by the wizard go to the system browser, so the Open
  Design window stays on the authorization screen. The current Codex CLI OAuth
  path can still require copying and running a manual command because Codex
  exposes `codex mcp login figma` as an interactive command today.
- In the Web runtime, the wizard always keeps a copy-command plus recheck
  fallback. Use the command shown by **Prepare setup** or **Authorize Figma**,
  finish the terminal/browser flow, then return to the app and recheck.

## Configure real Figma MCP access

The app wizard is the normal path. These commands are the developer diagnostic
or fallback path when the wizard asks you to set up Codex/Figma manually.
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
5. Complete the Figma MCP authorization wizard:
   - **Check** verifies Codex CLI, Figma MCP, OAuth, and target read access.
   - **Prepare setup** or **Authorize Figma** gives the next safe setup action
     when something is missing.
   - **Check write permission** verifies edit access with the tiny probe.
6. Send the brief. A good first brief names the surface, audience, platform,
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

## Process snapshots in Design Files

After a Figma-native run completes its final validation pass, the agent must
archive one high-resolution PNG process snapshot of the completed root
frame/page. The snapshot is saved in the current project's existing **Design
Files** panel and appears as a normal project image file, so you can open it
without switching back to Figma.

Snapshot names follow this pattern:

```text
figma-YYYYMMDD-HHmmss-<purpose-slug>.png
```

The purpose slug comes from the page, feature, or edit summary, for example
`figma-20260503-142530-home-hero-refine.png`. If a file with the same name
already exists, Open Design Canvas appends a numeric suffix instead of
overwriting it.

The PNG is a process snapshot for inspection and handoff. It does not replace
the editable Figma source file. Continue to treat the Figma file as the source
of truth for editable frames, components, variables, styles, Auto Layout, and
layer names.

Resolution behavior:

- The default export target is 2x through Figma MCP `exportAsync`, not a low-res
  `get_screenshot` preview.
- Narrow frames are scaled up so a typical 1400px-wide design exports near
  2800px wide.
- Very large frames may be scaled down to keep the longest edge under the
  exporter limit; the result card reports this as a snapshot warning.
- If the exported PNG is below the minimum resolution guard, the run reports a
  snapshot failure or partial result instead of silently saving a low-res image.

How to inspect a snapshot:

1. Open the file from the Figma result card's **Open snapshot** action or from
   the **Files from this turn** chips.
2. Or open **Design Files** and select the highlighted latest PNG row.
3. Use the image viewer zoom controls to inspect details. Normal images support
   zoom out, zoom in, and reset from 25% to 1000%; when zoomed in, the preview
   area scrolls so you can inspect the whole image.

## Write probe and cleanup

The write-permission check creates or updates one tiny frame named
`ODC MCP Write Probe` on a page named `ODC MCP Probe`. Repeated checks should
reuse that same page and frame. The probe only proves that the authenticated
Figma account can edit the selected target; it is not part of the generated
design.

Clean up only the Open Design Canvas-owned probe:

- Safe to delete: the page named `ODC MCP Probe` and the frame named
  `ODC MCP Write Probe`.
- Do not delete user-created pages, frames, components, selected design nodes,
  or nearby content.
- If the probe page contains anything except the named probe frame and helper
  marker text/metadata, inspect it manually and remove only the probe frame.

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| Codex CLI unavailable | Codex is not installed or not on `PATH` for the daemon process | Install Codex CLI, restart `pnpm tools-dev run web`, then click **Check** again. |
| Figma MCP missing | Codex has no enabled `figma` MCP server | Click **Prepare setup** and use the shown command. Developer fallback: run `codex mcp add figma --url https://mcp.figma.com/mcp`, then recheck. |
| Figma MCP URL wrong | The configured MCP server does not point at `https://mcp.figma.com/mcp` | Click **Prepare setup**, replace the server config with the official URL, then recheck. |
| Auth required or user cancelled | OAuth is missing/expired, the login was cancelled, or Codex could not complete the interactive login | Click **Authorize Figma**. In Electron, external auth/docs URLs open in the system browser when available; otherwise copy the shown command and run it locally. |
| Company network or proxy blocks OAuth/MCP | Browser login, Codex MCP, or `mcp.figma.com` cannot be reached | Try a network with Figma access, configure the corporate proxy for Codex, or ask IT to allow Figma MCP traffic. Then recheck. |
| No Full seat or edit permission | The account can read the file but cannot write to it | Ask for a Full seat or equivalent edit capability and edit access to the target file, or choose a file you can edit. Then click **Check write permission**. |
| Target is stale after edits | The Figma file URL, node ID, page, or new-file settings changed after the last passed check | Click **Check** again. Generation is blocked until the new target fingerprint has a passed write probe. |
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

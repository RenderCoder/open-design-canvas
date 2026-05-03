# Figma MCP Setup with Codex CLI

Figma-native canvas generation uses Figma Remote MCP through Codex CLI. Open
Design Canvas should not store Figma OAuth tokens and should not implement a
custom Figma REST write-canvas path.

## CLI setup

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
```

Complete the OAuth flow when prompted.

If the server is already configured but the OAuth session is missing or expired,
run:

```bash
codex mcp login figma
```

## Project config

This package includes `.codex/config.example.toml`. The install script copies it to `.codex/config.toml` only if no project config exists.

Use `required = false` for normal engineering work so missing OAuth does not block code tasks. For real smoke tests, you can set:

```toml
[mcp_servers.figma]
required = true
```

## Health check

Run the repo health check after setup:

```bash
bash .ai/figma-codex/scripts/check-figma-mcp.sh
```

The script verifies that Codex has an enabled `figma` MCP server configured with
the official Remote MCP URL:

```text
https://mcp.figma.com/mcp
```

It does not read, print, or store OAuth tokens. A passing configuration check
means Codex knows about the Figma MCP server; it does not guarantee that the
current OAuth session has access to a specific Figma file.

For non-interactive Open Design runs, the daemon also passes Codex config
overrides that pre-approve Figma MCP tools:

```text
mcp_servers.figma.default_tools_approval_mode = "approve"
mcp_servers.figma.default_tools_enabled = true
mcp_servers.figma-cloud.default_tools_approval_mode = "approve"
mcp_servers.figma-cloud.default_tools_enabled = true
```

Without those overrides, a headless `codex exec` run with
`approval_policy="never"` can report a Figma write as `user cancelled MCP tool
call` because there is no interactive approval surface.

To use a different server name or URL while testing:

```bash
ODC_FIGMA_MCP_SERVER=figma-cloud \
ODC_FIGMA_MCP_URL=https://mcp.figma.com/mcp \
bash .ai/figma-codex/scripts/check-figma-mcp.sh
```

## Missing-MCP failure mode

If the health check reports that the `figma` MCP server is missing, configure it
with:

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
codex mcp login figma
```

Normal code and documentation work should continue with `required = false`.
Figma-native canvas write tasks must stop before calling `use_figma` and report
a clear remediation note when the MCP server is missing, disabled, unauthenticated,
or pointed at a non-Figma URL.

## Write authorization probe

Configuration and OAuth are not enough to prove Figma write authorization. Before
running a full Figma-native generation, test a disposable editable file:

```bash
ODC_FIGMA_PROBE_TARGET='https://www.figma.com/design/...' \
  bash .ai/figma-codex/scripts/check-figma-write-access.sh
```

This opt-in probe creates or updates one tiny temporary frame named
`ODC MCP Write Probe` on a page named `ODC MCP Probe`. Repeated runs must reuse
that same page/frame when it already exists instead of creating a new copy. The
probe may include helper text or shared plugin data with this marker:

```text
Open Design Canvas write-permission probe. Safe to delete this page/frame if no check is running.
```

The probe exists only to verify edit access; it is not part of the generated
design. Use a disposable file when possible.

### Probe cleanup

Only clean up nodes that are clearly owned by Open Design Canvas:

- Safe targets: the page named `ODC MCP Probe` and the frame named
  `ODC MCP Write Probe`.
- Do not delete user-created pages, frames, components, or selected design
  content, even if they sit near the probe.
- Clean up after the write check finishes. Do not delete the probe while a check
  is running.
- If the page contains anything other than the named probe frame and its helper
  text/metadata, inspect it manually and remove only the probe frame.

If the probe fails with `user cancelled MCP tool call`, check the Codex MCP
approval configuration above first. If approval is configured and the probe
still fails, re-run `codex mcp login figma`, confirm the authenticated Figma
account has a Full seat or equivalent edit capability, and confirm the target
file grants edit access to that account.

For real Figma writes, verify the connection inside Codex with a non-mutating
prompt before opening or modifying a file:

```bash
codex exec --json "Use Figma MCP whoami and report the authenticated user and available plans. Do not create or modify files."
```

## Open Design preflight and setup actions

The daemon exposes project-scoped Figma MCP setup helpers for the Web/Electron
UI:

- `POST /api/projects/:id/figma/preflight` checks the selected target and stores
  `metadata.figmaPreflight`.
- `POST /api/projects/:id/figma/mcp-action` accepts
  `prepare_mcp_setup`, `start_mcp_login`, or `poll_mcp_status`.

Codex CLI currently exposes `codex mcp login <name>` as an interactive OAuth
command and does not provide a help-documented flag that returns an OAuth URL
for the daemon to open directly. Because of that, setup actions return a
`manual_command` fallback with safe command text such as:

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
codex mcp login figma
```

Electron can still open external documentation or future OAuth URLs if Codex
adds a non-interactive URL mode, but the current Web/Electron-safe path is:
show the command, offer a copy button, then poll/recheck with
`poll_mcp_status` after the user completes the terminal flow.

In the desktop and packaged Electron runtimes, external HTTP(S), `figma:`, and
`mailto:` targets opened by the web UI are handed to the system browser instead
of navigating the Open Design app window. This keeps the app window on the
authorization wizard while the user completes a browser-based OAuth flow. When
Codex exposes an OAuth URL in a future non-interactive login action, the same
wizard can show an "Open authorization" button, open that URL externally, and
keep polling with `poll_mcp_status`. Until then, `codex mcp login figma`
remains a copyable manual command fallback for both Web and Electron.

## Mocked CI coverage matrix

Figma OAuth and real canvas writes are intentionally not required in default CI.
The authorization and generation gate are covered with sanitized mock runners,
mocked preflight summaries, and redacted fixtures:

| Path | Default CI coverage |
| --- | --- |
| Codex CLI missing | `apps/daemon/tests/figma-preflight.test.ts` mocks `ENOENT` from `codex --version`. |
| Figma MCP not added | `apps/daemon/tests/figma-preflight.test.ts` mocks `codex mcp get figma --json` failure and verifies the setup command. |
| Figma MCP URL wrong | `apps/daemon/tests/figma-preflight.test.ts` mocks a non-Figma MCP URL and only exposes the safe host. |
| OAuth missing or user cancelled | `apps/daemon/tests/figma-preflight.test.ts` mocks unauthenticated MCP status and cancelled write probes; `apps/web/src/components/FigmaMcpAuthorizationWizard.test.tsx` verifies the human authorization recovery state. |
| Figma target URL invalid | `apps/daemon/tests/figma-preflight.test.ts` verifies the target is rejected before Codex runs; `apps/web/src/components/FigmaMcpAuthorizationWizard.test.tsx` verifies the target-fix UI copy. |
| `get_metadata` cannot read the file | `apps/daemon/tests/figma-preflight.test.ts` mocks read-probe failure and verifies `request_file_access`; `apps/web/src/components/FigmaMcpAuthorizationWizard.test.tsx` verifies the read-blocked UI copy. |
| `use_figma` lacks edit permission | `apps/daemon/tests/figma-preflight.test.ts` mocks permission-denied write output; `apps/web/src/components/FigmaMcpAuthorizationWizard.test.tsx` verifies the edit-access UI copy. |
| `use_figma` write probe succeeds | `apps/daemon/tests/figma-preflight.test.ts` verifies `write_probe_passed`, redacted target details, and `canGenerate`; `apps/web/src/components/FigmaMcpAuthorizationWizard.test.tsx` verifies the ready wizard state. |
| Target change makes preflight stale | `apps/web/src/artifacts/figma-preflight-contract.test.ts`, `apps/web/src/providers/sse.test.ts`, and `apps/daemon/tests/figma-preflight-route.test.ts` verify fingerprint matching and stale-preflight rejection. |
| Web/Electron fallback action copy | `apps/daemon/tests/figma-preflight.test.ts`, `apps/web/src/providers/registry.test.ts`, and `apps/web/src/components/FigmaMcpAuthorizationWizard.test.tsx` verify `manual_command` responses and copyable command text. |
| High-resolution snapshot archive | `apps/daemon/tests/figma-snapshot.test.ts` verifies filename timestamps/slugs, collision-safe writes, 2x/min-width export planning, PNG dimension validation, low-resolution rejection, and Design Files listing. |
| Snapshot inspection UI | `apps/web/src/components/FigmaResultCard.test.tsx`, `apps/web/src/components/FileWorkspace.test.tsx`, and `apps/web/src/components/FileViewer.test.tsx` verify snapshot actions, latest-file highlight, and 25%-1000% image zoom controls. |
| Mocked end-to-end Figma-native flow | `e2e/tests/figma-native-mocked-flow.test.tsx` parses mocked Codex JSONL with Figma MCP events, renders the result card, and uses redacted fixture data only. |

These tests must not contain OAuth tokens, private file keys, private file URLs,
customer screenshots, or private design content. Use placeholders such as
`demo-file`, `abc123456789`, `<redacted-file-key>`, and
`https://example.invalid/...` for fixtures.

## Seat and permission notes

- Read-only design context workflows can work with lower permissions.
- Writing to existing files requires Full seat and edit permission.
- New-file flows may require selecting a Figma plan/team through `whoami` / `create_new_file`.
- Existing-file workflows require a Figma file URL or selection URL that the
  authenticated user can edit.
- Do not commit OAuth tokens, private Figma file IDs, customer file URLs, or
  screenshots containing private design content.

## Operational limits

- Prefer small selected frames. For large files, call `get_metadata` first and
  inspect smaller nodes instead of loading a large canvas all at once.
- Run `search_design_system` before drawing primitives, then write canvas nodes
  through `use_figma`.
- After a write, run metadata and visual checks such as `get_metadata`,
  `get_screenshot`, and `get_variable_defs`.
- Figma plan, seat, permissions, network, and rate limits can still block a real
  smoke test even when local MCP configuration is valid.

## Snapshot archive notes

After the real canvas write and validation checks, Figma-native agents should
export exactly one high-resolution PNG process snapshot of the final root frame
or page. This is not the editable deliverable; it is a Design Files archive for
inspection inside Open Design Canvas.

The preferred export path is Figma MCP / Plugin API `exportAsync` from the final
root node, usually with `constraint: { type: "SCALE", value: 2 }`. For narrower
frames, increase the scale so the output is about 2800px wide when possible.
Keep the longest edge at or below 8192px and report any scale reduction in the
snapshot warnings.

Save the raw PNG bytes to:

```text
POST /api/projects/:id/figma/snapshot
```

with query parameters such as `purpose`, `sourceWidth`, `sourceHeight`,
`sourceFileKey`, `sourceNodeId`, and `sourceNodeName`. The daemon assigns a
`figma-YYYYMMDD-HHmmss-<purpose-slug>.png` filename, avoids overwrites, validates
PNG dimensions, rejects low-resolution output, and returns the structured
`snapshot` object. Do not paste base64 PNG data into the final report.

## Optional real Figma smoke test

This procedure is manual and safe to skip in CI. Run it only from a workstation
where Codex can use the authenticated Figma MCP server and the authenticated
Figma user has a Full seat or equivalent edit capability.

### Preconditions

- `bash .ai/figma-codex/scripts/check-figma-mcp.sh` passes.
- `codex mcp login figma` has completed successfully in this environment.
- You have a disposable, non-private Figma design file you can edit, or a Figma
  plan where creating a new disposable file is allowed.
- The test file contains no customer content, private brand assets, OAuth
  tokens, or private file IDs that will be copied into logs, docs, commits, or
  issue notes.
- Any real `fileKey`, `nodeId`, page name, screenshot URL, or file URL recorded
  outside the local smoke-test run is redacted to placeholders such as
  `<redacted-file-key>` and `<redacted-node-id>`.

### 1. Verify the Figma MCP identity without writing

Run:

```bash
codex exec --json "Use Figma MCP whoami and report the authenticated user plus available plans. Do not create, edit, inspect, or modify any Figma files."
```

Expected result:

- The JSONL stream includes a Figma MCP `whoami` tool call.
- The final message identifies the authenticated user or reports a clear MCP,
  OAuth, seat, or permission blocker.
- No Figma file is created or modified.

Stop here if identity verification fails. Record the blocker in Beads notes and
leave mocked CI as the required validation path.

### 2. Run the canvas write smoke test

Prefer creating a new disposable file so cleanup is isolated. If the account
cannot create files, use a disposable existing file URL that the authenticated
user can edit and replace `<FIGMA_TARGET>` with that URL.

```bash
codex exec --json "Use Figma MCP for a real Open Design Canvas smoke test.

Target:
- If you can create files, create a new Figma Design file named \"Open Design Canvas MCP Smoke Test\".
- Otherwise use this disposable editable file: <FIGMA_TARGET>.

Required workflow:
1. Call search_design_system before drawing primitives. Search for button, card, text, color, and spacing assets.
2. Call use_figma to create or update one page named \"ODC MCP Smoke Test\" with one editable desktop frame named \"Smoke Test / Desktop / 1440\".
3. The frame must be editable Figma-native nodes, not a screenshot, pasted bitmap, HTML artifact, or image-only mockup.
4. Use Auto Layout, semantic layer names, one headline, one short paragraph, one card, and one primary button. Reuse components, variables, or styles when available; otherwise report primitive fallbacks.
5. After writing, call get_metadata on the created frame or page.
6. Call get_screenshot on the created frame.
7. Call get_variable_defs on the created frame or page.
8. Return only a figma_native_result JSON object. Redact any private URL or file key if the final output might be committed."
```

The run is successful when the JSONL stream shows these Figma MCP calls in this
order:

```text
search_design_system
use_figma
get_metadata
get_screenshot
get_variable_defs
```

It is acceptable for `search_design_system` to return no reusable assets in an
empty disposable file, as long as the result report lists the primitive
fallbacks.

### Expected result JSON shape

Record only redacted output in shared notes:

```json
{
  "kind": "figma_native_result",
  "status": "completed",
  "fileUrl": "<redacted-figma-file-url>",
  "fileKey": "<redacted-file-key>",
  "pageName": "ODC MCP Smoke Test",
  "rootFrame": {
    "name": "Smoke Test / Desktop / 1440",
    "nodeId": "<redacted-node-id>",
    "width": 1440,
    "height": 900
  },
  "created": [
    { "type": "FRAME", "name": "Smoke Test / Desktop / 1440", "nodeId": "<redacted-node-id>" }
  ],
  "updated": [],
  "reusedComponents": [],
  "variablesUsed": [],
  "stylesUsed": [],
  "hardcodedValues": [
    { "path": "Smoke Test / Desktop / 1440", "value": "primitive fallback", "reason": "No matching local library asset available" }
  ],
  "checks": {
    "metadata": "passed",
    "screenshot": "passed",
    "variables": "passed",
    "autoLayout": "passed",
    "semanticNames": "passed"
  },
  "knownIssues": [],
  "nextIteration": []
}
```

If the real run fails because MCP, OAuth, plan selection, Full seat, edit
permission, network, or rate limits are unavailable, record:

```json
{
  "kind": "figma_native_result",
  "status": "blocked",
  "checks": {
    "metadata": "not_run",
    "screenshot": "not_run",
    "variables": "not_run"
  },
  "knownIssues": [
    "Real Figma smoke test blocked by <specific blocker>; mocked E2E remains the required CI validation."
  ],
  "nextIteration": [
    "Retry with authenticated Figma MCP, Full seat or equivalent edit permission, and a disposable editable file."
  ]
}
```

### Cleanup

After a successful real smoke test:

1. Delete the disposable smoke-test file or remove the `ODC MCP Smoke Test` page
   from the existing disposable file.
2. Remove any local JSONL logs or screenshots that contain unredacted private
   Figma URLs, file keys, node IDs, account details, or private design content.
3. Commit only documentation, code, mocked fixtures, and redacted summaries.
   Never commit OAuth tokens, private Figma file IDs, private file URLs, or
   screenshots from a private file.

## Smoke test prompt

Use this only after Figma MCP is authenticated:

```text
Use Figma MCP. Create a new Figma Design file named "Open Design Figma Native Smoke Test". Then create one desktop frame named "Smoke Test / Desktop / 1440" with Auto Layout, a headline, a card, and a primary button. Use variables/styles if available. Run get_metadata and get_screenshot. Return a figma_native_result report.
```

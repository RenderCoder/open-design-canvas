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

For real Figma writes, verify the connection inside Codex with a non-mutating
prompt before opening or modifying a file:

```bash
codex exec --json "Use Figma MCP whoami and report the authenticated user and available plans. Do not create or modify files."
```

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

#!/usr/bin/env bash
# Run an opt-in Figma MCP write-authorization probe through Codex CLI.
# macOS /bin/bash 3.2 compatible. This modifies the supplied disposable target.
set -eu
set -o pipefail

SERVER_NAME="${ODC_FIGMA_MCP_SERVER:-figma}"
TARGET="${ODC_FIGMA_PROBE_TARGET:-}"

if [ -z "$TARGET" ]; then
  cat >&2 <<'MSG'
Set ODC_FIGMA_PROBE_TARGET to a disposable editable Figma design URL before running.

Example:
  ODC_FIGMA_PROBE_TARGET='https://www.figma.com/design/...' \
    bash .ai/figma-codex/scripts/check-figma-write-access.sh

This probe intentionally writes a tiny temporary frame to prove MCP write authorization.
MSG
  exit 2
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "FAIL: codex CLI is not available in PATH." >&2
  exit 2
fi

PROMPT=$(cat <<EOF_PROMPT
Use Figma MCP server "$SERVER_NAME" to verify write authorization for this disposable editable target:

$TARGET

Required:
1. Use Figma MCP to inspect or resolve the target.
2. Call use_figma exactly once with the smallest safe write probe: create a temporary 180x80 frame named "ODC MCP Write Probe" on a page named "ODC MCP Probe".
3. If the tool call is cancelled, blocked, unauthorized, or requires an approval prompt, stop.
4. Return a short final status only: PASS with file/page/node details, or FAIL with the exact blocker.

Do not create a full design. Do not include private tokens or credentials.
EOF_PROMPT
)

codex exec \
  --sandbox workspace-write \
  -c 'approval_policy="never"' \
  -c "mcp_servers.$SERVER_NAME.default_tools_approval_mode=\"approve\"" \
  -c "mcp_servers.$SERVER_NAME.default_tools_enabled=true" \
  --json \
  "$PROMPT"

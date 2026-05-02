#!/usr/bin/env bash
# Check whether Codex CLI has a usable Figma Remote MCP server entry.
# macOS /bin/bash 3.2 compatible. Does not read or write OAuth tokens.
set -eu
set -o pipefail

SERVER_NAME="${ODC_FIGMA_MCP_SERVER:-figma}"
EXPECTED_URL="${ODC_FIGMA_MCP_URL:-https://mcp.figma.com/mcp}"

if ! command -v codex >/dev/null 2>&1; then
  echo "FAIL: codex CLI is not available in PATH." >&2
  echo "Install Codex CLI first, then run:" >&2
  echo "  codex mcp add $SERVER_NAME --url $EXPECTED_URL" >&2
  exit 2
fi

if ! CONFIG_JSON="$(codex mcp get "$SERVER_NAME" --json 2>&1)"; then
  echo "FAIL: Codex MCP server '$SERVER_NAME' is not configured." >&2
  echo "$CONFIG_JSON" >&2
  echo "" >&2
  echo "Configure Figma Remote MCP with:" >&2
  echo "  codex mcp add $SERVER_NAME --url $EXPECTED_URL" >&2
  echo "Then complete the OAuth flow when prompted:" >&2
  echo "  codex mcp login $SERVER_NAME" >&2
  exit 1
fi

if ! printf '%s\n' "$CONFIG_JSON" | grep -q '"enabled"[[:space:]]*:[[:space:]]*true'; then
  echo "FAIL: Codex MCP server '$SERVER_NAME' exists but is disabled." >&2
  echo "Enable it in Codex config before running Figma-native canvas tasks." >&2
  exit 1
fi

if ! printf '%s\n' "$CONFIG_JSON" | grep -q '"type"[[:space:]]*:[[:space:]]*"streamable_http"'; then
  echo "FAIL: Codex MCP server '$SERVER_NAME' is not using streamable_http transport." >&2
  echo "Expected Figma Remote MCP URL transport: $EXPECTED_URL" >&2
  exit 1
fi

if ! printf '%s\n' "$CONFIG_JSON" | grep -q '"url"[[:space:]]*:[[:space:]]*"'"$EXPECTED_URL"'"'; then
  echo "FAIL: Codex MCP server '$SERVER_NAME' does not point to $EXPECTED_URL." >&2
  echo "Current config:" >&2
  printf '%s\n' "$CONFIG_JSON" >&2
  exit 1
fi

AUTH_STATUS="unknown"
if LIST_JSON="$(codex mcp list --json 2>/dev/null)"; then
  AUTH_STATUS="$(printf '%s\n' "$LIST_JSON" | awk -v name="$SERVER_NAME" '
    $0 ~ "\"name\"[[:space:]]*:[[:space:]]*\"" name "\"" { in_server=1 }
    in_server && $0 ~ "\"auth_status\"" {
      gsub(/.*"auth_status"[[:space:]]*:[[:space:]]*"/, "")
      gsub(/".*/, "")
      print
      exit
    }
    in_server && $0 ~ /^  \}/ { in_server=0 }
  ')"
fi

if [ -z "$AUTH_STATUS" ]; then
  AUTH_STATUS="unknown"
fi

echo "PASS: Codex MCP server '$SERVER_NAME' is configured for Figma Remote MCP."
echo "URL: $EXPECTED_URL"
echo "Auth status: $AUTH_STATUS"
echo ""
echo "Before real Figma-native writes, confirm OAuth and file access:"
echo "  codex mcp login $SERVER_NAME"
echo "  codex exec --json \"Use Figma MCP whoami and report the authenticated user and available plans.\""
echo ""
echo "For non-interactive Open Design runs, Figma MCP tools must be pre-approved."
echo "The daemon passes these Codex config overrides automatically:"
echo "  -c 'mcp_servers.$SERVER_NAME.default_tools_approval_mode=\"approve\"'"
echo "  -c 'mcp_servers.$SERVER_NAME.default_tools_enabled=true'"
echo ""
echo "To manually verify write authorization, run a disposable probe against an editable file:"
echo "  ODC_FIGMA_PROBE_TARGET='<figma design URL>' bash .ai/figma-codex/scripts/check-figma-write-access.sh"
echo ""
echo "Writing to an existing Figma file also requires a Full seat and edit access."

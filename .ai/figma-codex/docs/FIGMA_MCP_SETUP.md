# Figma MCP Setup with Codex CLI

## CLI setup

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
```

Complete the OAuth flow when prompted.

## Project config

This package includes `.codex/config.example.toml`. The install script copies it to `.codex/config.toml` only if no project config exists.

Use `required = false` for normal engineering work so missing OAuth does not block code tasks. For real smoke tests, you can set:

```toml
[mcp_servers.figma]
required = true
```

## Seat and permission notes

- Read-only design context workflows can work with lower permissions.
- Writing to existing files requires Full seat and edit permission.
- New-file flows may require selecting a Figma plan/team through `whoami` / `create_new_file`.

## Smoke test prompt

Use this only after Figma MCP is authenticated:

```text
Use Figma MCP. Create a new Figma Design file named "Open Design Figma Native Smoke Test". Then create one desktop frame named "Smoke Test / Desktop / 1440" with Auto Layout, a headline, a card, and a primary button. Use variables/styles if available. Run get_metadata and get_screenshot. Return a figma_native_result report.
```

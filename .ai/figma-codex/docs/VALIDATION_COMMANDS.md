# Validation Commands

Updated: 2026-05-02

This file is the canonical Phase 0 command matrix for later Open Design Canvas
beads. It records commands discovered from the current repository, not guessed
commands.

## Sources Checked

- Root `package.json`
- Workspace manifests under `apps/*`, `packages/*`, `tools/*`, and `e2e`
- `pnpm-workspace.yaml`
- `scripts/**`
- `.github/workflows/*`
- `tools/dev/src/index.ts`

There is no `Makefile` and no `turbo.json` in this fork.

## Environment

- Target runtime: Node `~24`.
- Package manager: `pnpm@10.33.2` through Corepack.
- CI release workflows use `pnpm install --frozen-lockfile`.

## Root Commands

| Purpose | Command | Notes |
| --- | --- | --- |
| Install dependencies | `pnpm install` | Run after manifest, workspace, bin, or package layout changes. |
| CI-style install | `pnpm install --frozen-lockfile` | Used by release workflows. |
| Local lifecycle | `pnpm tools-dev` | Default local lifecycle entry; do not use root `pnpm dev` or `pnpm start`. |
| Start web stack | `pnpm tools-dev run web --daemon-port <port> --web-port <port>` | Preferred foreground web/e2e loop. |
| Status | `pnpm tools-dev status --json` | Non-destructive runtime check. |
| Logs | `pnpm tools-dev logs --json` | Use namespace flags when validating path/log changes. |
| Diagnostics | `pnpm tools-dev check` | Quick status plus log diagnostics. |
| Build | `pnpm build` | Builds `@open-design/web`. |
| Typecheck | `pnpm typecheck` | Recursive typecheck, daemon build, residual JS check. |
| Unit/integration tests | `pnpm test` | Recursive workspace tests, one workspace at a time. |
| Residual JS policy | `pnpm check:residual-js` | Ensures new project-owned source stays TypeScript-first. |
| UI tests | `pnpm test:ui` | Playwright; starts web through `tools-dev`. |
| Headed UI tests | `pnpm test:ui:headed` | Playwright headed mode. |
| Live adapter E2E | `pnpm test:e2e:live` | Builds daemon and runs live runtime adapter test. |
| Packaged tooling | `pnpm tools-pack` | Packaging control plane, not a normal validation gate. |

## Commands Not Present

- No root `pnpm lint`.
- No root `pnpm format`.
- No root `pnpm dev`, `pnpm start`, `pnpm dev:all`, or `pnpm daemon`.
- No Makefile target.
- No Turbo task target.

## Package Commands

| Package | Build | Typecheck | Test |
| --- | --- | --- | --- |
| `@open-design/web` | `pnpm --filter @open-design/web build` | `pnpm --filter @open-design/web typecheck` | `pnpm --filter @open-design/web test` |
| `@open-design/daemon` | `pnpm --filter @open-design/daemon build` | `pnpm --filter @open-design/daemon typecheck` | `pnpm --filter @open-design/daemon test` |
| `@open-design/desktop` | `pnpm --filter @open-design/desktop build` | `pnpm --filter @open-design/desktop typecheck` | None |
| `@open-design/packaged` | `pnpm --filter @open-design/packaged build` | `pnpm --filter @open-design/packaged typecheck` | None |
| `@open-design/contracts` | None | `pnpm --filter @open-design/contracts typecheck` | None |
| `@open-design/sidecar-proto` | `pnpm --filter @open-design/sidecar-proto build` | `pnpm --filter @open-design/sidecar-proto typecheck` | `pnpm --filter @open-design/sidecar-proto test` |
| `@open-design/sidecar` | `pnpm --filter @open-design/sidecar build` | `pnpm --filter @open-design/sidecar typecheck` | `pnpm --filter @open-design/sidecar test` |
| `@open-design/platform` | `pnpm --filter @open-design/platform build` | `pnpm --filter @open-design/platform typecheck` | `pnpm --filter @open-design/platform test` |
| `@open-design/tools-dev` | `pnpm --filter @open-design/tools-dev build` | `pnpm --filter @open-design/tools-dev typecheck` | `pnpm --filter @open-design/tools-dev test` |
| `@open-design/tools-pack` | `pnpm --filter @open-design/tools-pack build` | `pnpm --filter @open-design/tools-pack typecheck` | None |
| `@open-design/e2e` | None | `pnpm --filter @open-design/e2e typecheck` | `pnpm --filter @open-design/e2e test` |

## Smallest Useful Checks By Change Type

Docs-only changes:

```bash
test -s .ai/figma-codex/docs/VALIDATION_COMMANDS.md
rg --line-number "pnpm typecheck|pnpm test|pnpm check:residual-js|pnpm tools-dev check|No root `pnpm lint`" .ai/figma-codex/docs/VALIDATION_COMMANDS.md
```

Prompt/skill-only metadata changes:

```bash
test -s skills/figma-native-screen/SKILL.md
rg --line-number "mode: figma|figma-canvas|use_figma|search_design_system|get_metadata|get_screenshot|get_variable_defs" skills/figma-native-screen/SKILL.md design-systems/figma-native-base/FIGMA.md
```

Skill registry or prompt composer code:

```bash
pnpm --filter @open-design/daemon test -- tests/system-prompt-template.test.ts
pnpm --filter @open-design/daemon typecheck
```

Codex adapter or JSONL parser:

```bash
pnpm --filter @open-design/daemon test -- tests/agents.test.ts tests/json-event-stream.test.ts
pnpm --filter @open-design/daemon typecheck
```

Contracts or shared DTOs:

```bash
pnpm --filter @open-design/contracts typecheck
pnpm typecheck
```

Web UI components:

```bash
pnpm --filter @open-design/web test
pnpm --filter @open-design/web typecheck
```

Mocked UI/e2e flows:

```bash
pnpm --filter @open-design/e2e test
pnpm test:ui
```

Lifecycle, namespace, sidecar, path, or log changes:

```bash
pnpm --filter @open-design/tools-dev test
pnpm tools-dev check
pnpm tools-dev status --json
pnpm tools-dev logs --json
```

Package, workspace, bin, or generated dist entry changes:

```bash
pnpm install
pnpm typecheck
pnpm test
```

Build-boundary or release-boundary changes:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## CI Notes

- `.github/workflows/release-stable.yml` installs dependencies, builds daemon
  and desktop, runs recursive workspace typecheck, and runs
  `pnpm check:residual-js`.
- The stable release workflow intentionally does not gate on workspace tests at
  the time this file was written because existing i18n content coverage can
  drift independently.
- `.github/workflows/release-beta.yml` builds packaged macOS and Windows
  artifacts after `pnpm install --frozen-lockfile`.
- `.github/workflows/metrics.yml` generates repository metrics and is not a
  validation workflow for product changes.

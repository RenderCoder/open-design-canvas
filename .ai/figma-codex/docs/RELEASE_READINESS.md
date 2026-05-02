# Release Readiness: Open Design Canvas Figma-native upgrade

Updated: 2026-05-03

This checklist records the pre-release state for the Open Design Canvas
Figma-native upgrade. It is scoped to the upgrade package and current fork state;
it does not replace the upstream stable/beta release workflows.

Status legend:

- Pass: ready for a contributor-facing pre-release.
- Defer: documented limitation or follow-up that should not block a mocked
  Figma-native pre-release.
- Block: must be fixed before publishing a release that claims the capability.

## Release summary

Open Design Canvas is ready for a contributor-facing Figma-native pre-release
that demonstrates the mocked Figma-native loop, documents real Figma MCP setup,
and keeps the original Open Design HTML/deck/media workflows additive.

Do not position this as a fully automated production Figma replacement. The
release is ready as an open-source workbench baseline with known limitations:
real Figma writes still depend on the user's Figma MCP OAuth state, plan/seat,
file permissions, and a non-private target file; the discovery-flow refinement
bead remains open; and the full workspace test matrix should be rerun in a clean
CI-like environment before cutting signed desktop artifacts.

## Release checklist

| Area | Status | Evidence | Release note |
|---|---|---|---|
| Upgrade architecture | Pass | `ARCHITECTURE.md`, `RESEARCH_BRIEF.md`, `docs/adr/figma-native-mode.md` | Open Design owns orchestration/prompt/skill/design-system review; Codex owns execution; Figma MCP owns canvas writes. |
| Figma MCP boundary | Pass | `FIGMA_MCP_SETUP.md`, `USER_GUIDE.md`, `MAINTAINER_GUIDE.md` | No custom Figma REST write-canvas path is introduced. Real canvas writes must use MCP tools. |
| Skill registry and prompt mode | Pass | Closed `open-design-canvas-m12`, `open-design-canvas-s9e`, tests under `apps/daemon/tests/*figma*` | `od.mode: figma`, `figma-canvas`, and the Figma-native directive are covered by targeted tests. |
| Project metadata and target fields | Pass | Closed `open-design-canvas-yle`, `open-design-canvas-ct9`, `FigmaTargetFields` tests | Figma target/settings are optional and backward-compatible. |
| Codex adapter and MCP event stream | Pass | Closed `open-design-canvas-c6z`, `open-design-canvas-0ht`, `open-design-canvas-400`, fixtures in `apps/daemon/tests/fixtures/` | Codex runs through modern `codex exec --json --sandbox workspace-write`; MCP progress can be parsed and displayed. |
| Figma result schema/card | Pass | Closed `open-design-canvas-awc`, `open-design-canvas-7kf`, `packages/contracts/src/figma-result.ts`, `FigmaResultCard` tests | Structured `figma_native_result` reports render without requiring real Figma credentials. |
| Figma-native skills and design-system bridge | Pass | Closed D30-D36 beads, `skills/figma-native-*`, `design-systems/figma-native-base/` | Screen, landing, dashboard, mobile flow, critique, and generic Figma design-system files exist. |
| Mocked Figma-native flow | Pass | Closed `open-design-canvas-4h2`, `e2e/tests/figma-native-mocked-flow.test.tsx` | CI/contributors can validate the loop without Figma credentials. |
| Real Figma smoke test | Defer | `open-design-canvas-3w5` remains open; `FIGMA_MCP_SETUP.md` documents prerequisites | Optional. Requires authenticated Figma MCP, a Full seat or equivalent edit capability, and a non-private test file. |
| Discovery refinement | Defer | `open-design-canvas-edy` remains open | Core Figma target fields exist, but the discovery question flow still needs the dedicated B13 refinement pass. |
| User and maintainer docs | Pass | Closed `open-design-canvas-a9q`; `USER_GUIDE.md`, `MAINTAINER_GUIDE.md`, `README.FIGMA_CODEX_UPGRADE.md` | New contributors have setup, mocked flow, maintainer extension, and troubleshooting docs. |
| License/trademark/attribution | Pass | Closed `open-design-canvas-1y0`; `LICENSE_TRADEMARK_ATTRIBUTION.md` | Apache-2.0 and bundled MIT skill licenses are documented; third-party marks are integration targets, not endorsements. |
| Validation command matrix | Pass | Closed `open-design-canvas-qvb`; `VALIDATION_COMMANDS.md` | Actual repo commands are documented, including absence of root `pnpm lint`. |
| Release workflows | Pass for existing product release path | `.github/workflows/release-stable.yml`, `.github/workflows/release-beta.yml` | Existing stable/beta workflows install with pnpm 10.33.2 and build packaged artifacts; stable verify gates typecheck/residual JS, not all tests. |
| Workspace cleanliness | Defer | `git status --short` from this session shows pre-existing dirty/untracked files across docs, tests, web, and daemon | Do not publish from the current working tree without reviewing, staging, and committing the intended upgrade changes. |

## Validation matrix

Run these before tagging or publishing a release candidate:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm check:residual-js
pnpm --filter @open-design/e2e test -- figma-native-mocked-flow.test.tsx
bash .ai/figma-codex/scripts/check-figma-mcp.sh
```

Validation notes:

- `pnpm test` is recommended for release readiness even though
  `release-stable.yml` currently documents that workspace tests are not a stable
  release gate because locale metadata can drift independently.
- `check-figma-mcp.sh` only verifies local MCP configuration. It does not prove
  that the authenticated Figma account can edit a particular file.
- A real smoke test should use a disposable, non-private Figma file and should
  not commit OAuth tokens, file IDs, screenshots, or customer content.

## Known limitations and deferred work

- `open-design-canvas-edy`: Figma-native discovery flow should ask fewer,
  sharper questions for target file/new file, surface, screen count, design
  system reuse, and validation expectations.
- `open-design-canvas-3w5`: Real Figma smoke testing remains optional and
  environment-dependent. Mocked E2E is the contributor and CI baseline.
- The current local worktree contains many pre-existing modified/untracked files
  outside this checklist. Release managers should review `git status --short`
  and commit only intentional changes.
- The stable release workflow intentionally skips workspace tests today. Treat a
  clean `pnpm test` run as a release-candidate quality signal even if CI does
  not yet enforce it.

## Contributor handoff

For new contributors:

1. Start with `README.md`, `README.FIGMA_CODEX_UPGRADE.md`, and
   `USER_GUIDE.md`.
2. Validate without Figma credentials using the mocked E2E command.
3. Read `MAINTAINER_GUIDE.md` before changing skills, result schemas, JSONL
   parser behavior, or UI result rendering.
4. Read `LICENSE_TRADEMARK_ATTRIBUTION.md` before adding third-party design
   systems, screenshots, logos, or brand references.

## Roadmap after this pre-release

1. Close the B13 discovery-flow bead.
2. Run and record the optional real Figma smoke test when a maintainer has the
   required Figma plan/seat and a disposable test file.
3. Promote the mocked Figma-native test into the normal release verification
   checklist once locale/content drift is resolved.
4. Expand canvas lint from structured agent self-reporting toward MCP metadata
   analysis for Auto Layout, variables/styles, naming, and hardcoded values.
5. Continue toward hybrid code-to-canvas flows using `generate_figma_design` as
   a visual reference and `use_figma` for native cleanup.

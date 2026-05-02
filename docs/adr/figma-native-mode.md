# ADR: Figma-Native Mode

**Status:** Accepted for Open Design Canvas Phase 0  
**Date:** 2026-05-02  
**Related:** [`../architecture.md`](../architecture.md), [`../agent-adapters.md`](../agent-adapters.md), [`../schemas/figma-native.md`](../schemas/figma-native.md)

## Context

Open Design currently treats generated designs as local artifacts, usually HTML, JSX, Markdown, deck HTML, or related files rendered in the preview iframe. Open Design Canvas adds a new output surface where the final deliverable is an editable Figma canvas, not an HTML artifact or screenshot-only mockup.

The project should keep Open Design's existing strengths: skill discovery, design-system context, prompt composition, direction picking, agent orchestration, artifact history, and review UI. It should not become a custom Figma editor or a parallel implementation of Figma's canvas APIs.

## Decision

Add a Figma-native mode as an orchestration contract:

- **Open Design** owns project flow, skill selection, design-system resolution, prompt composition, user-visible progress, result parsing, and canvas quality reporting.
- **Codex CLI** owns the agent execution loop for Figma-native work, including reading Open Design skills, following repository instructions, running local checks, and emitting JSONL events.
- **Figma Remote MCP** owns Figma canvas reads and writes. Canvas creation and updates must use MCP tools such as `search_design_system`, `create_new_file`, `use_figma`, `get_metadata`, `get_screenshot`, and `get_variable_defs`.
- **Beads** owns long-running upgrade task state and dependency order.

The primary Figma write path is Figma Remote MCP, especially `use_figma`. Open Design must not implement a custom Figma REST write-canvas backend for this mode. REST may still be used later for read-only metadata or link handling if a later ADR accepts that scope, but not as the native canvas writer.

## Stable Terms

**figma-native**

A generation or refinement flow whose final deliverable is editable Figma-native canvas content: pages, frames, components, instances, variables, styles, Auto Layout, and semantic layer names. A Figma-native result may include screenshots as validation evidence, but a screenshot or pasted bitmap is not the final deliverable.

**figmaTarget**

Project metadata that identifies where a Figma-native run should write. It can describe an existing file, an existing selection, or a request to create a new file. It may include a Figma URL, `fileKey`, `nodeId`, page/frame naming hints, plan/team key, and editor type. The field is optional for backward compatibility; non-Figma projects and older projects must keep loading without it.

**figma_native_result**

The structured result envelope returned by an agent after a Figma-native run. It reports target file details, root frame details, created and updated nodes, reused components, variables and styles used, hardcoded values, validation checks, known issues, and next iteration suggestions. The initial contract is documented in [`../schemas/figma-native.md`](../schemas/figma-native.md); implementation may accept extra fields while preserving required core fields.

**mcp_events**

Normalized Open Design event records derived from Codex JSONL MCP tool-call events. They are used for progress UI and auditing. Figma-related MCP events should map to user-facing phases such as design-system search, file creation, canvas update, metadata check, screenshot check, variable check, and lint/report generation.

## Backward Compatibility

- Figma-native mode is additive. Existing prototype, deck, template, design-system, image, video, and audio workflows must continue using their existing artifact paths and preview behavior.
- `figmaTarget`, Figma output settings, Figma skill metadata, and Figma result reports are optional fields until their implementation beads wire them into contracts and UI.
- Unknown result envelope fields should be preserved where practical so future MCP checks can add detail without breaking older UI.
- Existing HTML artifacts remain valid. Figma-native prompts must only forbid HTML as the final deliverable for Figma-native runs.

## Consequences

Positive:

- Open Design can reuse Figma's official MCP and Plugin API execution path instead of maintaining a fragile canvas writer.
- The agent result becomes inspectable and testable without requiring real Figma credentials in every unit test.
- Later UI work can show Figma result cards and MCP progress without changing the core architecture.

Tradeoffs:

- Real end-to-end writes require Figma MCP authentication, edit access, and an appropriate Figma plan or seat.
- Mocked fixtures are required for CI and unauthenticated development.
- Open Design has to parse Codex JSONL and normalize MCP events instead of treating agent output as only text and files.

## Validation Strategy

Phase 0 validates this ADR as a documentation contract. Later implementation tasks must add tests for:

- Figma skill metadata parsing.
- Figma-native prompt directive injection.
- `figmaTarget` project metadata compatibility.
- `figma_native_result` parsing and validation.
- Codex JSONL parsing for `mcp_events`.
- UI rendering of a Figma result card with mocked data.

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createJsonEventStreamHandler } from '../../apps/daemon/src/json-event-stream.js';
import { composeSystemPrompt } from '../../apps/daemon/src/prompts/system.js';
import { listSkills } from '../../apps/daemon/src/skills.js';
import validFigmaResult from '../../apps/web/src/artifacts/fixtures/figma-result-valid.json';
import { parseFigmaNativeResultText } from '../../apps/web/src/artifacts/figma-result';
import { AssistantMessage } from '../../apps/web/src/components/AssistantMessage';
import type { AgentEvent, ChatMessage } from '../../apps/web/src/types';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('mocked Figma-native generation flow', () => {
  it('runs skill selection, prompt composition, mocked Codex MCP events, result parsing, and UI rendering without Figma access', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((candidate) => candidate.id === 'figma-native-screen');

    expect(skill).toBeTruthy();
    expect(skill?.mode).toBe('figma');
    expect(skill?.previewType).toBe('figma-canvas');

    const prompt = composeSystemPrompt({
      skillMode: skill?.mode,
      skillName: skill?.name,
      skillBody: skill?.body,
      designSystemTitle: 'Figma Native Base',
      designSystemBody: '- Use the product UI palette and reusable button patterns.',
      figmaDesignSystemBody: '- Search `Button / Primary` before drawing primitive buttons.',
      metadata: {
        kind: 'other',
        figmaTarget: {
          mode: 'existing-file',
          fileUrl: 'https://www.figma.com/design/demo-file/Product',
          fileKey: 'demo-file',
          pageName: 'AI Landing Exploration',
          rootFrameName: 'Landing / Desktop / 1440',
          editorType: 'design',
        },
        figmaOutputSettings: {
          outputMode: 'figma-native',
          preferDesignSystemReuse: true,
          allowPrimitiveFallback: false,
          runCanvasLint: true,
          requireScreenshotCheck: true,
          requireVariableCheck: true,
        },
      },
    });

    expect(prompt).toContain('Active skill');
    expect(prompt).toContain('figma-native-screen');
    expect(prompt).toContain('# Figma-native canvas directive');
    expect(prompt).toContain('https://www.figma.com/design/demo-file/Product');
    expect(prompt).toContain('search_design_system');
    expect(prompt).toContain('use_figma');
    expect(prompt).toContain('get_metadata');
    expect(prompt).toContain('get_screenshot');
    expect(prompt).toContain('get_variable_defs');
    expect(prompt).toContain('"kind": "figma_native_result"');

    const daemonEvents = parseMockCodexJsonl(mockCodexFigmaRun());
    const uiEvents = daemonEvents.flatMap(toUiAgentEvent);
    const assistantText = uiEvents
      .filter((event): event is Extract<AgentEvent, { kind: 'text' }> => event.kind === 'text')
      .map((event) => event.text)
      .join('');
    const parsedResult = parseFigmaNativeResultText(assistantText);

    expect(parsedResult.ok).toBe(true);
    if (!parsedResult.ok) throw new Error(parsedResult.error);

    const message: ChatMessage = {
      id: 'assistant-figma-mocked-e2e',
      role: 'assistant',
      content: assistantText,
      events: [...uiEvents, { kind: 'figma_result', result: parsedResult.result }],
      startedAt: 1_000,
      endedAt: 4_000,
    };

    const markup = renderToStaticMarkup(
      <AssistantMessage message={message} streaming={false} projectId="project-figma" />,
    );

    expect(markup).toContain('Searched design system');
    expect(markup).toContain('Updated Figma canvas');
    expect(markup).toContain('Checked Figma metadata');
    expect(markup).toContain('Checked Figma screenshot');
    expect(markup).toContain('Checked Figma variables');
    expect(markup).toContain('Figma native result');
    expect(markup).toContain('Open Figma file');
    expect(markup).toContain('AI Landing Exploration');
    expect(markup).toContain('Landing / Desktop / 1440');
    expect(markup).toContain('Button / Primary - team library');
    expect(markup).toContain('Add mobile variant');
    expect(markup).not.toContain('mcp__figma.search_design_system');
  });
});

type DaemonAgentEvent =
  | { type: 'status'; label: string; detail?: string; model?: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; toolUseId: string; content: string; isError?: boolean }
  | { type: 'usage'; usage?: Record<string, number>; costUsd?: number; durationMs?: number }
  | { type: 'raw'; line: string };

function parseMockCodexJsonl(jsonl: string): DaemonAgentEvent[] {
  const events: DaemonAgentEvent[] = [];
  const handler = createJsonEventStreamHandler('codex', (event) =>
    events.push(event as DaemonAgentEvent),
  );
  for (let offset = 0; offset < jsonl.length; offset += 43) {
    handler.feed(jsonl.slice(offset, offset + 43));
  }
  handler.flush();
  return events;
}

function toUiAgentEvent(event: DaemonAgentEvent): AgentEvent[] {
  if (event.type === 'status') {
    return [
      {
        kind: 'status',
        label: event.label,
        detail: event.detail ?? event.model,
      },
    ];
  }
  if (event.type === 'text_delta') return [{ kind: 'text', text: event.delta }];
  if (event.type === 'thinking_delta') return [{ kind: 'thinking', text: event.delta }];
  if (event.type === 'tool_use') {
    return [{ kind: 'tool_use', id: event.id, name: event.name, input: event.input }];
  }
  if (event.type === 'tool_result') {
    return [
      {
        kind: 'tool_result',
        toolUseId: event.toolUseId,
        content: event.content,
        isError: Boolean(event.isError),
      },
    ];
  }
  if (event.type === 'usage') {
    return [
      {
        kind: 'usage',
        inputTokens: event.usage?.input_tokens,
        outputTokens: event.usage?.output_tokens,
        costUsd: event.costUsd,
        durationMs: event.durationMs,
      },
    ];
  }
  if (event.type === 'raw') return [{ kind: 'raw', line: event.line }];
  return [];
}

function mockCodexFigmaRun(): string {
  const resultText = [
    'Figma-native canvas write complete.',
    '```json',
    JSON.stringify(validFigmaResult),
    '```',
  ].join('\n');

  return [
    { type: 'thread.started', thread_id: 'thread-figma-mocked-e2e' },
    { type: 'turn.started' },
    {
      type: 'item.started',
      item: {
        id: 'mcp-search',
        type: 'mcp_tool_call',
        server: 'mcp__figma',
        tool: 'search_design_system',
        arguments: { fileKey: 'demo-file', query: 'Button / Primary' },
      },
    },
    {
      type: 'item.completed',
      item: {
        id: 'mcp-search',
        type: 'mcp_tool_call',
        server: 'mcp__figma',
        tool: 'search_design_system',
        arguments: { fileKey: 'demo-file', query: 'Button / Primary' },
        result: { matches: [{ name: 'Button / Primary', source: 'team library' }] },
        status: 'completed',
      },
    },
    {
      type: 'item.started',
      item: {
        id: 'mcp-write',
        type: 'mcp_tool_call',
        server: 'mcp__figma',
        tool: 'use_figma',
        arguments: { fileKey: 'demo-file', pageName: 'AI Landing Exploration' },
      },
    },
    {
      type: 'item.completed',
      item: {
        id: 'mcp-write',
        type: 'mcp_tool_call',
        server: 'mcp__figma',
        tool: 'use_figma',
        arguments: { fileKey: 'demo-file', pageName: 'AI Landing Exploration' },
        result: { created: [{ type: 'FRAME', name: 'Landing / Desktop / 1440', nodeId: '1:2' }] },
        status: 'completed',
      },
    },
    {
      type: 'item.completed',
      item: {
        id: 'mcp-metadata',
        type: 'mcp_tool_call',
        server: 'mcp__figma',
        tool: 'get_metadata',
        arguments: { fileKey: 'demo-file', nodeId: '1:2' },
        result: { nodes: [{ id: '1:2', name: 'Landing / Desktop / 1440' }] },
        status: 'completed',
      },
    },
    {
      type: 'item.completed',
      item: {
        id: 'mcp-screenshot',
        type: 'mcp_tool_call',
        server: 'mcp__figma',
        tool: 'get_screenshot',
        arguments: { fileKey: 'demo-file', nodeId: '1:2' },
        result: { url: 'https://example.invalid/figma-screenshot.png' },
        status: 'completed',
      },
    },
    {
      type: 'item.completed',
      item: {
        id: 'mcp-vars',
        type: 'mcp_tool_call',
        server: 'mcp__figma',
        tool: 'get_variable_defs',
        arguments: { fileKey: 'demo-file', nodeId: '1:2' },
        result: { 'color/bg/default': '#ffffff', 'space/8': 8 },
        status: 'completed',
      },
    },
    {
      type: 'item.completed',
      item: {
        id: 'agent-final',
        type: 'agent_message',
        text: resultText,
      },
    },
    {
      type: 'turn.completed',
      usage: { input_tokens: 800, cached_input_tokens: 120, output_tokens: 180 },
    },
  ].map((line) => JSON.stringify(line)).join('\n') + '\n';
}

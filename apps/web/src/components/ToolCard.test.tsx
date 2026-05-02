import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ToolCard } from './ToolCard';

describe('ToolCard', () => {
  it('renders mocked Figma MCP progress as meaningful labels', () => {
    const rendered = [
      renderToStaticMarkup(
        <ToolCard
          use={{
            kind: 'tool_use',
            id: 'mcp-search',
            name: 'mcp__figma.search_design_system',
            input: {
              kind: 'mcp_tool_call',
              server: 'mcp__figma',
              tool: 'search_design_system',
              args: { fileKey: 'demo-file', query: 'button primary' },
            },
          }}
          result={{
            kind: 'tool_result',
            toolUseId: 'mcp-search',
            content: '{"matches":[{"name":"Button / Primary"}]}',
            isError: false,
          }}
        />,
      ),
      renderToStaticMarkup(
        <ToolCard
          use={{
            kind: 'tool_use',
            id: 'mcp-write',
            name: 'mcp__figma.use_figma',
            input: {
              kind: 'mcp_tool_call',
              server: 'mcp__figma',
              tool: 'use_figma',
              args: { fileKey: 'demo-file', nodeId: '1:2' },
            },
          }}
          result={{
            kind: 'tool_result',
            toolUseId: 'mcp-write',
            content: '{"created":[{"name":"Landing / Desktop / 1440"}]}',
            isError: false,
          }}
        />,
      ),
      renderToStaticMarkup(
        <ToolCard
          use={{
            kind: 'tool_use',
            id: 'mcp-metadata',
            name: 'mcp__figma.get_metadata',
            input: {
              kind: 'mcp_tool_call',
              server: 'mcp__figma',
              tool: 'get_metadata',
              args: { fileKey: 'demo-file', nodeId: '1:2' },
            },
          }}
        />,
      ),
      renderToStaticMarkup(
        <ToolCard
          use={{
            kind: 'tool_use',
            id: 'mcp-screenshot',
            name: 'mcp__figma.get_screenshot',
            input: {
              kind: 'mcp_tool_call',
              server: 'mcp__figma',
              tool: 'get_screenshot',
              args: { fileKey: 'demo-file', nodeId: '1:2' },
            },
          }}
          result={{
            kind: 'tool_result',
            toolUseId: 'mcp-screenshot',
            content: 'Node 1:2 was not found',
            isError: true,
          }}
        />,
      ),
      renderToStaticMarkup(
        <ToolCard
          use={{
            kind: 'tool_use',
            id: 'mcp-vars',
            name: 'mcp__figma.get_variable_defs',
            input: {
              kind: 'mcp_tool_call',
              server: 'mcp__figma',
              tool: 'get_variable_defs',
              args: { fileKey: 'demo-file', nodeId: '1:2' },
            },
          }}
          result={{
            kind: 'tool_result',
            toolUseId: 'mcp-vars',
            content: '{"color/bg/default":"#ffffff"}',
            isError: false,
          }}
        />,
      ),
    ].join('');

    expect(rendered).toContain('Searched design system');
    expect(rendered).toContain('query: button primary');
    expect(rendered).toContain('Updated Figma canvas');
    expect(rendered).toContain('Checking Figma metadata');
    expect(rendered).toContain('Checked Figma screenshot issue');
    expect(rendered).toContain('Checked Figma variables');
    expect(rendered).not.toContain('mcp__figma.search_design_system');
    expect(rendered).not.toContain('matches');
  });

  it('preserves existing command and file-change event rendering', () => {
    const rendered = [
      renderToStaticMarkup(
        <ToolCard
          use={{
            kind: 'tool_use',
            id: 'cmd-1',
            name: 'Bash',
            input: { command: 'pnpm test' },
          }}
          result={{ kind: 'tool_result', toolUseId: 'cmd-1', content: 'ok', isError: false }}
        />,
      ),
      renderToStaticMarkup(
        <ToolCard
          use={{
            kind: 'tool_use',
            id: 'file-1',
            name: 'FileChange',
            input: {
              changes: [{ path: '/workspace/apps/web/src/components/ToolCard.tsx', kind: 'update' }],
              status: 'completed',
            },
          }}
          result={{
            kind: 'tool_result',
            toolUseId: 'file-1',
            content: '[{"path":"/workspace/apps/web/src/components/ToolCard.tsx","kind":"update"}]',
            isError: false,
          }}
        />,
      ),
    ].join('');

    expect(rendered).toContain('Bash');
    expect(rendered).toContain('pnpm test');
    expect(rendered).toContain('FileChange');
    expect(rendered).toContain('ToolCard.tsx');
    expect(rendered).toContain('done');
  });
});

// @ts-nocheck
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listSkills } from '../src/skills.js';
import { composeSystemPrompt } from '../src/prompts/system.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('shipped figma-canvas-critique skill', () => {
  it('is discoverable with critique-specific Figma metadata and lint rules', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((s) => s.id === 'figma-canvas-critique');

    expect(skill).toMatchObject({
      id: 'figma-canvas-critique',
      mode: 'figma',
      surface: 'figma',
      platform: 'desktop',
      scenario: 'design',
      previewType: 'figma-canvas',
      designSystemRequired: false,
      figma: {
        requiresMcp: true,
        requiresFullSeat: false,
        defaultEditor: 'design',
        outputKind: 'critique-report',
        supportsExistingFile: true,
        supportsCreateNewFile: false,
        validation: {
          metadata: true,
          screenshot: true,
          variableDefs: true,
        },
      },
    });
    expect(skill?.body).toContain('Skill root (absolute)');
    expect(skill?.body).toContain('references/figma-mcp-contract.md');
    expect(skill?.body).toContain('references/canvas-lint.md');
    expect(skill?.body).toContain('references/result-report.md');
    expect(skill?.body).toContain('get_metadata');
    expect(skill?.body).toContain('get_screenshot');
    expect(skill?.body).toContain('get_variable_defs');
    expect(skill?.body).toContain('severity-ranked issues');
    expect(skill?.body).toContain('P0');
    expect(skill?.body).toContain('repair');
    expect(skill?.body).toContain('figma_native_result');
    expect(skill?.body).toContain('Do not create a new canvas');
  });

  it('composes a structured canvas audit prompt with MCP checks and result-schema fields', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((s) => s.id === 'figma-canvas-critique');
    expect(skill).toBeTruthy();

    const out = composeSystemPrompt({
      skillMode: skill?.mode,
      skillName: skill?.name,
      skillBody: skill?.body,
      metadata: {
        kind: 'other',
        figmaTarget: {
          mode: 'existing-selection',
          fileUrl: 'https://www.figma.com/design/demo/File?node-id=12-34',
          fileKey: 'demo',
          nodeId: '12:34',
          pageName: 'AI Exploration',
          rootFrameName: 'Landing / Desktop / 1440',
          editorType: 'design',
          allowCreateNewFile: false,
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
      designSystemTitle: 'Figma Native Base',
      designSystemBody: '- Use semantic layer names and variables when available.',
      figmaDesignSystemBody: '- Prefer component instances over primitive repeated controls.',
    });

    expect(out).toContain('Active skill — figma-canvas-critique');
    expect(out).toContain('Active Figma design-system guidance — Figma Native Base');
    expect(out).toContain('### Figma target');
    expect(out).toContain('**nodeId**: 12:34');
    expect(out).toContain('**runCanvasLint**: true');
    expect(out).toContain('Pre-flight');
    expect(out).toContain('references/figma-mcp-contract.md');
    expect(out).toContain('references/canvas-lint.md');
    expect(out).toContain('references/result-report.md');
    expect(out).toContain('get_metadata');
    expect(out).toContain('get_screenshot');
    expect(out).toContain('get_variable_defs');
    expect(out).toContain('severity-ranked issues');
    expect(out).toContain('nextActions');
    expect(out).toContain('mcpEvents');
    expect(out).toContain('"kind": "figma_native_result"');
  });
});

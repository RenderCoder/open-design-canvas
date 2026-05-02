// @ts-nocheck
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listSkills } from '../src/skills.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('shipped figma-native-dashboard skill', () => {
  it('is discoverable with Figma metadata and dashboard-specific canvas rules', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((s) => s.id === 'figma-native-dashboard');

    expect(skill).toMatchObject({
      id: 'figma-native-dashboard',
      mode: 'figma',
      surface: 'figma',
      platform: 'desktop',
      scenario: 'operation',
      previewType: 'figma-canvas',
      designSystemRequired: true,
      figma: {
        requiresMcp: true,
        requiresFullSeat: true,
        defaultEditor: 'design',
        outputKind: 'native-canvas',
        supportsExistingFile: true,
        supportsCreateNewFile: true,
        validation: {
          metadata: true,
          screenshot: true,
          variableDefs: true,
        },
      },
    });
    expect(skill?.body).toContain('Skill root (absolute)');
    expect(skill?.body).toContain('references/figma-mcp-contract.md');
    expect(skill?.body).toContain('references/layout-patterns.md');
    expect(skill?.body).toContain('references/canvas-lint.md');
    expect(skill?.body).toContain('references/result-report.md');
    expect(skill?.body).toContain('real editable Figma-native dashboard');
    expect(skill?.body).toContain('Not HTML');
    expect(skill?.body).toContain('Search design system');
    expect(skill?.body).toContain('Sidebar, NavItem, Topbar, Card, Table, Chart');
    expect(skill?.body).toContain('empty, loading and error states');
    expect(skill?.body).toContain('alignment, tabular readability and hierarchy');
    expect(skill?.body).toContain('use_figma');
    expect(skill?.body).toContain('structured result report');
  });
});

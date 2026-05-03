// @ts-nocheck
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listSkills } from '../src/skills.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('shipped figma-native-screen skill', () => {
  it('is discoverable with Figma metadata and reference-backed prompt body', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((s) => s.id === 'figma-native-screen');

    expect(skill).toMatchObject({
      id: 'figma-native-screen',
      mode: 'figma',
      surface: 'figma',
      platform: 'desktop',
      scenario: 'design',
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
    expect(skill?.body).toContain('single real editable Figma-native product screen');
    expect(skill?.body).toContain('use_figma');
    expect(skill?.body).toContain('text-text-overlap');
    expect(skill?.body).toContain('textOverlapCheck');
    expect(skill?.body).toContain('structured result report');
  });
});

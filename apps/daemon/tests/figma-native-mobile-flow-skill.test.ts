// @ts-nocheck
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listSkills } from '../src/skills.js';
import { composeSystemPrompt } from '../src/prompts/system.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('shipped figma-native-mobile-flow skill', () => {
  it('is discoverable with Figma metadata and mobile-flow canvas rules', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((s) => s.id === 'figma-native-mobile-flow');

    expect(skill).toMatchObject({
      id: 'figma-native-mobile-flow',
      mode: 'figma',
      surface: 'figma',
      platform: 'mobile',
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
    expect(skill?.body).toContain('2-5 editable mobile root frames');
    expect(skill?.body).toContain('Not HTML');
    expect(skill?.body).toContain('one root frame per screen');
    expect(skill?.body).toContain('left-to-right order');
    expect(skill?.body).toContain('tap targets at least 44px');
    expect(skill?.body).toContain('default, empty, loading, error, success, or permission states');
    expect(skill?.body).toContain('use_figma');
    expect(skill?.body).toContain('rootFrames');
  });

  it('composes a Figma-native prompt with multi-screen mobile flow requirements', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((s) => s.id === 'figma-native-mobile-flow');
    expect(skill).toBeTruthy();

    const out = composeSystemPrompt({
      skillMode: skill?.mode,
      skillName: skill?.name,
      skillBody: skill?.body,
      designSystemTitle: 'Figma Native Base',
      designSystemBody: [
        '# Figma Native Base',
        '- Use Button, Input, Card, ListItem, and EmptyState component patterns.',
        '- Use color/bg/default and space/16 tokens.',
      ].join('\n'),
      figmaDesignSystemBody: [
        '# Figma Rules',
        '- Search `BottomNav / Default` and `Button / Primary` before drawing primitive mobile controls.',
        '- Use mobile text styles and spacing variables.',
      ].join('\n'),
    });

    expect(out).toContain('Active skill — figma-native-mobile-flow');
    expect(out).toContain('Active design system — Figma Native Base');
    expect(out).toContain('Active Figma design-system guidance — Figma Native Base');
    expect(out).toContain('Search `BottomNav / Default` and `Button / Primary`');
    expect(out).toContain('# Figma-native canvas directive');
    expect(out).toContain('final deliverable is editable Figma-native canvas');
    expect(out).toContain('Do not emit a final `<artifact>` block for the Figma deliverable');
    expect(out).toContain('search_design_system');
    expect(out).toContain('use_figma');
    expect(out).toContain('get_metadata');
    expect(out).toContain('get_screenshot');
    expect(out).toContain('get_variable_defs');
    expect(out).toContain('one root frame per screen');
    expect(out).toContain('Root frame names include order and purpose');
    expect(out).toContain('Tap targets are at least 44px');
    expect(out).toContain('rootFrames');
    expect(out).toContain('"kind": "figma_native_result"');
  });
});

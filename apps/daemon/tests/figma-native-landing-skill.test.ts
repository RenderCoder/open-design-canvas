// @ts-nocheck
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listSkills } from '../src/skills.js';
import { composeSystemPrompt } from '../src/prompts/system.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('shipped figma-native-landing skill', () => {
  it('is discoverable with Figma metadata and landing-specific canvas rules', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((s) => s.id === 'figma-native-landing');

    expect(skill).toMatchObject({
      id: 'figma-native-landing',
      mode: 'figma',
      surface: 'figma',
      platform: 'desktop',
      scenario: 'marketing',
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
    expect(skill?.body).toContain('real editable Figma-native landing page');
    expect(skill?.body).toContain('Not HTML');
    expect(skill?.body).toContain('Hero Section');
    expect(skill?.body).toContain('Proof Section');
    expect(skill?.body).toContain('Feature Grid');
    expect(skill?.body).toContain('Workflow Section');
    expect(skill?.body).toContain('Pricing Section');
    expect(skill?.body).toContain('FAQ Section');
    expect(skill?.body).toContain('Footer');
    expect(skill?.body).toContain('responsive notes');
    expect(skill?.body).toContain('use_figma');
    expect(skill?.body).toContain('figma_native_result');
  });

  it('composes a Figma-native prompt instead of an HTML artifact prompt', async () => {
    const skills = await listSkills(path.join(repoRoot, 'skills'));
    const skill = skills.find((s) => s.id === 'figma-native-landing');
    expect(skill).toBeTruthy();

    const out = composeSystemPrompt({
      skillMode: skill?.mode,
      skillName: skill?.name,
      skillBody: skill?.body,
      designSystemTitle: 'Figma Native Base',
      designSystemBody: [
        '# Figma Native Base',
        '- Use Button, Card, PricingCard and FAQItem component patterns.',
        '- Use color/bg/default and space/48 tokens.',
      ].join('\n'),
      figmaDesignSystemBody: [
        '# Figma Rules',
        '- Search `PricingCard / Default` and `FAQItem / Default` before drawing primitive sections.',
        '- Use `Grid/Desktop/12` for desktop landing layouts.',
      ].join('\n'),
    });

    expect(out).toContain('Active skill — figma-native-landing');
    expect(out).toContain('Active design system — Figma Native Base');
    expect(out).toContain('Active Figma design-system guidance — Figma Native Base');
    expect(out).toContain('Search `PricingCard / Default` and `FAQItem / Default`');
    expect(out).toContain('# Figma-native canvas directive');
    expect(out).toContain('final deliverable is editable Figma-native canvas');
    expect(out).toContain('Do not emit a final `<artifact>` block for the Figma deliverable');
    expect(out).toContain('search_design_system');
    expect(out).toContain('use_figma');
    expect(out).toContain('get_metadata');
    expect(out).toContain('get_screenshot');
    expect(out).toContain('get_variable_defs');
    expect(out).toContain('Hero Section');
    expect(out).toContain('Feature Grid');
    expect(out).toContain('Pricing Section');
    expect(out).toContain('FAQ Section');
    expect(out).toContain('"kind": "figma_native_result"');
  });
});

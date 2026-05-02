import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { listDesignSystems, readDesignSystem, readDesignSystemDetail } from '../src/design-systems.js';

let systemsRoot: string | null = null;

afterEach(async () => {
  if (systemsRoot) {
    await rm(systemsRoot, { recursive: true, force: true });
    systemsRoot = null;
  }
});

describe('design-system registry', () => {
  it('exposes optional Figma-native companion files without requiring them', async () => {
    systemsRoot = await mkdtemp(path.join(tmpdir(), 'od-design-systems-test-'));
    await writeDesignSystem('plain', {
      design: '# Plain System\n\n> Category: Test\n\nA plain web system.',
    });
    await writeDesignSystem('figma-native', {
      design: [
        '# Figma Native',
        '',
        '> Category: Figma Native',
        '> Surface: figma',
        '',
        'A native Figma system.',
      ].join('\n'),
      figma: '# Figma Rules\n\nUse `search_design_system` first.',
      tokens: {
        variables: {
          'color/bg/default': { type: 'color', value: '#ffffff' },
        },
      },
      componentMap: {
        components: [
          {
            slot: 'button.primary',
            search: ['Button / Primary'],
          },
        ],
      },
    });

    const systems = await listDesignSystems(systemsRoot);
    const byId = Object.fromEntries(systems.map((system) => [system.id, system]));

    expect(byId.plain).toMatchObject({
      id: 'plain',
      surface: 'web',
      figma: null,
    });
    expect(byId['figma-native']).toMatchObject({
      id: 'figma-native',
      surface: 'figma',
      figma: {
        hasGuidance: true,
        hasTokens: true,
        hasComponentMap: true,
      },
    });

    const body = await readDesignSystem(systemsRoot, 'figma-native');
    const detail = await readDesignSystemDetail(systemsRoot, 'figma-native');

    expect(body).toContain('# Figma Native');
    expect(detail).toMatchObject({
      id: 'figma-native',
      body: expect.stringContaining('# Figma Native'),
      figma: {
        guidance: expect.stringContaining('search_design_system'),
        tokens: {
          variables: {
            'color/bg/default': { type: 'color', value: '#ffffff' },
          },
        },
        componentMap: {
          components: [
            {
              slot: 'button.primary',
              search: ['Button / Primary'],
            },
          ],
        },
      },
    });
  });
});

async function writeDesignSystem(
  slug: string,
  files: {
    design: string;
    figma?: string;
    tokens?: unknown;
    componentMap?: unknown;
  },
) {
  if (!systemsRoot) throw new Error('systemsRoot not initialized');
  const dir = path.join(systemsRoot, slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'DESIGN.md'), files.design, 'utf8');
  if (files.figma) await writeFile(path.join(dir, 'FIGMA.md'), files.figma, 'utf8');
  if (files.tokens) {
    await writeFile(path.join(dir, 'tokens.json'), JSON.stringify(files.tokens), 'utf8');
  }
  if (files.componentMap) {
    await writeFile(
      path.join(dir, 'component-map.json'),
      JSON.stringify(files.componentMap),
      'utf8',
    );
  }
}

// @ts-nocheck
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { listSkills } from '../src/skills.js';

let skillsRoot;

beforeAll(async () => {
  skillsRoot = await mkdtemp(path.join(tmpdir(), 'od-skills-test-'));
  await writeSkill(
    'figma-native-screen',
    `---
name: figma-native-screen
description: Create an editable Figma-native screen.
od:
  mode: figma
  surface: figma
  platform: responsive
  scenario: design
  preview:
    type: figma-canvas
  design_system:
    requires: true
  figma:
    requires_mcp: true
    requires_full_seat: true
    default_editor: design
    output_kind: native-canvas
    supports_existing_file: true
    supports_create_new_file: true
    validation:
      metadata: true
      screenshot: true
      variable_defs: true
---

# Figma Native Screen
`,
  );
  await writeSkill(
    'prototype-skill',
    `---
name: prototype-skill
description: Desktop web prototype.
od:
  mode: prototype
  surface: web
  preview:
    type: html
---

# Prototype
`,
  );
  await writeSkill(
    'deck-skill',
    `---
name: deck-skill
description: Pitch deck.
od:
  mode: deck
  preview:
    type: html
---

# Deck
`,
  );
  await writeSkill(
    'media-skill',
    `---
name: media-skill
description: Multi-surface fixture.
od:
  mode: image
  surface: image
  preview:
    type: image
---

# Image
`,
  );
  await writeSkill(
    'template-skill',
    `---
name: template-skill
description: Document template.
od:
  mode: template
  preview:
    type: html
---

# Template
`,
  );
  await writeSkill(
    'video-skill',
    `---
name: video-skill
description: Short video prompt.
od:
  mode: video
  surface: video
  preview:
    type: video
---

# Video
`,
  );
  await writeSkill(
    'audio-skill',
    `---
name: audio-skill
description: Audio prompt.
od:
  mode: audio
  surface: audio
  preview:
    type: audio
---

# Audio
`,
  );
});

afterAll(async () => {
  if (skillsRoot) await rm(skillsRoot, { recursive: true, force: true });
});

describe('listSkills', () => {
  it('preserves Figma-native mode, surface, preview, and MCP metadata', async () => {
    const skills = await listSkills(skillsRoot);
    const skill = skills.find((s) => s.id === 'figma-native-screen');

    expect(skill).toMatchObject({
      id: 'figma-native-screen',
      mode: 'figma',
      surface: 'figma',
      platform: 'responsive',
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
  });

  it('keeps existing prototype, deck, template, and media skill modes unchanged', async () => {
    const skills = await listSkills(skillsRoot);
    const byId = Object.fromEntries(skills.map((skill) => [skill.id, skill]));

    expect(byId['prototype-skill']).toMatchObject({
      mode: 'prototype',
      surface: 'web',
      previewType: 'html',
      figma: null,
    });
    expect(byId['deck-skill']).toMatchObject({
      mode: 'deck',
      surface: 'web',
      previewType: 'html',
      figma: null,
    });
    expect(byId['media-skill']).toMatchObject({
      mode: 'image',
      surface: 'image',
      previewType: 'image',
      figma: null,
    });
    expect(byId['template-skill']).toMatchObject({
      mode: 'template',
      surface: 'web',
      previewType: 'html',
      figma: null,
    });
    expect(byId['video-skill']).toMatchObject({
      mode: 'video',
      surface: 'video',
      previewType: 'video',
      figma: null,
    });
    expect(byId['audio-skill']).toMatchObject({
      mode: 'audio',
      surface: 'audio',
      previewType: 'audio',
      figma: null,
    });
  });

});

async function writeSkill(slug, content) {
  const dir = path.join(skillsRoot, slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'SKILL.md'), content, 'utf8');
}

import { describe, expect, it } from 'vitest';

import { lintFigmaCanvasTextReadability } from '../src/figma-canvas-lint.js';

describe('lintFigmaCanvasTextReadability', () => {
  it('reports a wrapped display title overlapping its subtitle as an error', () => {
    const result = lintFigmaCanvasTextReadability(wrappedTitleOverlapFixture());

    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'text-text-overlap',
      severity: 'error',
      nodeIds: ['title', 'subtitle'],
      threshold: 0.02,
    });
    expect(result.summary).toMatchObject({
      checkedTextNodes: 2,
      ignoredTextNodes: 0,
      issueCount: 1,
      warningCount: 0,
      passed: false,
    });
  });

  it('reports a small heading overlapping body copy as an error', () => {
    const result = lintFigmaCanvasTextReadability(sectionHeadingBodyOverlapFixture());

    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'text-text-overlap',
      severity: 'error',
      nodeIds: ['section-heading', 'body-copy'],
      threshold: 0.02,
    });
  });

  it('reports two body paragraphs overlapping from insufficient container height', () => {
    const result = lintFigmaCanvasTextReadability(bodyParagraphOverlapFixture());

    expect(result.passed).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      code: 'text-text-overlap',
      severity: 'error',
      nodeIds: ['body-a', 'body-b'],
    });
  });

  it('warns when stacked text is too close without overlapping', () => {
    const result = lintFigmaCanvasTextReadability([
      { ...textNode('heading', 'Section heading', { x: 0, y: 0, width: 200, height: 32 }), lineHeightPx: 28 },
      { ...textNode('body', 'Body copy', { x: 0, y: 42, width: 200, height: 60 }), lineHeightPx: 20 },
    ]);

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: 'text-too-close',
      severity: 'warning',
      nodeIds: ['heading', 'body'],
      verticalGap: 10,
      threshold: 28,
    });
  });

  it('ignores non-text nodes so text over backgrounds does not fail', () => {
    const result = lintFigmaCanvasTextReadability(textOverBackgroundFixture());

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.nodeIds).toEqual(['headline']);
  });

  it('reports ignored text overlap without failing the result', () => {
    const result = lintFigmaCanvasTextReadability(ignoredLogoOverlapFixture());

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.ignored).toHaveLength(1);
    expect(result.ignored[0]).toMatchObject({
      code: 'ignored-text-overlap',
      severity: 'info',
      nodeIds: ['logo-a', 'logo-b'],
    });
    expect(result.summary.ignoredTextNodes).toBe(1);
  });

  it('passes after the overlapping text blocks are repaired', () => {
    const result = lintFigmaCanvasTextReadability(repairedTextLayoutFixture());

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.nodeIds).toEqual(['title', 'subtitle', 'body-copy']);
  });

  it('filters invisible, transparent, and zero-size text nodes', () => {
    const result = lintFigmaCanvasTextReadability([
      { ...textNode('hidden', 'Hidden', { x: 0, y: 0, width: 100, height: 20 }), visible: false },
      { ...textNode('transparent', 'Transparent', { x: 0, y: 0, width: 100, height: 20 }), opacity: 0 },
      textNode('zero', 'Zero width', { x: 0, y: 0, width: 0, height: 20 }),
      textNode('visible', 'Visible', { x: 0, y: 0, width: 100, height: 20 }),
    ]);

    expect(result.passed).toBe(true);
    expect(result.nodeIds).toEqual(['visible']);
    expect(result.summary.checkedTextNodes).toBe(1);
  });
});

function wrappedTitleOverlapFixture() {
  return [
    textNode('title', 'A long display title that wraps onto two lines', { x: 0, y: 0, width: 320, height: 80 }, 'title'),
    textNode('subtitle', 'Hero subtitle', { x: 0, y: 60, width: 320, height: 40 }, 'subtitle'),
  ];
}

function sectionHeadingBodyOverlapFixture() {
  return [
    textNode('section-heading', 'Implementation details', { x: 0, y: 120, width: 280, height: 36 }, 'heading'),
    textNode('body-copy', 'The body starts too high and collides with the heading.', { x: 0, y: 146, width: 280, height: 72 }, 'body'),
  ];
}

function bodyParagraphOverlapFixture() {
  return [
    textNode('body-a', 'First paragraph in an undersized container.', { x: 0, y: 0, width: 260, height: 72 }, 'body'),
    textNode('body-b', 'Second paragraph starts before the first paragraph ends.', { x: 0, y: 60, width: 260, height: 72 }, 'body'),
  ];
}

function textOverBackgroundFixture() {
  return [
    {
      type: 'RECTANGLE',
      nodeId: 'background',
      name: 'Hero image overlay',
      x: 0,
      y: 0,
      width: 500,
      height: 300,
    },
    textNode('headline', 'Readable over image', { x: 40, y: 40, width: 300, height: 60 }),
  ];
}

function ignoredLogoOverlapFixture() {
  return [
    textNode('logo-a', 'A', { x: 0, y: 0, width: 80, height: 80 }),
    textNode(
      'logo-b',
      'B',
      { x: 20, y: 20, width: 80, height: 80 },
      'display',
      'Logo B od-lint-ignore:text-overlap',
    ),
  ];
}

function repairedTextLayoutFixture() {
  return [
    textNode('title', 'A repaired display title', { x: 0, y: 0, width: 320, height: 72 }, 'title'),
    textNode('subtitle', 'Subtitle moved below the title', { x: 0, y: 104, width: 320, height: 40 }, 'subtitle'),
    textNode('body-copy', 'Body copy now has enough vertical spacing.', { x: 0, y: 176, width: 320, height: 80 }, 'body'),
  ];
}

function textNode(
  nodeId: string,
  characters: string,
  bounds: { x: number; y: number; width: number; height: number },
  role: 'display' | 'title' | 'subtitle' | 'heading' | 'body' | 'caption' | 'label' | 'unknown' = 'body',
  name = nodeId,
) {
  return {
    type: 'TEXT',
    nodeId,
    name,
    characters,
    bounds,
    role,
    fontSize: 20,
    lineHeightPx: 24,
    visible: true,
    opacity: 1,
  };
}

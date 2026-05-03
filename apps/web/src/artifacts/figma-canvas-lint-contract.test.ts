import { describe, expect, it } from 'vitest';

import {
  FIGMA_CANVAS_TEXT_LINT_RULES,
  FIGMA_TEXT_OVERLAP_CHECK_KEY,
  FIGMA_TEXT_OVERLAP_IGNORE_MARKER,
  FIGMA_TEXT_READABILITY_CHECK_KEY,
  type FigmaCanvasTextLintCode,
} from '@open-design/contracts';

describe('figma canvas text lint contract', () => {
  it('publishes stable check keys for result envelopes', () => {
    expect(FIGMA_TEXT_READABILITY_CHECK_KEY).toBe('textReadability');
    expect(FIGMA_TEXT_OVERLAP_CHECK_KEY).toBe('textOverlap');
  });

  it('publishes stable text readability rule thresholds', () => {
    expect(FIGMA_CANVAS_TEXT_LINT_RULES).toEqual({
      overlapAreaRatioThreshold: 0.03,
      strictHierarchyOverlapAreaRatioThreshold: 0.02,
      tooCloseLineHeightRatio: 1,
      ignoreMarker: FIGMA_TEXT_OVERLAP_IGNORE_MARKER,
      allowedNonTextOverlap: true,
    });
  });

  it('keeps the lint code vocabulary explicit', () => {
    const codes: FigmaCanvasTextLintCode[] = [
      'text-text-overlap',
      'text-too-close',
      'ignored-text-overlap',
    ];

    expect(codes).toContain('text-text-overlap');
    expect(codes).toContain('text-too-close');
    expect(codes).toContain('ignored-text-overlap');
  });
});

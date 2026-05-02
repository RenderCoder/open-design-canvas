import { describe, expect, it } from 'vitest';
import {
  defaultFigmaTargetDraft,
  isFigmaTargetUrl,
  normalizeFigmaTargetDraft,
} from './FigmaTargetFields';

describe('FigmaTargetFields metadata helpers', () => {
  it('accepts common Figma target URL shapes without requiring network access', () => {
    expect(isFigmaTargetUrl('https://www.figma.com/design/abc123/File?node-id=1-2')).toBe(true);
    expect(isFigmaTargetUrl('https://figma.com/board/abc123/FigJam')).toBe(true);
    expect(isFigmaTargetUrl('https://example.com/design/abc123')).toBe(false);
  });

  it('requires a valid URL for existing file targets', () => {
    const draft = defaultFigmaTargetDraft();
    expect(normalizeFigmaTargetDraft(draft)).toBeNull();
    expect(
      normalizeFigmaTargetDraft({
        ...draft,
        target: {
          ...draft.target,
          fileUrl: 'https://www.figma.com/design/abc123/Product',
        },
      })?.target.fileUrl,
    ).toBe('https://www.figma.com/design/abc123/Product');
  });

  it('normalizes create-new-file intent without a Figma URL', () => {
    const draft = defaultFigmaTargetDraft();
    const normalized = normalizeFigmaTargetDraft({
      ...draft,
      target: {
        ...draft.target,
        mode: 'new-file',
        fileUrl: 'https://www.figma.com/design/old/Ignore',
        pageName: 'AI Screen',
        rootFrameName: 'Dashboard / Desktop',
      },
    });

    expect(normalized?.target).toMatchObject({
      mode: 'new-file',
      allowCreateNewFile: true,
      pageName: 'AI Screen',
      rootFrameName: 'Dashboard / Desktop',
    });
    expect(normalized?.target.fileUrl).toBeUndefined();
    expect(normalized?.outputSettings.outputMode).toBe('figma-native');
  });
});

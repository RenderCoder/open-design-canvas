import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { FileWorkspace } from './FileWorkspace';

describe('FileWorkspace upload input', () => {
  it('keeps the Design Files picker aligned with drag-and-drop file support', () => {
    const markup = renderToStaticMarkup(
      <FileWorkspace
        projectId="project-1"
        files={[]}
        onRefreshFiles={vi.fn()}
        isDeck={false}
        tabsState={{ tabs: [], active: null }}
        onTabsStateChange={vi.fn()}
      />,
    );

    expect(markup).toContain('data-testid="design-files-upload-input"');
    expect(markup).not.toContain('accept=');
  });

  it('marks a newly produced project file in Design Files', () => {
    const markup = renderToStaticMarkup(
      <FileWorkspace
        projectId="project-1"
        files={[
          {
            name: 'figma-20260503-142530-home-hero-refine.png',
            path: 'figma-20260503-142530-home-hero-refine.png',
            type: 'file',
            size: 1024,
            mtime: 1710000000,
            kind: 'image',
            mime: 'image/png',
          },
        ]}
        onRefreshFiles={vi.fn()}
        isDeck={false}
        highlightedFileName="figma-20260503-142530-home-hero-refine.png"
        tabsState={{ tabs: [], active: null }}
        onTabsStateChange={vi.fn()}
      />,
    );

    expect(markup).toContain('data-testid="design-file-row-figma-20260503-142530-home-hero-refine.png"');
    expect(markup).toContain('data-highlighted="true"');
    expect(markup).toContain('class="df-row  highlighted"');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import validFixture from '../artifacts/fixtures/figma-result-valid.json';
import { normalizeFigmaNativeResult } from '../artifacts/figma-result';
import type { ChatMessage } from '../types';
import { AssistantMessage } from './AssistantMessage';
import { FigmaResultCard, resultWarnings } from './FigmaResultCard';

describe('FigmaResultCard', () => {
  it('renders the mocked Figma result summary in the assistant flow', () => {
    const parsed = normalizeFigmaNativeResult(validFixture);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    const markup = renderToStaticMarkup(<FigmaResultCard result={parsed.result} />);

    expect(markup).toContain('Figma native result');
    expect(markup).toContain('AI Landing Exploration');
    expect(markup).toContain('Open Figma file');
    expect(markup).toContain('Landing / Desktop / 1440');
    expect(markup).toContain('Button / Primary - team library');
    expect(markup).toContain('color/bg/default');
    expect(markup).toContain('metadata');
    expect(markup).toContain('passed');
    expect(markup).toContain('Add mobile variant');
  });

  it('surfaces warnings for missing validation and primitive-only output', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'partial',
      fileKey: 'demo-file',
      hardcodedValues: ['#ff00ff'],
      checks: { metadata: 'skipped' },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(resultWarnings(parsed.result)).toEqual([
      '1 hardcoded value reported',
      'No component reuse reported',
      'Metadata check was not reported',
      'Screenshot check was not reported',
      'Variable/token check was not reported',
      'Text readability check was not reported',
      'Text overlap check was not reported',
      'Figma snapshot was not reported',
    ]);
  });

  it('surfaces text overlap repair status', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'partial',
      checks: {
        metadata: 'passed',
        screenshot: 'passed',
        variables: 'passed',
        textReadability: 'failed',
        textOverlap: 'failed',
      },
      reusedComponents: [{ name: 'Card' }],
      textOverlapCheck: {
        status: 'failed',
        repairAttempts: 2,
        remainingNodeIds: ['7:1', '7:2'],
      },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    expect(resultWarnings(parsed.result)).toContain('Text overlap repair attempts: 2');
    expect(resultWarnings(parsed.result)).toContain('2 text overlap issues remain');
  });

  it('surfaces Figma snapshot status and low-resolution warnings', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'partial',
      checks: {
        metadata: 'passed',
        screenshot: 'passed',
        variables: 'passed',
        textReadability: 'passed',
        textOverlap: 'passed',
      },
      reusedComponents: [{ name: 'Card' }],
      snapshot: {
        status: 'degraded',
        fileName: 'figma-20260503-142530-home-hero-refine.png',
        projectRelativePath: 'figma-20260503-142530-home-hero-refine.png',
        pixelWidth: 1200,
        pixelHeight: 900,
        scale: 1,
        expectedMinWidth: 2800,
        actualWidth: 1200,
        actualHeight: 900,
        qualityStatus: 'low_resolution',
        warnings: ['Snapshot below expected minimum width.'],
      },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    const markup = renderToStaticMarkup(<FigmaResultCard result={parsed.result} />);
    expect(markup).toContain('Snapshot');
    expect(markup).toContain('figma-20260503-142530-home-hero-refine.png');
    expect(markup).toContain('1200 x 900');
    expect(resultWarnings(parsed.result)).toContain('Figma snapshot was degraded below the preferred resolution');
    expect(resultWarnings(parsed.result)).toContain('Snapshot below expected minimum width.');
  });

  it('links reported Figma snapshots back to project Design Files', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'completed',
      checks: {
        metadata: 'passed',
        screenshot: 'passed',
        variables: 'passed',
        textReadability: 'passed',
        textOverlap: 'passed',
      },
      reusedComponents: [{ name: 'Card' }],
      snapshot: {
        status: 'passed',
        fileName: 'figma-20260503-142530-home-hero-refine.png',
        projectRelativePath: 'figma-20260503-142530-home-hero-refine.png',
        pixelWidth: 2800,
        pixelHeight: 1800,
        scale: 2,
        qualityStatus: 'high_resolution',
      },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    const markup = renderToStaticMarkup(
      <FigmaResultCard
        result={parsed.result}
        projectId="project-1"
        onRequestOpenFile={() => undefined}
      />,
    );

    expect(markup).toContain('Open snapshot');
    expect(markup).toContain('href="/api/projects/project-1/raw/figma-20260503-142530-home-hero-refine.png"');
    expect(markup).toContain('download="figma-20260503-142530-home-hero-refine.png"');
  });

  it('renders a figma_result event inside an assistant message', () => {
    const parsed = normalizeFigmaNativeResult(validFixture);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    const message: ChatMessage = {
      id: 'assistant-1',
      role: 'assistant',
      content: '',
      events: [{ kind: 'figma_result', result: parsed.result }],
    };

    const markup = renderToStaticMarkup(
      <AssistantMessage
        message={message}
        streaming={false}
        projectId={null}
      />,
    );

    expect(markup).toContain('class="figma-result-card"');
    expect(markup).toContain('Open Figma file');
    expect(markup).toContain('Landing / Desktop / 1440');
  });

  it('renders a mocked text overlap issue from a figma_result event', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'partial',
      fileUrl: 'https://www.figma.com/design/demo-file/Product',
      pageName: 'Readability repair',
      rootFrame: { name: 'Screen / Desktop', nodeId: '1:1' },
      reusedComponents: [{ name: 'Card' }],
      checks: {
        metadata: 'passed',
        screenshot: 'passed',
        variables: 'passed',
        textReadability: 'failed',
        textOverlap: 'failed',
      },
      textOverlapCheck: {
        status: 'failed',
        repairAttempts: 1,
        remainingNodeIds: ['2:1', '2:2'],
      },
      issues: [
        {
          severity: 'error',
          check: 'textOverlap',
          message: 'Visible title and subtitle overlap after the first repair attempt.',
          nodeIds: ['2:1', '2:2'],
        },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);

    const message: ChatMessage = {
      id: 'assistant-overlap',
      role: 'assistant',
      content: '',
      events: [{ kind: 'figma_result', result: parsed.result }],
    };

    const markup = renderToStaticMarkup(
      <AssistantMessage
        message={message}
        streaming={false}
        projectId={null}
      />,
    );

    expect(markup).toContain('Readability repair');
    expect(markup).toContain('text Readability');
    expect(markup).toContain('text Overlap');
    expect(markup).toContain('Text overlap repair attempts: 1');
    expect(markup).toContain('2 text overlap issues remain');
    expect(markup).toContain('Visible title and subtitle overlap after the first repair attempt.');
  });

});

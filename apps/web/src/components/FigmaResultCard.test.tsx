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
    ]);
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

});

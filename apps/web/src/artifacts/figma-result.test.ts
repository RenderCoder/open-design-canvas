import { describe, expect, it } from 'vitest';

import minimalFixture from './fixtures/figma-result-minimal.json';
import validFixture from './fixtures/figma-result-valid.json';
import {
  normalizeFigmaNativeResult,
  parseFigmaNativeResultText,
} from './figma-result';

describe('parseFigmaNativeResultText', () => {
  it('extracts a typed result from a fenced JSON envelope', () => {
    const parsed = parseFigmaNativeResultText(
      [
        'Canvas write complete.',
        '```json',
        JSON.stringify(validFixture),
        '```',
      ].join('\n'),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.result).toMatchObject({
      kind: 'figma_native_result',
      status: 'completed',
      fileKey: 'demo-file',
      pageName: 'AI Landing Exploration',
      rootFrames: [{ name: 'Landing / Desktop / 1440', nodeId: '1:2' }],
      reusedComponents: [{ name: 'Button / Primary' }],
      checks: { metadata: 'passed', screenshot: 'passed' },
      nextActions: ['Add mobile variant'],
    });
  });

  it('accepts minimal reports with optional fields absent', () => {
    const parsed = normalizeFigmaNativeResult(minimalFixture);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.result.rootFrames).toEqual([]);
    expect(parsed.result.reusedComponents).toEqual([]);
    expect(parsed.result.issues).toEqual([]);
    expect(parsed.result.checks).toEqual({ metadata: 'skipped' });
  });

  it('normalizes legacy directive field names', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'completed',
      rootFrame: { name: 'Dashboard', nodeId: '2:4' },
      variablesUsed: ['color/text/default'],
      stylesUsed: ['Text/Body'],
      knownIssues: ['Missing mobile state'],
      nextIteration: ['Create mobile frame'],
      checks: { semanticNames: 'passed' },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.result.rootFrames).toEqual([{ name: 'Dashboard', nodeId: '2:4' }]);
    expect(parsed.result.variables).toEqual(['color/text/default']);
    expect(parsed.result.styles).toEqual(['Text/Body']);
    expect(parsed.result.issues).toEqual([{ message: 'Missing mobile state' }]);
    expect(parsed.result.nextActions).toEqual(['Create mobile frame']);
  });

  it('preserves structured readability check results', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'partial',
      checks: { textReadability: 'failed', textOverlap: 'failed' },
      readabilityCheck: {
        status: 'failed',
        repairAttempts: 2,
        fixedNodeIds: ['1:2'],
        remainingNodeIds: ['1:3'],
        ignoredCount: 1,
        summary: 'One title/subtitle overlap remains after repair.',
      },
      textOverlapCheck: {
        status: 'failed',
        repairAttempts: 2,
        remainingNodeIds: ['1:3'],
      },
      issues: [
        {
          severity: 'error',
          check: 'textOverlap',
          message: 'Visible text nodes overlap beyond the readability threshold.',
          nodeIds: ['1:3', '1:4'],
        },
      ],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.result.readabilityCheck).toMatchObject({
      status: 'failed',
      repairAttempts: 2,
      fixedNodeIds: ['1:2'],
      remainingNodeIds: ['1:3'],
      ignoredCount: 1,
    });
    expect(parsed.result.textOverlapCheck).toMatchObject({
      status: 'failed',
      repairAttempts: 2,
      remainingNodeIds: ['1:3'],
    });
    expect(parsed.result.issues[0]).toMatchObject({
      check: 'textOverlap',
      nodeIds: ['1:3', '1:4'],
    });
  });

  it('preserves Figma snapshot result metadata', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'completed',
      checks: { metadata: 'passed' },
      snapshot: {
        status: 'passed',
        fileName: 'figma-20260503-142530-home-hero-refine.png',
        projectRelativePath: 'figma-20260503-142530-home-hero-refine.png',
        pixelWidth: 2880,
        pixelHeight: 1800,
        scale: 2,
        expectedMinWidth: 2800,
        actualWidth: 2880,
        actualHeight: 1800,
        qualityStatus: 'high_resolution',
        sourceFileKey: 'demo-file',
        sourceNodeId: '1:2',
        sourceNodeName: 'Home / Hero',
        capturedAt: '2026-05-03T14:25:30.000Z',
        purposeSlug: 'home-hero-refine',
        exportMethod: 'figma_mcp_export_async',
        warnings: [],
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.result.snapshot).toMatchObject({
      status: 'passed',
      fileName: 'figma-20260503-142530-home-hero-refine.png',
      pixelWidth: 2880,
      pixelHeight: 1800,
      expectedMinWidth: 2800,
      actualWidth: 2880,
      qualityStatus: 'high_resolution',
      purposeSlug: 'home-hero-refine',
    });
  });

  it('normalizes unknown snapshot statuses to skipped', () => {
    const parsed = normalizeFigmaNativeResult({
      kind: 'figma_native_result',
      status: 'partial',
      checks: {},
      snapshot: {
        status: 'unknown-future-status',
        qualityStatus: 'not-a-quality-status',
        warnings: ['Snapshot exporter did not run.'],
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.result.snapshot).toMatchObject({
      status: 'skipped',
      warnings: ['Snapshot exporter did not run.'],
    });
    expect(parsed.result.snapshot?.qualityStatus).toBeUndefined();
  });

  it('returns a safe error for malformed JSON envelopes', () => {
    const parsed = parseFigmaNativeResultText(
      '```figma_native_result\n{"kind":"figma_native_result","status":"completed"\n```',
    );

    expect(parsed).toEqual({
      ok: false,
      reason: 'malformed_json',
      error: 'Found a figma_native_result envelope, but its JSON could not be parsed.',
    });
  });

  it('returns not_found for ordinary assistant text', () => {
    expect(parseFigmaNativeResultText('No Figma result in this turn.')).toEqual({
      ok: false,
      reason: 'not_found',
      error: 'No figma_native_result envelope found.',
    });
  });
});

import { describe, expect, it } from 'vitest';

import type { ProjectMetadata } from '@open-design/contracts';
import {
  FIGMA_PREFLIGHT_BLOCKING_STEP_CODES,
  FIGMA_PREFLIGHT_STEP_DEFAULTS,
  FIGMA_PREFLIGHT_STEP_CODES,
  figmaPreflightFingerprint,
  figmaPreflightMessageKey,
  figmaTargetFingerprint,
  isFigmaPreflightBlockingStepCode,
  isFigmaPreflightStepCode,
  validateFigmaPreflightForTarget,
  type FigmaPreflightStepCode,
  type FigmaPreflightSummary,
} from '@open-design/contracts';

import failuresFixture from './fixtures/figma-preflight-failures.json';
import readyFixture from './fixtures/figma-preflight-ready.json';

const REQUIRED_CODES = [
  'codex_cli_unavailable',
  'figma_mcp_not_added',
  'figma_mcp_url_invalid',
  'auth_required',
  'user_cancelled',
  'target_url_invalid',
  'file_readable',
  'file_unreadable',
  'edit_permission_missing',
  'write_probe_passed',
  'write_probe_failed',
  'unknown_error',
] as const satisfies readonly FigmaPreflightStepCode[];

describe('Figma preflight contract', () => {
  it('defines explicit machine codes for the authorization state machine', () => {
    expect(FIGMA_PREFLIGHT_STEP_CODES).toEqual(
      expect.arrayContaining([...REQUIRED_CODES]),
    );
    expect(FIGMA_PREFLIGHT_BLOCKING_STEP_CODES).toEqual(
      expect.arrayContaining([
        'codex_cli_unavailable',
        'figma_mcp_not_added',
        'auth_required',
        'user_cancelled',
        'file_unreadable',
        'edit_permission_missing',
        'write_probe_failed',
      ]),
    );
    expect(isFigmaPreflightStepCode('write_probe_passed')).toBe(true);
    expect(isFigmaPreflightStepCode('oauth_token_expired')).toBe(false);
    expect(isFigmaPreflightBlockingStepCode('write_probe_failed')).toBe(true);
    expect(isFigmaPreflightBlockingStepCode('write_probe_passed')).toBe(false);
  });

  it('keeps message semantics separate from prose strings', () => {
    for (const code of FIGMA_PREFLIGHT_STEP_CODES) {
      expect(figmaPreflightMessageKey(code)).toBe(`figma.preflight.${code}`);
    }
  });

  it('allows project metadata to store the latest successful preflight summary', () => {
    const preflight = readyFixture as FigmaPreflightSummary;
    const metadata = {
      kind: 'other',
      figmaPreflight: preflight,
    } satisfies ProjectMetadata;

    expect(metadata.figmaPreflight.canGenerate).toBe(true);
    expect(metadata.figmaPreflight.overallStatus).toBe('ready');
    expect(metadata.figmaPreflight.steps.map((step) => step.code)).toContain(
      'write_probe_passed',
    );
  });

  it('covers the main failure paths with safe, UI-consumable details', () => {
    const failures = failuresFixture as FigmaPreflightSummary[];
    const codes = failures.flatMap((summary) => summary.steps.map((step) => step.code));

    expect(codes).toEqual(
      expect.arrayContaining([
        'codex_cli_unavailable',
        'figma_mcp_not_added',
        'figma_mcp_url_invalid',
        'auth_required',
        'user_cancelled',
        'target_url_invalid',
        'file_unreadable',
        'edit_permission_missing',
        'write_probe_failed',
        'unknown_error',
      ]),
    );
    expect(failures.every((summary) => summary.canGenerate === false)).toBe(true);
    expect(JSON.stringify(failures)).not.toMatch(/oauth|token|Bearer|access_token/i);
  });

  it('maps raw failure classifications to product statuses and actions', () => {
    expect(FIGMA_PREFLIGHT_STEP_DEFAULTS.user_cancelled).toEqual({
      overallStatus: 'auth_required',
      userAction: 'authorize_figma',
    });
    expect(FIGMA_PREFLIGHT_STEP_DEFAULTS.edit_permission_missing).toEqual({
      overallStatus: 'write_blocked',
      userAction: 'request_edit_access',
    });
    expect(FIGMA_PREFLIGHT_STEP_DEFAULTS.write_probe_passed).toEqual({
      overallStatus: 'ready',
      userAction: 'none',
    });
  });

  it('validates ready preflight against the exact Figma target fingerprint', () => {
    const preflight = readyFixture as FigmaPreflightSummary;
    const target = {
      mode: 'existing-file' as const,
      fileUrl: `https://figma.com/design/${preflight.target.fileKey}/Demo`,
      pageName: preflight.target.pageName,
    };

    expect(figmaTargetFingerprint(target)).toBe(figmaPreflightFingerprint(preflight));
    expect(validateFigmaPreflightForTarget(target, preflight)).toMatchObject({
      ok: true,
      reason: 'ready',
    });
    expect(
      validateFigmaPreflightForTarget(
        { ...target, fileUrl: 'https://figma.com/design/other/Demo?node-id=1-2' },
        preflight,
      ),
    ).toMatchObject({ ok: false, reason: 'target_mismatch' });
    expect(validateFigmaPreflightForTarget(target, undefined)).toMatchObject({
      ok: false,
      reason: 'missing_preflight',
    });
  });
});

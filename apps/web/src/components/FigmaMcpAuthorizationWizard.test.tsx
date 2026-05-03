import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { FigmaPreflightSummary, FigmaTarget } from '../types';
import { FigmaMcpAuthorizationWizard } from './FigmaMcpAuthorizationWizard';

const target: FigmaTarget = {
  mode: 'existing-file',
  fileUrl: 'https://figma.com/design/demo/Test?node-id=1-2',
  fileKey: 'demo',
  nodeId: '1:2',
};

function preflight(
  overrides: Partial<FigmaPreflightSummary>,
): FigmaPreflightSummary {
  return {
    kind: 'figma_preflight',
    overallStatus: 'ready',
    steps: [],
    target: {
      mode: 'existing-file',
      fileKeyRedacted: 'demo...',
      nodeId: '1:2',
    },
    lastCheckedAt: '2026-05-03T08:00:00.000Z',
    canGenerate: false,
    userAction: 'none',
    ...overrides,
  };
}

function render(summary?: FigmaPreflightSummary): string {
  return renderToStaticMarkup(
    <FigmaMcpAuthorizationWizard
      projectId="project-1"
      target={target}
      preflight={summary}
    />,
  );
}

describe('FigmaMcpAuthorizationWizard', () => {
  it('renders the success state with target and probe details', () => {
    const markup = render(preflight({
      canGenerate: true,
      steps: [
        { code: 'figma_mcp_available', status: 'passed', messageKey: 'figma.preflight.figma_mcp_available' },
        { code: 'file_readable', status: 'passed', messageKey: 'figma.preflight.file_readable' },
        { code: 'write_probe_passed', status: 'passed', messageKey: 'figma.preflight.write_probe_passed' },
      ],
      safeDetails: { probeNodeName: 'ODC MCP Write Probe' },
    }));

    expect(markup).toContain('Authorization and write check');
    expect(markup).toContain('Ready');
    expect(markup).toContain('Write probe passed on ODC MCP Write Probe.');
    expect(markup).toContain('Cleanup: delete only the ODC MCP Probe page');
    expect(markup).toContain('Check write permission');
    expect(markup).not.toContain('jsonl');
  });

  it('explains when Figma MCP is not configured', () => {
    const markup = render(preflight({
      overallStatus: 'not_configured',
      userAction: 'add_figma_mcp',
      steps: [
        { code: 'figma_mcp_not_added', status: 'failed', messageKey: 'figma.preflight.figma_mcp_not_added' },
      ],
    }));

    expect(markup).toContain('Needs check');
    expect(markup).toContain('Prepare setup');
    expect(markup).toContain('Figma MCP is not configured correctly');
  });

  it('renders the authorization action when login is required', () => {
    const markup = render(preflight({
      overallStatus: 'auth_required',
      userAction: 'authorize_figma',
      steps: [
        { code: 'figma_mcp_available', status: 'passed', messageKey: 'figma.preflight.figma_mcp_available' },
        { code: 'auth_required', status: 'failed', messageKey: 'figma.preflight.auth_required' },
      ],
    }));

    expect(markup).toContain('Authorize Figma');
    expect(markup).toContain('Figma needs authorization');
    expect(markup).toContain('I finished, recheck');
  });

  it('blocks generation when edit permission is missing', () => {
    const markup = render(preflight({
      overallStatus: 'write_blocked',
      userAction: 'request_edit_access',
      steps: [
        { code: 'file_readable', status: 'passed', messageKey: 'figma.preflight.file_readable' },
        { code: 'edit_permission_missing', status: 'failed', messageKey: 'figma.preflight.edit_permission_missing' },
      ],
    }));

    expect(markup).toContain('This account can read the file but cannot edit it');
    expect(markup).toContain('ODC MCP Write Probe');
    expect(markup).toContain('Check write permission');
    expect(markup).not.toContain('manual_command');
  });

  it('explains invalid target URLs before setup or OAuth actions', () => {
    const markup = render(preflight({
      overallStatus: 'target_invalid',
      userAction: 'choose_valid_target',
      steps: [
        { code: 'target_url_invalid', status: 'failed', messageKey: 'figma.preflight.target_url_invalid' },
      ],
      safeDetails: { errorClass: 'invalid_target', retryable: false },
    }));

    expect(markup).toContain('Choose a valid Figma file URL');
    expect(markup).toContain('File access');
    expect(markup).not.toContain('Authorize Figma');
    expect(markup).not.toContain('Prepare setup');
  });

  it('explains read-access blockers without asking for write probing first', () => {
    const markup = render(preflight({
      overallStatus: 'read_blocked',
      userAction: 'request_file_access',
      steps: [
        { code: 'figma_mcp_available', status: 'passed', messageKey: 'figma.preflight.figma_mcp_available' },
        { code: 'file_unreadable', status: 'failed', messageKey: 'figma.preflight.file_unreadable' },
      ],
    }));

    expect(markup).toContain('This account cannot read the target file');
    expect(markup).toContain('File access');
    expect(markup).toContain('Check write permission');
    expect(markup).not.toContain('Authorize Figma');
  });

  it('uses the same human authorization recovery for user-cancelled login', () => {
    const markup = render(preflight({
      overallStatus: 'auth_required',
      userAction: 'authorize_figma',
      steps: [
        { code: 'user_cancelled', status: 'failed', messageKey: 'figma.preflight.user_cancelled' },
      ],
      safeDetails: { errorClass: 'auth', retryable: true },
    }));

    expect(markup).toContain('Authorize Figma');
    expect(markup).toContain('Figma needs authorization');
    expect(markup).toContain('Developer details');
  });

  it('can render a future Electron external authorization action without exposing raw JSONL', () => {
    const markup = renderToStaticMarkup(
      <FigmaMcpAuthorizationWizard
        projectId="project-1"
        target={target}
        preflight={preflight({
          overallStatus: 'auth_required',
          userAction: 'authorize_figma',
        })}
        initialAction={{
          kind: 'start_mcp_login',
          status: 'needs_retry',
          canOpenExternal: true,
          url: 'https://mcp.figma.com/oauth/authorize?state=redacted',
          safeDetails: {
            reason: 'codex_mcp_login_external_url',
            retryAfterMs: 2000,
          },
        }}
      />,
    );

    expect(markup).toContain('Authorize Figma');
    expect(markup).toContain('Open authorization');
    expect(markup).toContain('https://mcp.figma.com/oauth/authorize?state=redacted');
    expect(markup).not.toContain('jsonl');
  });
});

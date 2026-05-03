import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
  runFigmaMcpSetupAction,
  runFigmaPreflight,
  type FigmaPreflightRunner,
} from '../src/figma-preflight.js';

class FakeRunner implements FigmaPreflightRunner {
  calls: Array<{ command: string; args: string[]; input?: string }> = [];

  constructor(private readonly handler: FigmaPreflightRunner['run']) {}

  async run(command: string, args: string[], input?: string, timeoutMs?: number) {
    this.calls.push(input === undefined ? { command, args } : { command, args, input });
    return this.handler(command, args, input, timeoutMs);
  }
}

function ok(stdout = '') {
  return { code: 0, stdout, stderr: '' };
}

function fail(stderr = 'failed') {
  return { code: 1, stdout: '', stderr };
}

const target = {
  mode: 'existing-file' as const,
  fileUrl: 'https://www.figma.com/design/abc123456789/Fig?node-id=1-2',
  editorType: 'design' as const,
};

describe('runFigmaPreflight', () => {
  it('reports missing Codex CLI without leaking raw output', async () => {
    const runner = new FakeRunner(async () => ({
      code: null,
      stdout: '',
      stderr: '',
      error: Object.assign(new Error('missing'), { code: 'ENOENT' }),
    }));

    const preflight = await runFigmaPreflight({ target, runner, now: fixedNow });

    assert.equal(preflight.overallStatus, 'not_configured');
    assert.equal(preflight.canGenerate, false);
    assert.equal(preflight.userAction, 'install_codex');
    assert.equal(preflight.steps[0]?.code, 'codex_cli_unavailable');
    assert.equal(preflight.safeDetails?.command, 'codex --version');
  });

  it('reports missing Figma MCP server with setup command', async () => {
    const runner = new FakeRunner(async (_command, args) => {
      if (args.includes('--version')) return ok('codex 1.0.0');
      return fail('server not found');
    });

    const preflight = await runFigmaPreflight({ target, runner, now: fixedNow });

    assert.equal(preflight.overallStatus, 'not_configured');
    assert.equal(preflight.userAction, 'add_figma_mcp');
    assert.equal(preflight.steps.at(-1)?.code, 'figma_mcp_not_added');
    assert.equal(
      preflight.safeDetails?.command,
      'codex mcp add figma --url https://mcp.figma.com/mcp',
    );
  });

  it('classifies bad MCP URLs without exposing full config', async () => {
    const runner = new FakeRunner(async (_command, args) => {
      if (args.includes('--version')) return ok('codex 1.0.0');
      if (args.includes('get')) {
        return ok(JSON.stringify({ enabled: true, url: 'https://example.invalid/mcp' }));
      }
      return ok('[]');
    });

    const preflight = await runFigmaPreflight({ target, runner, now: fixedNow });

    assert.equal(preflight.overallStatus, 'not_configured');
    assert.equal(preflight.userAction, 'fix_mcp_url');
    assert.equal(preflight.safeDetails?.actualMcpUrlHost, 'example.invalid');
    assert.equal(preflight.safeDetails?.expectedMcpUrl, 'https://mcp.figma.com/mcp');
  });

  it('requires OAuth when Codex reports unauthenticated MCP status', async () => {
    const runner = new FakeRunner(async (_command, args) => {
      if (args.includes('--version')) return ok('codex 1.0.0');
      if (args.includes('get')) {
        return ok(JSON.stringify({ enabled: true, type: 'streamable_http', url: 'https://mcp.figma.com/mcp' }));
      }
      return ok(JSON.stringify([{ name: 'figma', auth_status: 'unauthenticated' }]));
    });

    const preflight = await runFigmaPreflight({ target, runner, now: fixedNow });

    assert.equal(preflight.overallStatus, 'auth_required');
    assert.equal(preflight.userAction, 'authorize_figma');
    assert.equal(preflight.safeDetails?.command, 'codex mcp login figma');
  });

  it('rejects invalid existing-file targets before running Codex', async () => {
    const runner = configuredRunner();

    const preflight = await runFigmaPreflight({
      target: {
        mode: 'existing-file',
        fileUrl: 'not-a-figma-url',
        editorType: 'design',
      },
      runner,
      now: fixedNow,
    });

    assert.equal(preflight.overallStatus, 'target_invalid');
    assert.equal(preflight.canGenerate, false);
    assert.equal(preflight.userAction, 'choose_valid_target');
    assert.equal(preflight.steps.at(-1)?.code, 'target_url_invalid');
    assert.equal(preflight.safeDetails?.errorClass, 'invalid_target');
    assert.equal(runner.calls.length, 0);
  });

  it('passes read-only preflight but keeps generation blocked until write probe passes', async () => {
    const runner = configuredRunner();

    const preflight = await runFigmaPreflight({ target, runner, now: fixedNow });

    assert.equal(preflight.overallStatus, 'ready');
    assert.equal(preflight.canGenerate, false);
    assert.equal(preflight.steps.at(-1)?.code, 'file_readable');
    assert.ok(runner.calls.some((call) => call.input?.includes('get_metadata')));
  });

  it('classifies get_metadata read failures as file access blockers', async () => {
    const runner = configuredRunner('PASS write ok', 'FAIL file not found');

    const preflight = await runFigmaPreflight({
      target,
      runner,
      now: fixedNow,
    });

    assert.equal(preflight.overallStatus, 'read_blocked');
    assert.equal(preflight.canGenerate, false);
    assert.equal(preflight.userAction, 'request_file_access');
    assert.equal(preflight.steps.at(-1)?.code, 'file_unreadable');
    assert.equal(preflight.safeDetails?.errorClass, 'permission');
    assert.ok(runner.calls.some((call) => call.input?.includes('get_metadata')));
    assert.ok(!runner.calls.some((call) => call.input?.includes('ODC MCP Write Probe')));
  });

  it('passes write preflight and redacts URL details for UI display', async () => {
    const runner = configuredRunner();

    const preflight = await runFigmaPreflight({
      target,
      checkWriteAccess: true,
      runner,
      now: fixedNow,
    });

    assert.equal(preflight.overallStatus, 'ready');
    assert.equal(preflight.canGenerate, true);
    assert.equal(preflight.steps.at(-1)?.code, 'write_probe_passed');
    assert.equal(preflight.target.fileKey, 'abc123456789');
    assert.equal(preflight.target.fileKeyRedacted, 'abc1...6789');
    assert.equal(preflight.target.nodeId, '1:2');
    assert.equal(preflight.target.fileUrlRedacted, 'https://www.figma.com/design/abc1...6789');
    assert.equal(preflight.safeDetails?.probePageName, 'ODC MCP Probe');
    assert.equal(preflight.safeDetails?.probeNodeName, 'ODC MCP Write Probe');
    assert.match(preflight.safeDetails?.probeMarker ?? '', /Open Design Canvas write-permission probe/);
    assert.match(preflight.safeDetails?.probeCleanupInstruction ?? '', /Delete only/);
    assert.ok(runner.calls.some((call) => call.input?.includes('Reuse the existing page named "ODC MCP Probe"')));
    assert.ok(runner.calls.some((call) => call.input?.includes('Never modify, delete, or move user-created nodes')));
  });

  it('classifies use_figma edit failures as write permission blockers', async () => {
    const runner = configuredRunner('FAIL permission denied edit access');

    const preflight = await runFigmaPreflight({
      target,
      checkWriteAccess: true,
      runner,
      now: fixedNow,
    });

    assert.equal(preflight.overallStatus, 'write_blocked');
    assert.equal(preflight.canGenerate, false);
    assert.equal(preflight.userAction, 'request_edit_access');
    assert.equal(preflight.steps.at(-1)?.code, 'edit_permission_missing');
    assert.equal(preflight.safeDetails?.errorClass, 'permission');
    assert.equal(preflight.safeDetails?.probePageName, 'ODC MCP Probe');
    assert.equal(preflight.safeDetails?.probeNodeName, 'ODC MCP Write Probe');
    assert.match(preflight.safeDetails?.probeCleanupInstruction ?? '', /ODC MCP Probe/);
  });

  it('maps user-cancelled write probe to an authorization action', async () => {
    const runner = configuredRunner('FAIL user cancelled MCP tool call');

    const preflight = await runFigmaPreflight({
      target,
      checkWriteAccess: true,
      runner,
      now: fixedNow,
    });

    assert.equal(preflight.overallStatus, 'auth_required');
    assert.equal(preflight.userAction, 'authorize_figma');
    assert.equal(preflight.steps.at(-1)?.code, 'user_cancelled');
  });
});

describe('runFigmaMcpSetupAction', () => {
  it('prepares a safe MCP add command without running Codex', async () => {
    const runner = configuredRunner();

    const action = await runFigmaMcpSetupAction({
      action: 'prepare_mcp_setup',
      target,
      runner,
      now: fixedNow,
    });

    assert.equal(action.status, 'manual_command');
    assert.equal(action.canOpenExternal, false);
    assert.equal(action.command, 'codex mcp add figma --url https://mcp.figma.com/mcp');
    assert.equal(action.safeDetails?.reason, 'codex_mcp_add_requires_local_cli');
    assert.equal(runner.calls.length, 0);
  });

  it('returns manual login command because Codex has no OAuth URL flag', async () => {
    const runner = new FakeRunner(async (_command, args) => {
      if (args.includes('--version')) return ok('codex 1.0.0');
      if (args.includes('get')) {
        return ok(JSON.stringify({ enabled: true, type: 'streamable_http', url: 'https://mcp.figma.com/mcp' }));
      }
      return ok(JSON.stringify([{ name: 'figma', auth_status: 'unauthenticated' }]));
    });

    const action = await runFigmaMcpSetupAction({
      action: 'start_mcp_login',
      target,
      runner,
      now: fixedNow,
    });

    assert.equal(action.status, 'manual_command');
    assert.equal(action.canOpenExternal, false);
    assert.equal(action.command, 'codex mcp login figma');
    assert.equal(action.safeDetails?.reason, 'codex_mcp_login_is_interactive');
    assert.equal(action.preflight?.userAction, 'authorize_figma');
  });

  it('polls MCP status and returns ready after read access succeeds', async () => {
    const action = await runFigmaMcpSetupAction({
      action: 'poll_mcp_status',
      target,
      runner: configuredRunner(),
      now: fixedNow,
    });

    assert.equal(action.status, 'ready');
    assert.equal(action.preflight?.overallStatus, 'ready');
    assert.equal(action.safeDetails?.retryAfterMs, 2000);
  });
});

function configuredRunner(writeOutput = 'PASS write ok', readOutput = 'PASS read ok') {
  let execCalls = 0;
  return new FakeRunner(async (_command, args) => {
    if (args.includes('--version')) return ok('codex 1.0.0');
    if (args.includes('get')) {
      return ok(JSON.stringify({ enabled: true, type: 'streamable_http', url: 'https://mcp.figma.com/mcp' }));
    }
    if (args.includes('list')) {
      return ok(JSON.stringify([{ name: 'figma', auth_status: 'o_auth' }]));
    }
    execCalls += 1;
    return ok(execCalls === 1 ? readOutput : writeOutput);
  });
}

function fixedNow() {
  return new Date('2026-05-03T00:00:00.000Z');
}

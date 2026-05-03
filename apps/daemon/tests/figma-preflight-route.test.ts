import type http from 'node:http';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/agents.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/agents.js')>();
  return {
    ...actual,
    resolveAgentBin: (agentId: string) => (agentId === 'codex' ? process.execPath : actual.resolveAgentBin(agentId)),
  };
});

import { startServer } from '../src/server.js';

describe('/api/projects/:id/figma/preflight', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const started = await startServer({ port: 0, returnServer: true }) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('returns 404 for missing projects', async () => {
    const res = await fetch(`${baseUrl}/api/projects/missing/figma/preflight`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json() as { error?: { code?: string } };

    expect(res.status).toBe(404);
    expect(json.error?.code).toBe('PROJECT_NOT_FOUND');
  });

  it('persists a safe preflight summary on the project', async () => {
    const projectId = `figma-preflight-route-${randomUUID()}`;
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        name: 'Figma preflight route',
        skillId: 'figma-native-screen',
        metadata: {
          kind: 'other',
          figmaTarget: {
            mode: 'existing-file',
            fileUrl: 'not-a-figma-url',
          },
        },
      }),
    });
    expect(createRes.ok).toBe(true);

    const preflightRes = await fetch(`${baseUrl}/api/projects/${projectId}/figma/preflight`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        target: {
          mode: 'existing-file',
          fileUrl: 'not-a-figma-url',
        },
      }),
    });
    const preflightJson = await preflightRes.json() as {
      project?: { metadata?: { figmaPreflight?: { kind?: string; canGenerate?: boolean } } };
      preflight?: { kind?: string; canGenerate?: boolean };
    };

    expect(preflightRes.ok).toBe(true);
    expect(preflightJson.preflight).toMatchObject({
      kind: 'figma_preflight',
      canGenerate: false,
    });
    expect(preflightJson.project?.metadata?.figmaPreflight).toEqual(preflightJson.preflight);
  });

  it('returns a manual setup action for Web and Electron fallback paths', async () => {
    const projectId = `figma-mcp-action-${randomUUID()}`;
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        name: 'Figma MCP action route',
        skillId: 'figma-native-screen',
        metadata: { kind: 'other' },
      }),
    });
    expect(createRes.ok).toBe(true);

    const actionRes = await fetch(`${baseUrl}/api/projects/${projectId}/figma/mcp-action`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'prepare_mcp_setup' }),
    });
    const actionJson = await actionRes.json() as {
      action?: { status?: string; canOpenExternal?: boolean; command?: string };
    };

    expect(actionRes.ok).toBe(true);
    expect(actionJson.action).toMatchObject({
      status: 'manual_command',
      canOpenExternal: false,
      command: 'codex mcp add figma --url https://mcp.figma.com/mcp',
    });
  });

  it('blocks Figma-native runs without a write preflight', async () => {
    const projectId = `figma-run-blocked-${randomUUID()}`;
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        name: 'Blocked Figma run',
        skillId: 'figma-native-screen',
        metadata: {
          kind: 'other',
          figmaTarget: { mode: 'existing-file', fileKey: 'file-1' },
          figmaOutputSettings: { outputMode: 'figma-native' },
        },
      }),
    });
    expect(createRes.ok).toBe(true);

    const runRes = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        agentId: 'codex',
        message: 'Make a Figma screen',
        projectId,
        skillId: 'figma-native-screen',
      }),
    });
    const runJson = await runRes.json() as { runId?: string };
    expect(runRes.ok).toBe(true);
    expect(runJson.runId).toBeTruthy();

    const eventRes = await fetch(`${baseUrl}/api/runs/${runJson.runId}/events`);
    const text = await eventRes.text();

    expect(text).toContain('event: error');
    expect(text).toContain('VALIDATION_FAILED');
    expect(text).toContain('write permission check');
  });

  it('blocks Figma-native runs when the checked target is stale', async () => {
    const projectId = `figma-run-stale-${randomUUID()}`;
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        name: 'Stale Figma run',
        skillId: null,
        metadata: {
          kind: 'other',
          figmaTarget: { mode: 'existing-file', fileKey: 'file-2' },
          figmaOutputSettings: { outputMode: 'figma-native' },
          figmaPreflight: readyPreflight('file-1'),
        },
      }),
    });
    expect(createRes.ok).toBe(true);

    const runRes = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        agentId: 'codex',
        message: 'Make a Figma screen',
        projectId,
      }),
    });
    const runJson = await runRes.json() as { runId?: string };
    expect(runRes.ok).toBe(true);

    const eventRes = await fetch(`${baseUrl}/api/runs/${runJson.runId}/events`);
    const text = await eventRes.text();

    expect(text).toContain('event: error');
    expect(text).toContain('target changed');
  });

  it('allows the run to reach agent spawning when the Figma preflight matches', async () => {
    const projectId = `figma-run-ready-${randomUUID()}`;
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        name: 'Ready Figma run',
        skillId: null,
        metadata: {
          kind: 'other',
          figmaTarget: { mode: 'existing-file', fileKey: 'file-1' },
          figmaOutputSettings: { outputMode: 'figma-native' },
          figmaPreflight: readyPreflight('file-1'),
        },
      }),
    });
    expect(createRes.ok).toBe(true);

    const runRes = await fetch(`${baseUrl}/api/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        agentId: 'codex',
        message: 'Make a Figma screen',
        projectId,
      }),
    });
    const runJson = await runRes.json() as { runId?: string };
    expect(runRes.ok).toBe(true);

    const eventRes = await fetch(`${baseUrl}/api/runs/${runJson.runId}/events`);
    const text = await eventRes.text();

    expect(text).not.toContain('VALIDATION_FAILED');
    expect(text).toContain('event: start');
  });
});

function readyPreflight(fileKey: string) {
  return {
    kind: 'figma_preflight',
    overallStatus: 'ready',
    steps: [
      { code: 'write_probe_passed', status: 'passed', messageKey: 'figma.preflight.write_probe_passed' },
    ],
    target: { mode: 'existing-file', fileKey },
    lastCheckedAt: '2026-05-03T08:00:00.000Z',
    canGenerate: true,
    userAction: 'none',
  };
}

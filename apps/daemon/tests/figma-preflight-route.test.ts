import type http from 'node:http';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAppVersionInfo,
  fetchProjectFileText,
  runFigmaMcpSetupAction,
  runFigmaPreflight,
} from './registry';

describe('fetchAppVersionInfo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns version info from the daemon response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({
        version: { version: '1.2.3', channel: 'beta', packaged: true, platform: 'darwin', arch: 'arm64' },
      }), { status: 200 })),
    );

    await expect(fetchAppVersionInfo()).resolves.toEqual({
      version: '1.2.3',
      channel: 'beta',
      packaged: true,
      platform: 'darwin',
      arch: 'arm64',
    });
  });

  it('returns null when version info is unavailable or malformed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ version: { version: '1.2.3' } }), { status: 200 })),
    );

    await expect(fetchAppVersionInfo()).resolves.toBeNull();
  });
});

describe('fetchProjectFileText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('can bypass caches when fetching source text', async () => {
    const fetchMock = vi.fn(async () => new Response('<svg />', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchProjectFileText('project-1', 'diagram.svg', {
        cache: 'no-store',
        cacheBustKey: '1710000000-2',
      }),
    ).resolves.toBe('<svg />');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/project-1/raw/diagram.svg?cacheBust=1710000000-2',
      { cache: 'no-store' },
    );
  });

  it('logs HTTP failure context before returning null', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('missing', { status: 404, statusText: 'Not Found' })));

    await expect(fetchProjectFileText('project-1', 'missing.svg')).resolves.toBeNull();

    expect(warn).toHaveBeenCalledWith(
      '[fetchProjectFileText] failed:',
      expect.objectContaining({
        name: 'missing.svg',
        projectId: 'project-1',
        status: 404,
        statusText: 'Not Found',
        url: '/api/projects/project-1/raw/missing.svg',
      }),
    );
  });

  it('logs thrown fetch errors before returning null', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = new Error('network down');
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw error;
    }));

    await expect(fetchProjectFileText('project-1', 'diagram.svg')).resolves.toBeNull();

    expect(warn).toHaveBeenCalledWith(
      '[fetchProjectFileText] failed:',
      expect.objectContaining({
        error,
        name: 'diagram.svg',
        projectId: 'project-1',
        url: '/api/projects/project-1/raw/diagram.svg',
      }),
    );
  });
});

describe('Figma MCP project helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('posts preflight requests to the project-scoped daemon route', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      project: { id: 'project-1', name: 'Project 1' },
      preflight: { kind: 'figma_preflight', canGenerate: false },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(runFigmaPreflight('project-1', { checkWriteAccess: true })).resolves.toEqual({
      project: { id: 'project-1', name: 'Project 1' },
      preflight: { kind: 'figma_preflight', canGenerate: false },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-1/figma/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkWriteAccess: true }),
    });
  });

  it('posts setup actions to the project-scoped daemon route', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      project: { id: 'project-1', name: 'Project 1' },
      action: { kind: 'start_mcp_login', status: 'manual_command', command: 'codex mcp login figma' },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(runFigmaMcpSetupAction('project-1', { action: 'start_mcp_login' })).resolves.toEqual({
      project: { id: 'project-1', name: 'Project 1' },
      action: { kind: 'start_mcp_login', status: 'manual_command', command: 'codex mcp login figma' },
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-1/figma/mcp-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_mcp_login' }),
    });
  });
});

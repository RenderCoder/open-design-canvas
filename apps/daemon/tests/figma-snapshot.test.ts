import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  planFigmaSnapshotExport,
  readPngDimensions,
  saveFigmaSnapshotToProject,
  slugifyPurpose,
} from '../src/figma-snapshot.js';
import { listFiles, writeProjectFile } from '../src/projects.js';
import { startServer } from '../src/server.js';

describe('Figma snapshot export helpers', () => {
  it('plans a 1400px frame at 2x and guards against low-resolution output', () => {
    const plan = planFigmaSnapshotExport({ sourceWidth: 1400, sourceHeight: 900 });

    expect(plan).toMatchObject({
      scale: 2,
      expectedMinWidth: 2800,
      expectedMinHeight: 900,
      degraded: false,
      constraint: { type: 'SCALE', value: 2 },
    });
  });

  it('raises scale for small frames to preserve a useful minimum width', () => {
    const plan = planFigmaSnapshotExport({ sourceWidth: 700, sourceHeight: 500 });

    expect(plan.scale).toBe(4);
    expect(plan.expectedMinWidth).toBe(2800);
  });

  it('degrades oversized exports instead of exceeding the longest-edge cap', () => {
    const plan = planFigmaSnapshotExport({ sourceWidth: 6000, sourceHeight: 5000 });

    expect(plan.degraded).toBe(true);
    expect(plan.scale).toBeCloseTo(1.3653, 4);
    expect(plan.expectedMinWidth).toBe(6000);
    expect(plan.warnings[0]).toContain('longest edge');
  });

  it('reads PNG dimensions from the IHDR header', () => {
    expect(readPngDimensions(pngWithDimensions(2800, 1800))).toEqual({
      width: 2800,
      height: 1800,
    });
  });

  it('normalizes purpose text to a bounded ASCII slug', () => {
    expect(slugifyPurpose('Home Hero Refine / V2')).toBe('home-hero-refine-v2');
    expect(slugifyPurpose('!!!')).toBe('figma-snapshot');
  });
});

describe('saveFigmaSnapshotToProject', () => {
  it('saves a high-resolution PNG into the existing project file list', async () => {
    const projectsRoot = await mkdtemp(path.join(os.tmpdir(), 'od-figma-snapshot-'));
    const result = await saveFigmaSnapshotToProject({
      projectsRoot,
      projectId: 'project-a',
      request: {
        purpose: 'Home hero refine',
        capturedAt: '2026-05-03T14:25:30.000Z',
        sourceFileKey: 'demo-file',
        sourceNodeId: '1:2',
        sourceNodeName: 'Home / Hero',
        sourceWidth: 1400,
        sourceHeight: 900,
        pngBytes: pngWithDimensions(2800, 1800),
      },
    });

    expect(result.snapshot).toMatchObject({
      status: 'passed',
      qualityStatus: 'high_resolution',
      fileName: 'figma-20260503-142530-home-hero-refine.png',
      projectRelativePath: 'figma-20260503-142530-home-hero-refine.png',
      pixelWidth: 2800,
      pixelHeight: 1800,
      actualWidth: 2800,
      actualHeight: 1800,
      expectedMinWidth: 2800,
      scale: 2,
      sourceFileKey: 'demo-file',
      sourceNodeId: '1:2',
      sourceNodeName: 'Home / Hero',
    });
    expect(result.file).toMatchObject({
      name: 'figma-20260503-142530-home-hero-refine.png',
      kind: 'image',
      mime: 'image/png',
    });

    const files = await listFiles(projectsRoot, 'project-a');
    expect(files.map((file) => file.name)).toContain('figma-20260503-142530-home-hero-refine.png');
  });

  it('does not overwrite an existing snapshot filename', async () => {
    const projectsRoot = await mkdtemp(path.join(os.tmpdir(), 'od-figma-snapshot-'));
    await writeProjectFile(
      projectsRoot,
      'project-b',
      'figma-20260503-142530-home-hero-refine.png',
      pngWithDimensions(2800, 1800),
      { overwrite: false },
    );

    const result = await saveFigmaSnapshotToProject({
      projectsRoot,
      projectId: 'project-b',
      request: {
        purpose: 'Home hero refine',
        capturedAt: '2026-05-03T14:25:30.000Z',
        sourceWidth: 1400,
        sourceHeight: 900,
        pngBytes: pngWithDimensions(2800, 1800),
      },
    });

    expect(result.snapshot.fileName).toBe('figma-20260503-142530-home-hero-refine-2.png');
    const savedName = result.snapshot.fileName;
    if (!savedName) throw new Error('snapshot filename missing');
    const saved = await readFile(path.join(projectsRoot, 'project-b', savedName));
    expect(readPngDimensions(saved)).toEqual({ width: 2800, height: 1800 });
  });

  it('fails low-resolution PNGs without saving them as success', async () => {
    const projectsRoot = await mkdtemp(path.join(os.tmpdir(), 'od-figma-snapshot-'));

    const result = await saveFigmaSnapshotToProject({
      projectsRoot,
      projectId: 'project-c',
      request: {
        purpose: 'Tiny fallback',
        capturedAt: '2026-05-03T14:25:30.000Z',
        sourceWidth: 1400,
        sourceHeight: 900,
        pngBytes: pngWithDimensions(1200, 800),
      },
    });

    expect(result.file).toBeUndefined();
    expect(result.snapshot).toMatchObject({
      status: 'failed',
      qualityStatus: 'low_resolution',
      actualWidth: 1200,
      actualHeight: 800,
      expectedMinWidth: 2800,
    });
    expect(result.snapshot.error).toContain('minimum resolution');
    await expect(listFiles(projectsRoot, 'project-c')).resolves.toEqual([]);
  });
});

describe('/api/projects/:id/figma/snapshot', () => {
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

  it('accepts raw PNG export bytes and returns a Design Files entry', async () => {
    const projectId = `figma-snapshot-route-${randomUUID()}`;
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: projectId, name: 'Snapshot route' }),
    });
    expect(createRes.ok).toBe(true);

    const snapshotRes = await fetch(
      `${baseUrl}/api/projects/${projectId}/figma/snapshot?` +
        new URLSearchParams({
          purpose: 'Route snapshot',
          capturedAt: '2026-05-03T14:25:30.000Z',
          sourceWidth: '1400',
          sourceHeight: '900',
          sourceNodeId: '1:2',
        }),
      {
        method: 'POST',
        headers: { 'content-type': 'image/png' },
        body: pngWithDimensions(2800, 1800),
      },
    );
    const snapshotJson = await snapshotRes.json() as {
      snapshot?: { status?: string; fileName?: string; actualWidth?: number };
      file?: { name?: string; kind?: string; mime?: string };
      exportPlan?: { constraint?: { type?: string; value?: number } };
    };

    expect(snapshotRes.ok).toBe(true);
    expect(snapshotJson.snapshot).toMatchObject({
      status: 'passed',
      fileName: 'figma-20260503-142530-route-snapshot.png',
      actualWidth: 2800,
    });
    expect(snapshotJson.file).toMatchObject({
      name: 'figma-20260503-142530-route-snapshot.png',
      kind: 'image',
      mime: 'image/png',
    });
    expect(snapshotJson.exportPlan?.constraint).toEqual({ type: 'SCALE', value: 2 });

    const filesRes = await fetch(`${baseUrl}/api/projects/${projectId}/files`);
    const filesJson = await filesRes.json() as { files?: Array<{ name?: string }> };
    expect(filesJson.files?.map((file) => file.name)).toContain(
      'figma-20260503-142530-route-snapshot.png',
    );
  });

  it('returns 422 when exported bytes are below the resolution guard', async () => {
    const snapshotRes = await fetch(
      `${baseUrl}/api/projects/figma-snapshot-low-res/figma/snapshot?` +
        new URLSearchParams({
          purpose: 'Low res',
          capturedAt: '2026-05-03T14:25:30.000Z',
          sourceWidth: '1400',
          sourceHeight: '900',
        }),
      {
        method: 'POST',
        headers: { 'content-type': 'image/png' },
        body: pngWithDimensions(1024, 768),
      },
    );
    const json = await snapshotRes.json() as {
      snapshot?: { status?: string; qualityStatus?: string; error?: string };
    };

    expect(snapshotRes.status).toBe(422);
    expect(json.snapshot).toMatchObject({
      status: 'failed',
      qualityStatus: 'low_resolution',
    });
    expect(json.snapshot?.error).toContain('minimum resolution');
  });

  it('rejects non-PNG bytes before saving', async () => {
    const snapshotRes = await fetch(
      `${baseUrl}/api/projects/figma-snapshot-bad-png/figma/snapshot?` +
        new URLSearchParams({
          purpose: 'Bad PNG',
          sourceWidth: '1400',
          sourceHeight: '900',
        }),
      {
        method: 'POST',
        headers: { 'content-type': 'image/png' },
        body: Buffer.from('not a png'),
      },
    );
    const json = await snapshotRes.json() as { error?: { code?: string; message?: string } };

    expect(snapshotRes.status).toBe(400);
    expect(json.error).toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(json.error?.message).toContain('invalid PNG');
  });
});

function pngWithDimensions(width: number, height: number): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 4, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header[24] = 8;
  header[25] = 6;
  header[26] = 0;
  header[27] = 0;
  header[28] = 0;
  return header;
}

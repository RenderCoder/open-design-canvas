import type {
  FigmaSnapshotResult,
  ProjectFile,
  SaveFigmaSnapshotResponse,
} from '@open-design/contracts';

import { stat } from 'node:fs/promises';
import path from 'node:path';

import { sanitizeName, writeProjectFile } from './projects.js';

export interface FigmaSnapshotSource {
  sourceFileKey?: string;
  sourceNodeId?: string;
  sourceNodeName?: string;
  sourceWidth: number;
  sourceHeight: number;
}

export interface FigmaSnapshotRequest extends FigmaSnapshotSource {
  purpose?: string;
  capturedAt?: Date | string;
  pngBytes: Buffer | Uint8Array | string;
  pngEncoding?: 'base64' | 'binary';
}

export interface SaveFigmaSnapshotOptions {
  projectsRoot: string;
  projectId: string;
  request: FigmaSnapshotRequest;
}

export const DEFAULT_FIGMA_SNAPSHOT_SCALE = 2;
export const MIN_FIGMA_SNAPSHOT_WIDTH = 2800;
export const MAX_FIGMA_SNAPSHOT_LONGEST_EDGE = 8192;
export const MAX_FIGMA_SNAPSHOT_FILE_NAME_LENGTH = 96;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function saveFigmaSnapshotToProject({
  projectsRoot,
  projectId,
  request,
}: SaveFigmaSnapshotOptions): Promise<SaveFigmaSnapshotResponse> {
  const source = normalizeSource(request);
  const capturedAt = normalizeCapturedAt(request.capturedAt);
  const purposeSlug = slugifyPurpose(request.purpose ?? source.sourceNodeName ?? 'figma-snapshot');
  const exportPlan = planFigmaSnapshotExport(source);
  const fileName = await uniqueFigmaSnapshotFileName({
    projectsRoot,
    projectId,
    capturedAt,
    purposeSlug,
  });
  const png = decodePngBytes(request.pngBytes, request.pngEncoding);
  const dimensions = readPngDimensions(png);

  const warnings = [...exportPlan.warnings];
  const measuredTooSmall =
    dimensions.width < exportPlan.expectedMinWidth ||
    dimensions.height < exportPlan.expectedMinHeight;
  if (measuredTooSmall) {
    warnings.push(
      `Saved PNG ${dimensions.width}x${dimensions.height} is below expected minimum ` +
        `${exportPlan.expectedMinWidth}x${exportPlan.expectedMinHeight}.`,
    );
  }

  const snapshotBase: Omit<FigmaSnapshotResult, 'status' | 'qualityStatus'> = {
    fileName,
    projectRelativePath: fileName,
    pixelWidth: dimensions.width,
    pixelHeight: dimensions.height,
    scale: exportPlan.scale,
    expectedMinWidth: exportPlan.expectedMinWidth,
    actualWidth: dimensions.width,
    actualHeight: dimensions.height,
    sourceFileKey: source.sourceFileKey,
    sourceNodeId: source.sourceNodeId,
    sourceNodeName: source.sourceNodeName,
    capturedAt: capturedAt.toISOString(),
    purposeSlug,
    exportMethod: 'figma_mcp_export_async',
    warnings,
  };

  if (measuredTooSmall) {
    return {
      snapshot: {
        ...snapshotBase,
        status: 'failed',
        qualityStatus: 'low_resolution',
        error: 'Exported PNG did not meet the minimum resolution guard.',
      },
      exportPlan,
    };
  }

  const file = await writeProjectFile(projectsRoot, projectId, fileName, png, {
    overwrite: false,
  }) as ProjectFile;

  return {
    snapshot: {
      ...snapshotBase,
      status: exportPlan.degraded ? 'degraded' : 'passed',
      qualityStatus: exportPlan.degraded ? 'degraded' : 'high_resolution',
    },
    file,
    exportPlan,
  };
}

export function planFigmaSnapshotExport(source: FigmaSnapshotSource) {
  const normalized = normalizeSource(source);
  const desiredScale = Math.max(
    DEFAULT_FIGMA_SNAPSHOT_SCALE,
    MIN_FIGMA_SNAPSHOT_WIDTH / normalized.sourceWidth,
  );
  const desiredLongestEdge = Math.max(normalized.sourceWidth, normalized.sourceHeight) * desiredScale;
  const scale =
    desiredLongestEdge > MAX_FIGMA_SNAPSHOT_LONGEST_EDGE
      ? MAX_FIGMA_SNAPSHOT_LONGEST_EDGE / Math.max(normalized.sourceWidth, normalized.sourceHeight)
      : desiredScale;
  const degraded = scale < desiredScale;
  const warnings = degraded
    ? [
        `Snapshot export scale reduced from ${roundScale(desiredScale)}x to ${roundScale(scale)}x ` +
          `to keep the longest edge under ${MAX_FIGMA_SNAPSHOT_LONGEST_EDGE}px.`,
      ]
    : [];

  return {
    scale: roundScale(scale),
    desiredScale: roundScale(desiredScale),
    expectedMinWidth: Math.max(
      Math.ceil(normalized.sourceWidth),
      Math.min(MIN_FIGMA_SNAPSHOT_WIDTH, Math.floor(normalized.sourceWidth * scale)),
    ),
    expectedMinHeight: Math.ceil(normalized.sourceHeight),
    maxLongestEdge: MAX_FIGMA_SNAPSHOT_LONGEST_EDGE,
    constraint: {
      type: 'SCALE' as const,
      value: roundScale(scale),
    },
    degraded,
    warnings,
  };
}

export function readPngDimensions(bytes: Buffer | Uint8Array): { width: number; height: number } {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('invalid PNG: missing signature');
  }
  const chunkType = buf.subarray(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') {
    throw new Error('invalid PNG: missing IHDR chunk');
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('invalid PNG: bad dimensions');
  }
  return { width, height };
}

export function slugifyPurpose(raw: string): string {
  const slug = String(raw ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return slug || 'figma-snapshot';
}

export function formatFigmaSnapshotTimestamp(date: Date): string {
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export async function uniqueFigmaSnapshotFileName({
  projectsRoot,
  projectId,
  capturedAt,
  purposeSlug,
}: {
  projectsRoot: string;
  projectId: string;
  capturedAt: Date;
  purposeSlug: string;
}): Promise<string> {
  const stamp = formatFigmaSnapshotTimestamp(capturedAt);
  const safeSlug = slugifyPurpose(purposeSlug);
  const maxSlugLength = Math.max(
    1,
    MAX_FIGMA_SNAPSHOT_FILE_NAME_LENGTH - `figma-${stamp}-.png`.length,
  );
  const baseSlug = safeSlug.slice(0, maxSlugLength).replace(/-+$/g, '') || 'figma-snapshot';
  for (let index = 1; index < 1000; index += 1) {
    const suffix = index === 1 ? '' : `-${index}`;
    const candidateSlug = baseSlug
      .slice(0, Math.max(1, maxSlugLength - suffix.length))
      .replace(/-+$/g, '');
    const candidate = sanitizeName(`figma-${stamp}-${candidateSlug}${suffix}.png`);
    try {
      await stat(path.join(projectsRoot, projectId, candidate));
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return candidate;
      throw err;
    }
  }
  throw new Error('could not allocate a unique Figma snapshot filename');
}

function decodePngBytes(
  raw: Buffer | Uint8Array | string,
  encoding: 'base64' | 'binary' | undefined,
): Buffer {
  if (typeof raw === 'string') {
    return Buffer.from(raw, encoding === 'binary' ? 'binary' : 'base64');
  }
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
}

function normalizeCapturedAt(raw: Date | string | undefined): Date {
  if (raw instanceof Date && Number.isFinite(raw.valueOf())) return raw;
  if (typeof raw === 'string') {
    const date = new Date(raw);
    if (Number.isFinite(date.valueOf())) return date;
  }
  return new Date();
}

function normalizeSource(source: FigmaSnapshotSource): FigmaSnapshotSource {
  const sourceWidth = finitePositive(source.sourceWidth, 'sourceWidth');
  const sourceHeight = finitePositive(source.sourceHeight, 'sourceHeight');
  const normalized: FigmaSnapshotSource = {
    sourceWidth,
    sourceHeight,
  };
  const sourceFileKey = stringOrUndefined(source.sourceFileKey);
  const sourceNodeId = stringOrUndefined(source.sourceNodeId);
  const sourceNodeName = stringOrUndefined(source.sourceNodeName);
  if (sourceFileKey) normalized.sourceFileKey = sourceFileKey;
  if (sourceNodeId) normalized.sourceNodeId = sourceNodeId;
  if (sourceNodeName) normalized.sourceNodeName = sourceNodeName;
  return normalized;
}

function finitePositive(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return value;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function roundScale(value: number): number {
  return Number(value.toFixed(4));
}

import type {
  FigmaCheckStatus,
  FigmaNativeResult,
  FigmaResultComponentRef,
  FigmaResultIssue,
  FigmaResultMcpEvent,
  FigmaResultNodeRef,
  FigmaResultStatus,
} from '@open-design/contracts';

export type {
  FigmaCheckStatus,
  FigmaNativeResult,
  FigmaResultComponentRef,
  FigmaResultIssue,
  FigmaResultMcpEvent,
  FigmaResultNodeRef,
  FigmaResultStatus,
};

export type FigmaNativeResultParseResult =
  | { ok: true; result: FigmaNativeResult }
  | { ok: false; reason: 'not_found' | 'malformed_json' | 'invalid_result'; error: string };

const STATUS_VALUES = new Set(['completed', 'partial', 'blocked', 'failed']);
const CHECK_STATUS_VALUES = new Set(['passed', 'failed', 'skipped', 'unknown']);

const FENCED_BLOCK_RE = /```([A-Za-z0-9_-]+)?\s*\n([\s\S]*?)```/g;
const TAGGED_BLOCK_RE = /<figma_native_result\b[^>]*>([\s\S]*?)<\/figma_native_result>/i;
const DELIMITED_BLOCK_RE =
  /(?:FIGMA_NATIVE_RESULT|figma_native_result)\s*:\s*({[\s\S]*})/;

export function parseFigmaNativeResultText(raw: string): FigmaNativeResultParseResult {
  const candidates = extractCandidatePayloads(raw);
  if (candidates.length === 0) {
    return { ok: false, reason: 'not_found', error: 'No figma_native_result envelope found.' };
  }

  let sawMalformedJson = false;
  for (const candidate of candidates) {
    const parsed = parseJsonObject(candidate);
    if (parsed.kind === 'malformed') {
      sawMalformedJson = true;
      continue;
    }
    if (parsed.kind === 'not_object') continue;

    const normalized = normalizeFigmaNativeResult(parsed.value);
    if (normalized.ok) return normalized;
  }

  return sawMalformedJson
    ? {
        ok: false,
        reason: 'malformed_json',
        error: 'Found a figma_native_result envelope, but its JSON could not be parsed.',
      }
    : {
        ok: false,
        reason: 'invalid_result',
        error: 'Found JSON, but it was not a valid figma_native_result object.',
      };
}

export function normalizeFigmaNativeResult(value: unknown): FigmaNativeResultParseResult {
  if (!isRecord(value) || value.kind !== 'figma_native_result') {
    return {
      ok: false,
      reason: 'invalid_result',
      error: 'Figma result must be an object with kind "figma_native_result".',
    };
  }

  const status = typeof value.status === 'string' ? value.status : 'partial';
  if (!STATUS_VALUES.has(status)) {
    return {
      ok: false,
      reason: 'invalid_result',
      error: `Unsupported figma_native_result status "${status}".`,
    };
  }

  return {
    ok: true,
    result: {
      kind: 'figma_native_result',
      status: status as FigmaResultStatus,
      fileUrl: stringField(value.fileUrl),
      fileKey: stringField(value.fileKey),
      pageName: stringField(value.pageName),
      rootFrames: normalizeRootFrames(value),
      created: objectArray(value.created),
      updated: objectArray(value.updated),
      reusedComponents: objectArray(value.reusedComponents),
      variables: stringArray(value.variables ?? value.variablesUsed),
      styles: stringArray(value.styles ?? value.stylesUsed),
      hardcodedValues: Array.isArray(value.hardcodedValues) ? value.hardcodedValues : [],
      checks: checksRecord(value.checks),
      issues: issueArray(value.issues ?? value.knownIssues),
      nextActions: stringArray(value.nextActions ?? value.nextIteration),
      mcpEvents: objectArray(value.mcpEvents),
    },
  };
}

function extractCandidatePayloads(raw: string): string[] {
  const candidates: string[] = [];
  const trimmed = raw.trim();

  if (trimmed.startsWith('{') && trimmed.includes('"figma_native_result"')) {
    candidates.push(trimmed);
  }

  for (const match of raw.matchAll(FENCED_BLOCK_RE)) {
    const language = (match[1] ?? '').toLowerCase();
    const body = (match[2] ?? '').trim();
    if (
      language === 'figma_native_result' ||
      language === 'figma-native-result' ||
      body.includes('"figma_native_result"')
    ) {
      candidates.push(body);
    }
  }

  const tagged = raw.match(TAGGED_BLOCK_RE);
  if (tagged?.[1]) candidates.push(tagged[1].trim());

  const delimited = raw.match(DELIMITED_BLOCK_RE);
  if (delimited?.[1]) candidates.push(delimited[1].trim());

  return candidates;
}

function parseJsonObject(raw: string):
  | { kind: 'ok'; value: unknown }
  | { kind: 'malformed' }
  | { kind: 'not_object' } {
  try {
    const value = JSON.parse(raw);
    return isRecord(value) ? { kind: 'ok', value } : { kind: 'not_object' };
  } catch {
    return { kind: 'malformed' };
  }
}

function normalizeRootFrames(value: Record<string, unknown>): FigmaResultNodeRef[] {
  if (Array.isArray(value.rootFrames)) return objectArray(value.rootFrames);
  if (isRecord(value.rootFrame)) return [value.rootFrame];
  return [];
}

function checksRecord(value: unknown): Record<string, FigmaCheckStatus | string> {
  if (!isRecord(value)) return {};
  const out: Record<string, FigmaCheckStatus | string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== 'string') continue;
    out[key] = CHECK_STATUS_VALUES.has(raw) ? (raw as FigmaCheckStatus) : raw;
  }
  return out;
}

function issueArray(value: unknown): FigmaResultIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): FigmaResultIssue | null => {
      if (typeof item === 'string') return { message: item };
      if (!isRecord(item) || typeof item.message !== 'string') return null;
      return item as FigmaResultIssue;
    })
    .filter((item): item is FigmaResultIssue => item !== null);
}

function objectArray<T extends Record<string, unknown>>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord) as T[];
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

import {
  FIGMA_CANVAS_TEXT_LINT_RULES,
  FIGMA_TEXT_OVERLAP_IGNORE_MARKER,
  type FigmaCanvasTextBounds,
  type FigmaCanvasTextLintCode,
  type FigmaCanvasTextLintIssue,
  type FigmaCanvasTextLintResult,
  type FigmaCanvasTextRole,
} from '@open-design/contracts';

type FigmaCanvasTextNodeRef = {
  nodeId: string;
  name: string;
  role?: FigmaCanvasTextRole;
  textPreview?: string;
  bounds: FigmaCanvasTextBounds;
  fontSize?: number;
  lineHeightPx?: number;
  visible?: boolean;
  opacity?: number;
  ignored?: boolean;
};

export interface FigmaCanvasTextLintInputNode {
  type?: string;
  nodeId?: string;
  id?: string;
  name?: string;
  characters?: string;
  textPreview?: string;
  bounds?: Partial<FigmaCanvasTextBounds> | null;
  absoluteBounds?: Partial<FigmaCanvasTextBounds> | null;
  absoluteBoundingBox?: Partial<FigmaCanvasTextBounds> | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  lineHeightPx?: number;
  lineHeight?: number | { value?: number; unit?: string };
  visible?: boolean;
  opacity?: number;
  locked?: boolean;
  role?: FigmaCanvasTextRole;
  metadata?: {
    lintIgnore?: string[] | string;
    odLintIgnore?: string[] | string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const STRICT_TEXT_ROLES = new Set<FigmaCanvasTextRole>([
  'display',
  'title',
  'subtitle',
  'heading',
  'body',
]);

const MAX_TEXT_PREVIEW = 80;

export function lintFigmaCanvasTextReadability(
  nodes: FigmaCanvasTextLintInputNode[],
): FigmaCanvasTextLintResult {
  const textNodes = nodes.map(normalizeTextNode).filter((node): node is FigmaCanvasTextNodeRef => {
    return node !== null;
  });

  const issues: FigmaCanvasTextLintIssue[] = [];
  const warnings: FigmaCanvasTextLintIssue[] = [];
  const ignored: FigmaCanvasTextLintIssue[] = [];

  for (let i = 0; i < textNodes.length; i += 1) {
    const a = textNodes[i];
    if (!a) continue;
    for (let j = i + 1; j < textNodes.length; j += 1) {
      const b = textNodes[j];
      if (!b) continue;

      const overlap = intersectBounds(a.bounds, b.bounds);
      const hasIgnoredNode = a.ignored === true || b.ignored === true;

      if (overlap.area > 0) {
        const smallerArea = Math.min(area(a.bounds), area(b.bounds));
        const ratio = smallerArea > 0 ? overlap.area / smallerArea : 0;
        const threshold = overlapThreshold(a, b);
        if (ratio >= threshold) {
          const issue = makeIssue({
            code: hasIgnoredNode ? 'ignored-text-overlap' : 'text-text-overlap',
            severity: hasIgnoredNode ? 'info' : 'error',
            message: hasIgnoredNode
              ? 'Ignored text nodes overlap; reported for audit but not treated as a failure.'
              : 'Visible text nodes overlap beyond the readability threshold.',
            nodes: [a, b],
            overlapArea: overlap.area,
            overlapRatio: ratio,
            threshold,
          });
          if (hasIgnoredNode) ignored.push(issue);
          else issues.push(issue);
        }
        continue;
      }

      if (hasIgnoredNode) continue;

      const gap = verticalGap(a.bounds, b.bounds);
      if (gap === null) continue;

      const threshold = Math.max(lineHeight(a), lineHeight(b));
      if (gap < threshold) {
        warnings.push(
          makeIssue({
            code: 'text-too-close',
            severity: 'warning',
            message: 'Stacked text nodes are closer than the minimum line-height spacing.',
            nodes: [a, b],
            verticalGap: gap,
            threshold,
          }),
        );
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    ignored,
    nodeIds: textNodes.filter((node) => node.ignored !== true).map((node) => node.nodeId),
    summary: {
      checkedTextNodes: textNodes.filter((node) => node.ignored !== true).length,
      ignoredTextNodes: textNodes.filter((node) => node.ignored === true).length,
      issueCount: issues.length,
      warningCount: warnings.length,
      passed: issues.length === 0,
    },
  };
}

function normalizeTextNode(node: FigmaCanvasTextLintInputNode): FigmaCanvasTextNodeRef | null {
  if (node.type !== undefined && node.type !== 'TEXT') return null;
  const nodeId = stringField(node.nodeId) ?? stringField(node.id);
  if (!nodeId) return null;
  if (node.visible === false) return null;
  if (node.opacity !== undefined && node.opacity <= 0) return null;

  const bounds = normalizeBounds(
    node.bounds ??
      node.absoluteBounds ??
      node.absoluteBoundingBox ?? {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
      },
  );
  if (!bounds) return null;

  const normalized: FigmaCanvasTextNodeRef = {
    nodeId,
    name: stringField(node.name) ?? nodeId,
    role: normalizeRole(node.role, node.name),
    bounds,
    ignored: isIgnored(node),
  };
  const textPreview = previewText(node.textPreview ?? node.characters);
  const fontSize = positiveNumber(node.fontSize);
  const lineHeightPx = normalizeLineHeight(node.lineHeightPx ?? node.lineHeight, node.fontSize);
  if (textPreview !== undefined) normalized.textPreview = textPreview;
  if (fontSize !== undefined) normalized.fontSize = fontSize;
  if (lineHeightPx !== undefined) normalized.lineHeightPx = lineHeightPx;
  if (node.visible !== undefined) normalized.visible = node.visible;
  if (node.opacity !== undefined) normalized.opacity = node.opacity;
  return normalized;
}

function normalizeBounds(value: unknown): FigmaCanvasTextBounds | null {
  if (!isRecord(value)) return null;
  const x = finiteNumber(value.x);
  const y = finiteNumber(value.y);
  const width = positiveNumber(value.width);
  const height = positiveNumber(value.height);
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return null;
  }
  return { x, y, width, height };
}

function normalizeLineHeight(
  value: FigmaCanvasTextLintInputNode['lineHeightPx'] | FigmaCanvasTextLintInputNode['lineHeight'],
  fontSize: unknown,
): number | undefined {
  if (typeof value === 'number') return positiveNumber(value);
  if (isRecord(value) && value.unit === 'PIXELS') return positiveNumber(value.value);
  return positiveNumber(fontSize);
}

function normalizeRole(
  role: FigmaCanvasTextRole | undefined,
  name: string | undefined,
): FigmaCanvasTextRole {
  if (role && isTextRole(role)) return role;
  const lower = name?.toLowerCase() ?? '';
  if (/\b(display|hero|h1)\b/.test(lower)) return 'display';
  if (/\b(title|headline)\b/.test(lower)) return 'title';
  if (/\b(subtitle|subhead|dek)\b/.test(lower)) return 'subtitle';
  if (/\b(heading|section)\b/.test(lower)) return 'heading';
  if (/\b(body|paragraph|copy)\b/.test(lower)) return 'body';
  if (/\b(caption|eyebrow)\b/.test(lower)) return 'caption';
  if (/\b(label|button|nav)\b/.test(lower)) return 'label';
  return 'unknown';
}

function isTextRole(value: string): value is FigmaCanvasTextRole {
  return [
    'display',
    'title',
    'subtitle',
    'heading',
    'body',
    'caption',
    'label',
    'unknown',
  ].includes(value);
}

function isIgnored(node: FigmaCanvasTextLintInputNode): boolean {
  if (node.name?.includes(FIGMA_TEXT_OVERLAP_IGNORE_MARKER)) return true;
  const markers = [
    node.metadata?.lintIgnore,
    node.metadata?.odLintIgnore,
    node['lintIgnore'],
    node['odLintIgnore'],
  ];
  return markers.some((marker) => markerContains(marker, FIGMA_TEXT_OVERLAP_IGNORE_MARKER));
}

function markerContains(marker: unknown, value: string): boolean {
  if (typeof marker === 'string') return marker.split(/[,\s]+/).includes(value);
  if (Array.isArray(marker)) return marker.includes(value);
  return false;
}

function intersectBounds(a: FigmaCanvasTextBounds, b: FigmaCanvasTextBounds): { area: number } {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - left;
  const height = bottom - top;
  return { area: width > 0 && height > 0 ? width * height : 0 };
}

function verticalGap(a: FigmaCanvasTextBounds, b: FigmaCanvasTextBounds): number | null {
  const horizontalOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  if (horizontalOverlap <= 0) return null;
  if (a.y + a.height <= b.y) return b.y - (a.y + a.height);
  if (b.y + b.height <= a.y) return a.y - (b.y + b.height);
  return null;
}

function overlapThreshold(a: FigmaCanvasTextNodeRef, b: FigmaCanvasTextNodeRef): number {
  if (STRICT_TEXT_ROLES.has(a.role ?? 'unknown') && STRICT_TEXT_ROLES.has(b.role ?? 'unknown')) {
    return FIGMA_CANVAS_TEXT_LINT_RULES.strictHierarchyOverlapAreaRatioThreshold;
  }
  return FIGMA_CANVAS_TEXT_LINT_RULES.overlapAreaRatioThreshold;
}

function lineHeight(node: FigmaCanvasTextNodeRef): number {
  return (
    node.lineHeightPx ??
    node.fontSize ??
    16
  ) * FIGMA_CANVAS_TEXT_LINT_RULES.tooCloseLineHeightRatio;
}

function area(bounds: FigmaCanvasTextBounds): number {
  return bounds.width * bounds.height;
}

function makeIssue(input: {
  code: FigmaCanvasTextLintCode;
  severity: FigmaCanvasTextLintIssue['severity'];
  message: string;
  nodes: [FigmaCanvasTextNodeRef, FigmaCanvasTextNodeRef];
  overlapArea?: number;
  overlapRatio?: number;
  verticalGap?: number;
  threshold: number;
}): FigmaCanvasTextLintIssue {
  const [a, b] = input.nodes;
  const issue: FigmaCanvasTextLintIssue = {
    code: input.code,
    severity: input.severity,
    message: `${input.message} (${describeNode(a)} / ${describeNode(b)})`,
    nodeIds: [a.nodeId, b.nodeId],
    threshold: input.threshold,
  };
  if (input.overlapArea !== undefined) issue.overlapArea = input.overlapArea;
  if (input.overlapRatio !== undefined) issue.overlapRatio = input.overlapRatio;
  if (input.verticalGap !== undefined) issue.verticalGap = input.verticalGap;
  return issue;
}

function describeNode(node: FigmaCanvasTextNodeRef): string {
  const preview = node.textPreview ? ` "${node.textPreview}"` : '';
  return `${node.name}${preview}`;
}

function previewText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return undefined;
  return normalized.length > MAX_TEXT_PREVIEW
    ? `${normalized.slice(0, MAX_TEXT_PREVIEW - 3)}...`
    : normalized;
}

function positiveNumber(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

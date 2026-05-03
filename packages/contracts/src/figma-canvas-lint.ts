export const FIGMA_TEXT_OVERLAP_IGNORE_MARKER = 'od-lint-ignore:text-overlap';

export const FIGMA_TEXT_READABILITY_CHECK_KEY = 'textReadability';
export const FIGMA_TEXT_OVERLAP_CHECK_KEY = 'textOverlap';

export type FigmaCanvasLintSeverity = 'error' | 'warning' | 'info';

export type FigmaCanvasTextRole =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'heading'
  | 'body'
  | 'caption'
  | 'label'
  | 'unknown';

export type FigmaCanvasTextLintCode =
  | 'text-text-overlap'
  | 'text-too-close'
  | 'ignored-text-overlap';

export interface FigmaCanvasTextBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaCanvasTextNodeRef {
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
}

export interface FigmaCanvasTextLintIssue {
  code: FigmaCanvasTextLintCode;
  severity: FigmaCanvasLintSeverity;
  message: string;
  nodeIds: string[];
  overlapArea?: number;
  overlapRatio?: number;
  verticalGap?: number;
  threshold?: number;
}

export interface FigmaCanvasTextLintRules {
  overlapAreaRatioThreshold: number;
  strictHierarchyOverlapAreaRatioThreshold: number;
  tooCloseLineHeightRatio: number;
  ignoreMarker: typeof FIGMA_TEXT_OVERLAP_IGNORE_MARKER;
  allowedNonTextOverlap: true;
}

export interface FigmaCanvasTextLintSummary {
  checkedTextNodes: number;
  ignoredTextNodes: number;
  issueCount: number;
  warningCount: number;
  passed: boolean;
}

export interface FigmaCanvasTextLintResult {
  passed: boolean;
  issues: FigmaCanvasTextLintIssue[];
  warnings: FigmaCanvasTextLintIssue[];
  ignored: FigmaCanvasTextLintIssue[];
  nodeIds: string[];
  summary: FigmaCanvasTextLintSummary;
}

export const FIGMA_CANVAS_TEXT_LINT_RULES: FigmaCanvasTextLintRules = {
  overlapAreaRatioThreshold: 0.03,
  strictHierarchyOverlapAreaRatioThreshold: 0.02,
  tooCloseLineHeightRatio: 1,
  ignoreMarker: FIGMA_TEXT_OVERLAP_IGNORE_MARKER,
  allowedNonTextOverlap: true,
};

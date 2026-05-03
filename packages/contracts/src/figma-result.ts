export type FigmaResultStatus = 'completed' | 'partial' | 'blocked' | 'failed';

export type FigmaCheckStatus = 'passed' | 'failed' | 'skipped' | 'unknown';

export interface FigmaResultNodeRef {
  type?: string;
  name?: string;
  nodeId?: string;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export interface FigmaResultComponentRef {
  name?: string;
  source?: string;
  key?: string;
  nodeId?: string;
  [key: string]: unknown;
}

export interface FigmaResultIssue {
  severity?: 'info' | 'warning' | 'error';
  message: string;
  nodeId?: string;
  nodeIds?: string[];
  check?: string;
  [key: string]: unknown;
}

export interface FigmaResultMcpEvent {
  server?: string;
  tool?: string;
  status?: string;
  nodeId?: string;
  [key: string]: unknown;
}

export interface FigmaReadabilityCheckResult {
  status: FigmaCheckStatus;
  repairAttempts?: number;
  fixedNodeIds?: string[];
  remainingNodeIds?: string[];
  ignoredCount?: number;
  summary?: string;
  [key: string]: unknown;
}

export type FigmaSnapshotStatus = 'passed' | 'degraded' | 'failed' | 'skipped';

export type FigmaSnapshotQualityStatus =
  | 'high_resolution'
  | 'degraded'
  | 'low_resolution'
  | 'failed'
  | 'skipped';

export interface FigmaSnapshotResult {
  status: FigmaSnapshotStatus;
  fileName?: string;
  projectRelativePath?: string;
  pixelWidth?: number;
  pixelHeight?: number;
  scale?: number;
  expectedMinWidth?: number;
  actualWidth?: number;
  actualHeight?: number;
  qualityStatus?: FigmaSnapshotQualityStatus;
  sourceFileKey?: string;
  sourceNodeId?: string;
  sourceNodeName?: string;
  capturedAt?: string;
  purposeSlug?: string;
  exportMethod?: 'figma_mcp_export_async' | 'figma_mcp_screenshot_fallback' | 'manual' | string;
  warnings?: string[];
  error?: string;
  [key: string]: unknown;
}

export interface FigmaNativeResult {
  kind: 'figma_native_result';
  status: FigmaResultStatus;
  fileUrl?: string;
  fileKey?: string;
  pageName?: string;
  rootFrames: FigmaResultNodeRef[];
  created: FigmaResultNodeRef[];
  updated: FigmaResultNodeRef[];
  reusedComponents: FigmaResultComponentRef[];
  variables: string[];
  styles: string[];
  hardcodedValues: unknown[];
  checks: Record<string, FigmaCheckStatus | string>;
  readabilityCheck?: FigmaReadabilityCheckResult;
  textOverlapCheck?: FigmaReadabilityCheckResult;
  snapshot?: FigmaSnapshotResult;
  issues: FigmaResultIssue[];
  nextActions: string[];
  mcpEvents: FigmaResultMcpEvent[];
}

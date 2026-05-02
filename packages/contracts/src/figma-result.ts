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
  issues: FigmaResultIssue[];
  nextActions: string[];
  mcpEvents: FigmaResultMcpEvent[];
}

import type { FigmaTarget } from './api/projects';

export const FIGMA_PREFLIGHT_STEP_CODES = [
  'codex_cli_unavailable',
  'figma_mcp_not_added',
  'figma_mcp_url_invalid',
  'figma_mcp_available',
  'auth_required',
  'user_cancelled',
  'target_url_invalid',
  'file_readable',
  'file_unreadable',
  'edit_permission_missing',
  'write_probe_passed',
  'write_probe_failed',
  'unknown_error',
] as const;

export type FigmaPreflightStepCode = (typeof FIGMA_PREFLIGHT_STEP_CODES)[number];

export const FIGMA_PREFLIGHT_OVERALL_STATUSES = [
  'not_configured',
  'auth_required',
  'target_invalid',
  'read_blocked',
  'write_blocked',
  'ready',
  'failed',
] as const;

export type FigmaPreflightOverallStatus =
  (typeof FIGMA_PREFLIGHT_OVERALL_STATUSES)[number];

export type FigmaPreflightStepStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped';

export type FigmaPreflightUserAction =
  | 'install_codex'
  | 'add_figma_mcp'
  | 'fix_mcp_url'
  | 'authorize_figma'
  | 'choose_valid_target'
  | 'request_file_access'
  | 'request_edit_access'
  | 'retry'
  | 'none';

export type FigmaPreflightMessageKey =
  `figma.preflight.${FigmaPreflightStepCode}`;

export interface FigmaPreflightSafeDetails {
  command?: string;
  docsUrl?: string;
  expectedMcpUrl?: string;
  actualMcpUrlHost?: string;
  fileKey?: string;
  fileKeyRedacted?: string;
  nodeId?: string;
  pageName?: string;
  probeNodeName?: string;
  errorClass?: 'auth' | 'permission' | 'network' | 'invalid_target' | 'unknown';
  retryable?: boolean;
}

export interface FigmaPreflightTargetSummary {
  mode: FigmaTarget['mode'];
  editorType?: FigmaTarget['editorType'];
  fileUrlRedacted?: string;
  fileKey?: string;
  fileKeyRedacted?: string;
  nodeId?: string;
  pageName?: string;
  rootFrameName?: string;
  planKey?: string;
}

export interface FigmaPreflightStep {
  code: FigmaPreflightStepCode;
  status: FigmaPreflightStepStatus;
  messageKey: FigmaPreflightMessageKey;
  userAction?: FigmaPreflightUserAction;
  safeDetails?: FigmaPreflightSafeDetails;
  checkedAt?: string;
}

export interface FigmaPreflightSummary {
  kind: 'figma_preflight';
  overallStatus: FigmaPreflightOverallStatus;
  steps: FigmaPreflightStep[];
  target: FigmaPreflightTargetSummary;
  lastCheckedAt: string;
  canGenerate: boolean;
  userAction: FigmaPreflightUserAction;
  safeDetails?: FigmaPreflightSafeDetails;
}

export interface FigmaPreflightResponse {
  preflight: FigmaPreflightSummary;
}

export const FIGMA_PREFLIGHT_STEP_MESSAGE_KEYS = Object.fromEntries(
  FIGMA_PREFLIGHT_STEP_CODES.map((code) => [code, `figma.preflight.${code}`]),
) as { [Code in FigmaPreflightStepCode]: `figma.preflight.${Code}` };

export const FIGMA_PREFLIGHT_BLOCKING_STEP_CODES = [
  'codex_cli_unavailable',
  'figma_mcp_not_added',
  'figma_mcp_url_invalid',
  'auth_required',
  'user_cancelled',
  'target_url_invalid',
  'file_unreadable',
  'edit_permission_missing',
  'write_probe_failed',
  'unknown_error',
] as const satisfies readonly FigmaPreflightStepCode[];

export const FIGMA_PREFLIGHT_STEP_DEFAULTS = {
  codex_cli_unavailable: {
    overallStatus: 'not_configured',
    userAction: 'install_codex',
  },
  figma_mcp_not_added: {
    overallStatus: 'not_configured',
    userAction: 'add_figma_mcp',
  },
  figma_mcp_url_invalid: {
    overallStatus: 'not_configured',
    userAction: 'fix_mcp_url',
  },
  figma_mcp_available: {
    overallStatus: 'ready',
    userAction: 'none',
  },
  auth_required: {
    overallStatus: 'auth_required',
    userAction: 'authorize_figma',
  },
  user_cancelled: {
    overallStatus: 'auth_required',
    userAction: 'authorize_figma',
  },
  target_url_invalid: {
    overallStatus: 'target_invalid',
    userAction: 'choose_valid_target',
  },
  file_readable: {
    overallStatus: 'ready',
    userAction: 'none',
  },
  file_unreadable: {
    overallStatus: 'read_blocked',
    userAction: 'request_file_access',
  },
  edit_permission_missing: {
    overallStatus: 'write_blocked',
    userAction: 'request_edit_access',
  },
  write_probe_passed: {
    overallStatus: 'ready',
    userAction: 'none',
  },
  write_probe_failed: {
    overallStatus: 'write_blocked',
    userAction: 'retry',
  },
  unknown_error: {
    overallStatus: 'failed',
    userAction: 'retry',
  },
} as const satisfies {
  [Code in FigmaPreflightStepCode]: {
    overallStatus: FigmaPreflightOverallStatus;
    userAction: FigmaPreflightUserAction;
  };
};

export function figmaPreflightMessageKey(
  code: FigmaPreflightStepCode,
): FigmaPreflightMessageKey {
  return FIGMA_PREFLIGHT_STEP_MESSAGE_KEYS[code];
}

export function isFigmaPreflightStepCode(
  value: string,
): value is FigmaPreflightStepCode {
  return FIGMA_PREFLIGHT_STEP_CODES.includes(value as FigmaPreflightStepCode);
}

export function isFigmaPreflightBlockingStepCode(
  value: FigmaPreflightStepCode,
): boolean {
  return (FIGMA_PREFLIGHT_BLOCKING_STEP_CODES as readonly FigmaPreflightStepCode[])
    .includes(value);
}

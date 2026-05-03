import { spawn } from 'node:child_process';

const EXPECTED_FIGMA_MCP_URL = 'https://mcp.figma.com/mcp';
const DEFAULT_FIGMA_MCP_SERVER = 'figma';
const COMMAND_TIMEOUT_MS = 20_000;
const WRITE_PROBE_TIMEOUT_MS = 90_000;
const WRITE_PROBE_PAGE_NAME = 'ODC MCP Probe';
const WRITE_PROBE_FRAME_NAME = 'ODC MCP Write Probe';
const WRITE_PROBE_MARKER =
  'Open Design Canvas write-permission probe. Safe to delete this page/frame if no check is running.';
const WRITE_PROBE_CLEANUP =
  'Delete only the Figma page named "ODC MCP Probe" or the frame named "ODC MCP Write Probe"; do not delete user-created canvas nodes.';
const FIGMA_DESIGN_URL_RE =
  /^https:\/\/(?:www\.)?figma\.com\/(?:design|file|board)\/([^/?#]+)(?:[/?#]|$)/i;

interface CommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
  error?: NodeJS.ErrnoException;
  timedOut?: boolean;
}

type FigmaTargetMode = 'existing-file' | 'existing-selection' | 'new-file';
type FigmaEditorType = 'design' | 'figjam';

export interface FigmaTarget {
  mode: FigmaTargetMode;
  fileUrl?: string | undefined;
  fileKey?: string | undefined;
  nodeId?: string | undefined;
  pageName?: string | undefined;
  rootFrameName?: string | undefined;
  planKey?: string | undefined;
  editorType?: FigmaEditorType | undefined;
}

type FigmaPreflightStepCode =
  | 'codex_cli_unavailable'
  | 'figma_mcp_not_added'
  | 'figma_mcp_url_invalid'
  | 'figma_mcp_available'
  | 'auth_required'
  | 'user_cancelled'
  | 'target_url_invalid'
  | 'file_readable'
  | 'file_unreadable'
  | 'edit_permission_missing'
  | 'write_probe_passed'
  | 'write_probe_failed'
  | 'unknown_error';

type FigmaPreflightOverallStatus =
  | 'not_configured'
  | 'auth_required'
  | 'target_invalid'
  | 'read_blocked'
  | 'write_blocked'
  | 'ready'
  | 'failed';

type FigmaPreflightUserAction =
  | 'install_codex'
  | 'add_figma_mcp'
  | 'fix_mcp_url'
  | 'authorize_figma'
  | 'choose_valid_target'
  | 'request_file_access'
  | 'request_edit_access'
  | 'retry'
  | 'none';

type FigmaPreflightStepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

interface FigmaPreflightSafeDetails {
  command?: string | undefined;
  docsUrl?: string | undefined;
  expectedMcpUrl?: string | undefined;
  actualMcpUrlHost?: string | undefined;
  fileKey?: string | undefined;
  fileKeyRedacted?: string | undefined;
  nodeId?: string | undefined;
  pageName?: string | undefined;
  probePageName?: string | undefined;
  probeNodeName?: string | undefined;
  probeMarker?: string | undefined;
  probeCleanupInstruction?: string | undefined;
  errorClass?: 'auth' | 'permission' | 'network' | 'invalid_target' | 'unknown' | undefined;
  retryable?: boolean | undefined;
}

interface FigmaPreflightStep {
  code: FigmaPreflightStepCode;
  status: FigmaPreflightStepStatus;
  messageKey: `figma.preflight.${FigmaPreflightStepCode}`;
  userAction?: FigmaPreflightUserAction | undefined;
  safeDetails?: FigmaPreflightSafeDetails | undefined;
  checkedAt?: string | undefined;
}

export interface FigmaPreflightSummary {
  kind: 'figma_preflight';
  overallStatus: FigmaPreflightOverallStatus;
  steps: FigmaPreflightStep[];
  target: {
    mode: FigmaTargetMode;
    editorType?: FigmaEditorType | undefined;
    fileUrlRedacted?: string | undefined;
    fileKey?: string | undefined;
    fileKeyRedacted?: string | undefined;
    nodeId?: string | undefined;
    pageName?: string | undefined;
    rootFrameName?: string | undefined;
    planKey?: string | undefined;
  };
  lastCheckedAt: string;
  canGenerate: boolean;
  userAction: FigmaPreflightUserAction;
  safeDetails?: FigmaPreflightSafeDetails | undefined;
}

export type FigmaMcpSetupActionKind =
  | 'prepare_mcp_setup'
  | 'start_mcp_login'
  | 'poll_mcp_status';

export interface FigmaMcpSetupAction {
  kind: FigmaMcpSetupActionKind;
  status: 'ready' | 'manual_command' | 'needs_retry' | 'failed';
  canOpenExternal: boolean;
  command?: string;
  url?: string;
  preflight?: FigmaPreflightSummary;
  safeDetails?: {
    serverName?: string;
    expectedMcpUrl?: string;
    reason?: string;
    retryAfterMs?: number;
  };
}

const FIGMA_PREFLIGHT_STEP_DEFAULTS = {
  codex_cli_unavailable: { overallStatus: 'not_configured', userAction: 'install_codex' },
  figma_mcp_not_added: { overallStatus: 'not_configured', userAction: 'add_figma_mcp' },
  figma_mcp_url_invalid: { overallStatus: 'not_configured', userAction: 'fix_mcp_url' },
  figma_mcp_available: { overallStatus: 'ready', userAction: 'none' },
  auth_required: { overallStatus: 'auth_required', userAction: 'authorize_figma' },
  user_cancelled: { overallStatus: 'auth_required', userAction: 'authorize_figma' },
  target_url_invalid: { overallStatus: 'target_invalid', userAction: 'choose_valid_target' },
  file_readable: { overallStatus: 'ready', userAction: 'none' },
  file_unreadable: { overallStatus: 'read_blocked', userAction: 'request_file_access' },
  edit_permission_missing: { overallStatus: 'write_blocked', userAction: 'request_edit_access' },
  write_probe_passed: { overallStatus: 'ready', userAction: 'none' },
  write_probe_failed: { overallStatus: 'write_blocked', userAction: 'retry' },
  unknown_error: { overallStatus: 'failed', userAction: 'retry' },
} as const satisfies Record<
  FigmaPreflightStepCode,
  { overallStatus: FigmaPreflightOverallStatus; userAction: FigmaPreflightUserAction }
>;

export interface FigmaPreflightRunner {
  run(command: string, args: string[], input?: string, timeoutMs?: number): Promise<CommandResult>;
}

export interface RunFigmaPreflightOptions {
  target?: FigmaTarget | null;
  checkWriteAccess?: boolean;
  runner?: FigmaPreflightRunner;
  now?: () => Date;
  serverName?: string;
  expectedUrl?: string;
}

interface ParsedTarget {
  ok: boolean;
  target: FigmaPreflightSummary['target'];
  details?: FigmaPreflightSafeDetails;
}

class SpawnFigmaPreflightRunner implements FigmaPreflightRunner {
  run(command: string, args: string[], input = '', timeoutMs = COMMAND_TIMEOUT_MS): Promise<CommandResult> {
    return new Promise((resolve) => {
      const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        child.kill('SIGTERM');
        resolve({ code: null, stdout, stderr, timedOut: true });
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('error', (error: NodeJS.ErrnoException) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ code: null, stdout, stderr, error });
      });
      child.on('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
      });

      if (input) child.stdin.end(input);
      else child.stdin.end();
    });
  }
}

const DEFAULT_RUNNER = new SpawnFigmaPreflightRunner();

export async function runFigmaPreflight({
  target,
  checkWriteAccess = false,
  runner = DEFAULT_RUNNER,
  now = () => new Date(),
  serverName = process.env.ODC_FIGMA_MCP_SERVER || DEFAULT_FIGMA_MCP_SERVER,
  expectedUrl = process.env.ODC_FIGMA_MCP_URL || EXPECTED_FIGMA_MCP_URL,
}: RunFigmaPreflightOptions = {}): Promise<FigmaPreflightSummary> {
  const checkedAt = now().toISOString();
  const parsedTarget = parseFigmaTarget(target);
  const steps: FigmaPreflightStep[] = [];

  if (!parsedTarget.ok) {
    steps.push(step('target_url_invalid', 'failed', checkedAt, parsedTarget.details));
    return summarize(steps, parsedTarget.target, checkedAt);
  }

  const codexVersion = await runner.run('codex', ['--version']);
  if (codexVersion.error && codexVersion.error.code === 'ENOENT') {
    steps.push(step('codex_cli_unavailable', 'failed', checkedAt, {
      command: 'codex --version',
      retryable: true,
    }));
    return summarize(steps, parsedTarget.target, checkedAt);
  }
  if (codexVersion.code !== 0) {
    steps.push(step('codex_cli_unavailable', 'failed', checkedAt, {
      command: 'codex --version',
      errorClass: 'unknown',
      retryable: true,
    }));
    return summarize(steps, parsedTarget.target, checkedAt);
  }

  const mcpConfig = await runner.run('codex', ['mcp', 'get', serverName, '--json']);
  if (mcpConfig.code !== 0) {
    steps.push(step('figma_mcp_not_added', 'failed', checkedAt, {
      command: `codex mcp add ${serverName} --url ${expectedUrl}`,
      expectedMcpUrl: expectedUrl,
      retryable: true,
    }));
    return summarize(steps, parsedTarget.target, checkedAt);
  }

  const config = safeJson(mcpConfig.stdout);
  const configuredUrl = findStringValue(config, ['url']);
  const enabled = findBooleanValue(config, ['enabled']);
  if (enabled === false || configuredUrl !== expectedUrl) {
    steps.push(step('figma_mcp_url_invalid', 'failed', checkedAt, {
      command: `codex mcp add ${serverName} --url ${expectedUrl}`,
      expectedMcpUrl: expectedUrl,
      ...defined({ actualMcpUrlHost: configuredUrl ? safeHost(configuredUrl) : undefined }),
      retryable: true,
    }));
    return summarize(steps, parsedTarget.target, checkedAt);
  }
  steps.push(step('figma_mcp_available', 'passed', checkedAt, {
    expectedMcpUrl: expectedUrl,
    ...defined({ actualMcpUrlHost: safeHost(configuredUrl) }),
  }));

  const list = await runner.run('codex', ['mcp', 'list', '--json']);
  const authStatus = list.code === 0 ? authStatusForServer(safeJson(list.stdout), serverName) : 'unknown';
  if (isAuthRequired(authStatus)) {
    steps.push(step('auth_required', 'failed', checkedAt, {
      command: `codex mcp login ${serverName}`,
      retryable: true,
    }));
    return summarize(steps, parsedTarget.target, checkedAt);
  }

  if (parsedTarget.target.mode === 'new-file') {
    steps.push(step('file_readable', 'skipped', checkedAt, {
      retryable: false,
    }));
    return summarize(steps, parsedTarget.target, checkedAt);
  }

  const readProbe = await runCodexProbe(runner, serverName, readProbePrompt(parsedTarget.target));
  if (!readProbe.ok) {
    const code = classifyProbeFailure(readProbe.text, 'file_unreadable');
    steps.push(step(code, 'failed', checkedAt, {
      ...parsedTarget.details,
      errorClass: code === 'auth_required' || code === 'user_cancelled' ? 'auth' : 'permission',
      retryable: true,
    }));
    return summarize(steps, parsedTarget.target, checkedAt);
  }
  steps.push(step('file_readable', 'passed', checkedAt, parsedTarget.details));

  if (!checkWriteAccess) {
    return summarize(steps, parsedTarget.target, checkedAt);
  }

  const writeProbe = await runCodexProbe(runner, serverName, writeProbePrompt(parsedTarget.target));
  if (!writeProbe.ok) {
    const code = classifyProbeFailure(writeProbe.text, 'write_probe_failed');
    steps.push(step(code, 'failed', checkedAt, {
      ...parsedTarget.details,
      errorClass: code === 'edit_permission_missing' || code === 'write_probe_failed' ? 'permission' : 'auth',
      ...writeProbeSafeDetails(),
      retryable: true,
    }));
    return summarize(steps, parsedTarget.target, checkedAt);
  }
  steps.push(step('write_probe_passed', 'passed', checkedAt, {
    ...parsedTarget.details,
    ...writeProbeSafeDetails(),
  }));

  return summarize(steps, parsedTarget.target, checkedAt);
}

export async function runFigmaMcpSetupAction({
  action,
  target,
  runner = DEFAULT_RUNNER,
  now = () => new Date(),
  serverName = process.env.ODC_FIGMA_MCP_SERVER || DEFAULT_FIGMA_MCP_SERVER,
  expectedUrl = process.env.ODC_FIGMA_MCP_URL || EXPECTED_FIGMA_MCP_URL,
}: {
  action: FigmaMcpSetupActionKind;
  target?: FigmaTarget | null;
  runner?: FigmaPreflightRunner;
  now?: () => Date;
  serverName?: string;
  expectedUrl?: string;
}): Promise<FigmaMcpSetupAction> {
  if (action === 'prepare_mcp_setup') {
    return {
      kind: action,
      status: 'manual_command',
      canOpenExternal: false,
      command: `codex mcp add ${serverName} --url ${expectedUrl}`,
      safeDetails: {
        serverName,
        expectedMcpUrl: expectedUrl,
        reason: 'codex_mcp_add_requires_local_cli',
      },
    };
  }

  const preflightOptions: RunFigmaPreflightOptions = {
    runner,
    now,
    serverName,
    expectedUrl,
  };
  if (target !== undefined) preflightOptions.target = target;
  const preflight = await runFigmaPreflight(preflightOptions);

  if (action === 'poll_mcp_status') {
    return {
      kind: action,
      status: preflight.userAction === 'none' || preflight.canGenerate ? 'ready' : 'needs_retry',
      canOpenExternal: false,
      preflight,
      safeDetails: {
        serverName,
        expectedMcpUrl: expectedUrl,
        retryAfterMs: 2000,
      },
    };
  }

  return {
    kind: action,
    status: preflight.userAction === 'none' ? 'ready' : 'manual_command',
    canOpenExternal: false,
    command: `codex mcp login ${serverName}`,
    preflight,
    safeDetails: {
      serverName,
      expectedMcpUrl: expectedUrl,
      reason: 'codex_mcp_login_is_interactive',
      retryAfterMs: 2000,
    },
  };
}

function step(
  code: FigmaPreflightStepCode,
  status: FigmaPreflightStep['status'],
  checkedAt: string,
  safeDetails?: FigmaPreflightSafeDetails,
): FigmaPreflightStep {
  return defined({
    code,
    status,
    checkedAt,
    messageKey: `figma.preflight.${code}`,
    userAction: FIGMA_PREFLIGHT_STEP_DEFAULTS[code].userAction,
    safeDetails: defined(safeDetails),
  }) as FigmaPreflightStep;
}

function summarize(
  steps: FigmaPreflightStep[],
  target: FigmaPreflightSummary['target'],
  lastCheckedAt: string,
): FigmaPreflightSummary {
  const failed = steps.find((item) => item.status === 'failed');
  const writePassedStep = steps.find((item) => item.code === 'write_probe_passed' && item.status === 'passed');
  const writePassed = Boolean(writePassedStep);
  const blocking = failed ?? (writePassed ? undefined : findLastCompletedStep(steps));
  const code = failed?.code ?? (writePassed ? 'write_probe_passed' : (blocking?.code ?? 'unknown_error'));
  const defaults = FIGMA_PREFLIGHT_STEP_DEFAULTS[code];
  return defined({
    kind: 'figma_preflight',
    overallStatus: failed ? defaults.overallStatus : writePassed ? 'ready' : defaults.overallStatus,
    steps,
    target,
    lastCheckedAt,
    canGenerate: writePassed,
    userAction: failed ? defaults.userAction : writePassed ? 'none' : defaults.userAction,
    safeDetails: failed?.safeDetails ?? writePassedStep?.safeDetails ?? blocking?.safeDetails,
  }) as FigmaPreflightSummary;
}

function findLastCompletedStep(steps: FigmaPreflightStep[]): FigmaPreflightStep | undefined {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const item = steps[index];
    if (item && (item.status === 'passed' || item.status === 'skipped')) return item;
  }
  return undefined;
}

function parseFigmaTarget(target?: FigmaTarget | null): ParsedTarget {
  if (!target || typeof target !== 'object') {
    return {
      ok: false,
      target: { mode: 'existing-file' },
      details: { errorClass: 'invalid_target', retryable: false },
    };
  }

  if (target.mode === 'new-file') {
    return {
      ok: true,
      target: defined({
        mode: 'new-file',
        editorType: target.editorType,
        planKey: target.planKey,
        pageName: target.pageName,
        rootFrameName: target.rootFrameName,
      }),
    };
  }

  const fileKey = target.fileKey || fileKeyFromUrl(target.fileUrl);
  if (!fileKey) {
    return {
      ok: false,
      target: defined({
        mode: target.mode,
        editorType: target.editorType,
        nodeId: normalizeNodeId(target.nodeId),
        pageName: target.pageName,
        rootFrameName: target.rootFrameName,
      }),
      details: { errorClass: 'invalid_target', retryable: false },
    };
  }
  const nodeId = normalizeNodeId(target.nodeId ?? nodeIdFromUrl(target.fileUrl));
  const summary = defined({
    mode: target.mode,
    editorType: target.editorType,
    fileUrlRedacted: redactFigmaUrl(target.fileUrl),
    fileKey,
    fileKeyRedacted: redactKey(fileKey),
    nodeId,
    pageName: target.pageName,
    rootFrameName: target.rootFrameName,
  });
  return {
    ok: true,
    target: summary,
    details: defined({
      fileKey,
      fileKeyRedacted: redactKey(fileKey),
      nodeId,
      pageName: target.pageName,
    }),
  };
}

async function runCodexProbe(
  runner: FigmaPreflightRunner,
  serverName: string,
  prompt: string,
): Promise<{ ok: boolean; text: string }> {
  const result = await runner.run(
    'codex',
    [
      'exec',
      '--sandbox',
      'workspace-write',
      '-c',
      'approval_policy="never"',
      '-c',
      `mcp_servers.${serverName}.default_tools_approval_mode="approve"`,
      '-c',
      `mcp_servers.${serverName}.default_tools_enabled=true`,
      '--json',
      '-',
    ],
    prompt,
    WRITE_PROBE_TIMEOUT_MS,
  );
  const text = `${result.stdout}\n${result.stderr}`;
  return { ok: result.code === 0 && /\bPASS\b/i.test(text), text };
}

function readProbePrompt(target: FigmaPreflightSummary['target']): string {
  return [
    'Use Figma MCP to verify read access only. Do not modify the file.',
    `Target fileKey: ${target.fileKey}`,
    target.nodeId ? `Target nodeId: ${target.nodeId}` : '',
    'Call get_metadata for the target or root document, then return exactly PASS or FAIL with a short reason.',
  ].filter(Boolean).join('\n');
}

function writeProbePrompt(target: FigmaPreflightSummary['target']): string {
  return [
    'Use Figma MCP to verify write authorization with one tiny safe probe.',
    `Target fileKey: ${target.fileKey}`,
    target.nodeId ? `Target nodeId: ${target.nodeId}` : '',
    `Call use_figma exactly once. Reuse the existing page named "${WRITE_PROBE_PAGE_NAME}" and frame named "${WRITE_PROBE_FRAME_NAME}" if present; otherwise create them.`,
    `The probe frame must be 180x80 and named "${WRITE_PROBE_FRAME_NAME}" on page "${WRITE_PROBE_PAGE_NAME}".`,
    `Add visible helper text or shared plugin data with this marker: "${WRITE_PROBE_MARKER}"`,
    'Never modify, delete, or move user-created nodes outside that named probe page/frame.',
    'Do not create a full design. Return exactly PASS with file/page/node details or FAIL with the blocker.',
  ].filter(Boolean).join('\n');
}

function writeProbeSafeDetails(): FigmaPreflightSafeDetails {
  return {
    probePageName: WRITE_PROBE_PAGE_NAME,
    probeNodeName: WRITE_PROBE_FRAME_NAME,
    probeMarker: WRITE_PROBE_MARKER,
    probeCleanupInstruction: WRITE_PROBE_CLEANUP,
  };
}

function classifyProbeFailure(text: string, fallback: FigmaPreflightStepCode): FigmaPreflightStepCode {
  const lower = text.toLowerCase();
  if (lower.includes('user cancelled') || lower.includes('cancelled mcp')) return 'user_cancelled';
  if (lower.includes('oauth') || lower.includes('auth') || lower.includes('login')) return 'auth_required';
  if (lower.includes('permission') || lower.includes('forbidden') || lower.includes('edit access') || lower.includes('full seat')) {
    return 'edit_permission_missing';
  }
  if (lower.includes('not found') || lower.includes('unreadable') || lower.includes('file key')) return 'file_unreadable';
  return fallback;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findStringValue(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  for (const key of keys) {
    const direct = (value as Record<string, unknown>)[key];
    if (typeof direct === 'string') return direct;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    const nested = findStringValue(child, keys);
    if (nested) return nested;
  }
  return undefined;
}

function findBooleanValue(value: unknown, keys: string[]): boolean | undefined {
  if (!value || typeof value !== 'object') return undefined;
  for (const key of keys) {
    const direct = (value as Record<string, unknown>)[key];
    if (typeof direct === 'boolean') return direct;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    const nested = findBooleanValue(child, keys);
    if (typeof nested === 'boolean') return nested;
  }
  return undefined;
}

function authStatusForServer(value: unknown, serverName: string): string {
  const servers = Array.isArray(value)
    ? value
    : Array.isArray((value as { servers?: unknown[] } | null)?.servers)
      ? (value as { servers: unknown[] }).servers
      : [];
  const server = servers.find((item) => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return record.name === serverName || record.id === serverName;
  }) as Record<string, unknown> | undefined;
  const status = server?.auth_status ?? server?.authStatus ?? server?.oauth_status;
  return typeof status === 'string' ? status : 'unknown';
}

function isAuthRequired(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized.includes('not') ||
    normalized.includes('unauth') ||
    normalized.includes('required') ||
    normalized.includes('missing') ||
    normalized.includes('expired');
}

function fileKeyFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return FIGMA_DESIGN_URL_RE.exec(url)?.[1];
}

function nodeIdFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return normalizeNodeId(parsed.searchParams.get('node-id') ?? undefined);
  } catch {
    return undefined;
  }
}

function normalizeNodeId(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.replace('-', ':');
}

function redactFigmaUrl(url?: string): string | undefined {
  const fileKey = fileKeyFromUrl(url);
  if (!fileKey) return url ? 'https://www.figma.com/design/<invalid>' : undefined;
  return `https://www.figma.com/design/${redactKey(fileKey)}`;
}

function redactKey(value: string): string {
  if (value.length <= 8) return '<redacted>';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function safeHost(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

function defined<T extends object | undefined>(value: T): T {
  if (!value) return value;
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

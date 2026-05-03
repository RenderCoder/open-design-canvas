import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n';
import type { Dict } from '../i18n/types';
import { runFigmaMcpSetupAction, runFigmaPreflight } from '../providers/registry';
import type {
  FigmaMcpSetupAction,
  FigmaPreflightSummary,
  FigmaTarget,
  Project,
} from '../types';
import { Icon } from './Icon';

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

interface Props {
  projectId: string | null;
  target?: FigmaTarget;
  preflight?: FigmaPreflightSummary;
  compact?: boolean;
  onProjectUpdate?: (project: Project) => void;
}

type StepKey = 'codex' | 'mcp' | 'auth' | 'read' | 'write' | 'ready';
type StepStatus = 'pending' | 'running' | 'passed' | 'action' | 'failed';

interface WizardStep {
  key: StepKey;
  titleKey: keyof Dict;
  bodyKey: keyof Dict;
  status: StepStatus;
}

const STEP_ORDER: Array<Pick<WizardStep, 'key' | 'titleKey' | 'bodyKey'>> = [
  { key: 'codex', titleKey: 'figmaWizard.stepCodex', bodyKey: 'figmaWizard.stepCodexBody' },
  { key: 'mcp', titleKey: 'figmaWizard.stepMcp', bodyKey: 'figmaWizard.stepMcpBody' },
  { key: 'auth', titleKey: 'figmaWizard.stepAuth', bodyKey: 'figmaWizard.stepAuthBody' },
  { key: 'read', titleKey: 'figmaWizard.stepRead', bodyKey: 'figmaWizard.stepReadBody' },
  { key: 'write', titleKey: 'figmaWizard.stepWrite', bodyKey: 'figmaWizard.stepWriteBody' },
  { key: 'ready', titleKey: 'figmaWizard.stepReady', bodyKey: 'figmaWizard.stepReadyBody' },
];

export function FigmaMcpAuthorizationWizard({
  projectId,
  target,
  preflight,
  compact = false,
  onProjectUpdate,
}: Props) {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [action, setAction] = useState<FigmaMcpSetupAction | null>(null);
  const [localPreflight, setLocalPreflight] = useState<FigmaPreflightSummary | undefined>(preflight);
  const [copied, setCopied] = useState(false);
  const currentPreflight = localPreflight ?? preflight;
  const steps = useMemo(
    () => buildWizardSteps(currentPreflight, busy != null),
    [currentPreflight, busy],
  );
  const targetLabel = targetSummary(currentPreflight, target, t);
  const primary = primaryAction(currentPreflight, action);
  const details = safeDetailsText(currentPreflight, action);
  const checkedAt = currentPreflight?.lastCheckedAt
    ? formatCheckedAt(currentPreflight.lastCheckedAt)
    : null;

  useEffect(() => {
    setLocalPreflight(preflight);
  }, [preflight]);

  async function runCheck(checkWriteAccess: boolean) {
    if (!projectId) return;
    setBusy(checkWriteAccess ? 'write' : 'check');
    try {
      const result = await runFigmaPreflight(projectId, { target, checkWriteAccess });
      if (result) {
        setLocalPreflight(result.preflight);
        onProjectUpdate?.(result.project);
        setAction(null);
      }
    } finally {
      setBusy(null);
    }
  }

  async function runAction(kind: 'prepare_mcp_setup' | 'start_mcp_login' | 'poll_mcp_status') {
    if (!projectId) return;
    setBusy(kind);
    try {
      const result = await runFigmaMcpSetupAction(projectId, { action: kind, target });
      if (result) {
        setAction(result.action);
        if (result.action.preflight) setLocalPreflight(result.action.preflight);
        onProjectUpdate?.(result.project);
      }
    } finally {
      setBusy(null);
    }
  }

  async function copyCommand() {
    const command = action?.command;
    if (!command) return;
    await copyText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section
      className={`figma-mcp-wizard${compact ? ' compact' : ''}`}
      data-testid="figma-mcp-wizard"
      aria-label={t('figmaWizard.title')}
    >
      <div className="figma-mcp-wizard-head">
        <div>
          <span className="figma-mcp-kicker">{t('figmaWizard.kicker')}</span>
          <h3>{t('figmaWizard.title')}</h3>
          <p>{t('figmaWizard.subtitle')}</p>
        </div>
        <span className={`figma-mcp-status ${currentPreflight?.canGenerate ? 'ready' : 'blocked'}`}>
          {currentPreflight?.canGenerate ? t('figmaWizard.readyBadge') : t('figmaWizard.needsCheckBadge')}
        </span>
      </div>

      <div className="figma-mcp-target">
        <span>{t('figmaWizard.target')}</span>
        <strong>{targetLabel}</strong>
        {checkedAt ? <small>{t('figmaWizard.lastChecked', { time: checkedAt })}</small> : null}
      </div>

      <ol className="figma-mcp-steps">
        {steps.map((step) => (
          <li key={step.key} className={`figma-mcp-step ${step.status}`}>
            <span className="figma-mcp-step-icon">{iconForStatus(step.status)}</span>
            <div>
              <strong>{t(step.titleKey)}</strong>
              <small>{t(step.bodyKey)}</small>
            </div>
          </li>
        ))}
      </ol>

      {currentPreflight?.safeDetails?.probeNodeName ? (
        <div className="figma-mcp-probe">
          {t('figmaWizard.probeSummary', { name: currentPreflight.safeDetails.probeNodeName })}
        </div>
      ) : (
        <div className="figma-mcp-probe">{t('figmaWizard.writeProbeNotice')}</div>
      )}

      <div className="figma-mcp-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => void runCheck(false)}
          disabled={!projectId || busy != null}
        >
          <Icon name={busy === 'check' ? 'spinner' : 'refresh'} size={13} />
          <span>{t('figmaWizard.check')}</span>
        </button>
        {primary === 'setup' ? (
          <button
            type="button"
            className="secondary"
            onClick={() => void runAction('prepare_mcp_setup')}
            disabled={!projectId || busy != null}
          >
            <Icon name="settings" size={13} />
            <span>{t('figmaWizard.prepareSetup')}</span>
          </button>
        ) : null}
        {primary === 'auth' ? (
          <button
            type="button"
            className="secondary"
            onClick={() => void runAction('start_mcp_login')}
            disabled={!projectId || busy != null}
          >
            <Icon name="link" size={13} />
            <span>{t('figmaWizard.authorize')}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="secondary"
          onClick={() => void runAction('poll_mcp_status')}
          disabled={!projectId || busy != null}
        >
          <Icon name={busy === 'poll_mcp_status' ? 'spinner' : 'reload'} size={13} />
          <span>{t('figmaWizard.recheck')}</span>
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => void runCheck(true)}
          disabled={!projectId || busy != null}
        >
          <Icon name={busy === 'write' ? 'spinner' : 'check'} size={13} />
          <span>{t('figmaWizard.checkWrite')}</span>
        </button>
      </div>

      {action?.command ? (
        <div className="figma-mcp-command">
          <code>{action.command}</code>
          <button type="button" className="icon-btn" onClick={() => void copyCommand()}>
            <Icon name={copied ? 'check' : 'copy'} size={13} />
            <span>{copied ? t('figmaWizard.copied') : t('figmaWizard.copyCommand')}</span>
          </button>
        </div>
      ) : null}

      {currentPreflight && !currentPreflight.canGenerate ? (
        <p className="figma-mcp-blocker">{messageForPreflight(currentPreflight, t)}</p>
      ) : null}

      {details ? (
        <details className="figma-mcp-details">
          <summary>{t('figmaWizard.details')}</summary>
          <pre>{details}</pre>
        </details>
      ) : null}
    </section>
  );
}

function buildWizardSteps(
  preflight: FigmaPreflightSummary | undefined,
  running: boolean,
): WizardStep[] {
  const failed = preflight?.steps.find((step) => step.status === 'failed');
  return STEP_ORDER.map((base) => ({
    ...base,
    status: statusForStep(base.key, preflight, failed?.code, running),
  }));
}

function statusForStep(
  key: StepKey,
  preflight: FigmaPreflightSummary | undefined,
  failedCode: string | undefined,
  running: boolean,
): StepStatus {
  if (running && key === 'codex') return 'running';
  if (!preflight) return 'pending';
  if (key === 'ready') return preflight.canGenerate ? 'passed' : 'pending';
  if (key === 'codex') return 'passed';
  const codes = codesForStep(key);
  if (failedCode && codes.includes(failedCode)) {
    return failedCode === 'auth_required' || failedCode === 'user_cancelled' || failedCode === 'figma_mcp_not_added'
      ? 'action'
      : 'failed';
  }
  if (preflight.steps.some((step) => codes.includes(step.code) && step.status === 'passed')) {
    return 'passed';
  }
  if (key === 'write' && preflight.steps.some((step) => step.code === 'file_readable')) return 'action';
  return 'pending';
}

function codesForStep(key: StepKey): string[] {
  switch (key) {
    case 'codex':
      return ['codex_cli_unavailable'];
    case 'mcp':
      return ['figma_mcp_not_added', 'figma_mcp_url_invalid', 'figma_mcp_available'];
    case 'auth':
      return ['auth_required', 'user_cancelled'];
    case 'read':
      return ['target_url_invalid', 'file_readable', 'file_unreadable'];
    case 'write':
      return ['edit_permission_missing', 'write_probe_failed', 'write_probe_passed'];
    case 'ready':
      return ['write_probe_passed'];
  }
}

function primaryAction(
  preflight: FigmaPreflightSummary | undefined,
  action: FigmaMcpSetupAction | null,
): 'setup' | 'auth' | 'none' {
  if (action?.status === 'manual_command') return 'none';
  if (!preflight) return 'none';
  if (preflight.userAction === 'add_figma_mcp' || preflight.userAction === 'fix_mcp_url') return 'setup';
  if (preflight.userAction === 'authorize_figma') return 'auth';
  return 'none';
}

function messageForPreflight(preflight: FigmaPreflightSummary, t: TranslateFn): string {
  switch (preflight.userAction) {
    case 'install_codex':
      return t('figmaWizard.blockedCodex');
    case 'add_figma_mcp':
    case 'fix_mcp_url':
      return t('figmaWizard.blockedMcp');
    case 'authorize_figma':
      return t('figmaWizard.blockedAuth');
    case 'choose_valid_target':
      return t('figmaWizard.blockedTarget');
    case 'request_file_access':
      return t('figmaWizard.blockedRead');
    case 'request_edit_access':
      return t('figmaWizard.blockedWrite');
    case 'retry':
      return t('figmaWizard.blockedRetry');
    case 'none':
      return t('figmaWizard.blockedWriteProbe');
  }
}

function iconForStatus(status: StepStatus): string {
  if (status === 'passed') return '✓';
  if (status === 'running') return '…';
  if (status === 'failed') return '!';
  if (status === 'action') return '→';
  return '○';
}

function targetSummary(
  preflight: FigmaPreflightSummary | undefined,
  target: FigmaTarget | undefined,
  t: TranslateFn,
): string {
  if (preflight?.target.mode === 'new-file' || target?.mode === 'new-file') return t('chat.figmaTargetNewFile');
  const redacted = preflight?.target.fileKeyRedacted ?? target?.fileKey;
  if (redacted) return redacted;
  if (target?.fileUrl) return t('chat.figmaTargetExisting');
  return t('chat.figmaTargetUnset');
}

function safeDetailsText(
  preflight: FigmaPreflightSummary | undefined,
  action: FigmaMcpSetupAction | null,
): string {
  if (!preflight && !action) return '';
  const details = {
    action: action?.safeDetails,
    preflight: preflight?.safeDetails,
    status: preflight?.overallStatus,
    userAction: preflight?.userAction,
  };
  return JSON.stringify(details, null, 2);
}

function formatCheckedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

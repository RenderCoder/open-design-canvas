import type {
  FigmaCheckStatus,
  FigmaNativeResult,
  FigmaResultIssue,
  FigmaResultNodeRef,
} from '@open-design/contracts';

import { Icon } from './Icon';

interface Props {
  result: FigmaNativeResult;
}

export function FigmaResultCard({ result }: Props) {
  const rootFrame = result.rootFrames[0];
  const statusTone = statusToTone(result.status);
  const checks = checkEntries(result);
  const warnings = resultWarnings(result);
  const visibleComponents = result.reusedComponents.slice(0, 4);
  const visibleVariables = result.variables.slice(0, 6);
  const visibleStyles = result.styles.slice(0, 4);
  const visibleIssues = result.issues.slice(0, 4);

  return (
    <section className="figma-result-card" data-status={statusTone}>
      <div className="figma-result-head">
        <div className="figma-result-title-wrap">
          <span className="figma-result-kicker">Figma native result</span>
          <h3 className="figma-result-title">
            {result.pageName || rootFrame?.name || result.fileKey || 'Canvas update'}
          </h3>
        </div>
        <span className="figma-result-status">{humanStatus(result.status)}</span>
      </div>

      <div className="figma-result-main">
        <div className="figma-result-target">
          {result.fileUrl ? (
            <a href={result.fileUrl} target="_blank" rel="noreferrer" className="figma-file-link">
              <Icon name="link" size={13} />
              <span>Open Figma file</span>
            </a>
          ) : (
            <span className="figma-result-muted">No Figma file URL returned</span>
          )}
          {result.fileKey ? <code>{result.fileKey}</code> : null}
        </div>

        {rootFrame ? <RootFrameSummary frame={rootFrame} /> : null}
      </div>

      <div className="figma-result-metrics" aria-label="Figma result summary">
        <Metric label="Created" value={result.created.length} />
        <Metric label="Updated" value={result.updated.length} />
        <Metric label="Components" value={result.reusedComponents.length} />
        <Metric label="Variables" value={result.variables.length} />
      </div>

      <div className="figma-result-grid">
        <SummaryList
          title="Components"
          empty="No reused components reported"
          items={visibleComponents.map((component) =>
            component.source ? `${component.name ?? 'Unnamed component'} - ${component.source}` : (component.name ?? 'Unnamed component'),
          )}
          extraCount={result.reusedComponents.length - visibleComponents.length}
        />
        <SummaryList
          title="Tokens"
          empty="No variables or styles reported"
          items={[...visibleVariables, ...visibleStyles]}
          extraCount={
            result.variables.length +
            result.styles.length -
            visibleVariables.length -
            visibleStyles.length
          }
        />
      </div>

      {checks.length > 0 ? (
        <div className="figma-result-checks">
          {checks.map(([name, status]) => (
            <span key={name} className="figma-check" data-status={checkTone(status)}>
              <span className="figma-check-dot" aria-hidden />
              <span className="figma-check-name">{humanCheckName(name)}</span>
              <span className="figma-check-status">{status}</span>
            </span>
          ))}
        </div>
      ) : null}

      {warnings.length > 0 || visibleIssues.length > 0 ? (
        <div className="figma-result-warnings">
          {[...warnings, ...visibleIssues.map(issueLabel)].slice(0, 6).map((warning, index) => (
            <div key={`${warning}-${index}`} className="figma-warning">
              <Icon name="sliders" size={12} />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : null}

      {result.nextActions.length > 0 ? (
        <div className="figma-result-next">
          <span>Next</span>
          <ul>
            {result.nextActions.slice(0, 3).map((action, index) => (
              <li key={`${action}-${index}`}>{action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function resultWarnings(result: FigmaNativeResult): string[] {
  const warnings: string[] = [];
  if (result.hardcodedValues.length > 0) {
    warnings.push(`${result.hardcodedValues.length} hardcoded value${result.hardcodedValues.length === 1 ? '' : 's'} reported`);
  }
  if (result.reusedComponents.length === 0) {
    warnings.push('No component reuse reported');
  }
  if (!hasCheck(result, 'metadata')) {
    warnings.push('Metadata check was not reported');
  }
  if (!hasCheck(result, 'screenshot')) {
    warnings.push('Screenshot check was not reported');
  }
  if (!hasCheck(result, 'variables')) {
    warnings.push('Variable/token check was not reported');
  }
  return warnings;
}

function RootFrameSummary({ frame }: { frame: FigmaResultNodeRef }) {
  const dimensions =
    typeof frame.width === 'number' && typeof frame.height === 'number'
      ? `${frame.width} x ${frame.height}`
      : null;
  return (
    <div className="figma-root-frame">
      <span className="figma-root-label">Root frame</span>
      <strong>{frame.name ?? 'Unnamed frame'}</strong>
      <div>
        {frame.nodeId ? <code>{frame.nodeId}</code> : null}
        {dimensions ? <span>{dimensions}</span> : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="figma-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryList({
  title,
  empty,
  items,
  extraCount,
}: {
  title: string;
  empty: string;
  items: string[];
  extraCount: number;
}) {
  return (
    <div className="figma-summary-list">
      <span className="figma-summary-title">{title}</span>
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
          {extraCount > 0 ? <li>+{extraCount} more</li> : null}
        </ul>
      ) : (
        <span className="figma-result-muted">{empty}</span>
      )}
    </div>
  );
}

function checkEntries(result: FigmaNativeResult): Array<[string, FigmaCheckStatus | string]> {
  return Object.entries(result.checks).sort(([a], [b]) => a.localeCompare(b));
}

function hasCheck(result: FigmaNativeResult, name: string): boolean {
  const found = Object.entries(result.checks).find(([key]) => key.toLowerCase() === name);
  if (!found) return false;
  return found[1] !== 'skipped' && found[1] !== 'unknown';
}

function issueLabel(issue: FigmaResultIssue): string {
  const prefix =
    issue.severity === 'error'
      ? 'Error'
      : issue.severity === 'warning'
        ? 'Warning'
        : issue.severity === 'info'
          ? 'Info'
          : 'Issue';
  return `${prefix}: ${issue.message}`;
}

function humanStatus(status: FigmaNativeResult['status']): string {
  if (status === 'completed') return 'Completed';
  if (status === 'partial') return 'Partial';
  if (status === 'blocked') return 'Blocked';
  return 'Failed';
}

function statusToTone(status: FigmaNativeResult['status']): 'ok' | 'warn' | 'bad' {
  if (status === 'completed') return 'ok';
  if (status === 'partial' || status === 'blocked') return 'warn';
  return 'bad';
}

function checkTone(status: FigmaCheckStatus | string): 'ok' | 'warn' | 'bad' {
  if (status === 'passed') return 'ok';
  if (status === 'failed') return 'bad';
  return 'warn';
}

function humanCheckName(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
}

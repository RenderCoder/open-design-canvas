/**
 * Renders a single tool_use (optionally paired with its tool_result) as an
 * inline card in the assistant message stream. Tools we recognize get
 * specialized layouts; unknown ones fall back to a generic command/output
 * card.
 */
import { useState } from 'react';
import { useT } from '../i18n';
import { parseTodoWriteInput } from '../runtime/todos';
import type { AgentEvent } from '../types';

interface Props {
  use: Extract<AgentEvent, { kind: 'tool_use' }>;
  result?: Extract<AgentEvent, { kind: 'tool_result' }> | undefined;
  // Set of file names that exist in the project folder. When the tool's
  // `file_path`/`path` argument's basename appears in this set we surface
  // an "open" button on the card. Pass `undefined` to skip the existence
  // check (the button is then always shown for file-shaped tools).
  projectFileNames?: Set<string>;
  // Lifts a basename up to ProjectView so it can focus the matching tab
  // in FileWorkspace.
  onRequestOpenFile?: (name: string) => void;
}

export function ToolCard({ use, result, projectFileNames, onRequestOpenFile }: Props) {
  const name = use.name;
  const ctx: FileToolCtx = { projectFileNames, onRequestOpenFile };
  if (isFigmaMcpTool(name, use.input)) return <FigmaMcpCard name={name} input={use.input} result={result} />;
  if (name === 'TodoWrite') return <TodoCard input={use.input} />;
  if (name === 'Write' || name === 'create_file')
    return <FileWriteCard input={use.input} result={result} ctx={ctx} />;
  if (name === 'Edit' || name === 'str_replace_edit')
    return <FileEditCard input={use.input} result={result} ctx={ctx} />;
  if (name === 'Read' || name === 'read_file')
    return <FileReadCard input={use.input} result={result} ctx={ctx} />;
  if (name === 'Bash') return <BashCard input={use.input} result={result} />;
  if (name === 'Glob' || name === 'list_files') return <GlobCard input={use.input} result={result} />;
  if (name === 'Grep') return <GrepCard input={use.input} result={result} />;
  if (name === 'WebFetch' || name === 'web_fetch') return <WebFetchCard input={use.input} />;
  if (name === 'WebSearch' || name === 'web_search') return <WebSearchCard input={use.input} />;
  return <GenericCard name={name} input={use.input} result={result} />;
}

interface FileToolCtx {
  projectFileNames?: Set<string> | undefined;
  onRequestOpenFile?: ((name: string) => void) | undefined;
}

function OpenInTabButton({ filePath, ctx }: { filePath: string; ctx: FileToolCtx }) {
  const t = useT();
  if (!ctx.onRequestOpenFile) return null;
  if (!filePath || filePath === '(unnamed)') return null;
  // The agent uses absolute paths; the project-file API keys on basename.
  const baseName = filePath.split('/').pop() ?? filePath;
  if (!baseName) return null;
  if (ctx.projectFileNames && !ctx.projectFileNames.has(baseName)) return null;
  const open = ctx.onRequestOpenFile;
  return (
    <button
      type="button"
      className="op-open"
      onClick={() => open(baseName)}
      title={t('tool.openInTab', { name: baseName })}
    >
      {t('tool.open')}
    </button>
  );
}

function TodoCard({ input }: { input: unknown }) {
  const t = useT();
  const todos = parseTodoWriteInput(input);
  if (todos.length === 0) return <GenericCard name="TodoWrite" input={input} />;
  const done = todos.filter((todo) => todo.status === 'completed').length;
  return (
    <div className="op-card op-todo">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>☐</span>
        <span className="op-title">{t('tool.todos')}</span>
        <span className="op-meta">
          {done}/{todos.length}
        </span>
      </div>
      <ul className="todo-list">
        {todos.map((todo, i) => (
          <li key={i} className={`todo-item todo-${todo.status}`}>
            <span className="todo-check" aria-hidden>
              {todo.status === 'completed' ? '✓' : todo.status === 'in_progress' ? '◐' : '○'}
            </span>
            <span className="todo-text">
              {todo.status === 'in_progress' && todo.activeForm ? todo.activeForm : todo.content}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileWriteCard({
  input,
  result,
  ctx,
}: {
  input: unknown;
  result?: Props['result'];
  ctx: FileToolCtx;
}) {
  const t = useT();
  const obj = (input ?? {}) as { file_path?: string; path?: string; content?: string };
  const file = obj.file_path ?? obj.path ?? '(unnamed)';
  const lines = typeof obj.content === 'string' ? obj.content.split('\n').length : null;
  return (
    <div className="op-card op-file">
      <div className="op-card-head">
        <span className="op-icon op-icon-write" aria-hidden>+</span>
        <span className="op-title">{t('tool.write')}</span>
        <code className="op-path">{file}</code>
        {lines !== null ? (
          <span className="op-meta">{t('tool.lines', { n: lines })}</span>
        ) : null}
        <ResultBadge result={result} />
        <OpenInTabButton filePath={file} ctx={ctx} />
      </div>
    </div>
  );
}

function FileEditCard({
  input,
  result,
  ctx,
}: {
  input: unknown;
  result?: Props['result'];
  ctx: FileToolCtx;
}) {
  const t = useT();
  const obj = (input ?? {}) as {
    file_path?: string;
    path?: string;
    old_string?: string;
    new_string?: string;
    edits?: { old_string?: string; new_string?: string }[];
  };
  const file = obj.file_path ?? obj.path ?? '(unnamed)';
  const editCount = Array.isArray(obj.edits) ? obj.edits.length : 1;
  return (
    <div className="op-card op-file">
      <div className="op-card-head">
        <span className="op-icon op-icon-edit" aria-hidden>✎</span>
        <span className="op-title">{t('tool.edit')}</span>
        <code className="op-path">{file}</code>
        <span className="op-meta">
          {editCount} {editCount === 1 ? t('tool.changeSingular') : t('tool.changePlural')}
        </span>
        <ResultBadge result={result} />
        <OpenInTabButton filePath={file} ctx={ctx} />
      </div>
    </div>
  );
}

function FileReadCard({
  input,
  result,
  ctx,
}: {
  input: unknown;
  result?: Props['result'];
  ctx: FileToolCtx;
}) {
  const t = useT();
  const obj = (input ?? {}) as { file_path?: string; path?: string };
  const file = obj.file_path ?? obj.path ?? '(unnamed)';
  return (
    <div className="op-card op-file">
      <div className="op-card-head">
        <span className="op-icon op-icon-read" aria-hidden>↗</span>
        <span className="op-title">{t('tool.read')}</span>
        <code className="op-path">{file}</code>
        <ResultBadge result={result} />
        <OpenInTabButton filePath={file} ctx={ctx} />
      </div>
    </div>
  );
}

function BashCard({ input, result }: { input: unknown; result?: Props['result'] }) {
  const t = useT();
  const obj = (input ?? {}) as { command?: string; description?: string };
  const command = obj.command ?? '';
  const desc = obj.description;
  const [open, setOpen] = useState(false);
  return (
    <div className="op-card op-bash">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>$</span>
        <span className="op-title">{t('tool.bash')}</span>
        {desc ? <span className="op-meta op-desc">{desc}</span> : null}
        <ResultBadge result={result} />
        {result && result.content ? (
          <button className="op-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? t('tool.hide') : t('tool.output')}
          </button>
        ) : null}
      </div>
      <pre className="op-command">{truncate(command, 400)}</pre>
      {open && result ? (
        <pre className="op-output">{truncate(result.content, 4000)}</pre>
      ) : null}
    </div>
  );
}

function GlobCard({ input, result }: { input: unknown; result?: Props['result'] }) {
  const t = useT();
  const obj = (input ?? {}) as { pattern?: string; path?: string };
  return (
    <div className="op-card op-search">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>⌕</span>
        <span className="op-title">{t('tool.glob')}</span>
        <code className="op-path">{obj.pattern ?? '*'}</code>
        {obj.path ? (
          <span className="op-meta">{t('tool.in', { path: obj.path })}</span>
        ) : null}
        <ResultBadge result={result} />
      </div>
    </div>
  );
}

function GrepCard({ input, result }: { input: unknown; result?: Props['result'] }) {
  const t = useT();
  const obj = (input ?? {}) as { pattern?: string; path?: string; glob?: string };
  return (
    <div className="op-card op-search">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>⌕</span>
        <span className="op-title">{t('tool.grep')}</span>
        <code className="op-path">{obj.pattern ?? ''}</code>
        {obj.path ? (
          <span className="op-meta">{t('tool.in', { path: obj.path })}</span>
        ) : null}
        <ResultBadge result={result} />
      </div>
    </div>
  );
}

function WebFetchCard({ input }: { input: unknown }) {
  const t = useT();
  const obj = (input ?? {}) as { url?: string };
  return (
    <div className="op-card op-web">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>↬</span>
        <span className="op-title">{t('tool.fetch')}</span>
        <code className="op-path">{obj.url ?? ''}</code>
      </div>
    </div>
  );
}

function WebSearchCard({ input }: { input: unknown }) {
  const t = useT();
  const obj = (input ?? {}) as { query?: string };
  return (
    <div className="op-card op-web">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>⌕</span>
        <span className="op-title">{t('tool.search')}</span>
        <code className="op-path">{obj.query ?? ''}</code>
      </div>
    </div>
  );
}

function FigmaMcpCard({
  name,
  input,
  result,
}: {
  name: string;
  input: unknown;
  result?: Props['result'];
}) {
  const inputObj = asRecord(input);
  const tool = figmaToolName(name, inputObj);
  const args = asRecord(inputObj.args) ?? {};
  const label = figmaProgressLabel(tool, result);
  const details = figmaProgressDetails(tool, args);

  return (
    <div className="op-card op-figma">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>F</span>
        <span className="op-title">{label}</span>
        {details.map((detail) => (
          <span className="op-meta" key={detail}>{detail}</span>
        ))}
        <ResultBadge result={result} />
      </div>
    </div>
  );
}

function isFigmaMcpTool(name: string, input: unknown): boolean {
  const inputObj = asRecord(input);
  const server = typeof inputObj?.server === 'string' ? inputObj.server.toLowerCase() : '';
  const tool = typeof inputObj?.tool === 'string' ? inputObj.tool.toLowerCase() : '';
  const normalizedName = name.toLowerCase();
  return (
    normalizedName.startsWith('mcp__figma.') ||
    normalizedName.startsWith('figma.') ||
    server.includes('figma') ||
    (inputObj?.kind === 'mcp_tool_call' && FIGMA_TOOL_LABELS.has(tool))
  );
}

function figmaToolName(name: string, inputObj: Record<string, unknown> | null): string {
  if (typeof inputObj?.tool === 'string') return inputObj.tool;
  const parts = name.split('.');
  return parts[parts.length - 1] ?? name;
}

function figmaProgressLabel(tool: string, result: Props['result']): string {
  const base = FIGMA_TOOL_LABELS.get(tool) ?? humanizeToolName(tool);
  if (!result) return FIGMA_TOOL_RUNNING_LABELS.get(tool) ?? base;
  if (result.isError) return `${base} issue`;
  return base;
}

const FIGMA_TOOL_LABELS = new Map<string, string>([
  ['search_design_system', 'Searched design system'],
  ['get_libraries', 'Read Figma libraries'],
  ['create_new_file', 'Created Figma file'],
  ['use_figma', 'Updated Figma canvas'],
  ['get_metadata', 'Checked Figma metadata'],
  ['get_screenshot', 'Checked Figma screenshot'],
  ['get_variable_defs', 'Checked Figma variables'],
  ['get_design_context', 'Read Figma design context'],
  ['get_context_for_code_connect', 'Read Code Connect context'],
]);

const FIGMA_TOOL_RUNNING_LABELS = new Map<string, string>([
  ['search_design_system', 'Searching design system'],
  ['get_libraries', 'Reading Figma libraries'],
  ['create_new_file', 'Creating Figma file'],
  ['use_figma', 'Updating Figma canvas'],
  ['get_metadata', 'Checking Figma metadata'],
  ['get_screenshot', 'Checking Figma screenshot'],
  ['get_variable_defs', 'Checking Figma variables'],
  ['get_design_context', 'Reading Figma design context'],
  ['get_context_for_code_connect', 'Reading Code Connect context'],
]);

function figmaProgressDetails(tool: string, args: Record<string, unknown>): string[] {
  const details: string[] = [];
  const query = stringArg(args, 'query');
  const fileName = stringArg(args, 'fileName');
  const fileKey = stringArg(args, 'fileKey');
  const nodeId = stringArg(args, 'nodeId');
  const pageName = stringArg(args, 'pageName');
  const frameName = stringArg(args, 'frameName');

  if (tool === 'search_design_system' && query) details.push(`query: ${query}`);
  if (tool === 'create_new_file' && fileName) details.push(fileName);
  if (pageName) details.push(`page: ${pageName}`);
  if (frameName) details.push(`frame: ${frameName}`);
  if (nodeId) details.push(`node: ${nodeId}`);
  if (fileKey) details.push(`file: ${shortenMiddle(fileKey, 18)}`);
  return details.slice(0, 3);
}

function stringArg(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function GenericCard({
  name,
  input,
  result,
}: {
  name: string;
  input: unknown;
  result?: Props['result'];
}) {
  const summary = describeInput(input);
  return (
    <div className="op-card op-generic">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>·</span>
        <span className="op-title">{name}</span>
        {summary ? <span className="op-meta">{truncate(summary, 200)}</span> : null}
        <ResultBadge result={result} />
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result?: Props['result'] }) {
  const t = useT();
  if (!result) return <span className="op-status op-status-running">{t('tool.running')}</span>;
  if (result.isError) return <span className="op-status op-status-error">{t('tool.error')}</span>;
  return <span className="op-status op-status-ok">{t('tool.done')}</span>;
}

function describeInput(input: unknown): string {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  if (typeof input !== 'object') return String(input);
  const obj = input as Record<string, unknown>;
  for (const key of ['file_path', 'path', 'pattern', 'url', 'query', 'name', 'command']) {
    const v = obj[key];
    if (typeof v === 'string') return v;
  }
  try {
    return JSON.stringify(obj);
  } catch {
    return '';
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function shortenMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const edge = Math.max(3, Math.floor((maxLength - 1) / 2));
  return `${value.slice(0, edge)}…${value.slice(-edge)}`;
}

function humanizeToolName(tool: string): string {
  return tool
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

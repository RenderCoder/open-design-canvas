// @ts-nocheck
function safeParseJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stringifyContent(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function summarizeValue(value, maxLength = 240) {
  const text = stringifyContent(value).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function codexItemId(item, fallbackPrefix, state) {
  if (typeof item?.id === 'string' && item.id.length > 0) return item.id;
  state.codexSyntheticId += 1;
  return `${fallbackPrefix}-${state.codexSyntheticId}`;
}

function codexToolNameForMcp(item) {
  const server =
    typeof item?.server === 'string'
      ? item.server
      : typeof item?.mcp_server === 'string'
        ? item.mcp_server
        : typeof item?.server_name === 'string'
          ? item.server_name
          : '';
  const tool =
    typeof item?.tool === 'string'
      ? item.tool
      : typeof item?.tool_name === 'string'
        ? item.tool_name
        : typeof item?.name === 'string'
          ? item.name
          : 'mcp_tool';
  return server ? `${server}.${tool}` : tool;
}

function codexMcpInput(item, order) {
  const server =
    typeof item?.server === 'string'
      ? item.server
      : typeof item?.mcp_server === 'string'
        ? item.mcp_server
        : typeof item?.server_name === 'string'
          ? item.server_name
          : undefined;
  const tool =
    typeof item?.tool === 'string'
      ? item.tool
      : typeof item?.tool_name === 'string'
        ? item.tool_name
        : typeof item?.name === 'string'
          ? item.name
          : 'mcp_tool';
  const args =
    item?.arguments ??
    item?.args ??
    item?.input ??
    item?.parameters ??
    null;
  return {
    kind: 'mcp_tool_call',
    server,
    tool,
    status: typeof item?.status === 'string' ? item.status : undefined,
    args,
    argsSummary: summarizeValue(args),
    order,
  };
}

function codexToolResultContent(item) {
  return stringifyContent(
    item?.result ??
      item?.output ??
      item?.content ??
      item?.aggregated_output ??
      item?.error ??
      '',
  );
}

function codexToolIsError(item) {
  if (typeof item?.is_error === 'boolean') return item.is_error;
  if (typeof item?.isError === 'boolean') return item.isError;
  if (typeof item?.exit_code === 'number') return item.exit_code !== 0;
  return item?.status === 'failed' || item?.status === 'error';
}

function emitCodexToolUse(state, onEvent, id, name, input) {
  if (state.codexToolUses.has(id)) return;
  state.codexToolUses.add(id);
  onEvent({ type: 'tool_use', id, name, input });
}

function formatOpenCodeUsage(tokens) {
  if (!tokens || typeof tokens !== 'object') return null;
  const usage = {};
  if (typeof tokens.input === 'number') usage.input_tokens = tokens.input;
  if (typeof tokens.output === 'number') usage.output_tokens = tokens.output;
  if (typeof tokens.reasoning === 'number') usage.thought_tokens = tokens.reasoning;
  if (tokens.cache && typeof tokens.cache === 'object') {
    if (typeof tokens.cache.read === 'number') usage.cached_read_tokens = tokens.cache.read;
    if (typeof tokens.cache.write === 'number') usage.cached_write_tokens = tokens.cache.write;
  }
  return Object.keys(usage).length > 0 ? usage : null;
}

function handleOpenCodeEvent(obj, onEvent, state) {
  if (!obj || typeof obj !== 'object') return false;
  const part = obj.part && typeof obj.part === 'object' ? obj.part : {};

  if (obj.type === 'step_start') {
    onEvent({ type: 'status', label: 'running' });
    return true;
  }

  if (obj.type === 'text' && typeof part.text === 'string' && part.text.length > 0) {
    onEvent({ type: 'text_delta', delta: part.text });
    return true;
  }

  if (obj.type === 'tool_use' && typeof part.tool === 'string' && typeof part.callID === 'string') {
    const statePart = part.state && typeof part.state === 'object' ? part.state : null;
    const key = `${obj.sessionID || 'session'}:${part.callID}`;
    if (!state.openCodeToolUses.has(key)) {
      state.openCodeToolUses.add(key);
      onEvent({
        type: 'tool_use',
        id: part.callID,
        name: part.tool,
        input: safeParseJson(statePart?.input) ?? statePart?.input ?? null,
      });
    }
    if (statePart?.status === 'completed') {
      onEvent({
        type: 'tool_result',
        toolUseId: part.callID,
        content: stringifyContent(statePart.output),
        isError: false,
      });
    }
    return true;
  }

  if (obj.type === 'step_finish') {
    const usage = formatOpenCodeUsage(part.tokens);
    if (usage) {
      onEvent({
        type: 'usage',
        usage,
        costUsd: typeof part.cost === 'number' ? part.cost : undefined,
      });
    }
    return true;
  }

  if (obj.type === 'error') {
    const message =
      (obj.error && typeof obj.error === 'object' && obj.error.data?.message) ||
      (obj.error && typeof obj.error === 'object' && obj.error.name) ||
      'OpenCode error';
    onEvent({ type: 'raw', line: stringifyContent({ type: 'error', message }) });
    return true;
  }

  return false;
}

function handleGeminiEvent(obj, onEvent) {
  if (!obj || typeof obj !== 'object') return false;

  if (obj.type === 'init') {
    onEvent({
      type: 'status',
      label: 'initializing',
      model: typeof obj.model === 'string' ? obj.model : undefined,
    });
    return true;
  }

  if (
    obj.type === 'message' &&
    obj.role === 'assistant' &&
    typeof obj.content === 'string' &&
    obj.content.length > 0
  ) {
    onEvent({ type: 'text_delta', delta: obj.content });
    return true;
  }

  if (obj.type === 'result' && obj.stats && typeof obj.stats === 'object') {
    const usage = {};
    if (typeof obj.stats.input_tokens === 'number') usage.input_tokens = obj.stats.input_tokens;
    if (typeof obj.stats.output_tokens === 'number') usage.output_tokens = obj.stats.output_tokens;
    if (typeof obj.stats.cached === 'number') usage.cached_read_tokens = obj.stats.cached;
    onEvent({
      type: 'usage',
      usage,
      durationMs: typeof obj.stats.duration_ms === 'number' ? obj.stats.duration_ms : undefined,
    });
    return true;
  }

  return false;
}

function extractCursorText(message) {
  const blocks = Array.isArray(message?.content) ? message.content : [];
  return blocks
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
}

function emitCursorTextDelta(text, onEvent, state) {
  if (!state.cursorTextSoFar) {
    state.cursorTextSoFar = text;
    onEvent({ type: 'text_delta', delta: text });
    return;
  }
  if (text === state.cursorTextSoFar) {
    return;
  }
  if (text.startsWith(state.cursorTextSoFar)) {
    const delta = text.slice(state.cursorTextSoFar.length);
    if (delta) onEvent({ type: 'text_delta', delta });
    state.cursorTextSoFar = text;
    return;
  }
  state.cursorTextSoFar += text;
  onEvent({ type: 'text_delta', delta: text });
}

function handleCursorEvent(obj, onEvent, state) {
  if (!obj || typeof obj !== 'object') return false;

  if (obj.type === 'system' && obj.subtype === 'init') {
    onEvent({
      type: 'status',
      label: 'initializing',
      model: typeof obj.model === 'string' ? obj.model : undefined,
    });
    return true;
  }

  if (obj.type === 'assistant' && obj.message) {
    const text = extractCursorText(obj.message);
    if (!text) return false;
    if (typeof obj.timestamp_ms === 'number') {
      emitCursorTextDelta(text, onEvent, state);
      return true;
    }
    emitCursorTextDelta(text, onEvent, state);
    return true;
  }

  if (obj.type === 'result' && obj.usage && typeof obj.usage === 'object') {
    const usage = {};
    if (typeof obj.usage.inputTokens === 'number') usage.input_tokens = obj.usage.inputTokens;
    if (typeof obj.usage.outputTokens === 'number') usage.output_tokens = obj.usage.outputTokens;
    if (typeof obj.usage.cacheReadTokens === 'number') {
      usage.cached_read_tokens = obj.usage.cacheReadTokens;
    }
    if (typeof obj.usage.cacheWriteTokens === 'number') {
      usage.cached_write_tokens = obj.usage.cacheWriteTokens;
    }
    onEvent({
      type: 'usage',
      usage,
      durationMs: typeof obj.duration_ms === 'number' ? obj.duration_ms : undefined,
    });
    return true;
  }

  return false;
}

function handleCodexEvent(obj, onEvent, state) {
  if (!obj || typeof obj !== 'object') return false;

  if (obj.type === 'thread.started') {
    onEvent({ type: 'status', label: 'initializing' });
    return true;
  }

  if (obj.type === 'turn.started') {
    onEvent({ type: 'status', label: 'running' });
    return true;
  }

  if (obj.type === 'item.started' && obj.item && typeof obj.item === 'object') {
    const item = obj.item;
    if (item.type === 'command_execution' && typeof item.id === 'string') {
      emitCodexToolUse(state, onEvent, item.id, 'Bash', {
        command: typeof item.command === 'string' ? item.command : '',
      });
      return true;
    }
    if (item.type === 'mcp_tool_call' || item.type === 'function_call' || item.type === 'tool_call') {
      const id = codexItemId(item, 'codex-tool', state);
      const order = state.codexToolUses.has(id)
        ? state.codexEventOrder
        : (state.codexEventOrder += 1);
      emitCodexToolUse(state, onEvent, id, codexToolNameForMcp(item), codexMcpInput(item, order));
      return true;
    }
    if (item.type === 'file_change' || item.type === 'file_changes') {
      const id = codexItemId(item, 'codex-file-change', state);
      emitCodexToolUse(state, onEvent, id, 'FileChange', {
        changes: Array.isArray(item.changes) ? item.changes : [],
        status: typeof item.status === 'string' ? item.status : undefined,
      });
      return true;
    }
    if (item.type === 'web_search') {
      const id = codexItemId(item, 'codex-web-search', state);
      emitCodexToolUse(state, onEvent, id, 'WebSearch', {
        query: typeof item.query === 'string' ? item.query : '',
      });
      return true;
    }
    if (item.type === 'plan_update' || item.type === 'todo_list') {
      const id = codexItemId(item, 'codex-plan-update', state);
      emitCodexToolUse(state, onEvent, id, 'PlanUpdate', {
        items: Array.isArray(item.items) ? item.items : [],
        status: typeof item.status === 'string' ? item.status : undefined,
      });
      return true;
    }
  }

  if (obj.type === 'item.completed' && obj.item && typeof obj.item === 'object') {
    const item = obj.item;
    if (item.type === 'command_execution' && typeof item.id === 'string') {
      emitCodexToolUse(state, onEvent, item.id, 'Bash', {
        command: typeof item.command === 'string' ? item.command : '',
      });
      onEvent({
        type: 'tool_result',
        toolUseId: item.id,
        content: stringifyContent(item.aggregated_output ?? ''),
        isError: typeof item.exit_code === 'number' ? item.exit_code !== 0 : item.status === 'failed',
      });
      return true;
    }
    if (item.type === 'mcp_tool_call' || item.type === 'function_call' || item.type === 'tool_call') {
      const id = codexItemId(item, 'codex-tool', state);
      const order = state.codexToolUses.has(id)
        ? state.codexEventOrder
        : (state.codexEventOrder += 1);
      emitCodexToolUse(state, onEvent, id, codexToolNameForMcp(item), codexMcpInput(item, order));
      onEvent({
        type: 'tool_result',
        toolUseId: id,
        content: codexToolResultContent(item),
        isError: codexToolIsError(item),
      });
      return true;
    }
    if (item.type === 'file_change' || item.type === 'file_changes') {
      const id = codexItemId(item, 'codex-file-change', state);
      emitCodexToolUse(state, onEvent, id, 'FileChange', {
        changes: Array.isArray(item.changes) ? item.changes : [],
        status: typeof item.status === 'string' ? item.status : undefined,
      });
      onEvent({
        type: 'tool_result',
        toolUseId: id,
        content: summarizeValue(item.changes ?? item.status ?? ''),
        isError: codexToolIsError(item),
      });
      return true;
    }
    if (item.type === 'web_search') {
      const id = codexItemId(item, 'codex-web-search', state);
      emitCodexToolUse(state, onEvent, id, 'WebSearch', {
        query: typeof item.query === 'string' ? item.query : '',
      });
      onEvent({
        type: 'tool_result',
        toolUseId: id,
        content: codexToolResultContent(item),
        isError: codexToolIsError(item),
      });
      return true;
    }
    if (item.type === 'plan_update' || item.type === 'todo_list') {
      const id = codexItemId(item, 'codex-plan-update', state);
      emitCodexToolUse(state, onEvent, id, 'PlanUpdate', {
        items: Array.isArray(item.items) ? item.items : [],
        status: typeof item.status === 'string' ? item.status : undefined,
      });
      onEvent({
        type: 'tool_result',
        toolUseId: id,
        content: `${Array.isArray(item.items) ? item.items.length : 0} item(s)`,
        isError: false,
      });
      return true;
    }
  }

  if (
    obj.type === 'item.completed' &&
    obj.item &&
    typeof obj.item === 'object' &&
    obj.item.type === 'agent_message' &&
    typeof obj.item.text === 'string' &&
    obj.item.text.length > 0
  ) {
    onEvent({ type: 'text_delta', delta: obj.item.text });
    return true;
  }

  if (obj.type === 'item.completed' && obj.item && typeof obj.item === 'object') {
    const item = obj.item;
    if (item.type === 'reasoning' || item.type === 'summary') {
      const text =
        typeof item.text === 'string'
          ? item.text
          : typeof item.summary === 'string'
            ? item.summary
            : stringifyContent(item.content);
      if (text.length > 0) {
        onEvent({ type: 'thinking_delta', delta: text });
        return true;
      }
    }
  }

  if (obj.type === 'turn.completed' && obj.usage && typeof obj.usage === 'object') {
    const usage = {};
    if (typeof obj.usage.input_tokens === 'number') usage.input_tokens = obj.usage.input_tokens;
    if (typeof obj.usage.output_tokens === 'number') usage.output_tokens = obj.usage.output_tokens;
    if (typeof obj.usage.cached_input_tokens === 'number') {
      usage.cached_read_tokens = obj.usage.cached_input_tokens;
    }
    onEvent({ type: 'usage', usage });
    return true;
  }

  if (obj.type === 'error') {
    const message =
      typeof obj.message === 'string'
        ? obj.message
        : typeof obj.error === 'string'
          ? obj.error
          : stringifyContent(obj.error || obj);
    onEvent({ type: 'status', label: 'error', detail: message });
    return true;
  }

  return false;
}

export function createJsonEventStreamHandler(kind, onEvent) {
  let buffer = '';
  const state = {
    cursorTextSoFar: '',
    openCodeToolUses: new Set(),
    codexToolUses: new Set(),
    codexEventOrder: 0,
    codexSyntheticId: 0,
  };

  function handleLine(line) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      onEvent({ type: 'raw', line });
      return;
    }

    if (kind === 'opencode' && handleOpenCodeEvent(obj, onEvent, state)) return;
    if (kind === 'gemini' && handleGeminiEvent(obj, onEvent)) return;
    if (kind === 'cursor-agent' && handleCursorEvent(obj, onEvent, state)) return;
    if (kind === 'codex' && handleCodexEvent(obj, onEvent, state)) return;

    onEvent({ type: 'raw', line });
  }

  function feed(chunk) {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      handleLine(line);
    }
  }

  function flush() {
    const rem = buffer.trim();
    buffer = '';
    if (!rem) return;
    handleLine(rem);
  }

  return { feed, flush };
}

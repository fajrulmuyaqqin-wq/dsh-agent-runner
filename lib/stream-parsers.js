// Stream Parser for Agent CLI Subprocess Output (NDJSON & Text)

/**
 * Creates a stream line parser that transforms chunks into structured events.
 *
 * @param {string} agentId
 * @param {(event: Record<string, any>) => void} onEvent
 * @returns {((chunk: Buffer | string) => void) & { flush: () => void }}
 */
export function createStreamParser(agentId, onEvent) {
  let buffer = '';

  const parseLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let json = null;
    try {
      json = JSON.parse(trimmed);
    } catch {
      if (trimmed.includes('Failed to refresh token') || trimmed.includes('Please log out and sign in again')) {
        onEvent({
          type: 'error',
          message: 'OpenAI Codex Authentication Error: Sesi token kedaluwarsa. Jalankan "codex logout" lalu "codex login" di terminal, atau masukkan OPENAI_API_KEY pada "+ Custom API Key".'
        });
        return;
      }
      // Not JSON, fallback to plain text delta
      onEvent({
        type: 'text_delta',
        text: line + '\n'
      });
      return;
    }

    // Antigravity (agy) format matching OpenDesign json-event-stream
    if (agentId === 'agy') {
      if (json.event === 'init') {
        onEvent({
          type: 'status',
          status: 'running',
          sessionId: json.conversation_id || null
        });
        return;
      }

      if (json.event === 'step_update') {
        const step = json.step_update || {};
        if (step.step_type === 'agent_response') {
          if (typeof step.text_delta === 'string' && step.text_delta) {
            onEvent({ type: 'text_delta', text: step.text_delta });
          }
          if (step.usage) {
            onEvent({ type: 'usage', usage: step.usage });
          }
          return;
        }

        if (step.step_type === 'tool') {
          const toolInfo = step.tool_info || {};
          const name = toolInfo.name || step.tool_name || 'tool';
          const id = `${String(step.conversation_id || json.conversation_id || '')}:${String(step.step_index ?? '')}`;
          onEvent({
            type: 'tool_use',
            id,
            name,
            input: toolInfo.parameters || {}
          });
          if (step.state === 'DONE' || step.state === 'ERROR') {
            onEvent({
              type: 'tool_result',
              toolUseId: id,
              content: typeof toolInfo.output === 'string' ? toolInfo.output : JSON.stringify(toolInfo.output || ''),
              isError: step.state === 'ERROR'
            });
          }
          return;
        }

        // If step_update has delta directly
        if (step.delta || step.text) {
          onEvent({ type: 'text_delta', text: step.delta || step.text });
          return;
        }
        return;
      }

      if (json.event === 'result') {
        const result = json.result || {};
        if (result.status && result.status !== 'SUCCESS') {
          onEvent({
            type: 'error',
            message: result.error || `Antigravity ended with status ${result.status}`
          });
          return;
        }
        if (typeof result.response === 'string' && result.response) {
          onEvent({ type: 'text_delta', text: result.response });
        }
        if (result.usage) {
          onEvent({ type: 'usage', usage: result.usage });
        }
        onEvent({
          type: 'done',
          status: 'completed'
        });
        return;
      }

      if (json.event === 'agent_response' || json.type === 'agent_response') {
        const text = json.content || json.delta || (json.message && json.message.content) || '';
        if (text) onEvent({ type: 'text_delta', text });
        return;
      }

      if (json.event === 'thinking' || json.type === 'thinking') {
        const text = json.thought || json.content || '';
        if (text) onEvent({ type: 'thinking_delta', text });
        return;
      }

      if (json.type === 'tool_use' || json.event === 'tool_use') {
        onEvent({
          type: 'tool_use',
          id: json.tool_id || json.id || String(Date.now()),
          name: json.tool_name || json.name || 'tool',
          input: json.parameters || json.input || {}
        });
        return;
      }

      if (json.type === 'tool_result' || json.event === 'tool_result') {
        onEvent({
          type: 'tool_result',
          toolUseId: json.tool_id || json.id,
          content: typeof json.output === 'string' ? json.output : JSON.stringify(json.output || ''),
          isError: json.status === 'error' || Boolean(json.error)
        });
        return;
      }

      if (json.type === 'result' || json.event === 'result') {
        if (json.stats) {
          onEvent({ type: 'usage', usage: json.stats });
        }
        onEvent({
          type: 'done',
          status: json.status || 'completed'
        });
        return;
      }

      if (json.type === 'error' || json.event === 'error') {
        onEvent({
          type: 'error',
          message: json.message || json.error || 'Antigravity execution error'
        });
        return;
      }
    }

    // Claude Code format
    if (agentId === 'claude') {
      if (json.type === 'stream_event' && json.event) {
        const ev = json.event;
        if (ev.type === 'content_block_delta') {
          if (ev.delta?.text) onEvent({ type: 'text_delta', text: ev.delta.text });
          else if (ev.delta?.thinking) onEvent({ type: 'thinking_delta', text: ev.delta.thinking });
        }
        return;
      }

      if (json.type === 'content_block_delta') {
        if (json.delta?.text) onEvent({ type: 'text_delta', text: json.delta.text });
        else if (json.delta?.thinking) onEvent({ type: 'thinking_delta', text: json.delta.thinking });
        return;
      }

      if (json.type === 'assistant' && json.message && Array.isArray(json.message.content)) {
        for (const block of json.message.content) {
          if (block.type === 'text' && block.text) {
            onEvent({ type: 'text_delta', text: block.text });
          } else if (block.type === 'thinking' && block.thinking) {
            onEvent({ type: 'thinking_delta', text: block.thinking });
          } else if (block.type === 'tool_use') {
            onEvent({
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: block.input
            });
          }
        }
        if (json.error === 'authentication_failed' || json.is_api_error_message) {
          onEvent({
            type: 'error',
            message: 'Claude CLI Authentication Failed: Not logged in. Gunakan "+ Custom API Key" dengan ANTHROPIC_API_KEY atau jalankan "claude auth login" di terminal.'
          });
        }
        return;
      }

      if (json.type === 'tool_result') {
        onEvent({
          type: 'tool_result',
          toolUseId: json.tool_use_id,
          content: typeof json.content === 'string' ? json.content : JSON.stringify(json.content || ''),
          isError: Boolean(json.is_error)
        });
        return;
      }

      if (json.type === 'result') {
        if (json.is_error) {
          onEvent({
            type: 'error',
            message: json.result || 'Claude CLI execution error'
          });
        }
        onEvent({
          type: 'done',
          status: json.is_error ? 'failed' : (json.subtype || 'completed'),
          cost: json.total_cost || json.total_cost_usd,
          durationMs: json.duration_ms
        });
        return;
      }
    }

    // OpenAI Codex format
    if (agentId === 'codex') {
      if (json.type === 'thread.started') {
        onEvent({ type: 'status', status: 'running', threadId: json.thread_id });
        return;
      }

      if (json.type === 'item.completed' && json.item) {
        const item = json.item;
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.text) onEvent({ type: 'text_delta', text: c.text });
          }
          return;
        }
        if (item.type === 'function_call') {
          onEvent({
            type: 'tool_use',
            id: item.call_id || item.id || 'codex_tool',
            name: item.name || 'tool',
            input: item.arguments || {}
          });
          return;
        }
        if (item.type === 'function_call_output') {
          onEvent({
            type: 'tool_result',
            toolUseId: item.call_id || item.id,
            content: typeof item.output === 'string' ? item.output : JSON.stringify(item.output || ''),
            isError: false
          });
          return;
        }
      }

      if (json.type === 'error' || json.type === 'turn.failed') {
        const errMsg = json.message || (json.error && json.error.message) || 'Codex error';
        const isAuthError = errMsg.includes('access token could not be refreshed') ||
          errMsg.includes('Unauthorized') ||
          errMsg.includes('Please log out and sign in again') ||
          errMsg.includes('Missing bearer');

        onEvent({
          type: 'error',
          message: isAuthError
            ? 'OpenAI Codex Authentication Error: Token akses kedaluwarsa atau belum login. Jalankan "codex logout" lalu "codex login" di terminal, atau masukkan OPENAI_API_KEY pada "+ Custom API Key".'
            : errMsg
        });
        return;
      }

      if (json.type === 'turn.completed') {
        onEvent({ type: 'done', status: 'completed' });
        return;
      }
    }

    // OpenCode format
    if (agentId === 'opencode') {
      if (json.type === 'step_start') {
        onEvent({ type: 'status', status: 'running', sessionId: json.sessionID });
        return;
      }
      if (json.type === 'error') {
        const errMsg = json.error?.message || json.message || (typeof json.error === 'string' ? json.error : JSON.stringify(json.error || 'OpenCode error'));
        onEvent({
          type: 'error',
          message: errMsg
        });
        return;
      }
      if (json.type === 'text' || json.type === 'content') {
        const text = json.part?.text || json.text || json.content || '';
        if (text) onEvent({ type: 'text_delta', text });
        return;
      }
      if (json.type === 'thought' || json.type === 'thinking') {
        const text = json.part?.text || json.text || json.thought || '';
        if (text) onEvent({ type: 'thinking_delta', text });
        return;
      }
      if (json.type === 'tool_use' || json.type === 'tool_call') {
        const part = json.part || json;
        onEvent({
          type: 'tool_use',
          id: part.id || String(Date.now()),
          name: part.name || part.tool || 'tool',
          input: part.input || part.parameters || {}
        });
        return;
      }
      if (json.type === 'tool_result') {
        const part = json.part || json;
        onEvent({
          type: 'tool_result',
          toolUseId: part.toolUseId || part.id,
          content: typeof part.output === 'string' ? part.output : JSON.stringify(part.output || ''),
          isError: Boolean(part.isError)
        });
        return;
      }
      if (json.type === 'step_finish' || json.type === 'done' || json.type === 'session_completed') {
        onEvent({ type: 'done', status: 'completed' });
        return;
      }
    }

    // Cursor Agent format
    if (agentId === 'cursor-agent') {
      if (json.type === 'text_delta' || json.type === 'text-delta') {
        const text = json.text || json.delta || '';
        if (text) onEvent({ type: 'text_delta', text });
        return;
      }
      if (json.type === 'assistant' && json.message?.content) {
        const content = json.message.content;
        const text = typeof content === 'string' ? content : (Array.isArray(content) ? content.map(b => b.text || '').join('') : '');
        if (text) onEvent({ type: 'text_delta', text });
        return;
      }
      if (json.type === 'thinking_delta' || json.type === 'thought') {
        const text = json.text || json.thought || '';
        if (text) onEvent({ type: 'thinking_delta', text });
        return;
      }
      if (json.type === 'error') {
        onEvent({
          type: 'error',
          message: json.message || json.error || 'Cursor Agent error'
        });
        return;
      }
      if (json.type === 'done' || json.type === 'result') {
        onEvent({ type: 'done', status: 'completed' });
        return;
      }
    }

    // Generic JSON fallback (Codex, OpenCode, etc.)
    if (json.text || json.content) {
      onEvent({ type: 'text_delta', text: json.text || json.content });
      return;
    }
    if (json.type === 'text_delta' || json.type === 'thinking_delta') {
      onEvent(json);
      return;
    }

    // If completely unknown JSON, output formatted
    onEvent({
      type: 'text_delta',
      text: JSON.stringify(json, null, 2) + '\n'
    });
  };

  const feed = (chunk) => {
    buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      parseLine(line);
    }
  };

  feed.flush = () => {
    if (buffer.trim()) {
      parseLine(buffer);
      buffer = '';
    }
  };

  return feed;
}

import { spawn } from 'node:child_process';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';
import { getCandidateToolchainDirs, resolveBinary } from './executables.js';
import { getAgentDef } from './runtimes.js';
import { RUN_STATUS } from './types.js';

const IS_WIN = process.platform === 'win32';

/**
 * Executes an Agent CLI turn using the official Agent Client Protocol (ACP) over stdio JSON-RPC 2.0.
 *
 * @param {object} options
 * @param {string} options.agentId
 * @param {string} options.prompt
 * @param {string} [options.cwd]
 * @param {string} [options.model]
 * @param {(event: Record<string, any>) => void} onEvent
 * @returns {Promise<{ runId: string, pid: number, sessionId: string, cancel: () => void }>}
 */
export async function spawnAcpAgentRun(options, onEvent) {
  const { agentId = 'agy', prompt, cwd = process.cwd(), model } = options;
  const def = getAgentDef(agentId);
  if (!def) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const binPath = resolveBinary(def.bin, def.fallbackBins);
  if (!binPath) {
    throw new Error(`Binary for ${def.name} ('${def.bin}') was not found in PATH.`);
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();

  // Toolchain directories in PATH
  const toolchainDirs = getCandidateToolchainDirs();
  const envPath = [...toolchainDirs, process.env.PATH || ''].join(path.delimiter);
  const env = {
    ...process.env,
    PATH: envPath,
    CI: '1',
    NONINTERACTIVE: '1',
    ...(options.apiKey ? {
      GEMINI_API_KEY: options.apiKey,
      ANTHROPIC_API_KEY: options.apiKey,
      OPENAI_API_KEY: options.apiKey
    } : {}),
    ...(options.customEnv || {})
  };

  // Determine ACP command args
  const acpArgs = def.acpArgs || ['acp', '--stdio', '--dangerously-skip-permissions'];

  onEvent({
    type: 'status',
    status: RUN_STATUS.STARTING,
    agentId,
    model: model || 'default',
    runId,
    protocol: 'acp'
  });

  const child = spawn(binPath, acpArgs, {
    cwd,
    env,
    detached: !IS_WIN,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const pid = child.pid;
  let terminated = false;
  let activeSessionId = null;

  // JSON-RPC State
  let nextRpcId = 1;
  const pendingRequests = new Map();

  function sendRpc(method, params) {
    const id = nextRpcId++;
    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject, method });
      const frame = `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`;
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write(frame);
      } else {
        reject(new Error(`Child stdin not writable for RPC: ${method}`));
      }
    });
  }

  function sendNotification(method, params) {
    const frame = `${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`;
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.write(frame);
    }
  }

  function sendResult(id, result) {
    const frame = `${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`;
    if (child.stdin && !child.stdin.destroyed) {
      child.stdin.write(frame);
    }
  }

  const cancel = () => {
    if (terminated) return;
    terminated = true;

    if (activeSessionId) {
      try {
        sendNotification('session/cancel', { sessionId: activeSessionId });
      } catch {}
    }

    onEvent({
      type: 'status',
      status: RUN_STATUS.CANCELED,
      runId,
      detail: 'ACP Execution canceled by user'
    });

    if (pid) {
      try {
        if (!IS_WIN) {
          process.kill(-pid, 'SIGTERM');
          setTimeout(() => {
            try { process.kill(-pid, 'SIGKILL'); } catch {}
          }, 1500);
        } else {
          child.kill('SIGKILL');
        }
      } catch {}
    }
  };

  onEvent({
    type: 'status',
    status: RUN_STATUS.RUNNING,
    runId,
    pid,
    binPath,
    protocol: 'acp'
  });

  // Readline parser for stdout JSON-RPC frames
  const rl = readline.createInterface({
    input: child.stdout,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return;
    }

    // 1. Response to pending request
    if (typeof msg.id === 'number' && (msg.result !== undefined || msg.error !== undefined)) {
      const handler = pendingRequests.get(msg.id);
      if (handler) {
        pendingRequests.delete(msg.id);
        if (msg.error) {
          handler.reject(new Error(msg.error.message || `RPC Error on ${handler.method}`));
        } else {
          handler.resolve(msg.result);
        }
      }
      return;
    }

    // 2. Incoming request from child (e.g. session/request_permission)
    if (typeof msg.id === 'number' && msg.method) {
      if (msg.method === 'session/request_permission' || msg.method === 'session/requestPermission') {
        // Auto-approve permission requests in headless/automation mode
        sendResult(msg.id, { outcome: { outcome: 'allow_always' } });
      } else {
        sendResult(msg.id, {});
      }
      return;
    }

    // 3. Notification (e.g. session/update)
    if (msg.method === 'session/update' && msg.params) {
      const { update } = msg.params;
      if (!update) return;

      const updateType = update.sessionUpdate || update.type;

      // Text chunk from agent
      if (updateType === 'agent_message_chunk') {
        const text = update.content?.text || (typeof update.content === 'string' ? update.content : '');
        if (text) {
          onEvent({ type: 'text_delta', text, runId });
        }
      }

      // Thinking / reasoning chunk
      else if (updateType === 'thought_chunk') {
        const text = update.content?.text || update.thought || '';
        if (text) {
          onEvent({ type: 'thinking_delta', text, runId });
        }
      }

      // Tool call start
      else if (updateType === 'tool_call') {
        const id = update.toolCallId || String(Date.now());
        const name = update.name || update.title || 'tool';
        const input = update.args || update.rawInput || {};
        onEvent({
          type: 'tool_use',
          id,
          name,
          input,
          runId
        });
      }

      // Tool call update / result
      else if (updateType === 'tool_call_update') {
        const id = update.toolCallId;
        const isError = update.status === 'error';
        let content = '';
        if (typeof update.rawOutput?.output === 'string') {
          content = update.rawOutput.output;
        } else if (update.rawOutput) {
          content = JSON.stringify(update.rawOutput, null, 2);
        } else if (Array.isArray(update.content)) {
          content = update.content.map((c) => c.content?.text || '').join('\n');
        } else {
          content = String(update.content || '');
        }

        if (update.status === 'completed' || update.status === 'error') {
          onEvent({
            type: 'tool_result',
            toolUseId: id,
            content,
            isError,
            runId
          });
        }
      }

      // Session title update
      else if (updateType === 'session_info_update') {
        if (update.title) {
          onEvent({ type: 'status', status: 'running', title: update.title, runId });
        }
      }
    }
  });

  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    if (!terminated && text.trim()) {
      onEvent({ type: 'text_delta', text, stream: 'stderr', runId });
    }
  });

  child.on('error', (err) => {
    if (!terminated) {
      terminated = true;
      onEvent({ type: 'error', message: err.message, runId });
    }
  });

  child.on('close', (code, signal) => {
    const durationMs = Date.now() - startTime;
    if (!terminated) {
      terminated = true;
      onEvent({
        type: 'done',
        status: code === 0 ? RUN_STATUS.COMPLETED : RUN_STATUS.FAILED,
        code,
        signal,
        durationMs,
        runId
      });
    }
  });

  // Run the ACP Handshake & Prompt asynchronously
  (async () => {
    try {
      // Step 1: Initialize
      await sendRpc('initialize', {
        protocolVersion: 1,
        clientInfo: { name: 'deepseek-harness-acp-runner', version: '1.0' }
      });

      // Step 2: New Session
      const sessRes = await sendRpc('session/new', { cwd, mcpServers: [] });
      activeSessionId = sessRes.sessionId;

      onEvent({
        type: 'status',
        status: RUN_STATUS.RUNNING,
        sessionId: activeSessionId,
        models: sessRes.models,
        runId
      });

      // Step 3: Optional Model Selection via ACP session/set_model
      if (model && model !== 'default') {
        try {
          await sendRpc('session/set_model', {
            sessionId: activeSessionId,
            modelId: model
          });
        } catch {
          // If model doesn't match exact id, proceed with session default
        }
      }

      // Step 3b: Optional Native Execution Mode (plan, accept-edits, auto, default)
      if (options.mode && options.mode !== 'default') {
        try {
          await sendRpc('session/set_mode', {
            sessionId: activeSessionId,
            modeId: options.mode
          });
        } catch {}
      }

      // Step 3c: Optional Native Thinking Level (low, medium, high)
      if (options.thoughtLevel) {
        try {
          await sendRpc('session/set_config_option', {
            sessionId: activeSessionId,
            configOptionId: 'thought_level',
            value: options.thoughtLevel
          });
        } catch {}
      }

      // Step 4: Prompt
      const promptRes = await sendRpc('session/prompt', {
        sessionId: activeSessionId,
        prompt: [{ type: 'text', text: prompt }]
      });

      const durationMs = Date.now() - startTime;

      if (promptRes?.usage) {
        onEvent({
          type: 'usage',
          usage: promptRes.usage,
          runId
        });
      }

      if (!terminated) {
        terminated = true;
        const status = promptRes?.stopReason === 'end_turn' ? RUN_STATUS.COMPLETED : (promptRes?.stopReason || RUN_STATUS.COMPLETED);
        onEvent({
          type: 'done',
          status,
          durationMs,
          runId
        });
      }

      // Close ACP session politely
      try {
        await sendRpc('session/close', { sessionId: activeSessionId });
      } catch {}

      // Terminate child
      setTimeout(() => {
        try {
          if (!IS_WIN) process.kill(-pid, 'SIGTERM');
          else child.kill('SIGTERM');
        } catch {}
      }, 500);

    } catch (err) {
      if (!terminated) {
        terminated = true;
        onEvent({
          type: 'error',
          message: err.message,
          runId
        });
        cancel();
      }
    }
  })();

  return { runId, pid, cancel };
}

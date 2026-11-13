import crypto from 'node:crypto';
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import { runnerManager } from './state.js';
import { getOpenCodeModels } from './opencode.js';
import { getCliEnvironment } from './environment.js';
import { RUN_STATUS } from './types.js';

class AsyncChunkQueue {
  constructor() {
    this.queue = [];
    this.resolvers = [];
    this.ended = false;
  }

  push(chunk) {
    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift();
      resolve({ value: chunk, done: false });
    } else {
      this.queue.push(chunk);
    }
  }

  end() {
    this.ended = true;
    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift();
      resolve({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator]() {
    return {
      next: () => {
        if (this.queue.length > 0) {
          return Promise.resolve({ value: this.queue.shift(), done: false });
        }
        if (this.ended) {
          return Promise.resolve({ value: undefined, done: true });
        }
        return new Promise((resolve) => {
          this.resolvers.push(resolve);
        });
      }
    };
  }
}

/**
 * Extracts and formats conversational prompt from DeepSeek Harness message array.
 */
function buildCliPrompt(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return '';
  if (messages.length === 1) {
    const msg = messages[0];
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('\n');
    }
    return typeof msg.content === 'string' ? msg.content : '';
  }

  const lines = [];
  const history = messages.slice(0, -1);
  const last = messages[messages.length - 1];

  const dialogHistory = history.filter((m) => m.role === 'user' || m.role === 'assistant');
  if (dialogHistory.length > 0) {
    lines.push('### Previous Conversation Context:');
    for (const m of dialogHistory.slice(-6)) {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      const text = Array.isArray(m.content)
        ? m.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text)
            .join('\n')
        : (typeof m.content === 'string' ? m.content : '');
      if (text.trim()) {
        lines.push(`${role}: ${text.trim()}`);
      }
    }
    lines.push('\n### Current Request:');
  }

  const lastText = Array.isArray(last.content)
    ? last.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
    : (typeof last.content === 'string' ? last.content : '');
  lines.push(lastText.trim());
  return lines.join('\n');
}

export class CliAgentLlmAdapter extends LlmAdapter {
  constructor() {
    super();
    this.customModels = new Map();
  }

  rememberModel(provider, modelId) {
    if (!modelId) return;
    if (!this.customModels.has(provider)) {
      this.customModels.set(provider, new Set());
    }
    this.customModels.get(provider).add(modelId);
  }

  providerInfo(provider) {
    const map = {
      agy: 'Google Antigravity',
      opencode: 'OpenCode CLI',
      claude: 'Claude Code',
      codex: 'OpenAI Codex',
      'cursor-agent': 'Cursor Agent'
    };
    return {
      id: provider,
      name: map[provider] || provider
    };
  }

  async listModels(provider) {
    let result = [];
    if (provider === 'agy') {
      result = [
        { provider: 'agy', id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High)' },
        { provider: 'agy', id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium)' },
        { provider: 'agy', id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Low)' },
        { provider: 'agy', id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro' },
        { provider: 'agy', id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Thinking)' },
        { provider: 'agy', id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 (Thinking)' },
        { provider: 'agy', id: 'gpt-oss-120b-medium', name: 'GPT-OSS 120B (Medium)' },
        { provider: 'agy', id: 'default', name: 'Default Model (from CLI)' },
        { provider: 'agy', id: 'byok', name: 'Model BYOK (Parsed ke CLI)' },
      ];
    } else if (provider === 'opencode') {
      const baseModels = [
        { provider: 'opencode', id: 'opencode-go', name: 'OpenCode Go' },
        { provider: 'opencode', id: 'opencode', name: 'OpenCode Console' },
        { provider: 'opencode', id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
        { provider: 'opencode', id: 'openai/o3-mini', name: 'OpenAI o3-mini' },
        { provider: 'opencode', id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
        { provider: 'opencode', id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { provider: 'opencode', id: 'github-copilot', name: 'GitHub Copilot' },
        { provider: 'opencode', id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
        { provider: 'opencode', id: 'default', name: 'Default Model (CLI Auto)' },
        { provider: 'opencode', id: 'byok', name: 'Model BYOK (Parsed ke CLI)' },
      ];
      try {
        const discovered = getOpenCodeModels();
        if (Array.isArray(discovered)) {
          for (const m of discovered) {
            if (!baseModels.some((b) => b.id === m.id)) {
              baseModels.push({
                provider: 'opencode',
                id: m.id,
                name: m.name || m.id
              });
            }
          }
        }
      } catch {}
      result = baseModels;
    } else if (provider === 'claude') {
      result = [
        { provider: 'claude', id: 'sonnet', name: 'Claude 3.7 Sonnet' },
        { provider: 'claude', id: 'opus', name: 'Claude 3.5 Opus' },
        { provider: 'claude', id: 'haiku', name: 'Claude 3.5 Haiku' },
        { provider: 'claude', id: 'default', name: 'Default (Claude Sonnet 3.7)' },
        { provider: 'claude', id: 'byok', name: 'Model BYOK (Parsed ke CLI)' },
      ];
    } else if (provider === 'codex') {
      result = [
        { provider: 'codex', id: 'gpt-4o', name: 'GPT-4o' },
        { provider: 'codex', id: 'o3-mini', name: 'o3-mini' },
        { provider: 'codex', id: 'default', name: 'Default Codex' },
        { provider: 'codex', id: 'byok', name: 'Model BYOK (Parsed ke CLI)' },
      ];
    } else if (provider === 'cursor-agent') {
      result = [
        { provider: 'cursor-agent', id: 'default', name: 'Default Model' },
        { provider: 'cursor-agent', id: 'byok', name: 'Model BYOK (Parsed ke CLI)' },
      ];
    } else {
      result = [
        { provider, id: 'default', name: 'Default Model' },
        { provider, id: 'byok', name: 'Model BYOK (Parsed ke CLI)' },
      ];
    }

    // Merge any custom/dynamic models registered for this provider
    if (this.customModels.has(provider)) {
      for (const customId of this.customModels.get(provider)) {
        if (!result.some((m) => m.id === customId)) {
          result.push({
            provider,
            id: customId,
            name: customId
          });
        }
      }
    }

    return result;
  }

  async resolveModel(provider, model) {
    this.rememberModel(provider, model);
    const models = await this.listModels(provider);
    const found = models.find((m) => m.id === model);
    const cliEnv = getCliEnvironment(provider);

    return {
      provider,
      id: model,
      name: found?.name || model,
      inputModalities: ['text'],
      context: {
        // Native CLI Context: Dikelola mandiri oleh CLI agent.
        // Tidak dibatasi atau dipotong oleh aturan BYOK compaction.
        contextWindow: 10000000
      },
      cliEnvironment: {
        agentId: provider,
        bin: cliEnv.bin,
        contextMode: cliEnv.contextMode || 'native',
        isAutonomousCli: true
      }
    };
  }

  async *stream(options) {
    const { provider, model, messages, signal } = options;
    const prompt = buildCliPrompt(messages) || 'Hello';

    // Resolve model if 'byok'
    let effectiveModel = model;
    if (model === 'byok') {
      if (provider === 'agy') effectiveModel = 'gemini-3.8-flash-high';
      else if (provider === 'opencode') effectiveModel = 'opencode-go';
      else if (provider === 'claude') effectiveModel = 'sonnet';
      else if (provider === 'codex') effectiveModel = 'gpt-4o';
      else effectiveModel = 'default';
    }

    const queue = new AsyncChunkQueue();
    const textIndex = 0;
    const reasoningIndex = 1;
    let fullText = '';
    let fullReasoning = '';
    let hasTextStarted = false;
    let hasReasoningStarted = false;
    let finished = false;
    let usageEmitted = false;
    let runId = null;

    if (signal) {
      if (signal.aborted) {
        yield {
          type: 'finish',
          reason: { kind: 'aborted', failure: { message: 'Aborted', code: 'ABORTED' } }
        };
        return;
      }
      signal.addEventListener('abort', () => {
        if (!finished) {
          finished = true;
          if (runId) {
            runnerManager.cancelRun(runId);
          }
          queue.push({
            type: 'finish',
            reason: { kind: 'aborted', failure: { message: 'Aborted by user', code: 'ABORTED' } }
          });
          queue.end();
        }
      }, { once: true });
    }

    // Launch agent execution asynchronously with dedicated CLI environment
    (async () => {
      try {
        const cliEnv = getCliEnvironment(provider);
        const runRes = await runnerManager.startRun({
          agentId: provider,
          prompt,
          model: effectiveModel,
          cwd: cliEnv.cwd || process.cwd()
        });
        runId = runRes.runId;

        // Subscribe to SSE / events from this run
        const checkInterval = setInterval(() => {
          const run = runnerManager.getRun(runId);
          if (!run) return;

          // Check for newly accumulated text
          if (run.text && run.text.length > fullText.length) {
            const delta = run.text.slice(fullText.length);
            fullText = run.text;
            if (!hasTextStarted) {
              hasTextStarted = true;
              queue.push({ type: 'block-start', index: textIndex, blockType: 'text' });
            }
            queue.push({ type: 'text-delta', index: textIndex, text: delta });
          }

          // Check for newly accumulated reasoning/thinking
          if (run.thinking && run.thinking.length > fullReasoning.length) {
            const delta = run.thinking.slice(fullReasoning.length);
            fullReasoning = run.thinking;
            if (!hasReasoningStarted) {
              hasReasoningStarted = true;
              queue.push({ type: 'block-start', index: reasoningIndex, blockType: 'reasoning' });
            }
            queue.push({ type: 'reasoning-delta', index: reasoningIndex, text: delta });
          }

          // Check completion
          if (run.status === RUN_STATUS.COMPLETED || run.status === RUN_STATUS.FAILED || run.status === RUN_STATUS.CANCELED) {
            clearInterval(checkInterval);
            if (finished) return;
            finished = true;

            if (hasReasoningStarted) {
              queue.push({ type: 'block-end', index: reasoningIndex, block: { type: 'reasoning', text: fullReasoning } });
            }
            if (hasTextStarted) {
              queue.push({ type: 'block-end', index: textIndex, block: { type: 'text', text: fullText } });
            } else {
              const fallback = run.text || run.error || (run.status === RUN_STATUS.COMPLETED ? 'Success' : 'Execution ended.');
              queue.push({ type: 'block-start', index: textIndex, blockType: 'text' });
              queue.push({ type: 'text-delta', index: textIndex, text: fallback });
              queue.push({ type: 'block-end', index: textIndex, block: { type: 'text', text: fallback } });
            }

            if (!usageEmitted) {
              usageEmitted = true;
              const inTokens = Math.max(1, Math.round(prompt.length / 4));
              const outTokens = Math.max(1, Math.round((fullText.length + fullReasoning.length) / 4));
              queue.push({
                type: 'usage',
                usage: {
                  inputTokens: inTokens,
                  outputTokens: outTokens,
                  totalTokens: inTokens + outTokens
                }
              });
            }

            queue.push({
              type: 'finish',
              reason: run.status === RUN_STATUS.COMPLETED
                ? { kind: 'stop' }
                : run.status === RUN_STATUS.CANCELED
                  ? { kind: 'aborted', failure: { message: 'Canceled', code: 'CANCELED' } }
                  : { kind: 'error', failure: { message: run.error || 'Run failed', code: 'CLI_ERROR' } }
            });
            queue.end();
          }
        }, 40);

      } catch (err) {
        if (!finished) {
          finished = true;
          const msg = `Gagal menjalankan CLI agent "${provider}": ${err.message || 'Unknown error'}. Pastikan binary CLI sudah terpasang di sistem.`;
          queue.push({ type: 'block-start', index: textIndex, blockType: 'text' });
          queue.push({ type: 'text-delta', index: textIndex, text: msg });
          queue.push({ type: 'block-end', index: textIndex, block: { type: 'text', text: msg } });
          queue.push({
            type: 'finish',
            reason: { kind: 'error', failure: { message: err.message || 'Failed to start agent run', code: 'START_FAILED' } }
          });
          queue.end();
        }
      }
    })();

    for await (const chunk of queue) {
      yield chunk;
    }
  }
}

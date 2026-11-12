import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { getAgentDef } from './runtimes.js';
import { resolveBinary, getCandidateToolchainDirs } from './executables.js';
import { openCompletePromptAsStdin } from './prompt-staging.js';
import { createStreamParser } from './stream-parsers.js';
import { RUN_STATUS } from './types.js';

const IS_WIN = process.platform === 'win32';

/**
 * Executes an external Agent CLI using OpenDesign's staged-stdin and detached process group architecture.
 *
 * @param {object} options
 * @param {string} options.agentId
 * @param {string} options.prompt
 * @param {string} [options.cwd]
 * @param {string} [options.model]
 * @param {string} [options.effort]
 * @param {(event: Record<string, any>) => void} onEvent
 * @returns {Promise<{ runId: string, pid: number, cancel: () => void }>}
 */
export async function spawnAgentRun(options, onEvent) {
  const { agentId, prompt, cwd = process.cwd(), model, effort } = options;
  const def = getAgentDef(agentId);
  if (!def) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const binPath = resolveBinary(def.bin, def.fallbackBins);
  if (!binPath) {
    throw new Error(`Binary for ${def.name} ('${def.bin}') was not found in PATH or standard toolchain directories.`);
  }

  const runId = crypto.randomUUID();
  const startTime = Date.now();

  // 1. Build CLI arguments
  const args = def.buildArgs({ model, effort });

  // 2. Encode stdin according to agent protocol
  const encodedPrompt = def.encodeStdin(prompt);

  // 3. Stage prompt into a 0600 temp file and get read descriptor
  const stagedStdin = openCompletePromptAsStdin(encodedPrompt, runId);

  // 4. Prepare environment with toolchain paths prepended
  const toolchainDirs = getCandidateToolchainDirs();
  const envPath = [
    ...toolchainDirs,
    process.env.PATH || ''
  ].join(path.delimiter);

  const env = {
    ...process.env,
    PATH: envPath,
    // Disable interactive TUI prompts
    CI: '1',
    NONINTERACTIVE: '1',
    ...(options.apiKey ? {
      GEMINI_API_KEY: options.apiKey,
      ANTHROPIC_API_KEY: options.apiKey,
      OPENAI_API_KEY: options.apiKey
    } : {}),
    ...(options.customEnv || {})
  };

  // 5. Spawn child as process group leader (detached: true)
  onEvent({
    type: 'status',
    status: RUN_STATUS.STARTING,
    agentId,
    model: model || 'default',
    runId
  });

  const child = spawn(binPath, args, {
    cwd,
    env,
    detached: !IS_WIN,
    stdio: [stagedStdin.fd, 'pipe', 'pipe']
  });

  // Staged stdin descriptor can be safely closed by the parent; child keeps its duplicate.
  stagedStdin.release();

  const pid = child.pid;
  let terminated = false;

  const cancel = () => {
    if (terminated) return;
    terminated = true;
    onEvent({
      type: 'status',
      status: RUN_STATUS.CANCELED,
      runId,
      detail: 'Execution canceled by user'
    });

    if (pid) {
      try {
        if (!IS_WIN) {
          // Terminate the entire process group
          process.kill(-pid, 'SIGTERM');
          setTimeout(() => {
            try {
              process.kill(-pid, 'SIGKILL');
            } catch {}
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
    args
  });

  const parser = createStreamParser(agentId, (event) => {
    if (!terminated) {
      onEvent({ ...event, runId });
    }
  });

  child.stdout?.on('data', (chunk) => parser(chunk));
  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    // Forward stderr as status / text
    if (!terminated && text.trim()) {
      onEvent({
        type: 'text_delta',
        text: text,
        stream: 'stderr',
        runId
      });
    }
  });

  child.on('error', (err) => {
    if (!terminated) {
      terminated = true;
      onEvent({
        type: 'error',
        message: err.message,
        runId
      });
    }
  });

  child.on('close', (code, signal) => {
    parser.flush();
    const durationMs = Date.now() - startTime;
    if (!terminated) {
      terminated = true;
      const status = code === 0 ? RUN_STATUS.COMPLETED : RUN_STATUS.FAILED;
      onEvent({
        type: 'done',
        status,
        code,
        signal,
        durationMs,
        runId
      });
    }
  });

  return { runId, pid, cancel };
}

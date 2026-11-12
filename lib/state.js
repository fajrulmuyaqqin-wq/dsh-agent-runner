import { RUNTIME_AGENT_DEFS } from './runtimes.js';
import { resolveBinary, probeBinaryVersion } from './executables.js';
import { spawnAgentRun } from './process-runner.js';
import { spawnAcpAgentRun } from './acp-runner.js';
import { RUN_STATUS } from './types.js';

export class AgentRunnerManager {
  constructor() {
    this.runs = new Map();
    this.sseClients = new Map(); // runId -> Set<res>
    this.cachedAgents = null;
    this.cachedAgentsTime = 0;
  }

  /**
   * Scans and returns detected agents with installation state and models.
   */
  getDetectedAgents(force = false) {
    const now = Date.now();
    if (!force && this.cachedAgents && now - this.cachedAgentsTime < 5000) {
      return this.cachedAgents;
    }

    const agents = RUNTIME_AGENT_DEFS.map((def) => {
      const binPath = resolveBinary(def.bin, def.fallbackBins);
      let installed = false;
      let version = null;

      if (binPath) {
        installed = true;
        version = probeBinaryVersion(binPath, def.versionArgs);
      }

      return {
        id: def.id,
        name: def.name,
        bin: def.bin,
        installed,
        binPath,
        version,
        supportsAcp: Boolean(def.supportsAcp),
        models: def.models || []
      };
    });

    this.cachedAgents = agents;
    this.cachedAgentsTime = now;
    return agents;
  }

  /**
   * Starts a new agent run.
   */
  async startRun(options) {
    const runId = options.runId || crypto.randomUUID();
    const runRecord = {
      id: runId,
      agentId: options.agentId,
      model: options.model || 'default',
      prompt: options.prompt,
      cwd: options.cwd || process.cwd(),
      status: RUN_STATUS.STARTING,
      startTime: Date.now(),
      endTime: null,
      durationMs: null,
      text: '',
      thinking: '',
      tools: [],
      error: null,
      events: [],
      cancelFn: null
    };

    this.runs.set(runId, runRecord);

    const onEvent = (event) => {
      runRecord.events.push(event);

      if (event.type === 'status') {
        runRecord.status = event.status;
      } else if (event.type === 'text_delta') {
        runRecord.text += event.text;
      } else if (event.type === 'thinking_delta') {
        runRecord.thinking += event.text;
      } else if (event.type === 'tool_use') {
        runRecord.tools.push({
          id: event.id,
          name: event.name,
          input: event.input,
          output: null,
          isError: false
        });
      } else if (event.type === 'tool_result') {
        const tool = runRecord.tools.find((t) => t.id === event.toolUseId);
        if (tool) {
          tool.output = event.content;
          tool.isError = event.isError;
        }
      } else if (event.type === 'error') {
        runRecord.error = event.message;
        runRecord.status = RUN_STATUS.FAILED;
      } else if (event.type === 'done') {
        runRecord.status = event.status;
        runRecord.endTime = Date.now();
        runRecord.durationMs = event.durationMs;
      }

      this.broadcast(runId, event);
    };

    try {
      const def = RUNTIME_AGENT_DEFS.find((a) => a.id === options.agentId);
      const useAcp = def?.supportsAcp && options.protocol !== 'headless';
      const runner = useAcp
        ? await spawnAcpAgentRun({ ...options, runId }, onEvent)
        : await spawnAgentRun({ ...options, runId }, onEvent);

      runRecord.cancelFn = runner.cancel;
      runRecord.pid = runner.pid;
      runRecord.protocol = useAcp ? 'acp' : 'headless';
      return { runId, pid: runner.pid, protocol: runRecord.protocol };
    } catch (err) {
      runRecord.status = RUN_STATUS.FAILED;
      runRecord.error = err.message;
      onEvent({
        type: 'error',
        message: err.message,
        runId
      });
      throw err;
    }
  }

  cancelRun(runId) {
    const run = this.runs.get(runId);
    if (run && typeof run.cancelFn === 'function') {
      run.cancelFn();
      run.status = RUN_STATUS.CANCELED;
      run.endTime = Date.now();
      return true;
    }
    return false;
  }

  getRun(runId) {
    return this.runs.get(runId) || null;
  }

  getAllRuns() {
    return Array.from(this.runs.values()).reverse();
  }

  addSseClient(runId, res) {
    if (!this.sseClients.has(runId)) {
      this.sseClients.set(runId, new Set());
    }
    const set = this.sseClients.get(runId);
    set.add(res);

    // Send existing accumulated events for replay
    const run = this.runs.get(runId);
    if (run) {
      for (const ev of run.events) {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
      }
    }

    res.on('close', () => {
      set.delete(res);
      if (set.size === 0) {
        this.sseClients.delete(runId);
      }
    });
  }

  broadcast(runId, event) {
    const set = this.sseClients.get(runId);
    if (!set || set.size === 0) return;
    const msg = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of set) {
      try {
        client.write(msg);
      } catch {}
    }
  }
}

export const runnerManager = new AgentRunnerManager();

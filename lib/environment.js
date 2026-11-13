import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ENV_FILE_PATH = path.join(os.homedir(), '.dsh', 'agent-cli-env.json');

const DEFAULT_ENV_TEMPLATES = {
  agy: {
    id: 'agy',
    name: 'Google Antigravity',
    bin: 'agy',
    contextMode: 'native', // Native CLI context: independent from BYOK limits
    description: 'Autonomous CLI agent. Konteks, memori, dan eksekusi dikelola mandiri oleh agy.',
    env: {},
    extraArgs: [],
    cwd: '',
    defaultModel: 'gemini-3.8-flash-high',
    effort: 'high'
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode CLI',
    bin: 'opencode',
    contextMode: 'native',
    description: 'Autonomous CLI agent. Konteks, tools, dan provider dikelola mandiri oleh OpenCode engine.',
    env: {},
    extraArgs: [],
    cwd: '',
    defaultModel: 'opencode-go'
  },
  claude: {
    id: 'claude',
    name: 'Claude Code',
    bin: 'claude',
    contextMode: 'native',
    description: 'Autonomous CLI agent. Konteks percakapan dan perizinan dikelola mandiri oleh Claude Code.',
    env: {},
    extraArgs: [],
    cwd: '',
    defaultModel: 'sonnet'
  },
  codex: {
    id: 'codex',
    name: 'OpenAI Codex',
    bin: 'codex',
    contextMode: 'native',
    description: 'Autonomous CLI agent. Konteks dan eksekusi dikelola mandiri oleh OpenAI Codex.',
    env: {},
    extraArgs: [],
    cwd: '',
    defaultModel: 'gpt-4o'
  },
  'cursor-agent': {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    bin: 'cursor-agent',
    contextMode: 'native',
    description: 'Autonomous CLI agent. Konteks dikelola mandiri oleh Cursor agent.',
    env: {},
    extraArgs: [],
    cwd: '',
    defaultModel: 'default'
  }
};

/**
 * Loads the complete CLI Agent environments configuration from disk.
 */
export function loadAllEnvironments() {
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      const raw = fs.readFileSync(ENV_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULT_ENV_TEMPLATES };
      for (const [key, val] of Object.entries(parsed)) {
        merged[key] = {
          ...(DEFAULT_ENV_TEMPLATES[key] || {}),
          ...val
        };
      }
      return merged;
    }
  } catch (err) {
    console.warn('[dsh-agent-runner] Failed to read agent-cli-env.json:', err.message);
  }
  return { ...DEFAULT_ENV_TEMPLATES };
}

/**
 * Saves the complete CLI Agent environments configuration to disk.
 */
export function saveAllEnvironments(data) {
  try {
    const dir = path.dirname(ENV_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ENV_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[dsh-agent-runner] Failed to save agent-cli-env.json:', err.message);
    return false;
  }
}

/**
 * Retrieves environment configuration for a specific CLI agent.
 */
export function getCliEnvironment(agentId) {
  const all = loadAllEnvironments();
  return all[agentId] || {
    id: agentId,
    name: agentId,
    bin: agentId,
    contextMode: 'native',
    description: 'Autonomous CLI agent.',
    env: {},
    extraArgs: [],
    cwd: '',
    defaultModel: 'default'
  };
}

/**
 * Updates environment configuration for a specific CLI agent.
 */
export function updateCliEnvironment(agentId, updates = {}) {
  const all = loadAllEnvironments();
  const current = all[agentId] || {
    id: agentId,
    name: agentId,
    bin: agentId,
    contextMode: 'native',
    description: 'Autonomous CLI agent.',
    env: {},
    extraArgs: [],
    cwd: '',
    defaultModel: 'default'
  };

  all[agentId] = {
    ...current,
    ...updates,
    env: {
      ...(current.env || {}),
      ...(updates.env || {})
    },
    extraArgs: Array.isArray(updates.extraArgs)
      ? updates.extraArgs
      : (current.extraArgs || [])
  };

  saveAllEnvironments(all);
  return all[agentId];
}

/**
 * Resolves the full runtime execution environment for spawning a CLI agent.
 */
export function resolveCliExecutionEnvironment(agentId, options = {}) {
  const conf = getCliEnvironment(agentId);
  const cwd = options.cwd || conf.cwd || process.cwd();
  const customEnv = {
    ...(conf.env || {}),
    ...(options.customEnv || {})
  };
  const extraArgs = [
    ...(conf.extraArgs || []),
    ...(options.extraArgs || [])
  ];

  return {
    cwd,
    customEnv,
    extraArgs,
    contextMode: conf.contextMode || 'native',
    defaultModel: conf.defaultModel || 'default',
    effort: conf.effort || 'high'
  };
}

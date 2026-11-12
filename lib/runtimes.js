// Runtime Agent Definitions (OpenDesign Layer 1: Data Spec, Not a Class)

export const RUNTIME_AGENT_DEFS = [
  {
    id: 'agy',
    name: 'Google Antigravity',
    bin: 'agy',
    fallbackBins: [],
    versionArgs: ['--version'],
    supportsAcp: true,
    acpArgs: ['acp', '--stdio', '--dangerously-skip-permissions'],
    streamFormat: 'stream-json',
    buildArgs: (options = {}) => {
      const args = [
        '--dangerously-skip-permissions',
        '--input-format',
        'stream-json',
        '--output-format',
        'stream-json'
      ];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      if (options.effort) {
        args.push('--effort', options.effort);
      }
      return args;
    },
    encodeStdin: (prompt) => {
      return JSON.stringify({ event: 'user', message: { content: prompt } }) + '\n';
    },
    models: [
      { id: 'default', label: 'Default Model (from CLI)' },
      { id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' },
      { id: 'gemini-3.8-flash-medium', label: 'Gemini 3.8 Flash (Medium)' },
      { id: 'gemini-3.8-flash-low', label: 'Gemini 3.8 Flash (Low)' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Thinking)' },
      { id: 'claude-opus-4-6-thinking', label: 'Claude Opus 4.6 (Thinking)' },
      { id: 'gpt-oss-120b-medium', label: 'GPT-OSS 120B (Medium)' }
    ]
  },
  {
    id: 'claude',
    name: 'Claude Code',
    bin: 'claude',
    fallbackBins: ['openclaude'],
    versionArgs: ['--version'],
    streamFormat: 'claude-stream-json',
    buildArgs: (options = {}) => {
      const args = [
        '-p',
        '--dangerously-skip-permissions',
        '--input-format',
        'stream-json',
        '--output-format',
        'stream-json',
        '--verbose'
      ];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      return args;
    },
    encodeStdin: (prompt) => {
      return JSON.stringify({ type: 'user', message: { role: 'user', content: prompt } }) + '\n';
    },
    models: [
      { id: 'default', label: 'Default (Claude Sonnet 3.7)' },
      { id: 'sonnet', label: 'Claude 3.7 Sonnet' },
      { id: 'opus', label: 'Claude 3.5 Opus' },
      { id: 'haiku', label: 'Claude 3.5 Haiku' }
    ]
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    bin: 'codex',
    fallbackBins: [],
    versionArgs: ['--version'],
    streamFormat: 'codex-json',
    buildArgs: (options = {}) => {
      const args = [
        'exec',
        '--dangerously-bypass-approvals-and-sandbox',
        '--json'
      ];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      return args;
    },
    encodeStdin: (prompt) => prompt + '\n',
    models: [
      { id: 'default', label: 'Default Codex' },
      { id: 'o3-mini', label: 'o3-mini' },
      { id: 'gpt-4o', label: 'gpt-4o' }
    ]
  },
  {
    id: 'opencode',
    name: 'OpenCode CLI',
    bin: 'opencode',
    fallbackBins: [],
    versionArgs: ['--version'],
    streamFormat: 'opencode-json',
    buildArgs: (options = {}) => {
      const args = ['run', '--format', 'json'];
      if (options.model && options.model !== 'default') {
        args.push('--model', options.model);
      }
      return args;
    },
    encodeStdin: (prompt) => prompt + '\n',
    models: [
      { id: 'default', label: 'Default Model' }
    ]
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    bin: 'cursor-agent',
    fallbackBins: [],
    versionArgs: ['--version'],
    streamFormat: 'plain',
    buildArgs: () => ['--print'],
    encodeStdin: (prompt) => prompt + '\n',
    models: [
      { id: 'default', label: 'Default Model' }
    ]
  }
];

export function getAgentDef(agentId) {
  return RUNTIME_AGENT_DEFS.find((a) => a.id === agentId) || null;
}

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
      let model = options.model;
      if (model === 'byok' && options.byokModel) {
        const m = (options.byokModel || '').toLowerCase();
        const p = (options.provider || '').toLowerCase();
        if (p === 'google' || m.includes('gemini') || m.includes('flash')) {
          model = 'gemini-3.8-flash-high';
        } else if (p === 'anthropic' || m.includes('claude')) {
          model = 'claude-sonnet-4-6';
        } else {
          model = 'gpt-oss-120b-medium';
        }
      }
      if (model && model !== 'default' && model !== 'byok') {
        args.push('--model', model);
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
      { id: 'byok', label: 'Gunakan Model BYOK (Parsed ke CLI)' },
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
        '--include-partial-messages',
        '--verbose'
      ];
      let model = options.model;
      if (model === 'byok' && options.byokModel) {
        const m = (options.byokModel || '').toLowerCase();
        if (m.includes('opus')) model = 'opus';
        else if (m.includes('haiku')) model = 'haiku';
        else model = 'sonnet';
      }
      if (model && model !== 'default' && model !== 'byok') {
        args.push('--model', model);
      }
      return args;
    },
    encodeStdin: (prompt) => {
      return JSON.stringify({ type: 'user', message: { role: 'user', content: prompt } }) + '\n';
    },
    models: [
      { id: 'default', label: 'Default (Claude Sonnet 3.7)' },
      { id: 'byok', label: 'Gunakan Model BYOK (Parsed ke CLI)' },
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
      let model = options.model;
      if (model === 'byok' && options.byokModel) {
        const m = (options.byokModel || '').toLowerCase();
        if (m.includes('o3') || m.includes('mini') || m.includes('reasoning')) {
          model = 'o3-mini';
        } else {
          model = 'gpt-4o';
        }
      }
      if (model && model !== 'default' && model !== 'byok') {
        args.push('--model', model);
      }
      args.push('-');
      return args;
    },
    encodeStdin: (prompt) => prompt + '\n',
    models: [
      { id: 'default', label: 'Default Codex' },
      { id: 'byok', label: 'Gunakan Model BYOK (Parsed ke CLI)' },
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
      const args = ['run', '--format', 'json', '--auto'];
      let model = options.model;
      if (model === 'byok' && options.byokModel) {
        const cleanArg = options.byokModel.includes('/')
          ? options.byokModel
          : `${options.provider || 'openai'}/${options.byokModel}`;
        model = cleanArg;
      }
      if (model && model !== 'default' && model !== 'byok') {
        args.push('--model', model);
      }
      return args;
    },
    encodeStdin: (prompt) => prompt + '\n',
    models: [
      { id: 'default', label: 'Default Model (CLI Auto)' },
      { id: 'byok', label: 'Gunakan Model BYOK (Parsed ke CLI)' },
      { id: 'opencode-go', label: 'OpenCode Go (Official)' },
      { id: 'opencode', label: 'OpenCode Console (Account/Key)' },
      { id: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
      { id: 'openai/o3-mini', label: 'OpenAI o3-mini' },
      { id: 'anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'github-copilot', label: 'GitHub Copilot' },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' }
    ]
  },
  {
    id: 'cursor-agent',
    name: 'Cursor Agent',
    bin: 'cursor-agent',
    fallbackBins: [],
    versionArgs: ['--version'],
    streamFormat: 'stream-json',
    buildArgs: (options = {}) => {
      const args = ['-p', '--output-format', 'stream-json', '--stream-partial-output', '--force', '--trust'];
      let model = options.model;
      if (model && model !== 'default' && model !== 'byok') {
        args.push('--model', model);
      }
      return args;
    },
    encodeStdin: (prompt) => prompt + '\n',
    models: [
      { id: 'default', label: 'Default Model' },
      { id: 'byok', label: 'Gunakan Model BYOK (Parsed ke CLI)' }
    ]
  }
];

export function getAgentDef(agentId) {
  return RUNTIME_AGENT_DEFS.find((a) => a.id === agentId) || null;
}

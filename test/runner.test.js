import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveBinary, probeBinaryVersion } from '../lib/executables.js';
import { openCompletePromptAsStdin } from '../lib/prompt-staging.js';
import { getAgentDef, RUNTIME_AGENT_DEFS } from '../lib/runtimes.js';
import { createStreamParser } from '../lib/stream-parsers.js';
import { runnerManager } from '../lib/state.js';

test('1. Binary resolution detects agy binary', () => {
  const agyPath = resolveBinary('agy');
  assert.ok(agyPath, 'agy binary must be resolved');
  assert.ok(agyPath.endsWith('agy'), 'agy path must end with agy');
  assert.ok(fs.existsSync(agyPath), 'agy binary must exist on disk');

  const version = probeBinaryVersion(agyPath);
  assert.ok(version, 'Version probe must return a string');
  assert.ok(version.includes('1.') || version.includes('agy'), `Expected version string, got: ${version}`);
});

test('2. openCompletePromptAsStdin stages prompt with mode 0600 and gives valid fd', () => {
  const testPrompt = 'Hello OpenDesign Engine Staged Stdin!';
  const staged = openCompletePromptAsStdin(testPrompt);

  assert.ok(staged.fd > 0, 'Must have valid positive file descriptor');
  assert.ok(fs.existsSync(staged.filePath), 'Staged prompt file must exist');

  const stat = fs.statSync(staged.filePath);
  // Check 0600 permissions on POSIX
  if (process.platform !== 'win32') {
    assert.equal(stat.mode & 0o777, 0o600, 'File must have strict 0600 permissions');
  }

  const content = fs.readFileSync(staged.fd, 'utf8');
  assert.equal(content, testPrompt, 'Content read from fd must match staged prompt');

  staged.release();
  assert.ok(!fs.existsSync(staged.filePath), 'File must be unlinked after release');
});

test('3. Agent definitions are registered', () => {
  const agy = getAgentDef('agy');
  assert.ok(agy, 'agy agent definition must exist');
  assert.equal(agy.bin, 'agy');

  const claude = getAgentDef('claude');
  assert.ok(claude, 'claude agent definition must exist');

  const codex = getAgentDef('codex');
  assert.ok(codex, 'codex agent definition must exist');

  const opencode = getAgentDef('opencode');
  assert.ok(opencode, 'opencode agent definition must exist');
});

test('4. Stream parser handles Antigravity stream-json events', () => {
  const events = [];
  const parser = createStreamParser('agy', (ev) => events.push(ev));

  parser(JSON.stringify({ event: 'thinking', thought: 'Thinking about the problem...' }) + '\n');
  parser(JSON.stringify({ event: 'agent_response', content: 'Here is the response text.' }) + '\n');
  parser(JSON.stringify({ type: 'tool_use', tool_name: 'read_file', tool_id: 'tool_1', parameters: { path: '/tmp/test.txt' } }) + '\n');
  parser(JSON.stringify({ type: 'tool_result', tool_id: 'tool_1', output: 'file content ok' }) + '\n');
  parser(JSON.stringify({ type: 'result', status: 'completed' }) + '\n');
  parser.flush();

  assert.equal(events.length, 5);
  assert.equal(events[0].type, 'thinking_delta');
  assert.equal(events[0].text, 'Thinking about the problem...');

  assert.equal(events[1].type, 'text_delta');
  assert.equal(events[1].text, 'Here is the response text.');

  assert.equal(events[2].type, 'tool_use');
  assert.equal(events[2].name, 'read_file');

  assert.equal(events[3].type, 'tool_result');
  assert.equal(events[3].content, 'file content ok');

  assert.equal(events[4].type, 'done');
  assert.equal(events[4].status, 'completed');
});

test('5. runnerManager detects agy on this host', () => {
  const agents = runnerManager.getDetectedAgents(true);
  assert.ok(agents.length >= 4, 'Must detect registered agents');

  const agy = agents.find((a) => a.id === 'agy');
  assert.ok(agy, 'agy must be in detected agents list');
  assert.equal(agy.installed, true, 'agy must be marked as installed');
  assert.equal(agy.supportsAcp, true, 'agy must have supportsAcp: true');
  assert.ok(agy.binPath, 'agy must have resolved binPath');
});

test('6. runnerManager dispatches ACP session for agy', async () => {
  const events = [];
  const { runId, pid, protocol } = await runnerManager.startRun({
    agentId: 'agy',
    prompt: 'Echo test: reply with only ok'
  });

  assert.ok(runId, 'Must have runId');
  assert.ok(pid > 0, 'Must have valid pid');
  assert.equal(protocol, 'acp', 'Protocol must be acp');

  // Cancel immediately to clean up test run
  runnerManager.cancelRun(runId);
});

test('7. getAccountInfo retrieves active account and available accounts', async () => {
  const { getAccountInfo } = await import('../lib/accounts.js');
  const info = getAccountInfo('agy');
  assert.ok(info.runtime === 'agy', 'Runtime must be agy');
  assert.ok(info.activeAccount, 'Must have activeAccount');
  assert.ok(Array.isArray(info.accounts), 'accounts must be array');
});

test('8. startGoogleOAuthFlow generates valid Google OAuth URL and session', async () => {
  const { startGoogleOAuthFlow, getOAuthSessionStatus } = await import('../lib/accounts.js');
  // Use custom test port to avoid conflict
  const flow = await startGoogleOAuthFlow(51129);
  assert.ok(flow.authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), 'Must have Google OAuth URL');
  assert.ok(flow.state, 'Must have state');
  assert.ok(flow.redirectUri, 'Must have redirectUri');

  const status = getOAuthSessionStatus(flow.state);
  assert.equal(status.status, 'pending', 'Initial status must be pending');
});

test('9. OpenCode auth and model catalog functions', async () => {
  const { getAccountInfo, getOpenCodeAuthList, getOpenCodeModels } = await import('../lib/accounts.js');
  const info = getAccountInfo('opencode');
  assert.equal(info.runtime, 'opencode');
  assert.ok(info.supportsOAuth);
  assert.ok(Array.isArray(info.integrations));

  const authList = getOpenCodeAuthList();
  assert.ok(Array.isArray(authList), 'authList must be array');

  const models = getOpenCodeModels();
  assert.ok(Array.isArray(models), 'models must be array');
  assert.ok(models.length > 0, 'OpenCode catalog must list models');
});

test('10. OpenCode provider interactive auth (OpenAI chatgpt-headless)', async () => {
  const { startOpenCodeProviderInteractiveAuth, getOpenCodeInteractiveAuthStatus, cancelOpenCodeInteractiveAuth } = await import('../lib/opencode.js');
  const auth = await startOpenCodeProviderInteractiveAuth('openai', 'chatgpt-headless');
  assert.ok(auth.sessionId, 'Must have sessionId');
  assert.equal(auth.provider, 'openai');
  assert.equal(auth.method, 'chatgpt-headless');
  assert.ok(auth.userCode, 'Must extract device userCode');
  assert.ok(auth.authUrl.includes('openai.com'), 'Must have OpenAI device authUrl');

  const status = getOpenCodeInteractiveAuthStatus(auth.sessionId);
  assert.equal(status.status, 'waiting', 'Status should be waiting');

  const canceled = cancelOpenCodeInteractiveAuth(auth.sessionId);
  assert.ok(canceled, 'Session must cancel cleanly');
});

test('11. OpenCode Go API key import and auth logout', async () => {
  const { loginOpenCode, logoutOpenCode } = await import('../lib/opencode.js');
  const res = await loginOpenCode('opencode-go', 'test-opencode-go-key-xyz', 'Test Go Key');
  assert.ok(res.ok, 'Login must succeed');
  assert.equal(res.provider, 'opencode-go');
  assert.equal(res.label, 'Test Go Key');
  assert.ok(res.id, 'Must return credential id');

  // Clean up
  const logoutRes = await logoutOpenCode('opencode-go', res.id);
  assert.ok(logoutRes.ok, 'Logout must succeed');
});

test('12. CLI Agent dedicated environment management (decoupled from BYOK)', async () => {
  const { getCliEnvironment, updateCliEnvironment, resolveCliExecutionEnvironment } = await import('../lib/environment.js');
  const agyEnv = getCliEnvironment('agy');
  assert.equal(agyEnv.contextMode, 'native', 'CLI agent contextMode must be native');
  assert.equal(agyEnv.id, 'agy');

  // Test updating environment
  const updated = updateCliEnvironment('agy', {
    extraArgs: ['--test-flag'],
    env: { DSH_CLI_TEST: 'active' }
  });
  assert.deepEqual(updated.extraArgs, ['--test-flag']);
  assert.equal(updated.env.DSH_CLI_TEST, 'active');

  // Test resolving execution environment
  const resolved = resolveCliExecutionEnvironment('agy');
  assert.equal(resolved.contextMode, 'native');
  assert.ok(resolved.extraArgs.includes('--test-flag'));
  assert.equal(resolved.customEnv.DSH_CLI_TEST, 'active');

  // Clean up
  updateCliEnvironment('agy', {
    extraArgs: [],
    env: { DSH_CLI_TEST: undefined }
  });
});

test('13. Multi-agent model resolution and stream parsing integrity (agy, claude, codex, opencode, cursor-agent)', async () => {
  const { CliAgentLlmAdapter } = await import('../lib/llm-adapter.js');
  const { createStreamParser } = await import('../lib/stream-parsers.js');
  const adapter = new CliAgentLlmAdapter();

  const agents = ['agy', 'claude', 'codex', 'opencode', 'cursor-agent'];
  for (const agentId of agents) {
    const info = await adapter.resolveModel(agentId, 'default');
    assert.equal(info.provider, agentId);
    assert.ok(info.context.contextWindow >= 1000000, `${agentId} contextWindow must be unconstrained native capacity`);
    assert.equal(info.cliEnvironment.contextMode, 'native', `${agentId} contextMode must be native`);
    assert.equal(info.defaultMaxTokens, undefined, `${agentId} must not have artificial defaultMaxTokens clamp`);
  }

  // Verify OpenCode stream parser handles JSON error and text deltas
  const openCodeEvents = [];
  const openCodeParser = createStreamParser('opencode', (ev) => openCodeEvents.push(ev));
  openCodeParser(JSON.stringify({ type: 'step_start', sessionID: 'ses_123' }) + '\n');
  openCodeParser(JSON.stringify({ type: 'text', part: { text: 'Halo dari OpenCode' } }) + '\n');
  openCodeParser(JSON.stringify({ type: 'error', error: { message: 'OpenCode test error' } }) + '\n');
  assert.equal(openCodeEvents.length, 3);
  assert.equal(openCodeEvents[0].type, 'status');
  assert.equal(openCodeEvents[1].text, 'Halo dari OpenCode');
  assert.equal(openCodeEvents[2].message, 'OpenCode test error');

  // Verify Claude stream parser handles stream_event partial deltas
  const claudeEvents = [];
  const claudeParser = createStreamParser('claude', (ev) => claudeEvents.push(ev));
  claudeParser(JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { text: 'Claude stream delta' } } }) + '\n');
  assert.equal(claudeEvents.length, 1);
  assert.equal(claudeEvents[0].text, 'Claude stream delta');

  // Verify Codex stream parser handles turn completion
  const codexEvents = [];
  const codexParser = createStreamParser('codex', (ev) => codexEvents.push(ev));
  codexParser(JSON.stringify({ type: 'thread.started', thread_id: 'th_123' }) + '\n');
  codexParser(JSON.stringify({ type: 'turn.completed' }) + '\n');
  assert.equal(codexEvents.length, 2);
  assert.equal(codexEvents[1].type, 'done');

  // Verify Cursor Agent stream parser
  const cursorEvents = [];
  const cursorParser = createStreamParser('cursor-agent', (ev) => cursorEvents.push(ev));
  cursorParser(JSON.stringify({ type: 'text_delta', text: 'Cursor delta' }) + '\n');
  assert.equal(cursorEvents.length, 1);
  assert.equal(cursorEvents[0].text, 'Cursor delta');
});

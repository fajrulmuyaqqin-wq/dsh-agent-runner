import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerManager } from './lib/state.js';
import {
  getAccountInfo,
  switchAccount,
  startGoogleOAuthFlow,
  getOAuthSessionStatus,
  completeOAuthFromUrl,
  startClaudeLogin,
  submitClaudeAuthCode,
  getClaudeLoginStatus,
  startCodexLogin,
  getCodexLoginStatus,
  saveCodexApiKey
} from './lib/accounts.js';
import {
  getOpenCodeCatalog,
  getOpenCodeAuthList,
  loginOpenCode,
  logoutOpenCode,
  getOpenCodeModels,
  startOpenCodeConsoleLogin,
  getOpenCodeConsoleLoginStatus,
  cancelOpenCodeConsoleLogin,
  startOpenCodeProviderInteractiveAuth,
  getOpenCodeInteractiveAuthStatus,
  cancelOpenCodeInteractiveAuth
} from './lib/opencode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = path.join(__dirname, 'static');

export const name = 'dsh-agent-runner';
export const inject = ['webServer'];

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString('utf8');
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function sendText(res, text, status = 200, contentType = 'text/plain') {
  res.statusCode = status;
  res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(text);
}

export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    const ws = webCtx.webServer;
    const disposers = [];

    const reg = (kind, routePath, handler) => {
      try {
        const off = ws.register({ kind, path: routePath, handler });
        if (typeof off === 'function') disposers.push(off);
      } catch (err) {
        console.error(`[dsh-agent-runner] Failed to register route ${routePath}:`, err);
      }
    };

    // 1. UI Page Route
    reg('exact', '/api/agent-runner/ui', async (req, res) => {
      try {
        const indexPath = path.join(STATIC_DIR, 'index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        sendText(res, html, 200, 'text/html');
      } catch (err) {
        sendText(res, `Error loading UI: ${err.message}`, 500);
      }
    });

    // 2. Static Assets Route (?file=app.js / app.css)
    reg('exact', '/api/agent-runner/asset', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const file = urlObj.searchParams.get('file') || '';
        const safeFile = path.basename(file);
        const filePath = path.join(STATIC_DIR, safeFile);

        if (!fs.existsSync(filePath)) {
          return sendText(res, 'Asset not found', 404);
        }

        const ext = path.extname(safeFile);
        const mimeMap = {
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.html': 'text/html',
          '.svg': 'image/svg+xml'
        };
        const mime = mimeMap[ext] || 'text/plain';
        const content = fs.readFileSync(filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', `${mime}; charset=utf-8`);
        res.setHeader('Cache-Control', 'no-cache');
        res.end(content);
      } catch (err) {
        sendText(res, `Asset error: ${err.message}`, 500);
      }
    });

    // 3. Detected Agents List
    reg('exact', '/api/agent-runner/agents', async (req, res) => {
      try {
        const agents = runnerManager.getDetectedAgents(true);
        sendJson(res, { ok: true, agents });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3b. Account Information
    reg('exact', '/api/agent-runner/account', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const agentId = urlObj.searchParams.get('agentId') || 'agy';
        const account = getAccountInfo(agentId);
        sendJson(res, { ok: true, account });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3c. Switch Active Account
    reg('exact', '/api/agent-runner/account/switch', async (req, res) => {
      try {
        const body = await parseBody(req);
        const agentId = body.agentId || 'agy';
        const targetAccount = body.targetAccount;
        const result = switchAccount(agentId, targetAccount);
        sendJson(res, { ok: true, ...result });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 400);
      }
    });

    // 3d. Start Google OAuth Login Flow
    reg('exact', '/api/agent-runner/auth/google/start', async (req, res) => {
      try {
        const body = await parseBody(req);
        const port = Number(body.port) || 51121;
        const result = await startGoogleOAuthFlow(port);
        sendJson(res, { ok: true, ...result });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3e. Check Google OAuth Session Status
    reg('exact', '/api/agent-runner/auth/google/status', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const state = urlObj.searchParams.get('state');
        const status = getOAuthSessionStatus(state);
        sendJson(res, { ok: true, ...status });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3f. Complete Google OAuth manually with pasted URL
    reg('exact', '/api/agent-runner/auth/google/complete', async (req, res) => {
      try {
        const body = await parseBody(req);
        const pastedUrl = body.url;
        const result = await completeOAuthFromUrl(pastedUrl);
        sendJson(res, { ok: true, ...result });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 400);
      }
    });

    // 3g. Start Claude Login
    reg('exact', '/api/agent-runner/auth/claude/start', async (req, res) => {
      try {
        const body = await parseBody(req);
        const method = body.method || 'claudeai';
        const result = await startClaudeLogin(method);
        sendJson(res, result);
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3h. Submit Claude Auth Code
    reg('exact', '/api/agent-runner/auth/claude/complete', async (req, res) => {
      try {
        const body = await parseBody(req);
        const { sessionId, code } = body;
        const result = await submitClaudeAuthCode(sessionId, code);
        sendJson(res, result);
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 400);
      }
    });

    // 3i. Check Claude Login Status
    reg('exact', '/api/agent-runner/auth/claude/status', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const sessionId = urlObj.searchParams.get('sessionId');
        const status = getClaudeLoginStatus(sessionId);
        sendJson(res, { ok: true, ...status });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3j. Start Codex Login
    reg('exact', '/api/agent-runner/auth/codex/start', async (req, res) => {
      try {
        const body = await parseBody(req);
        const method = body.method || 'chatgpt';
        const result = await startCodexLogin(method);
        sendJson(res, result);
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3k. Check Codex Login Status
    reg('exact', '/api/agent-runner/auth/codex/status', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const sessionId = urlObj.searchParams.get('sessionId');
        const status = getCodexLoginStatus(sessionId);
        sendJson(res, { ok: true, ...status });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3l. Save Codex API Key
    reg('exact', '/api/agent-runner/auth/codex/save-key', async (req, res) => {
      try {
        const body = await parseBody(req);
        const { apiKey } = body;
        const result = await saveCodexApiKey(apiKey);
        sendJson(res, result);
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 400);
      }
    });

    // 3m. List OpenCode Auth Integrations
    reg('exact', '/api/agent-runner/auth/opencode/list', async (req, res) => {
      try {
        const integrations = getOpenCodeAuthList();
        sendJson(res, { ok: true, integrations });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3n. Connect / Login OpenCode Provider
    reg('exact', '/api/agent-runner/auth/opencode/login', async (req, res) => {
      try {
        const body = await parseBody(req);
        const { provider, apiKey, label } = body;
        const result = await loginOpenCode(provider, apiKey, label);
        sendJson(res, result);
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 400);
      }
    });

    // 3o. Logout OpenCode Provider
    reg('exact', '/api/agent-runner/auth/opencode/logout', async (req, res) => {
      try {
        const body = await parseBody(req);
        const { provider, credentialId } = body;
        const result = await logoutOpenCode(provider, credentialId);
        sendJson(res, result);
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 400);
      }
    });

    // 3p. List OpenCode Models
    reg('exact', '/api/agent-runner/auth/opencode/models', async (req, res) => {
      try {
        const models = getOpenCodeModels();
        sendJson(res, { ok: true, models });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3q. Get OpenCode Full Catalog (Popular vs Services 220+)
    reg('exact', '/api/agent-runner/auth/opencode/catalog', async (req, res) => {
      try {
        const catalog = getOpenCodeCatalog();
        sendJson(res, { ok: true, ...catalog });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3r. Start OpenCode Console Device Code Login
    reg('exact', '/api/agent-runner/auth/opencode/console/start', async (req, res) => {
      try {
        const body = await parseBody(req);
        const method = body.method || 'device';
        const result = await startOpenCodeConsoleLogin(method);
        sendJson(res, result);
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3s. Check OpenCode Console Device Code Login Status
    reg('exact', '/api/agent-runner/auth/opencode/console/status', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const sessionId = urlObj.searchParams.get('sessionId');
        const status = getOpenCodeConsoleLoginStatus(sessionId);
        sendJson(res, { ok: true, ...status });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3t. Cancel OpenCode Console Login
    reg('exact', '/api/agent-runner/auth/opencode/console/cancel', async (req, res) => {
      try {
        const body = await parseBody(req);
        const { sessionId } = body;
        const canceled = cancelOpenCodeConsoleLogin(sessionId);
        sendJson(res, { ok: canceled });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3u. Start OpenCode Provider Interactive Login (e.g. OpenAI chatgpt-headless, Copilot device)
    reg('exact', '/api/agent-runner/auth/opencode/interactive/start', async (req, res) => {
      try {
        const body = await parseBody(req);
        const { provider, method } = body;
        const result = await startOpenCodeProviderInteractiveAuth(provider, method);
        sendJson(res, result);
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3v. Check OpenCode Provider Interactive Login Status
    reg('exact', '/api/agent-runner/auth/opencode/interactive/status', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const sessionId = urlObj.searchParams.get('sessionId');
        const status = getOpenCodeInteractiveAuthStatus(sessionId);
        sendJson(res, { ok: true, ...status });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 3w. Cancel OpenCode Provider Interactive Login
    reg('exact', '/api/agent-runner/auth/opencode/interactive/cancel', async (req, res) => {
      try {
        const body = await parseBody(req);
        const { sessionId } = body;
        const canceled = cancelOpenCodeInteractiveAuth(sessionId);
        sendJson(res, { ok: canceled });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 4. Start Run
    reg('exact', '/api/agent-runner/run', async (req, res) => {
      try {
        const body = await parseBody(req);
        if (!body.agentId || !body.prompt) {
          return sendJson(res, { ok: false, error: 'agentId and prompt are required' }, 400);
        }

        const { runId, pid } = await runnerManager.startRun(body);
        sendJson(res, { ok: true, runId, pid });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 5. Test Connection
    reg('exact', '/api/agent-runner/test', async (req, res) => {
      try {
        const body = await parseBody(req);
        const agentId = body.agentId || 'agy';
        const { runId, pid } = await runnerManager.startRun({
          agentId,
          prompt: 'Echo test: reply with only ok'
        });
        sendJson(res, { ok: true, runId, pid });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 6. Runs History
    reg('exact', '/api/agent-runner/runs', async (req, res) => {
      try {
        const runs = runnerManager.getAllRuns();
        sendJson(res, { ok: true, runs });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 7. Cancel Route (Query Param fallback: /api/agent-runner/cancel?id=...)
    reg('exact', '/api/agent-runner/cancel', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const id = urlObj.searchParams.get('id');
        if (!id) return sendJson(res, { ok: false, error: 'Missing run id' }, 400);
        const success = runnerManager.cancelRun(id);
        sendJson(res, { ok: success });
      } catch (err) {
        sendJson(res, { ok: false, error: err.message }, 500);
      }
    });

    // 8. Stream Route (Query Param: /api/agent-runner/stream?id=...)
    reg('exact', '/api/agent-runner/stream', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const runId = urlObj.searchParams.get('id');
        if (!runId) return sendText(res, 'Missing run id', 400);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        runnerManager.addSseClient(runId, res);
      } catch (err) {
        sendText(res, `SSE error: ${err.message}`, 500);
      }
    });

    // 9. Prefix Route for /api/agent-runner/runs/:id/*
    reg('prefix', '/api/agent-runner/runs', async (req, res) => {
      try {
        const urlObj = new URL(req.url, 'http://127.0.0.1');
        const streamMatch = urlObj.pathname.match(/^\/api\/agent-runner\/runs\/([^/]+)\/stream$/);
        if (streamMatch) {
          const runId = streamMatch[1];
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          runnerManager.addSseClient(runId, res);
          return;
        }

        const cancelMatch = urlObj.pathname.match(/^\/api\/agent-runner\/runs\/([^/]+)\/cancel$/);
        if (cancelMatch) {
          const runId = cancelMatch[1];
          const success = runnerManager.cancelRun(runId);
          return sendJson(res, { ok: success });
        }

        sendText(res, 'Route not handled', 404);
      } catch (err) {
        sendText(res, `Error: ${err.message}`, 500);
      }
    });

    // Cleanup when unmounted
    ctx.effect(() => () => {
      for (const off of disposers) {
        try { off(); } catch {}
      }
    });
  });

  // Optional tool registration if DSH tools service is present
  try {
    ctx.inject(['tools'], (toolCtx) => {
      if (!toolCtx.tools?.register) return;

      const unreg = toolCtx.tools.register({
        name: 'call_external_agent',
        description: 'Delegates coding or research tasks to an external CLI agent installed on the machine (Google Antigravity agy, Claude Code, OpenAI Codex, OpenCode). Returns complete output, reasoning, and tool calls.',
        parameters: {
          type: 'object',
          properties: {
            agent: {
              type: 'string',
              description: 'The agent CLI to run: "agy" (Google Antigravity), "claude" (Claude Code), "codex", or "opencode". Defaults to "agy".',
              default: 'agy'
            },
            prompt: {
              type: 'string',
              description: 'The prompt or instruction to execute.'
            },
            model: {
              type: 'string',
              description: 'Optional model override (e.g. "gemini-3.8-flash-high", "claude-sonnet-4-6").'
            },
            cwd: {
              type: 'string',
              description: 'Working directory for the execution.'
            }
          },
          required: ['prompt']
        },
        async execute(params) {
          const agentId = params.agent || 'agy';
          const { runId } = await runnerManager.startRun({
            agentId,
            prompt: params.prompt,
            model: params.model,
            cwd: params.cwd
          });

          // Await completion or timeout
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              const run = runnerManager.getRun(runId);
              resolve({
                status: 'timeout',
                output: run?.text || '',
                thinking: run?.thinking || '',
                tools: run?.tools || []
              });
            }, 120000);

            const checkInterval = setInterval(() => {
              const run = runnerManager.getRun(runId);
              if (run && (run.status === 'completed' || run.status === 'failed' || run.status === 'canceled')) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve({
                  status: run.status,
                  output: run.text,
                  thinking: run.thinking,
                  tools: run.tools,
                  error: run.error,
                  durationMs: run.durationMs
                });
              }
            }, 300);
          });
        }
      });

      toolCtx.effect(() => () => {
        try { if (typeof unreg === 'function') unreg(); } catch {}
      });
    });
  } catch (err) {
    // Tools service is optional, proceed without error
  }
}

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { getOpenCodeAccountInfo } from './opencode.js';

const HOME = os.homedir();
const GEMINI_DIR = path.join(HOME, '.gemini');
const GEMINI_ACCOUNTS_FILE = path.join(GEMINI_DIR, 'google_accounts.json');
const GEMINI_CREDS_FILE = path.join(GEMINI_DIR, 'oauth_creds.json');
const GEMINI_ACCOUNTS_DIR = path.join(GEMINI_DIR, 'accounts');

// Ensure accounts directory exists
if (!fs.existsSync(GEMINI_ACCOUNTS_DIR)) {
  try {
    fs.mkdirSync(GEMINI_ACCOUNTS_DIR, { recursive: true });
  } catch {}
}

// In-memory store for pending OAuth login sessions
const pendingOAuthSessions = new Map(); // state -> session

/**
 * Returns account info for the specified runtime.
 * @param {string} runtimeId
 */
export function getAccountInfo(runtimeId = 'agy') {
  if (runtimeId === 'agy') {
    try {
      if (fs.existsSync(GEMINI_ACCOUNTS_FILE)) {
        const raw = fs.readFileSync(GEMINI_ACCOUNTS_FILE, 'utf-8');
        const data = JSON.parse(raw);
        const active = data.active || null;
        const oldAccounts = Array.isArray(data.old) ? data.old : [];
        const accounts = Array.from(new Set([active, ...oldAccounts].filter(Boolean)));
        return {
          runtime: 'agy',
          activeAccount: active || 'Active Antigravity Account',
          accounts,
          canSwitch: accounts.length > 1,
          supportsCustomKey: true,
          supportsOAuth: true,
          authType: 'google_oauth'
        };
      }
    } catch (e) {
      // ignore
    }
    return {
      runtime: 'agy',
      activeAccount: 'Active Antigravity Session',
      accounts: [],
      canSwitch: false,
      supportsCustomKey: true,
      supportsOAuth: true,
      authType: 'google_oauth'
    };
  }

  if (runtimeId === 'claude') {
    let loggedIn = false;
    let email = null;
    try {
      const res = execFileSync('claude', ['auth', 'status'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 });
      const data = JSON.parse(res);
      loggedIn = Boolean(data.loggedIn);
      email = data.email || null;
    } catch (e) {
      if (e.stdout) {
        try {
          const data = JSON.parse(e.stdout);
          loggedIn = Boolean(data.loggedIn);
          email = data.email || null;
        } catch {}
      }
    }

    if (process.env.ANTHROPIC_API_KEY) {
      return {
        runtime: 'claude',
        activeAccount: 'Environment Key (ANTHROPIC_API_KEY)',
        accounts: [],
        canSwitch: false,
        supportsCustomKey: true,
        supportsOAuth: false,
        authType: 'api_key'
      };
    }

    return {
      runtime: 'claude',
      activeAccount: loggedIn ? (email || 'Anthropic Account (Active)') : 'Belum Login (Gunakan Login Claude / API Key)',
      accounts: [],
      canSwitch: false,
      supportsCustomKey: true,
      supportsOAuth: true,
      authType: loggedIn ? 'anthropic_active' : 'anthropic_login'
    };
  }

  if (runtimeId === 'codex') {
    let loggedIn = false;
    let details = 'Not logged in';
    try {
      const res = execFileSync('codex', ['login', 'status'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).trim();
      if (res.includes('Logged in') || res.includes('API key configured')) {
        loggedIn = true;
        details = res;
      }
    } catch (e) {
      if (e.stdout) {
        const out = e.stdout.toString().trim();
        if (out.includes('Logged in') || out.includes('API key configured')) {
          loggedIn = true;
          details = out;
        }
      }
    }

    if (process.env.OPENAI_API_KEY) {
      return {
        runtime: 'codex',
        activeAccount: 'Environment Key (OPENAI_API_KEY)',
        accounts: [],
        canSwitch: false,
        supportsCustomKey: true,
        supportsOAuth: true,
        authType: 'api_key'
      };
    }

    return {
      runtime: 'codex',
      activeAccount: loggedIn ? details : 'Belum Login · Perlu Login Codex / Custom API Key',
      accounts: [],
      canSwitch: false,
      supportsCustomKey: true,
      supportsOAuth: true,
      authType: loggedIn ? 'codex_active' : 'codex_login'
    };
  }

  if (runtimeId === 'opencode') {
    return getOpenCodeAccountInfo();
  }

  return {
    runtime: runtimeId,
    activeAccount: 'Default CLI Environment',
    accounts: [],
    canSwitch: false,
    supportsCustomKey: true,
    supportsOAuth: false,
    authType: 'native_or_apikey'
  };
}

/**
 * Switches the active account in the native config.
 * @param {string} runtimeId
 * @param {string} targetAccount
 */
export function switchAccount(runtimeId = 'agy', targetAccount) {
  if (!targetAccount) {
    throw new Error('targetAccount is required');
  }

  if (runtimeId === 'agy') {
    if (!fs.existsSync(GEMINI_ACCOUNTS_FILE)) {
      throw new Error(`Accounts file ${GEMINI_ACCOUNTS_FILE} does not exist`);
    }

    const raw = fs.readFileSync(GEMINI_ACCOUNTS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const prevActive = data.active;
    const oldSet = new Set(Array.isArray(data.old) ? data.old : []);

    // 1. Back up current active account's credentials if available
    if (prevActive && fs.existsSync(GEMINI_CREDS_FILE)) {
      try {
        const prevBackupPath = path.join(GEMINI_ACCOUNTS_DIR, `${prevActive}.json`);
        fs.copyFileSync(GEMINI_CREDS_FILE, prevBackupPath);
      } catch (err) {
        console.warn('[dsh-agent-runner] Failed to backup credentials for', prevActive, err);
      }
    }

    if (prevActive && prevActive !== targetAccount) {
      oldSet.add(prevActive);
    }
    oldSet.delete(targetAccount);

    data.active = targetAccount;
    data.old = Array.from(oldSet);

    fs.writeFileSync(GEMINI_ACCOUNTS_FILE, JSON.stringify(data, null, 2), 'utf-8');

    // 2. Restore credentials for target account if available in storage
    const targetCredPath = path.join(GEMINI_ACCOUNTS_DIR, `${targetAccount}.json`);
    let credentialsRestored = false;
    if (fs.existsSync(targetCredPath)) {
      try {
        fs.copyFileSync(targetCredPath, GEMINI_CREDS_FILE);
        credentialsRestored = true;
      } catch (err) {
        console.warn('[dsh-agent-runner] Failed to restore credentials for', targetAccount, err);
      }
    }

    return {
      success: true,
      runtime: 'agy',
      activeAccount: targetAccount,
      credentialsRestored,
      accounts: Array.from(new Set([targetAccount, ...data.old]))
    };
  }

  throw new Error(`Account switching not supported for runtime ${runtimeId}`);
}

/**
 * Saves exchanged Google OAuth credentials to system configs.
 * @param {object} tokenData
 */
export function saveGoogleOAuthCredentials(tokenData) {
  const { email, access, refresh, expires, id_token } = tokenData;
  if (!email) {
    throw new Error('No email found in token data');
  }

  const rawRefresh = (refresh || '').split('|')[0];
  const credsPayload = {
    access_token: access,
    refresh_token: rawRefresh,
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/cloud-platform',
    token_type: 'Bearer',
    id_token: id_token || '',
    expiry_date: expires ? new Date(expires).getTime() : Date.now() + 3600 * 1000
  };

  // 1. Write active oauth_creds.json
  fs.writeFileSync(GEMINI_CREDS_FILE, JSON.stringify(credsPayload, null, 2), { mode: 0o600 });

  // 2. Write backup copy in accounts/<email>.json
  const emailBackupFile = path.join(GEMINI_ACCOUNTS_DIR, `${email}.json`);
  fs.writeFileSync(emailBackupFile, JSON.stringify(credsPayload, null, 2), { mode: 0o600 });

  // 3. Update google_accounts.json
  let accData = { active: email, old: [] };
  if (fs.existsSync(GEMINI_ACCOUNTS_FILE)) {
    try {
      accData = JSON.parse(fs.readFileSync(GEMINI_ACCOUNTS_FILE, 'utf-8'));
    } catch {}
  }

  const prevActive = accData.active;
  const oldSet = new Set(Array.isArray(accData.old) ? accData.old : []);
  if (prevActive && prevActive !== email) {
    oldSet.add(prevActive);
  }
  oldSet.delete(email);

  accData.active = email;
  accData.old = Array.from(oldSet);
  fs.writeFileSync(GEMINI_ACCOUNTS_FILE, JSON.stringify(accData, null, 2), 'utf-8');

  return {
    success: true,
    activeAccount: email,
    accounts: Array.from(new Set([email, ...accData.old]))
  };
}

let globalLoopbackServer = null;

/**
 * Ensures a single shared loopback server is running on the specified port.
 * @param {number} port
 */
function ensureLoopbackServer(port = 51121) {
  if (globalLoopbackServer && globalLoopbackServer.listening) {
    return globalLoopbackServer;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${port}`);
      if (parsedUrl.pathname === '/oauth-callback') {
        const code = parsedUrl.searchParams.get('code');
        const incomingState = parsedUrl.searchParams.get('state');

        if (!code || !incomingState) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h3>Error: Missing authorization code or state</h3>');
          return;
        }

        // Look up session matching the incoming state
        const session = pendingOAuthSessions.get(incomingState);
        const redirectUri = session ? session.redirectUri : `http://localhost:${port}/oauth-callback`;

        const exc = await import('/var/home/fazdev/.dsh/profiles/web/node_modules/dsh-agy/lib/exchange-B1UGNtrv.mjs');
        const exchangeAntigravity = exc.t;

        // Note: pass session.verifier if present; if session expired/cleared, pass undefined so exchangeAntigravity
        // extracts the verifier from the encoded state payload without a false mismatch rejection.
        const exchangeResult = await exchangeAntigravity(code, incomingState, redirectUri, session ? session.verifier : undefined);

        if (exchangeResult.type === 'failed') {
          if (session) {
            session.status = 'failed';
            session.error = exchangeResult.error || 'Token exchange failed';
          }
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h3>Login Gagal: ${exchangeResult.error || 'Autentikasi gagal'}</h3>`);
          return;
        }

        // Save credentials and update accounts
        const saveRes = saveGoogleOAuthCredentials(exchangeResult);
        if (session) {
          session.status = 'completed';
          session.email = saveRes.activeAccount;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Login Berhasil - Boson Studio</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 2rem 3rem; border-radius: 12px; text-align: center; max-width: 450px; }
    h2 { color: #10b981; margin-top: 0; }
    p { color: #94a3b8; font-size: 14px; }
    .email { font-family: monospace; background: #0f172a; padding: 4px 8px; border-radius: 4px; color: #38bdf8; }
  </style>
</head>
<body>
  <div class="card">
    <h2>✓ Autentikasi Google Berhasil!</h2>
    <p>Akun <span class="email">${saveRes.activeAccount}</span> telah aktif dan siap digunakan di Agent CLI Runner.</p>
    <p>Anda dapat menutup tab ini sekarang.</p>
  </div>
</body>
</html>`);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Internal error: ${err.message}`);
    }
  });

  server.on('error', (err) => {
    console.warn('[dsh-agent-runner] OAuth loopback server error:', err.message);
  });

  try {
    server.listen(port, '127.0.0.1');
    server.unref();
    globalLoopbackServer = server;
  } catch (err) {
    console.warn('[dsh-agent-runner] Loopback server already listening on port', port);
  }

  return globalLoopbackServer;
}

/**
 * Starts a Google OAuth 2.0 flow for Antigravity.
 * Ensures the loopback callback server on port 51121 is ready and returns the auth URL.
 */
export async function startGoogleOAuthFlow(port = 51121) {
  const redirectUri = `http://localhost:${port}/oauth-callback`;

  // Dynamically import dsh-agy modules
  const imp = await import('/var/home/fazdev/.dsh/profiles/web/node_modules/dsh-agy/lib/import-DjCR0KEj.mjs');
  const authorizeAntigravity = imp.r;

  const authData = await authorizeAntigravity(redirectUri);
  const { url, verifier, state } = authData;

  const session = {
    state,
    verifier,
    redirectUri,
    port,
    status: 'pending', // 'pending' | 'completed' | 'failed'
    email: null,
    error: null,
    createdAt: Date.now()
  };

  ensureLoopbackServer(port);

  // Timeout cleanup after 10 minutes
  const cleanupTimer = setTimeout(() => {
    if (session.status === 'pending') {
      session.status = 'failed';
      session.error = 'Login timed out (10 minutes)';
    }
    pendingOAuthSessions.delete(state);
  }, 10 * 60 * 1000);
  cleanupTimer.unref();

  pendingOAuthSessions.set(state, session);

  return {
    authUrl: url,
    state,
    redirectUri
  };
}

/**
 * Checks the status of an ongoing OAuth login session.
 * @param {string} state
 */
export function getOAuthSessionStatus(state) {
  if (!state || !pendingOAuthSessions.has(state)) {
    return { status: 'not_found' };
  }
  const session = pendingOAuthSessions.get(state);
  return {
    status: session.status,
    email: session.email,
    error: session.error
  };
}

/**
 * Completes OAuth flow manually via pasted redirect URL (for headless/remote users).
 * @param {string} pastedUrl
 */
export async function completeOAuthFromUrl(pastedUrl) {
  if (!pastedUrl) {
    throw new Error('Pasted redirect URL is required');
  }

  const url = new URL(pastedUrl.trim());
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    throw new Error('URL must contain code and state query parameters');
  }

  const session = pendingOAuthSessions.get(state);
  const redirectUri = session ? session.redirectUri : 'http://localhost:51121/oauth-callback';

  const exc = await import('/var/home/fazdev/.dsh/profiles/web/node_modules/dsh-agy/lib/exchange-B1UGNtrv.mjs');
  const exchangeAntigravity = exc.t;

  const result = await exchangeAntigravity(code, state, redirectUri, session ? session.verifier : undefined);
  if (result.type === 'failed') {
    throw new Error(result.error || 'Token exchange failed');
  }

  const saveRes = saveGoogleOAuthCredentials(result);
  if (session) {
    session.status = 'completed';
    session.email = saveRes.activeAccount;
  }

  return saveRes;
}

// Stores for pending CLI login processes
const pendingClaudeSessions = new Map(); // sessionId -> { proc, authUrl, method, status, error }
const pendingCodexSessions = new Map(); // sessionId -> { proc, authUrl, method, userCode, status, error }

/**
 * Starts an interactive Claude login process (claudeai or console).
 * @param {'claudeai' | 'console'} method
 */
export async function startClaudeLogin(method = 'claudeai') {
  const sessionId = crypto.randomUUID();
  const flag = method === 'console' ? '--console' : '--claudeai';

  return new Promise((resolve, reject) => {
    let resolved = false;
    const proc = spawn('claude', ['auth', 'login', flag], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const session = {
      sessionId,
      proc,
      method,
      authUrl: null,
      status: 'pending',
      error: null,
      createdAt: Date.now()
    };
    pendingClaudeSessions.set(sessionId, session);

    let outputBuf = '';
    const handleData = (chunk) => {
      outputBuf += chunk.toString('utf8');
      const match = outputBuf.match(/https:\/\/[^\s]+/);
      if (match && !resolved) {
        resolved = true;
        session.authUrl = match[0];
        session.status = 'waiting_for_code';
        resolve({
          ok: true,
          sessionId,
          method,
          authUrl: session.authUrl
        });
      }
    };

    proc.stdout.on('data', handleData);
    proc.stderr.on('data', handleData);

    proc.on('close', (code) => {
      if (code === 0) {
        session.status = 'completed';
      } else {
        session.status = 'failed';
        session.error = `Claude process exited with code ${code}`;
      }
      if (!resolved) {
        resolved = true;
        reject(new Error(session.error || 'Failed to obtain Claude authorization URL'));
      }
    });

    proc.on('error', (err) => {
      session.status = 'failed';
      session.error = err.message;
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    // 10 minutes timeout cleanup
    setTimeout(() => {
      if (session.status === 'pending' || session.status === 'waiting_for_code') {
        try { proc.kill(); } catch {}
        session.status = 'failed';
        session.error = 'Login timed out';
      }
    }, 10 * 60 * 1000).unref();
  });
}

/**
 * Submits the authorization code to the waiting Claude login process.
 * @param {string} sessionId
 * @param {string} code
 */
export async function submitClaudeAuthCode(sessionId, code) {
  const session = pendingClaudeSessions.get(sessionId);
  if (!session) {
    throw new Error('Sesi login Claude tidak ditemukan atau sudah kedaluwarsa');
  }
  if (!code || !code.trim()) {
    throw new Error('Kode otorisasi diperlukan');
  }

  return new Promise((resolve, reject) => {
    session.proc.stdin.write(code.trim() + '\n');

    const timeout = setTimeout(() => {
      const acc = getAccountInfo('claude');
      session.status = 'completed';
      resolve({ ok: true, activeAccount: acc.activeAccount });
    }, 2500);

    session.proc.on('close', (exitCode) => {
      clearTimeout(timeout);
      if (exitCode === 0) {
        session.status = 'completed';
        const acc = getAccountInfo('claude');
        resolve({ ok: true, activeAccount: acc.activeAccount });
      } else {
        session.status = 'failed';
        reject(new Error('Kode otorisasi tidak valid atau otentikasi gagal'));
      }
    });
  });
}

/**
 * Checks Claude login status.
 * @param {string} sessionId
 */
export function getClaudeLoginStatus(sessionId) {
  const session = pendingClaudeSessions.get(sessionId);
  if (!session) return { status: 'not_found' };
  const acc = getAccountInfo('claude');
  return {
    status: session.status,
    method: session.method,
    authUrl: session.authUrl,
    error: session.error,
    account: acc
  };
}

/**
 * Starts an interactive Codex login process (chatgpt or device).
 * @param {'chatgpt' | 'device'} method
 */
export async function startCodexLogin(method = 'chatgpt') {
  const sessionId = crypto.randomUUID();
  const args = method === 'device' ? ['login', '--device-auth'] : ['login'];

  return new Promise((resolve, reject) => {
    let resolved = false;
    const proc = spawn('codex', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const session = {
      sessionId,
      proc,
      method,
      authUrl: null,
      userCode: null,
      status: 'waiting',
      error: null,
      createdAt: Date.now()
    };
    pendingCodexSessions.set(sessionId, session);

    let outputBuf = '';
    const handleData = (chunk) => {
      outputBuf += chunk.toString('utf8');
      if (method === 'chatgpt') {
        const match = outputBuf.match(/https:\/\/auth\.openai\.com\/oauth\/authorize[^\s]+/);
        if (match && !resolved) {
          resolved = true;
          session.authUrl = match[0];
          resolve({
            ok: true,
            sessionId,
            method,
            authUrl: session.authUrl
          });
        }
      } else if (method === 'device') {
        const codeMatch = outputBuf.match(/([A-Z0-9]{4}-[A-Z0-9]{5})/);
        if (codeMatch && !resolved) {
          resolved = true;
          session.userCode = codeMatch[1];
          session.authUrl = 'https://auth.openai.com/codex/device';
          resolve({
            ok: true,
            sessionId,
            method,
            authUrl: session.authUrl,
            userCode: session.userCode
          });
        }
      }
    };

    proc.stdout.on('data', handleData);
    proc.stderr.on('data', handleData);

    proc.on('close', (code) => {
      if (code === 0) {
        session.status = 'completed';
      } else {
        session.status = 'failed';
        session.error = `Codex login exited with code ${code}`;
      }
      if (!resolved) {
        resolved = true;
        reject(new Error(session.error || 'Failed to start Codex login'));
      }
    });

    proc.on('error', (err) => {
      session.status = 'failed';
      session.error = err.message;
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    // 15 minutes timeout
    setTimeout(() => {
      if (session.status === 'waiting') {
        try { proc.kill(); } catch {}
        session.status = 'failed';
        session.error = 'Login timed out (15 minutes)';
      }
    }, 15 * 60 * 1000).unref();
  });
}

/**
 * Checks Codex login status.
 * @param {string} sessionId
 */
export function getCodexLoginStatus(sessionId) {
  const session = pendingCodexSessions.get(sessionId);
  if (!session) return { status: 'not_found' };
  const acc = getAccountInfo('codex');
  return {
    status: session.status,
    method: session.method,
    authUrl: session.authUrl,
    userCode: session.userCode,
    error: session.error,
    account: acc
  };
}

/**
 * Saves API key to Codex config via codex login --with-api-key.
 * @param {string} apiKey
 */
export async function saveCodexApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OpenAI API Key diperlukan');
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('codex', ['login', '--with-api-key'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    proc.stdin.write(apiKey.trim() + '\n');
    proc.stdin.end();

    let errBuf = '';
    proc.stderr.on('data', (d) => { errBuf += d.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        const acc = getAccountInfo('codex');
        resolve({ ok: true, activeAccount: acc.activeAccount });
      } else {
        reject(new Error(errBuf || `Gagal menyimpan API key (exit code: ${code})`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

// Re-export OpenCode functions from dedicated module
export {
  getOpenCodeCatalog,
  getOpenCodeAuthList,
  loginOpenCode,
  logoutOpenCode,
  getOpenCodeModels,
  getOpenCodeAccountInfo,
  startOpenCodeConsoleLogin,
  getOpenCodeConsoleLoginStatus,
  cancelOpenCodeConsoleLogin,
  startOpenCodeProviderInteractiveAuth,
  getOpenCodeInteractiveAuthStatus,
  cancelOpenCodeInteractiveAuth
} from './opencode.js';



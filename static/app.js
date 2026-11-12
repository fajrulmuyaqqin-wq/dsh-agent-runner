// Agent Runner Client Logic

(function () {
  let agents = [];
  let currentRunId = null;
  let activeEventSource = null;
  let timerInterval = null;
  let runStartTime = 0;

  // DOM Elements
  const agentSelect = document.getElementById('agentSelect');
  const modelSelect = document.getElementById('modelSelect');
  const modeSelect = document.getElementById('modeSelect');
  const effortSelect = document.getElementById('effortSelect');
  const cwdInput = document.getElementById('cwdInput');
  const promptInput = document.getElementById('promptInput');
  const runBtn = document.getElementById('runBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const testBtn = document.getElementById('testBtn');
  const clearBtn = document.getElementById('clearBtn');
  const agentInfo = document.getElementById('agentInfo');
  const detectedCount = document.getElementById('detectedCount');

  // Account & Auth elements
  const accountBadge = document.getElementById('accountBadge');
  const accountSwitchBox = document.getElementById('accountSwitchBox');
  const accountSelect = document.getElementById('accountSelect');
  const switchAccountBtn = document.getElementById('switchAccountBtn');
  const toggleAuthKeyBtn = document.getElementById('toggleAuthKeyBtn');
  const authKeyBox = document.getElementById('authKeyBox');
  const apiKeyInput = document.getElementById('apiKeyInput');

  // Agent-Adaptive Auth Elements
  const loginAgentBtn = document.getElementById('loginAgentBtn');
  const loginAgentBtnText = document.getElementById('loginAgentBtnText');

  // Auth Management Modal Elements
  const authModalBackdrop = document.getElementById('authModalBackdrop');
  const authModalCloseBtn = document.getElementById('authModalCloseBtn');
  const authModalTitle = document.getElementById('authModalTitle');
  const authModalSubtitle = document.getElementById('authModalSubtitle');

  // Google OAuth Elements
  const oauthBox = document.getElementById('oauthBox');
  const oauthLink = document.getElementById('oauthLink');
  const closeOauthBoxBtn = document.getElementById('closeOauthBoxBtn');
  const pastedUrlInput = document.getElementById('pastedUrlInput');
  const submitPastedUrlBtn = document.getElementById('submitPastedUrlBtn');
  const autoPasteBtn = document.getElementById('autoPasteBtn');
  const oauthStatusMsg = document.getElementById('oauthStatusMsg');

  // Claude Login Elements
  const claudeBox = document.getElementById('claudeBox');
  const closeClaudeBoxBtn = document.getElementById('closeClaudeBoxBtn');
  const claudeTabSubscription = document.getElementById('claudeTabSubscription');
  const claudeTabConsole = document.getElementById('claudeTabConsole');
  const claudeMethodDesc = document.getElementById('claudeMethodDesc');
  const claudeAuthLink = document.getElementById('claudeAuthLink');
  const claudeAutoPasteBtn = document.getElementById('claudeAutoPasteBtn');
  const claudeCodeInput = document.getElementById('claudeCodeInput');
  const submitClaudeCodeBtn = document.getElementById('submitClaudeCodeBtn');
  const claudeStatusMsg = document.getElementById('claudeStatusMsg');

  // Codex Login Elements
  const codexBox = document.getElementById('codexBox');
  const closeCodexBoxBtn = document.getElementById('closeCodexBoxBtn');
  const codexTabChatgpt = document.getElementById('codexTabChatgpt');
  const codexTabDevice = document.getElementById('codexTabDevice');
  const codexTabApiKey = document.getElementById('codexTabApiKey');
  const codexChatgptPanel = document.getElementById('codexChatgptPanel');
  const codexDevicePanel = document.getElementById('codexDevicePanel');
  const codexApiKeyPanel = document.getElementById('codexApiKeyPanel');
  const codexChatgptLink = document.getElementById('codexChatgptLink');
  const codexDeviceCodeBadge = document.getElementById('codexDeviceCodeBadge');
  const copyCodexCodeBtn = document.getElementById('copyCodexCodeBtn');
  const codexApiKeyInput = document.getElementById('codexApiKeyInput');
  const saveCodexKeyBtn = document.getElementById('saveCodexKeyBtn');
  const codexStatusMsg = document.getElementById('codexStatusMsg');

  // OpenCode Agile Elements
  const opencodeBox = document.getElementById('opencodeBox');
  const opencodeTabConsole = document.getElementById('opencodeTabConsole');
  const opencodeTabGo = document.getElementById('opencodeTabGo');
  const opencodeTabPopular = document.getElementById('opencodeTabPopular');
  const opencodeTabCatalog = document.getElementById('opencodeTabCatalog');

  const opencodeConsolePanel = document.getElementById('opencodeConsolePanel');
  const opencodeGoPanel = document.getElementById('opencodeGoPanel');
  const opencodePopularPanel = document.getElementById('opencodePopularPanel');
  const opencodeCatalogPanel = document.getElementById('opencodeCatalogPanel');

  // Console subpanel elements
  const opencodeConsoleToggleDevice = document.getElementById('opencodeConsoleToggleDevice');
  const opencodeConsoleToggleKey = document.getElementById('opencodeConsoleToggleKey');
  const opencodeConsoleDeviceSubpanel = document.getElementById('opencodeConsoleDeviceSubpanel');
  const opencodeConsoleKeySubpanel = document.getElementById('opencodeConsoleKeySubpanel');
  const opencodeDeviceCodeBadge = document.getElementById('opencodeDeviceCodeBadge');
  const copyOpencodeCodeBtn = document.getElementById('copyOpencodeCodeBtn');
  const opencodeConsoleAuthLink = document.getElementById('opencodeConsoleAuthLink');
  const opencodeConsoleStatusMsg = document.getElementById('opencodeConsoleStatusMsg');
  const opencodeConsoleApiKeyInput = document.getElementById('opencodeConsoleApiKeyInput');
  const opencodeConsoleLabelInput = document.getElementById('opencodeConsoleLabelInput');
  const saveOpencodeConsoleKeyBtn = document.getElementById('saveOpencodeConsoleKeyBtn');
  const opencodeConsoleKeyStatusMsg = document.getElementById('opencodeConsoleKeyStatusMsg');

  // OpenCode Go elements
  const opencodeGoApiKeyInput = document.getElementById('opencodeGoApiKeyInput');
  const opencodeGoLabelInput = document.getElementById('opencodeGoLabelInput');
  const saveOpencodeGoKeyBtn = document.getElementById('saveOpencodeGoKeyBtn');
  const opencodeGoStatusMsg = document.getElementById('opencodeGoStatusMsg');

  // Popular elements
  const popPillOpenAI = document.getElementById('popPillOpenAI');
  const popPillAnthropic = document.getElementById('popPillAnthropic');
  const popPillGoogle = document.getElementById('popPillGoogle');
  const popPillCopilot = document.getElementById('popPillCopilot');
  const popPillDeepSeek = document.getElementById('popPillDeepSeek');
  const popPillOpenRouter = document.getElementById('popPillOpenRouter');

  const popContentOpenAI = document.getElementById('popContentOpenAI');
  const popContentAnthropic = document.getElementById('popContentAnthropic');
  const popContentGoogle = document.getElementById('popContentGoogle');
  const popContentCopilot = document.getElementById('popContentCopilot');
  const popContentDeepSeek = document.getElementById('popContentDeepSeek');
  const popContentOpenRouter = document.getElementById('popContentOpenRouter');

  // OpenAI sub-elements
  const openaiToggleDevice = document.getElementById('openaiToggleDevice');
  const openaiToggleKey = document.getElementById('openaiToggleKey');
  const openaiToggleBrowser = document.getElementById('openaiToggleBrowser');
  const openaiDeviceSubpanel = document.getElementById('openaiDeviceSubpanel');
  const openaiKeySubpanel = document.getElementById('openaiKeySubpanel');
  const openaiBrowserSubpanel = document.getElementById('openaiBrowserSubpanel');
  const opencodeOpenAIDeviceCodeBadge = document.getElementById('opencodeOpenAIDeviceCodeBadge');
  const copyOpencodeOpenAICodeBtn = document.getElementById('copyOpencodeOpenAICodeBtn');
  const opencodeOpenAIDeviceLink = document.getElementById('opencodeOpenAIDeviceLink');
  const opencodeOpenAIStatusMsg = document.getElementById('opencodeOpenAIStatusMsg');
  const opencodeOpenAIApiKeyInput = document.getElementById('opencodeOpenAIApiKeyInput');
  const saveOpencodeOpenAIKeyBtn = document.getElementById('saveOpencodeOpenAIKeyBtn');
  const opencodeStartOpenAIBrowserBtn = document.getElementById('opencodeStartOpenAIBrowserBtn');

  // Anthropic elements
  const opencodeAnthropicApiKeyInput = document.getElementById('opencodeAnthropicApiKeyInput');
  const opencodeAnthropicLabelInput = document.getElementById('opencodeAnthropicLabelInput');
  const saveOpencodeAnthropicKeyBtn = document.getElementById('saveOpencodeAnthropicKeyBtn');
  const opencodeAnthropicStatusMsg = document.getElementById('opencodeAnthropicStatusMsg');

  // Google elements
  const opencodeGoogleApiKeyInput = document.getElementById('opencodeGoogleApiKeyInput');
  const saveOpencodeGoogleKeyBtn = document.getElementById('saveOpencodeGoogleKeyBtn');
  const opencodeGoogleStatusMsg = document.getElementById('opencodeGoogleStatusMsg');

  // Copilot elements
  const opencodeCopilotDeviceCodeBadge = document.getElementById('opencodeCopilotDeviceCodeBadge');
  const copyOpencodeCopilotCodeBtn = document.getElementById('copyOpencodeCopilotCodeBtn');
  const opencodeCopilotDeviceLink = document.getElementById('opencodeCopilotDeviceLink');
  const opencodeCopilotStatusMsg = document.getElementById('opencodeCopilotStatusMsg');

  // DeepSeek elements
  const opencodeDeepSeekApiKeyInput = document.getElementById('opencodeDeepSeekApiKeyInput');
  const saveOpencodeDeepSeekKeyBtn = document.getElementById('saveOpencodeDeepSeekKeyBtn');
  const opencodeDeepSeekStatusMsg = document.getElementById('opencodeDeepSeekStatusMsg');

  // OpenRouter elements
  const opencodeOpenRouterApiKeyInput = document.getElementById('opencodeOpenRouterApiKeyInput');
  const saveOpencodeOpenRouterKeyBtn = document.getElementById('saveOpencodeOpenRouterKeyBtn');
  const opencodeOpenRouterStatusMsg = document.getElementById('opencodeOpenRouterStatusMsg');

  // Catalog elements
  const opencodeProviderSearch = document.getElementById('opencodeProviderSearch');
  const opencodeProviderSelect = document.getElementById('opencodeProviderSelect');
  const opencodeProviderDocLink = document.getElementById('opencodeProviderDocLink');
  const opencodeCatalogCountBadge = document.getElementById('opencodeCatalogCountBadge');
  const opencodeCustomTargetBox = document.getElementById('opencodeCustomTargetBox');
  const opencodeCustomTargetInput = document.getElementById('opencodeCustomTargetInput');
  const opencodeLabelInput = document.getElementById('opencodeLabelInput');
  const opencodeApiKeyInput = document.getElementById('opencodeApiKeyInput');
  const submitOpencodeLoginBtn = document.getElementById('submitOpencodeLoginBtn');
  const opencodeCatalogStatusMsg = document.getElementById('opencodeCatalogStatusMsg');

  // Accounts list elements
  const opencodeIntegrationsList = document.getElementById('opencodeIntegrationsList');
  const refreshOpencodeListBtn = document.getElementById('refreshOpencodeListBtn');

  let fullOpenCodeCatalog = null;
  let currentOpenCodeConsoleSessionId = null;
  let opencodeConsolePollInterval = null;
  let currentOpenCodeProviderSessionId = null;
  let opencodeProviderPollInterval = null;

  let currentOAuthState = null;
  let oauthPollInterval = null;
  let currentClaudeSessionId = null;
  let currentCodexSessionId = null;
  let codexPollInterval = null;
  let lastAutoPastedUrl = '';

  const runBadge = document.getElementById('runBadge');
  const elapsedTimer = document.getElementById('elapsedTimer');
  const toolCountSpan = document.getElementById('toolCount');

  const tabOutput = document.getElementById('tabOutput');
  const tabThinking = document.getElementById('tabThinking');
  const tabTools = document.getElementById('tabTools');
  const tabHistory = document.getElementById('tabHistory');

  const viewOutput = document.getElementById('viewOutput');
  const viewThinking = document.getElementById('viewThinking');
  const viewTools = document.getElementById('viewTools');
  const viewHistory = document.getElementById('viewHistory');

  // State
  let currentOutputText = '';
  let currentThinkingText = '';
  let currentTools = [];

  // Initialize
  init();

  async function init() {
    cwdInput.value = '/var/home/fazdev/deepseek-harness';
    promptInput.value = 'Tampilkan status singkat sistem dan katakan halo dari agent CLI!';

    setupTabs();
    setupActions();
    await loadAgents();
  }

  function setupTabs() {
    const tabs = [
      { btn: tabOutput, view: viewOutput },
      { btn: tabThinking, view: viewThinking },
      { btn: tabTools, view: viewTools },
      { btn: tabHistory, view: viewHistory }
    ];

    tabs.forEach(({ btn, view }) => {
      btn.addEventListener('click', () => {
        tabs.forEach((t) => {
          t.btn.classList.remove('active');
          t.view.classList.add('hidden');
        });
        btn.classList.add('active');
        view.classList.remove('hidden');

        if (view === viewHistory) {
          loadHistory();
        }
      });
    });
  }

  function setupActions() {
    agentSelect.addEventListener('change', () => {
      closeAllLoginModals();
      const selected = agents.find((a) => a.id === agentSelect.value);
      updateModelOptions(selected);
      if (selected) loadAccount(selected.id);
    });

    if (toggleAuthKeyBtn) {
      toggleAuthKeyBtn.addEventListener('click', () => {
        authKeyBox.classList.toggle('hidden');
      });
    }

    if (switchAccountBtn) {
      switchAccountBtn.addEventListener('click', async () => {
        const target = accountSelect.value;
        if (!target) return;
        try {
          switchAccountBtn.disabled = true;
          switchAccountBtn.textContent = 'Switching...';
          const res = await fetch('/api/agent-runner/account/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: agentSelect.value, targetAccount: target })
          });
          const data = await res.json();
          if (data.ok) {
            accountBadge.textContent = data.activeAccount;
            accountBadge.className = 'text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 truncate max-w-[200px]';
          } else {
            alert('Gagal ganti akun: ' + (data.error || 'Unknown error'));
          }
        } catch (e) {
          alert('Error: ' + e.message);
        } finally {
          switchAccountBtn.disabled = false;
          switchAccountBtn.textContent = 'Switch';
        }
      });
    }

    if (loginAgentBtn) {
      loginAgentBtn.addEventListener('click', handleOpenLoginModal);
    }

    if (closeOauthBoxBtn) {
      closeOauthBoxBtn.addEventListener('click', closeAllLoginModals);
    }

    if (closeClaudeBoxBtn) {
      closeClaudeBoxBtn.addEventListener('click', closeAllLoginModals);
    }

    if (claudeTabSubscription) {
      claudeTabSubscription.addEventListener('click', () => handleSelectClaudeMethod('claudeai'));
    }

    if (claudeTabConsole) {
      claudeTabConsole.addEventListener('click', () => handleSelectClaudeMethod('console'));
    }

    if (submitClaudeCodeBtn) {
      submitClaudeCodeBtn.addEventListener('click', handleSubmitClaudeCode);
    }

    if (claudeAutoPasteBtn) {
      claudeAutoPasteBtn.addEventListener('click', handleClaudeAutoPaste);
    }

    if (claudeCodeInput) {
      claudeCodeInput.addEventListener('paste', () => {
        setTimeout(() => {
          if (claudeCodeInput.value.trim().length > 5) handleSubmitClaudeCode();
        }, 50);
      });
    }

    if (closeCodexBoxBtn) {
      closeCodexBoxBtn.addEventListener('click', closeAllLoginModals);
    }

    if (codexTabChatgpt) {
      codexTabChatgpt.addEventListener('click', () => handleSelectCodexMethod('chatgpt'));
    }

    if (codexTabDevice) {
      codexTabDevice.addEventListener('click', () => handleSelectCodexMethod('device'));
    }

    if (codexTabApiKey) {
      codexTabApiKey.addEventListener('click', () => handleSelectCodexMethod('apikey'));
    }

    if (saveCodexKeyBtn) {
      saveCodexKeyBtn.addEventListener('click', handleSaveCodexKey);
    }

    if (copyCodexCodeBtn) {
      copyCodexCodeBtn.addEventListener('click', handleCopyCodexCode);
    }

    if (submitPastedUrlBtn) {
      submitPastedUrlBtn.addEventListener('click', handleSubmitPastedUrl);
    }

    if (autoPasteBtn) {
      autoPasteBtn.addEventListener('click', handleAutoPaste);
    }

    if (pastedUrlInput) {
      pastedUrlInput.addEventListener('paste', () => {
        setTimeout(() => {
          const val = pastedUrlInput.value.trim();
          if (val.includes('code=') || val.includes('oauth-callback')) {
            handleSubmitPastedUrl();
          }
        }, 50);
      });

      pastedUrlInput.addEventListener('input', () => {
        const val = pastedUrlInput.value.trim();
        if (val.includes('code=') && val.includes('state=')) {
          handleSubmitPastedUrl();
        }
      });
    }

    if (authModalCloseBtn) {
      authModalCloseBtn.addEventListener('click', closeAllLoginModals);
    }

    if (authModalBackdrop) {
      authModalBackdrop.addEventListener('click', (e) => {
        if (e.target === authModalBackdrop) closeAllLoginModals();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllLoginModals();
    });

    // 4 OpenCode Subtabs
    if (opencodeTabConsole) {
      opencodeTabConsole.addEventListener('click', () => handleSelectOpenCodeTab('console'));
    }
    if (opencodeTabGo) {
      opencodeTabGo.addEventListener('click', () => handleSelectOpenCodeTab('go'));
    }
    if (opencodeTabPopular) {
      opencodeTabPopular.addEventListener('click', () => handleSelectOpenCodeTab('popular'));
    }
    if (opencodeTabCatalog) {
      opencodeTabCatalog.addEventListener('click', () => handleSelectOpenCodeTab('catalog'));
    }

    // Tab 1: Console subpanel listeners
    if (opencodeConsoleToggleDevice) {
      opencodeConsoleToggleDevice.addEventListener('click', () => handleSelectConsoleMode('device'));
    }
    if (opencodeConsoleToggleKey) {
      opencodeConsoleToggleKey.addEventListener('click', () => handleSelectConsoleMode('key'));
    }
    if (copyOpencodeCodeBtn) {
      copyOpencodeCodeBtn.addEventListener('click', handleCopyOpenCodeCode);
    }
    if (saveOpencodeConsoleKeyBtn) {
      saveOpencodeConsoleKeyBtn.addEventListener('click', handleSaveOpenCodeConsoleKey);
    }

    // Tab 2: OpenCode Go listeners
    if (saveOpencodeGoKeyBtn) {
      saveOpencodeGoKeyBtn.addEventListener('click', handleSaveOpenCodeGoKey);
    }

    // Tab 3: Popular pills listeners
    if (popPillOpenAI) {
      popPillOpenAI.addEventListener('click', () => handleSelectPopularProvider('openai'));
    }
    if (popPillAnthropic) {
      popPillAnthropic.addEventListener('click', () => handleSelectPopularProvider('anthropic'));
    }
    if (popPillGoogle) {
      popPillGoogle.addEventListener('click', () => handleSelectPopularProvider('google'));
    }
    if (popPillCopilot) {
      popPillCopilot.addEventListener('click', () => handleSelectPopularProvider('copilot'));
    }
    if (popPillDeepSeek) {
      popPillDeepSeek.addEventListener('click', () => handleSelectPopularProvider('deepseek'));
    }
    if (popPillOpenRouter) {
      popPillOpenRouter.addEventListener('click', () => handleSelectPopularProvider('openrouter'));
    }

    // OpenAI sub-toggle listeners
    if (openaiToggleDevice) {
      openaiToggleDevice.addEventListener('click', () => handleSelectOpenAIMethod('device'));
    }
    if (openaiToggleKey) {
      openaiToggleKey.addEventListener('click', () => handleSelectOpenAIMethod('key'));
    }
    if (openaiToggleBrowser) {
      openaiToggleBrowser.addEventListener('click', () => handleSelectOpenAIMethod('browser'));
    }
    if (copyOpencodeOpenAICodeBtn) {
      copyOpencodeOpenAICodeBtn.addEventListener('click', handleCopyOpenCodeOpenAICode);
    }
    if (saveOpencodeOpenAIKeyBtn) {
      saveOpencodeOpenAIKeyBtn.addEventListener('click', () => {
        const key = opencodeOpenAIApiKeyInput.value.trim();
        if (!key) { alert('Masukkan OpenAI API Key'); return; }
        saveGenericProviderKey('openai', key, 'OpenAI Key', saveOpencodeOpenAIKeyBtn, opencodeOpenAIStatusMsg);
      });
    }
    if (opencodeStartOpenAIBrowserBtn) {
      opencodeStartOpenAIBrowserBtn.addEventListener('click', () => handleStartOpenCodeProviderAuth('openai', 'chatgpt-browser'));
    }

    // Anthropic listener
    if (saveOpencodeAnthropicKeyBtn) {
      saveOpencodeAnthropicKeyBtn.addEventListener('click', () => {
        const key = opencodeAnthropicApiKeyInput.value.trim();
        const lbl = opencodeAnthropicLabelInput.value.trim() || 'Anthropic Key';
        if (!key) { alert('Masukkan Anthropic API Key'); return; }
        saveGenericProviderKey('anthropic', key, lbl, saveOpencodeAnthropicKeyBtn, opencodeAnthropicStatusMsg);
      });
    }

    // Google listener
    if (saveOpencodeGoogleKeyBtn) {
      saveOpencodeGoogleKeyBtn.addEventListener('click', () => {
        const key = opencodeGoogleApiKeyInput.value.trim();
        if (!key) { alert('Masukkan Google API Key'); return; }
        saveGenericProviderKey('google', key, 'Google Gemini Key', saveOpencodeGoogleKeyBtn, opencodeGoogleStatusMsg);
      });
    }

    // Copilot listener
    if (copyOpencodeCopilotCodeBtn) {
      copyOpencodeCopilotCodeBtn.addEventListener('click', handleCopyOpenCodeCopilotCode);
    }

    // DeepSeek listener
    if (saveOpencodeDeepSeekKeyBtn) {
      saveOpencodeDeepSeekKeyBtn.addEventListener('click', () => {
        const key = opencodeDeepSeekApiKeyInput.value.trim();
        if (!key) { alert('Masukkan DeepSeek API Key'); return; }
        saveGenericProviderKey('deepseek', key, 'DeepSeek Key', saveOpencodeDeepSeekKeyBtn, opencodeDeepSeekStatusMsg);
      });
    }

    // OpenRouter listener
    if (saveOpencodeOpenRouterKeyBtn) {
      saveOpencodeOpenRouterKeyBtn.addEventListener('click', () => {
        const key = opencodeOpenRouterApiKeyInput.value.trim();
        if (!key) { alert('Masukkan OpenRouter API Key'); return; }
        saveGenericProviderKey('openrouter', key, 'OpenRouter Key', saveOpencodeOpenRouterKeyBtn, opencodeOpenRouterStatusMsg);
      });
    }

    // Tab 4: Catalog listeners
    if (opencodeProviderSelect) {
      opencodeProviderSelect.addEventListener('change', () => {
        if (opencodeProviderSelect.value === 'custom') {
          opencodeCustomTargetBox.classList.remove('hidden');
          opencodeCustomTargetInput.focus();
        } else {
          opencodeCustomTargetBox.classList.add('hidden');
        }
        updateOpenCodeDocLink();
      });
    }

    if (opencodeProviderSearch) {
      opencodeProviderSearch.addEventListener('input', () => {
        renderOpenCodeProviderOptions(opencodeProviderSearch.value.trim());
      });
    }

    if (submitOpencodeLoginBtn) {
      submitOpencodeLoginBtn.addEventListener('click', handleSubmitOpenCodeLogin);
    }

    if (refreshOpencodeListBtn) {
      refreshOpencodeListBtn.addEventListener('click', loadOpenCodeIntegrations);
    }

    window.addEventListener('focus', checkClipboardOnFocus);

    runBtn.addEventListener('click', handleRun);
    cancelBtn.addEventListener('click', handleCancel);
    testBtn.addEventListener('click', handleTest);
    clearBtn.addEventListener('click', clearViews);
  }

  function closeAllLoginModals() {
    stopOAuthPolling();
    stopCodexPolling();
    stopOpenCodeConsolePolling();
    stopOpenCodeProviderPolling();
    if (authModalBackdrop) authModalBackdrop.classList.add('hidden');
    if (oauthBox) oauthBox.classList.add('hidden');
    if (claudeBox) claudeBox.classList.add('hidden');
    if (codexBox) codexBox.classList.add('hidden');
    if (opencodeBox) opencodeBox.classList.add('hidden');
  }

  function handleOpenLoginModal() {
    closeAllLoginModals();
    const current = agentSelect.value;
    if (authModalBackdrop) authModalBackdrop.classList.remove('hidden');

    if (current === 'agy') {
      if (authModalTitle) authModalTitle.textContent = 'Google OAuth Sign-In';
      if (authModalSubtitle) authModalSubtitle.textContent = 'Antigravity / Gemini CLI Authentication';
      oauthBox.classList.remove('hidden');
      handleStartGoogleOAuth();
    } else if (current === 'claude') {
      if (authModalTitle) authModalTitle.textContent = 'Claude Code Sign-In';
      if (authModalSubtitle) authModalSubtitle.textContent = 'Anthropic Claude CLI Authentication';
      claudeBox.classList.remove('hidden');
      handleSelectClaudeMethod('claudeai');
    } else if (current === 'codex') {
      if (authModalTitle) authModalTitle.textContent = 'OpenAI Codex Sign-In';
      if (authModalSubtitle) authModalSubtitle.textContent = 'OpenAI Codex CLI Authentication';
      codexBox.classList.remove('hidden');
      handleSelectCodexMethod('chatgpt');
    } else if (current === 'opencode') {
      if (authModalTitle) authModalTitle.textContent = 'OpenCode Provider & Auth Manager';
      if (authModalSubtitle) authModalSubtitle.textContent = 'OpenCode Console Device Code & 230+ Model Providers';
      opencodeBox.classList.remove('hidden');
      handleSelectOpenCodeTab('console');
    }
  }

  function stopOAuthPolling() {
    if (oauthPollInterval) {
      clearInterval(oauthPollInterval);
      oauthPollInterval = null;
    }
  }

  async function handleStartGoogleOAuth() {
    try {
      oauthBox.classList.remove('hidden');
      oauthStatusMsg.textContent = 'Memulai sesi Google OAuth...';
      oauthStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';
      oauthLink.textContent = 'Menyiapkan URL...';
      oauthLink.removeAttribute('href');

      const res = await fetch('/api/agent-runner/auth/google/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: 51121 })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to start OAuth');

      currentOAuthState = data.state;
      oauthLink.href = data.authUrl;
      oauthLink.textContent = 'Buka Google Login →';
      oauthStatusMsg.textContent = 'Menunggu otorisasi di browser...';

      // Start polling for loopback callback completion
      stopOAuthPolling();
      oauthPollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/agent-runner/auth/google/status?state=${encodeURIComponent(currentOAuthState)}`);
          const pollData = await pollRes.json();
          if (pollData.ok) {
            if (pollData.status === 'completed') {
              stopOAuthPolling();
              oauthStatusMsg.textContent = `✓ Berhasil login: ${pollData.email}`;
              oauthStatusMsg.className = 'text-[11px] text-emerald-400 font-mono font-bold';
              setTimeout(() => {
                closeAllLoginModals();
                loadAccount(agentSelect.value);
              }, 2000);
            } else if (pollData.status === 'failed') {
              stopOAuthPolling();
              oauthStatusMsg.textContent = `Login gagal: ${pollData.error}`;
              oauthStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
            }
          }
        } catch (e) {
          console.warn('OAuth poll error:', e);
        }
      }, 1500);
    } catch (err) {
      oauthStatusMsg.textContent = `Error: ${err.message}`;
      oauthStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    }
  }

  async function handleSubmitPastedUrl() {
    const pasted = pastedUrlInput.value.trim();
    if (!pasted) return;
    try {
      submitPastedUrlBtn.disabled = true;
      submitPastedUrlBtn.textContent = '...';
      oauthStatusMsg.textContent = 'Memverifikasi URL...';
      oauthStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';

      const res = await fetch('/api/agent-runner/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: pasted })
      });
      const data = await res.json();
      if (data.ok) {
        stopOAuthPolling();
        oauthStatusMsg.textContent = `✓ Berhasil login: ${data.activeAccount}`;
        oauthStatusMsg.className = 'text-[11px] text-emerald-400 font-mono font-bold';
        pastedUrlInput.value = '';
        setTimeout(() => {
          closeAllLoginModals();
          loadAccount(agentSelect.value);
        }, 1500);
      } else {
        oauthStatusMsg.textContent = `Gagal: ${data.error || 'Verifikasi gagal'}`;
        oauthStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
      }
    } catch (err) {
      oauthStatusMsg.textContent = `Error: ${err.message}`;
      oauthStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    } finally {
      submitPastedUrlBtn.disabled = false;
      submitPastedUrlBtn.textContent = 'Submit';
    }
  }

  async function handleAutoPaste() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      oauthStatusMsg.textContent = 'Clipboard API tidak didukung browser ini. Silakan paste manual (Ctrl+V).';
      oauthStatusMsg.className = 'text-[11px] text-amber-400 font-mono';
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = (text || '').trim();
      if (trimmed.includes('code=') || trimmed.includes('oauth-callback')) {
        pastedUrlInput.value = trimmed;
        await handleSubmitPastedUrl();
      } else {
        oauthStatusMsg.textContent = 'Clipboard tidak berisi URL redirect OAuth yang valid.';
        oauthStatusMsg.className = 'text-[11px] text-amber-400 font-mono';
      }
    } catch (err) {
      oauthStatusMsg.textContent = `Akses clipboard ditolak: ${err.message}. Silakan paste manual (Ctrl+V).`;
      oauthStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    }
  }

  async function checkClipboardOnFocus() {
    if (!oauthBox || oauthBox.classList.contains('hidden') || !pastedUrlInput) return;
    if (pastedUrlInput.value.trim().length > 0) return;
    if (!navigator.clipboard || !navigator.clipboard.readText) return;

    try {
      const text = await navigator.clipboard.readText();
      const trimmed = (text || '').trim();
      if (trimmed && (trimmed.includes('oauth-callback') || trimmed.includes('code=')) && trimmed !== lastAutoPastedUrl) {
        lastAutoPastedUrl = trimmed;
        pastedUrlInput.value = trimmed;
        await handleSubmitPastedUrl();
      }
    } catch {
      // Ignore background clipboard access rejection on focus
    }
  }

  // Claude Interactive Login Logic
  let currentClaudeMethod = 'claudeai';
  async function handleSelectClaudeMethod(method) {
    currentClaudeMethod = method;
    if (method === 'claudeai') {
      claudeTabSubscription.className = 'flex-1 py-1 px-1.5 rounded bg-indigo-600 text-white transition text-center';
      claudeTabConsole.className = 'flex-1 py-1 px-1.5 rounded text-slate-400 hover:text-slate-200 transition text-center';
      claudeMethodDesc.textContent = 'Gunakan langganan Claude Pro, Team, atau Enterprise:';
    } else {
      claudeTabConsole.className = 'flex-1 py-1 px-1.5 rounded bg-indigo-600 text-white transition text-center';
      claudeTabSubscription.className = 'flex-1 py-1 px-1.5 rounded text-slate-400 hover:text-slate-200 transition text-center';
      claudeMethodDesc.textContent = 'Gunakan akun Anthropic Console (API usage billing):';
    }
    await handleStartClaudeLogin(method);
  }

  async function handleStartClaudeLogin(method) {
    try {
      claudeStatusMsg.textContent = 'Menyiapkan URL otorisasi Claude...';
      claudeStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';
      claudeAuthLink.textContent = 'Menyiapkan URL...';
      claudeAuthLink.removeAttribute('href');

      const res = await fetch('/api/agent-runner/auth/claude/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Gagal memulai login Claude');

      currentClaudeSessionId = data.sessionId;
      claudeAuthLink.href = data.authUrl;
      claudeAuthLink.textContent = 'Buka Claude Login →';
      claudeStatusMsg.textContent = 'Menunggu kode otorisasi dari browser...';
    } catch (err) {
      claudeStatusMsg.textContent = `Error: ${err.message}`;
      claudeStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    }
  }

  async function handleSubmitClaudeCode() {
    const code = claudeCodeInput.value.trim();
    if (!code) return;
    try {
      submitClaudeCodeBtn.disabled = true;
      submitClaudeCodeBtn.textContent = '...';
      claudeStatusMsg.textContent = 'Memverifikasi kode otorisasi...';
      claudeStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';

      const res = await fetch('/api/agent-runner/auth/claude/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentClaudeSessionId, code })
      });
      const data = await res.json();
      if (data.ok) {
        claudeStatusMsg.textContent = `✓ Berhasil login: ${data.activeAccount}`;
        claudeStatusMsg.className = 'text-[11px] text-emerald-400 font-mono font-bold';
        claudeCodeInput.value = '';
        setTimeout(() => {
          closeAllLoginModals();
          loadAccount(agentSelect.value);
        }, 1500);
      } else {
        claudeStatusMsg.textContent = `Gagal: ${data.error || 'Verifikasi kode gagal'}`;
        claudeStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
      }
    } catch (err) {
      claudeStatusMsg.textContent = `Error: ${err.message}`;
      claudeStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    } finally {
      submitClaudeCodeBtn.disabled = false;
      submitClaudeCodeBtn.textContent = 'Submit';
    }
  }

  async function handleClaudeAutoPaste() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      claudeStatusMsg.textContent = 'Clipboard API tidak didukung. Silakan paste manual (Ctrl+V).';
      claudeStatusMsg.className = 'text-[11px] text-amber-400 font-mono';
      return;
    }
    try {
      const text = (await navigator.clipboard.readText() || '').trim();
      if (text.length > 5) {
        claudeCodeInput.value = text;
        await handleSubmitClaudeCode();
      } else {
        claudeStatusMsg.textContent = 'Clipboard tidak berisi kode otorisasi yang valid.';
        claudeStatusMsg.className = 'text-[11px] text-amber-400 font-mono';
      }
    } catch (err) {
      claudeStatusMsg.textContent = `Akses clipboard ditolak: ${err.message}.`;
      claudeStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    }
  }

  // Codex Interactive Login Logic
  function stopCodexPolling() {
    if (codexPollInterval) {
      clearInterval(codexPollInterval);
      codexPollInterval = null;
    }
  }

  let currentCodexMethod = 'chatgpt';
  async function handleSelectCodexMethod(method) {
    currentCodexMethod = method;
    stopCodexPolling();

    // Reset tab styles
    codexTabChatgpt.className = 'flex-1 py-1 px-1.5 rounded text-slate-400 hover:text-slate-200 transition text-center truncate';
    codexTabDevice.className = 'flex-1 py-1 px-1.5 rounded text-slate-400 hover:text-slate-200 transition text-center truncate';
    codexTabApiKey.className = 'flex-1 py-1 px-1.5 rounded text-slate-400 hover:text-slate-200 transition text-center truncate';

    codexChatgptPanel.classList.add('hidden');
    codexDevicePanel.classList.add('hidden');
    codexApiKeyPanel.classList.add('hidden');

    if (method === 'chatgpt') {
      codexTabChatgpt.className = 'flex-1 py-1 px-1.5 rounded bg-indigo-600 text-white transition text-center truncate';
      codexChatgptPanel.classList.remove('hidden');
      await handleStartCodexLogin('chatgpt');
    } else if (method === 'device') {
      codexTabDevice.className = 'flex-1 py-1 px-1.5 rounded bg-indigo-600 text-white transition text-center truncate';
      codexDevicePanel.classList.remove('hidden');
      await handleStartCodexLogin('device');
    } else if (method === 'apikey') {
      codexTabApiKey.className = 'flex-1 py-1 px-1.5 rounded bg-indigo-600 text-white transition text-center truncate';
      codexApiKeyPanel.classList.remove('hidden');
      codexStatusMsg.textContent = '';
      if (codexApiKeyInput) codexApiKeyInput.focus();
    }
  }

  async function handleStartCodexLogin(method) {
    try {
      stopCodexPolling();
      codexStatusMsg.textContent = 'Memulai sesi login Codex...';
      codexStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';

      const res = await fetch('/api/agent-runner/auth/codex/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Gagal memulai login Codex');

      currentCodexSessionId = data.sessionId;
      if (method === 'chatgpt') {
        codexChatgptLink.href = data.authUrl;
        codexStatusMsg.textContent = 'Menunggu otorisasi di browser (port 1455)...';
      } else if (method === 'device') {
        codexDeviceCodeBadge.textContent = data.userCode || '------';
        codexStatusMsg.textContent = 'Menunggu konfirmasi device code di browser...';
      }

      // Start polling status
      codexPollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/agent-runner/auth/codex/status?sessionId=${encodeURIComponent(currentCodexSessionId)}`);
          const pollData = await pollRes.json();
          if (pollData.ok) {
            if (pollData.status === 'completed') {
              stopCodexPolling();
              codexStatusMsg.textContent = '✓ Berhasil login ke OpenAI Codex!';
              codexStatusMsg.className = 'text-[11px] text-emerald-400 font-mono font-bold';
              setTimeout(() => {
                closeAllLoginModals();
                loadAccount(agentSelect.value);
              }, 1500);
            } else if (pollData.status === 'failed') {
              stopCodexPolling();
              codexStatusMsg.textContent = `Login gagal: ${pollData.error || 'Unknown error'}`;
              codexStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
            }
          }
        } catch (e) {
          console.warn('Codex poll error:', e);
        }
      }, 1500);
    } catch (err) {
      codexStatusMsg.textContent = `Error: ${err.message}`;
      codexStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    }
  }

  async function handleSaveCodexKey() {
    const key = codexApiKeyInput.value.trim();
    if (!key) return;
    try {
      saveCodexKeyBtn.disabled = true;
      saveCodexKeyBtn.textContent = '...';
      codexStatusMsg.textContent = 'Menyimpan API Key ke Codex...';
      codexStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';

      const res = await fetch('/api/agent-runner/auth/codex/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json();
      if (data.ok) {
        codexStatusMsg.textContent = '✓ API Key berhasil disimpan ke Codex!';
        codexStatusMsg.className = 'text-[11px] text-emerald-400 font-mono font-bold';
        codexApiKeyInput.value = '';
        setTimeout(() => {
          codexBox.classList.add('hidden');
          loadAccount(agentSelect.value);
        }, 1500);
      } else {
        codexStatusMsg.textContent = `Gagal: ${data.error || 'Gagal menyimpan key'}`;
        codexStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
      }
    } catch (err) {
      codexStatusMsg.textContent = `Error: ${err.message}`;
      codexStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    } finally {
      saveCodexKeyBtn.disabled = false;
      saveCodexKeyBtn.textContent = 'Simpan';
    }
  }

  async function handleCopyCodexCode() {
    const code = codexDeviceCodeBadge.textContent.trim();
    if (!code || code === '------') return;
    try {
      await navigator.clipboard.writeText(code);
      copyCodexCodeBtn.textContent = 'Disalin!';
      setTimeout(() => { copyCodexCodeBtn.textContent = 'Salin'; }, 1500);
    } catch (e) {
      alert('Gagal menyalin: ' + e.message);
    }
  }

  // OpenCode Tab & Console Device Auth Logic
  let currentOpenCodeTab = 'console';

  function stopOpenCodeConsolePolling() {
    if (opencodeConsolePollInterval) {
      clearInterval(opencodeConsolePollInterval);
      opencodeConsolePollInterval = null;
    }
    if (currentOpenCodeConsoleSessionId) {
      fetch('/api/agent-runner/auth/opencode/console/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentOpenCodeConsoleSessionId })
      }).catch(() => {});
      currentOpenCodeConsoleSessionId = null;
    }
  }

  async function handleSelectOpenCodeTab(tab) {
    currentOpenCodeTab = tab;
    stopOpenCodeConsolePolling();
    stopOpenCodeProviderPolling();

    const tabs = [
      { id: 'console', btn: opencodeTabConsole, panel: opencodeConsolePanel },
      { id: 'go', btn: opencodeTabGo, panel: opencodeGoPanel },
      { id: 'popular', btn: opencodeTabPopular, panel: opencodePopularPanel },
      { id: 'catalog', btn: opencodeTabCatalog, panel: opencodeCatalogPanel },
    ];

    tabs.forEach((t) => {
      if (t.btn) {
        if (t.id === tab) {
          t.btn.classList.add('active');
        } else {
          t.btn.classList.remove('active');
        }
      }
      if (t.panel) {
        if (t.id === tab) {
          t.panel.classList.remove('hidden');
        } else {
          t.panel.classList.add('hidden');
        }
      }
    });

    if (tab === 'console') {
      if (!opencodeConsoleKeySubpanel || opencodeConsoleKeySubpanel.classList.contains('hidden')) {
        await handleStartOpenCodeConsoleLogin();
      }
    } else if (tab === 'popular') {
      handleSelectPopularProvider('openai');
    } else if (tab === 'catalog') {
      loadOpenCodeCatalog();
    }
    loadOpenCodeIntegrations();
  }

  function handleSelectConsoleMode(mode) {
    if (mode === 'device') {
      if (opencodeConsoleToggleDevice) opencodeConsoleToggleDevice.classList.add('active');
      if (opencodeConsoleToggleKey) opencodeConsoleToggleKey.classList.remove('active');
      if (opencodeConsoleDeviceSubpanel) opencodeConsoleDeviceSubpanel.classList.remove('hidden');
      if (opencodeConsoleKeySubpanel) opencodeConsoleKeySubpanel.classList.add('hidden');
      handleStartOpenCodeConsoleLogin();
    } else {
      if (opencodeConsoleToggleKey) opencodeConsoleToggleKey.classList.add('active');
      if (opencodeConsoleToggleDevice) opencodeConsoleToggleDevice.classList.remove('active');
      if (opencodeConsoleKeySubpanel) opencodeConsoleKeySubpanel.classList.remove('hidden');
      if (opencodeConsoleDeviceSubpanel) opencodeConsoleDeviceSubpanel.classList.add('hidden');
      stopOpenCodeConsolePolling();
    }
  }

  async function handleSaveOpenCodeConsoleKey() {
    const apiKey = opencodeConsoleApiKeyInput ? opencodeConsoleApiKeyInput.value.trim() : '';
    const label = (opencodeConsoleLabelInput && opencodeConsoleLabelInput.value.trim()) || 'Service Account';
    if (!apiKey) {
      alert('Masukkan OpenCode Console API Key');
      return;
    }
    await saveGenericProviderKey('opencode', apiKey, label, saveOpencodeConsoleKeyBtn, opencodeConsoleKeyStatusMsg);
  }

  async function handleSaveOpenCodeGoKey() {
    const apiKey = opencodeGoApiKeyInput ? opencodeGoApiKeyInput.value.trim() : '';
    const label = (opencodeGoLabelInput && opencodeGoLabelInput.value.trim()) || 'OpenCode Go Key';
    if (!apiKey) {
      alert('Masukkan OpenCode Go API Key');
      return;
    }
    await saveGenericProviderKey('opencode-go', apiKey, label, saveOpencodeGoKeyBtn, opencodeGoStatusMsg);
  }

  function handleSelectPopularProvider(prov) {
    const providers = [
      { id: 'openai', pill: popPillOpenAI, content: popContentOpenAI },
      { id: 'anthropic', pill: popPillAnthropic, content: popContentAnthropic },
      { id: 'google', pill: popPillGoogle, content: popContentGoogle },
      { id: 'copilot', pill: popPillCopilot, content: popContentCopilot },
      { id: 'deepseek', pill: popPillDeepSeek, content: popContentDeepSeek },
      { id: 'openrouter', pill: popPillOpenRouter, content: popContentOpenRouter }
    ];

    providers.forEach((p) => {
      if (p.pill) {
        if (p.id === prov) p.pill.classList.add('active');
        else p.pill.classList.remove('active');
      }
      if (p.content) {
        if (p.id === prov) p.content.classList.remove('hidden');
        else p.content.classList.add('hidden');
      }
    });

    if (prov === 'copilot') {
      handleStartOpenCodeProviderAuth('github-copilot', 'device');
    } else if (prov === 'openai') {
      handleSelectOpenAIMethod('device');
    }
  }

  function handleSelectOpenAIMethod(method) {
    if (!openaiToggleDevice || !openaiToggleKey || !openaiToggleBrowser) return;
    [openaiToggleDevice, openaiToggleKey, openaiToggleBrowser].forEach((btn) => btn.classList.remove('active'));
    [openaiDeviceSubpanel, openaiKeySubpanel, openaiBrowserSubpanel].forEach((pnl) => pnl && pnl.classList.add('hidden'));

    if (method === 'device') {
      openaiToggleDevice.classList.add('active');
      if (openaiDeviceSubpanel) openaiDeviceSubpanel.classList.remove('hidden');
      handleStartOpenCodeProviderAuth('openai', 'chatgpt-headless');
    } else if (method === 'key') {
      openaiToggleKey.classList.add('active');
      if (openaiKeySubpanel) openaiKeySubpanel.classList.remove('hidden');
      stopOpenCodeProviderPolling();
    } else if (method === 'browser') {
      openaiToggleBrowser.classList.add('active');
      if (openaiBrowserSubpanel) openaiBrowserSubpanel.classList.remove('hidden');
      stopOpenCodeProviderPolling();
    }
  }

  async function saveGenericProviderKey(provider, apiKey, label, btnEl, statusEl) {
    try {
      if (btnEl) {
        btnEl.disabled = true;
        btnEl.textContent = 'Menyimpan...';
      }
      if (statusEl) {
        statusEl.textContent = `Menyimpan kredensial ${provider}...`;
        statusEl.className = 'text-[11px] text-indigo-400 font-mono';
      }

      const res = await fetch('/api/agent-runner/auth/opencode/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, label })
      });
      const data = await res.json();
      if (data.ok) {
        if (statusEl) {
          statusEl.textContent = `✓ Berhasil menyimpan ${provider.toUpperCase()}!`;
          statusEl.className = 'text-[11px] text-emerald-400 font-mono font-bold';
        }
        await loadOpenCodeIntegrations();
        await loadAccount('opencode');
        await loadOpenCodeModels();
      } else {
        if (statusEl) {
          statusEl.textContent = `Gagal: ${data.error || 'Terjadi kesalahan'}`;
          statusEl.className = 'text-[11px] text-rose-400 font-mono';
        }
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = `Error: ${err.message}`;
        statusEl.className = 'text-[11px] text-rose-400 font-mono';
      }
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = 'Simpan';
      }
    }
  }

  async function handleStartOpenCodeConsoleLogin() {
    try {
      opencodeConsoleStatusMsg.textContent = 'Memulai otorisasi OpenCode Console...';
      opencodeConsoleStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';
      opencodeDeviceCodeBadge.textContent = 'Menunggu...';

      const res = await fetch('/api/agent-runner/auth/opencode/console/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'device' })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Gagal memulai otorisasi OpenCode Console');

      currentOpenCodeConsoleSessionId = data.sessionId;
      opencodeDeviceCodeBadge.textContent = data.userCode || '------';
      if (data.authUrl) {
        opencodeConsoleAuthLink.href = data.authUrl;
      }
      opencodeConsoleStatusMsg.textContent = 'Menunggu otorisasi browser... Klik tautan di atas untuk masuk.';

      // Start polling status
      opencodeConsolePollInterval = setInterval(async () => {
        try {
          if (!currentOpenCodeConsoleSessionId) return;
          const pollRes = await fetch(`/api/agent-runner/auth/opencode/console/status?sessionId=${encodeURIComponent(currentOpenCodeConsoleSessionId)}`);
          const pollData = await pollRes.json();
          if (pollData.ok) {
            if (pollData.status === 'completed') {
              if (opencodeConsolePollInterval) {
                clearInterval(opencodeConsolePollInterval);
                opencodeConsolePollInterval = null;
              }
              currentOpenCodeConsoleSessionId = null;
              opencodeConsoleStatusMsg.textContent = '✓ Berhasil login ke OpenCode Console!';
              opencodeConsoleStatusMsg.className = 'text-[11px] text-emerald-400 font-mono font-bold';
              setTimeout(() => {
                closeAllLoginModals();
                loadAccount(agentSelect.value);
              }, 1500);
            } else if (pollData.status === 'failed') {
              if (opencodeConsolePollInterval) {
                clearInterval(opencodeConsolePollInterval);
                opencodeConsolePollInterval = null;
              }
              currentOpenCodeConsoleSessionId = null;
              opencodeConsoleStatusMsg.textContent = `Otorisasi gagal: ${pollData.error || 'Unknown error'}`;
              opencodeConsoleStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
            }
          }
        } catch (e) {
          console.warn('OpenCode console poll error:', e);
        }
      }, 1500);
    } catch (err) {
      opencodeConsoleStatusMsg.textContent = `Error: ${err.message}`;
      opencodeConsoleStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
      opencodeDeviceCodeBadge.textContent = '------';
    }
  }

  async function handleCopyOpenCodeCode() {
    const code = opencodeDeviceCodeBadge.textContent.trim();
    if (!code || code === '------' || code === 'Menunggu...') return;
    try {
      await navigator.clipboard.writeText(code);
      copyOpencodeCodeBtn.textContent = 'Disalin!';
      setTimeout(() => { copyOpencodeCodeBtn.textContent = 'Salin Kode'; }, 1500);
    } catch (e) {
      alert('Gagal menyalin: ' + e.message);
    }
  }

  // OpenCode Specific Provider Interactive Auth (OpenAI ChatGPT, Copilot, etc.)
  function stopOpenCodeProviderPolling() {
    if (opencodeProviderPollInterval) {
      clearInterval(opencodeProviderPollInterval);
      opencodeProviderPollInterval = null;
    }
    if (currentOpenCodeProviderSessionId) {
      fetch('/api/agent-runner/auth/opencode/interactive/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentOpenCodeProviderSessionId })
      }).catch(() => {});
      currentOpenCodeProviderSessionId = null;
    }
  }

  async function handleStartOpenCodeProviderAuth(provider, method) {
    try {
      stopOpenCodeProviderPolling();
      const isCopilot = provider === 'github-copilot';
      const badge = isCopilot ? opencodeCopilotDeviceCodeBadge : opencodeOpenAIDeviceCodeBadge;
      const link = isCopilot ? opencodeCopilotDeviceLink : opencodeOpenAIDeviceLink;
      const statusMsg = isCopilot ? opencodeCopilotStatusMsg : opencodeOpenAIStatusMsg;

      if (statusMsg) {
        statusMsg.textContent = `Menghubungi ${provider} (${method})...`;
        statusMsg.className = 'text-[10px] text-indigo-400 font-mono';
      }
      if (badge) badge.textContent = 'Menunggu...';

      const res = await fetch('/api/agent-runner/auth/opencode/interactive/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, method })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Gagal memulai otorisasi');

      currentOpenCodeProviderSessionId = data.sessionId;
      if (data.userCode && badge) {
        badge.textContent = data.userCode;
        badge.parentElement.classList.remove('hidden');
      } else if (badge) {
        badge.parentElement.classList.add('hidden');
      }

      if (link) {
        link.href = data.authUrl || (isCopilot ? 'https://github.com/login/device' : 'https://auth.openai.com/codex/device');
        if (isCopilot) {
          link.textContent = 'Buka github.com/login/device \u2192';
        } else {
          link.textContent = method === 'chatgpt-headless'
            ? 'Buka auth.openai.com/codex/device \u2192'
            : 'Buka Otorisasi OpenAI di Browser \u2192';
        }
      }

      statusMsg.textContent = data.userCode
        ? 'Menunggu verifikasi code di browser...'
        : 'Menunggu otorisasi di browser...';

      // Poll status
      opencodeProviderPollInterval = setInterval(async () => {
        try {
          if (!currentOpenCodeProviderSessionId) return;
          const pollRes = await fetch(`/api/agent-runner/auth/opencode/interactive/status?sessionId=${encodeURIComponent(currentOpenCodeProviderSessionId)}`);
          const pollData = await pollRes.json();
          if (pollData.ok) {
            if (pollData.status === 'completed') {
              if (opencodeProviderPollInterval) {
                clearInterval(opencodeProviderPollInterval);
                opencodeProviderPollInterval = null;
              }
              currentOpenCodeProviderSessionId = null;
              statusMsg.textContent = `✓ Berhasil terhubung ke ${provider.toUpperCase()}!`;
              statusMsg.className = 'text-[10px] text-emerald-400 font-mono font-bold';
              await loadOpenCodeIntegrations();
              await loadAccount('opencode');
              await loadOpenCodeModels();
            } else if (pollData.status === 'failed') {
              if (opencodeProviderPollInterval) {
                clearInterval(opencodeProviderPollInterval);
                opencodeProviderPollInterval = null;
              }
              currentOpenCodeProviderSessionId = null;
              statusMsg.textContent = `Gagal: ${pollData.error || 'Otorisasi ditolak'}`;
              statusMsg.className = 'text-[10px] text-rose-400 font-mono';
            }
          }
        } catch (e) {
          console.warn('OpenCode provider poll error:', e);
        }
      }, 1500);
    } catch (err) {
      const isCopilot = provider === 'github-copilot';
      const statusMsg = isCopilot ? opencodeCopilotStatusMsg : opencodeOpenAIStatusMsg;
      const badge = isCopilot ? opencodeCopilotDeviceCodeBadge : opencodeOpenAIDeviceCodeBadge;
      if (statusMsg) {
        statusMsg.textContent = `Error: ${err.message}`;
        statusMsg.className = 'text-[10px] text-rose-400 font-mono';
      }
      if (badge) badge.textContent = '------';
    }
  }

  async function handleCopyOpenCodeCopilotCode() {
    const code = opencodeCopilotDeviceCodeBadge.textContent.trim();
    if (!code || code === '------' || code === 'Menunggu...') return;
    try {
      await navigator.clipboard.writeText(code);
      copyOpencodeCopilotCodeBtn.textContent = 'Disalin!';
      setTimeout(() => { copyOpencodeCopilotCodeBtn.textContent = 'Salin Kode'; }, 1500);
    } catch (e) {
      alert('Gagal menyalin: ' + e.message);
    }
  }

  async function handleCopyOpenCodeOpenAICode() {
    const code = opencodeOpenAIDeviceCodeBadge.textContent.trim();
    if (!code || code === '------' || code === 'Menunggu...') return;
    try {
      await navigator.clipboard.writeText(code);
      copyOpencodeOpenAICodeBtn.textContent = 'Disalin!';
      setTimeout(() => { copyOpencodeOpenAICodeBtn.textContent = 'Salin Kode'; }, 1500);
    } catch (e) {
      alert('Gagal menyalin: ' + e.message);
    }
  }

  // OpenCode Interactive Auth & Catalog Logic
  async function loadOpenCodeCatalog() {
    try {
      const res = await fetch('/api/agent-runner/auth/opencode/catalog');
      const data = await res.json();
      if (data.ok) {
        fullOpenCodeCatalog = data;
        if (opencodeCatalogCountBadge) {
          opencodeCatalogCountBadge.textContent = `${data.total || 230} Provider`;
        }
        renderOpenCodeProviderOptions(opencodeProviderSearch?.value?.trim() || '');
      }
    } catch (e) {
      console.warn('Failed to load OpenCode catalog:', e);
    }
  }

  function renderOpenCodeProviderOptions(filterQuery = '') {
    if (!opencodeProviderSelect) return;
    const currentVal = opencodeProviderSelect.value;
    const q = (filterQuery || '').toLowerCase();

    const popular = fullOpenCodeCatalog?.popular || [
      { id: 'openrouter', name: 'OpenRouter' },
      { id: 'deepseek', name: 'DeepSeek' },
      { id: 'openai', name: 'OpenAI' },
      { id: 'github-copilot', name: 'GitHub Copilot' },
      { id: 'anthropic', name: 'Anthropic' },
      { id: 'google', name: 'Google (Gemini)' },
      { id: 'groq', name: 'Groq' },
      { id: 'mistral', name: 'Mistral' }
    ];

    const services = fullOpenCodeCatalog?.services || [];

    const matchesFilter = (item) => {
      if (!q) return true;
      return item.id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
    };

    const filteredPopular = popular.filter(matchesFilter);
    const filteredServices = services.filter(matchesFilter);

    let html = '';
    if (filteredPopular.length > 0) {
      html += `<optgroup label="Popular (${filteredPopular.length})">`;
      filteredPopular.forEach((p) => {
        html += `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.id)})</option>`;
      });
      html += `</optgroup>`;
    }

    if (filteredServices.length > 0) {
      html += `<optgroup label="Services (${filteredServices.length})">`;
      filteredServices.forEach((s) => {
        html += `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} (${escapeHtml(s.id)})</option>`;
      });
      html += `</optgroup>`;
    }

    html += `<option value="custom">Lainnya (Custom Provider ID)...</option>`;
    opencodeProviderSelect.innerHTML = html;

    const hasCurrent = Array.from(opencodeProviderSelect.options).some((opt) => opt.value === currentVal);
    if (hasCurrent) {
      opencodeProviderSelect.value = currentVal;
    } else if (filteredPopular.length > 0) {
      opencodeProviderSelect.value = filteredPopular[0].id;
    }

    if (opencodeProviderSelect.value === 'custom') {
      opencodeCustomTargetBox.classList.remove('hidden');
    } else {
      opencodeCustomTargetBox.classList.add('hidden');
    }

    if (opencodeProviderSelect.value === 'openai') {
      if (opencodeOpenAIOAuthBox) opencodeOpenAIOAuthBox.classList.remove('hidden');
      if (opencodeCopilotOAuthBox) opencodeCopilotOAuthBox.classList.add('hidden');
    } else if (opencodeProviderSelect.value === 'github-copilot') {
      if (opencodeCopilotOAuthBox) opencodeCopilotOAuthBox.classList.remove('hidden');
      if (opencodeOpenAIOAuthBox) opencodeOpenAIOAuthBox.classList.add('hidden');
    } else {
      if (opencodeOpenAIOAuthBox) opencodeOpenAIOAuthBox.classList.add('hidden');
      if (opencodeCopilotOAuthBox) opencodeCopilotOAuthBox.classList.add('hidden');
    }

    updateOpenCodeDocLink();
  }

  function updateOpenCodeDocLink() {
    if (!opencodeProviderDocLink || !opencodeProviderSelect) return;
    const selId = opencodeProviderSelect.value;
    if (selId === 'custom' || !fullOpenCodeCatalog) {
      opencodeProviderDocLink.classList.add('hidden');
      return;
    }

    const all = [...(fullOpenCodeCatalog.popular || []), ...(fullOpenCodeCatalog.services || [])];
    const found = all.find((p) => p.id === selId);
    if (found && found.doc) {
      opencodeProviderDocLink.innerHTML = `Dokumentasi: <a href="${escapeHtml(found.doc)}" target="_blank" class="text-indigo-400 hover:text-indigo-300 underline font-mono text-[10px]">${escapeHtml(found.doc)} &rarr;</a>`;
      opencodeProviderDocLink.classList.remove('hidden');
    } else {
      opencodeProviderDocLink.classList.add('hidden');
    }
  }

  async function handleSwitchOpenCodeAccount(provider, credentialId) {
    try {
      const res = await fetch('/api/agent-runner/auth/opencode/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentialId })
      });
      const data = await res.json();
      if (data.ok) {
        await loadOpenCodeIntegrations();
        await loadAccount('opencode');
        await loadOpenCodeModels();
      } else {
        alert('Gagal berganti akun: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error saat berganti akun: ' + err.message);
    }
  }

  // OpenCode Interactive Auth Logic
  async function loadOpenCodeIntegrations() {
    if (!opencodeIntegrationsList) return;
    try {
      opencodeIntegrationsList.innerHTML = '<div class="text-[10px] text-slate-500 italic p-1.5">Memuat daftar provider terhubung...</div>';
      const res = await fetch('/api/agent-runner/auth/opencode/list');
      const data = await res.json();
      const list = data.integrations || [];

      if (list.length === 0) {
        opencodeIntegrationsList.innerHTML = '<div class="text-[11px] text-slate-500 italic p-2 text-center bg-slate-950/40 rounded border border-slate-800/50">Belum ada provider terhubung. Silakan login atau masukkan API key pada sub-tab di atas.</div>';
        return;
      }

      opencodeIntegrationsList.innerHTML = list.map((item) => {
        const isActive = !!item.active;
        return `
          <div class="opencode-acc-card ${isActive ? 'active' : ''}">
            <div class="flex items-center gap-2 truncate min-w-0">
              <span class="opencode-badge-provider">
                ${escapeHtml(item.integrationID || item.provider)}
              </span>
              <div class="truncate">
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-200 font-semibold truncate text-[11px]">${escapeHtml(item.label || item.integrationID)}</span>
                  <span class="opencode-status-badge ${isActive ? 'active' : 'inactive'}">
                    ${isActive ? '✓ Aktif' : 'Tersimpan'}
                  </span>
                </div>
                <div class="text-slate-500 font-mono text-[10px] truncate">
                  ${escapeHtml(item.maskedKey || item.value?.key || 'Connected')}
                </div>
              </div>
            </div>
            <div class="shrink-0 flex items-center gap-1.5">
              ${!isActive ? `
                <button class="opencode-switch-btn" data-provider="${escapeHtml(item.integrationID)}" data-id="${escapeHtml(item.id)}" title="Jadikan akun aktif untuk provider ini">
                  Set Aktif
                </button>
              ` : ''}
              <button class="opencode-logout-btn bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 hover:border-rose-700 text-[10px] px-2 py-0.5 rounded cursor-pointer transition font-medium" data-provider="${escapeHtml(item.integrationID)}" data-id="${escapeHtml(item.id)}" title="Putuskan / hapus akun ini">
                Putuskan
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Wire up switch buttons
      document.querySelectorAll('.opencode-switch-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const provider = btn.getAttribute('data-provider');
          const id = btn.getAttribute('data-id');
          await handleSwitchOpenCodeAccount(provider, id);
        });
      });

      // Wire up logout buttons
      document.querySelectorAll('.opencode-logout-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const provider = btn.getAttribute('data-provider');
          const id = btn.getAttribute('data-id');
          await handleLogoutOpenCode(provider, id);
        });
      });
    } catch (err) {
      opencodeIntegrationsList.innerHTML = `<div class="text-[10px] text-rose-400 p-1.5">Gagal memuat provider: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function handleSubmitOpenCodeLogin() {
    let provider = opencodeProviderSelect.value;
    if (provider === 'custom') {
      provider = opencodeCustomTargetInput.value.trim().toLowerCase();
    }
    const apiKey = opencodeApiKeyInput.value.trim();
    const label = opencodeLabelInput.value.trim();

    if (!provider) {
      alert('Pilih provider atau masukkan custom provider ID.');
      return;
    }
    if (!apiKey) {
      alert('Masukkan API Key provider.');
      return;
    }

    try {
      submitOpencodeLoginBtn.disabled = true;
      submitOpencodeLoginBtn.textContent = '...';
      opencodeStatusMsg.textContent = `Menghubungkan ${provider}...`;
      opencodeStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';

      const res = await fetch('/api/agent-runner/auth/opencode/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, label })
      });
      const data = await res.json();
      if (data.ok) {
        opencodeStatusMsg.textContent = `✓ Provider ${provider.toUpperCase()} berhasil terhubung!`;
        opencodeStatusMsg.className = 'text-[11px] text-emerald-400 font-mono font-bold';
        opencodeApiKeyInput.value = '';
        opencodeLabelInput.value = '';
        await loadOpenCodeIntegrations();
        await loadAccount('opencode');
        await loadOpenCodeModels();
      } else {
        opencodeStatusMsg.textContent = `Gagal: ${data.error || 'Terjadi kesalahan'}`;
        opencodeStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
      }
    } catch (err) {
      opencodeStatusMsg.textContent = `Error: ${err.message}`;
      opencodeStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    } finally {
      submitOpencodeLoginBtn.disabled = false;
      submitOpencodeLoginBtn.textContent = 'Hubungkan';
    }
  }

  async function handleLogoutOpenCode(provider, credentialId) {
    if (!confirm(`Logout dari provider ${provider}?`)) return;
    try {
      opencodeStatusMsg.textContent = `Menghapus akun ${provider}...`;
      opencodeStatusMsg.className = 'text-[11px] text-indigo-400 font-mono';

      const res = await fetch('/api/agent-runner/auth/opencode/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, credentialId })
      });
      const data = await res.json();
      if (data.ok) {
        opencodeStatusMsg.textContent = `✓ Berhasil logout dari ${provider}`;
        opencodeStatusMsg.className = 'text-[11px] text-emerald-400 font-mono font-bold';
        await loadOpenCodeIntegrations();
        await loadAccount('opencode');
        await loadOpenCodeModels();
      } else {
        opencodeStatusMsg.textContent = `Gagal logout: ${data.error || 'Unknown error'}`;
        opencodeStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
      }
    } catch (err) {
      opencodeStatusMsg.textContent = `Error: ${err.message}`;
      opencodeStatusMsg.className = 'text-[11px] text-rose-400 font-mono';
    }
  }

  async function loadOpenCodeModels() {
    try {
      const res = await fetch('/api/agent-runner/auth/opencode/models');
      const data = await res.json();
      const models = data.models || [];
      if (models.length > 0 && agentSelect.value === 'opencode') {
        const curVal = modelSelect.value;
        modelSelect.innerHTML = '<option value="default">Default Model (from config)</option>';
        models.forEach((m) => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          if (m === curVal) opt.selected = true;
          modelSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('Failed to load OpenCode models:', e);
    }
  }

  async function loadAccount(agentId) {
    if (!accountBadge) return;
    try {
      accountBadge.textContent = 'Checking...';
      const res = await fetch(`/api/agent-runner/account?agentId=${encodeURIComponent(agentId)}`);
      const data = await res.json();
      if (data.ok && data.account) {
        const acc = data.account;
        accountBadge.textContent = acc.activeAccount || 'Active';
        if (acc.authType === 'unauthenticated' || (acc.activeAccount && acc.activeAccount.includes('Belum Login'))) {
          accountBadge.className = 'text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 truncate max-w-[260px]';
        } else {
          accountBadge.className = 'text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 truncate max-w-[260px]';
        }

        if (loginAgentBtn) {
          if (acc.supportsOAuth) {
            loginAgentBtn.classList.remove('hidden');
            if (agentId === 'agy') {
              loginAgentBtnText.textContent = '+ Login Akun Google (OAuth)';
            } else if (agentId === 'claude') {
              loginAgentBtnText.textContent = '🔑 Login Claude (Anthropic)';
            } else if (agentId === 'codex') {
              loginAgentBtnText.textContent = '🔑 Login OpenAI Codex';
            } else if (agentId === 'opencode') {
              loginAgentBtnText.textContent = '🔑 Kelola Provider (OpenCode)';
            } else {
              loginAgentBtnText.textContent = '🔑 Login Akun CLI';
            }
          } else {
            loginAgentBtn.classList.add('hidden');
          }
        }

        if (apiKeyInput) {
          if (agentId === 'claude') {
            apiKeyInput.placeholder = 'Masukkan Anthropic API Key (sk-ant-api03-...)';
          } else if (agentId === 'agy') {
            apiKeyInput.placeholder = 'Masukkan Gemini API Key (AIzaSy...)';
          } else if (agentId === 'codex') {
            apiKeyInput.placeholder = 'Masukkan OpenAI API Key (sk-...)';
          } else if (agentId === 'opencode') {
            apiKeyInput.placeholder = 'Optional API Key (atau gunakan Kelola Provider)';
          } else {
            apiKeyInput.placeholder = 'Optional API Key';
          }
        }

        if (acc.canSwitch && acc.accounts && acc.accounts.length > 1) {
          accountSwitchBox.classList.remove('hidden');
          accountSelect.innerHTML = '';
          acc.accounts.forEach((a) => {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            if (a === acc.activeAccount) opt.selected = true;
            accountSelect.appendChild(opt);
          });
        } else {
          accountSwitchBox.classList.add('hidden');
        }
      } else {
        accountBadge.textContent = 'Native Session';
      }
    } catch (err) {
      accountBadge.textContent = 'Native Session';
      console.warn('Account check failed:', err);
    }
  }

  async function loadAgents() {
    try {
      const res = await fetch('/api/agent-runner/agents');
      const data = await res.json();
      agents = data.agents || [];

      agentSelect.innerHTML = '';
      let installedCount = 0;
      let firstInstalled = null;

      agents.forEach((ag) => {
        const opt = document.createElement('option');
        opt.value = ag.id;
        const statusText = ag.installed ? `[Ready: ${ag.version || 'v?'}]` : '[Not Found]';
        opt.textContent = `${ag.name} (${ag.bin}) ${statusText}`;
        if (ag.installed) {
          installedCount++;
          if (!firstInstalled) firstInstalled = ag;
        }
        agentSelect.appendChild(opt);
      });

      detectedCount.textContent = `${installedCount} of ${agents.length} Agent CLIs Ready`;

      if (firstInstalled) {
        agentSelect.value = firstInstalled.id;
        updateModelOptions(firstInstalled);
        loadAccount(firstInstalled.id);
      } else if (agents.length > 0) {
        agentSelect.value = agents[0].id;
        updateModelOptions(agents[0]);
        loadAccount(agents[0].id);
      }
    } catch (err) {
      detectedCount.textContent = 'Failed to load agents';
      console.error(err);
    }
  }

  function updateModelOptions(agent) {
    modelSelect.innerHTML = '';
    if (!agent) return;

    if (agent.installed) {
      const acpLabel = agent.supportsAcp ? ' · [ACP Protocol JSON-RPC Active]' : '';
      agentInfo.textContent = `Binary: ${agent.binPath} (${agent.version || 'available'})${acpLabel}`;
      agentInfo.className = 'mt-1 text-[11px] text-emerald-400';
    } else {
      agentInfo.textContent = `Executable '${agent.bin}' not found in standard paths.`;
      agentInfo.className = 'mt-1 text-[11px] text-rose-400';
    }

    const models = agent.models || [{ id: 'default', label: 'Default' }];
    models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      modelSelect.appendChild(opt);
    });

    if (agent.id === 'opencode') {
      loadOpenCodeModels();
    }
  }

  async function handleRun() {
    const agentId = agentSelect.value;
    const model = modelSelect.value;
    const mode = modeSelect ? modeSelect.value : 'default';
    const thoughtLevel = effortSelect ? effortSelect.value : 'high';
    const cwd = cwdInput.value.trim() || undefined;
    const prompt = promptInput.value.trim();
    const apiKey = apiKeyInput && apiKeyInput.value.trim() ? apiKeyInput.value.trim() : undefined;

    if (!agentId || !prompt) {
      alert('Please select an agent and enter a prompt.');
      return;
    }

    clearViews();
    setRunningState(true);
    startTimer();

    try {
      const res = await fetch('/api/agent-runner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, model, mode, thoughtLevel, cwd, prompt, apiKey })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start run');
      }

      const data = await res.json();
      currentRunId = data.runId;
      connectStream(data.runId);
    } catch (err) {
      setRunningState(false);
      stopTimer();
      viewOutput.innerHTML = `<div class="text-rose-400 font-bold">Execution Error: ${escapeHtml(err.message)}</div>`;
      updateBadge('Failed', 'status-failed');
    }
  }

  function connectStream(runId) {
    if (activeEventSource) {
      activeEventSource.close();
    }

    const es = new EventSource(`/api/agent-runner/runs/${encodeURIComponent(runId)}/stream`);
    activeEventSource = es;

    es.onmessage = (event) => {
      try {
        const ev = JSON.parse(event.data);
        handleStreamEvent(ev);
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    es.onerror = () => {
      // Don't close immediately if run is active, poll run status instead
      fetch('/api/agent-runner/runs')
        .then((r) => r.json())
        .then((data) => {
          const run = (data.runs || []).find((r) => r.id === runId);
          if (run && (run.status === 'completed' || run.status === 'failed' || run.status === 'canceled')) {
            if (run.text && !currentOutputText) {
              currentOutputText = run.text;
              renderOutputText();
            }
            if (run.thinking && !currentThinkingText) {
              currentThinkingText = run.thinking;
              renderThinkingText();
            }
            if (run.tools && run.tools.length > 0) {
              currentTools = run.tools;
              renderTools();
            }
            handleStreamEvent({ type: 'done', status: run.status });
          }
        })
        .catch(() => {});
    };
  }

  function handleStreamEvent(ev) {
    if (ev.type === 'status') {
      updateBadge(ev.status.toUpperCase(), `status-${ev.status}`);
      if (ev.pid) {
        elapsedTimer.textContent = `PID ${ev.pid} · 0.0s`;
      }
    } else if (ev.type === 'text_delta') {
      currentOutputText += ev.text;
      renderOutputText();
    } else if (ev.type === 'thinking_delta') {
      currentThinkingText += ev.text;
      renderThinkingText();
    } else if (ev.type === 'tool_use') {
      currentTools.push({
        id: ev.id,
        name: ev.name,
        input: ev.input,
        output: null,
        isError: false
      });
      renderTools();
    } else if (ev.type === 'tool_result') {
      const tool = currentTools.find((t) => t.id === ev.toolUseId);
      if (tool) {
        tool.output = ev.content;
        tool.isError = ev.isError;
      }
      renderTools();
    } else if (ev.type === 'done') {
      setRunningState(false);
      stopTimer();
      const statusText = ev.status === 'completed' ? 'Completed' : ev.status.toUpperCase();
      updateBadge(statusText, `status-${ev.status}`);
      if (activeEventSource) {
        activeEventSource.close();
        activeEventSource = null;
      }
    } else if (ev.type === 'error') {
      setRunningState(false);
      stopTimer();
      updateBadge('Error', 'status-failed');
      viewOutput.innerHTML += `\n\n<div class="text-rose-400 font-bold">[Error]: ${escapeHtml(ev.message)}</div>`;
      if (activeEventSource) {
        activeEventSource.close();
        activeEventSource = null;
      }
    }
  }

  async function handleCancel() {
    if (!currentRunId) return;
    try {
      await fetch(`/api/agent-runner/runs/${currentRunId}/cancel`, { method: 'POST' });
      updateBadge('Canceled', 'status-canceled');
      setRunningState(false);
      stopTimer();
      if (activeEventSource) {
        activeEventSource.close();
        activeEventSource = null;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleTest() {
    const agentId = agentSelect.value;
    if (!agentId) return;

    clearViews();
    setRunningState(true);
    startTimer();
    updateBadge('Testing...', 'status-running');

    try {
      const res = await fetch('/api/agent-runner/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      const data = await res.json();
      currentRunId = data.runId;
      connectStream(data.runId);
    } catch (err) {
      setRunningState(false);
      stopTimer();
      viewOutput.innerHTML = `<div class="text-rose-400">Connection test failed: ${escapeHtml(err.message)}</div>`;
      updateBadge('Failed', 'status-failed');
    }
  }

  function renderOutputText() {
    viewOutput.textContent = currentOutputText;
    viewOutput.scrollTop = viewOutput.scrollHeight;
  }

  function renderThinkingText() {
    viewThinking.textContent = currentThinkingText;
    viewThinking.scrollTop = viewThinking.scrollHeight;
  }

  function renderTools() {
    toolCountSpan.textContent = currentTools.length;
    if (currentTools.length === 0) {
      viewTools.innerHTML = '<div class="text-slate-500 italic">No tools invoked yet.</div>';
      return;
    }

    viewTools.innerHTML = currentTools.map((tool) => `
      <div class="tool-card">
        <div class="tool-header">
          <span class="text-indigo-400 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
            ${escapeHtml(tool.name)}
          </span>
          <span class="text-slate-500 font-mono text-[10px]">ID: ${escapeHtml(tool.id)}</span>
        </div>
        <div class="tool-body">
          <div class="text-slate-400 text-[10px] uppercase font-bold mb-1">Parameters:</div>
          <pre class="bg-slate-900/80 p-2 rounded text-[11px] overflow-x-auto text-slate-300">${escapeHtml(JSON.stringify(tool.input, null, 2))}</pre>
          ${tool.output !== null ? `
            <div class="mt-2 text-slate-400 text-[10px] uppercase font-bold mb-1">Result:</div>
            <pre class="bg-slate-900/80 p-2 rounded text-[11px] overflow-x-auto ${tool.isError ? 'text-rose-400' : 'text-emerald-300'}">${escapeHtml(tool.output)}</pre>
          ` : '<div class="mt-2 text-slate-500 text-[10px] italic">Executing...</div>'}
        </div>
      </div>
    `).join('');
  }

  async function loadHistory() {
    try {
      const res = await fetch('/api/agent-runner/runs');
      const data = await res.json();
      const runs = data.runs || [];

      if (runs.length === 0) {
        viewHistory.innerHTML = '<div class="text-slate-500 italic">No previous runs recorded in this session.</div>';
        return;
      }

      viewHistory.innerHTML = runs.map((r) => `
        <div class="history-card" data-run-id="${r.id}">
          <div>
            <div class="font-medium text-slate-200 flex items-center gap-2">
              <span class="text-indigo-400">${escapeHtml(r.agentId.toUpperCase())}</span>
              <span class="text-slate-400 text-[11px]">(${escapeHtml(r.model)})</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded border status-${r.status}">${r.status}</span>
            </div>
            <div class="text-slate-400 text-[11px] font-mono mt-1 truncate max-w-[400px]">"${escapeHtml(r.prompt.slice(0, 80))}"</div>
          </div>
          <div class="text-right text-[11px] font-mono text-slate-400">
            <div>${r.durationMs ? (r.durationMs / 1000).toFixed(1) + 's' : '-'}</div>
            <div class="text-[10px] text-slate-500">${new Date(r.startTime).toLocaleTimeString()}</div>
          </div>
        </div>
      `).join('');

      // Add click handlers
      document.querySelectorAll('.history-card').forEach((card) => {
        card.addEventListener('click', () => {
          const rId = card.getAttribute('data-run-id');
          const run = runs.find((r) => r.id === rId);
          if (run) {
            currentRunId = run.id;
            currentOutputText = run.text || '';
            currentThinkingText = run.thinking || '';
            currentTools = run.tools || [];
            tabOutput.click();
            renderOutputText();
            renderThinkingText();
            renderTools();
            updateBadge(run.status.toUpperCase(), `status-${run.status}`);
          }
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

  function setRunningState(running) {
    runBtn.disabled = running;
    testBtn.disabled = running;
    cancelBtn.disabled = !running;
    if (running) {
      runBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      runBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  function startTimer() {
    stopTimer();
    runStartTime = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - runStartTime) / 1000).toFixed(1);
      elapsedTimer.textContent = `${elapsed}s`;
    }, 100);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateBadge(text, className) {
    runBadge.textContent = text;
    runBadge.className = `text-xs px-2.5 py-0.5 rounded-full font-mono border ${className}`;
  }

  function clearViews() {
    currentOutputText = '';
    currentThinkingText = '';
    currentTools = [];
    viewOutput.innerHTML = '';
    viewThinking.innerHTML = '';
    viewTools.innerHTML = '<div class="text-slate-500 italic">No tools invoked yet.</div>';
    toolCountSpan.textContent = '0';
    updateBadge('Idle', 'bg-slate-800 text-slate-400 border-slate-700');
    elapsedTimer.textContent = '0.0s';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();

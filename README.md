# Agent CLI Runner (`dsh-agent-runner`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Protocol](https://img.shields.io/badge/Protocol-ACP%20stdio%20JSON--RPC%202.0-indigo.svg)](https://agentcontrolprotocol.dev)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-0284c7.svg)](https://github.com/deepseek-ai)

**`dsh-agent-runner`** is an external Agent CLI execution engine and graphical workbench plugin for [DeepSeek Harness](https://github.com/deepseek-ai). Built on the OpenDesign architecture, it bridges local coding agent CLIs to DeepSeek Harness sessions using the **Agent Control Protocol (ACP)** over stdio JSON-RPC 2.0.

---

## 🚀 Supported Agent CLIs

| Agent CLI | Binary | Supported Authentication & Login Methods | Protocol |
| :--- | :--- | :--- | :--- |
| **Google Antigravity** | `agy` | Google Account OAuth (Web Browser Flow + Auto-Paste Auth Code) | ACP JSON-RPC 2.0 / `stream-json` |
| **Claude Code** | `claude` | • Claude Account with Subscription (Individual, Team, Enterprise)<br>• Anthropic Console API Key (`sk-ant-...`)<br>• 3rd-Party Platform (Amazon Bedrock, Google Vertex AI) | Subprocess PTY / ACP |
| **OpenAI Codex** | `codex` | • Sign in with ChatGPT (Plus, Pro, Business, Enterprise)<br>• Sign in with Device Code (One-time code verification)<br>• Direct API Key (`sk-...`) | ACP JSON-RPC 2.0 |
| **OpenCode CLI** | `opencode` | • OpenCode Console (Device Code Auth)<br>• OpenCode Go<br>• GitHub Copilot (Device Code Flow)<br>• OpenAI ChatGPT (Headless Browser OAuth)<br>• **230+ Model Providers Catalog** (Anthropic, DeepSeek, Google, Groq, Ollama, OpenRouter, Bedrock, etc.) | Subprocess I/O / JSON streaming |
| **DeepSeek Harness** | `dsh` | Native DeepSeek Harness profiles & local sessions | Cordis Native |

---

## ✨ Features

- **Structured 3-Step Configuration Panel**:
  1. **1. Agen CLI & Akun**: Target agent selector, binary path & version indicator, active account badge, and one-click authentication modal launcher.
  2. **2. Parameter Model & Mode**: Model override input, execution mode selection (*Interactive*, *Autonomous / ACP One-shot*, *Continuous*), and thinking effort slider.
  3. **3. Workspace & Instruksi Tugas**: Working directory selector (`cwd`), task prompt staging, and ACP stdio status badge.
- **Dedicated Floating Auth Modal**:
  - Clean floating modal overlay with backdrop-blur, keyboard shortcuts (`Esc` to close), and outside-click dismissal.
  - Native CLI auth flows without needing to switch to a terminal manually.
  - Device code copy-to-clipboard, browser redirect links, and auto-polling detection.
- **OpenCode 230+ Provider Catalog**:
  - Searchable directory of AI providers with categorized popular services (OpenCode Go, Console, OpenAI, GitHub Copilot, Anthropic, Google).
  - Individual provider setup with custom API keys, model selection, and profile configuration.
- **Real-Time ACP & Tool Call Visualization**:
  - Live session streaming (`session/update`, `tools/call`, `stdout`, `stderr`).
  - Formatted JSON inspection for tool arguments and results.
  - Process lifecycle controls (graceful abort, kill, connection test).

---

## 📁 Repository Structure

```
dsh-agent-runner/
├── client.js               # Client injection bundle configuration
├── cordis.patch.yml        # Cordis loader overlay patch
├── index.js                # Cordis plugin service & REST/WS API handlers
├── package.json            # Package metadata & export mappings
├── LICENSE                 # MIT License
├── README.md               # Documentation
├── lib/
│   ├── accounts.js         # Account detection & OAuth flows (agy, claude, codex)
│   ├── acp-runner.js       # ACP stdio JSON-RPC 2.0 session engine
│   ├── executables.js      # Host binary resolution & PATH discovery
│   ├── opencode.js         # OpenCode CLI authentication & 230+ provider catalog
│   ├── process-runner.js   # Child process spawning and stream handling
│   ├── prompt-staging.js   # Secure prompt staging (mode 0600)
│   ├── runtimes.js         # CLI runtime flags and launch arguments
│   ├── state.js            # In-memory execution and session state
│   ├── stream-parsers.js   # JSON-RPC and stream-json line parsers
│   └── types.js            # Data types and schema definitions
├── static/
│   ├── app.css             # Dark slate theme styling & step-card UI tokens
│   ├── app.js              # Client controller, auth modal manager & WebSocket listener
│   └── index.html          # Workbench UI layout with 3-step cards & auth modal
└── test/
    └── runner.test.js      # Node.js native test suite (10/10 tests)
```

---

## 🛠️ Installation & Setup

### As a DeepSeek Harness Plugin

Add `dsh-agent-runner` to your `cordis.yml` or load it via overlay patch:

```yaml
# cordis.patch.yml
plugins:
  './plugins/dsh-agent-runner':
    enabled: true
```

Or run directly with the DeepSeek Harness CLI:

```bash
pnpm dsh web --patch plugins/dsh-agent-runner/cordis.patch.yml
```

Open your browser at `http://localhost:3080/agent-runner/` (or via the DeepSeek Harness navigation sidebar) to access the workbench.

---

## 🧪 Testing

The repository includes a comprehensive test suite covering binary discovery, prompt staging, ACP session dispatch, account management, Google OAuth flow, and OpenCode catalog operations:

```bash
node --test test/runner.test.js
```

---

## 📄 License

[MIT](LICENSE) © 2026 Fajrul Muyaqqin (`fajrulmuyaqqin-wq`)

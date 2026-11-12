import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const IS_WIN = process.platform === 'win32';

/**
 * Returns candidate toolchain directories where user-installed CLI agents live.
 */
export function getCandidateToolchainDirs() {
  const home = os.homedir();
  const dirs = [
    path.join(home, '.local', 'bin'),
    path.join(home, '.bun', 'bin'),
    path.join(home, '.cargo', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    path.join(home, '.gemini', 'antigravity', 'bin'),
    path.join(home, '.config', 'Antigravity', 'bin'),
    path.join(home, 'bin'),
    '/home/linuxbrew/.linuxbrew/bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin'
  ];

  // Also include system PATH directories
  const pathEnv = process.env.PATH || '';
  const pathDirs = pathEnv.split(path.delimiter).filter(Boolean);

  const seen = new Set();
  const merged = [];

  for (const dir of [...dirs, ...pathDirs]) {
    const resolved = path.resolve(dir);
    if (!seen.has(resolved)) {
      seen.add(resolved);
      try {
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          merged.push(resolved);
        }
      } catch {}
    }
  }

  return merged;
}

/**
 * Resolves the full path of a CLI binary.
 * @param {string} binName
 * @param {string[]} [fallbackBins]
 * @returns {string | null}
 */
export function resolveBinary(binName, fallbackBins = []) {
  const candidates = [binName, ...fallbackBins];
  const searchDirs = getCandidateToolchainDirs();

  const extensions = IS_WIN ? ['', '.exe', '.cmd', '.bat', '.ps1'] : [''];

  for (const name of candidates) {
    // If it's already an absolute or relative path that exists
    if (path.isAbsolute(name) && fs.existsSync(name)) {
      try {
        fs.accessSync(name, fs.constants.X_OK);
        return name;
      } catch {}
    }

    for (const dir of searchDirs) {
      for (const ext of extensions) {
        const fullPath = path.join(dir, name + ext);
        if (fs.existsSync(fullPath)) {
          try {
            fs.accessSync(fullPath, fs.constants.X_OK);
            return fullPath;
          } catch {}
        }
      }
    }
  }

  return null;
}

/**
 * Runs a quick `--version` check on a resolved binary.
 * @param {string} binPath
 * @param {string[]} [versionArgs=['--version']]
 * @returns {string | null}
 */
export function probeBinaryVersion(binPath, versionArgs = ['--version']) {
  try {
    const stdout = execFileSync(binPath, versionArgs, {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env }
    });
    return (stdout || '').trim().split('\n')[0] || 'installed';
  } catch {
    return null;
  }
}

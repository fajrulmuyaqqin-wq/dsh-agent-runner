import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const STAGING_DIR = path.join(os.tmpdir(), 'dsh-agent-runner-staging');

/**
 * Stages the complete prompt into a 0600 temp file and opens a read descriptor for child stdin.
 * Guarantees that subprocess receives 100% of the prompt without pipe truncation or kernel buffer overflow.
 *
 * @param {string} promptText
 * @param {string} [runId]
 * @returns {{ fd: number, filePath: string, release: () => void }}
 */
export function openCompletePromptAsStdin(promptText, runId = crypto.randomUUID()) {
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  const filePath = path.join(STAGING_DIR, `agent-stdin-${runId}.prompt`);

  // Write with strict 0600 permissions
  fs.writeFileSync(filePath, promptText, {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx'
  });

  const fd = fs.openSync(filePath, 'r');

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      fs.closeSync(fd);
    } catch {}
    try {
      fs.unlinkSync(filePath);
    } catch {}
  };

  return { fd, filePath, release };
}

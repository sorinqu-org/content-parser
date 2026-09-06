import { addClaudeCodeMcp } from './claude.js';
import { addCursorMcp } from './cursor.js';
import { addCodexMcp } from './codex.js';
import { addAntigravityMcp } from './antigravity.js';
import { addHarnessMcp } from './harness.js';

export type AgentTarget = 'claude' | 'codex' | 'cursor' | 'antigravity' | 'harmess' | 'frontharness' | 'all';

export interface IntegrationResult {
  target: string;
  success: boolean;
  message: string;
}

export async function addMcpToTarget(target: string): Promise<IntegrationResult[]> {
  const normalized = target.toLowerCase().trim();
  const results: IntegrationResult[] = [];

  const runTarget = (name: string, fn: () => { success: boolean; message: string }) => {
    const res = fn();
    results.push({
      target: name,
      success: res.success,
      message: res.message
    });
  };

  if (normalized === 'all') {
    runTarget('claude', addClaudeCodeMcp);
    runTarget('cursor', addCursorMcp);
    runTarget('codex', addCodexMcp);
    runTarget('antigravity', addAntigravityMcp);
    runTarget('harmess', addHarnessMcp);
    return results;
  }

  switch (normalized) {
    case 'claude':
    case 'claudecode':
    case 'claude-code':
      runTarget('claude', addClaudeCodeMcp);
      break;

    case 'cursor':
      runTarget('cursor', addCursorMcp);
      break;

    case 'codex':
      runTarget('codex', addCodexMcp);
      break;

    case 'antigravity':
    case 'anitgravity':
    case 'agy':
      runTarget('antigravity', addAntigravityMcp);
      break;

    case 'harmess':
    case 'frontharness':
    case 'front-harness':
    case 'harness':
      runTarget('harmess', addHarnessMcp);
      break;

    default:
      results.push({
        target: normalized,
        success: false,
        message: `Unknown agent target: "${target}". Available: claude, codex, cursor, antigravity, harmess, all.`
      });
  }

  return results;
}

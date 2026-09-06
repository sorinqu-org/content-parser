import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const RUNTIME_DIR = path.join(os.homedir(), '.content-parser');
const PID_FILE = path.join(RUNTIME_DIR, 'daemon.pid');
const LOG_FILE = path.join(RUNTIME_DIR, 'daemon.log');

export function ensureRuntimeDir(): void {
  if (!fs.existsSync(RUNTIME_DIR)) {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  }
}

export function getDaemonPid(): number | null {
  if (!fs.existsSync(PID_FILE)) return null;
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf8').trim();
    const pid = parseInt(raw, 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

export function isDaemonRunning(): boolean {
  const pid = getDaemonPid();
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    // Process is dead, clean up stale PID file
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}
    return false;
  }
}

export function startDaemonProcess(): { success: boolean; pid?: number; message: string } {
  ensureRuntimeDir();

  if (isDaemonRunning()) {
    const currentPid = getDaemonPid();
    return {
      success: true,
      pid: currentPid ?? undefined,
      message: `Content Parser daemon is already running (PID: ${currentPid})`
    };
  }

  const logFd = fs.openSync(LOG_FILE, 'a');

  // Spawn background child running start --stdio
  const child = spawn(process.execPath, [process.argv[1], 'start', '--stdio'], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, DAEMON_MODE: 'true' }
  });

  child.unref();

  if (child.pid) {
    fs.writeFileSync(PID_FILE, child.pid.toString(), 'utf8');
    return {
      success: true,
      pid: child.pid,
      message: `Started Content Parser daemon in background (PID: ${child.pid}, logs: ${LOG_FILE})`
    };
  }

  return {
    success: false,
    message: 'Failed to obtain PID for spawned background process'
  };
}

export function stopDaemonProcess(): { success: boolean; message: string } {
  const pid = getDaemonPid();
  if (!pid) {
    return { success: true, message: 'No running Content Parser daemon detected' };
  }

  try {
    process.kill(pid, 'SIGTERM');
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}
    return { success: true, message: `Stopped Content Parser daemon (PID: ${pid})` };
  } catch (err: any) {
    // Stale PID file
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}
    return { success: true, message: `Cleaned up stale daemon PID file (${err.message})` };
  }
}

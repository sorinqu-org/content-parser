import { stopDaemonProcess } from '../daemon.js';
import pc from 'picocolors';

export async function handleStopCommand(): Promise<void> {
  const res = stopDaemonProcess();
  if (res.success) {
    console.log(pc.green(res.message));
  } else {
    console.error(pc.red(res.message));
    process.exit(1);
  }
}

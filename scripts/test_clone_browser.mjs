import { spawn } from 'child_process';
import { createBrowserSession } from '../dist/index.js';
import fs from 'fs';

async function run() {
  const PORT = 3456;
  const server = spawn('node', ['site-clone/serve.js'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });

  server.stdout.on('data', (d) => console.log('[Server]', d.toString().trim()));
  server.stderr.on('data', (d) => console.error('[Server Error]', d.toString().trim()));

  // Wait 1s for server to bind
  await new Promise((r) => setTimeout(r, 1000));

  const session = await createBrowserSession();
  const consoleErrors = [];

  session.page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  session.page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    console.log(`Navigating to http://localhost:${PORT}...`);
    await session.page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle', timeout: 30000 });

    const title = await session.page.title();
    console.log('Loaded Title:', title);

    fs.mkdirSync('site-clone/screenshots', { recursive: true });

    // Desktop viewport screenshot
    await session.page.setViewportSize({ width: 1920, height: 1080 });
    await session.page.screenshot({ path: 'site-clone/screenshots/clone_desktop.png' });
    console.log('Saved site-clone/screenshots/clone_desktop.png');

    // Scroll through page to trigger sliders & lazy images
    await session.page.evaluate(async () => {
      await new Promise((resolve) => {
        let y = 0;
        const interval = setInterval(() => {
          window.scrollBy(0, 500);
          y += 500;
          if (y >= document.body.scrollHeight || y > 15000) {
            clearInterval(interval);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 80);
      });
    });

    await session.page.waitForTimeout(1000);

    // Fullpage screenshot
    await session.page.screenshot({ path: 'site-clone/screenshots/clone_fullpage.png', fullPage: true });
    console.log('Saved site-clone/screenshots/clone_fullpage.png');

    console.log('Console Errors caught:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors.slice(0, 5));
    }
  } finally {
    await session.close();
    server.kill();
    console.log('Server and browser closed.');
  }
}

run();

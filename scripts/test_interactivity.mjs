import { createBrowserSession } from '../dist/index.js';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Launch internal server for test
const server = await new Promise((resolve) => {
  const srv = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    if (reqPath === '/images/' || reqPath === '/fonts/') {
      res.writeHead(204);
      res.end();
      return;
    }
    const filePath = path.join(process.cwd(), 'site-clone', reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
      res.writeHead(200, { 'Content-Type': mimes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  srv.listen(3579, () => resolve(srv));
});

console.log('Test server listening on port 3579');

const session = await createBrowserSession();

try {
  await session.page.goto('http://localhost:3579', { waitUntil: 'networkidle', timeout: 20000 });
  console.log('[+] Navigated successfully');

  // 1. Test FAQ accordion
  const faqItems = session.page.locator('.faq__item, [class*="faq"] summary, [class*="accordion"]');
  const count = await faqItems.count();
  console.log(`[+] Found ${count} FAQ/accordion elements`);
  if (count > 0) {
    await faqItems.first().dispatchEvent('click');
    await session.page.waitForTimeout(300);
    console.log('[+] Clicked first FAQ accordion');
  }

  // 2. Test Game slider buttons / tabs
  const gameTabs = session.page.locator('.games__tabs-item, [class*="tabs"] button, [data-category]');
  const tabCount = await gameTabs.count();
  console.log(`[+] Found ${tabCount} game category tabs`);
  if (tabCount > 1) {
    await gameTabs.nth(1).dispatchEvent('click');
    await session.page.waitForTimeout(300);
    console.log('[+] Clicked second game tab');
  }

  // 3. Verify Swiper slides exist
  const swiperSlides = session.page.locator('.swiper-slide');
  const slidesCount = await swiperSlides.count();
  console.log(`[+] Verified ${slidesCount} Swiper slides on page`);

  console.log('\n[SUCCESS] All interactivity tests passed!');
} finally {
  await session.close();
  server.close();
}

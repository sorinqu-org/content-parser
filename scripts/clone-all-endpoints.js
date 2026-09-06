import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', 'site-clone');
const IMAGES_DIR = path.join(ROOT_DIR, 'images');

const BASE_ORIGIN = 'https://magnitogorsk.another-world.com';

function fetchUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        return resolve(fetchUrl(redirectUrl));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode || 0,
          headers: res.headers,
          buffer: Buffer.concat(chunks)
        });
      });
    });

    req.on('error', (err) => {
      resolve({ url, status: 0, headers: {}, buffer: Buffer.alloc(0), error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 0, headers: {}, buffer: Buffer.alloc(0), error: 'timeout' });
    });
  });
}

async function run() {
  console.log('--- Step 1: Discover all endpoints from sitemap.xml ---');
  const smRes = await fetchUrl(`${BASE_ORIGIN}/sitemap.xml`);
  const sitemapXml = smRes.buffer.toString('utf8');
  const locMatches = sitemapXml.match(/<loc>([^<]+)<\/loc>/gi) || [];
  
  const endpoints = new Set();
  for (const lm of locMatches) {
    const u = lm.replace(/<\/?loc>/gi, '').trim();
    if (u) endpoints.add(u);
  }
  endpoints.add(`${BASE_ORIGIN}/`);
  endpoints.add(`${BASE_ORIGIN}/select-location`);

  const endpointList = Array.from(endpoints).sort();
  console.log(`Discovered ${endpointList.length} endpoints to clone.`);

  // Step 2: Fetch HTML for every endpoint
  console.log('--- Step 2: Fetching HTML content for all endpoints ---');
  const pagesData = new Map();
  for (const ep of endpointList) {
    const res = await fetchUrl(ep);
    if (res.status === 200) {
      const pathname = new URL(ep).pathname;
      pagesData.set(pathname, res.buffer.toString('utf8'));
      console.log(`  [200] ${pathname} (${res.buffer.length} bytes)`);
    } else {
      console.log(`  [${res.status}] ${ep} FAILED`);
    }
  }

  // Step 3: Extract all media/asset URLs across all pages
  console.log('--- Step 3: Extracting all asset URLs across pages ---');
  const allAssetUrls = new Set();
  const assetRegex = /(?:src|href|content|data-src)=["']([^"']+\.(?:png|jpg|jpeg|webp|svg|gif|ico))["']/gi;

  for (const [pathname, html] of pagesData.entries()) {
    let m;
    while ((m = assetRegex.exec(html)) !== null) {
      let raw = m[1].trim();
      if (raw.startsWith('data:')) continue;
      if (raw.startsWith('//')) raw = 'https:' + raw;
      else if (raw.startsWith('/')) raw = 'https://russia.another-world.com' + raw;
      allAssetUrls.add(raw);
    }
  }
  console.log(`Discovered ${allAssetUrls.size} unique media assets across all endpoints.`);

  // Step 4: Download all missing assets
  console.log('--- Step 4: Downloading missing assets into site-clone/images ---');
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const existingFiles = new Set(fs.readdirSync(IMAGES_DIR));
  const assetMapping = new Map(); // rawUrl -> localFilename

  let downloadedCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  // Build mapping and download concurrently with limit
  const assetArray = Array.from(allAssetUrls);
  const CONCURRENCY = 8;
  
  for (let i = 0; i < assetArray.length; i += CONCURRENCY) {
    const chunk = assetArray.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (rawUrl) => {
      try {
        const cleanUrl = rawUrl.split('?')[0];
        const base = path.basename(cleanUrl);
        let localFilename = base;
        
        // If file already exists with same name from a different URL, prefix hash
        const targetPath = path.join(IMAGES_DIR, localFilename);
        if (existingFiles.has(localFilename)) {
          assetMapping.set(rawUrl, localFilename);
          skippedCount++;
          return;
        }

        const res = await fetchUrl(rawUrl);
        if (res.status === 200 && res.buffer.length > 0) {
          fs.writeFileSync(targetPath, res.buffer);
          existingFiles.add(localFilename);
          assetMapping.set(rawUrl, localFilename);
          downloadedCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }));
  }

  console.log(`Asset download complete: ${downloadedCount} downloaded, ${skippedCount} existing, ${failCount} failed.`);

  // Step 5: Localize and save HTML for each endpoint
  console.log('--- Step 5: Localizing HTML and writing subpage files ---');
  for (const [pathname, rawHtml] of pagesData.entries()) {
    let html = rawHtml;

    // Localize CSS
    html = html.replace(/https?:\/\/russia\.another-world\.com\/css\/index\.min\.css[^\s"']*/gi, '/css/index.min.css');
    html = html.replace(/https?:\/\/russia\.another-world\.com\/css\/foreign\/swiper-bundle\.min\.css[^\s"']*/gi, '/css/swiper-bundle.min.css');
    html = html.replace(/https?:\/\/russia\.another-world\.com\/css\/foreign\/air-datepicker\.min\.css[^\s"']*/gi, '/css/air-datepicker.min.css');
    html = html.replace(/https?:\/\/russia\.another-world\.com\/css\/foreign\/2gis-reviews\.min\.css[^\s"']*/gi, '/css/2gis-reviews.min.css');

    // Localize JS
    html = html.replace(/https?:\/\/russia\.another-world\.com\/js\/functions\.min\.js[^\s"']*/gi, '/js/functions.min.js');
    html = html.replace(/https?:\/\/russia\.another-world\.com\/js\/foreign\/air-datepicker\.min\.js[^\s"']*/gi, '/js/air-datepicker.min.js');
    html = html.replace(/https?:\/\/russia\.another-world\.com\/js\/foreign\/swiper-bundle\.min\.js[^\s"']*/gi, '/js/swiper-bundle.min.js');
    html = html.replace(/https?:\/\/russia\.another-world\.com\/js\/app\.min\.js[^\s"']*/gi, '/js/app.min.js');

    // Localize all asset URLs
    for (const [rawUrl, localName] of assetMapping.entries()) {
      const searchStr = rawUrl;
      html = html.split(searchStr).join(`/images/${localName}`);
      if (rawUrl.startsWith('https:')) {
        const noProto = rawUrl.replace(/^https:/, '');
        html = html.split(noProto).join(`/images/${localName}`);
      }
    }

    // Replace remaining image links
    html = html.replace(/https?:\/\/russia\.another-world\.com(?:\/custom)?\/[^"'\s>]+\/([a-zA-Z0-9_\-.]+\.(?:png|jpg|jpeg|webp|svg|gif|ico))/gi, '/images/$1');
    html = html.replace(/\/public\/images\/([a-zA-Z0-9_\-.]+\.(?:png|jpg|jpeg|webp|svg|gif|ico))/gi, '/images/$1');

    // Clean up canonicals and host links to relative links
    html = html.replace(/https:\/\/magnitogorsk\.another-world\.com/gi, '');

    // Determine target file path
    let targetFile;
    if (pathname === '/' || pathname === '') {
      targetFile = path.join(ROOT_DIR, 'index.html');
    } else {
      const cleanPath = pathname.replace(/^\//, '').replace(/\/$/, '');
      const subDir = path.join(ROOT_DIR, cleanPath);
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
      targetFile = path.join(subDir, 'index.html');
    }

    fs.writeFileSync(targetFile, html, 'utf8');
    console.log(`  Saved: ${path.relative(ROOT_DIR, targetFile)} (${html.length} bytes)`);
  }

  console.log('--- Step 6: All endpoints generated successfully! ---');
}

run().catch(console.error);

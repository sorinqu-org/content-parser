import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

async function download(url, dest) {
  try {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      return true;
    }
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log('Downloaded:', path.basename(dest), buf.length, 'bytes');
    return true;
  } catch {
    return false;
  }
}

async function run() {
  const html = fs.readFileSync('parsed_site/page_source.html', 'utf8');
  const $ = cheerio.load(html);

  const imagesDir = 'site-clone/images';
  const fontsDir = 'site-clone/fonts';
  const cssDir = 'site-clone/css';
  const jsDir = 'site-clone/js';

  const urlsToDownload = new Map(); // url -> localRelativePath

  // 1. Collect from <img>
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    const dataSrc = $(el).attr('data-src');
    for (const s of [src, dataSrc]) {
      if (s && !s.startsWith('data:') && !s.startsWith('#')) {
        let full = s;
        if (s.startsWith('//')) full = 'https:' + s;
        else if (s.startsWith('/')) full = 'https://russia.another-world.com' + s;
        const bname = path.basename(s.split('?')[0].split('#')[0]);
        if (bname) {
          urlsToDownload.set(full, path.join(imagesDir, bname));
        }
      }
    }

    const srcset = $(el).attr('srcset');
    if (srcset) {
      srcset.split(',').forEach((part) => {
        const item = part.trim().split(' ')[0];
        if (item && !item.startsWith('data:')) {
          let full = item;
          if (item.startsWith('//')) full = 'https:' + item;
          else if (item.startsWith('/')) full = 'https://russia.another-world.com' + item;
          const bname = path.basename(item.split('?')[0].split('#')[0]);
          if (bname) {
            urlsToDownload.set(full, path.join(imagesDir, bname));
          }
        }
      });
    }
  });

  // 2. Collect from <source>
  $('source').each((i, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      srcset.split(',').forEach((part) => {
        const item = part.trim().split(' ')[0];
        if (item && !item.startsWith('data:')) {
          let full = item;
          if (item.startsWith('//')) full = 'https:' + item;
          else if (item.startsWith('/')) full = 'https://russia.another-world.com' + item;
          const bname = path.basename(item.split('?')[0].split('#')[0]);
          if (bname) {
            urlsToDownload.set(full, path.join(imagesDir, bname));
          }
        }
      });
    }
  });

  // 3. Collect from <link rel="icon">
  $('link[rel*="icon"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('data:')) {
      let full = href;
      if (href.startsWith('//')) full = 'https:' + href;
      else if (href.startsWith('/')) full = 'https://russia.another-world.com' + href;
      const bname = path.basename(href.split('?')[0].split('#')[0]);
      if (bname) {
        urlsToDownload.set(full, path.join(imagesDir, bname));
      }
    }
  });

  console.log(`Discovered ${urlsToDownload.size} unique media assets to download.`);

  for (const [url, dest] of urlsToDownload.entries()) {
    await download(url, dest);
  }

  // Rewrite HTML links to point to local assets
  $('link[rel="stylesheet"]').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('index.min.css')) $(el).attr('href', './css/index.min.css');
    else if (href.includes('2gis-reviews')) $(el).attr('href', './css/2gis-reviews.min.css');
    else if (href.includes('swiper-bundle')) $(el).attr('href', './css/swiper-bundle.min.css');
    else if (href.includes('air-datepicker')) $(el).attr('href', './css/air-datepicker.min.css');
  });

  $('script[src]').each((i, el) => {
    const src = $(el).attr('src') || '';
    if (src.includes('swiper-bundle')) $(el).attr('src', './js/swiper-bundle.min.js');
    else if (src.includes('functions.min.js')) $(el).attr('src', './js/functions.min.js');
    else if (src.includes('app.min.js')) $(el).attr('src', './js/app.min.js');
    else if (src.includes('air-datepicker')) $(el).attr('src', './js/air-datepicker.min.js');
    else if (src.includes('yandex') || src.includes('metrika') || src.includes('googletagmanager')) {
      $(el).remove(); // Remove trackers for clean local performance
    }
  });

  // Remove analytics/tracker noscript/inline scripts
  $('noscript').remove();

  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (src && !src.startsWith('data:')) {
      const bname = path.basename(src.split('?')[0].split('#')[0]);
      if (fs.existsSync(path.join(imagesDir, bname))) {
        $(el).attr('src', `./images/${bname}`);
      }
    }
    const dataSrc = $(el).attr('data-src');
    if (dataSrc && !dataSrc.startsWith('data:')) {
      const bname = path.basename(dataSrc.split('?')[0].split('#')[0]);
      if (fs.existsSync(path.join(imagesDir, bname))) {
        $(el).attr('data-src', `./images/${bname}`);
      }
    }
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const newParts = srcset.split(',').map((part) => {
        const [candidate, desc] = part.trim().split(' ');
        const bname = path.basename(candidate.split('?')[0].split('#')[0]);
        if (fs.existsSync(path.join(imagesDir, bname))) {
          return desc ? `./images/${bname} ${desc}` : `./images/${bname}`;
        }
        return part;
      });
      $(el).attr('srcset', newParts.join(', '));
    }
  });

  $('source').each((i, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const newParts = srcset.split(',').map((part) => {
        const [candidate, desc] = part.trim().split(' ');
        const bname = path.basename(candidate.split('?')[0].split('#')[0]);
        if (fs.existsSync(path.join(imagesDir, bname))) {
          return desc ? `./images/${bname} ${desc}` : `./images/${bname}`;
        }
        return part;
      });
      $(el).attr('srcset', newParts.join(', '));
    }
  });

  $('link[rel*="icon"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('data:')) {
      const bname = path.basename(href.split('?')[0].split('#')[0]);
      if (fs.existsSync(path.join(imagesDir, bname))) {
        $(el).attr('href', `./images/${bname}`);
      }
    }
  });

  // Rewrite CSS url() references in index.min.css to point to local images/fonts
  if (fs.existsSync('site-clone/css/index.min.css')) {
    let css = fs.readFileSync('site-clone/css/index.min.css', 'utf8');
    css = css.replace(/url\(([^)]+)\)/gi, (match, p1) => {
      const clean = p1.replace(/['"]/g, '').trim();
      if (clean.startsWith('data:') || !clean) return match;
      const bname = path.basename(clean.split('?')[0].split('#')[0]);
      if (/\.(woff2?|ttf|otf|eot)$/i.test(bname)) {
        return `url('../fonts/${bname}')`;
      }
      return `url('../images/${bname}')`;
    });
    fs.writeFileSync('site-clone/css/index.min.css', css, 'utf8');
    console.log('Patched index.min.css URLs to relative ../images and ../fonts');
  }

  // Save localized index.html
  const outputHtml = $.html();
  fs.writeFileSync('site-clone/index.html', outputHtml, 'utf8');
  console.log('Saved localized site-clone/index.html (' + outputHtml.length + ' bytes)');
}

run();

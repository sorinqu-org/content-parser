import fs from 'fs';
import path from 'path';

async function download(url, dest) {
  try {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      return true;
    }
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) {
      console.error('Failed to fetch', url, res.status);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log('Saved', dest, buf.length, 'bytes');
    return true;
  } catch (err) {
    console.error('Error fetching', url, err.message);
    return false;
  }
}

async function run() {
  const assets = [
    ['https://russia.another-world.com/css/index.min.css?ver=e1107c499f872e23', 'site-clone/css/index.min.css'],
    ['https://russia.another-world.com/css/2gis-reviews.min.css?ver=e1107c499f872e23', 'site-clone/css/2gis-reviews.min.css'],
    ['https://russia.another-world.com/css/foreign/swiper-bundle.min.css', 'site-clone/css/swiper-bundle.min.css'],
    ['https://russia.another-world.com/css/foreign/air-datepicker.min.css', 'site-clone/css/air-datepicker.min.css'],
    ['https://russia.another-world.com/js/foreign/swiper-bundle.min.js', 'site-clone/js/swiper-bundle.min.js'],
    ['https://russia.another-world.com/js/foreign/air-datepicker.min.js', 'site-clone/js/air-datepicker.min.js'],
    ['https://russia.another-world.com/js/functions.min.js?ver=e1107c499f872e23', 'site-clone/js/functions.min.js'],
    ['https://russia.another-world.com/js/app.min.js?ver=e1107c499f872e23', 'site-clone/js/app.min.js']
  ];

  for (const [url, dest] of assets) {
    await download(url, dest);
  }

  // Scan css files for fonts and background images
  if (fs.existsSync('site-clone/css/index.min.css')) {
    const css = fs.readFileSync('site-clone/css/index.min.css', 'utf8');
    const matches = css.match(/url\([^)]+\)/g) || [];
    console.log('Found', matches.length, 'url() in index.min.css');

    for (const m of matches) {
      const clean = m.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '').split('?')[0].split('#')[0].trim();
      if (!clean || clean.startsWith('data:')) continue;

      let fullUrl = clean;
      if (clean.startsWith('//')) {
        fullUrl = 'https:' + clean;
      } else if (clean.startsWith('/')) {
        fullUrl = 'https://russia.another-world.com' + clean;
      } else if (!clean.startsWith('http')) {
        fullUrl = 'https://russia.another-world.com/css/' + clean;
      }

      const basename = path.basename(clean);
      const isFont = clean.includes('font') || /\.(woff2?|ttf|otf|eot)$/i.test(clean);
      const targetDir = isFont ? 'site-clone/fonts' : 'site-clone/images';
      await download(fullUrl, path.join(targetDir, basename));
    }
  }
}

run();

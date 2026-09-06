import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('site-clone/index.html', 'utf8');
const $ = cheerio.load(html);

const missing = [];
let checked = 0;

$('img').each((i, el) => {
  const src = $(el).attr('src');
  if (src && src.startsWith('./images/')) {
    checked++;
    const f = 'site-clone/' + src.slice(2);
    if (!fs.existsSync(f)) missing.push(src);
  }
});

console.log(`Verified ${checked} images in index.html. Missing: ${missing.length}`);
if (missing.length > 0) {
  console.log('Sample missing:', missing.slice(0, 10));
}

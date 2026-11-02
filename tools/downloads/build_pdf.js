#!/usr/bin/env node
// Builds each notebook as a formatted PDF in notes/pdf/, and writes assets/downloads-data.js, the list of files
// that the site's Downloads panel offers. Needs Google Chrome. First time: npm install, in this folder.
//
//   node build_pdf.js                 every notebook on the home page's shelf
//   node build_pdf.js export-import   one notebook
//   node build_pdf.js --list          only refresh the list (after adding or re-rendering a video)
//
// The notebook is opened in headless Chrome, so it is the same page people read. assemble.js lays it out as one book,
// pdf.css styles it, and it is printed twice: once to learn which page each chapter lands on, then again with
// those numbers in the contents.
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const SITE = path.resolve(__dirname, '..', '..'), NOTES = path.join(SITE, 'notes'), OUT = path.join(NOTES, 'pdf');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const unesc = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
const strip = s => unesc(s.replace(/<[^>]+>/g, '').trim());

// what the home page says about each book
function shelf() {
  const index = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'), out = {};
  for (const m of index.matchAll(/<article class="book" data-progress-for="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)) {
    const a = m[2], get = re => { const x = re.exec(a); return x ? strip(x[1]) : ''; };
    out[m[1]] = {
      slug: m[1], name: get(/<h2><a[^>]*>([\s\S]*?)<\/a>/),
      cover: { cls: (/class="cover\s*([^"]*)"/.exec(a) || [])[1] || '', code: get(/class="code">([\s\S]*?)</), title: get(/class="t">([\s\S]*?)</), by: get(/class="by">([\s\S]*?)</), meta: get(/class="meta">([\s\S]*?)</) }
    };
  }
  return out;
}

// the Watch tab's folder: every video, narration and image in it can be downloaded
function watchFiles(slug) {
  const page = fs.readFileSync(path.join(NOTES, slug + '.html'), 'utf8');
  const watch = /<div id="v-watch"[^>]*>([\s\S]*?)\n<\/div>/.exec(page);
  if (!watch) return null;
  const folder = /(?:src|poster)="([^"/]+)\//.exec(watch[1]);
  if (!folder) return null;
  const title = strip(/<h1>([\s\S]*?)<\/h1>/.exec(watch[1])[1]), dir = path.join(NOTES, folder[1]);
  const KIND = { '.mp4': ['video', 'Video'], '.mp3': ['audio', 'Narration'], '.jpg': ['image', 'Poster'], '.png': ['image', 'Poster'] };
  const clock = f => { const s = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
  const files = fs.readdirSync(dir).filter(f => KIND[path.extname(f)]).sort((a, b) => Object.keys(KIND).indexOf(path.extname(a)) - Object.keys(KIND).indexOf(path.extname(b))).map(f => {
    const full = path.join(dir, f), ext = path.extname(f), [kind, label] = KIND[ext];
    const item = { kind, label, title, href: `notes/${folder[1]}/${f}`, name: `${title} ${kind === 'video' ? '' : '(' + label.toLowerCase() + ') '}`.trim() + ext, type: ext.slice(1).toUpperCase(), bytes: fs.statSync(full).size };
    if (kind !== 'image') item.duration = clock(full);
    return item;
  });
  const poster = files.find(f => f.kind === 'image');
  return { title, files, poster: poster && 'file://' + path.join(SITE, poster.href) };
}

async function destinations(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0, disableFontFace: true, useSystemFonts: false }).promise;
  const dests = await doc.getDestinations(), map = {};
  for (const [id, d] of Object.entries(dests)) { if (d && d[0]) map[id] = (await doc.getPageIndex(d[0])) + 1; }
  return { pages: doc.numPages, map };
}

async function buildBook(browser, book) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('  page error:', e.message));
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem('sb-prefs', JSON.stringify({ auto: false, theme: 'light', layout: 'scroll' })); } catch (e) {} });
  await page.setViewport({ width: 794, height: 1123 });
  await page.goto('file://' + path.join(NOTES, book.slug + '.html'), { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForFunction('window.SB && document.querySelector(".pq, section.topic")');
  await page.addScriptTag({ path: path.join(__dirname, 'assemble.js') });
  const nav = await page.$$eval('.sb-nav a', as => as.map(a => [a.getAttribute('href').slice(1), a.textContent.trim()]));
  const watch = watchFiles(book.slug);
  const short = book.name.replace(/ Notebook$/, '');
  const meta = { nav, short, cover: book.cover, poster: watch && watch.poster };
  const info = await page.evaluate(m => window.SB_PDF.assemble(m), meta);
  console.log('  ' + info.views.join(', '));
  await page.addStyleTag({ path: path.join(__dirname, 'pdf.css') });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
  const wide = await page.evaluate(() => window.SB_PDF.overflow());
  if (wide.length) console.log('  wider than the page:', [...new Set(wide)].slice(0, 12).join(' | '));

  const print = () => page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true, timeout: 0 });
  let buf = await print(), info2 = await destinations(buf), last = {};
  for (let pass = 0; pass < 4; pass++) {
    const missing = await page.evaluate(m => window.SB_PDF.number(m), info2.map);
    if (missing.length) console.log('  no page found for:', missing.slice(0, 10).join(', '));
    buf = await print();
    last = info2;
    info2 = await destinations(buf);
    if (JSON.stringify(last.map) === JSON.stringify(info2.map)) break;
  }
  await page.close();
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, book.slug + '.pdf');
  fs.writeFileSync(file, buf);
  console.log(`  ${path.relative(SITE, file)}: ${info2.pages} pages, ${(buf.length / 1048576).toFixed(1)} MB`);
  return { pages: info2.pages };
}

function writeList(books, pageCounts) {
  const prior = {};
  const dataFile = path.join(SITE, 'assets', 'downloads-data.js');
  if (fs.existsSync(dataFile)) {
    const m = /window\.SB_DOWNLOADS = (\{[\s\S]*\});/.exec(fs.readFileSync(dataFile, 'utf8'));
    if (m) Object.assign(prior, JSON.parse(m[1]));
  }
  const data = {};
  for (const b of Object.values(books)) {
    const pdf = path.join(OUT, b.slug + '.pdf'), watch = watchFiles(b.slug);
    data[b.slug] = {
      pdf: fs.existsSync(pdf) ? { href: `notes/pdf/${b.slug}.pdf`, name: b.name + '.pdf', title: b.name, pages: (pageCounts[b.slug] || (prior[b.slug] && prior[b.slug].pdf && prior[b.slug].pdf.pages) || 0), bytes: fs.statSync(pdf).size } : null,
      media: watch ? watch.files : []
    };
  }
  fs.writeFileSync(dataFile, '/* Written by tools/downloads/build_pdf.js. What the Downloads panel offers for each notebook. */\nwindow.SB_DOWNLOADS = ' + JSON.stringify(data, null, 1) + ';\n');
  console.log('wrote', path.relative(SITE, dataFile));
}

(async () => {
  const args = process.argv.slice(2), books = shelf(), counts = {};
  if (!args.includes('--list')) {
    const want = args.length ? args : Object.keys(books);
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 1800000, args: ['--font-render-hinting=none'] });
    for (const slug of want) {
      if (!books[slug]) throw new Error('not on the shelf: ' + slug);
      console.log(slug);
      counts[slug] = (await buildBook(browser, books[slug])).pages;
    }
    await browser.close();
  }
  writeList(books, counts);
})().catch(e => { console.error(e); process.exit(1); });

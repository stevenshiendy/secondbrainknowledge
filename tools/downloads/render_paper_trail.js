#!/usr/bin/env node
// Renders The Paper Trail player to notes/paper-trail/The_Paper_Trail.mp4, so it can be downloaded as a video.
// The player is a GSAP timeline with a window.seek(t), so each frame is drawn exactly, in headless Chrome.
//
//   node render_paper_trail.js [workdir]         every frame, then the MP4 and a poster
//   node render_paper_trail.js [workdir] still 12.5 80   stills only
//
// Finished segments stay in workdir, so an interrupted run picks up where it stopped. Delete them after a rebuild
// of the player from a new study pack, then run this again.
const fs = require('fs'), os = require('os'), path = require('path');
const { spawn, spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const SITE = path.resolve(__dirname, '..', '..'), DIR = path.join(SITE, 'notes', 'paper-trail');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FPS = 25, SEG = 500; // frames per segment
const WORK = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'paper-trail-render'));
const WORKERS = Math.max(2, Math.min(6, os.cpus().length - 2));

async function open() {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, defaultViewport: { width: 1920, height: 1080 }, protocolTimeout: 600000,
    args: ['--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto('file://' + path.join(DIR, 'the-paper-trail-player.html'));
  await page.waitForFunction('window.READY===true', { timeout: 120000 });
  // only the 1920x1080 stage: no page, no controls, no play overlay
  await page.addStyleTag({ content: 'html,body{margin:0!important;padding:0!important;overflow:hidden} header,.ctrls,.chap,.note,.eyebrow,.big{display:none!important} .wrap{max-width:none;display:block} .screen{position:fixed;left:0;top:0;width:1920px!important;height:1080px!important;aspect-ratio:auto;border-radius:0;box-shadow:none}' });
  await page.evaluate(() => document.fonts.ready);
  return { browser, page };
}

const shot = (page, t) => page.evaluate(x => window.seek(x), t).then(() => page.screenshot({ type: 'jpeg', quality: 95, optimizeForSpeed: true, captureBeyondViewport: false }));

async function segment(page, from, to, target) {
  const tmp = target.replace(/\.mp4$/, '.part.mp4');
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-tune', 'animation',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, no) => ff.on('close', c => c === 0 ? ok() : no(new Error('ffmpeg exited ' + c))));
  for (let f = from; f < to; f++) {
    const jpg = await shot(page, f / FPS);
    if (!ff.stdin.write(jpg)) await new Promise(ok => ff.stdin.once('drain', ok));
  }
  ff.stdin.end();
  await done;
  fs.renameSync(tmp, target);
}

function run(args) {
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + args.join(' '));
}

(async () => {
  fs.mkdirSync(WORK, { recursive: true });
  if (process.argv[3] === 'still') {
    const { browser, page } = await open();
    for (const a of process.argv.slice(4)) {
      const t0 = Date.now();
      fs.writeFileSync(path.join(WORK, `t${(+a).toFixed(2).padStart(7, '0')}.jpg`), await shot(page, +a));
      console.log('still', a, Date.now() - t0, 'ms');
    }
    return browser.close();
  }

  const { browser: probe, page: first } = await open();
  const total = await first.evaluate('window.TOTAL');
  await probe.close();
  const frames = Math.ceil(total * FPS);
  const segs = [];
  for (let from = 0, i = 0; from < frames; from += SEG, i++) segs.push({ from, to: Math.min(frames, from + SEG), file: path.join(WORK, `seg${String(i).padStart(4, '0')}.mp4`) });
  const todo = segs.filter(s => !fs.existsSync(s.file));
  console.log(`${total.toFixed(2)} s, ${frames} frames, ${segs.length} segments, ${todo.length} to render, ${WORKERS} workers`);

  const t0 = Date.now();
  let finished = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    const { browser, page } = await open();
    for (let s; (s = todo.shift());) {
      await segment(page, s.from, s.to, s.file);
      finished++;
      console.log(`segment ${path.basename(s.file)} done, ${finished} this run, ${todo.length} waiting, ${Math.round((Date.now() - t0) / 1000)} s`);
    }
    await browser.close();
  }));

  const list = path.join(WORK, 'list.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s.file}'`).join('\n') + '\n');
  const out = path.join(DIR, 'The_Paper_Trail.mp4');
  run(['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(DIR, 'narration.mp3'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', out]);
  // the poster is a frame from inside the title card
  run(['-y', '-v', 'error', '-ss', '2.2', '-i', out, '-frames:v', '1', '-q:v', '3', path.join(DIR, 'poster.jpg')]);
  console.log('wrote', out, (fs.statSync(out).size / 1048576).toFixed(1), 'MB');
})().catch(e => { console.error(e); process.exit(1); });

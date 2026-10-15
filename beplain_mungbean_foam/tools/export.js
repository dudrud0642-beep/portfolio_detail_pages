// Renders index.html at 860px and saves the mall detail images:
//   export/sections/NN_name.jpg     a section with no animation
//   export/sections/NN-k_name.jpg   still part k of a section that has an animation
//   export/sections/NN-k_name.gif   animated part k ([data-gif] / [data-gif-img])
//   export/<folder>_860.jpg         every part stitched into one still image
//   export/preview.html             all parts in order (GIFs play)
//
// [data-gif="ms"]   animations inside play once per loop of ms; frames are captured
//                   by pausing them and stepping currentTime (the page's own
//                   restart timer is switched off with window.__exporting).
// [data-gif-img]    holds an animated WebP; its frames are composited onto a
//                   capture of the block with the image hidden.
// [data-still="0.8"] which moment (0-1 of the loop) to use in the stitched JPG.
// [data-frame-step="2"] use every 2nd source frame (lighter GIF for video footage).
//
// Needs Node 18+, `npm i puppeteer-core sharp gifenc`, and Chrome or Edge.
// Usage (from the project folder): node tools/export.js [path-to-browser]
const fs = require("fs");
const http = require("http");
const path = require("path");
const puppeteer = require("puppeteer-core");
const sharp = require("sharp");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const WIDTH = 860;
const QUALITY = 86;
const FRAME_MS = 80;
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "export");
const sectionDir = path.join(outDir, "sections");

const browsers = [
  process.argv[2],
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const executablePath = browsers.find((file) => fs.existsSync(file));
if (!executablePath) throw new Error("Chrome / Edge not found: pass its path as an argument.");

const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
const server = http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(root, url === "/" ? "index.html" : url);
    if (!file.startsWith(root)) return res.writeHead(403), res.end();
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404), res.end();
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(0);

const toRaw = async (png) => (await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;

// One palette for every frame, and pixels that look the same as what is already
// on screen are written as transparent. fuzz = squared RGB distance still treated
// as "the same" (0 for flat graphics, a little for video to drop sensor noise).
function encodeGif(frames, width, height, delays, fuzz = 0) {
  const step = Math.max(1, Math.floor(frames.length / 10));
  const sample = Buffer.concat(frames.filter((_, i) => i % step === 0));
  const palette = quantize(sample, 255);
  while (palette.length < 256) palette.push([0, 0, 0]);
  const CLEAR = 255;
  const gif = GIFEncoder();
  let shown = null;
  frames.forEach((rgba, i) => {
    const index = applyPalette(rgba, palette.slice(0, 255));
    let out = index;
    if (shown) {
      out = new Uint8Array(index.length);
      for (let p = 0; p < index.length; p++) {
        const a = palette[index[p]];
        const b = palette[shown[p]];
        const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
        if (d <= fuzz) out[p] = CLEAR;
        else out[p] = shown[p] = index[p];
      }
    } else shown = Uint8Array.from(index);
    gif.writeFrame(out, width, height, {
      palette: i === 0 ? palette : undefined,
      delay: delays[i],
      repeat: 0,
      transparent: i > 0,
      transparentIndex: CLEAR,
      dispose: 1,
    });
  });
  gif.finish();
  return gif.bytes();
}

(async () => {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(sectionDir, { recursive: true });

  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--hide-scrollbars"] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: 1200, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: "networkidle0" });
  await page.evaluate(async () => {
    window.__exporting = true;
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });

  // Cut each section into still / animated parts.
  const sections = await page.$$eval("[data-slice]", (els) =>
    [...els].map((section, s) => {
      const top = (el) => Math.round(el.getBoundingClientRect().top + scrollY);
      const bottom = (el) => Math.round(el.getBoundingClientRect().bottom + scrollY);
      const blocks = [...section.querySelectorAll("[data-gif], [data-gif-img]")].map((el, b) => {
        el.dataset.exportId = `${s}-${b}`;
        const img = el.matches("[data-gif-img]") ? el.querySelector("img") : null;
        const box = img && img.getBoundingClientRect();
        return {
          id: el.dataset.exportId,
          y: top(el),
          bottom: bottom(el),
          loop: Number(el.dataset.gif) || 0,
          still: Number(el.dataset.still) || 0.75,
          step: Number(el.dataset.frameStep) || 1,
          img: img ? { src: img.getAttribute("src"), x: Math.round(box.left), y: Math.round(box.top + scrollY), w: Math.round(box.width), h: Math.round(box.height) } : null,
        };
      });
      return { name: section.dataset.slice, y: top(section), bottom: bottom(section), blocks };
    }),
  );

  const stitched = [];
  let total = 0;
  const preview = [];
  const save = async (file, buffer) => {
    fs.writeFileSync(path.join(sectionDir, file), buffer);
    preview.push(file);
    return buffer.length;
  };
  const shoot = (y, height) => page.screenshot({ clip: { x: 0, y, width: WIDTH, height }, captureBeyondViewport: true });

  for (const section of sections) {
    const [no, ...rest] = section.name.split("_");
    const label = rest.join("_");
    const parts = [];
    let cursor = section.y;
    for (const block of section.blocks) {
      if (block.y - cursor > 1) parts.push({ y: cursor, h: block.y - cursor });
      parts.push({ y: block.y, h: block.bottom - block.y, block });
      cursor = block.bottom;
    }
    if (section.bottom - cursor > 1) parts.push({ y: cursor, h: section.bottom - cursor });

    for (const [k, part] of parts.entries()) {
      const base = parts.length === 1 ? section.name : `${no}-${k + 1}_${label}`;
      const { block } = part;

      if (!block) {
        const png = await shoot(part.y, part.h);
        const jpg = await sharp(png).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
        const size = await save(`${base}.jpg`, jpg);
        stitched.push({ input: png, top: total, left: 0 });
        total += part.h;
        console.log(`${base}.jpg`.padEnd(30), `${WIDTH}x${part.h}`.padEnd(10), `${Math.round(size / 1024)}KB`);
        continue;
      }

      const frames = [];
      const delays = [];
      let still;
      if (block.img) {
        // Animated image: block background + every frame of the source image.
        await page.evaluate((id) => (document.querySelector(`[data-export-id="${id}"] img`).style.visibility = "hidden"), block.id);
        const bg = await shoot(part.y, part.h);
        await page.evaluate((id) => (document.querySelector(`[data-export-id="${id}"] img`).style.visibility = ""), block.id);
        const src = path.join(root, block.img.src);
        const { pages, delay = [] } = await sharp(src, { animated: true }).metadata();
        const radius = parseFloat(await page.$eval(`[data-export-id="${block.id}"] img`, (img) => getComputedStyle(img.parentElement).borderTopLeftRadius)) || 0;
        const mask = Buffer.from(`<svg width="${block.img.w}" height="${block.img.h}"><rect width="100%" height="100%" rx="${radius}" fill="#fff"/></svg>`);
        for (let p = 0; p < pages; p += block.step) {
          const frame = await sharp(src, { page: p })
            .resize(block.img.w, block.img.h)
            .composite([{ input: mask, blend: "dest-in" }])
            .png()
            .toBuffer();
          const png = await sharp(bg).composite([{ input: frame, left: block.img.x, top: block.img.y - part.y }]).png().toBuffer();
          frames.push(await toRaw(png));
          delays.push((delay[p] || 100) * block.step);
          if (p === 0) still = png;
        }
      } else {
        // CSS animation: pause and step through one loop.
        const count = Math.round(block.loop / FRAME_MS);
        const stillAt = Math.floor(count * block.still);
        for (let i = 0; i < count; i++) {
          await page.evaluate(
            (id, t) =>
              new Promise((done) => {
                document
                  .querySelector(`[data-export-id="${id}"]`)
                  .getAnimations({ subtree: true })
                  .forEach((a) => {
                    a.pause();
                    a.currentTime = t;
                  });
                requestAnimationFrame(() => requestAnimationFrame(done));
              }),
            block.id,
            i * FRAME_MS,
          );
          const png = await shoot(part.y, part.h);
          frames.push(await toRaw(png));
          delays.push(FRAME_MS);
          if (i === stillAt) still = png;
        }
      }

      const gif = encodeGif(frames, WIDTH, part.h, delays, block.img ? 150 : 0);
      const size = await save(`${base}.gif`, Buffer.from(gif));
      stitched.push({ input: still, top: total, left: 0 });
      total += part.h;
      console.log(`${base}.gif`.padEnd(30), `${WIDTH}x${part.h}`.padEnd(10), `${Math.round(size / 1024)}KB  ${frames.length}f`);
    }
  }

  const full = path.join(outDir, `${path.basename(root)}_860.jpg`);
  const info = await sharp({ create: { width: WIDTH, height: total, channels: 3, background: "#ffffff" }, limitInputPixels: false })
    .composite(stitched)
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(full);
  console.log(`\nfull image  ${WIDTH}x${total}  ${Math.round(info.size / 1024)}KB`);

  fs.writeFileSync(
    path.join(outDir, "preview.html"),
    `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${path.basename(root)} 상세이미지 미리보기</title>
<link rel="icon" type="image/png" sizes="32x32" href="../assets/images/favicon.png" />
<link rel="apple-touch-icon" href="../assets/images/apple-touch-icon.png" />
<style>
  body { margin: 0; background: #2b2f33; }
  main { width: 100%; max-width: ${WIDTH}px; margin: 0 auto; background: #fff; }
  img { display: block; width: 100%; height: auto; }
</style>
</head>
<body>
<main>
${preview.map((file) => `  <img src="sections/${file}" alt="" />`).join("\n")}
</main>
</body>
</html>
`,
  );

  await browser.close();
  server.close();
})();

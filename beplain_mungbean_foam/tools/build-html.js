// Builds the HTML version of the detail page from the image version's source.
//
//   in : index.html + assets/css/detail.css   (860px source, left unchanged)
//   out: html/index.html                       text-based detail page
//        html/detail-html.css                  detail.css, scoped + fluid
//
// What changes, and only this:
//   - every style is scoped under .bp-canvas (safe to paste into a mall page)
//   - every px becomes calc(N * var(--bp-u)), where --bp-u = container width
//     / 860, so the layout scales like the image did, but as real text
//   - on phones small text keeps a readable minimum size, with a few layout
//     fixes for it (MOBILE_TEXT, STAMPS, PHONE_CSS); at 860px and up the page
//     is pixel for pixel the same as the image
//   - the odometer digits are written into the HTML (no script needed)
//   - images get alt text; numbers drawn only by CSS/SVG get hidden text
//     (.bp-sr) so search engines and AI can read them
//   - product meta description, link preview (Open Graph) and schema.org
//     Product data
//
// Needs Node 18+, `npm i puppeteer-core css-tree` (prettier optional), and
// Chrome or Edge. Usage (from beplain_mungbean_foam/): node tools/build-html.js
const fs = require("fs");
const http = require("http");
const path = require("path");
const puppeteer = require("puppeteer-core");
const csstree = require("css-tree");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "html");
const DESIGN_WIDTH = 860;

// Text for each image (what the photo shows, in the page's own terms).
const ALT = {
  "model.jpg": "녹두 약산성 클렌징 폼 튜브를 얼굴 옆에 든 모델",
  "tubes-four.jpg": "나란히 놓인 녹두 약산성 클렌징 폼 튜브 네 개",
  "tubes-two.jpg": "연두색 배경 위 녹두 약산성 클렌징 폼 튜브 두 개",
  "swatch.jpg": "녹두가루 입자가 보이는 녹두폼 거품 질감",
  "pore-before.jpg": "인공 노폐물을 도포한 모공 확대 사진",
  "pore-after.jpg": "녹두폼 사용 후 모공 확대 사진",
  "r-use-before.jpg": "녹두폼 사용부위, 자극 전 피부",
  "r-use-after.jpg": "녹두폼 사용부위, 자극 후 붉어진 피부",
  "r-use-30.jpg": "녹두폼 사용부위, 사용 30분 후 피부",
  "r-non-before.jpg": "미사용 부위, 자극 전 피부",
  "r-non-after.jpg": "미사용 부위, 자극 후 붉어진 피부",
  "r-non-30.jpg": "미사용 부위, 30분 후 피부",
  "tray.jpg": "녹두가 가득 담긴 트레이 위의 녹두 약산성 클렌징 폼",
  "selfie.jpg": "세안 후 맑은 피부로 미소 짓는 모델",
  "foam.webp": "손에서 흘러내리는 녹두폼의 쫀쫀한 거품",
  "texture-before.jpg": "녹두폼 사용 전 피부결 분석 이미지",
  "texture-after.jpg": "녹두폼 사용 직후 피부결 분석 이미지",
  "howto-foam.jpg": "물과 함께 낸 녹두폼 거품",
  "howto-wash1.jpg": "거품으로 얼굴을 부드럽게 롤링하는 모습",
  "howto-wash2.jpg": "미온수로 씻어낸 뒤의 깨끗한 얼굴",
  "tube.png": "비플레인 녹두 약산성 클렌징 폼 80ml 튜브",
};

// Where the page is published (GitHub Pages): link previews and schema.org
// need full image addresses.
const PAGE_URL = "https://dudrud0642-beep.github.io/portfolio_detail_pages/beplain_mungbean_foam/html/";
const imageUrl = (file) => new URL(`../assets/images/${file}`, PAGE_URL).href;

const PRODUCT = "비플레인 녹두 약산성 클렌징 폼";
const TITLE = `${PRODUCT} 80ml | 상세 정보`;
const DESCRIPTION =
  "비플레인 녹두 약산성 클렌징 폼(80ml). 국내산 녹두가루로 모공 속 노폐물과 피지까지 세정하는 pH 6 약산성 클렌징 폼. " +
  "2026년 5월 누적 입고량 기준 2,000만 개 돌파, 모공·피지·진정·세정 임상 시험 완료.";

// Phones: text that would shrink below this stays readable. A size N (design
// px) never goes under min(N, clamp(MIN, N × RATIO, MAX)), so at 860px and up
// nothing changes and only small text on narrow screens grows.
const MOBILE_TEXT = { min: 10, max: 14, ratio: 0.62 };
const textFloor = (n) => {
  const floor = Math.min(n, Math.max(MOBILE_TEXT.min, Math.min(MOBILE_TEXT.max, n * MOBILE_TEXT.ratio)));
  return Math.round(floor * 100) / 100;
};

// Round stamps have a fixed size, so bigger text would spill out of them. On
// phones the whole stamp grows with its text instead (its own --bp-u).
const STAMPS = [".seal", ".clear__badges li"];

// Small fixes for the larger phone text; none of them change anything at 860px.
const PHONE_CSS = `
/* pH scale: the numbers move down by as much as they grew, clear of the pin. */
.bp-canvas .ph__ticks {
  margin-top: calc(16 * var(--bp-u) + max(0px, ${textFloor(22)}px - 22 * var(--bp-u)));
}

/* 100% ring: its text may grow only a quarter, so it stays inside the ring. */
.bp-canvas .ring__in p {
  font-size: max(calc(21 * var(--bp-u)), min(${textFloor(21)}px, calc(26.25 * var(--bp-u))));
}

/* Seal: as in the design it starts 2px right of the ring and grows outward,
   so it never covers the ring's text; on very narrow screens (320px) it moves
   in just enough to stay on screen. */
.bp-canvas .seal {
  right: auto;
  left: min(calc(50% + 182 * 100cqw / ${DESIGN_WIDTH}), calc(100% + 30 * 100cqw / ${DESIGN_WIDTH} - 148 * var(--bp-u)));
}

@container (max-width: 599px) {
  /* Stamps: "Clinically Tested" goes on two lines instead of past the circle. */
  .bp-canvas .seal small,
  .bp-canvas .clear__badges small {
    max-width: 6em;
    margin-inline: auto;
  }

  /* Product notice: the label column is too narrow for words like
     식품의약품안전처심사, so each label sits above its value. */
  .bp-canvas .notice div {
    grid-template-columns: 1fr;
    gap: calc(6 * var(--bp-u));
  }
}
`;

// Browser workaround; other browsers ignore it.
const FIREFOX_CSS = `
/* Firefox draws the tilted seal's inset ring shadows broken on 2x screens (the
   source shows it too), so in Firefox only the two rings are a border and an
   outline instead: same look. */
@supports (-moz-appearance: none) {
  .bp-canvas .seal {
    box-shadow: none;
    border: calc(6 * var(--bp-u)) solid var(--forest);
    outline: calc(3 * var(--bp-u)) solid var(--lime);
    outline-offset: calc(-9 * var(--bp-u));
  }
}
`;

// 1. CSS: scope every rule under .bp-canvas and make px fluid ----------------
// svgOnly: classes used only inside <svg>. Their px are SVG user units, which
// already scale with the drawing, so they are left as they are.
function buildCss(source, svgOnly) {
  const ast = csstree.parse(source, { parseCustomProperty: true });
  const keyframes = new Set();
  const svgRules = new Set();
  const animationUse = new Map(); // keyframe name → { svg, html } use count
  csstree.walk(ast, {
    enter(node) {
      if (node.type === "Atrule" && node.name === "keyframes") keyframes.add(csstree.generate(node.prelude).trim());
      if (node.type !== "Rule" || (this.atrule && this.atrule.name.endsWith("keyframes"))) return;
      const isSvg = node.prelude.children.toArray().every((selector) => {
        const last = csstree.generate(selector).match(/\.([\w-]+)\s*$/);
        return last && svgOnly.has(last[1]);
      });
      if (isSvg) svgRules.add(node);
      csstree.walk(node.block, {
        visit: "Declaration",
        enter(decl) {
          if (!/^animation(-name)?$/.test(decl.property)) return;
          csstree.walk(decl.value, {
            visit: "Identifier",
            enter(id) {
              const use = animationUse.get(id.name) || { svg: 0, html: 0 };
              use[isSvg ? "svg" : "html"]++;
              animationUse.set(id.name, use);
            },
          });
        },
      });
    },
  });
  const svgKeyframes = new Set([...keyframes].filter((k) => animationUse.get(k)?.svg && !animationUse.get(k)?.html).map((k) => `bp-${k}`));

  csstree.walk(ast, {
    enter(node, item, list) {
      // Selectors: html / body / :root become the canvas, the rest live inside it.
      if (node.type === "Rule" && !(this.atrule && this.atrule.name.endsWith("keyframes"))) {
        const selectors = [];
        node.prelude.children.forEach((selector) => {
          const text = csstree.generate(selector);
          selectors.push(["html", "body", ":root"].includes(text) ? ".bp-canvas" : `.bp-canvas ${text}`);
        });
        node.prelude = csstree.parse([...new Set(selectors)].join(", "), { context: "selectorList" });
      }
      // Keyframe names get a prefix so they cannot clash with the host page.
      if (node.type === "Atrule" && node.name === "keyframes") {
        const name = csstree.generate(node.prelude).trim();
        node.prelude = csstree.parse(`bp-${name}`, { context: "atrulePrelude", atrule: "keyframes" });
      }
      if (node.type === "Identifier" && keyframes.has(node.name) && this.declaration && /^animation(-name)?$/.test(this.declaration.property)) {
        node.name = `bp-${node.name}`;
      }
      // px → share of the 860px design width (not inside SVG drawings).
      if (node.type === "Dimension" && node.unit.toLowerCase() === "px" && list && this.declaration) {
        if (this.rule && svgRules.has(this.rule)) return;
        if (this.atrule && this.atrule.name.endsWith("keyframes") && svgKeyframes.has(csstree.generate(this.atrule.prelude).trim())) return;
        const value = csstree.parse(`calc(${node.value} * var(--bp-u))`, { context: "value" }).children.first;
        list.replace(item, list.createItem(value));
      }
    },
  });

  // Readable minimum for text on phones.
  csstree.walk(ast, {
    visit: "Declaration",
    enter(node) {
      if (node.property !== "font-size") return;
      const m = csstree.generate(node.value).match(/^calc\(\s*([\d.]+)\s*\*\s*var\(--bp-u\)\s*\)$/);
      if (!m) return;
      const n = Number(m[1]);
      const floor = textFloor(n);
      if (floor >= n) return;
      node.value = csstree.parse(`max(calc(${n} * var(--bp-u)), ${floor}px)`, { context: "value" });
    },
  });
  csstree.walk(ast, {
    visit: "Rule",
    enter(rule) {
      const selector = csstree.generate(rule.prelude).replace(/^\.bp-canvas\s+/, "");
      if (!STAMPS.includes(selector)) return;
      const size = rule.block.children.toArray().find((d) => d.property === "font-size");
      const n = Number(csstree.generate(size.value).match(/calc\(\s*([\d.]+)/)[1]);
      const unit = Math.round((textFloor(n) / n) * 1000) / 1000;
      rule.block.children.prepend(rule.block.children.createItem(csstree.parse(`--bp-u: max(calc(100cqw / ${DESIGN_WIDTH}), ${unit}px)`, { context: "declaration", parseCustomProperty: true })));
    },
  });

  const header = `/*
 * beplain 녹두 약산성 클렌징 폼 — HTML 상세 (tools/build-html.js 로 생성, 직접 수정하지 않기)
 * 원본: ../assets/css/detail.css. 모든 스타일은 .bp-canvas 안에서만 적용되고,
 * px 값은 --bp-u(= 컨테이너 폭 / ${DESIGN_WIDTH})의 배수라서 화면 폭에 맞춰 같은 비율로 줄어듭니다.
 * 글자 크기는 휴대폰에서 너무 작아지지 않도록 최소값이 있습니다(max(...)). ${DESIGN_WIDTH}px 이상에서는 원본과 같습니다.
 * 원형 배지(${STAMPS.join(", ")})는 글자가 원 밖으로 나가지 않게 배지 전체가 글자와 같이 커집니다.
 * 그래프(SVG) 안의 글자·간격은 그림과 함께 줄어들므로 px 그대로 둡니다.
 */
@property --bp-u {
  syntax: "<length>";
  inherits: true;
  initial-value: 1px;
}

.bp-detail {
  container-type: inline-size;
  width: 100%;
  max-width: ${DESIGN_WIDTH}px;
  margin: 0 auto;
}

.bp-canvas {
  --bp-u: calc(100cqw / ${DESIGN_WIDTH});
  overflow: hidden;
}

/* Text for search engines, AI and screen readers only. */
.bp-detail .bp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

`;
  return header + csstree.generate(ast) + PHONE_CSS + FIREFOX_CSS;
}

// 2. HTML: take the rendered source, then add text and fix paths ------------
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
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

const browsers = [
  process.argv[2],
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const executablePath = browsers.find((file) => fs.existsSync(file));
if (!executablePath) throw new Error("Chrome / Edge not found: pass its path as an argument.");

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => (window.__exporting = true)); // keep the source's loop script idle
  await page.goto(`http://localhost:${server.address().port}/index.html`, { waitUntil: "networkidle0" });

  // Classes that only ever appear inside an <svg> drawing.
  const svgOnly = new Set(
    await page.evaluate(() => {
      const inside = new Set();
      const outside = new Set();
      document.querySelectorAll("body [class]").forEach((el) => {
        const target = el.parentElement?.closest("svg") ? inside : outside;
        el.classList.forEach((c) => target.add(c));
      });
      return [...inside].filter((c) => !outside.has(c));
    }),
  );
  fs.writeFileSync(path.join(outDir, "detail-html.css"), buildCss(fs.readFileSync(path.join(root, "assets/css/detail.css"), "utf8"), svgOnly));

  const body = await page.evaluate((ALT) => {
    const sr = (text) => Object.assign(document.createElement("span"), { className: "bp-sr", textContent: text });

    // Odometer: digits were made by the script; keep them, hide the strip
    // from readers and say the number once.
    const odo = document.querySelector(".odo__row");
    if (odo) {
      odo.setAttribute("aria-hidden", "true");
      odo.after(sr("20,000,000개"));
    }
    // Numbers drawn by a CSS counter.
    document.querySelectorAll(".count").forEach((el) => el.append(sr(el.style.getPropertyValue("--to").trim())));
    // Bar charts drawn in SVG: one sentence each. The title sits above the
    // chart (.card__title, ending in a footnote number) or under it (.moist__res).
    document.querySelectorAll(".chart > svg").forEach((svg) => {
      const card = svg.closest(".chart");
      const title = card.querySelector(".card__title, .moist__res p").textContent.replace(/\d+$/, "").trim();
      const values = [...svg.querySelectorAll(".bar-value")].map((t) => t.textContent.trim());
      const labels = [...svg.querySelectorAll(".bar-label")].map((t) => t.textContent.trim());
      svg.setAttribute("aria-hidden", "true");
      svg.after(sr(`${title}: ${labels.map((l, i) => `${l} ${values[i]}`).join(", ")}`));
    });

    // Decorative icons.
    document.querySelectorAll("svg use").forEach((use) => use.closest("svg").setAttribute("aria-hidden", "true"));

    // Images: path and alt text. (No lazy loading: the images carry no fixed
    // size, so late loading would make the page jump while scrolling.)
    document.querySelectorAll("img").forEach((img) => {
      const file = img.getAttribute("src").split("/").pop();
      img.setAttribute("src", `../${img.getAttribute("src")}`);
      img.setAttribute("alt", ALT[file] ?? "");
    });

    // px in inline styles (odometer end, a few margins) → fluid units.
    document.querySelectorAll("[style]").forEach((el) => {
      el.setAttribute("style", el.getAttribute("style").replace(/(-?\d*\.?\d+)px/g, "calc($1 * var(--bp-u))"));
    });

    // Export-only markers.
    document.querySelectorAll("[data-slice], [data-still], [data-gif-img], [data-frame-step]").forEach((el) => {
      ["data-slice", "data-still", "data-gif-img", "data-frame-step"].forEach((a) => el.removeAttribute(a));
    });
    document.querySelectorAll("body > script").forEach((s) => s.remove());

    return document.body.innerHTML;
  }, ALT);
  await browser.close();
  server.close();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: PRODUCT,
    brand: { "@type": "Brand", name: "beplain" },
    image: [imageUrl("tube.png"), imageUrl("model.jpg")],
    description: DESCRIPTION,
    size: "80ml",
    countryOfOrigin: "한국",
  };

  let html = `<!doctype html>
<!--
  beplain 녹두 약산성 클렌징 폼 — HTML 상세
  tools/build-html.js 로 ../index.html 에서 생성합니다. 문구·디자인은 상세이미지 원본과 같고,
  글자가 이미지가 아닌 텍스트라 검색엔진과 AI가 읽을 수 있습니다. 직접 수정하지 말고 원본을 고친 뒤 다시 생성하세요.
  쇼핑몰에 넣을 때는 <article class="bp-detail"> 부분과 detail-html.css, 아래 폰트 링크를 함께 넣습니다.
-->
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${TITLE}</title>
    <meta name="description" content="${DESCRIPTION}" />
    <link rel="canonical" href="${PAGE_URL}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${TITLE}" />
    <meta property="og:description" content="${DESCRIPTION}" />
    <meta property="og:image" content="${imageUrl("model.jpg")}" />
    <meta property="og:url" content="${PAGE_URL}" />
    <link rel="icon" type="image/png" sizes="32x32" href="../assets/images/favicon.png" />
    <link rel="apple-touch-icon" href="../assets/images/apple-touch-icon.png" />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" />
    <link rel="stylesheet" href="detail-html.css" />
    <style>
      html, body { margin: 0; background: #fff; }
    </style>
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
  </head>
  <body>
    <article class="bp-detail" aria-label="${PRODUCT} 상세 정보">
      <div class="bp-canvas">${body}</div>
    </article>
    <script>
      // Moving parts replay every loop, like the GIFs in the image version.
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.querySelectorAll(".bp-detail [data-gif]").forEach((block) => {
          setInterval(() => {
            block.getAnimations({ subtree: true }).forEach((animation) => {
              animation.currentTime = 0;
              animation.play();
            });
          }, Number(block.dataset.gif));
        });
      }
    </script>
  </body>
</html>
`;

  let css = fs.readFileSync(path.join(outDir, "detail-html.css"), "utf8");
  try {
    const prettier = require("prettier");
    html = await prettier.format(html, { parser: "html", printWidth: 120 });
    css = await prettier.format(css, { parser: "css" });
    fs.writeFileSync(path.join(outDir, "detail-html.css"), css);
  } catch {
    // prettier is optional: the files work unformatted too.
  }
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log(`html/index.html ${Math.round(html.length / 1024)}KB · html/detail-html.css ${Math.round(css.length / 1024)}KB`);
})();

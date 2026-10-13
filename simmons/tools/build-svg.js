// Optional maintenance script (the site itself needs no build step).
// Regenerates the static SVG drawings in index.html — the anatomy layers, the
// coil demo and the side profile — between the <!-- @name --> markers.
// Usage (from simmons/): node tools/build-svg.js index.html
const fs = require("fs");

const file = process.argv[2];
const r = (n) => +n.toFixed(2);

/* ---------------------------------------------------------------------------
   1. Anatomy model: isometric mattress, one absolutely-stacked <svg> per layer
   --------------------------------------------------------------------------- */
const VBW = 800;
const VBH = 770;
const W = 1500; // mattress width (local units)
const L = 2000; // mattress length (local units)
const u = [240, 120]; // width axis on screen
const v = [-320, 160]; // length axis on screen
const Y0 = 292;
const P0 = [340, Y0]; // back corner
const P1 = [P0[0] + u[0], P0[1] + u[1]];
const P2 = [P0[0] + u[0] + v[0], P0[1] + u[1] + v[1]];
const P3 = [P0[0] + v[0], P0[1] + v[1]];

const mat = (a, b, c, d, e, f) =>
  `matrix(${[a, b, c, d, e, f].map(r).join(" ")})`;
const topM = (s) =>
  mat(u[0] / W, u[1] / W, v[0] / L, v[1] / L, P0[0], P0[1] + s);
const frontM = (s) => mat(u[0] / W, u[1] / W, 0, 1, P3[0], P3[1] + s);
const sideM = (s) => mat(-v[0] / L, -v[1] / L, 0, 1, P2[0], P2[1] + s);
const face = (w, h, fill) =>
  `<rect class="pd-face" width="${w}" height="${h}" fill="${fill}" vector-effect="non-scaling-stroke"/>`;

// Bands on the side faces (one per material inside the slab).
const bands = (w, list) => {
  let y = 0;
  return list
    .map(([h, fill]) => {
      const out = `<rect y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
      y += h;
      return out;
    })
    .join("");
};

// Coil zigzags drawn straight in screen space on the front (cut-away) face.
const coils = (s, t) => {
  const out = [];
  for (let i = 0; i < 10; i++) {
    const x = 140 + 135 * i; // stays clear of the 80-unit edge foam at both ends
    const advanced = i % 2 === 0;
    const strands = advanced ? [-12, 0, 12] : [0];
    strands.forEach((offset) => {
      const pts = [];
      for (let j = 0; j <= 14; j++) {
        const lx = x + (j % 2 ? 46 : -46) + offset;
        const ly = s + 6 + (j * (t - 12)) / 14;
        pts.push(
          `${r(P3[0] + (u[0] * lx) / W)},${r(P3[1] + (u[1] * lx) / W + ly)}`,
        );
      }
      out.push(
        `<polyline points="${pts.join(" ")}" class="${advanced ? "pd-coil-a" : "pd-coil-o"}"/>`,
      );
    });
  }
  return out.join("");
};

const slab = {
  surface: (s, t) => `
        <g class="pd-slab">
          <g transform="${topM(s)}">${face(W, L, "#efe8dc")}<rect width="${W}" height="${L}" fill="url(#pd-p-stripes)"/><rect width="${W}" height="${L}" fill="url(#pd-p-tufts)"/></g>
          <g transform="${frontM(s)}">${face(W, t, "#e0d6c5")}${bands(W, [
            [20, "url(#pd-p-quilt)"],
            [14, "#d3c8b5"],
          ])}</g>
          <g transform="${sideM(s)}">${face(L, t, "#cbbfaa")}${bands(L, [
            [20, "url(#pd-p-quilt-dark)"],
            [14, "#bfb29c"],
          ])}</g>
        </g>`,
  comfort: (s, t) => `
        <g class="pd-slab">
          <g transform="${topM(s)}">${face(W, L, "#f4f0e8")}<rect width="${W}" height="${L}" fill="url(#pd-p-dots)"/></g>
          <g transform="${frontM(s)}">${face(W, t, "#e7e1d5")}${bands(W, [
            [10, "#efe9df"],
            [11, "#e4ddd0"],
            [11, "#dad2c4"],
          ])}</g>
          <g transform="${sideM(s)}">${face(L, t, "#d4cdbf")}${bands(L, [
            [10, "#dcd5c8"],
            [11, "#d1c9bb"],
            [11, "#c6beaf"],
          ])}</g>
        </g>`,
  climate: (s, t) => `
        <g class="pd-slab">
          <g transform="${topM(s)}">${face(W, L, "#e3e5e4")}<rect width="${W}" height="${L}" fill="url(#pd-p-cells)"/></g>
          <g transform="${frontM(s)}">${face(W, t, "#d2d5d4")}${bands(W, [
            [9, "#d9dcdb"],
            [10, "#c8cccb"],
            [9, "#d0d3d2"],
          ])}</g>
          <g transform="${sideM(s)}">${face(L, t, "#bec2c1")}${bands(L, [
            [9, "#c5c9c8"],
            [10, "#b5b9b8"],
            [9, "#bcc0bf"],
          ])}</g>
        </g>`,
  ad: (s, t) => `
        <g class="pd-slab pd-slab--ad">
          <g transform="${topM(s)}">${face(W, L, "#d9d3c7")}</g>
          <g transform="${frontM(s)}">${face(W, t, "#cac3b5")}</g>
          <g transform="${sideM(s)}">${face(L, t, "#b7afa0")}</g>
        </g>`,
  spring: (s, t) => `
        <g class="pd-slab">
          <g transform="${topM(s)}">${face(W, L, "#262626")}<g class="pd-core"><rect width="${W}" height="${L}" fill="url(#pd-p-rings)"/></g><path class="pd-edge" fill-rule="evenodd" d="M0 0H${W}V${L}H0Z M80 80V${L - 80}H${W - 80}V80Z"/></g>
          <g transform="${frontM(s)}">${face(W, t, "#1f1f1f")}<rect class="pd-edge" width="80" height="${t}"/><rect class="pd-edge" x="${W - 80}" width="80" height="${t}"/></g>
          <g class="pd-core">${coils(s, t)}</g>
          <g transform="${sideM(s)}">${face(L, t, "#b9b1a2")}<rect class="pd-edge" width="${L}" height="${t}"/></g>
        </g>`,
  base: (s, t) => `
        <g class="pd-slab">
          <g transform="${topM(s)}">${face(W, L, "#3b3b3b")}</g>
          <g transform="${frontM(s)}">${face(W, t, "#303030")}</g>
          <g transform="${sideM(s)}">${face(L, t, "#262626")}</g>
        </g>`,
};

const layers = [
  { id: 1, k: 4, num: "01", label: "표면", slabs: [["surface", 0, 34]] },
  { id: 2, k: 3, num: "02", label: "쿠션", slabs: [["comfort", 34, 32]] },
  { id: 3, k: 2, num: "03", label: "온도", slabs: [["climate", 66, 28]] },
  {
    id: 4,
    k: 1,
    num: "04",
    label: "지지",
    slabs: [["spring", 108, 58]],
    sub: ["ad", 94, 14],
  },
  {
    id: 5,
    k: 0,
    num: "05",
    label: "가장자리 · 바닥",
    slabs: [["base", 166, 12]],
  },
];

const svgOpen = `<svg viewBox="0 0 ${VBW} ${VBH}" focusable="false">`;
const pct = (n, total) => `${r((n / total) * 100)}%`;

// Bottom layer first so upper layers paint over it.
const layerMarkup = [...layers]
  .reverse()
  .map((layer) => {
    const [, s, t] = layer.slabs[layer.slabs.length - 1];
    const labelY = P1[1] + s + t / 2;
    const body = layer.slabs
      .map(([name, s0, t0]) => slab[name](s0, t0))
      .join("");
    const sub = layer.sub
      ? `
      <div class="pd-layer__sub">
        ${svgOpen}${slab[layer.sub[0]](layer.sub[1], layer.sub[2])}
        </svg>
      </div>`
      : "";
    return `
    <div class="pd-layer" data-layer="${layer.id}" style="--k: ${layer.k}">
      <div class="pd-layer__lift">
        ${svgOpen}${body}
        </svg>${sub}
        <span class="pd-layer__label" style="--label-y: ${pct(labelY, VBH)}"><b>${layer.num}</b>${layer.label}</span>
      </div>
    </div>`;
  })
  .join("");

const defs = `
    <svg class="pd-anatomy__defs" width="0" height="0" focusable="false">
      <defs>
        <pattern id="pd-p-stripes" width="60" height="${L}" patternUnits="userSpaceOnUse"><rect width="24" height="${L}" fill="#fff" opacity=".28"/></pattern>
        <pattern id="pd-p-tufts" width="214" height="250" patternUnits="userSpaceOnUse"><ellipse cx="107" cy="125" rx="18" ry="18" fill="#a8946f" opacity=".32"/></pattern>
        <pattern id="pd-p-quilt" width="64" height="20" patternUnits="userSpaceOnUse"><rect width="64" height="20" fill="#e0d6c5"/><rect x="5" y="3" width="54" height="14" rx="6" fill="#efe7da"/></pattern>
        <pattern id="pd-p-quilt-dark" width="64" height="20" patternUnits="userSpaceOnUse"><rect width="64" height="20" fill="#c4b8a2"/><rect x="5" y="3" width="54" height="14" rx="6" fill="#d6cbb8"/></pattern>
        <pattern id="pd-p-dots" width="70" height="70" patternUnits="userSpaceOnUse"><circle cx="35" cy="35" r="7" fill="#b8ad99" opacity=".35"/></pattern>
        <pattern id="pd-p-cells" width="80" height="80" patternUnits="userSpaceOnUse"><circle cx="40" cy="40" r="20" fill="none" stroke="#8f9796" stroke-width="7" opacity=".35"/></pattern>
        <pattern id="pd-p-rings" width="300" height="150" patternUnits="userSpaceOnUse">
          <circle cx="75" cy="75" r="56" fill="none" stroke="#9d9d9d" stroke-width="7"/>
          <circle cx="75" cy="75" r="44" fill="none" stroke="#9d9d9d" stroke-width="7"/>
          <circle cx="75" cy="75" r="32" fill="none" stroke="#9d9d9d" stroke-width="7"/>
          <circle cx="225" cy="75" r="50" fill="none" stroke="#6f6f6f" stroke-width="9"/>
        </pattern>
      </defs>
    </svg>`;

/* ---------------------------------------------------------------------------
   2. Coil demo (step 04): Advanced (triple strand) and Original alternate
   --------------------------------------------------------------------------- */
const coilDemo = (() => {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const cx = 40 + 56 * i;
    const advanced = i % 2 === 0;
    const strands = (advanced ? [-3, 0, 3] : [0])
      .map((offset) => {
        const pts = [];
        for (let j = 0; j <= 14; j++) {
          pts.push(
            `${r(cx + (j % 2 ? 17 : -17) + offset)},${r(22 + j * (84 / 14))}`,
          );
        }
        return `<polyline points="${pts.join(" ")}"/>`;
      })
      .join("");
    const press = i === 3 ? " pd-coil--press" : "";
    out.push(
      `<g class="pd-coil ${advanced ? "pd-coil--a" : "pd-coil--o"}${press}">${strands}<line x1="${cx - 22}" y1="${r(18)}" x2="${cx + 22}" y2="${r(18)}"/></g>`,
    );
  }
  return `<svg class="pd-coils__svg" viewBox="0 0 360 116" focusable="false">${out.join("")}<line class="pd-coils__floor" x1="8" y1="110" x2="352" y2="110"/></svg>`;
})();

/* ---------------------------------------------------------------------------
   3. Side profile (specification)
   --------------------------------------------------------------------------- */
const profile = (() => {
  const x0 = 24;
  const x1 = 540;
  const rows = [
    ["#efe8dc", 30],
    ["#e7e1d5", 28],
    ["#d2d5d4", 24],
    ["#cac3b5", 12],
    ["#1f1f1f", 50, "spring"],
    ["#303030", 10],
  ];
  let y = 24;
  const parts = rows.map(([fill, h, kind]) => {
    let out = `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="${fill}"/>`;
    if (kind === "spring") {
      for (let cx = x0 + 26; cx < x1 - 10; cx += 30) {
        const pts = [];
        for (let j = 0; j <= 10; j++)
          pts.push(
            `${r(cx + (j % 2 ? 9 : -9))},${r(y + 4 + j * ((h - 8) / 10))}`,
          );
        out += `<polyline points="${pts.join(" ")}" fill="none" stroke="#8d8d8d" stroke-width="1.2"/>`;
      }
      out += `<rect x="${x0}" y="${y}" width="14" height="${h}" fill="#b9b1a2"/><rect x="${x1 - 14}" y="${y}" width="14" height="${h}" fill="#b9b1a2"/>`;
    }
    y += h;
    return out;
  });
  const bottom = y;
  return `<svg class="pd-profile__svg" viewBox="0 0 640 230" focusable="false">
            <rect x="${x0}" y="24" width="${x1 - x0}" height="${bottom - 24}" rx="10" fill="#000"/>
            <g clip-path="url(#pd-profile-clip)">${parts.join("")}</g>
            <clipPath id="pd-profile-clip"><rect x="${x0}" y="24" width="${x1 - x0}" height="${bottom - 24}" rx="10"/></clipPath>
            <g class="pd-profile__dim">
              <line x1="572" y1="24" x2="572" y2="${bottom}"/><line x1="564" y1="24" x2="580" y2="24"/><line x1="564" y1="${bottom}" x2="580" y2="${bottom}"/>
              <text x="590" y="${r((24 + bottom) / 2 + 5)}">400</text>
              <line x1="${x0}" y1="${bottom + 26}" x2="${x1}" y2="${bottom + 26}"/><line x1="${x0}" y1="${bottom + 18}" x2="${x0}" y2="${bottom + 34}"/><line x1="${x1}" y1="${bottom + 18}" x2="${x1}" y2="${bottom + 34}"/>
              <text x="${(x0 + x1) / 2}" y="${bottom + 50}" text-anchor="middle">2,000 – 2,075</text>
            </g>
          </svg>`;
})();

/* ---------------------------------------------------------------------------
   Inject
   --------------------------------------------------------------------------- */
let html = fs.readFileSync(file, "utf8");
// Generated markup stays compact: a prettier-ignore comment keeps formatters
// from expanding it (the anatomy layers are covered by the one placed before
// .pd-anatomy__model in index.html).
const inject = (name, markup, { ignore = true } = {}) => {
  const re = new RegExp(
    `([ \\t]*)<!-- @${name} -->[\\s\\S]*?<!-- /@${name} -->`,
  );
  const match = html.match(re);
  if (!match) throw new Error(`marker @${name} not found`);
  const pad = match[1]; // indentation of the start marker
  const lines = [`${pad}<!-- @${name} -->`];
  if (ignore) lines.push(`${pad}<!-- prettier-ignore -->`);
  lines.push(pad + markup.trim(), `${pad}<!-- /@${name} -->`);
  html = html.replace(re, () => lines.join("\n"));
};
inject("anatomy-defs", defs);
inject("anatomy-layers", layerMarkup, { ignore: false });
inject("coil-demo", coilDemo);
inject("profile", profile);
fs.writeFileSync(file, html);
console.log("injected:", Math.round(html.length / 1024), "KB html");

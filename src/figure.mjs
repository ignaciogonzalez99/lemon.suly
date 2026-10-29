// The figure: a cake on a pastry turntable, drawn with the Anatomy kit.
// Built once in Node for the first paint, then rebuilt in the page from this same module.
import * as k from "../vendor/anatomy/iso-kit.mjs";
import * as G from "../vendor/anatomy/lathe.mjs";
import * as M from "./model.mjs";

export const WIDTH = 640;
export const HEIGHT = 600;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// Turntable, in mm. The plate turns; base, column and lock screw stay put.
export const TT = { footR: 84, baseR: 86, columnR: 24, columnZ: 36, housingZ: 74, housingR: 46, plateR: 170, plateZ: 81, plateH: 8, boardH: 6 };
export const CAKE_Z = TT.plateZ + TT.plateH + TT.boardH;
export const CUT_HALF = 35 * DEG;
export const TURN_LIMIT = 28 * DEG;

export const P = k.fitProjection(
  [...k.boxCorners({ x: -170, y: -170, w: 340, d: 340, r: 0 }, 0, 89), [0, 0, 380], [-110, -110, 330], [110, 110, 330]],
  WIDTH,
  HEIGHT,
  { pad: 40, azimuth: 45, elevation: 32 },
);

const CAM = k.cameraOf(P);
const VIEW = k.towardViewer(P);
export const FRONT = Math.atan2(VIEW[1], VIEW[0]);
const LIGHT = [-CAM.sinA, CAM.cosA];
export const ORIGIN = k.iso([0, 0, 0], P);
// k.iso with the camera's sines worked out once: this runs for every point of every frame.
const [OX, OY] = P.origin;
const at = ([x, y, z]) => [OX + (x * CAM.sinA - y * CAM.cosA) * CAM.k, OY + ((x * CAM.cosA + y * CAM.sinA) * CAM.sinE - z * CAM.cosE) * CAM.k];
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const mat = (name, inner) => (inner ? `<g class="m-${name}">${inner}</g>` : "");
const n1 = (value) => Math.round(value * 10) / 10;
const polar = (r, angle, z) => [r * Math.cos(angle), r * Math.sin(angle), z];
const facing = (angle) => Math.cos(angle) * VIEW[0] + Math.sin(angle) * VIEW[1];
const shadeOf = ([nx, ny]) => Math.min(3, Math.max(0, Math.floor(((nx * LIGHT[0] + ny * LIGHT[1] + 1) / 2) * 4)));
// Same output as k.pathOf (0.1 precision, no "-0"), without toFixed and a regex per number.
const f1 = (value) => {
  const n = Math.round(value * 10);
  if (n === 0) return "0";
  const m = n < 0 ? -n : n;
  const tail = m % 10;
  return (n < 0 ? "-" : "") + ((m - tail) / 10) + (tail ? "." + tail : "");
};
export const fastTenth = f1;
const pathOf = (points, closed) => {
  let d = "";
  for (let i = 0; i < points.length; i++) d += (i ? "L" : "M") + f1(points[i][0]) + " " + f1(points[i][1]);
  return closed && d ? d + "Z" : d;
};
const between = (angle, from, to) => {
  const span = (((to - from) % TAU) + TAU) % TAU;
  const offset = (((angle - from) % TAU) + TAU) % TAU;
  return offset <= span;
};

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Materials: food is the subject, so colour is allowed; every tone is derived from one base colour.

function mix(hex, to, amount) {
  const read = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = read(hex), b = read(to);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("");
}

function tokens(name, base, { gloss = 0.1, ink = 0.55 } = {}) {
  const dark = (t) => mix(base, "#000000", t);
  return `.m-${name}{--anatomy-paper:${base};--anatomy-face:${base};--anatomy-top:${mix(base, "#ffffff", gloss)};--anatomy-shade-0:${dark(0.2)};--anatomy-shade-1:${dark(0.13)};--anatomy-shade-2:${dark(0.075)};--anatomy-shade-3:${dark(0.03)};--anatomy-lit-top:${mix(base, "#ffffff", gloss + 0.05)};--anatomy-lit-shade:${dark(0.06)};--anatomy-hi:${dark(ink)};--anatomy-mid:${dark(ink * 0.7)};--anatomy-lo:${dark(ink * 0.45)};--anatomy-faint:${dark(ink * 0.25)};--anatomy-dot:${dark(0.62)}}`;
}

export const FIXED = {
  board: "#d8b866",
  strawberry: "#d3263a",
  leaf: "#3f8f35",
  blueberry: "#3f4f8e",
  cherry: "#9c0f25",
  stem: "#6b5a2a",
  pearl: "#f4efe6",
  "mac-0": "#f2a9ba",
  "mac-1": "#bcd68f",
  "mac-2": "#c9b2e4",
  "mac-cream": "#f7ecd8",
  "candle-0": "#f6b8c8",
  "candle-1": "#aed4ef",
  "candle-2": "#f6e09a",
  "candle-white": "#fbf8f2",
  "plaque-dark": "#4a2a1a",
  "plaque-white": "#f6efdf",
  handle: "#2f2a26",
  wick: "#2b2622",
};
export const SPRINKLES = ["#e8505b", "#f9c74f", "#43aa8b", "#577590", "#f78fb3"];

export function materialsCss() {
  const out = [];
  for (const item of M.SPONGES) out.push(tokens(`s-${item.id}`, item.color, { ink: 0.5 }));
  for (const item of M.FILLINGS) out.push(tokens(`f-${item.id}`, item.color, { ink: 0.5 }));
  for (const item of M.COLORS) out.push(tokens(`c-${item.id}`, item.color, { gloss: 0.12, ink: 0.42 }));
  out.push(tokens("c-ganache", M.byId(M.COATINGS, "ganache").color, { gloss: 0.16, ink: 0.6 }));
  for (const item of M.DRIPS) out.push(tokens(`d-${item.id}`, item.color, { gloss: 0.18, ink: 0.55 }));
  for (const item of M.RIBBONS) out.push(tokens(`r-${item.id}`, item.color, { gloss: 0.14, ink: 0.5 }));
  for (const [name, color] of Object.entries(FIXED)) out.push(tokens(name, color, { gloss: name === "pearl" ? 0.4 : 0.12, ink: 0.5 }));
  out.push(`.m-seed{--anatomy-dot:#f3d77c}.m-bits{--anatomy-dot:${M.FILLINGS.find((f) => f.bits).bits}}`);
  return out.join("\n");
}

const coatClass = (state) => {
  const coating = M.byId(M.COATINGS, state.coating);
  if (!coating.t) return null;
  return coating.colorable ? `c-${state.color}` : `c-${coating.id}`;
};

// ---------- Small geometry helpers

function arc(R, from, to, z, stepDeg = 2) {
  const count = Math.max(2, Math.ceil(Math.abs(to - from) / (stepDeg * DEG)));
  return Array.from({ length: count + 1 }, (_, i) => polar(R, from + ((to - from) * i) / count, z));
}

// The visible near half of a band on a cylinder, with a bottom edge that may vary with the angle.
function sideBand(R, zTop, bottomAt, { skip = null, steps = 240 } = {}) {
  const from = FRONT - Math.PI / 2, to = FRONT + Math.PI / 2;
  const shades = [[], [], [], []];
  const tops = [], bottoms = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    const drop = skip && skip(a) ? 0 : bottomAt(a);
    tops.push(at(polar(R, a, zTop)));
    bottoms.push(at(polar(R, a, zTop - drop)));
  }
  // Neighbouring facets of one tone become one polygon, so a band is a handful of paths, not hundreds of quads.
  const runs = [];
  let run = null, toneRun = null, tone = -1;
  const flush = () => {
    if (toneRun) shades[tone].push(pathOf([...toneRun.map((i) => tops[i]), ...toneRun.map((i) => bottoms[i]).reverse()], true));
    toneRun = null;
  };
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * (i + 0.5)) / steps;
    const live = !(skip && skip(a));
    if (live) {
      const shade = shadeOf([Math.cos(a), Math.sin(a)]);
      if (shade !== tone || !toneRun) flush(), (tone = shade), (toneRun = [i]);
      toneRun.push(i + 1);
      if (!run) runs.push((run = [i]));
      run.push(i + 1);
    } else (run = null), flush();
  }
  flush();
  return {
    fill: runs.map((r) => pathOf([...r.map((i) => tops[i]), ...r.map((i) => bottoms[i]).reverse()], true)).join(""),
    shades: shades.map((list) => list.join("")),
    bottom: runs.map((r) => pathOf(r.map((i) => bottoms[i]))).join(""),
    top: runs.map((r) => pathOf(r.map((i) => tops[i]))).join(""),
  };
}

const bandSvg = (band, name) =>
  mat(
    name,
    `<path class="iso-fill" d="${band.fill}"/>` +
      band.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("") +
      L(band.bottom, { tone: "hi" }),
  );

// A prism over the pie that is left when the wedge [w0, w1] is cut away (convex: false), or over the wedge itself.
function pie(R, from, to, z, h, { bevel = 0, offset = [0, 0, 0], convex = false } = {}) {
  const ring = [[offset[0], offset[1]], ...arc(R, from, to, 0).map(([x, y]) => [x + offset[0], y + offset[1]])];
  return k.extrude(ring, z + offset[2], h, P, { convex, bevel });
}

// ---------- Turntable

let baseCache = "";
export function turntableBase() {
  if (baseCache) return baseCache;
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: -92, y: -92, w: 184, d: 184, r: 92 }, 0, 3, P)}"/>`);
  out.push(S(k.cylinder(0, 0, TT.footR, 0, 3, P, 120), { tone: "lo" }));
  // Cast base: a lip, then a curved shoulder that runs up into the column collar.
  const F = G.frameOf([0, 0, 3], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const curve = (s) => 31 + 55 * (1 - (s - 9) / 22) ** 2;
  const slope = (s) => (s < 9 || s > 31 ? 0 : (-110 / 22) * (1 - (s - 9) / 22));
  const profile = [[0, 86], [9, 86]];
  for (let i = 1; i <= 22; i++) profile.push([9 + i, curve(9 + i), 1]);
  profile.push([33, 31]);
  out.push(S(G.solidOf(profile, F, P, { smooth: { slope } }), { tone: "mid", inner: L(G.arcOf(F, 4.5, 86, P), { tone: "faint" }) }));
  out.push(D(G.dotsOf(F, 9, 78, 16, P, { all: true }).map((p) => [...p, p[2] ?? 1]), { size: 0.55, tone: "mid" }));
  // Column with two seam rings.
  const columnTop = TT.housingZ;
  out.push(S(k.cylinder(0, 0, TT.columnR, TT.columnZ, columnTop - TT.columnZ, P, 64), { tone: "mid", crease: "none", inner: L([42, 68].map((z) => k.sideArc(0, 0, TT.columnR, z, P, 40)).join(""), { tone: "faint" }) }));
  // Lock screw on the column: a neck and a knurled knob along a radius.
  const angle = FRONT + 52 * DEG;
  const dir = [Math.cos(angle), Math.sin(angle), 0];
  const KF = G.frameAlong([dir[0] * (TT.columnR - 0.6), dir[1] * (TT.columnR - 0.6), 56], dir);
  out.push(S(G.disc(0, 5.6, 3.6, KF, P), { tone: "mid" }));
  out.push(S(G.disc(5.6, 14, 8.5, KF, P, { bevel: 0.6 }), { tone: "mid", inner: k.fadedSvg(G.ribsOf(KF, 6.2, 13.4, 8.5, 40, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
  out.push(L(G.circleOf(KF, 14, 3, P), { tone: "lo" }));
  // Bearing housing under the plate.
  const HF = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  out.push(S(k.cylinder(0, 0, TT.housingR, TT.housingZ, TT.plateZ - TT.housingZ - 1.4, P, 96, 0.8), { tone: "mid" }));
  out.push(D(G.dotsOf(HF, 77.2, TT.housingR, 18, P, { fade: [0.04, 0.42] }), { size: 0.5, tone: "mid" }));
  baseCache = out.join("");
  return baseCache;
}

// The plate is round. Its fine grip knurl repeats every 1.4°, so it is drawn once; the degree ticks lie flat on
// the top face and turn with a screen transform (see spin).
function plateSvg() {
  const z = TT.plateZ, h = TT.plateH, top = z + h, R = TT.plateR;
  const grip = [];
  for (let i = 0; i < 260; i++) {
    const a = (i / 260) * TAU;
    const alpha = G.fadeOf(facing(a), [0.08, 0.5]);
    if (alpha > 0.02) grip.push({ d: pathOf([at(polar(R, a, z + 1.4)), at(polar(R, a, z + 5.2))]), alpha });
  }
  const skirt = S(k.cylinder(0, 0, R - 5, z - 1.4, 1.4, P, 160), { tone: "lo", crease: "none" });
  const solid = S(k.cylinder(0, 0, R, z, h, P, 180, 1.2), { tone: "mid", crease: "lo", inner: k.fadedSvg(grip, { tone: "lo" }) + L(k.sideArc(0, 0, R, z + 5.2, P, 120), { tone: "faint" }) });
  const rings = L([62, 104, 146].map((r) => k.ring(0, 0, r, top, P, 120)).join(""), { tone: "faint" }) + L(k.ring(0, 0, R - 9.5, top, P, 160), { tone: "lo" });
  return skirt + solid + rings;
}

function ticksSvg() {
  const top = TT.plateZ + TT.plateH, R = TT.plateR;
  const minor = [], major = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const long = i % 6 === 0;
    (long ? major : minor).push(pathOf([at(polar(R - 9.5, a, top)), at(polar(R - 9.5 + (long ? 4.6 : 2.4), a, top))]));
  }
  return L(minor.join(""), { tone: "lo" }) + L(major.join(""), { tone: "mid" }) + L(pathOf([at(polar(R - 9.5, 0, top)), at(polar(R - 2.2, 0, top))]), { tone: "hi" });
}

// Anything lying flat at height z turns about the axis by an affine map of the screen, because the camera is
// orthographic: s' = A·R(θ)·A⁻¹·(s − b) + b, with A the camera's floor matrix and b where the axis meets z.
function spin(theta, z) {
  const K = CAM.k;
  const a00 = CAM.sinA * K, a01 = -CAM.cosA * K, a10 = CAM.cosA * CAM.sinE * K, a11 = CAM.sinA * CAM.sinE * K;
  const det = a00 * a11 - a01 * a10;
  const c = Math.cos(theta), s = Math.sin(theta);
  const r00 = a00 * c + a01 * s, r01 = -a00 * s + a01 * c, r10 = a10 * c + a11 * s, r11 = -a10 * s + a11 * c;
  const m00 = (r00 * a11 - r01 * a10) / det, m01 = (-r00 * a01 + r01 * a00) / det;
  const m10 = (r10 * a11 - r11 * a10) / det, m11 = (-r10 * a01 + r11 * a00) / det;
  const bx = OX, by = OY - z * CAM.cosE * K;
  const e = bx - (m00 * bx + m01 * by), f = by - (m10 * bx + m11 * by);
  return `matrix(${m00.toFixed(5)} ${m10.toFixed(5)} ${m01.toFixed(5)} ${m11.toFixed(5)} ${e.toFixed(2)} ${f.toFixed(2)})`;
}

const boards = new Map();
function board(R) {
  const key = Math.round(R * 4) / 4;
  if (!boards.has(key)) {
    if (boards.size > 24) boards.clear();
    const z = TT.plateZ + TT.plateH;
    boards.set(key, mat("board", S(k.cylinder(0, 0, key, z, TT.boardH, P, 160, 0.9), { tone: "hi", inner: L(k.sideArc(0, 0, key, z + 2.4, P, 120), { tone: "faint" }) })));
  }
  return boards.get(key);
}

// ---------- The cake

// Displayed cake: target geometry with eased radius and height, z measured from the board.
function placed(tier, shown, theta = 0) {
  const R = shown?.R ?? tier.R;
  const Rf = R + tier.t;
  const z0 = CAKE_Z + tier.z0;
  const height = shown?.height ?? tier.top - tier.z0;
  const scale = (height - tier.t) / tier.body;
  return { ...tier, R, Rf, z0, top: z0 + height, zs: (z) => z0 + z * scale, scale, last: true, theta };
}

function crumbs(points, count, seed) {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => points(rand(), rand()));
}

// The inside of a tier on one cut face: one strip per layer, with crumb and fruit dots.
function cutFace(state, tier, angle, normal, offset = [0, 0, 0], seed = 1) {
  if (normal[0] * VIEW[0] + normal[1] * VIEW[1] <= 1e-6) return "";
  const shade = shadeOf(normal);
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const pt = (r, z) => at([ux * r + offset[0], uy * r + offset[1], z + offset[2]]);
  const quad = (r0, r1, z0, z1) => pathOf([pt(r0, z0), pt(r1, z0), pt(r1, z1), pt(r0, z1)], true);
  const out = [];
  const coat = coatClass(state);
  const naked = !coat;
  for (const layer of tier.layers) {
    const z0 = tier.zs(layer.z0), z1 = tier.zs(layer.z1);
    const R = layer.kind === "fill" && naked ? tier.R - 1.6 : tier.R;
    const name = layer.kind === "board" ? "board" : layer.kind === "sponge" ? `s-${state.sponge}` : `f-${state.filling}`;
    let body = `<path class="iso-shade" data-shade="${shade}" d="${quad(0, R, z0, z1)}"/>`;
    if (layer.kind === "sponge") {
      const n = Math.round((R * (z1 - z0)) / 70);
      body += D(crumbs((a, b) => pt(R * (0.03 + 0.94 * a), z0 + 1.2 + (z1 - z0 - 2.4) * b), n, seed * 31 + layer.index * 7 + tier.index), { size: 0.42, tone: "lo" });
    }
    if (layer.kind === "fill" && state.filling === "frutilla") {
      body += `<g class="m-bits">${D(crumbs((a, b) => pt(R * (0.05 + 0.9 * a), z0 + 2 + (z1 - z0 - 4) * b), Math.round(R / 9), seed * 17 + layer.index), { size: 0.85, tone: "hi" })}</g>`;
    }
    out.push(mat(name, body + (layer.z0 > 0 ? L(pathOf([pt(0, z0), pt(R, z0)]), { tone: "faint" }) : "")));
  }
  if (coat) out.push(mat(coat, L(pathOf([pt(tier.R, tier.z0), pt(tier.R, tier.zs(tier.body)), pt(0, tier.zs(tier.body))]), { tone: "lo" })));
  if (state.drip && tier.last) out.push(mat(`d-${state.dripColor}`, `<path class="iso-shade" data-shade="${shade}" d="${quad(0, tier.Rf - 0.4, tier.top - 0.2, tier.top + 2.2)}"/>`));
  return out.join("");
}

function tierBody(state, tier, cut) {
  const coat = coatClass(state);
  const coating = M.byId(M.COATINGS, state.coating);
  const out = [];
  const w0 = cut ? cut.w0 : 0, w1 = cut ? cut.w1 : 0;
  const steps = G.stepsFor(tier.Rf, 72, 200, G.scaleOf(P));
  if (coat) {
    const h = tier.top - tier.z0;
    const crown = L(k.ring(0, 0, tier.Rf - 3.2, tier.top, P, 160), { tone: "faint" });
    if (!cut) out.push(mat(coat, S(k.cylinder(0, 0, tier.Rf, tier.z0, h, P, steps, coating.bevel), { tone: "hi", inner: state.coating === "buttercream" ? crown : "" })));
    else out.push(mat(coat, S(pie(tier.Rf, w1, w0 + TAU, tier.z0, h, { bevel: coating.bevel }), { tone: "hi" })));
  } else {
    for (const layer of tier.layers) {
      const z0 = tier.zs(layer.z0), h = tier.zs(layer.z1) - z0;
      const R = layer.kind === "fill" ? tier.R - 1.6 : tier.R;
      const name = layer.kind === "board" ? "board" : layer.kind === "sponge" ? `s-${state.sponge}` : `f-${state.filling}`;
      const paths = cut ? pie(R, w1, w0 + TAU, z0, h) : k.cylinder(0, 0, R, z0, h, P, steps);
      let inner = "";
      if (layer.kind === "sponge") {
        const rand = seeded(97 + layer.index * 13 + tier.index * 5);
        const dots = [];
        for (let i = 0; i < Math.round(tier.R * 0.9); i++) {
          const a = FRONT + (rand() - 0.5) * Math.PI * 0.94;
          if (cut && between(a, w0, w1)) continue;
          const alpha = G.fadeOf(facing(a), [0.05, 0.5]);
          dots.push([...at(polar(R, a, z0 + 1.2 + rand() * (h - 2.4))), alpha]);
        }
        inner = D(dots, { size: 0.45, tone: "lo" });
      }
      out.push(mat(name, S(paths, { tone: "hi", inner })));
    }
  }
  if (cut) {
    const faces = [
      { angle: w1, normal: [Math.sin(w1), -Math.cos(w1)] },
      { angle: w0, normal: [-Math.sin(w0), Math.cos(w0)] },
    ];
    faces.forEach((face, index) => out.push(cutFace(state, tier, face.angle, face.normal, [0, 0, 0], index + 1)));
    const edge = (a, r) => pathOf([at(polar(r, a, tier.z0)), at(polar(r, a, tier.top))]);
    out.push(mat(coat ?? `s-${state.sponge}`, L(edge(w0, tier.Rf) + edge(w1, tier.Rf), { tone: "hi" }) + L(pathOf([at([0, 0, tier.z0]), at([0, 0, tier.top])]), { tone: "mid" })));
  }
  return out.join("");
}

function tierSide(state, tier, cut, { ribbon = true, drip = true } = {}) {
  const out = [];
  const skip = cut ? (a) => between(a, cut.w0, cut.w1) : null;
  if (state.ribbon && ribbon) {
    const band = sideBand(tier.Rf + 0.5, tier.z0 + 15 * Math.min(1, tier.scale), () => 12 * Math.min(1, tier.scale), { skip });
    out.push(bandSvg(band, `r-${state.ribbonColor}`));
    out.push(mat(`r-${state.ribbonColor}`, L(band.top, { tone: "hi" })));
  }
  if (state.drip && tier.last && drip) {
    const rand = seeded(404);
    const count = Math.round((TAU * tier.Rf) / 15);
    const drips = Array.from({ length: count }, (_, i) => ({
      c: (i / count) * TAU + (rand() - 0.5) * 0.06,
      w: (3 + rand() * 2.2) / tier.Rf,
      L: 6 + rand() ** 1.6 * Math.min(34, (tier.top - tier.z0) * 0.55),
    }));
    const rot = cut?.theta ?? tier.theta ?? 0;
    const bottomAt = (a) => {
      let depth = 3;
      const near = Math.round(((((a - rot) % TAU) + TAU) % TAU / TAU) * count);
      for (let j = near - 1; j <= near + 1; j++) {
        const d = drips[((j % count) + count) % count];
        let u = ((a - rot - d.c + Math.PI) % TAU + TAU) % TAU - Math.PI;
        u /= d.w;
        if (Math.abs(u) < 1) depth = Math.max(depth, d.L - d.w * tier.Rf * (1 - Math.sqrt(1 - u * u)));
      }
      return depth;
    };
    out.push(bandSvg(sideBand(tier.Rf + 0.35, tier.top + 0.2, bottomAt, { skip, steps: 320 }), `d-${state.dripColor}`));
  }
  return out.join("");
}

// The drip pool on top of the last tier.
function pool(state, tier, cut) {
  if (!(state.drip && tier.last)) return "";
  const ring = cut ? [[0, 0], ...arc(tier.Rf - 0.4, cut.w1, cut.w0 + TAU, 0)] : arc(tier.Rf - 0.4, 0, TAU, 0).slice(0, -1);
  return mat(`d-${state.dripColor}`, `<path class="iso-top" d="${k.onTop(ring, tier.top + 0.25, P, true)}"/>`);
}

// ---------- Items: built once in <defs> at the origin and placed with <use>, since a part turned about its
// own vertical axis looks the same from every angle. Only the plaque and loose flat bits are rebuilt as the cake turns.

export const defsKey = (state) => coatClass(state) ?? "f-chantilly";

// Each item's bounding cylinder (radius, bottom, top) in mm, so the page can rasterise it once into a small image.
const BOUNDS = { frutillas: [9.8, 0, 22], arandanos: [5.2, 0, 10.2], cerezas: [8.6, 0, 29.4], perlas: [3.8, 0, 7.4], rosetas: [8.2, 0, 9.8], macarons: [13.3, 0, 15], velas: [3.3, 0, 61.5] };
export const ITEMS = ["frutillas", "arandanos", "cerezas", "perlas", "rosetas", "macarons-0", "macarons-1", "macarons-2", "velas-0", "velas-1", "velas-2"];
// The item's box in screen units, relative to where its foot projects: [x, y, width, height].
export function itemBox(type) {
  const [r, z0, z1] = BOUNDS[type.split("-")[0]];
  const K = CAM.k, pad = 1.5;
  const x = -r * K - pad, y = -z1 * CAM.cosE * K - r * CAM.sinE * K - pad;
  return [x, y, 2 * (r * K + pad), (z1 - z0) * CAM.cosE * K + 2 * (r * CAM.sinE * K + pad)];
}

export function defsSvg(state) {
  const F = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const out = [];
  // Strawberry, tip down, leaves up.
  const sr = (s) => (s <= 13 ? 8.4 * (s / 13) ** 0.72 : 8.4 - 1.9 * ((s - 13) / 5) ** 2);
  const sslope = (s) => (s <= 13 ? 8.4 * 0.72 * (s / 13) ** -0.28 / 13 : (-2 * 1.9 * (s - 13)) / 25);
  const profile = [];
  for (let i = 0; i <= 24; i++) {
    const s = 0.25 + (17.75 * i) / 24;
    profile.push([s, sr(s), i < 24 ? 1 : 0]);
  }
  let seeds = "";
  [3.5, 6.5, 9.5, 12.5, 15.5].forEach((s, i) => (seeds += D(G.dotsOf(F, s, sr(s) + 0.05, [6, 9, 11, 12, 11][i], P, { phase: i * 0.31, slope: sslope(s), fade: [0.05, 0.45] }), { size: 0.42, tone: "hi" })));
  const leaf = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * TAU + 0.2;
    const r = i % 2 ? 2.6 : 9.6;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  out.push(`<g id="it-frutillas">${mat("strawberry", S(G.solidOf(profile, F, P, { smooth: { slope: sslope } }), { tone: "hi", crease: "none", inner: `<g class="m-seed">${seeds}</g>` }))}${mat("leaf", `<path class="iso-top" d="${k.onTop(leaf, 18.3, P, true)}"/>${L(k.onTop(leaf, 18.3, P, true), { tone: "hi" })}${S(k.cylinder(0, 0, 0.9, 18.3, 3.4, P, 12), { tone: "hi" })}`)}</g>`);
  // Blueberry with its crown.
  out.push(`<g id="it-arandanos">${mat("blueberry", S(G.sphereOf([0, 0, 5], 5, P), { tone: "hi" }) + L(k.ring(0, 0, 1.3, 9.8, P, 10), { tone: "hi" }))}</g>`);
  // Cherry with a stem.
  const stem = [[0, 0, 13.2], [1.2, -0.6, 19], [3.8, -2.2, 25], [7.2, -4.4, 28.5]].map(at);
  out.push(`<g id="it-cerezas">${mat("cherry", S(G.sphereOf([0, 0, 7], 7, P), { tone: "hi" }) + L(k.ring(0, 0, 1.4, 13.5, P, 12), { tone: "hi" }))}${mat("stem", `<path class="iso-line" data-tone="hi" style="stroke-width:1.3" d="${pathOf(stem)}"/>${D([stem[3]], { size: 0.9, tone: "hi" })}`)}</g>`);
  // Macarons: shell, feet, filling, feet, shell.
  for (let i = 0; i < 3; i++) {
    const shell = (z) => S(k.cylinder(0, 0, 12.6, z, 4.2, P, 64, 1.4), { tone: "hi" });
    const foot = (z) => S(k.cylinder(0, 0, 13.1, z, 1.4, P, 64), { tone: "mid", crease: "none" });
    out.push(`<g id="it-macarons-${i}">${mat(`mac-${i}`, shell(0) + foot(4.2))}${mat("mac-cream", S(k.cylinder(0, 0, 11.6, 5.6, 3.6, P, 64), { tone: "hi" }))}${mat(`mac-${i}`, foot(9.2) + shell(10.6))}</g>`);
  }
  // Pearl.
  out.push(`<g id="it-perlas">${mat("pearl", S(G.sphereOf([0, 0, 3.6], 3.6, P, { steps: 32 }), { tone: "hi" }))}</g>`);
  // Piped rosette in the coating (or chantilly on a naked cake).
  const coat = coatClass(state) ?? "f-chantilly";
  const rr = (s) => 8 * Math.sqrt(Math.max(0, 1 - (s / 10) ** 2));
  const rslope = (s) => (-8 * (s / 100)) / Math.max(0.05, Math.sqrt(Math.max(0, 1 - (s / 10) ** 2)));
  const dome = [];
  for (let i = 0; i <= 18; i++) {
    const s = (9.6 * i) / 18;
    dome.push([s, rr(s), i < 18 ? 1 : 0]);
  }
  const swirl = [2.2, 4.8, 7.2].map((s) => G.arcOf(F, s, rr(s), P, { slope: rslope(s) })).join("");
  out.push(`<g id="it-rosetas">${mat(coat, S(G.solidOf(dome, F, P, { smooth: { slope: rslope } }), { tone: "hi", crease: "none", inner: L(swirl, { tone: "lo" }) }))}</g>`);
  // Candles in three colours, and one flame.
  for (let i = 0; i < 3; i++) {
    const body = S(k.cylinder(0, 0, 3, 0, 56, P, 28, 0.5), { tone: "hi" });
    const bands = [8, 22, 36].map((z) => bandOf(3.05, z + 7, 7)).join("");
    out.push(`<g id="it-velas-${i}">${mat("candle-white", body)}${mat(`candle-${i}`, bands)}${mat("wick", `<path class="iso-line" data-tone="hi" style="stroke-width:1.1" d="${k.segment([0, 0, 56], [0, 0, 61], P)}"/>`)}</g>`);
  }
  const [fx, fy] = at([0, 0, 61]);
  const s = CAM.k;
  const flame = `M${n1(fx)} ${n1(fy + 1.2 * s)}C${n1(fx - 3.6 * s)} ${n1(fy - 1 * s)} ${n1(fx - 1.2 * s)} ${n1(fy - 7 * s)} ${n1(fx)} ${n1(fy - 13 * s)}C${n1(fx + 1.2 * s)} ${n1(fy - 7 * s)} ${n1(fx + 3.6 * s)} ${n1(fy - 1 * s)} ${n1(fx)} ${n1(fy + 1.2 * s)}Z`;
  out.push(`<g id="it-flame"><circle class="flame-glow" cx="${n1(fx)}" cy="${n1(fy - 5 * s)}" r="${n1(12 * s)}"/><g class="flame"><path class="flame-outer" d="${flame}"/><ellipse class="flame-core" cx="${n1(fx)}" cy="${n1(fy - 3 * s)}" rx="${n1(1.3 * s)}" ry="${n1(3.2 * s)}"/></g></g>`);
  // Soft shadows as a radial fade instead of a blur filter, which would be re-rasterised on every repaint.
  out.push(`<radialGradient id="halo-fade"><stop offset="0" style="stop-color:var(--anatomy-halo);stop-opacity:1"/><stop offset=".6" style="stop-color:var(--anatomy-halo);stop-opacity:.7"/><stop offset="1" style="stop-color:var(--anatomy-halo);stop-opacity:0"/></radialGradient>`);
  out.push(`<radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>`);
  return `<defs>${out.join("")}</defs>`;
}

// A band on the visible half of a small cylinder at the origin (candle stripes).
function bandOf(R, zTop, h) {
  const band = sideBand(R, zTop, () => h, { steps: 24 });
  return `<path class="iso-fill" d="${band.fill}"/>` + band.shades.map((d, i) => (d ? `<path class="iso-shade" data-shade="${i}" d="${d}"/>` : "")).join("");
}

// ---------- Layout: where every topping and decoration sits, in cake coordinates (radius, angle) on the board or the top.

export function layoutOf(state) {
  const tier = M.cakeOf(state);
  const items = [];
  const flat = [];
  const counts = {};
  const add = (item) => {
    items.push(item);
    counts[item.count ?? item.type] = (counts[item.count ?? item.type] ?? 0) + 1;
  };
  // Pearls round the foot of the cake, on the board.
  if (state.pearls) {
    const r = tier.Rf + 3.7;
    const n = Math.floor((TAU * r) / 7.7);
    for (let j = 0; j < n; j++) add({ key: `p:${j}`, type: "perlas", surface: "board", r, a: (j / n) * TAU });
  }
  // Rosettes round the top edge.
  if (state.rosettes) {
    const r = tier.Rf - 8.5;
    const n = Math.floor((TAU * r) / 17);
    for (let j = 0; j < n; j++) add({ key: `r:${j}`, type: "rosetas", surface: "top", r, a: (j / n) * TAU + 0.1 });
  }
  const edge = tier.Rf - (state.rosettes ? 18 : 5);
  const fruits = state.toppings.filter((id) => ["frutillas", "cerezas", "arandanos"].includes(id));
  const macarons = state.toppings.includes("macarons");
  let inner = edge;
  if (fruits.length || macarons) {
    const r = edge - (macarons ? 13.5 : 10);
    const n = Math.max(3, Math.floor((TAU * r) / 23));
    const m = macarons ? Math.min(n, Math.max(3, Math.round(n / 4))) : 0;
    const macAt = new Set(Array.from({ length: m }, (_, i) => Math.round((i * n) / m)));
    let f = 0;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU + 0.35;
      if (macAt.has(j)) {
        const c = [...macAt].indexOf(j) % 3;
        add({ key: `m:${j}`, type: `macarons-${c}`, count: "macarons", surface: "top", r, a });
        continue;
      }
      if (!fruits.length) continue;
      const kind = fruits[f++ % fruits.length];
      if (kind === "arandanos") {
        for (const [dr, da] of [[-4, -0.06], [4.5, 0.02], [-1, 0.09]]) add({ key: `a:${j}:${da}`, type: "arandanos", surface: "top", r: r + dr, a: a + (da * 60) / r });
      } else add({ key: `${kind}:${j}`, type: kind, surface: "top", r, a });
    }
    inner = r - (macarons ? 15 : 12);
  }
  // Plaque in front, candles on an arc behind it (or in a ring when there is no plaque).
  const candles = state.candles;
  let plaque = null;
  if (state.plaque && state.message.trim()) {
    const w = Math.max(40, Math.min(92, inner * (candles ? 1.25 : 1.7)));
    plaque = { w, d: w * 0.42, r: candles ? inner * 0.28 : 0, a: FRONT };
    counts.placa = 1;
  }
  if (candles) {
    if (candles === 1 && !plaque) add({ key: "v0", type: "velas-0", count: "velas", surface: "top", r: 0, a: 0 });
    else {
      const r = Math.max(8, plaque ? inner * 0.72 : inner * 0.55);
      const spread = plaque ? Math.min(Math.PI * 1.05, ((candles - 1) * 15) / r) : TAU;
      for (let j = 0; j < candles; j++) {
        const a = plaque ? FRONT + Math.PI + (candles === 1 ? 0 : -spread / 2 + (spread * j) / (candles - 1)) : (j / candles) * TAU + 0.2;
        add({ key: `v${j}`, type: `velas-${j % 3}`, count: "velas", surface: "top", r, a });
      }
    }
  }
  // Flat bits scattered on the top: sprinkles over all of it, chocolate shavings inside the edge.
  if (state.toppings.includes("chispas")) {
    const rand = seeded(7);
    const outer = tier.Rf - 3;
    const n = Math.round((Math.PI * outer * outer) / 85);
    for (let j = 0; j < n; j++) flat.push({ kind: "chispas", r: Math.sqrt(rand()) * outer, a: rand() * TAU, o: rand() * Math.PI, c: Math.floor(rand() * SPRINKLES.length), len: 3.2 + rand() * 1.6 });
    counts.chispas = n;
  }
  if (state.toppings.includes("virutas")) {
    const rand = seeded(55);
    const outer = edge - 2;
    const n = Math.round((Math.PI * outer * outer) / 32);
    for (let j = 0; j < n; j++) flat.push({ kind: "virutas", r: Math.sqrt(rand()) * outer, a: rand() * TAU, o: rand() * Math.PI, len: 3 + rand() * 4, c: rand() });
    counts.virutas = n;
  }
  if (state.ribbon) counts.cinta = 1;
  if (state.drip) counts.chorreado = 1;
  return { tier, items, flat, plaque, counts };
}

// The slice is lifted out to the right, far enough that it never covers the cut faces on screen.
export function sliceOffset(Rf, bisector, open) {
  const dir = bisector - 82 * DEG;
  const reach = Rf * 1.74 + 18;
  return [Math.cos(dir) * reach * open, Math.sin(dir) * reach * open, 26 * open];
}

// ---------- The scene, in layers painted back to front.
// A layer with a key is rebuilt only when its key changes; the rest are rebuilt every frame, and they are kept small.
// While the cake is whole, turning it only changes the items' positions, the drip, and two transforms.

export const LAYERS = ["base", "plate", "ticks", "board", "back", "body", "drip", "front", "flat", "plaque", "top", "slice"];
// Layers made of placed items: the page can draw them as raster images it moves, instead of markup.
export const ITEM_LAYERS = ["back", "front", "top"];
// Layers that rest while the cake turns: the page may swap them for a bitmap.
export const RASTER_LAYERS = ["base", "plate", "ticks", "board", "body", "flat"];

const depth = ([x, y, z]) => (x * CAM.cosA + y * CAM.sinA) * CAM.cosE + z * CAM.sinE;

// view: { theta, cut: { phi, open } | null, shown: { R, height }, drops: { key: dz } }
export function scene(state, layout, view) {
  const theta = view.theta;
  const open = view.cut ? view.cut.open : 0;
  const cut = open > 0 ? { w0: view.cut.phi + theta - CUT_HALF, w1: view.cut.phi + theta + CUT_HALF, theta } : null;
  const tier = placed(layout.tier, view.shown, theta);
  const scale = tier.R / layout.tier.R;
  const bisector = cut ? view.cut.phi + theta : 0;
  const offset = cut ? sliceOffset(tier.Rf, bisector, open) : [0, 0, 0];
  const inWedge = (a) => cut && between(a, cut.w0 - 0.03, cut.w1 + 0.03);
  const shape = [state.coating, state.color, state.sponge, state.filling, state.layers, n1(tier.R), n1(tier.top)].join("|");
  const layers = {};

  layers.base = { key: "base", build: turntableBase };
  layers.plate = { key: "plate", build: plateSvg };
  layers.ticks = { key: "ticks", build: ticksSvg, transform: spin(theta, TT.plateZ + TT.plateH) };
  const boardR = tier.Rf + 13;
  layers.board = { key: `board|${n1(boardR)}`, build: () => board(boardR) };

  // Every item resolved to a world point, and whether it rides on the slice.
  const placedItems = layout.items.map((item) => {
    const r = item.r * scale;
    const a = item.a + theta;
    const z = (item.surface === "board" ? CAKE_Z : tier.top) + (view.drops?.[item.key] ?? 0);
    const slice = Boolean(cut && inWedge(a));
    const p = polar(r, a, z);
    const world = slice ? [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]] : p;
    return { item, world, depth: depth(world), front: facing(a) * r, slice };
  });
  const useOf = ({ item, world }) => {
    const [x, y] = at(world);
    return `<use href="#it-${item.type}" x="${f1(x - ORIGIN[0])}" y="${f1(y - ORIGIN[1])}"/>`;
  };
  const sorted = (list) => list.sort((a, b) => a.depth - b.depth).map(useOf).join("");
  // Placements for the page's raster items, in painter's order.
  const placements = (list) =>
    list
      .sort((a, b) => a.depth - b.depth)
      .map(({ item, world }) => {
        const [x, y] = at(world);
        return { key: item.key, type: item.type, x: x - ORIGIN[0], y: y - ORIGIN[1] };
      });
  const itemLayer = (list) => {
    const items = placements(list);
    return { items, svg: items.map((p) => `<use href="#it-${p.type}" x="${f1(p.x)}" y="${f1(p.y)}"/>`).join("") };
  };
  const pick = (slice, surface, test = () => true) => placedItems.filter((p) => p.slice === slice && p.item.surface === surface && test(p));

  const flatBits = (rot, o, keep) => {
    const groups = {};
    const z = tier.top + 0.4;
    for (const bit of layout.flat) {
      const a = bit.a + rot;
      if (keep && !keep(a)) continue;
      const c = polar(bit.r * scale, a, z);
      const dir = [Math.cos(bit.o + rot), Math.sin(bit.o + rot)];
      const half = bit.len / 2;
      const p0 = at([c[0] - dir[0] * half + o[0], c[1] - dir[1] * half + o[1], z + o[2]]);
      const p1 = at([c[0] + dir[0] * half + o[0], c[1] + dir[1] * half + o[1], z + o[2]]);
      const key = bit.kind === "chispas" ? `s${bit.c}` : bit.c > 0.55 ? "vl" : "vd";
      groups[key] = (groups[key] ?? "") + pathOf([p0, p1]);
    }
    return Object.entries(groups)
      .map(([key, d]) => {
        if (key === "vl") return `<path class="bit viruta-light" d="${d}"/>`;
        if (key === "vd") return `<path class="bit viruta" d="${d}"/>`;
        return `<path class="bit chispa" style="stroke:${SPRINKLES[Number(key.slice(1))]}" d="${d}"/>`;
      })
      .join("");
  };

  const plaqueSvg = (slice) => {
    const plaque = layout.plaque;
    if (!plaque) return "";
    const a = plaque.a + theta;
    if (Boolean(cut && inWedge(a)) !== slice) return "";
    const o = slice ? offset : [0, 0, 0];
    const centre = polar(plaque.r * scale, a, tier.top + (view.drops?.plaque ?? 0));
    const u = [Math.cos(a - Math.PI / 2), Math.sin(a - Math.PI / 2)];
    const w = [Math.cos(a), Math.sin(a)];
    const half = [(plaque.w * scale) / 2, (plaque.d * scale) / 2];
    const corner = 3;
    const ring = [];
    for (const [sx, sy, start] of [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]]) {
      for (let i = 0; i <= 4; i++) {
        const t = (start + (90 * i) / 4) * DEG;
        const lx = sx * (half[0] - corner) + corner * Math.cos(t);
        const ly = sy * (half[1] - corner) + corner * Math.sin(t);
        ring.push([centre[0] + o[0] + u[0] * lx + w[0] * ly, centre[1] + o[1] + u[1] * lx + w[1] * ly]);
      }
    }
    const dark = state.coating !== "ganache" && !(state.drip && state.dripColor === "chocolate");
    const zTop = centre[2] + o[2] + 3.2;
    const solid = mat(dark ? "plaque-dark" : "plaque-white", S(k.extrude(ring, centre[2] + o[2], 3.2, P, { bevel: 0.7 }), { tone: "hi" }));
    const c = at([centre[0] + o[0], centre[1] + o[1], zTop]);
    const ux = at([centre[0] + o[0] + u[0], centre[1] + o[1] + u[1], zTop]);
    const wy = at([centre[0] + o[0] + w[0], centre[1] + o[1] + w[1], zTop]);
    const matrix = `matrix(${[ux[0] - c[0], ux[1] - c[1], wy[0] - c[0], wy[1] - c[1], c[0], c[1]].map((v) => v.toFixed(3)).join(" ")})`;
    const size = half[1] * 0.95;
    const text = state.message.trim();
    const fit = text.length * size * 0.5 > half[0] * 1.7 ? ` textLength="${(half[0] * 1.7).toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : "";
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return solid + `<text class="plaque-text${dark ? "" : " on-white"}" transform="${matrix}" font-size="${size.toFixed(1)}" text-anchor="middle" dominant-baseline="central"${fit}>${escaped}</text>`;
  };

  // The cake on the turntable: pearls behind it, the cake, the drip, pearls in front, then what stands on top.
  layers.back = itemLayer(pick(false, "board", (p) => p.front < 0.01));
  if (cut) {
    layers.body = { svg: tierBody(state, tier, cut) + tierSide(state, tier, cut, { drip: false }) + pool(state, tier, cut) };
    layers.drip = { svg: tierSide(state, tier, cut, { ribbon: false }) };
    layers.flat = { svg: flatBits(theta, [0, 0, 0], (a) => !inWedge(a)) };
  } else {
    layers.body = { key: `body|${shape}|${state.ribbon && state.ribbonColor}|${state.drip && state.dripColor}`, build: () => tierBody(state, tier, null) + tierSide(state, tier, null, { drip: false }) + pool(state, tier, null) };
    layers.drip = { svg: tierSide(state, tier, null, { ribbon: false }) };
    // Built at a turn of 0 and turned with the plate by one transform.
    layers.flat = { key: `flat|${state.toppings.join(",")}|${n1(tier.R)}|${n1(tier.top)}`, build: () => flatBits(0, [0, 0, 0]), transform: spin(theta, tier.top + 0.4) };
  }
  layers.front = itemLayer(pick(false, "board", (p) => p.front >= 0.01));
  layers.plaque = { svg: plaqueSvg(false) };
  layers.top = itemLayer(pick(false, "top"));

  // The slice, lifted out to the side; its shadow on the bench shows how high it is.
  let slice = "";
  if (cut) {
    const out = [];
    const sc = [offset[0] + Math.cos(bisector) * tier.Rf * 0.6, offset[1] + Math.sin(bisector) * tier.Rf * 0.6];
    const sr = tier.Rf * 0.5;
    if (open > 0.02) out.push(`<path class="iso-halo" style="opacity:${(0.32 * open).toFixed(2)}" d="${k.haloOf({ x: sc[0] - sr, y: sc[1] - sr, w: sr * 2, d: sr * 2, r: sr }, 0, 0.1, P)}"/>`);
    out.push(sorted(pick(true, "board", (p) => p.front < 0)));
    const coat = coatClass(state);
    const coating = M.byId(M.COATINGS, state.coating);
    if (coat) out.push(mat(coat, S(pie(tier.Rf, cut.w0, cut.w1, tier.z0, tier.top - tier.z0, { convex: true, offset, bevel: coating.bevel }), { tone: "hi", lit: true })));
    else
      for (const layer of tier.layers) {
        const z0 = tier.zs(layer.z0), h = tier.zs(layer.z1) - z0;
        const R = layer.kind === "fill" ? tier.R - 1.6 : tier.R;
        const name = layer.kind === "sponge" ? `s-${state.sponge}` : `f-${state.filling}`;
        out.push(mat(name, S(pie(R, cut.w0, cut.w1, z0, h, { convex: true, offset }), { tone: "hi", lit: true })));
      }
    // Faces of the slice that turn toward the viewer (only when the cake is turned far).
    out.push(cutFace(state, tier, cut.w0, [Math.sin(cut.w0), -Math.cos(cut.w0)], offset, 3));
    out.push(cutFace(state, tier, cut.w1, [-Math.sin(cut.w1), Math.cos(cut.w1)], offset, 4));
    if (state.ribbon || state.drip) out.push(`<g transform="${k.translateAlong(P, offset)}">${tierSide(state, tier, { w0: cut.w1, w1: cut.w0 + TAU, theta })}</g>`);
    if (state.drip) {
      const ring = [[offset[0], offset[1]], ...arc(tier.Rf - 0.4, cut.w0, cut.w1, 0).map(([x, y]) => [x + offset[0], y + offset[1]])];
      out.push(mat(`d-${state.dripColor}`, `<path class="iso-top" d="${k.onTop(ring, tier.top + 0.25 + offset[2], P, true)}"/>`));
    }
    out.push(sorted(pick(true, "board", (p) => p.front >= 0)));
    out.push(flatBits(theta, offset, (a) => inWedge(a)));
    out.push(plaqueSvg(true));
    out.push(sorted(pick(true, "top")));
    slice = `<g class="slice">${out.join("")}</g>`;
  }
  layers.slice = { svg: slice };

  // Candle flames go to their own overlay, so their flicker never repaints the cake.
  const flames = placedItems
    .filter((p) => p.item.type.startsWith("velas"))
    .map((p) => {
      const [x, y] = at(p.world);
      return `<use href="#it-flame" x="${f1(x - ORIGIN[0])}" y="${f1(y - ORIGIN[1])}" style="--d:${(p.item.key.length * 173 + p.item.r * 37) % 900}ms"/>`;
    })
    .join("");
  return { layers, flames };
}

// All layers as markup, for the first paint and for checks.
export function sceneSvg(state, layout, view) {
  const { layers } = scene(state, layout, view);
  return LAYERS.map((name) => {
    const layer = layers[name];
    const svg = layer.build ? layer.build() : layer.svg;
    return `<g data-layer="${name}"${layer.key !== undefined ? ` data-key="${layer.key}"` : ""}${layer.transform ? ` transform="${layer.transform}"` : ""}>${svg}</g>`;
  }).join("");
}

// The screen box of what is on the turntable now, for the camera to frame.
export function extentOf(layout, view) {
  const pts = [];
  const ring = (r, z, o = [0, 0, 0]) => {
    for (let i = 0; i < 24; i++) pts.push(at([r * Math.cos((i / 24) * TAU) + o[0], r * Math.sin((i / 24) * TAU) + o[1], z + o[2]]));
  };
  ring(TT.plateR, TT.plateZ);
  ring(TT.plateR, TT.plateZ + TT.plateH);
  ring(TT.footR, 0);
  const tier = placed(layout.tier, view.shown);
  ring(tier.Rf + 8, tier.top);
  ring(tier.Rf + 8, tier.z0);
  pts.push(at([0, 0, tier.top + (layout.items.some((item) => item.type.startsWith("velas")) ? 76 : 24)]));
  if (view.cut && view.cut.open > 0) {
    const b = view.cut.phi + view.theta;
    const o = sliceOffset(tier.Rf, b, view.cut.open);
    for (const r of [tier.Rf + 8, 0]) for (const z of [tier.z0, tier.top + 12]) for (let i = 0; i <= 6; i++) {
      const a = b - CUT_HALF + (i / 6) * CUT_HALF * 2;
      pts.push(at([r * Math.cos(a) + o[0], r * Math.sin(a) + o[1], z + o[2]]));
    }
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

export function cameraFor(box, { pad = 22, most = 1.9 } = {}) {
  const s = Math.min(most, (WIDTH - pad * 2) / (box.x1 - box.x0), (HEIGHT - pad * 2) / (box.y1 - box.y0));
  return { s, x: WIDTH / 2 - s * (box.x0 + box.x1) / 2, y: HEIGHT / 2 - s * (box.y0 + box.y1) / 2 };
}

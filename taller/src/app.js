// Live page: the configurator form drives the model, the model drives the figure.
// Runs after the kit (k), lathe (G), model (M) and figure (F) namespaces are inlined.

const form = document.querySelector("[data-form]");
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const defsHost = svg.querySelector("[data-defs]");
const cameras = [...stage.querySelectorAll("[data-camera]")];
const flamesEl = stage.querySelector("[data-flames]");
// One slot per scene layer: a layer with a key is rebuilt only when its key changes, the rest only when their markup does.
const slots = Object.fromEntries([...svg.querySelectorAll("[data-layer]")].map((el) => [el.dataset.layer, { el, key: el.dataset.key ?? null, svg: null, transform: el.getAttribute("transform") ?? "" }]));
const painted = { camera: "", flames: null, defs: "", aria: "" };
const NS = "http://www.w3.org/2000/svg";

// ---------- Items as raster images
// A topping is a stack of small vector parts (a strawberry has about 60). Painting hundreds of them every frame is
// what made the turn stutter, so each kind is drawn once into a bitmap and the page only moves the bitmaps.

const raster = { key: "", busy: "", map: null };
const rasterKey = () => `${F.defsKey(state)}|${document.body.dataset.theme}|${devicePixelRatio}`;

async function rasterize() {
  const key = rasterKey();
  if (raster.key === key || raster.busy === key) return;
  raster.busy = key;
  const scale = Math.min(4, Math.max(2, (devicePixelRatio || 1) * 2));
  const map = {};
  try {
    // One atlas holds every kind side by side, so the SVG is decoded once; each kind is then cut out of it.
    const cells = [];
    let across = 0, tall = 0;
    for (const type of F.ITEMS) {
      const source = defsHost.querySelector(`#it-${type}`);
      if (!source) continue;
      const box = F.itemBox(type);
      cells.push({ type, box, at: across, source });
      across += Math.ceil(box[2]) + 2;
      tall = Math.max(tall, Math.ceil(box[3]));
    }
    const body = cells.map(({ box, at, source }) => `<g transform="translate(${at - F.ORIGIN[0] - box[0]} ${-F.ORIGIN[1] - box[1]})">${source.innerHTML}</g>`).join("");
    const markup = `<svg xmlns="${NS}" viewBox="0 0 ${across} ${tall}" width="${across * scale}" height="${tall * scale}"><style>${k.ISO_CSS}${F.materialsCss()}</style><g class="iso" data-theme="${document.body.dataset.theme}">${body}</g></svg>`;
    const atlas = new Image();
    const svgUrl = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
    atlas.src = svgUrl;
    await atlas.decode();
    URL.revokeObjectURL(svgUrl);
    await Promise.all(
      cells.map(async ({ type, box, at }) => {
        const w = Math.ceil(box[2] * scale), h = Math.ceil(box[3] * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(atlas, at * scale, 0, w, h, 0, 0, w, h);
        const blob = await new Promise((done) => canvas.toBlob(done));
        map[type] = { url: URL.createObjectURL(blob), box };
      }),
    );
  } catch (error) {
    console.warn("No se pudieron preparar las imágenes de los toppings:", error);
    raster.busy = "";
    return;
  }
  if (raster.busy !== key) return Object.values(map).forEach((r) => URL.revokeObjectURL(r.url));
  const old = raster.map;
  Object.assign(raster, { key, busy: "", map });
  for (const name of F.ITEM_LAYERS) slots[name].nodes = null;
  draw();
  if (old) setTimeout(() => Object.values(old).forEach((r) => URL.revokeObjectURL(r.url)), 1000);
}

// ---------- Still layers as raster images
// The turntable, the cake body and the sprinkles don't change while the cake turns (the sprinkles only turn with
// a transform), but the whole drawing is repainted every frame. Once a layer has rested for a moment it is swapped
// for one bitmap of itself, drawn at the current zoom, with lines kept at their on-screen weight.

const zoomBucket = () => Math.round(cam.s * 5) / 5;
let rasterTimer = 0;
function rasterSoon() {
  clearTimeout(rasterTimer);
  rasterTimer = setTimeout(rasterLayers, 260);
}

async function rasterLayers() {
  const zoom = zoomBucket();
  const theme = document.body.dataset.theme;
  const css = document.querySelector("style").textContent;
  const halo = defsHost.querySelector("#halo-fade")?.outerHTML ?? "";
  const mm = svg.style.getPropertyValue("--mm");
  const scale = Math.min(4, zoom * (devicePixelRatio || 1) * 1.25);
  for (const name of F.RASTER_LAYERS) {
    const slot = slots[name];
    if (!slot.key || !slot.markup) continue;
    const key = `${slot.key}|${zoom}|${theme}`;
    if (slot.bitmap?.key === key) continue;
    const box = slot.el.getBBox();
    if (!box.width || !box.height) continue;
    const x = box.x - 3, y = box.y - 3, w = box.width + 6, h = box.height + 6;
    const pw = Math.ceil(w * scale), ph = Math.ceil(h * scale);
    const markup = `<svg xmlns="${NS}" viewBox="${x} ${y} ${w} ${h}" width="${pw}" height="${ph}"><style>${css}</style><defs>${halo}</defs><g class="iso cake-svg" data-theme="${theme}" style="--mm:${mm};--anatomy-weight:${(0.6 / zoom).toFixed(3)}px">${slot.markup}</g></svg>`;
    try {
      const image = new Image();
      const svgUrl = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
      image.src = svgUrl;
      await image.decode();
      URL.revokeObjectURL(svgUrl);
      const canvas = document.createElement("canvas");
      canvas.width = pw;
      canvas.height = ph;
      canvas.getContext("2d").drawImage(image, 0, 0, pw, ph);
      const blob = await new Promise((done) => canvas.toBlob(done));
      if (!slot.key || !key.startsWith(slot.key + "|")) continue;
      const url = URL.createObjectURL(blob);
      const old = slot.bitmap;
      slot.bitmap = { key, zoom, url, markup: `<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/>` };
      slot.el.innerHTML = slot.bitmap.markup;
      slot.shown = key;
      if (old) setTimeout(() => URL.revokeObjectURL(old.url), 500);
    } catch (error) {
      console.warn(`No se pudo preparar la capa ${name}:`, error);
    }
  }
}

// Keeps one <image> per item, moves it, and reorders the layer only when the painter's order changes.
function placeItems(slot, items) {
  if (!slot.nodes) {
    slot.nodes = new Map();
    slot.el.textContent = "";
    slot.order = "";
    slot.svg = null;
    slot.key = null;
  }
  const seen = new Set();
  let order = "";
  for (const p of items) {
    const art = raster.map[p.type];
    let node = slot.nodes.get(p.key);
    if (!node || node.dataset.type !== p.type) {
      node?.remove();
      node = document.createElementNS(NS, "image");
      node.setAttribute("href", art.url);
      node.setAttribute("width", art.box[2].toFixed(2));
      node.setAttribute("height", art.box[3].toFixed(2));
      node.setAttribute("preserveAspectRatio", "none");
      node.dataset.type = p.type;
      slot.nodes.set(p.key, node);
      order = "new";
    }
    const x = (F.ORIGIN[0] + p.x + art.box[0]).toFixed(1), y = (F.ORIGIN[1] + p.y + art.box[1]).toFixed(1);
    if (node.__x !== x) node.setAttribute("x", (node.__x = x));
    if (node.__y !== y) node.setAttribute("y", (node.__y = y));
    seen.add(p.key);
    order += p.key + "|";
  }
  for (const [key, node] of slot.nodes) {
    if (!seen.has(key)) {
      node.remove();
      slot.nodes.delete(key);
    }
  }
  if (order !== slot.order) {
    for (const p of items) slot.el.appendChild(slot.nodes.get(p.key));
    slot.order = order;
  }
}
const readout = document.querySelector("[data-readout]");
const cutButton = document.querySelector("[data-cut]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const kg = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TAU = Math.PI * 2;

// ---------- State <-> form <-> URL

const KEYS = { diameter: "d", layers: "c", sponge: "b", filling: "r", coating: "cob", color: "col", toppings: "t", candles: "v", plaque: "pl", message: "m", pearls: "pe", rosettes: "ro", drip: "ch", dripColor: "chc", ribbon: "ci", ribbonColor: "cic" };
const NUMBERS = ["diameter", "layers", "candles"];
const FLAGS = ["plaque", "pearls", "rosettes", "drip", "ribbon"];

function fromHash() {
  if (location.hash.length < 2) return null;
  const params = new URLSearchParams(location.hash.slice(1));
  const out = {};
  for (const [key, short] of Object.entries(KEYS)) {
    if (!params.has(short)) continue;
    const value = params.get(short);
    if (NUMBERS.includes(key)) out[key] = Number(value);
    else if (FLAGS.includes(key)) out[key] = value === "1";
    else if (key === "toppings") out[key] = value ? value.split(",") : [];
    else out[key] = value;
  }
  return out;
}

function toHash(state) {
  const params = new URLSearchParams();
  for (const [key, short] of Object.entries(KEYS)) {
    const value = state[key];
    params.set(short, Array.isArray(value) ? value.join(",") : typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }
  history.replaceState(null, "", "#" + params.toString());
}

function readForm() {
  const data = new FormData(form);
  const out = {};
  for (const key of Object.keys(KEYS)) {
    if (key === "toppings") out.toppings = data.getAll("toppings");
    else if (FLAGS.includes(key)) out[key] = data.has(key);
    else if (data.has(key)) out[key] = NUMBERS.includes(key) ? Number(data.get(key)) : String(data.get(key));
  }
  return out;
}

function writeForm(state) {
  for (const input of form.elements) {
    if (!input.name) continue;
    const value = state[input.name];
    if (input.type === "radio") input.checked = String(value) === input.value;
    else if (input.type === "checkbox") input.checked = input.name === "toppings" ? state.toppings.includes(input.value) : Boolean(value);
    else if (input.name === "message" && input.value !== value) input.value = value;
    else if (input.name === "candles") input.value = value;
  }
  const colorable = M.byId(M.COATINGS, state.coating).colorable;
  form.querySelector("[data-colors]").toggleAttribute("data-off", !colorable);
  for (const input of form.querySelectorAll('[name="color"]')) input.disabled = !colorable;
  form.querySelector('[data-when="plaque"]').toggleAttribute("data-off", !state.plaque);
  form.querySelector('[data-when="drip"]').toggleAttribute("data-off", !state.drip);
  form.querySelector('[data-when="ribbon"]').toggleAttribute("data-off", !state.ribbon);
  form.querySelector("[data-candles]").textContent = String(state.candles);
}

// ---------- Live figure state

let state = M.normalize({ ...M.defaults(), ...(fromHash() ?? {}) });
let layout = F.layoutOf(state);
let theta = 0.35, omega = 0, aim = null;
let cut = null;
let shown = { R: layout.tier.R, height: layout.tier.top - layout.tier.z0 };
let drops = {};
let plaqueDrop = { z: 0, rate: 0, wait: 0 };
let touring = !still.matches, tourClock = 0, idleTimer = 0;
let dragging = null;
let frame = 0, last = 0, visible = false;
const viewOf = () => ({
  theta,
  cut: cut && { phi: cut.phi, open: cut.open },
  shown,
  drops: Object.fromEntries([...Object.entries(drops).map(([key, d]) => [key, d.z]), ["plaque", plaqueDrop.z]]),
});
let cam = F.cameraFor(F.extentOf(layout, viewOf()));

function summary() {
  const sum = M.summaryOf(state, layout.counts);
  const text = `${sum.servings} porciones · ${kg.format(sum.grams / 1000)} kg`;
  if (readout.textContent !== text) readout.textContent = text;
  const lines = document.querySelector("[data-lines]");
  lines.innerHTML = sum.lines
    .map((line) => `<li><span>${line.label}${line.count && line.count > 1 ? ` <em>× ${line.count}</em>` : ""}</span><span class="grams">${line.grams >= 1 ? Math.round(line.grams) + " g" : ""}</span><span class="price">$ ${money.format(Math.round(line.price / 10) * 10)}</span></li>`)
    .join("");
  document.querySelector("[data-total]").textContent = `$ ${money.format(sum.price)}`;
  document.querySelector("[data-facts]").textContent = `${sum.servings} porciones de fiesta · ${kg.format(sum.grams / 1000)} kg · ${state.diameter} × ${(sum.cake.top / 10).toLocaleString("es-AR")} cm`;
  return sum;
}

function apply(next, { animate = true } = {}) {
  const before = new Set(layout.items.map((item) => item.key));
  const hadPlaque = Boolean(layout.plaque);
  state = M.normalize(next);
  layout = F.layoutOf(state);
  const calm = still.matches || !animate;
  layout.items.forEach((item, index) => {
    if (!before.has(item.key) && !calm) drops[item.key] = { z: 46 + (index % 5) * 6, rate: 0, wait: (index % 24) * 0.018 };
  });
  for (const key of Object.keys(drops)) if (!layout.items.some((item) => item.key === key)) delete drops[key];
  if (layout.plaque && !hadPlaque && !calm) plaqueDrop = { z: 50, rate: 0, wait: 0.05 };
  if (calm) shown = { R: layout.tier.R, height: layout.tier.top - layout.tier.z0 };
  // The item shapes only depend on the coating (rosettes are piped in it).
  const defs = F.defsKey(state);
  if (painted.defs !== defs) {
    defsHost.innerHTML = F.defsSvg(state);
    painted.defs = defs;
  }
  rasterize();
  writeForm(state);
  toHash(state);
  summary();
  draw();
  kick();
}

// ---------- Motion

const follow = (value, target, dt, seconds) => (still.matches ? target : value + (target - value) * (1 - Math.exp(-dt / seconds)));
function spring(item, dt, stiffness = 260, damping = 22) {
  if (item.wait > 0) {
    item.wait -= dt;
    return false;
  }
  for (let i = 0; i < 4; i++) {
    item.rate += (-item.z * stiffness - item.rate * damping) * (dt / 4);
    item.z += item.rate * (dt / 4);
  }
  if (Math.abs(item.z) < 0.05 && Math.abs(item.rate) < 0.05) {
    item.z = 0;
    item.rate = 0;
    return true;
  }
  return false;
}

function tick(now) {
  const moving = step(now);
  frame = visible && moving ? requestAnimationFrame(tick) : 0;
}

function step(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  let moving = false;
  // Turning: drag, keyboard aim, inertia, or the idle tour.
  if (dragging) moving = true;
  else if (aim !== null) {
    theta = follow(theta, aim, dt, 0.28);
    if (Math.abs(aim - theta) < 0.001) (theta = aim), (aim = null);
    moving = true;
  } else {
    // The idle tour turns the whole cake slowly; with a slice cut it rests, so nothing redraws for nothing.
    const tour = touring && !cut ? -0.2 : 0;
    omega = follow(omega, tour, dt, 0.9);
    theta += omega * dt;
    if (Math.abs(omega) > 0.0005) moving = true;
    else omega = 0;
  }
  if (cut) {
    const lo = cut.theta - F.TURN_LIMIT, hi = cut.theta + F.TURN_LIMIT;
    if (theta < lo || theta > hi) {
      theta = Math.max(lo, Math.min(hi, theta));
      omega = 0;
    }
    cut.open = follow(cut.open, cut.target, dt, 0.32);
    if (Math.abs(cut.open - cut.target) > 0.001) moving = true;
    else cut.open = cut.target;
    if (cut.target === 0 && cut.open === 0) cut = null;
  }
  // Size eases; new pieces drop in on a spring.
  for (const [key, value] of [["R", layout.tier.R], ["height", layout.tier.top - layout.tier.z0]]) {
    shown[key] = follow(shown[key], value, dt, 0.26);
    if (Math.abs(shown[key] - value) > 0.02) moving = true;
    else shown[key] = value;
  }
  for (const [key, item] of Object.entries(drops)) {
    if (spring(item, dt)) delete drops[key];
    else moving = true;
  }
  if (plaqueDrop.z || plaqueDrop.wait > 0) if (!spring(plaqueDrop, dt)) moving = true;
  // The camera frames whatever is on the turntable now.
  const target = F.cameraFor(F.extentOf(layout, viewOf()));
  for (const key of ["s", "x", "y"]) {
    cam[key] = follow(cam[key], target[key], dt, 0.38);
    if (Math.abs(cam[key] - target[key]) > (key === "s" ? 0.0005 : 0.05)) moving = true;
    else cam[key] = target[key];
  }
  draw();
  return moving;
}

// For checks in a background tab, where animation frames don't run: advance the simulation by hand.
window.__torta = {
  advance(seconds) {
    let now = performance.now();
    last = now;
    for (let t = 0; t < seconds; t += 1 / 60) step((now += 1000 / 60));
    last = 0;
  },
  cut: () => toggleCut(),
  turn: (degrees) => ((theta += (degrees * Math.PI) / 180), draw()),
};

function draw() {
  const { layers, flames } = F.scene(state, layout, viewOf());
  const bitmaps = raster.map && raster.key === rasterKey();
  for (const name of F.LAYERS) {
    const layer = layers[name], slot = slots[name];
    if (layer.items && bitmaps) placeItems(slot, layer.items);
    else if (layer.key !== undefined) {
      if (slot.key !== layer.key) {
        slot.markup = layer.build();
        slot.el.innerHTML = slot.markup;
        slot.key = layer.key;
        slot.svg = null;
        slot.shown = "vector";
        rasterSoon();
      } else if (!slot.markup) {
        // Painted by the first page load: keep its markup so it can be rasterised too.
        slot.markup = layer.build();
        rasterSoon();
      } else if (slot.bitmap && slot.bitmap.key.startsWith(slot.key + "|") && slot.shown !== slot.bitmap.key) {
        slot.el.innerHTML = slot.bitmap.markup;
        slot.shown = slot.bitmap.key;
      } else if (slot.bitmap && slot.bitmap.zoom !== zoomBucket()) rasterSoon();
    } else if (slot.svg !== layer.svg) {
      slot.el.innerHTML = layer.svg;
      slot.svg = layer.svg;
      slot.key = null;
      slot.nodes = null;
    }
    const transform = layer.transform ?? "";
    if (slot.transform !== transform) {
      if (transform) slot.el.setAttribute("transform", transform);
      else slot.el.removeAttribute("transform");
      slot.transform = transform;
    }
  }
  if (painted.flames !== flames) flamesEl.innerHTML = painted.flames = flames;
  const camera = `translate(${cam.x.toFixed(2)} ${cam.y.toFixed(2)}) scale(${cam.s.toFixed(4)})`;
  if (painted.camera !== camera) for (const el of cameras) el.setAttribute("transform", (painted.camera = camera));
  const degrees = Math.round(((((-theta * 180) / Math.PI) % 360) + 360) % 360);
  const aria = `${degrees} grados${cut ? ", con una porción cortada" : ""}`;
  if (painted.aria !== aria) {
    stage.setAttribute("aria-valuenow", String(degrees));
    stage.setAttribute("aria-valuetext", (painted.aria = aria));
  }
}

function kick() {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
}

function pause() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    touring = !still.matches;
    tourClock = 0;
    kick();
  }, 4500);
}

function toggleCut() {
  if (cut && cut.target === 1) cut.target = 0;
  else if (cut) cut.target = 1;
  else {
    cut = { phi: F.FRONT - theta, theta, open: 0, target: 1 };
    omega = 0;
    aim = null;
  }
  if (still.matches) cut.open = cut.target;
  cutButton.setAttribute("aria-pressed", String(cut.target === 1));
  cutButton.textContent = cut.target === 1 ? "Volver a armar la torta" : "Cortar una porción";
  pause();
  kick();
}

// ---------- Input

stage.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  stage.setPointerCapture(event.pointerId);
  dragging = { x: event.clientX, t: performance.now(), rate: 0, width: svg.getBoundingClientRect().width };
  aim = null;
  omega = 0;
  pause();
  kick();
});
stage.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const dx = event.clientX - dragging.x;
  const now = performance.now();
  const dTheta = -dx / (dragging.width * 0.34);
  theta += dTheta;
  dragging.rate = follow(dragging.rate, dTheta / Math.max(0.008, (now - dragging.t) / 1000), 1 / 60, 0.05);
  dragging.x = event.clientX;
  dragging.t = now;
});
const release = () => {
  if (!dragging) return;
  omega = Math.max(-5, Math.min(5, dragging.rate));
  if (performance.now() - dragging.t > 90) omega = 0;
  dragging = null;
  pause();
  kick();
};
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
stage.addEventListener("keydown", (event) => {
  const step = 15 * (Math.PI / 180);
  if (event.key === "ArrowLeft") aim = (aim ?? theta) + step;
  else if (event.key === "ArrowRight") aim = (aim ?? theta) - step;
  else if (event.key === "c" || event.key === "C" || event.key === "Enter" || event.key === " ") return event.preventDefault(), toggleCut();
  else return;
  event.preventDefault();
  if (cut) aim = Math.max(cut.theta - F.TURN_LIMIT, Math.min(cut.theta + F.TURN_LIMIT, aim));
  pause();
  kick();
});
cutButton.addEventListener("click", toggleCut);
document.querySelectorAll("[data-turn]").forEach((button) =>
  button.addEventListener("click", () => {
    const step = Number(button.dataset.turn) * (Math.PI / 180);
    aim = (aim ?? theta) + step;
    if (cut) aim = Math.max(cut.theta - F.TURN_LIMIT, Math.min(cut.theta + F.TURN_LIMIT, aim));
    pause();
    kick();
  }),
);

form.addEventListener("input", () => apply({ ...state, ...readForm() }));
form.addEventListener("submit", (event) => event.preventDefault());
form.querySelectorAll("[data-step]").forEach((button) =>
  button.addEventListener("click", () => {
    const next = readForm();
    next.candles = Math.max(0, Math.min(9, state.candles + Number(button.dataset.step)));
    apply(next);
  }),
);

const dialog = document.querySelector("[data-order]");
document.querySelector("[data-open-order]").addEventListener("click", () => {
  const sum = M.summaryOf(state, layout.counts);
  const coating = M.byId(M.COATINGS, state.coating);
  const lines = [
    `Torta de ${state.diameter} cm de diámetro, ${state.layers} capas de bizcocho`,
    `Bizcocho: ${M.byId(M.SPONGES, state.sponge).label} · Relleno: ${M.byId(M.FILLINGS, state.filling).label}`,
    `Cobertura: ${coating.label}${coating.colorable ? " " + M.byId(M.COLORS, state.color).label.toLowerCase() : ""}`,
    state.toppings.length ? `Toppings: ${state.toppings.map((id) => M.byId(M.TOPPINGS, id).label).join(", ")}` : "Sin toppings",
    [state.candles ? `${state.candles} velas` : "", state.plaque && state.message.trim() ? `placa "${state.message.trim()}"` : "", state.pearls ? "borde de perlas" : "", state.rosettes ? "rosetas" : "", state.drip ? `chorreado de ${M.byId(M.DRIPS, state.dripColor).label.toLowerCase()}` : "", state.ribbon ? `cinta ${M.byId(M.RIBBONS, state.ribbonColor).label.toLowerCase()}` : ""].filter(Boolean).join(", ") || "Sin decoración",
    `${sum.servings} porciones · ${kg.format(sum.grams / 1000)} kg · $ ${money.format(sum.price)} (estimado)`,
  ];
  dialog.querySelector("[data-order-text]").textContent = lines.join("\n");
  dialog.showModal();
});
document.querySelector("[data-copy]").addEventListener("click", async (event) => {
  const text = dialog.querySelector("[data-order-text]").textContent + "\n" + location.href;
  try {
    await navigator.clipboard.writeText(text);
    event.target.textContent = "¡Copiado!";
  } catch {
    event.target.textContent = "No se pudo copiar";
  }
  setTimeout(() => (event.target.textContent = "Copiar pedido y enlace"), 1800);
});

new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) kick();
}, { rootMargin: "120px 0px" }).observe(stage);
still.addEventListener("change", () => {
  touring = !still.matches;
  kick();
});
const scheme = matchMedia("(prefers-color-scheme: dark)");
const theme = () => {
  document.body.setAttribute("data-theme", scheme.matches ? "dark" : "light");
  if (painted.defs) rasterize();
};
scheme.addEventListener("change", theme);
theme();

apply(state, { animate: false });

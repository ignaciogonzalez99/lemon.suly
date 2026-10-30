// Builds index.html: the configurator page with the kit, the model and the figure inlined.
// node build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./vendor/anatomy/iso-kit.mjs";
import * as M from "./src/model.mjs";
import * as F from "./src/figure.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "vendor", "anatomy");

// Wrap an ES module's source as a namespace object, so modules that share helper names can sit in one page script.
function namespace(file, name, params, prelude = "", patch = (source) => source) {
  let source = patch(readFileSync(file, "utf8").replace(/\r\n/g, "\n")).replace(/^import .*$/gm, "");
  const names = [...source.matchAll(/^export (?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/gm)].map((match) => match[1]);
  source = source.replace(/^export /gm, "");
  return `const ${name} = ((${params}) => {\n${prelude}${source}\nreturn { ${names.join(", ")} };\n})(${params});\n`;
}

// The page rebuilds the scene every frame while the plate turns. Two of the kit's innermost helpers are swapped
// for versions with the same output: the camera's sines cached per projection, and numbers printed without toFixed.
const FAST = [
  ["const tenth = (value) => {", `const tenth = ${F.fastTenth.toString()};\nconst tenthSlow = (value) => {`],
  ["export function iso([x, y, z], projection) {\n    const { origin } = projection;\n    const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);", "const CAMERAS = new WeakMap();\nexport function iso([x, y, z], projection) {\n    const { origin } = projection;\n    let camera = CAMERAS.get(projection);\n    if (!camera) CAMERAS.set(projection, (camera = cameraOf(projection)));\n    const { sinA, cosA, sinE, cosE, k } = camera;"],
];
function fast(source) {
  for (const [from, to] of FAST) {
    if (!source.includes(from)) throw new Error(`kit changed, cannot patch: ${from.slice(0, 40)}`);
    source = source.replace(from, to);
  }
  return source;
}

const script = [
  namespace(join(KIT, "iso-kit.mjs"), "k", "", "", fast),
  namespace(join(KIT, "lathe.mjs"), "G", "k", "const { cameraOf, iso, pathOf } = k;\n"),
  namespace(join(HERE, "src", "model.mjs"), "M", ""),
  namespace(join(HERE, "src", "figure.mjs"), "F", "k, G, M"),
  readFileSync(join(HERE, "src", "app.js"), "utf8"),
].join("\n");

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const state = M.defaults();
const layout = F.layoutOf(state);
const view = { theta: 0.35, cut: null, shown: null, drops: {} };
const cam = F.cameraFor(F.extentOf(layout, view));
const mm = k.cameraOf(F.P).k;

const svg = `<svg class="iso-svg cake-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${F.WIDTH} ${F.HEIGHT}" style="--mm:${mm.toFixed(3)}" role="img" aria-label="Una torta sobre un giratorio de repostería: base de fundición, columna con tornillo de bloqueo y plato con marcas de grados. Encima, la base de cartón dorado y la torta con su cobertura, toppings y decoración. Al cortar una porción, la cara del corte muestra cada capa de bizcocho y de relleno."><g data-defs>${F.defsSvg(state)}</g><g data-camera transform="translate(${cam.x.toFixed(2)} ${cam.y.toFixed(2)}) scale(${cam.s.toFixed(4)})">${F.sceneSvg(state, layout, view)}</g></svg>`;
// Candle flames flicker in their own overlay, so the flicker repaints a few small paths and never the cake.
const fx = `<svg class="cake-fx" viewBox="0 0 ${F.WIDTH} ${F.HEIGHT}" aria-hidden="true"><g data-camera transform="translate(${cam.x.toFixed(2)} ${cam.y.toFixed(2)}) scale(${cam.s.toFixed(4)})"><g data-flames>${F.scene(state, layout, view).flames}</g></g></svg>`;

const plate = k.plateHtml({
  fig: "Fig 1",
  title: "Tu torta",
  hint: "Arrastra para girar · C corta",
  readout: "",
  keys: [
    { mark: "raised", label: "Giratorio de repostería: el plato gira sobre un rodamiento" },
    { mark: "lit", label: "La porción cortada: muestra cada capa de bizcocho y relleno" },
  ],
  caption:
    "Cada capa es 3 cm de bizcocho y cada relleno 1 cm. Las porciones son de fiesta, 16 cm² de planta, y el peso suma el volumen de cada ingrediente por su densidad. Los precios son valores de ejemplo.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Giratorio: flechas para girar, C o Enter para cortar una porción" aria-valuemin="0" aria-valuemax="359" aria-valuenow="0">${svg}${fx}</div><div class="stage-tools"><button type="button" class="tool" data-turn="20" aria-label="Girar a la izquierda">↺</button><button type="button" class="tool wide" data-cut aria-pressed="false">Cortar una porción</button><button type="button" class="tool" data-turn="-20" aria-label="Girar a la derecha">↻</button></div>`,
});

const radios = (name, list, { swatch = false, value = "id", label = "label", extra = () => "" } = {}) =>
  list
    .map((item) => {
      const v = typeof item === "object" ? item[value] : item;
      const text = typeof item === "object" ? item[label] : item;
      return `<label class="option${swatch ? " swatch" : ""}"><input type="radio" name="${name}" value="${esc(v)}"${String(state[name]) === String(v) ? " checked" : ""}>${swatch && item.color ? `<span class="chip" style="--chip:${item.color}"></span>` : ""}<span>${esc(text)}${extra(item)}</span></label>`;
    })
    .join("");
const check = (name, value, text, checked, chip = "") => `<label class="option toggle"><input type="checkbox" name="${name}" value="${esc(value)}"${checked ? " checked" : ""}>${chip}<span>${esc(text)}</span></label>`;
const dots = (name, list) => `<div class="dots">${list.map((item) => `<label class="dot" title="${esc(item.label)}"><input type="radio" name="${name}" value="${item.id}"${state[name] === item.id ? " checked" : ""} aria-label="${esc(item.label)}"><span style="--chip:${item.color}"></span></label>`).join("")}</div>`;

const panel = `<form class="panel" data-form autocomplete="off">
<header class="panel-head"><p class="eyebrow">Taller de tortas · prototipo</p><h1>Arma tu torta</h1><p class="lede">Elige el tamaño, el bizcocho, el relleno y la cobertura, y decórala. La torta del giratorio cambia contigo: córtale una porción para ver el interior.</p></header>
<fieldset><legend><b>1</b> Tamaño</legend>
<p class="label">Diámetro de la base</p><div class="segmented">${radios("diameter", M.DIAMETERS.map((d) => ({ id: d, label: d + " cm" })))}</div>
<p class="label">Capas de bizcocho</p><div class="segmented">${radios("layers", [{ id: 2, label: "2 capas · 7 cm" }, { id: 3, label: "3 capas · 11 cm" }])}</div>
</fieldset>
<fieldset><legend><b>2</b> Bizcocho</legend><div class="grid">${radios("sponge", M.SPONGES, { swatch: true })}</div></fieldset>
<fieldset><legend><b>3</b> Relleno</legend><div class="grid">${radios("filling", M.FILLINGS, { swatch: true })}</div></fieldset>
<fieldset><legend><b>4</b> Cobertura</legend><div class="segmented">${radios("coating", M.COATINGS)}</div>
<div class="sub" data-colors><p class="label">Color</p>${dots("color", M.COLORS)}</div></fieldset>
<fieldset><legend><b>5</b> Toppings</legend><div class="grid">${M.TOPPINGS.map((item) => check("toppings", item.id, item.label, state.toppings.includes(item.id))).join("")}</div></fieldset>
<fieldset><legend><b>6</b> Decoración</legend>
<div class="row"><span class="label">Velas</span><div class="stepper"><button type="button" data-step="-1" aria-label="Quitar una vela">−</button><output data-candles>${state.candles}</output><button type="button" data-step="1" aria-label="Agregar una vela">+</button></div><input type="hidden" name="candles" value="${state.candles}"></div>
<div class="grid">${check("plaque", "1", "Placa con mensaje", state.plaque)}${check("pearls", "1", "Borde de perlas", state.pearls)}${check("rosettes", "1", "Rosetas de crema", state.rosettes)}${check("drip", "1", "Chorreado", state.drip)}${check("ribbon", "1", "Cinta", state.ribbon)}</div>
<div class="sub" data-when="plaque"><label class="label" for="message">Mensaje de la placa</label><input id="message" class="text" name="message" maxlength="18" value="${esc(state.message)}"></div>
<div class="sub" data-when="drip"><p class="label">Chorreado</p>${dots("dripColor", M.DRIPS)}</div>
<div class="sub" data-when="ribbon"><p class="label">Cinta</p>${dots("ribbonColor", M.RIBBONS)}</div>
</fieldset>
<section class="summary" aria-live="polite"><h2>Resumen</h2><p class="facts" data-facts></p><ul class="lines" data-lines></ul><p class="total"><span>Total estimado</span><strong data-total></strong></p>
<div class="actions"><button type="button" class="primary" data-open-order>Pedir esta torta</button></div><p class="note">Prototipo: los precios son de ejemplo y el pedido no se envía a ningún lado; el enlace de la página guarda tu diseño.</p></section>
</form>`;

const dialog = `<dialog class="order" data-order><h2>Tu pedido</h2><pre data-order-text></pre><div class="actions"><button type="button" class="primary" data-copy>Copiar pedido y enlace</button><form method="dialog"><button>Cerrar</button></form></div></dialog>`;

const css = `
${k.ISO_CSS}
${F.materialsCss()}
*{box-sizing:border-box}
html{color-scheme:light}
body[data-theme="dark"]{color-scheme:dark}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.app{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(330px,.88fr);gap:32px;max-width:1240px;margin:0 auto;padding:28px 24px 64px;align-items:start}
.stage-col{position:sticky;top:16px}
.iso-figure{margin:0}
.iso-plate{padding:46px 18px 40px}
.iso-stage{position:relative;outline:none;cursor:grab;touch-action:pan-y;user-select:none;border-radius:4px}
.iso-stage:active{cursor:grabbing}
.iso-stage:focus-visible{box-shadow:0 0 0 2px var(--anatomy-mid)}
.cake-svg{max-height:calc(100vh - 220px);margin:0 auto}
.stage-tools{display:flex;justify-content:center;gap:8px;margin-top:6px}
.tool{font:500 12px/1 var(--anatomy-mono);letter-spacing:.04em;color:var(--anatomy-strong);background:var(--anatomy-card);border:1px solid var(--anatomy-lo);padding:9px 12px;border-radius:999px;cursor:pointer}
.tool.wide{padding:9px 16px}
.tool[aria-pressed="true"]{background:var(--anatomy-strong);color:var(--anatomy-card);border-color:var(--anatomy-strong)}
.tool:hover{border-color:var(--anatomy-mid)}
.iso-legend{font-size:12.5px}
.panel{display:grid;gap:14px}
.panel-head h1{margin:2px 0 6px;color:var(--anatomy-strong);font-size:30px;line-height:1.1;letter-spacing:-.01em}
.eyebrow,.label,legend{font-family:var(--anatomy-mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-muted)}
.eyebrow{margin:0}
.lede{margin:0;max-width:52ch}
fieldset{margin:0;border:0;padding:16px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-faint);display:grid;gap:8px}
legend{float:left;width:100%;padding:0;margin:0 0 4px;color:var(--anatomy-text)}
legend b{display:inline-grid;place-items:center;width:18px;height:18px;margin-right:8px;border-radius:50%;background:var(--anatomy-strong);color:var(--anatomy-card);font-size:10px}
.label{display:block;margin:6px 0 0}
.segmented{display:flex;flex-wrap:wrap;gap:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.option{position:relative;display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--anatomy-faint);cursor:pointer;color:var(--anatomy-strong);font-size:13px;background:var(--anatomy-paper)}
.segmented .option{flex:1 1 auto;justify-content:center}
.option input{position:absolute;opacity:0;pointer-events:none}
.option:has(input:checked){box-shadow:inset 0 0 0 1.5px var(--anatomy-strong)}
.option:has(input:focus-visible){outline:2px solid var(--anatomy-mid);outline-offset:2px}
.option:has(input:disabled){opacity:.38;cursor:not-allowed}
.toggle span::before{content:"";display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:-1px;border-radius:3px;box-shadow:inset 0 0 0 1px var(--anatomy-mid)}
.toggle:has(input:checked) span::before{background:var(--anatomy-strong);box-shadow:inset 0 0 0 1px var(--anatomy-strong),inset 0 0 0 3px var(--anatomy-paper)}
.chip{width:16px;height:16px;flex:none;border-radius:50%;background:var(--chip);box-shadow:inset 0 0 0 1px #0000001f}
.sub{display:grid;gap:6px}
.sub[data-off]{display:none}
.dots{display:flex;flex-wrap:wrap;gap:8px}
.dot{position:relative;cursor:pointer}
.dot input{position:absolute;opacity:0}
.dot span{display:block;width:28px;height:28px;border-radius:50%;background:var(--chip);box-shadow:inset 0 0 0 1px #0000002a}
.dot input:checked+span{box-shadow:inset 0 0 0 1px #0000002a,0 0 0 2px var(--anatomy-card),0 0 0 3.5px var(--anatomy-strong)}
.dot input:focus-visible+span{outline:2px solid var(--anatomy-mid);outline-offset:4px}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.row .label{margin:0}
.stepper{display:flex;align-items:center;gap:2px;box-shadow:inset 0 0 0 1px var(--anatomy-faint);border-radius:999px;padding:2px}
.stepper button{width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:var(--anatomy-strong);font-size:17px;cursor:pointer}
.stepper button:hover{background:var(--anatomy-shade-2)}
.stepper output{min-width:24px;text-align:center;font:600 14px var(--anatomy-mono);color:var(--anatomy-strong)}
.text{width:100%;font:15px/1.3 "Segoe Script","Brush Script MT",cursive;padding:9px 11px;border:0;border-radius:6px;box-shadow:inset 0 0 0 1px var(--anatomy-lo);background:var(--anatomy-paper);color:var(--anatomy-strong)}
.text:focus{outline:2px solid var(--anatomy-mid)}
.summary{padding:18px 16px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid)}
.summary h2,.order h2{margin:0 0 4px;font-size:16px;color:var(--anatomy-strong)}
.facts{margin:0 0 10px;font-family:var(--anatomy-mono);font-size:12px}
.lines{list-style:none;margin:0;padding:0;display:grid;gap:4px;font-size:13px}
.lines li{display:grid;grid-template-columns:1fr auto 92px;gap:10px;padding:4px 0;border-bottom:1px dashed var(--anatomy-faint)}
.lines em{font-style:normal;color:var(--anatomy-muted)}
.grams{color:var(--anatomy-muted);font-variant-numeric:tabular-nums}
.price{text-align:right;font-variant-numeric:tabular-nums;color:var(--anatomy-strong)}
.total{display:flex;justify-content:space-between;align-items:baseline;margin:12px 0}
.total strong{font-size:24px;color:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.actions button{font:600 13px/1 ui-sans-serif,system-ui,sans-serif;padding:12px 16px;border-radius:999px;border:1px solid var(--anatomy-lo);background:transparent;color:var(--anatomy-strong);cursor:pointer}
.actions .primary{background:var(--anatomy-strong);border-color:var(--anatomy-strong);color:var(--anatomy-card)}
.note{margin:10px 0 0;font-size:12px;color:var(--anatomy-muted)}
.order{border:0;padding:20px;max-width:min(560px,calc(100vw - 32px));background:var(--anatomy-card);color:var(--anatomy-text);box-shadow:0 0 0 1px var(--anatomy-mid),0 20px 60px #0003}
.order::backdrop{background:#0006}
.order pre{white-space:pre-wrap;font:12.5px/1.6 var(--anatomy-mono);margin:10px 0 16px;color:var(--anatomy-strong)}
.cake-fx{position:absolute;inset:0;display:block;width:100%;height:100%;overflow:visible;pointer-events:none;will-change:transform}
.cake-svg .iso-halo{filter:none;transform:none;fill:url(#halo-fade)}
.cake-svg .bit{vector-effect:none;fill:none;stroke-linecap:round}
.cake-svg .chispa{stroke-width:calc(var(--mm) * 1.25)}
.cake-svg .viruta{stroke:#3a2014;stroke-width:calc(var(--mm) * 2.1)}
.cake-svg .viruta-light{stroke:#6a4026;stroke-width:calc(var(--mm) * 1.8)}
.plaque-text{font-family:"Segoe Script","Brush Script MT","Snell Roundhand",cursive;fill:#fbf2e2}
.plaque-text.on-white{fill:#4a2a1a}
.flame-glow{fill:url(#glow)}
.flame-outer{fill:#ffb648;stroke:#f08a2c;stroke-width:.4}
.flame-core{fill:#fff6cf}
.flame{transform-box:fill-box;transform-origin:50% 100%;animation:flicker 1.3s ease-in-out infinite;animation-delay:var(--d,0ms)}
@keyframes flicker{0%,100%{transform:scale(1,1)}35%{transform:scale(.9,1.08)}65%{transform:scale(1.06,.95)}}
@media (prefers-reduced-motion:reduce){.flame{animation:none}}
@media (max-width:900px){
  .app{grid-template-columns:1fr;padding:12px 16px 48px;gap:18px}
  .stage-col{position:sticky;top:0;z-index:2;background:var(--anatomy-page);padding-top:8px}
  .cake-svg{max-height:30vh}
  .iso-plate{padding:30px 10px 26px}
  .iso-plate-corners{inset:12px 14px}
  .iso-legend{display:none}
  .stage-tools{margin-top:2px}
  .tool{padding:7px 11px}
}
@media (max-width:560px){.iso-plate-corner[data-corner="hint"]{display:none}.lines li{grid-template-columns:1fr 84px}.grams{display:none}}
`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Taller de tortas</title><meta name="description" content="Prototipo de configurador de tortas: arma tu torta eligiendo tamaño, capas, relleno, cobertura y decoración, y mírala en un giratorio interactivo."><style>${css}</style></head><body class="iso" data-theme="light"><main class="app"><div class="stage-col">${plate}</div>${panel}</main>${dialog}<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script></body></html>`;

writeFileSync(join(HERE, "index.html"), html);
console.log(`wrote index.html (${Math.round(html.length / 1024)} KB)`);

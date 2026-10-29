// The cake as numbers. Everything the figure draws and the readout says comes from here.
// Lengths in mm, densities in g/cm³, prices are example values for the prototype.

export const SPONGE_H = 30;
export const FILL_H = 10;
export const SERVING_CM2 = 16;
export const DIAMETERS = [16, 20, 24, 28];

export const SPONGES = [
  { id: "vainilla", label: "Vainilla", color: "#efcf8f", density: 0.42, perKg: 0 },
  { id: "chocolate", label: "Chocolate", color: "#5c3a28", density: 0.48, perKg: 1500 },
  { id: "redvelvet", label: "Red velvet", color: "#a3283a", density: 0.47, perKg: 2500 },
  { id: "zanahoria", label: "Zanahoria y nuez", color: "#c48443", density: 0.58, perKg: 2000 },
  { id: "limon", label: "Limón", color: "#f0d978", density: 0.44, perKg: 1000 },
];

export const FILLINGS = [
  { id: "dulce", label: "Dulce de leche", color: "#a8662a", density: 1.3, perKg: 3000 },
  { id: "chantilly", label: "Crema chantilly", color: "#f6eedc", density: 0.4, perKg: 2500 },
  { id: "frutilla", label: "Crema de frutilla", color: "#ec98a3", density: 0.55, perKg: 3500, bits: "#c4243a" },
  { id: "ganache", label: "Ganache de chocolate", color: "#3d2215", density: 1.2, perKg: 4000 },
  { id: "limon", label: "Crema de limón", color: "#f2cf52", density: 1.15, perKg: 3000 },
  { id: "avellana", label: "Crema de avellanas", color: "#7a4a2e", density: 1.1, perKg: 4500 },
];

export const COATINGS = [
  { id: "buttercream", label: "Buttercream", t: 4, density: 0.95, perKg: 6000, colorable: true, bevel: 2.4 },
  { id: "fondant", label: "Fondant", t: 5, density: 1.55, perKg: 9000, colorable: true, bevel: 0.6 },
  { id: "ganache", label: "Ganache", t: 4, density: 1.2, perKg: 7000, colorable: false, bevel: 1.4, color: "#3a2114" },
  { id: "naked", label: "Naked", t: 0, density: 0, perKg: 0, colorable: false, bevel: 0 },
];

export const COLORS = [
  { id: "blanco", label: "Blanco", color: "#faf5ec" },
  { id: "rosa", label: "Rosa", color: "#f3c3cd" },
  { id: "celeste", label: "Celeste", color: "#bcdaef" },
  { id: "lavanda", label: "Lavanda", color: "#d8c7ee" },
  { id: "menta", label: "Menta", color: "#c3e8d4" },
  { id: "vainilla", label: "Amarillo", color: "#f6e1a0" },
];

export const DRIPS = [
  { id: "chocolate", label: "Chocolate", color: "#3b2013" },
  { id: "dulce", label: "Dulce de leche", color: "#9a5a22" },
  { id: "blanco", label: "Chocolate blanco", color: "#f7efdc" },
  { id: "rosa", label: "Rosa", color: "#e889a0" },
];

export const RIBBONS = [
  { id: "rosa", label: "Rosa", color: "#e48aa1" },
  { id: "dorado", label: "Dorado", color: "#c9a14a" },
  { id: "celeste", label: "Celeste", color: "#7fb3d8" },
  { id: "rojo", label: "Rojo", color: "#c22f3c" },
];

// Unit counts come from the layout (figure.mjs), so the price counts what is drawn.
export const TOPPINGS = [
  { id: "frutillas", label: "Frutillas", grams: 12, price: 350 },
  { id: "arandanos", label: "Arándanos", grams: 2, price: 120 },
  { id: "cerezas", label: "Cerezas", grams: 8, price: 300 },
  { id: "macarons", label: "Macarons", grams: 14, price: 900 },
  { id: "chispas", label: "Chispas de colores", grams: 0.05, price: 4 },
  { id: "virutas", label: "Virutas de chocolate", grams: 0.08, price: 3 },
];

export const DECOR = [
  { id: "velas", label: "Velas", price: 250 },
  { id: "placa", label: "Placa con mensaje", grams: 18, price: 1800 },
  { id: "perlas", label: "Borde de perlas", grams: 0.3, price: 25 },
  { id: "rosetas", label: "Rosetas de crema", grams: 6, price: 120 },
  { id: "chorreado", label: "Chorreado", price: 0 },
  { id: "cinta", label: "Cinta", price: 900 },
];

export const BASE_PER_KG = 16000;
export const DRIP_DENSITY = 1.2;
export const DRIP_PER_KG = 8000;

export const byId = (list, id) => list.find((item) => item.id === id) ?? list[0];

export function defaults() {
  return {
    diameter: 20,
    layers: 2,
    sponge: "vainilla",
    filling: "dulce",
    coating: "buttercream",
    color: "rosa",
    toppings: ["frutillas", "arandanos"],
    candles: 3,
    plaque: true,
    message: "Feliz cumple",
    pearls: true,
    rosettes: false,
    drip: false,
    dripColor: "chocolate",
    ribbon: false,
    ribbonColor: "dorado",
  };
}

export function normalize(input) {
  const state = { ...defaults(), ...input };
  if (!DIAMETERS.includes(state.diameter)) state.diameter = 20;
  state.layers = state.layers === 3 ? 3 : 2;
  state.candles = Math.max(0, Math.min(9, Math.round(state.candles) || 0));
  state.message = String(state.message ?? "").slice(0, 18);
  state.toppings = TOPPINGS.map((item) => item.id).filter((id) => state.toppings.includes(id));
  for (const [key, list] of [["sponge", SPONGES], ["filling", FILLINGS], ["coating", COATINGS], ["color", COLORS], ["dripColor", DRIPS], ["ribbonColor", RIBBONS]]) state[key] = byId(list, state[key]).id;
  return state;
}

// The cake: its radius (cake and coating) and its stack of layers. z is measured from the cake board.
export function cakeOf(state) {
  const coating = byId(COATINGS, state.coating);
  const R = (state.diameter * 10) / 2;
  const layers = [];
  let at = 0;
  for (let layer = 0; layer < state.layers; layer++) {
    layers.push({ kind: "sponge", z0: at, z1: at + SPONGE_H, index: layer });
    at += SPONGE_H;
    if (layer < state.layers - 1) {
      layers.push({ kind: "fill", z0: at, z1: at + FILL_H, index: layer });
      at += FILL_H;
    }
  }
  return { index: 0, R, Rf: R + coating.t, t: coating.t, z0: 0, body: at, top: at + coating.t, layers };
}

const cm3 = (R, h) => (Math.PI * R * R * h) / 1000;

// Totals for a cake whose decorations have already been laid out (counts per item id).
export function summaryOf(state, counts = {}) {
  const sponge = byId(SPONGES, state.sponge);
  const filling = byId(FILLINGS, state.filling);
  const coating = byId(COATINGS, state.coating);
  const cake = cakeOf(state);
  let spongeG = 0, fillG = 0, coatG = 0, dripG = 0;
  for (const layer of cake.layers) {
    if (layer.kind === "sponge") spongeG += cm3(cake.R, layer.z1 - layer.z0) * sponge.density;
    if (layer.kind === "fill") fillG += cm3(cake.R, layer.z1 - layer.z0) * filling.density;
  }
  if (coating.t) coatG = (cm3(cake.Rf, cake.top) - cm3(cake.R, cake.body)) * coating.density;
  const servings = Math.floor((Math.PI * (cake.R / 10) ** 2) / SERVING_CM2);
  if (state.drip) dripG = (cm3(cake.Rf, 2.5) + (2 * Math.PI * cake.Rf * 16 * 2) / 1000) * DRIP_DENSITY;
  const lines = [];
  const kg = (grams) => grams / 1000;
  lines.push({ label: `Bizcocho de ${sponge.label.toLowerCase()}`, grams: spongeG, price: kg(spongeG) * (BASE_PER_KG + sponge.perKg) });
  lines.push({ label: filling.label, grams: fillG, price: kg(fillG) * (BASE_PER_KG + filling.perKg) });
  if (coating.t) lines.push({ label: `Cobertura de ${coating.label.toLowerCase()}`, grams: coatG, price: kg(coatG) * (BASE_PER_KG + coating.perKg) });
  if (dripG) lines.push({ label: `Chorreado de ${byId(DRIPS, state.dripColor).label.toLowerCase()}`, grams: dripG, price: kg(dripG) * DRIP_PER_KG });
  for (const item of [...TOPPINGS, ...DECOR]) {
    const count = counts[item.id] ?? 0;
    if (!count || item.id === "chorreado") continue;
    const unit = item.id === "cinta" ? 1 : count;
    lines.push({ label: item.label, count, grams: (item.grams ?? 0) * count, price: item.price * unit });
  }
  const grams = lines.reduce((sum, line) => sum + line.grams, 0);
  const price = Math.round(lines.reduce((sum, line) => sum + line.price, 0) / 100) * 100;
  return { cake, servings, grams, price, lines };
}

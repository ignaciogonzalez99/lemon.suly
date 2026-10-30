// LemonSuly · el lemon pie dibujado como ilustración plana en SVG, con el estilo del logo:
// contorno marrón, colores lisos y una vista de tres cuartos. Expone window.Pie.
(function (global) {
  "use strict";

  const INK = "#734A2E";
  const K = 0.42; // achatamiento de la vista: alto / ancho de cada elipse
  const R = 190; // radio exterior de la masa a escala 1
  const H = 48; // alto de la pared de masa
  const RI = R - 15; // radio interior, donde empieza el relleno
  const YF = -H + 2; // centro de la elipse del relleno (y crece hacia abajo)
  const DOME = 50; // alto de la loma de merengue de los picos
  const VIEW = "-250 -262 500 460";

  // Los individuales se piden por cantidad: cada uno es una porción y van varios sobre la fuente.
  const SIZES = [
    { id: 8, name: "Individual", label: "8 cm", note: "1 porción", servings: 1, price: 3200, scale: 0.5, multi: true },
    { id: 12, name: "Mini", label: "12 cm", note: "2 porciones", servings: 2, price: 8500, scale: 0.62 },
    { id: 15, name: "Pequeño", label: "15 cm", note: "4 porciones", servings: 4, price: 14000, scale: 0.7 },
    { id: 18, name: "Mediano", label: "18 cm", note: "8 porciones", servings: 8, price: 21000, scale: 0.8 },
    { id: 22, name: "Grande", label: "22 cm", note: "12 porciones", servings: 12, price: 29000, scale: 0.9 },
    { id: 26, name: "Fiesta", label: "26 cm", note: "16 porciones", servings: 16, price: 38000, scale: 1 },
  ];
  const MAX_QTY = 6;
  const CRUSTS = [
    { id: "sablee", label: "Sablée de manteca", note: "Crocante y dorada", side: "#E7B463", top: "#F4CF86", shade: "#C98F45", price: 0 },
    { id: "galleta", label: "Galletita y manteca", note: "Rústica, bien tostada", side: "#B9783F", top: "#CB8E55", shade: "#93592C", price: 0, crumbs: "#8A5228" },
    { id: "almendra", label: "Sablée de almendras", note: "Con almendras tostadas", side: "#DDA75E", top: "#EBC07C", shade: "#B9803C", price: 2500, crumbs: "#FFF1D6" },
  ];
  const FILLINGS = [
    { id: "limon", label: "Limón clásico", note: "El de siempre", color: "#F8CF3C", light: "#FDE68A", price: 0 },
    { id: "lima", label: "Lima-limón", note: "Más fresco y verde", color: "#D8D555", light: "#EDED9C", price: 1500 },
    { id: "maracuya", label: "Limón y maracuyá", note: "Toque tropical", color: "#F6B23B", light: "#FCD687", price: 3000, seeds: true },
  ];
  const ACIDITY = [
    { id: 1, label: "Suave" },
    { id: 2, label: "Equilibrado" },
    { id: 3, label: "Bien cítrico" },
  ];
  const MERINGUES = [
    { id: "picos", label: "Picos rústicos", note: "Alto y despeinado", price: 0, cm: 4 },
    { id: "gotas", label: "Gotas", note: "Con manga, una por una", price: 2000, cm: 2.5 },
    { id: "corona", label: "Corona", note: "Gotas en el borde", price: 1500, cm: 2.5 },
    { id: "sin", label: "Sin merengue", note: "Solo la crema", price: 0, cm: 0 },
  ];
  const TOPPINGS = [
    { id: "rodajas", label: "Rodajas de limón", price: 1800 },
    { id: "ralladura", label: "Ralladura de lima", price: 600 },
    { id: "menta", label: "Hojas de menta", price: 600 },
    { id: "frutos", label: "Frutos rojos", price: 3200 },
    { id: "flores", label: "Flores comestibles", price: 2400 },
  ];
  const FLAG_PRICE = 900;
  const MESSAGE_MAX = 16;

  const byId = (list, id) => list.find((item) => String(item.id) === String(id)) ?? list[0];
  const n = (value) => Math.round(value * 10) / 10;
  const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function defaults() {
    return { size: 22, qty: 1, crust: "sablee", filling: "limon", acidity: 2, meringue: "picos", toast: 55, toppings: ["rodajas"], flag: true, message: "¡Feliz día!" };
  }

  // Lleva cualquier estado (de la URL, de un preset) a valores del catálogo.
  function normalize(input) {
    const base = defaults();
    const s = { ...base, ...input };
    s.size = byId(SIZES, s.size).id;
    s.qty = Math.max(1, Math.min(MAX_QTY, Math.round(Number(s.qty) || 1)));
    s.crust = byId(CRUSTS, s.crust).id;
    s.filling = byId(FILLINGS, s.filling).id;
    s.acidity = byId(ACIDITY, s.acidity).id;
    s.meringue = byId(MERINGUES, s.meringue).id;
    s.toast = Math.max(0, Math.min(100, Math.round(Number(s.toast) || 0)));
    s.toppings = TOPPINGS.map((t) => t.id).filter((id) => (s.toppings ?? []).includes(id));
    s.flag = Boolean(s.flag);
    s.message = String(s.message ?? "").slice(0, MESSAGE_MAX);
    return s;
  }

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mix(a, b, t) {
    const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
    const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
    return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  // Un punto del relleno en coordenadas polares (r de 0 a 1), sin contar la altura del merengue.
  const at = (r, a) => [r * RI * Math.cos(a), YF + r * RI * K * Math.sin(a)];
  const domeAt = (r) => DOME * Math.max(0, 1 - (r / 0.97) ** 2) ** 0.85;

  // Altura de la superficie sobre el relleno: ahí se apoyan los toppings y el banderín.
  function surface(meringue, r) {
    if (meringue === "picos") return domeAt(r) + 30;
    if (meringue === "gotas") return 26;
    if (meringue === "corona") return r > 0.55 ? 26 : 0;
    return 0;
  }

  // Contorno acanalado de la tartera: el radio sube entre canal y canal.
  function fluted(cy, rx, from, to, steps) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = from + ((to - from) * i) / steps;
      const f = 1 + 0.014 * Math.abs(Math.sin((38 * t) / 2));
      points.push(`${n(rx * f * Math.cos(t))} ${n(cy + rx * K * f * Math.sin(t))}`);
    }
    return points;
  }

  function toastColors(toast) {
    const t = toast / 100;
    return { tip: mix("FFF7E6", "A9622A", t * 0.95), mid: mix("FFF7E6", "E0A35C", t * 0.75), base: "#FFFBF2" };
  }

  function defs(state, id) {
    const c = toastColors(state.toast);
    const filling = byId(FILLINGS, state.filling);
    return (
      `<linearGradient id="${id}-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.tip}"/><stop offset=".38" stop-color="${c.mid}"/><stop offset=".82" stop-color="${c.base}"/></linearGradient>` +
      `<linearGradient id="${id}-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.mid}"/><stop offset=".55" stop-color="${c.base}"/></linearGradient>` +
      `<radialGradient id="${id}-f" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="${filling.light}"/><stop offset=".55" stop-color="${filling.color}"/></radialGradient>`
    );
  }

  // ---------- piezas ----------

  function stand() {
    const PR = R + 40;
    const PK = PR * K;
    const FR = 92;
    return (
      `<ellipse cx="0" cy="182" rx="150" ry="20" fill="${INK}" opacity=".1"/>` +
      `<path d="M-${FR} 168 A${FR} ${n(FR * K)} 0 0 0 ${FR} 168 L${FR} 158 L-${FR} 158 Z" fill="#3E8E96" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<ellipse cx="0" cy="158" rx="${FR}" ry="${n(FR * K)}" fill="#4EAFB8" stroke="${INK}" stroke-width="2.4"/>` +
      `<path d="M-20 60 L-34 152 Q0 166 34 152 L20 60 Z" fill="#4EAFB8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M-12 70 L-20 146" stroke="#8FD0D5" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M-${PR} 0 A${PR} ${n(PK)} 0 0 0 ${PR} 0 L${PR} 11 A${PR} ${n(PK)} 0 0 1 -${PR} 11 Z" fill="#F1E4CC" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<ellipse cx="0" cy="0" rx="${PR}" ry="${n(PK)}" fill="#FFFCF5" stroke="${INK}" stroke-width="2.4"/>` +
      `<ellipse cx="0" cy="2" rx="${PR - 20}" ry="${n((PR - 20) * K)}" fill="none" stroke="${INK}" stroke-opacity=".14" stroke-width="2"/>`
    );
  }

  function crust(state, sw) {
    const c = byId(CRUSTS, state.crust);
    const bottom = fluted(0, R, 0, Math.PI, 90);
    const top = fluted(-H, R, Math.PI, 0, 90);
    let out = `<ellipse cx="0" cy="6" rx="${R + 10}" ry="${n((R + 10) * K)}" fill="${INK}" opacity=".13"/>`;
    out += `<path d="M${bottom.join(" L")} L${top.join(" L")} Z" fill="${c.side}" stroke="${INK}" stroke-width="${sw(2.4)}" stroke-linejoin="round"/>`;
    for (let k = 1; k < 19; k++) {
      const t = (2 * Math.PI * k) / 38;
      const x = n(R * Math.cos(t));
      const y = n(R * K * Math.sin(t));
      out += `<path d="M${x} ${y} L${x} ${n(y - H)}" stroke="${INK}" stroke-opacity=".26" stroke-width="${sw(1.6)}"/>`;
    }
    out += `<path d="M${n(-R * 0.94)} -10 Q0 94 ${n(R * 0.94)} -10" fill="none" stroke="#FFFFFF" stroke-opacity=".22" stroke-width="${sw(5)}" stroke-linecap="round"/>`;
    out += `<path d="M${fluted(-H, R, 0, 2 * Math.PI, 180).join(" L")} Z" fill="${c.top}" stroke="${INK}" stroke-width="${sw(2.4)}" stroke-linejoin="round"/>`;
    out += `<ellipse cx="0" cy="${-H}" rx="${RI}" ry="${n(RI * K)}" fill="${c.shade}" stroke="${INK}" stroke-width="${sw(1.6)}"/>`;
    if (c.crumbs) {
      const rand = rng(41);
      for (let i = 0; i < 34; i++) {
        const a = rand() * Math.PI * 2;
        const r = RI + 3 + rand() * (R - RI - 5);
        const x = n(r * Math.cos(a));
        const y = n(-H + r * K * Math.sin(a));
        out +=
          c.id === "almendra"
            ? `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="1.5" transform="rotate(${Math.round(rand() * 180)} ${x} ${y})" fill="${c.crumbs}" stroke="${INK}" stroke-opacity=".5" stroke-width="${sw(0.8)}"/>`
            : `<circle cx="${x}" cy="${y}" r="${n(1.2 + rand() * 1.4)}" fill="${c.crumbs}"/>`;
      }
    }
    return out;
  }

  function filling(state, id, sw) {
    const f = byId(FILLINGS, state.filling);
    let out = `<ellipse cx="0" cy="${YF}" rx="${RI}" ry="${n(RI * K - 2)}" fill="url(#${id}-f)" stroke="${INK}" stroke-width="${sw(1.6)}"/>`;
    out += `<ellipse cx="${n(-RI * 0.32)}" cy="${n(YF - RI * K * 0.38)}" rx="${n(RI * 0.3)}" ry="${n(RI * K * 0.14)}" fill="#FFFFFF" opacity=".28"/>`;
    if (f.seeds) {
      const rand = rng(77);
      for (let i = 0; i < 22; i++) {
        const [x, y] = at(Math.sqrt(rand()) * 0.9, rand() * Math.PI * 2);
        out += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="2.6" ry="1.8" fill="#3B2616"/><ellipse cx="${n(x)}" cy="${n(y)}" rx="4.6" ry="3.2" fill="none" stroke="#FFF0C2" stroke-opacity=".7" stroke-width="${sw(1)}"/>`;
      }
    }
    return out;
  }

  function peak(x, y, b, h, lean, curl, id, sw) {
    const tx = x + lean;
    const ty = y - h;
    const c = curl * 7;
    return (
      `<path d="M${n(x - b)} ${n(y)} C${n(x - b)} ${n(y - h * 0.45)} ${n(tx - b * 0.35)} ${n(ty + h * 0.32)} ${n(tx)} ${n(ty)} Q${n(tx + c * 0.7)} ${n(ty - 4)} ${n(tx + c)} ${n(ty + 3)} C${n(tx + b * 0.3)} ${n(ty + h * 0.35)} ${n(x + b)} ${n(y - h * 0.45)} ${n(x + b)} ${n(y)} A${n(b)} ${n(b * K)} 0 0 1 ${n(x - b)} ${n(y)} Z" fill="url(#${id}-m)" stroke="${INK}" stroke-width="${sw(2)}" stroke-linejoin="round"/>` +
      `<path d="M${n(x - b * 0.55)} ${n(y - h * 0.12)} Q${n(x + lean * 0.2)} ${n(y - h * 0.5)} ${n(tx + b * 0.12)} ${n(ty + h * 0.3)}" fill="none" stroke="${INK}" stroke-opacity=".32" stroke-width="${sw(1.4)}" stroke-linecap="round"/>`
    );
  }

  function kiss(x, y, b, h, id, sw) {
    const tx = x + 2;
    const ty = y - h;
    return (
      `<path d="M${n(x - b)} ${n(y)} C${n(x - b)} ${n(y - h * 0.55)} ${n(x - b * 0.2)} ${n(y - h * 0.6)} ${n(tx)} ${n(ty)} C${n(x + b * 0.2)} ${n(y - h * 0.6)} ${n(x + b)} ${n(y - h * 0.55)} ${n(x + b)} ${n(y)} A${n(b)} ${n(b * K)} 0 0 1 ${n(x - b)} ${n(y)} Z" fill="url(#${id}-m)" stroke="${INK}" stroke-width="${sw(1.8)}" stroke-linejoin="round"/>` +
      `<path d="M${n(x - b * 0.5)} ${n(y + 2)} Q${n(x - b * 0.45)} ${n(y - h * 0.45)} ${n(x - b * 0.06)} ${n(y - h * 0.84)} M${n(x + b * 0.5)} ${n(y + 2)} Q${n(x + b * 0.45)} ${n(y - h * 0.45)} ${n(x + b * 0.12)} ${n(y - h * 0.84)}" fill="none" stroke="${INK}" stroke-opacity=".3" stroke-width="${sw(1.2)}" stroke-linecap="round"/>`
    );
  }

  // Los merengues son piezas sueltas: cada una sabe su profundidad para dibujarse en orden con los toppings.
  function meringue(state, id, sw) {
    const items = [];
    let under = "";
    if (state.meringue === "picos") {
      const rand = rng(7);
      const rd = RI * 0.95;
      under = `<path d="M${n(-rd)} ${YF} A${n(rd)} ${n(rd * K)} 0 0 0 ${n(rd)} ${YF} C${n(rd)} ${n(YF - DOME * 0.75)} ${n(rd * 0.55)} ${YF - DOME} 0 ${YF - DOME} C${n(-rd * 0.55)} ${YF - DOME} ${n(-rd)} ${n(YF - DOME * 0.75)} ${n(-rd)} ${YF} Z" fill="url(#${id}-d)" stroke="${INK}" stroke-width="${sw(2)}"/>`;
      for (const [r0, count] of [[0, 1], [0.27, 6], [0.5, 10], [0.72, 14], [0.9, 19]]) {
        const offset = rand() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
          const a = offset + (Math.PI * 2 * i) / count + (rand() - 0.5) * 0.25;
          const r = Math.max(0, r0 + (rand() - 0.5) * 0.06);
          const [x, y] = at(r, a);
          const lean = (rand() - 0.5) * 14;
          const svg = peak(x, y - domeAt(r) + 2, 19 + rand() * 7, 30 + rand() * 16, lean, lean < 0 ? -1 : 1, id, sw);
          items.push({ depth: r * Math.sin(a), svg, kind: "m" });
        }
      }
    } else if (state.meringue === "gotas" || state.meringue === "corona") {
      const rand = rng(11);
      const rings = [[0, 1], [0.22, 7], [0.43, 13], [0.64, 19], [0.85, 25]].filter(([r]) => state.meringue === "gotas" || r > 0.6);
      for (const [r, count] of rings) {
        const offset = rand() * Math.PI;
        for (let i = 0; i < count; i++) {
          const a = offset + (Math.PI * 2 * i) / count;
          const [x, y] = at(r, a);
          items.push({ depth: r * Math.sin(a), svg: kiss(x, y + 2, 16 + rand() * 2.5, 27 + rand() * 6, id, sw), kind: "m" });
        }
      }
    }
    return { under, items };
  }

  // ---------- toppings ----------

  function lemonSlice(sw) {
    let out = `<ellipse rx="21" ry="15" fill="#F5C531" stroke="${INK}" stroke-width="${sw(1.8)}"/><ellipse rx="17.6" ry="12.2" fill="#FFF4C2"/><ellipse rx="15.6" ry="10.6" fill="#FAD84E"/>`;
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      out += `<path d="M0 0 L${n(15.6 * Math.cos(a))} ${n(10.6 * Math.sin(a))}" stroke="#FFF4C2" stroke-width="1.7"/>`;
    }
    return out + `<ellipse rx="2.4" ry="1.7" fill="#FFF4C2"/>`;
  }
  const zest = (sw, color) => `<path d="M-6 0 q3 -4.5 6 0 t6 0" fill="none" stroke="${color}" stroke-width="${sw(2.6)}" stroke-linecap="round"/>`;
  const leaf = (sw) => `<path d="M0 0 C5 -9 15 -10 22 -2 C15 5 6 6 0 0 Z" fill="#7DA447" stroke="${INK}" stroke-width="${sw(1.5)}" stroke-linejoin="round"/><path d="M3 -1 Q11 -4 19 -2" fill="none" stroke="#B9D77E" stroke-width="1.3" stroke-linecap="round"/>`;
  const mint = (sw) => `<g transform="rotate(-150)">${leaf(sw)}</g><g transform="rotate(-30)">${leaf(sw)}</g><g transform="rotate(-90) scale(.8)">${leaf(sw)}</g>`;
  const raspberry = (sw) => `<circle r="8.5" fill="#E04A64" stroke="${INK}" stroke-width="${sw(1.6)}"/><circle cx="-3" cy="-2.5" r="2.1" fill="#F27D92"/><circle cx="2.6" cy="-3.4" r="2" fill="#F27D92"/><circle cx="3.6" cy="2" r="2" fill="#F27D92"/><circle cx="-2" cy="3" r="2" fill="#F27D92"/><circle cx="0" cy="-.2" r="1.8" fill="#F27D92"/>`;
  const blueberry = (sw) => `<circle r="6.6" fill="#4A5C9C" stroke="${INK}" stroke-width="${sw(1.5)}"/><circle cy="-2.4" r="1.9" fill="#2C3866"/><circle cx="-2.6" cy="1.2" r="1.4" fill="#FFFFFF" opacity=".55"/>`;
  function flower(sw, petal) {
    let out = "";
    for (let i = 0; i < 5; i++) out += `<ellipse cy="-7.5" rx="5.4" ry="8.4" transform="rotate(${i * 72})" fill="${petal}" stroke="${INK}" stroke-width="${sw(1.3)}"/>`;
    return out + `<circle r="4" fill="#FCD21B" stroke="${INK}" stroke-width="${sw(1.3)}"/>`;
  }

  // Cada topping tiene sus puntos fijos (r, ángulo), así no saltan de lugar cuando cambia otra opción.
  function toppingItems(state, sw) {
    const items = [];
    const place = (r, a, draw, { rot = 0, scale = 1, lift = 0 } = {}) => {
      const [x, y] = at(r, a);
      const z = y - surface(state.meringue, r) - lift;
      items.push({ depth: r * Math.sin(a) + 0.02, svg: `<g transform="translate(${n(x)} ${n(z)}) rotate(${Math.round(rot)}) scale(${scale})">${draw}</g>`, kind: "t" });
    };
    for (const id of state.toppings) {
      const start = items.length;
      if (id === "rodajas") {
        for (let i = 0; i < 5; i++) place(0.6, 0.3 + (Math.PI * 2 * i) / 5, lemonSlice(sw), { rot: (i % 2 ? -1 : 1) * 22, lift: 8 });
      } else if (id === "ralladura") {
        const rand = rng(23);
        for (let i = 0; i < 34; i++) place(Math.sqrt((i + 0.5) / 34) * 0.92, i * 2.39996 + 0.3, zest(sw, i % 3 ? "#7DA447" : "#B5CF55"), { rot: rand() * 180, lift: 2 });
      } else if (id === "menta") {
        for (let i = 0; i < 3; i++) place(0.36, 1.1 + (Math.PI * 2 * i) / 3, mint(sw), { lift: 6 });
      } else if (id === "frutos") {
        for (let i = 0; i < 7; i++) place(0.8, 0.15 + (Math.PI * 2 * i) / 7, raspberry(sw), { lift: 6 });
        for (let i = 0; i < 6; i++) place(0.46, 0.75 + (Math.PI * 2 * i) / 6, blueberry(sw), { lift: 5 });
        place(0.12, 2.4, raspberry(sw), { lift: 6 });
      } else if (id === "flores") {
        for (let i = 0; i < 5; i++) place(0.7, 0.3 + Math.PI / 5 + (Math.PI * 2 * i) / 5, flower(sw, i % 2 ? "#FFFFFF" : "#F67452"), { rot: i * 17, scale: 0.95, lift: 6 });
      }
      for (let i = start; i < items.length; i++) Object.assign(items[i], { topping: id, order: i - start });
    }
    return items;
  }

  // En los pies chicos el banderín se agranda un poco, para que el mensaje se siga leyendo.
  function flag(state, sw, scale) {
    const r = 0.26;
    const a = -2.25;
    const [x, y] = at(r, a);
    const base = y - surface(state.meringue, r) + 6;
    const text = state.message.trim() || " ";
    const w = Math.max(70, Math.round(text.length * 10.5 + 30));
    const top = base - 112;
    const grow = Math.max(1, 0.62 / scale);
    const fit = grow > 1 ? ` transform="translate(${n(x)} ${n(base)}) scale(${n(grow * 100) / 100}) translate(${n(-x)} ${n(-base)})"` : "";
    return (
      `<g class="pie-flag"${fit}>` +
      `<path d="M${n(x)} ${n(base)} L${n(x)} ${n(top - 4)}" stroke="${INK}" stroke-width="${sw(5.4)}" stroke-linecap="round"/>` +
      `<path d="M${n(x)} ${n(base)} L${n(x)} ${n(top - 4)}" stroke="#E2BF6E" stroke-width="${sw(2.6)}" stroke-linecap="round"/>` +
      `<g transform="translate(${n(x + 1)} ${n(top)})"><g class="pie-flag-cloth"><path d="M0 0 C${n(w * 0.35)} -6 ${n(w * 0.65)} 6 ${w} 0 L${w - 12} 17 L${w} 34 C${n(w * 0.65)} 40 ${n(w * 0.35)} 28 0 34 Z" fill="#4EAFB8" stroke="${INK}" stroke-width="${sw(2)}" stroke-linejoin="round"/>` +
      `<text x="${n((w - 12) / 2)}" y="24" text-anchor="middle" class="pie-flag-text">${esc(text)}</text></g></g>` +
      `<circle cx="${n(x)}" cy="${n(top - 6)}" r="4.5" fill="#E2BF6E" stroke="${INK}" stroke-width="${sw(1.6)}"/>` +
      `</g>`
    );
  }

  // ---------- armado ----------

  const countOf = (state) => (byId(SIZES, state.size).multi ? state.qty : 1);

  // Dónde va cada pie sobre la fuente: uno al centro, o los individuales en una o dos filas.
  function arrange(state) {
    const count = countOf(state);
    if (count === 1) return { scale: byId(SIZES, state.size).scale, spots: [[0, 0]] };
    const rows = count <= 2 ? [count] : count <= 4 ? [2, count - 2] : [3, count - 3];
    const scale = count <= 2 ? 0.44 : count <= 4 ? 0.4 : 0.33;
    const dx = 2 * R * scale * 1.06;
    const dy = 2 * R * scale * K * 1.15;
    const spots = [];
    rows.forEach((inRow, j) => {
      const y = (j - (rows.length - 1) / 2) * dy;
      for (let i = 0; i < inRow; i++) spots.push([(i - (inRow - 1) / 2) * dx, y]);
    });
    return { scale, spots };
  }

  // freshFrom: desde qué pie se anima la caída (los que se suman al subir la cantidad).
  function parts(input, { id = "pie", fresh = new Set(), pop = false, freshFrom = Infinity } = {}) {
    const state = normalize(input);
    const { scale, spots } = arrange(state);
    const sw = (w) => n(w / scale);
    const m = meringue(state, id, sw);
    const items = [...m.items, ...toppingItems(state, sw)].sort((a, b) => a.depth - b.depth);
    let pie = crust(state, sw) + filling(state, id, sw);
    if (m.under) pie += pop ? `<g class="pie-grow" style="--i:0">${m.under}</g>` : m.under;
    let mi = 0;
    for (const item of items) {
      if (item.kind === "m" && pop) pie += `<g class="pie-grow" style="--i:${Math.min(++mi, 40)}">${item.svg}</g>`;
      else if (item.kind === "t" && fresh.has(item.topping)) pie += `<g class="pie-drop" style="--i:${item.order}">${item.svg}</g>`;
      else pie += item.svg;
    }
    let flagged = pie;
    if (state.flag) flagged += fresh.has("flag") ? `<g class="pie-drop" style="--i:0">${flag(state, sw, scale)}</g>` : flag(state, sw, scale);
    if (spots.length === 1) return { defs: defs(state, id), body: flagged, scale };
    // Un solo banderín, en el último pie: el de adelante a la derecha, que se dibuja encima de todos.
    const body = spots
      .map(([x, y], i) => {
        const one = i === spots.length - 1 ? flagged : pie;
        const inner = i >= freshFrom ? `<g class="pie-drop" style="--i:${i - freshFrom}">${one}</g>` : one;
        return `<g transform="translate(${n(x / scale)} ${n(y / scale)})">${inner}</g>`;
      })
      .join("");
    return { defs: defs(state, id), body, scale };
  }

  function svg(input, { id = "pie", label = "Un lemon pie sobre una fuente de torta" } = {}) {
    const p = parts(input, { id });
    return `<svg class="pie-svg" viewBox="${VIEW}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}"><defs data-defs>${p.defs}</defs><g data-stand>${stand()}</g><g class="pie-scale" data-scale style="transform:scale(${p.scale})"><g class="pie-body" data-body>${p.body}</g></g></svg>`;
  }

  // Corte de una porción, de costado: masa, crema y merengue con su alto real.
  function slice(input, id = "slice") {
    const s = normalize(input);
    const c = byId(CRUSTS, s.crust);
    const f = byId(FILLINGS, s.filling);
    const m = byId(MERINGUES, s.meringue);
    const cm = 13;
    const x0 = 8;
    const w = 150;
    const floor = 128;
    const curdTop = floor - Math.round(0.6 * cm) - Math.round(2.4 * cm);
    const wall = 8;
    const col = toastColors(s.toast);
    const top = Math.min(curdTop - Math.round(m.cm * cm), curdTop - 26) - 10;
    let out = `<svg class="slice-svg" viewBox="0 ${top} 330 ${140 - top}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Corte de una porción: masa, crema de limón${m.cm ? " y merengue" : ""}">`;
    out += `<defs><linearGradient id="${id}-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col.tip}"/><stop offset=".35" stop-color="${col.mid}"/><stop offset=".8" stop-color="${col.base}"/></linearGradient></defs>`;
    out += `<path d="M${x0 - 4} ${floor + 0.5} L${x0 + w + 4} ${floor + 0.5}" stroke="${INK}" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>`;
    out += `<rect x="${x0 + wall}" y="${curdTop}" width="${w - wall * 2}" height="${floor - curdTop - 8}" fill="${f.color}" stroke="${INK}" stroke-width="1.6"/>`;
    out += `<path d="M${x0} ${floor} L${x0} ${curdTop - 2} L${x0 + wall} ${curdTop - 2} L${x0 + wall} ${floor - 8} L${x0 + w - wall} ${floor - 8} L${x0 + w - wall} ${curdTop - 2} L${x0 + w} ${curdTop - 2} L${x0 + w} ${floor} Z" fill="${c.side}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    if (f.seeds) for (let i = 0; i < 6; i++) out += `<ellipse cx="${x0 + 22 + i * 21}" cy="${curdTop + 10 + (i % 2) * 9}" rx="2.2" ry="1.5" fill="#3B2616"/>`;
    const mh = Math.round(m.cm * cm);
    if (s.meringue === "picos") {
      let d = `M${x0 + 3} ${curdTop}`;
      const bumps = 6;
      const step = (w - 6) / bumps;
      for (let i = 0; i < bumps; i++) {
        const xa = x0 + 3 + step * i;
        const peakH = mh - (i % 2 ? 9 : 0) - (i === 0 || i === bumps - 1 ? 14 : 0);
        d += ` C${n(xa + step * 0.1)} ${curdTop - peakH * 0.8} ${n(xa + step * 0.35)} ${curdTop - peakH} ${n(xa + step * 0.55)} ${curdTop - peakH} Q${n(xa + step * 0.8)} ${curdTop - peakH + 2} ${n(xa + step)} ${curdTop - peakH * 0.62}`;
      }
      d += ` L${x0 + w - 3} ${curdTop} Z`;
      out += `<path d="${d}" fill="url(#${id}-m)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
    } else if (s.meringue === "gotas" || s.meringue === "corona") {
      const count = 6;
      const bw = (w - 6) / count;
      for (let i = 0; i < count; i++) {
        if (s.meringue === "corona" && i > 0 && i < count - 1) continue;
        const xa = x0 + 3 + bw * i;
        out += `<path d="M${n(xa)} ${curdTop} C${n(xa)} ${curdTop - mh * 0.6} ${n(xa + bw * 0.4)} ${curdTop - mh * 0.6} ${n(xa + bw / 2 + 1)} ${curdTop - mh} C${n(xa + bw * 0.6)} ${curdTop - mh * 0.6} ${n(xa + bw)} ${curdTop - mh * 0.6} ${n(xa + bw)} ${curdTop} Z" fill="url(#${id}-m)" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
      }
    }
    const label = (y, text, ty) => `<path d="M${x0 + w + 6} ${y} L${x0 + w + 22} ${ty}" stroke="${INK}" stroke-opacity=".4" stroke-dasharray="2 3"/><text x="${x0 + w + 26}" y="${ty + 4}" class="slice-label">${text}</text>`;
    if (mh) out += label(curdTop - mh / 2, `Merengue · ${String(m.cm).replace(".", ",")} cm`, Math.min(curdTop - mh / 2, curdTop - 26));
    out += label(curdTop + 14, `Crema · 2,4 cm`, curdTop + 14);
    out += label(floor - 4, `Masa · 0,6 cm`, floor - 2);
    return out + `</svg>`;
  }

  // Íconos chicos para los chips del panel, con los mismos dibujos de los toppings.
  function icon(id) {
    const sw = (w) => w;
    const draw = {
      rodajas: lemonSlice(sw),
      ralladura: `<g transform="translate(-6 -5) rotate(-20)">${zest(sw, "#7DA447")}</g><g transform="translate(7 4) rotate(25)">${zest(sw, "#B5CF55")}</g><g transform="translate(-4 8)">${zest(sw, "#7DA447")}</g>`,
      menta: `<g transform="translate(0 8)">${mint(sw)}</g>`,
      frutos: `<g transform="translate(-7 3)">${raspberry(sw)}</g><g transform="translate(9 -3)">${blueberry(sw)}</g>`,
      flores: flower(sw, "#F67452"),
    }[id];
    return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${draw}</svg>`;
  }

  const KEYS = { size: "d", qty: "q", crust: "m", filling: "r", acidity: "a", meringue: "mg", toast: "t", toppings: "tp", flag: "b", message: "msg" };
  function encode(state) {
    const s = normalize(state);
    const p = new URLSearchParams();
    for (const [key, short] of Object.entries(KEYS)) {
      const v = s[key];
      p.set(short, Array.isArray(v) ? v.join(",") : typeof v === "boolean" ? (v ? "1" : "0") : String(v));
    }
    return p.toString();
  }
  function decode(query) {
    const p = new URLSearchParams(query);
    const s = {};
    for (const [key, short] of Object.entries(KEYS)) {
      if (!p.has(short)) continue;
      const v = p.get(short);
      s[key] = key === "toppings" ? v.split(",").filter(Boolean) : key === "flag" ? v === "1" : v;
    }
    return normalize(s);
  }

  // Precio de un extra para un pie de este tamaño: proporcional a su superficie.
  const extraPrice = (price, size) => Math.round((price * (size / 22) ** 2) / 100) * 100;

  // Precio estimado: base por tamaño y extras por pie; los individuales se multiplican por la cantidad.
  function quote(input) {
    const s = normalize(input);
    const size = byId(SIZES, s.size);
    const qty = countOf(s);
    const times = qty > 1 ? ` × ${qty}` : "";
    const lines = [{ label: `Lemon pie ${size.multi ? "individual " : ""}de ${size.label}${times}`, price: size.price * qty }];
    const add = (label, price) => price && lines.push({ label: label + times, price: extraPrice(price, s.size) * qty });
    const crustItem = byId(CRUSTS, s.crust);
    const fillingItem = byId(FILLINGS, s.filling);
    const meringueItem = byId(MERINGUES, s.meringue);
    add(crustItem.label, crustItem.price);
    add(`Relleno ${fillingItem.label.toLowerCase()}`, fillingItem.price);
    add(`Merengue en ${meringueItem.label.toLowerCase()}`, meringueItem.price);
    for (const id of s.toppings) add(byId(TOPPINGS, id).label, byId(TOPPINGS, id).price);
    if (s.flag) lines.push({ label: "Banderín con mensaje", price: FLAG_PRICE });
    return { lines, total: lines.reduce((sum, line) => sum + line.price, 0), servings: size.servings * qty, qty };
  }

  function toastLabel(toast) {
    if (toast < 15) return "Blanco";
    if (toast < 45) return "Apenas dorado";
    if (toast < 75) return "Dorado";
    return "Bien flameado";
  }

  global.Pie = {
    CATALOG: { SIZES, CRUSTS, FILLINGS, ACIDITY, MERINGUES, TOPPINGS, FLAG_PRICE, MESSAGE_MAX, MAX_QTY },
    defaults,
    normalize,
    countOf,
    extraPrice,
    parts,
    stand,
    svg,
    slice,
    icon,
    encode,
    decode,
    quote,
    toastLabel,
    byId,
  };
})(window);

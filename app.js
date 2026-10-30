// LemonSuly · la página: carta, playground del lemon pie y microinteracciones. Usa window.Pie (pie.js).
(function () {
  "use strict";

  // Contacto: con un número de WhatsApp (solo dígitos, con código de país) el pedido se envía directo por ahí.
  const CONTACT = { whatsapp: "", instagram: "lemonsuly" };

  const C = Pie.CATALOG;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  // En pantallas táctiles: el menú compartir del teléfono y una vibración corta al elegir.
  const canShare = coarse && typeof navigator.share === "function";
  const buzz = (pattern = 8) => {
    if (coarse && !reduced && navigator.vibrate) navigator.vibrate(pattern);
  };
  const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const fmt = (value) => `$ ${money.format(value)}`;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const portions = (count) => (count === 1 ? "1 porción" : `${count} porciones`);
  // "Grande · 22 cm" o, para los individuales, "Individual · 8 cm × 4".
  function sizeText(s) {
    const size = Pie.byId(C.SIZES, s.size);
    return `${size.name} · ${size.label}${size.multi && s.qty > 1 ? ` × ${s.qty}` : ""}`;
  }

  // ---------- la carta ----------

  const PRESETS = [
    {
      name: "Clásico de la casa",
      tag: "Clásico",
      color: "#FFF1B8",
      text: "Sablée de manteca, crema de limón y picos de merengue bien dorados, con rodajas de limón.",
      state: { size: 22, crust: "sablee", filling: "limon", acidity: 2, meringue: "picos", toast: 68, toppings: ["rodajas"], flag: false },
    },
    {
      name: "Lima y menta",
      tag: "Fresco",
      color: "#E8F1DA",
      text: "Base de galletita, crema de lima-limón y gotas de merengue apenas doradas con menta.",
      state: { size: 22, crust: "galleta", filling: "lima", acidity: 3, meringue: "gotas", toast: 32, toppings: ["ralladura", "menta"], flag: false },
    },
    {
      name: "Jardín de frutos rojos",
      tag: "Frutal",
      color: "#FDE3DB",
      text: "Sablée de almendras, limón y maracuyá, corona de merengue, frutos rojos y flores.",
      state: { size: 22, crust: "almendra", filling: "maracuya", acidity: 2, meringue: "corona", toast: 45, toppings: ["frutos", "flores"], flag: false },
    },
    {
      name: "Individuales",
      tag: "Para pocos",
      color: "#DCF0F1",
      text: "Lemon pies de 8 cm, uno por persona. Pide de 1 a 6 y decóralos como quieras.",
      state: { size: 8, qty: 4, crust: "sablee", filling: "limon", acidity: 2, meringue: "gotas", toast: 55, toppings: ["rodajas", "menta"], flag: false },
    },
  ];

  $("[data-presets]").innerHTML = PRESETS.map((p, i) => {
    const q = Pie.quote(p.state);
    return `<article class="card" data-reveal style="--c:${p.color}">
      <div class="card-art"><span class="card-tag">${p.tag}</span>${Pie.svg(p.state, { id: `carta-${i}`, label: `Lemon pie ${p.name.toLowerCase()}` })}</div>
      <div class="card-body"><h3>${p.name}</h3><p>${p.text}</p>
        <div class="card-foot"><div class="price">${fmt(q.total)}<small>${Pie.byId(C.SIZES, p.state.size).label}${q.qty > 1 ? ` × ${q.qty}` : ""} · ${portions(q.servings)}</small></div>
        <button type="button" class="btn btn-soft btn-sm" data-preset="${i}">Personalizar <span class="arrow" aria-hidden="true">→</span></button></div>
      </div></article>`;
  }).join("");

  // En el teléfono la carta es un carrusel: los puntos marcan la tarjeta visible y llevan a cada una.
  const cardsEl = $("[data-presets]");
  const cardEls = $$(".card", cardsEl);
  const dotsEl = $("[data-cards-dots]");
  dotsEl.innerHTML = PRESETS.map((p, i) => `<button type="button" data-dot="${i}" aria-label="Ver ${p.name}"></button>`).join("");
  const dots = $$("button", dotsEl);
  const carousel = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const i = cardEls.indexOf(entry.target);
        dots.forEach((d, j) => d.setAttribute("aria-current", String(i === j)));
      }
    },
    { root: cardsEl, threshold: 0.6 },
  );
  cardEls.forEach((card) => carousel.observe(card));
  dotsEl.addEventListener("click", (e) => {
    const dot = e.target.closest("[data-dot]");
    if (!dot) return;
    const card = cardEls[dot.dataset.dot];
    cardsEl.scrollTo({ left: card.offsetLeft - (cardsEl.clientWidth - card.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
  });

  // ---------- hero ----------

  const hero = $("[data-hero]");
  $("[data-hero-pie]").innerHTML = Pie.svg(
    { size: 26, crust: "sablee", filling: "limon", meringue: "picos", toast: 62, toppings: ["rodajas", "menta"], flag: false },
    { id: "hero", label: "Lemon pie con picos de merengue dorado, rodajas de limón y hojas de menta, sobre una fuente turquesa" },
  );
  if (!reduced && matchMedia("(pointer: fine)").matches) {
    const layers = $$("[data-depth]", hero);
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      for (const el of layers) {
        const d = Number(el.dataset.depth);
        el.style.translate = `${(x * d).toFixed(1)}px ${(y * d).toFixed(1)}px`;
      }
    });
    hero.addEventListener("pointerleave", () => layers.forEach((el) => (el.style.translate = "")));
  }

  // ---------- playground: opciones ----------

  const form = $("[data-builder]");
  const opt = (type, name, value, inner, cls = "") => `<label class="opt ${cls}"><input type="${type}" name="${name}" value="${value}"><span class="opt-box">${inner}</span></label>`;
  const extraTag = (price) => (price ? `<span class="opt-extra" data-extra="${price}"></span>` : "");
  const text = (label, note) => `<span class="opt-text"><b>${label}</b>${note ? `<small>${note}</small>` : ""}</span>`;
  const MINI = {
    picos: `<path d="M3 27 C5 15 11 12 13 5 Q15 2 16 7 C18 13 23 12 25 5 Q27 1 29 7 C31 15 38 17 41 27 Z" fill="#FFF7E6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 5 Q15 2 16 7 M25 5 Q27 1 29 7" fill="none" stroke="#D99A55" stroke-width="2.4" stroke-linecap="round"/>`,
    gotas: [2, 15, 28].map((x) => `<path d="M${x} 27 C${x} 19 ${x + 6} 19 ${x + 7} 9 C${x + 8} 19 ${x + 14} 19 ${x + 14} 27 Z" fill="#FFF7E6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`).join(""),
    corona: `<ellipse cx="22" cy="23" rx="19" ry="6" fill="#F8CF3C" stroke="currentColor" stroke-width="2"/>` + [2, 30].map((x) => `<path d="M${x} 25 C${x} 18 ${x + 5} 18 ${x + 6} 9 C${x + 7} 18 ${x + 12} 18 ${x + 12} 25 Z" fill="#FFF7E6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`).join(""),
    sin: `<ellipse cx="22" cy="20" rx="19" ry="7" fill="#F8CF3C" stroke="currentColor" stroke-width="2"/><ellipse cx="16" cy="18" rx="6" ry="2" fill="#fff" opacity=".5"/>`,
  };

  $('[data-opts="size"]').innerHTML = C.SIZES.map((s) => opt("radio", "size", s.id, `<span class="size-dot" aria-hidden="true"><span style="--w:${Math.round(12 + s.id * 1.45)}px"></span></span>${text(s.name, `${s.label} · ${s.note}`)}`)).join("");
  $('[data-opts="crust"]').innerHTML = C.CRUSTS.map((c) => opt("radio", "crust", c.id, `<span class="swatch" style="--chip:${c.side}" aria-hidden="true"></span>${text(c.label, c.note)}${extraTag(c.price)}`)).join("");
  $('[data-opts="filling"]').innerHTML = C.FILLINGS.map((f) => opt("radio", "filling", f.id, `<span class="swatch" style="--chip:${f.color}" aria-hidden="true"></span>${text(f.label, f.note)}${extraTag(f.price)}`)).join("");
  $('[data-opts="acidity"]').innerHTML = C.ACIDITY.map((a) => opt("radio", "acidity", a.id, `<span class="acid" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= a.id ? "on" : ""}"></i>`).join("")}</span>${text(a.label)}`)).join("");
  $('[data-opts="meringue"]').innerHTML = C.MERINGUES.map((m) => opt("radio", "meringue", m.id, `<span class="mini" aria-hidden="true"><svg viewBox="0 0 44 30">${MINI[m.id]}</svg></span>${text(m.label, m.note)}${extraTag(m.price)}`)).join("");
  $('[data-opts="toppings"]').innerHTML = C.TOPPINGS.map((t) => opt("checkbox", "toppings", t.id, `<span class="chip-icon">${Pie.icon(t.id)}</span>${text(t.label)}${extraTag(t.price)}<svg class="check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 L6.5 12 L13 4.5"/></svg>`, "chip")).join("");
  $("[data-flag-price]").textContent = `+ ${fmt(C.FLAG_PRICE)}`;
  form.elements.message.maxLength = C.MESSAGE_MAX;

  // ---------- playground: estado ----------

  const stage = $("[data-stage]");
  const stagePie = $("[data-stage-pie]");
  const fromHash = () => (location.hash.startsWith("#pie?") ? Pie.decode(location.hash.slice(5)) : null);
  let state = fromHash() ?? Pie.defaults();
  let touched = false;
  stagePie.innerHTML = Pie.svg(state, { id: "pg", label: "Tu lemon pie, como lo vas armando" });
  const svgEl = $("svg", stagePie);
  const defsEl = $("[data-defs]", svgEl);
  const scaleEl = $("[data-scale]", svgEl);
  const bodyEl = $("[data-body]", svgEl);

  function writeForm(s) {
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === "radio") el.checked = String(s[el.name]) === el.value;
      else if (el.type === "checkbox") el.checked = el.name === "toppings" ? s.toppings.includes(el.value) : Boolean(s[el.name]);
      else if (el.name === "toast") el.value = s.toast;
      else if (el.name === "message") el.value = s.message;
      else if (el.name === "qty") el.value = s.qty;
    }
  }

  function readForm() {
    const fd = new FormData(form);
    return Pie.normalize({
      size: fd.get("size"),
      qty: form.elements.qty.value,
      crust: fd.get("crust"),
      filling: fd.get("filling"),
      acidity: fd.get("acidity"),
      meringue: fd.get("meringue"),
      toast: form.elements.toast.value,
      toppings: fd.getAll("toppings"),
      flag: form.elements.flag.checked,
      message: form.elements.message.value,
    });
  }

  const shareUrl = () => `${location.origin}${location.pathname}#pie?${Pie.encode(state)}`;

  function apply(next, { animate = true } = {}) {
    const prev = state;
    state = next;
    const fresh = new Set();
    if (animate) {
      for (const t of next.toppings) if (!prev.toppings.includes(t)) fresh.add(t);
      if (next.flag && !prev.flag) fresh.add("flag");
    }
    // Al sumar individuales, caen solo los nuevos.
    const before = Pie.countOf(prev);
    const freshFrom = animate && next.size === prev.size && Pie.countOf(next) > before ? before : Infinity;
    const p = Pie.parts(next, { id: "pg", fresh, pop: animate && next.meringue !== prev.meringue, freshFrom });
    defsEl.innerHTML = p.defs;
    bodyEl.innerHTML = p.body;
    scaleEl.style.transform = `scale(${p.scale})`;
    if (animate && !reduced) restart(stagePie, "is-bouncing");
    side(prev, animate);
    if (touched) history.replaceState(null, "", `#pie?${Pie.encode(next)}`);
  }

  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // ---------- playground: resumen ----------

  const totalEl = $("[data-total]");
  const dockTotal = $("[data-dock-total]");
  const deltaEl = $("[data-delta]");
  let shown = 0;
  let raf = 0;

  const showTotal = (value) => (totalEl.textContent = dockTotal.textContent = fmt(value));

  function countTo(target) {
    cancelAnimationFrame(raf);
    if (reduced) {
      shown = target;
      showTotal(target);
      return;
    }
    const from = shown;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 480);
      shown = Math.round(from + (target - from) * (1 - (1 - k) ** 3));
      showTotal(shown);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function side(prev, animate) {
    const s = state;
    const size = Pie.byId(C.SIZES, s.size);
    const q = Pie.quote(s);
    const before = Pie.quote(prev);

    $("[data-stage-tag]").textContent = `${sizeText(s)} · ${portions(q.servings)}`;
    $("[data-dock-size]").textContent = `${sizeText(s)} · ${portions(q.servings)}`;
    $("[data-facts]").textContent = `${sizeText(s)} · ${portions(q.servings)} · ${Pie.byId(C.ACIDITY, s.acidity).label.toLowerCase()}`;
    $("[data-slice]").innerHTML = Pie.slice(s, "pg-slice");

    const qtyBox = $("[data-qty]");
    qtyBox.classList.toggle("is-on", Boolean(size.multi));
    qtyBox.inert = !size.multi;
    const qtyOut = $("[data-qty-out]");
    if (qtyOut.textContent !== String(s.qty)) {
      qtyOut.textContent = s.qty;
      if (animate) restart(qtyOut, "is-pop");
    }
    $('[data-qty-step="-1"]').disabled = s.qty <= 1;
    $('[data-qty-step="1"]').disabled = s.qty >= C.MAX_QTY;

    const toastBox = $("[data-toast]");
    const noMeringue = s.meringue === "sin";
    toastBox.classList.toggle("is-off", noMeringue);
    form.elements.toast.disabled = noMeringue;
    $("[data-toast-out]").textContent = noMeringue ? "—" : Pie.toastLabel(s.toast);

    const message = $("[data-message]");
    message.classList.toggle("is-off", !s.flag);
    form.elements.message.disabled = !s.flag;
    const counter = $("[data-counter]");
    counter.textContent = `${s.message.length}/${C.MESSAGE_MAX}`;
    counter.classList.toggle("is-full", s.message.length >= C.MESSAGE_MAX);

    const each = q.qty > 1 ? " c/u" : "";
    for (const tag of $$("[data-extra]", form)) tag.textContent = `+ ${fmt(Pie.extraPrice(Number(tag.dataset.extra), s.size))}${each}`;

    const old = new Set(before.lines.map((l) => l.label));
    $("[data-lines]").innerHTML = q.lines.map((l) => `<li${animate && !old.has(l.label) ? ' class="is-new"' : ""}><span>${l.label}</span><span>${fmt(l.price)}</span></li>`).join("");

    const diff = q.total - before.total;
    if (animate && diff && !reduced) {
      deltaEl.textContent = `${diff > 0 ? "+" : "−"} ${fmt(Math.abs(diff))}`;
      deltaEl.className = `delta ${diff > 0 ? "is-up" : "is-down"}`;
      void deltaEl.offsetWidth;
      restart(dockTotal, "is-bump");
    }
    countTo(q.total);
  }

  form.addEventListener("input", (e) => {
    touched = true;
    const quiet = e.target.name === "toast" || e.target.name === "message";
    if (!quiet) buzz();
    apply(readForm(), { animate: !quiet });
  });
  form.addEventListener("change", (e) => {
    if (e.target.name === "toast") buzz(6);
  });
  form.addEventListener("submit", (e) => e.preventDefault());

  form.addEventListener("click", (e) => {
    const step = e.target.closest("[data-qty-step]");
    if (!step) return;
    const input = form.elements.qty;
    const next = Math.max(1, Math.min(C.MAX_QTY, Number(input.value) + Number(step.dataset.qtyStep)));
    if (next === Number(input.value)) return;
    input.value = next;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  writeForm(state);
  apply(state, { animate: false });
  shown = Pie.quote(state).total;
  totalEl.textContent = fmt(shown);

  // ---------- playground: botones ----------

  function load(next, { scroll = false } = {}) {
    touched = true;
    buzz();
    writeForm(next);
    apply(next);
    if (scroll) {
      $("#arma").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      restart(stage, "is-flash");
    }
  }

  document.addEventListener("click", (e) => {
    const preset = e.target.closest("[data-preset]");
    if (preset) load(Pie.normalize({ ...PRESETS[preset.dataset.preset].state, message: state.message }), { scroll: true });
  });

  $("[data-reset]").addEventListener("click", () => load(Pie.defaults()));

  stagePie.addEventListener("click", (e) => {
    if (reduced) return;
    restart(stagePie, "is-bouncing");
    burst(e.clientX, e.clientY, 8);
  });

  // ---------- hojas: menú y pedido ----------

  // En el teléfono el menú y el pedido suben desde abajo; se cierran tocando afuera, con Esc o deslizándolos hacia abajo.
  const dialog = $("[data-order-dialog]");
  const menu = $("[data-menu]");
  const narrow = matchMedia("(max-width: 640px)");
  const asSheet = (d) => d === menu || narrow.matches;

  function openSheet(d) {
    d.showModal();
    document.documentElement.classList.add("has-sheet");
    buzz(10);
    updateDock();
  }

  function closeSheet(d, then) {
    if (!d.open || d.classList.contains("is-closing")) return;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      d.classList.remove("is-closing");
      d.style.transform = "";
      d.close();
      then?.();
    };
    if (reduced) return done();
    d.classList.add("is-closing");
    d.addEventListener("animationend", done, { once: true });
    setTimeout(done, 450);
  }

  for (const d of [dialog, menu]) {
    d.addEventListener("close", () => {
      if (!dialog.open && !menu.open) document.documentElement.classList.remove("has-sheet");
      updateDock();
    });
    d.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeSheet(d);
    });
    // Un toque fuera de la hoja (en el fondo oscuro) la cierra.
    d.addEventListener("click", (e) => {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeSheet(d);
    });
    let startY = 0;
    let dy = 0;
    let dragging = false;
    d.addEventListener("pointerdown", (e) => {
      if (!asSheet(d) || !e.target.closest("[data-drag]")) return;
      dragging = true;
      startY = e.clientY;
      dy = 0;
      d.classList.add("is-dragging");
      d.setPointerCapture(e.pointerId);
    });
    d.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      d.style.transform = `translateY(${dy}px)`;
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      d.classList.remove("is-dragging");
      if (dy > 90) closeSheet(d);
      else d.style.transform = "";
    };
    d.addEventListener("pointerup", release);
    d.addEventListener("pointercancel", release);
  }

  $("[data-menu-open]").addEventListener("click", () => openSheet(menu));
  menu.addEventListener("click", (e) => {
    const link = e.target.closest("a[href^='#']");
    if (!link) return;
    e.preventDefault();
    closeSheet(menu, () => $(link.hash).scrollIntoView({ behavior: reduced ? "auto" : "smooth" }));
  });

  // ---------- barra inferior ----------

  // En pantallas angostas la acción principal queda abajo, al alcance del pulgar:
  // fuera del playground invita a armar el pie; dentro, muestra el total y el botón para pedir.
  const dock = $("[data-dock]");
  const dockQuery = matchMedia("(max-width: 1020px)");
  const seen = { cta: false, play: false, actions: false, footer: false };

  function updateDock() {
    const mode = seen.play ? "order" : "cta";
    dock.dataset.mode = mode;
    const on = dockQuery.matches && !dialog.open && !menu.open && (mode === "order" ? !seen.actions : !seen.cta && !seen.footer);
    dock.classList.toggle("is-on", on);
    dock.inert = !on;
  }

  const watch = (selector, key, rootMargin = "0px") =>
    new IntersectionObserver(
      ([entry]) => {
        seen[key] = entry.isIntersecting;
        updateDock();
      },
      { rootMargin },
    ).observe($(selector));
  watch(".hero-ctas", "cta");
  watch(".playground", "play", "-35% 0px -35% 0px");
  watch(".summary-actions", "actions");
  watch(".site-footer", "footer");
  dockQuery.addEventListener("change", updateDock);

  // ---------- pedido ----------

  function orderText() {
    const s = state;
    const m = Pie.byId(C.MERINGUES, s.meringue);
    const count = Pie.countOf(s);
    const lines = [
      `¡Hola, LemonSuly! Quiero pedir ${count > 1 ? `estos ${count} lemon pies individuales` : "este lemon pie"}:`,
      "",
      `• Tamaño: ${sizeText(s)} (${portions(Pie.quote(s).servings)})`,
      `• Masa: ${Pie.byId(C.CRUSTS, s.crust).label}`,
      `• Relleno: ${Pie.byId(C.FILLINGS, s.filling).label}, ${Pie.byId(C.ACIDITY, s.acidity).label.toLowerCase()}`,
      `• Merengue: ${s.meringue === "sin" ? "sin merengue" : `${m.label.toLowerCase()}, ${Pie.toastLabel(s.toast).toLowerCase()}`}`,
      `• Toppings: ${s.toppings.length ? s.toppings.map((id) => Pie.byId(C.TOPPINGS, id).label.toLowerCase()).join(", ") : "sin toppings"}`,
    ];
    if (s.flag && s.message.trim()) lines.push(`• Banderín: «${s.message.trim()}»`);
    lines.push("", `Total estimado: ${fmt(Pie.quote(s).total)}`, `Mi diseño: ${shareUrl()}`);
    return lines.join("\n");
  }

  const shareBtn = $("[data-share]");
  const copyBtn = $("[data-copy-order]");
  const doneEl = $("[data-order-done]");
  // Con el menú compartir del teléfono, «Enviar pedido» es la acción principal y copiar queda de respaldo.
  shareBtn.hidden = !canShare;
  copyBtn.classList.toggle("btn-primary", !canShare);
  copyBtn.classList.toggle("btn-ghost", canShare);

  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-order]")) return;
    const body = orderText();
    $("[data-order-text]").textContent = body;
    const wa = $("[data-whatsapp]");
    wa.hidden = !CONTACT.whatsapp;
    if (CONTACT.whatsapp) wa.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(body)}`;
    $("[data-copy-label]").textContent = "Copiar pedido";
    doneEl.hidden = true;
    openSheet(dialog);
  });
  $("[data-close]").addEventListener("click", () => closeSheet(dialog));

  // El final del pedido: confirmación con un tilde y el siguiente paso, escribirnos.
  function finished(from) {
    buzz([12, 50, 18]);
    doneEl.hidden = false;
    restart(doneEl, "is-in");
    const r = from.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 18, dialog);
  }

  shareBtn.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.share({ title: "Mi lemon pie · LemonSuly", text: $("[data-order-text]").textContent });
      finished(btn);
    } catch (err) {
      if (err.name !== "AbortError" && (await copy($("[data-order-text]").textContent))) finished(btn);
    }
  });

  copyBtn.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (await copy($("[data-order-text]").textContent)) {
      $("[data-copy-label]").textContent = "¡Copiado!";
      finished(btn);
      setTimeout(() => ($("[data-copy-label]").textContent = "Copiar pedido"), 2200);
    }
  });

  const linkBtn = $("[data-copy-link]");
  linkBtn.textContent = canShare ? "Compartir diseño" : "Copiar enlace";
  linkBtn.addEventListener("click", async () => {
    if (canShare) {
      try {
        await navigator.share({ title: "Mi lemon pie · LemonSuly", text: "Mira el lemon pie que armé en LemonSuly", url: shareUrl() });
        buzz();
      } catch {}
      return;
    }
    if (await copy(shareUrl())) {
      say("Enlace copiado: tu diseño queda guardado ahí");
      linkBtn.textContent = "¡Enlace copiado!";
      setTimeout(() => (linkBtn.textContent = "Copiar enlace"), 2200);
    }
  });

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const area = Object.assign(document.createElement("textarea"), { value });
      area.style.cssText = "position:fixed;opacity:0";
      (dialog.open ? dialog : document.body).append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
  }

  let sayTimer = 0;
  function say(message) {
    const el = $("[data-toast-msg]");
    el.textContent = message;
    el.classList.add("is-on");
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => el.classList.remove("is-on"), 2400);
  }

  // Rodajas de limón y hojitas que saltan desde un punto de la pantalla.
  function burst(x, y, count, host = document.body) {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      const bit = document.createElement("span");
      bit.className = `confetti${i % 3 === 0 ? " leaf" : ""}`;
      bit.style.left = `${x}px`;
      bit.style.top = `${y}px`;
      host.append(bit);
      const a = -Math.PI * (0.1 + Math.random() * 0.8);
      const dist = 60 + Math.random() * 90;
      const dx = Math.cos(a) * dist;
      const dy = Math.sin(a) * dist;
      bit.animate(
        [
          { transform: "translate(0, 0) scale(.3) rotate(0deg)", opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx * 1.15}px, ${dy + 70}px) scale(.7) rotate(${Math.random() * 540}deg)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.22,1,.36,1)" },
      ).onfinish = () => bit.remove();
    }
  }

  // ---------- página ----------

  const header = $("[data-header]");
  const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const links = $$(".nav a");
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) for (const a of links) a.setAttribute("aria-current", String(a.hash === `#${entry.target.id}`));
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  for (const a of links) spy.observe($(a.hash));

  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        reveal.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  for (const el of $$("[data-reveal]")) {
    const group = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
    el.style.setProperty("--d", `${group.indexOf(el) * 90}ms`);
    reveal.observe(el);
  }

  // Onda en el punto donde se presiona cada botón.
  document.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn || reduced) return;
    const r = btn.getBoundingClientRect();
    const dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.left = `${e.clientX - r.left}px`;
    dot.style.top = `${e.clientY - r.top}px`;
    btn.append(dot);
    dot.addEventListener("animationend", () => dot.remove());
  });

  const ig = $("[data-instagram]");
  ig.href = `https://www.instagram.com/${CONTACT.instagram}/`;
  ig.target = "_blank";
  ig.rel = "noopener";
  for (const el of $$("[data-instagram-handle]")) el.textContent = `@${CONTACT.instagram}`;
  $("[data-instagram-dm]").href = `https://ig.me/m/${CONTACT.instagram}`;
  $("[data-year]").textContent = new Date().getFullYear();

  if (fromHash()) requestAnimationFrame(() => $("#arma").scrollIntoView());
  addEventListener("hashchange", () => {
    const next = fromHash();
    if (next && Pie.encode(next) !== Pie.encode(state)) load(next, { scroll: true });
  });
})();

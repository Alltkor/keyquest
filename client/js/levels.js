const $ = (id) => document.getElementById(id);
if (!auth.token) location.href = "login.html";

const XS = [26, 62, 38, 70];        // положение узлов по ширине (%): дорожка «змейкой»
const Y0 = 62, STEP = 120;          // отступ сверху и шаг между уровнями (px)

let levels = [], selectedId = null;

async function load() {
  try {
    levels = (await api("/levels")).levels;
  } catch (err) {
    if (err.status === 401) { auth.clear(); location.href = "login.html"; return; }
    $("map").textContent = "Не удалось загрузить уровни";
    return;
  }
  const current = levels.find(l => l.status === "current") || levels[levels.length - 1];
  selectedId = current.id;
  renderAll();
}

function selectLevel(id, scroll) {
  selectedId = id;
  renderAll();
  if (scroll) {
    const n = document.querySelector(".node.selected");
    if (n) n.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function renderAll() {
  renderChips();
  renderMap();
  renderDetail();
  renderCats();
}

function catStats() {
  const g = new Map();
  for (const l of levels) {
    const s = g.get(l.category) || { done: 0, total: 0 };
    s.total++;
    if (l.status === "done") s.done++;
    g.set(l.category, s);
  }
  return g;
}

function renderChips() {
  const box = $("chips");
  box.textContent = "";
  const sel = levels.find(l => l.id === selectedId);
  const seen = new Set();
  for (const l of levels) {
    if (seen.has(l.category)) continue;
    seen.add(l.category);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip-cat" + (sel && sel.category === l.category ? " on" : "");
    b.textContent = l.category;
    b.onclick = () => selectLevel(l.id, true);
    box.append(b);
  }
}

function renderMap() {
  const map = $("map");
  map.textContent = "";
  const n = levels.length;
  const H = Y0 + (n - 1) * STEP + 80;
  map.style.height = H + "px";

  const pos = levels.map((l, i) => ({ x: XS[i % XS.length], y: Y0 + i * STEP }));

  // Дорожка
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 100 ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  for (let i = 0; i < n - 1; i++) {
    const a = pos[i], b = pos[i + 1], ym = (a.y + b.y) / 2;
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", `M ${a.x} ${a.y} C ${a.x} ${ym}, ${b.x} ${ym}, ${b.x} ${b.y}`);
    p.setAttribute("class", "seg" + (levels[i].status === "done" ? " done" : ""));
    svg.append(p);
  }
  map.append(svg);

  // Узлы с подписями сбоку
  levels.forEach((l, i) => {
    const p = pos[i];
    const b = document.createElement("button");
    b.type = "button";
    b.className = `node ${l.status}` + (l.id === selectedId ? " selected" : "");
    b.style.left = p.x + "%";
    b.style.top = p.y + "px";
    b.setAttribute("aria-label", `Уровень ${l.id}: ${l.title}`);
    b.onclick = () => selectLevel(l.id, false);
    b.textContent = l.status === "done" ? "✓" : l.status === "locked" ? "🔒 " : String(l.id);

    if (l.status === "current") {
      const tag = document.createElement("span");
      tag.className = "tag"; tag.textContent = "СЕЙЧАС";
      b.append(tag);
    }

    const lbl = document.createElement("span");
    lbl.className = "lbl " + (p.x <= 50 ? "right" : "left");
    const cat = document.createElement("span"); cat.className = "cat"; cat.textContent = l.category.toUpperCase();
    const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = l.title;
    lbl.append(cat, nm);

    if (l.status === "done") {
      const st = document.createElement("span"); st.className = "st";
      for (let k = 1; k <= 3; k++) {
        const s = document.createElement("span");
        s.className = k <= l.stars ? "on" : "off"; s.textContent = "★";
        st.append(s);
      }
      lbl.append(st);
    } else {
      const meta = document.createElement("span"); meta.className = "meta";
      meta.textContent = "цель " + l.target_wpm + " WPM";
      lbl.append(meta);
    }
    b.append(lbl);
    map.append(b);
  });
}

function renderDetail() {
  const l = levels.find(x => x.id === selectedId);
  const box = $("detail");
  box.textContent = "";

  const tag = document.createElement("div"); tag.className = "cat-tag";
  tag.textContent = `УРОВЕНЬ ${l.id} · ${l.category.toUpperCase()}`;
  const h = document.createElement("h2"); h.textContent = l.title;

  const stars = document.createElement("div"); stars.className = "stars-big";
  for (let k = 1; k <= 3; k++) {
    const s = document.createElement("span");
    s.className = k <= l.stars ? "on" : "off"; s.textContent = "★";
    stars.append(s);
  }
  const p = document.createElement("p"); p.textContent = l.description;

  const facts = document.createElement("div"); facts.className = "facts";
  for (const [label, value] of [
    ["ЦЕЛЬ", l.target_wpm + " WPM"], ["ТОЧНОСТЬ", "от 90%"],
    ["НАГРАДА", "+" + l.xp_reward + " XP"], ["ЛУЧШИЙ", l.best_wpm ? l.best_wpm + " WPM" : "—"]
  ]) {
    const f = document.createElement("div"); f.className = "fact";
    const s = document.createElement("small"); s.textContent = label;
    const b = document.createElement("strong"); b.textContent = value;
    f.append(s, b); facts.append(f);
  }

  const btn = document.createElement("a");
  if (l.status === "locked") {
    btn.className = "btn btn-outline off";
    btn.setAttribute("aria-disabled", "true");
    btn.textContent = `Сначала пройди уровень ${l.id - 1}`;
  } else {
    btn.className = "btn btn-primary";
    btn.href = "train.html?level=" + l.id;
    btn.textContent = l.status === "done" ? "Пройти ещё раз" : "Начать уровень";
  }

  box.append(tag, h, stars, p, facts, btn);
}

function renderCats() {
  const box = $("cats");
  box.textContent = "";
  const h = document.createElement("h2"); h.textContent = "КАТЕГОРИИ";
  box.append(h);

  for (const [name, s] of catStats()) {
    const row = document.createElement("div"); row.className = "catrow";
    const top = document.createElement("div"); top.className = "top";
    const a = document.createElement("span"); a.textContent = name;
    const b = document.createElement("span"); b.textContent = `${s.done}/${s.total}`;
    top.append(a, b);
    const bar = document.createElement("div"); bar.className = "bar";
    const fill = document.createElement("div"); fill.style.width = (s.done / s.total * 100) + "%";
    bar.append(fill);
    row.append(top, bar);
    box.append(row);
  }
}

load();
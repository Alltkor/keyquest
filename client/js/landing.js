// ---------- Демо печати ----------
const PHRASES = ["asdf jkl; fall sad dad", "ask a lad; add a flask", "all sad dads ask; fall flask"];
const DELAY = 180;     // 60 / (0.18 * 5) ≈ 66 WPM — так что число на карточке честное
const ROWS = ["qwertyuiop", "asdfghjkl;", "zxcvbnm,."];

const demoText = document.getElementById("demoText");
const demoBar = document.getElementById("demoBar");
const kb = document.getElementById("kb");
const keys = {};

for (const row of ROWS) {
  const r = document.createElement("div");
  r.className = "kb-row";
  for (const ch of row) {
    const k = document.createElement("div");
    k.className = "key";
    k.textContent = ch;
    keys[ch] = k;
    r.append(k);
  }
  kb.append(r);
}
const spaceRow = document.createElement("div");
spaceRow.className = "kb-row";
const space = document.createElement("div");
space.className = "key space";
keys[" "] = space;
spaceRow.append(space);
kb.append(spaceRow);

function draw(phrase, n) {
  demoText.textContent = "";
  const done = document.createElement("span"); done.className = "t-done"; done.textContent = phrase.slice(0, n);
  const cur = document.createElement("span"); cur.className = "cur";
  const rest = document.createElement("span"); rest.className = "t-rest"; rest.textContent = phrase.slice(n);
  demoText.append(done, cur, rest);
  demoBar.style.width = (n / phrase.length * 100) + "%";
}

function hit(ch) {
  const k = keys[ch];
  if (!k) return;
  k.classList.add("hit");
  setTimeout(() => k.classList.remove("hit"), 140);
}

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduce) {
  draw(PHRASES[0], PHRASES[0].length);        // без анимации: показываем готовый текст
} else {
  let p = 0, i = 0;
  (function tick() {
    const phrase = PHRASES[p];
    if (i < phrase.length) {
      hit(phrase[i]);
      i++;
      draw(phrase, i);
      setTimeout(tick, DELAY);
    } else {
      setTimeout(() => { p = (p + 1) % PHRASES.length; i = 0; draw(PHRASES[p], 0); tick(); }, 1400);
    }
  })();
  draw(PHRASES[0], 0);
}

// ---------- Если пользователь уже вошёл ----------
if (auth.token && auth.user) {
  const set = (id, text, href) => { const el = document.getElementById(id); el.textContent = text; el.href = href; };
  document.getElementById("navLogin").hidden = true;
  set("navStart", "Мой кабинет", "dashboard.html");
  set("heroStart", "Продолжить", "levels.html");
  set("heroLogin", "Мой кабинет", "dashboard.html");
  set("finalStart", "Продолжить", "levels.html");
}

document.getElementById("themeBtn").addEventListener("click", toggleTheme);
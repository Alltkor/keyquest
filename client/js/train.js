const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(location.search);
const LEVEL = parseInt(params.get("level")) || null;
const CUSTOM = params.get("custom") === "1";
const LANG = localStorage.getItem("kq_lang") === "ru" ? "ru" : "en";
if (LEVEL && !auth.token) location.href = "login.html";

const touch = window.matchMedia("(pointer: coarse)").matches;
let engine, timerId, levelMeta = null, lastResult = null, paused = false, wrongScript = 0;

function fmt(sec) {
  const s = Math.floor(sec);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function showCh(ch) { return ch === " " ? "пробел" : ch; }
const isCyr = (c) => /[а-яё]/i.test(c);
const isLat = (c) => /[a-z]/i.test(c);

// Какая раскладка нужна для этого текста
function detectLayout(text) {
  let cyr = 0, lat = 0;
  for (const ch of text) { if (isCyr(ch)) cyr++; else if (isLat(ch)) lat++; }
  return cyr > lat ? "ru" : "en";
}

/* ---------- Старт ---------- */
async function start() {
  let text = "asdf jkl; fall sad dad", textId = null;   // запасной текст
  levelMeta = null;
  try {
    if (CUSTOM) {
      text = sessionStorage.getItem("kq_custom") || "";
      if (!text) { location.href = "practice.html"; return; }
    } else if (LEVEL) {
      const t = await api(`/levels/${LEVEL}/text?lang=${LANG}`);
      text = t.content; textId = t.id; levelMeta = t.level;
    } else {
      const res = await fetch(`${API}/texts/random?lang=${LANG}`);
      if (res.ok) { const t = await res.json(); text = t.content; textId = t.id; }
    }
  } catch (e) {
    if (e.status === 403 || e.status === 404) { location.href = "levels.html"; return; }
    if (e.status === 401) { auth.clear(); location.href = "login.html"; return; }
    console.warn("Сервер недоступен, берём запасной текст");
  }

  const langTag = LANG === "ru" && !CUSTOM ? " · русский" : "";
  $("lvl").textContent = levelMeta ? levelMeta.id : "—";
  $("levelinfo").textContent = CUSTOM
    ? "Свой текст"
    : levelMeta
      ? `Уровень ${levelMeta.id} · ${levelMeta.category} · цель ${levelMeta.target_wpm} WPM, точность от 90%${langTag}`
      : "Свободная практика" + langTag;
  $("reward").textContent = CUSTOM
    ? "XP за свой текст не начисляется"
    : levelMeta && levelMeta.status !== "done" ? `+${levelMeta.xp_reward} XP за первое прохождение` : "";

  buildKeyboard($("kb"), detectLayout(text));
  engine = new TypingEngine(text);
  engine.textId = textId;
  paused = false; wrongScript = 0;
  $("layoutHint").hidden = true;
  $("pause").hidden = true;
  $("result").classList.add("hidden");
  $("game").classList.remove("hidden");
  render();
  clearInterval(timerId);
  timerId = setInterval(updateHud, 200);
}

function render() {
  const box = $("text");
  box.textContent = "";
  [...engine.text].forEach((ch, i) => {
    const s = document.createElement("span");
    s.className = "ch " + engine.states[i] + (i === engine.pos ? " current" : "");
    s.textContent = ch;
    box.append(s);
  });
  const pct = Math.round(engine.pos / engine.text.length * 100);
  $("bar").style.width = pct + "%";
  $("progText").textContent = "Прогресс задания " + pct + "%";
  showNextKey(engine.finished ? null : engine.text[engine.pos]);
  updateHud();
}

function updateHud() {
  $("wpm").textContent = engine.wpm;
  $("acc").textContent = engine.accuracy + "%";
  $("time").textContent = fmt(engine.seconds);
}

/* ---------- Ввод ---------- */
function typeChar(ch) {
  if (!engine || engine.finished || paused) return;
  const expected = engine.text[engine.pos];
  engine.press(ch);
  flashKey(ch, ch === expected);
  playKey(ch === expected);

  // Подряд несколько букв «не того алфавита» — скорее всего, включена не та раскладка
  if (ch === expected) wrongScript = 0;
  else if ((isCyr(expected) && isLat(ch)) || (isLat(expected) && isCyr(ch))) wrongScript++;
  const hint = $("layoutHint");
  hint.hidden = wrongScript < 3;
  if (!hint.hidden) {
    hint.textContent = isCyr(expected)
    ? "Включи русскую раскладку: Alt+Shift или Win+Пробел"
      : "Включи английскую раскладку: Alt+Shift или Win+Пробел";
  }

  render();
  if (engine.finished) finish();
}
function eraseChar() {
  if (!engine || engine.finished || paused) return;
  engine.backspace();
  render();
}

// Физическая клавиатура
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { e.preventDefault(); setPaused(!paused); return; }
  if (!engine || engine.finished || paused) return;
  if (e.ctrlKey || e.metaKey) return;
  if (e.key === "Backspace") { e.preventDefault(); eraseChar(); }
  else if (e.key.length === 1) { e.preventDefault(); typeChar(e.key); }
});

// Системная клавиатура телефона: скрытое поле, сравниваем значение до и после
const mi = $("mobileInput");
const SENT = "\u200b\u200b\u200b\u200b";
let prevVal = SENT;
function resetMi() {
  mi.value = SENT; prevVal = SENT;
  mi.setSelectionRange(SENT.length, SENT.length);
}
mi.addEventListener("focus", resetMi);
mi.addEventListener("input", () => {
  const v = mi.value;
  if (v.length > prevVal.length && v.startsWith(prevVal)) {
    for (const ch of v.slice(prevVal.length)) typeChar(ch);
  } else if (v.length < prevVal.length) {
    for (let i = 0; i < prevVal.length - v.length; i++) eraseChar();
  }
  if (v.length < 2 || v.length > 12) resetMi(); else prevVal = v;
});
$("game").addEventListener("click", () => { if (touch && !paused) mi.focus(); });
$("touchHint").hidden = !touch;

/* ---------- Пауза ---------- */
function setPaused(p) {
  if (!engine || engine.finished || p === paused) return;
  paused = p;
  if (p) engine.pause(); else engine.resume();
  $("pause").hidden = !p;
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (!p && touch) mi.focus();
}
$("pauseBtn").onclick = () => setPaused(!paused);
$("resume").onclick = () => setPaused(false);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && engine && engine.startTime !== null) setPaused(true);
});

/* ---------- Финиш и результат ---------- */
function burstConfetti() {
  const box = $("confetti");
  box.innerHTML = "";
  const colors = ["#19F0D2", "#A78BFA", "#FBBF24"];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "%";
    p.style.background = colors[i % 3];
    p.style.animationDelay = Math.random() * 0.4 + "s";
    box.appendChild(p);
  }
}

async function finish() {
  clearInterval(timerId);
  $("game").classList.add("hidden");

  let r;
  if (CUSTOM) {
    // Свой текст: ничего не сохраняем и XP не даём
    const acc = engine.accuracy;
    const base = levelInfo(auth.user ? auth.user.xp : loadProgress().xp);
    r = {
      wpm: engine.wpm, accuracy: acc, seconds: engine.seconds, xp: 0, isRecord: false, prevBest: 0,
      stars: acc >= 97 ? 3 : acc >= 95 ? 2 : acc >= 90 ? 1 : 0, leveledUp: false, level: base, custom: true,
    };
  } else if (auth.token && engine.textId) {
    try {
      r = await api("/sessions", {
        method: "POST",
        body: JSON.stringify({
          textId: engine.textId,
          wpm: engine.wpm,
          accuracy: engine.accuracy,
          duration: Math.max(1, Math.round(engine.seconds))
        })
      });
      localStorage.setItem("kq_user", JSON.stringify(r.user));
    } catch (err) {
      if (err.status === 401) auth.clear();
      r = finishSession(engine);          // запасной вариант: локально
    }
  } else {
    r = finishSession(engine);            // гость
  }
  lastResult = r;
  showResult(r);
}

function showResult(r) {
  const passed = r.stars > 0;
  $("r-title").textContent = r.custom ? "Готово!"
    : !passed ? "Почти получилось!" : (r.stars === 3 ? "Отлично!" : "Уровень пройден!");
  $("r-stars").innerHTML = [1, 2, 3]
    .map(n => `<span class="${n <= r.stars ? "on" : "off"}">★</span>`).join("");
  $("r-wpm").textContent = r.wpm;
  $("r-acc").textContent = r.accuracy + "%";
  $("r-time").textContent = fmt(r.seconds);

  const rec = $("r-record");
  if (r.custom) {
    rec.className = "record";
    rec.textContent = "Свой текст: результат не сохраняется, XP не начисляется";
  } else if (!passed && r.target) {
    rec.className = "record";
    rec.textContent = `Для прохождения нужно ${r.target} WPM и точность от 90%`;
  } else if (r.isRecord) {
    rec.className = "record best";
    rec.textContent = `Новый личный рекорд! Прошлый: ${r.prevBest} WPM (+${r.wpm - r.prevBest})`;
  } else if (r.prevBest > 0) {
    rec.className = "record";
    rec.textContent = `Личный рекорд: ${r.prevBest} WPM`;
  } else {
    rec.className = "record";
    rec.textContent = "Первый результат записан — теперь есть что побивать";
  }

  const mk = engine.topMistake();
  $("r-mistake").textContent = mk
    ? `Разбор ошибок: вместо «${showCh(mk.expected)}» чаще всего нажимал «${showCh(mk.typed)}» (${mk.count} раз)`
    : "Без единой ошибки — отличная работа!";

  $("r-xp").textContent = r.custom ? "XP не начисляется"
    : "+" + r.xp + " XP" + (r.levelBonus ? ` (бонус за уровень +${r.levelBonus})` : "");
  $("r-level").textContent = r.leveledUp
    ? `Новый уровень: ${r.level.level}!`
    : `Уровень ${r.level.level} · ${r.level.xpInLevel} / ${r.level.xpNeeded} XP`;
  $("r-bar").style.width = (r.level.xpInLevel / r.level.xpNeeded * 100) + "%";

  $("next").textContent = CUSTOM ? "Другой текст"
    : LEVEL ? (passed && r.nextLevelId ? "Следующий уровень" : "К карте уровней")
    : "Следующий текст";

  const qbox = $("r-quest");
  qbox.textContent = "";
  const doneQ = r.quests || [];
  for (const q of doneQ) {
    const line = document.createElement("div");
    line.className = "quest-done";
    line.textContent = `✓ ${q.title} · +${q.xp} XP`;
    qbox.append(line);
  }

  const box = $("r-ach");
  box.textContent = "";
  const newAch = r.achievements || [];
  if (newAch.length) {
    const title = document.createElement("div");
    title.className = "ach-title";
    title.textContent = "Новые достижения!";
    box.append(title);
    for (const a of newAch) {
      const chip = document.createElement("div");
      chip.className = "ach-chip r-" + a.rarity;
      chip.textContent = a.icon + " " + a.title;
      chip.title = a.description;
      box.append(chip);
    }
  }

  $("result").classList.remove("hidden");
  if (r.isRecord || r.leveledUp || r.stars === 3 || newAch.length || doneQ.length) burstConfetti();
}

/* ---------- Кнопки ---------- */
$("restart").onclick = start;
$("again").onclick = start;
$("next").onclick = () => {
  if (CUSTOM) { location.href = "practice.html"; return; }
  if (LEVEL) {
    const ok = lastResult && lastResult.stars > 0 && lastResult.nextLevelId;
    location.href = ok ? "train.html?level=" + lastResult.nextLevelId : "levels.html";
  } else {
    start();
  }
};

$("share").onclick = async () => {
  if (!lastResult) return;
  const text = `Я напечатал ${lastResult.wpm} WPM с точностью ${lastResult.accuracy}% в KeyQuest!`;
  const btn = $("share");
  try {
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Скопировано!";
      setTimeout(() => { btn.textContent = "Поделиться"; }, 2000);
    }
  } catch (e) { /* пользователь закрыл окно «поделиться» */ }
};

/* ---------- Верхняя строка и клавиатура ---------- */
function renderUserbar() {
  const bar = $("userbar");
  bar.textContent = "";
  if (auth.token && auth.user) {
    const back = document.createElement("a");
    back.href = CUSTOM ? "practice.html" : LEVEL ? "levels.html" : "dashboard.html";
    back.textContent = CUSTOM ? "← К свободной практике" : LEVEL ? "← К карте уровней" : "← На главную";
    bar.append(back);
  } else {
    const a = document.createElement("a");
    a.href = "login.html"; a.textContent = "Войди";
    bar.append(a, " — чтобы сохранять прогресс на сервере");
  }
}

function applyKb() {
  const on = localStorage.getItem("kq_kb") !== "off";
  $("kb").hidden = !on;
  $("kbToggle").textContent = on ? "Подсветка клавиш: вкл" : "Подсветка клавиш: выкл";
}
$("kbToggle").onclick = () => {
  localStorage.setItem("kq_kb", localStorage.getItem("kq_kb") === "off" ? "on" : "off");
  applyKb();
};
applyKb();

renderUserbar();
start();
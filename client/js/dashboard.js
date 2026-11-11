const $ = (id) => document.getElementById(id);
if (!auth.token) location.href = "login.html";

function ymd(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function fmtTime(sec) {
  const m = Math.round(sec / 60);
  return m >= 60 ? Math.floor(m / 60) + "ч " + (m % 60) + "м" : m + "м";
}

async function load() {
  let d;
  try {
    d = await api("/me/stats");
  } catch (err) {
    if (err.status === 401) { auth.clear(); location.href = "login.html"; return; }
    $("greet").textContent = "Не удалось загрузить данные";
    return;
  }
  localStorage.setItem("kq_user", JSON.stringify(d.user));
  if (window.refreshShellUser) window.refreshShellUser();
  render(d);
}

function listItem(leftText, rightText, rightClass) {
  const li = document.createElement("li");
  const l = document.createElement("span"); l.className = "mono"; l.textContent = leftText;
  const r = document.createElement("span"); r.className = rightClass; r.textContent = rightText;
  li.append(l, r);
  return li;
}

function render(d) {
  const u = d.user;

  $("avatar").style.background = AVATAR_COLORS[u.avatar] || AVATAR_COLORS.teal;
  $("greet").textContent = "Привет, " + u.nickname + "!";
  $("levelText").textContent = `Уровень ${d.level.level} · ${d.level.xpInLevel} / ${d.level.xpNeeded} XP`;
  $("xpbar").style.width = (d.level.xpInLevel / d.level.xpNeeded * 100) + "%";
  $("streak").textContent = "🔥  " + u.streak;

  $("s-wpm").textContent = d.totals.avg_wpm;
  $("s-acc").textContent = d.totals.avg_acc + "%";
  $("s-time").textContent = fmtTime(d.weekSeconds);
  $("s-best").textContent = d.totals.best_wpm;

  // Цель дня
  const pct = Math.min(100, Math.round(d.daily.words / d.daily.goal * 100));
  $("ring").style.setProperty("--p", pct);
  $("ring-text").textContent = pct + "%";
  $("goal-text").textContent = `${d.daily.words} / ${d.daily.goal} слов сегодня`;

  // Карточка «Продолжить»
  const cta = $("cta");
  if (d.nextLevel) {
    cta.href = "train.html?level=" + d.nextLevel.id;
    $("ctaTitle").textContent = `Продолжить: уровень ${d.nextLevel.id} · ${d.nextLevel.title}`;
    $("ctaSub").textContent = `цель ${d.nextLevel.target_wpm} WPM · награда +${d.nextLevel.xp_reward} XP`;
  } else {
    cta.href = "train.html";
    $("ctaTitle").textContent = "Все уровни пройдены!";
    $("ctaSub").textContent = "Тренируйся свободно и улучшай рекорды";
  }

  // Неделя
  const active = new Set(d.activeDays);
  $("week").textContent = "";
  for (let i = 6; i >= 0; i--) {
    const day = new Date(); day.setDate(day.getDate() - i);
    const box = document.createElement("div");
    box.className = "day" + (active.has(ymd(day)) ? " on" : "");
    box.append(document.createElement("i"), day.toLocaleDateString("ru", { weekday: "short" }));
    $("week").append(box);
  }

  // Последние тренировки
  const list = $("recent");
  list.textContent = "";
  $("recent-empty").hidden = d.recent.length > 0;
  for (const s of d.recent) list.append(listItem(`${s.wpm} WPM · ${s.accuracy}%`, "+" + s.xp_earned + " XP", "xp"));

  // Последние достижения
  const al = $("recentAch");
  al.textContent = "";
  $("ach-empty").hidden = d.recentAchievements.length > 0;
  for (const a of d.recentAchievements) {
    const li = document.createElement("li");
    const l = document.createElement("span"); l.textContent = a.icon + "  " + a.title;
    const r = document.createElement("span"); r.className = "muted"; r.textContent = a.day;
    li.append(l, r);
    al.append(li);
  }

  drawChart(d.chart);
}

let chartObj = null;
function drawChart(rows) {
  $("chart-empty").hidden = rows.length > 0;
  document.querySelector(".chart-box").hidden = rows.length === 0;
  if (!rows.length) return;

  const css = getComputedStyle(document.documentElement);
  const teal = css.getPropertyValue("--teal").trim();
  const muted = css.getPropertyValue("--muted").trim();
  const border = css.getPropertyValue("--border").trim();
  if (chartObj) chartObj.destroy();
  chartObj = new Chart($("chart"), {
    type: "line",
    data: {
      labels: rows.map(r => r.day.slice(8) + "." + r.day.slice(5, 7)),
      datasets: [{
        data: rows.map(r => r.wpm),
        borderColor: teal, backgroundColor: teal + "22",
        fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: teal,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: muted }, grid: { color: border } },
        y: { ticks: { color: muted }, grid: { color: border }, beginAtZero: true },
      },
    },
  });
}

function renderQuests(d) {
  const box = $("quests");
  box.textContent = "";

  for (const q of d.quests) {
    const row = document.createElement("div");
    row.className = "q" + (q.done ? " done" : "");

    const t = document.createElement("span"); t.className = "t";
    t.textContent = (q.done ? "✓ " : "") + q.title;
    const r = document.createElement("span"); r.className = "r"; r.textContent = "+" + q.xp + " XP";

    const bar = document.createElement("div"); bar.className = "bar";
    const fill = document.createElement("div");
    fill.style.width = (q.target ? q.progress / q.target * 100 : 0) + "%";
    bar.append(fill);

    const n = document.createElement("div"); n.className = "n";
    if (q.done) n.textContent = "Выполнено";
    else if (q.reached) n.textContent = "Условие выполнено — награда придёт после следующей тренировки";
    else n.textContent = q.target > 1 ? `${q.progress} / ${q.target} ${q.unit}` : "Ещё не выполнено";

    row.append(t, r, bar, n);
    box.append(row);
  }

  const chest = document.createElement("div");
  chest.className = "chest" + (d.chest.done ? " done" : "");
  const a = document.createElement("span");
  a.textContent = d.chest.done ? "🎁  Сундук открыт!" : "🎁  Выполни все три — получи бонус";
  const b = document.createElement("strong"); b.textContent = "+" + d.chest.xp + " XP";
  chest.append(a, b);
  box.append(chest);
}

async function loadQuests() {
  try { renderQuests(await api("/quests")); }
  catch { $("quests").textContent = "Не удалось загрузить задания"; }
}

load();
loadQuests();
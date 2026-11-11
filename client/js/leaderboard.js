const $ = (id) => document.getElementById(id);
if (!auth.token) location.href = "login.html";

let period = "week", metric = "xp";
const MEDALS = ["🥇 ", "🥈 ", "🥉 "];

function scoreText(v) { return v + (metric === "xp" ? " XP" : " WPM"); }
function avatarColor(a) { return AVATAR_COLORS[a] || AVATAR_COLORS.teal; }

function bindTabs(boxId, onChange) {
  $(boxId).addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    $(boxId).querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b === btn));
    onChange(btn.dataset.v);
    load();
  });
}
bindTabs("tabsPeriod", v => period = v);
bindTabs("tabsMetric", v => metric = v);

async function load() {
  let d;
  try {
    d = await api(`/leaderboard?period=${period}&metric=${metric}`);
  } catch (err) {
    if (err.status === 401) { auth.clear(); location.href = "login.html"; return; }
    $("empty").hidden = false;
    $("empty").textContent = "Не удалось загрузить рейтинг";
    return;
  }
  render(d);
}

function makeRow(r, myId) {
  const row = document.createElement("div");
  row.className = "row" + (r.id === myId ? " me" : "");

  const pos = document.createElement("span"); pos.className = "pos"; pos.textContent = r.pos;
  const av = document.createElement("span"); av.className = "av"; av.style.background = avatarColor(r.avatar);
  const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = r.nickname + (r.id === myId ? " (ты)" : "");
  const lvl = document.createElement("span"); lvl.className = "lvl"; lvl.textContent = "ур. " + r.level;
  const sc = document.createElement("span"); sc.className = "sc"; sc.textContent = scoreText(r.score);

  row.append(pos, av, nm, lvl, sc);
  return row;
}

function render(d) {
  const myId = auth.user ? auth.user.id : null;

  $("note").textContent = period === "week"
    ? "Рейтинг за текущую неделю, сбрасывается в понедельник."
    : "Рейтинг за всё время.";

  const podium = $("podium"), rows = $("rows"), empty = $("empty");
  podium.textContent = ""; rows.textContent = "";

  if (!d.top.length) {
    empty.hidden = false;
    empty.textContent = "Пока никто не тренировался в этот период. Стань первым!";
    return;
  }
  empty.hidden = true;

  // Подиум: порядок 2-1-3
  const first = d.top.slice(0, 3);
  const order = [1, 0, 2].filter(i => first[i]);
  for (const i of order) {
    const r = first[i];
    const card = document.createElement("div");
    card.className = "pd p" + (i + 1) + (r.id === myId ? " me" : "");

    const medal = document.createElement("div"); medal.className = "medal"; medal.textContent = MEDALS[i];
    const av = document.createElement("div"); av.className = "av"; av.style.background = avatarColor(r.avatar);
    const nm = document.createElement("div"); nm.className = "nm"; nm.textContent = r.nickname;
    const sc = document.createElement("div"); sc.className = "sc"; sc.textContent = scoreText(r.score);

    card.append(medal, av, nm, sc);
    podium.append(card);
  }

  // Остальные места
  d.top.slice(3).forEach(r => rows.append(makeRow(r, myId)));

  // Моя строка, если я вне топ-20
  if (d.me && !d.top.some(r => r.id === d.me.id)) {
    const gap = document.createElement("div"); gap.className = "gap"; gap.textContent = "· · ·";
    rows.append(gap, makeRow(d.me, myId));
  }
}

load();
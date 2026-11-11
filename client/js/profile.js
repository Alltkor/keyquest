const $ = (id) => document.getElementById(id);
let data = null, picked = [];

function fmtTime(sec) {
  const m = Math.round(sec / 60);
  return m >= 60 ? Math.floor(m / 60) + "ч " + (m % 60) + "м" : m + "м";
}
function syncShell(user) {
  localStorage.setItem("kq_user", JSON.stringify({ ...auth.user, ...user }));
  if (window.refreshShellUser) window.refreshShellUser();
}

async function load() {
  try {
    data = await api("/profile");
  } catch (err) {
    if (err.status === 401) { auth.clear(); location.href = "login.html"; return; }
    $("pName").textContent = "Не удалось загрузить профиль";
    return;
  }
  render();
}

function render() {
  const u = data.user;
  $("pAv").style.background = AVATAR_COLORS[u.avatar] || AVATAR_COLORS.teal;
  $("pAv").textContent = u.nickname.slice(0, 1).toUpperCase();
  $("pName").textContent = u.nickname;
  $("pMeta").textContent = `Уровень ${data.level.level} · в игре с ${u.joined}`;
  $("pXp").style.width = (data.level.xpInLevel / data.level.xpNeeded * 100) + "%";
  $("pXpText").textContent = `${data.level.xpInLevel} / ${data.level.xpNeeded} XP до следующего уровня`;
  $("pStreak").textContent = "🔥  " + u.streak;
  renderShelf();
  renderFacts();
}

function renderShelf() {
  const shelf = $("shelf");
  shelf.textContent = "";
  const byCode = new Map(data.achievements.map(a => [a.code, a]));
  const codes = (data.user.showcase || []).filter(c => byCode.has(c));
  for (let i = 0; i < 6; i++) {
    const a = byCode.get(codes[i]);
    const wrap = document.createElement("div"); wrap.className = "slotwrap";
    const slot = document.createElement("div");
    slot.className = "slot" + (a ? " full r-" + a.rarity : "");
    slot.textContent = a ? a.icon : "+";
    const name = document.createElement("div"); name.className = "sn"; name.textContent = a ? a.title : "пусто";
    wrap.append(slot, name);
    shelf.append(wrap);
  }
}

function renderFacts() {
  const t = data.totals;
  const items = [
    ["ЛУЧШАЯ СКОРОСТЬ", t.best_wpm + " WPM"],
    ["СРЕДНЯЯ СКОРОСТЬ", t.avg_wpm + " WPM"],
    ["ТОЧНОСТЬ", t.avg_acc + "%"],
    ["ТРЕНИРОВОК", t.total],
    ["ВРЕМЯ В ПРАКТИКЕ", fmtTime(t.seconds)],
    ["УРОВНИ", `${data.levels.passed} / ${data.levels.total}`],
    ["ДОСТИЖЕНИЯ", `${data.achievements.length} / ${data.totalAchievements}`],
    ["СЕРИЯ", data.user.streak + " дн."],
  ];
  const box = $("facts");
  box.textContent = "";
  for (const [label, value] of items) {
    const f = document.createElement("div"); f.className = "fact";
    const s = document.createElement("small"); s.textContent = label;
    const b = document.createElement("strong"); b.textContent = value;
    f.append(s, b);
    box.append(f);
  }
}

/* ---------- Редактирование ника и аватара ---------- */
$("avatars").innerHTML = Object.entries(AVATAR_COLORS).map(([k, c]) =>
  `<label><input type="radio" name="avatar" value="${k}"><span class="av" style="background:${c}"></span></label>`).join("");

$("editBtn").onclick = () => {
  $("nick").value = data.user.nickname;
  const r = document.querySelector(`input[name=avatar][value=${data.user.avatar}]`);
  if (r) r.checked = true;
  $("nickMsg").textContent = ""; $("editErr").textContent = "";
  $("editCard").hidden = false;
};
$("cancelEdit").onclick = () => { $("editCard").hidden = true; };

$("saveEdit").onclick = async () => {
  $("nickMsg").textContent = ""; $("editErr").textContent = "";
  try {
    const r = await api("/profile", {
      method: "PATCH",
      body: JSON.stringify({
        nickname: $("nick").value,
        avatar: document.querySelector("input[name=avatar]:checked").value,
      }),
    });
    syncShell(r.user);
    $("editCard").hidden = true;
    await load();
  } catch (err) {
    if (err.errors && err.errors.nickname) $("nickMsg").textContent = err.errors.nickname;
    else $("editErr").textContent = (err.errors && Object.values(err.errors)[0]) || err.error || "Не удалось сохранить";
  }
};

/* ---------- Витрина значков ---------- */
function renderPicker() {
  const grid = $("pickGrid");
  grid.textContent = "";
  if (!data.achievements.length) {
    grid.textContent = "Пока нет значков — проходи уровни!";
    return;
  }
  for (const a of data.achievements) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pick" + (picked.includes(a.code) ? " on" : "");
    b.textContent = a.icon + " " + a.title;
    b.onclick = () => {
      if (picked.includes(a.code)) picked = picked.filter(c => c !== a.code);
      else if (picked.length < 6) picked.push(a.code);
      renderPicker();
    };
    grid.append(b);
  }
  $("pickCount").textContent = `${picked.length} / 6`;
}

$("shelfBtn").onclick = () => {
  const owned = new Set(data.achievements.map(a => a.code));
  picked = (data.user.showcase || []).filter(c => owned.has(c));
  $("pickErr").textContent = "";
  $("picker").hidden = false;
  renderPicker();
};
$("pickCancel").onclick = () => { $("picker").hidden = true; };

$("pickSave").onclick = async () => {
  $("pickErr").textContent = "";
  try {
    await api("/profile", { method: "PATCH", body: JSON.stringify({ showcase: picked }) });
    $("picker").hidden = true;
    await load();
  } catch (err) {
    $("pickErr").textContent = (err.errors && err.errors.showcase) || err.error || "Не удалось сохранить";
  }
};

load();
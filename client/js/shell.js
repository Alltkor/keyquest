(function () {
  if (!auth.token) { location.href = "login.html"; return; }

  const page = location.pathname.split("/").pop() || "index.html";
  const MENU = [
    ["dashboard.html", "Главная"], ["practice.html", "Тренировка"], ["levels.html", "Уровни"],
    ["leaderboard.html", "Рейтинг"], ["achievements.html", "Достижения"],
    ["profile.html", "Профиль"], ["settings.html", "Настройки"],
  ];
  const BOTTOM = [
    ["dashboard.html", "Главная"], ["levels.html", "Уровни"], ["practice.html", "Тренировка"],
    ["leaderboard.html", "Рейтинг"], ["profile.html", "Профиль"],
  ];

  function link(href, label, cls) {
    const a = document.createElement("a");
    a.href = href;
    a.className = cls + (page === href ? " active" : "");
    a.append(document.createElement("i"), label);
    return a;
  }

  // Боковое меню
  const side = document.createElement("aside");
  side.className = "side";
  const brand = document.createElement("a");
  brand.className = "brand"; brand.href = "index.html"; brand.textContent = "◆ KeyQuest";
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Основное меню");
  MENU.forEach(([h, l]) => nav.append(link(h, l, "nav-item")));

  const foot = document.createElement("div");
  foot.className = "side-foot";
  const card = document.createElement("div");
  card.className = "user-card";
  const themeBtn = document.createElement("button");
  themeBtn.className = "btn btn-outline"; themeBtn.textContent = "Сменить тему";
  themeBtn.onclick = toggleTheme;
  const outBtn = document.createElement("button");
  outBtn.className = "btn btn-outline"; outBtn.textContent = "Выйти";
  outBtn.onclick = () => { auth.clear(); location.href = "login.html"; };
  foot.append(card, themeBtn, outBtn);
  side.append(brand, nav, foot);

  // Нижняя панель (телефон)
  const bottom = document.createElement("nav");
  bottom.className = "bottom";
  bottom.setAttribute("aria-label", "Меню");
  BOTTOM.forEach(([h, l]) => bottom.append(link(h, l, "")));

  function renderUser() {
    card.textContent = "";
    const u = auth.user;
    if (!u) return;
    const av = document.createElement("span");
    av.className = "av";
    av.style.background = AVATAR_COLORS[u.avatar] || AVATAR_COLORS.teal;
    const box = document.createElement("div");
    const name = document.createElement("b"); name.textContent = u.nickname;
    const meta = document.createElement("small"); meta.textContent = `ур. ${u.level} · 🔥  ${u.streak}`;
    box.append(name, meta);
    card.append(av, box);
  }

  // Оборачиваем содержимое страницы
  const main = document.querySelector("main");
  const shell = document.createElement("div");
  shell.className = "shell";
  const content = document.createElement("div");
  content.className = "content";
  main.before(shell);
  content.append(main);
  shell.append(side, content, bottom);

  renderUser();
  window.refreshShellUser = renderUser;
})();
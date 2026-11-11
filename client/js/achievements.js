const $ = (id) => document.getElementById(id);
if (!auth.token) location.href = "login.html";

const RARITY = { common: "ОБЫЧНОЕ", rare: "РЕДКОЕ", epic: "ЭПИЧЕСКОЕ" };

async function load() {
  let list;
  try {
    list = (await api("/achievements")).achievements;
  } catch (err) {
    if (err.status === 401) { auth.clear(); location.href = "login.html"; return; }
    $("grid").textContent = "Не удалось загрузить достижения";
    return;
  }

  const got = list.filter(a => a.earned).length;
  $("count").textContent = `Получено ${got} из ${list.length}`;

  // Сначала полученные, потом закрытые
  list.sort((a, b) => Number(b.earned) - Number(a.earned));

  const grid = $("grid");
  grid.textContent = "";
  for (const a of list) {
    const card = document.createElement("div");
    card.className = `card ach r-${a.rarity}` + (a.earned ? "" : " locked");

    const tag = document.createElement("div"); tag.className = "tag"; tag.textContent = RARITY[a.rarity];
    const ico = document.createElement("div"); ico.className = "ico"; ico.textContent = a.icon;
    const h = document.createElement("h3"); h.textContent = a.title;
    const p = document.createElement("p"); p.textContent = a.description;
    card.append(tag, ico, h, p);

    if (a.earned) {
      const d = document.createElement("div"); d.className = "date";
      d.textContent = "Получено " + new Date(a.earned_at).toLocaleDateString("ru");
      card.append(d);
    }
    grid.append(card);
  }
}
load();
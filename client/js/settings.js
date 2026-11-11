const $ = (id) => document.getElementById(id);
const root = document.documentElement;

function say(text) {
  $("status").textContent = text;
  setTimeout(() => { if ($("status").textContent === text) $("status").textContent = ""; }, 2500);
}

// Тема
$("sw-theme").checked = root.dataset.theme === "light";
$("sw-theme").onchange = (e) => setTheme(e.target.checked ? "light" : "dark");

// Уменьшить движение
$("sw-motion").checked = localStorage.getItem("kq_motion") === "reduce";
$("sw-motion").onchange = (e) => {
  const v = e.target.checked ? "reduce" : "full";
  localStorage.setItem("kq_motion", v);
  root.dataset.motion = v;
};

// Экранная клавиатура (общая с экраном тренировки)
$("sw-kb").checked = localStorage.getItem("kq_kb") !== "off";
$("sw-kb").onchange = (e) => localStorage.setItem("kq_kb", e.target.checked ? "on" : "off");

// Звуки
$("sw-sound").checked = localStorage.getItem("kq_sound") === "on";
$("sw-sound").onchange = (e) => {
  localStorage.setItem("kq_sound", e.target.checked ? "on" : "off");
  if (e.target.checked) playKey(true);
};
$("soundTest").onclick = () => playKey(true, true);

// Приватность (хранится на сервере)
(async () => {
  try {
    const d = await api("/profile");
    $("sw-lb").checked = d.user.show_in_leaderboard;
  } catch (e) { /* оставим значение по умолчанию */ }
})();

$("sw-lb").onchange = async (e) => {
  const want = e.target.checked;
  try {
    await api("/profile/settings", { method: "PATCH", body: JSON.stringify({ show_in_leaderboard: want }) });
    say(want ? "Ты виден в рейтинге" : "Ты скрыт из рейтинга");
  } catch (err) {
    e.target.checked = !want;
    say("Не удалось сохранить настройку");
  }
};

$("logout").onclick = () => { auth.clear(); location.href = "login.html"; };

// Язык текстов
$("sel-lang").value = localStorage.getItem("kq_lang") === "ru" ? "ru" : "en";
$("sel-lang").onchange = (e) => localStorage.setItem("kq_lang", e.target.value);
document.documentElement.dataset.theme = localStorage.getItem("theme") || "dark";
document.documentElement.dataset.motion = localStorage.getItem("kq_motion") || "full";

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem("theme", t);
}
function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}
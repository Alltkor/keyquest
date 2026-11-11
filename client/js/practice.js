const $ = (id) => document.getElementById(id);

// Приводим «умные» кавычки и тире к тем, что есть на клавиатуре
function cleanCustomText(t) {
  return t.replace(/[“”«»„]/g, '"').replace(/[‘’]/g, "'")
          .replace(/[—–]/g, "-").replace(/…/g, "...")
          .replace(/\s+/g, " ").trim().slice(0, 400);
}

const sel = $("lang");
sel.value = localStorage.getItem("kq_lang") === "ru" ? "ru" : "en";
sel.onchange = () => localStorage.setItem("kq_lang", sel.value);

const ta = $("custom");
ta.addEventListener("input", () => {
  $("count").textContent = `${ta.value.length} / 400`;
  $("go").disabled = cleanCustomText(ta.value).length < 10;
});

$("go").onclick = () => {
  sessionStorage.setItem("kq_custom", cleanCustomText(ta.value));
  location.href = "train.html?custom=1";
};
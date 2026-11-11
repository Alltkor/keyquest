const LAYOUTS = {
  en: {
    rows: ["1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"],
    shift: { "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9",
             ")": "0", "_": "-", "+": "=", "{": "[", "}": "]", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/" },
    left: "12345qwertasdfgzxcvb",
  },
  ru: {
    rows: ["1234567890-=", "йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю."],
    shift: { "!": "1", '"': "2", "№": "3", ";": "4", "%": "5", ":": "6", "?": "7", "*": "8", "(": "9",
             ")": "0", "_": "-", "+": "=", ",": "." },
    left: "12345йцукефывапячсми",
  },
};

let kbLayout = "en";
let kbKeys = {}, kbShiftL = null, kbShiftR = null, kbLast = [];

function kbMake(label, cls) {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = label;
  return d;
}

function buildKeyboard(box, layout = "en") {
  kbLayout = LAYOUTS[layout] ? layout : "en";
  kbKeys = {}; kbLast = [];
  box.textContent = "";
  LAYOUTS[kbLayout].rows.forEach((row, i) => {
    const r = document.createElement("div");
    r.className = "kb-row";
    if (i === 3) { kbShiftL = kbMake("⇧", "key wide"); r.append(kbShiftL); }
    for (const ch of row) {
      const k = kbMake(ch, "key");
      kbKeys[ch] = k;
      r.append(k);
    }
    if (i === 3) { kbShiftR = kbMake("⇧", "key wide"); r.append(kbShiftR); }
    box.append(r);
  });
  const sr = document.createElement("div");
  sr.className = "kb-row";
  kbKeys[" "] = kbMake("", "key space");
  sr.append(kbKeys[" "]);
  box.append(sr);
}

// Какие клавиши нужно нажать, чтобы получить символ
function keysFor(ch) {
  if (ch === " ") return [kbKeys[" "]];
  const L = LAYOUTS[kbLayout];
  let base = ch, shift = false;
  if (ch !== ch.toLowerCase()) { base = ch.toLowerCase(); shift = true; }   // заглавная буква
  else if (L.shift[ch]) { base = L.shift[ch]; shift = true; }               // символ с Shift
  if (!kbKeys[base]) return [];                                             // такой клавиши нет на схеме
  const out = [kbKeys[base]];
  if (shift) out.push(L.left.includes(base) ? kbShiftR : kbShiftL);         // Shift нажимает другая рука
  return out.filter(Boolean);
}

function showNextKey(ch) {
  kbLast.forEach(k => k.classList.remove("next"));
  kbLast = ch ? keysFor(ch) : [];
  kbLast.forEach(k => k.classList.add("next"));
}

function flashKey(ch, ok) {
  const cls = ok ? "hit" : "err";
  keysFor(ch).forEach(k => {
    k.classList.add(cls);
    setTimeout(() => k.classList.remove(cls), 150);
  });
}
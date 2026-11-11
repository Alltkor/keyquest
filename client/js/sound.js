let _ac = null;

function playKey(ok = true, force = false) {
  if (!force && localStorage.getItem("kq_sound") !== "on") return;
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = _ac.createOscillator(), g = _ac.createGain();
    o.type = ok ? "triangle" : "square";
    o.frequency.value = ok ? 520 + Math.random() * 60 : 150;
    g.gain.setValueAtTime(0.06, _ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, _ac.currentTime + 0.06);
    o.connect(g); g.connect(_ac.destination);
    o.start(); o.stop(_ac.currentTime + 0.07);
  } catch (e) { /* звук недоступен — не страшно */ }
}
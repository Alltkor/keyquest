const TARGET_WPM = 30;   // целевая скорость уровня (позже будет у каждого уровня своя)

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("kq_progress")) || { xp: 0, bestWpm: 0, sessions: [] };
  } catch { return { xp: 0, bestWpm: 0, sessions: [] }; }
}

function saveProgress(p) {
  localStorage.setItem("kq_progress", JSON.stringify(p));
}

// Уровень N -> N+1 требует 150*N XP
function levelInfo(totalXp) {
  let level = 1, left = totalXp;
  while (left >= 150 * level) { left -= 150 * level; level++; }
  return { level, xpInLevel: left, xpNeeded: 150 * level };
}

function calcStars(wpm, accuracy) {
  let stars = 1;                                          // за прохождение
  if (accuracy >= 90) stars++;
  if (accuracy >= 95 && wpm >= TARGET_WPM) stars++;
  return stars;
}

// Главная функция: принимает движок, обновляет прогресс, возвращает итог
function finishSession(engine) {
  const p = loadProgress();
  const wpm = engine.wpm, accuracy = engine.accuracy;
  const prevBest = p.bestWpm;
  const isRecord = prevBest > 0 && wpm > prevBest;

  let xp = Math.round(engine.text.length * accuracy / 100);   // длина текста × точность
  if (isRecord) xp += 20;                                      // бонус за рекорд

  const before = levelInfo(p.xp);
  p.xp += xp;
  p.bestWpm = Math.max(p.bestWpm, wpm);
  p.sessions.push({ wpm, accuracy, seconds: Math.round(engine.seconds), xp, date: Date.now() });
  saveProgress(p);
  const after = levelInfo(p.xp);

  return { wpm, accuracy, seconds: engine.seconds, xp, isRecord, prevBest,
           stars: calcStars(wpm, accuracy), leveledUp: after.level > before.level, level: after };
}
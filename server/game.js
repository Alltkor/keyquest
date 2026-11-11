// Уровень N -> N+1 требует 150*N XP
function levelInfo(totalXp) {
  let level = 1, left = totalXp;
  while (left >= 150 * level) { left -= 150 * level; level++; }
  return { level, xpInLevel: left, xpNeeded: 150 * level };
}

function calcStars(wpm, accuracy, target = 30) {
  if (accuracy < 90 || wpm < target) return 0;     // не пройдено
  let stars = 1;
  if (accuracy >= 95) stars = 2;
  if (accuracy >= 97 && wpm >= target * 1.25) stars = 3;
  return stars;
}

module.exports = { levelInfo, calcStars };
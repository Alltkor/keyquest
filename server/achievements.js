const ACHIEVEMENTS = [
  { code: "first_steps", icon: "👣 ", rarity: "common", title: "Первые шаги",
    description: "Заверши первую тренировку", check: c => c.totalSessions >= 1 },
  { code: "level_1", icon: "🏁 ", rarity: "common", title: "Старт взят",
    description: "Пройди первый уровень", check: c => c.passedLevels >= 1 },
  { code: "wpm_30", icon: "⚡ ", rarity: "common", title: "Разгон",
    description: "Достигни скорости 30 WPM", check: c => c.wpm >= 30 },
  { code: "wpm_50", icon: "🚀 ", rarity: "rare", title: "Скоростной",
    description: "Достигни скорости 50 WPM", check: c => c.wpm >= 50 },
  { code: "wpm_70", icon: "🌩️ ", rarity: "epic", title: "Молния",
    description: "Достигни скорости 70 WPM", check: c => c.wpm >= 70 },
  { code: "perfect", icon: "🎯 ", rarity: "rare", title: "Чистая работа",
    description: "Напечатай текст с точностью 100%", check: c => c.accuracy === 100 },
  { code: "three_stars", icon: "🌟 ", rarity: "rare", title: "Три звезды",
    description: "Получи 3 звезды за уровень", check: c => c.stars === 3 },
  { code: "record", icon: "👑 ", rarity: "common", title: "Рекордсмен",
    description: "Побей свой личный рекорд скорости", check: c => c.isRecord },
  { code: "streak_3", icon: "🔥 ", rarity: "common", title: "Огонёк",
    description: "Серия 3 дня подряд", check: c => c.streak >= 3 },
  { code: "streak_7", icon: "🔥 ", rarity: "rare", title: "Неделя огня",
    description: "Серия 7 дней подряд", check: c => c.streak >= 7 },
  { code: "streak_30", icon: "🏆 ", rarity: "epic", title: "Железная воля",
    description: "Серия 30 дней подряд", check: c => c.streak >= 30 },
  { code: "sessions_10", icon: "💪 ", rarity: "common", title: "Разминка",
    description: "Заверши 10 тренировок", check: c => c.totalSessions >= 10 },
  { code: "sessions_50", icon: "🏋️ ", rarity: "rare", title: "Постоянство",
    description: "Заверши 50 тренировок", check: c => c.totalSessions >= 50 },
  { code: "map_complete", icon: "🗺️ ", rarity: "epic", title: "Покоритель карты",
    description: "Пройди все уровни", check: c => c.totalLevels > 0 && c.passedLevels >= c.totalLevels },
];

function publicAch(a) {
  return { code: a.code, icon: a.icon, rarity: a.rarity, title: a.title, description: a.description };
}

// Выдаёт новые достижения; client — подключение внутри транзакции
async function grantAchievements(client, userId, ctx) {
  const have = await client.query("SELECT code FROM user_achievements WHERE user_id = $1", [userId]);
  const owned = new Set(have.rows.map(r => r.code));
  const earned = [];

  for (const a of ACHIEVEMENTS) {
    if (owned.has(a.code) || !a.check(ctx)) continue;
    await client.query(
      "INSERT INTO user_achievements (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, a.code]);
    earned.push(publicAch(a));
  }
  return earned;
}

module.exports = { ACHIEVEMENTS, publicAch, grantAchievements };
const DEFS = {
  words_150:   { title: "Напечатай 150 слов",              metric: "words",    target: 150, div: 1,  unit: "слов",      xp: 30 },
  words_250:   { title: "Напечатай 250 слов",              metric: "words",    target: 250, div: 1,  unit: "слов",      xp: 50 },
  sessions_3:  { title: "Заверши 3 тренировки",            metric: "sessions", target: 3,   div: 1,  unit: "трен.",     xp: 30 },
  minutes_5:   { title: "Тренируйся 5 минут",              metric: "seconds",  target: 300, div: 60, unit: "мин",       xp: 40 },
  accuracy_98: { title: "Тренировка с точностью 98%+",     metric: "acc98",    target: 1,   div: 1,  unit: "",          xp: 50 },
  speed_40:    { title: "Достигни скорости 40 WPM",        metric: "maxwpm",   target: 40,  div: 1,  unit: "WPM",       xp: 50 },
  clean_2:     { title: "Две тренировки с точностью 95%+", metric: "acc95",    target: 2,   div: 1,  unit: "трен.",     xp: 60 },
  sessions_5:  { title: "Заверши 5 тренировок",            metric: "sessions", target: 5,   div: 1,  unit: "трен.",     xp: 50 },
  minutes_10:  { title: "Тренируйся 10 минут",             metric: "seconds",  target: 600, div: 60, unit: "мин",       xp: 60 },
  words_400:   { title: "Напечатай 400 слов",              metric: "words",    target: 400, div: 1,  unit: "слов",      xp: 80 },
};

// Три слота: из каждого берём по одному заданию в день
const SLOTS = [
  ["words_150", "words_250", "sessions_3", "minutes_5"],
  ["accuracy_98", "speed_40", "clean_2"],
  ["sessions_5", "minutes_10", "words_400"],
];
const CHEST_XP = 50;

async function todaySeed(db) {
  const r = await db.query("SELECT to_char(CURRENT_DATE, 'YYYYMMDD')::int AS seed");
  return r.rows[0].seed;
}

function pickQuests(seed) {
  return SLOTS.map((list, i) => list[(seed + i * 3) % list.length]);
}

// Прогресс по сегодняшним тренировкам
async function todayProgress(db, userId) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS sessions,
            COALESCE(SUM(duration), 0)::int AS seconds,
            COALESCE(ROUND(SUM(wpm * duration / 60.0)), 0)::int AS words,
            COALESCE(MAX(wpm), 0)::int AS maxwpm,
            (COUNT(*) FILTER (WHERE accuracy >= 98))::int AS acc98,
            (COUNT(*) FILTER (WHERE accuracy >= 95))::int AS acc95
     FROM sessions
     WHERE user_id = $1 AND created_at::date = CURRENT_DATE`, [userId]);
  return r.rows[0];
}

// Состояние заданий на сегодня (db — pool или подключение внутри транзакции)
async function getQuestState(db, userId) {
  const seed = await todaySeed(db);
  const prog = await todayProgress(db, userId);
  const claimedRes = await db.query(
    "SELECT code FROM quest_claims WHERE user_id = $1 AND day = CURRENT_DATE", [userId]);
  const claimed = new Set(claimedRes.rows.map(r => r.code));

  const quests = pickQuests(seed).map(code => {
    const d = DEFS[code];
    const raw = prog[d.metric];
    return {
      code, title: d.title, xp: d.xp, unit: d.unit,
      target: Math.round(d.target / d.div),
      progress: Math.round(Math.min(raw, d.target) / d.div),
      reached: raw >= d.target,
      done: claimed.has(code),
    };
  });
  return { quests, chest: { xp: CHEST_XP, done: claimed.has("chest") } };
}

// Выдаёт награды за новые выполненные задания; вызывается после сохранения тренировки
async function settleQuests(client, userId) {
  const state = await getQuestState(client, userId);
  let xp = 0;
  const completed = [];

  for (const q of state.quests) {
    if (q.done || !q.reached) continue;
    await client.query(
      "INSERT INTO quest_claims (user_id, day, code) VALUES ($1, CURRENT_DATE, $2) ON CONFLICT DO NOTHING",
      [userId, q.code]);
    q.done = true;
    xp += q.xp;
    completed.push({ code: q.code, title: q.title, xp: q.xp });
  }

  if (!state.chest.done && state.quests.every(q => q.done)) {
    await client.query(
      "INSERT INTO quest_claims (user_id, day, code) VALUES ($1, CURRENT_DATE, 'chest') ON CONFLICT DO NOTHING",
      [userId]);
      xp += CHEST_XP;
    completed.push({ code: "chest", title: "Все задания дня выполнены", xp: CHEST_XP });
  }
  return { xp, completed };
}

module.exports = { getQuestState, settleQuests };
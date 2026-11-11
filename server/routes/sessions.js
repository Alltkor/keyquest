const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");
const { levelInfo, calcStars } = require("../game");
const { grantAchievements } = require("../achievements");
const { settleQuests } = require("../quests");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { textId, wpm, accuracy, duration } = req.body || {};

  const valid =
    Number.isInteger(textId) &&
    Number.isInteger(wpm) && wpm >= 0 && wpm <= 250 &&
    Number.isInteger(accuracy) && accuracy >= 0 && accuracy <= 100 &&
    Number.isInteger(duration) && duration >= 1 && duration <= 3600;
  if (!valid) return res.status(400).json({ error: "Некорректные данные тренировки" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Текст и его уровень
    const t = await client.query("SELECT content, level FROM texts WHERE id = $1", [textId]);
    if (!t.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Текст не найден" });
    }
    const length = t.rows[0].content.length;
    const lvlRes = await client.query("SELECT * FROM levels WHERE id = $1", [t.rows[0].level]);
    const lvl = lvlRes.rows[0];
    const target = lvl ? lvl.target_wpm : 30;
    const stars = calcStars(wpm, accuracy, target);

    // Личный рекорд
    const best = await client.query(
      "SELECT COALESCE(MAX(wpm), 0) AS best FROM sessions WHERE user_id = $1", [req.userId]);
    const prevBest = best.rows[0].best;
    const isRecord = prevBest > 0 && wpm > prevBest;

    // Прогресс по уровню
    let levelBonus = 0, nextLevelId = null;
    if (lvl && stars > 0) {
      let unlocked = lvl.id === 1;
      if (!unlocked) {
        const prev = await client.query(
          "SELECT stars FROM user_levels WHERE user_id = $1 AND level_id = $2",
          [req.userId, lvl.id - 1]);
        unlocked = !!prev.rows[0] && prev.rows[0].stars > 0;
      }
      if (unlocked) {
        const cur = await client.query(
          "SELECT stars FROM user_levels WHERE user_id = $1 AND level_id = $2",
          [req.userId, lvl.id]);
        if (!cur.rows[0] || cur.rows[0].stars === 0) levelBonus = lvl.xp_reward;   // первое прохождение

        await client.query(
          `INSERT INTO user_levels (user_id, level_id, stars, best_wpm)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, level_id) DO UPDATE SET
             stars = GREATEST(user_levels.stars, EXCLUDED.stars),
             best_wpm = GREATEST(user_levels.best_wpm, EXCLUDED.best_wpm)`,
          [req.userId, lvl.id, stars, wpm]);

        const next = await client.query("SELECT id FROM levels WHERE id = $1", [lvl.id + 1]);
        nextLevelId = next.rows[0] ? next.rows[0].id : null;
      }
    }

    // XP
    let xp = Math.round(length * accuracy / 100);
    if (isRecord) xp += 20;
    xp += levelBonus;

    await client.query(
      `INSERT INTO sessions (user_id, text_id, wpm, accuracy, duration, xp_earned)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, textId, wpm, accuracy, duration, xp]);
    
    // Ежедневные задания
    const quest = await settleQuests(client, req.userId);

    // Пользователь: XP, уровень аккаунта, серия
    const cur = await client.query("SELECT xp FROM users WHERE id = $1", [req.userId]);
    const before = levelInfo(cur.rows[0].xp);
    const newXp = cur.rows[0].xp + xp + quest.xp;
    const after = levelInfo(newXp);

    const upd = await client.query(
      `UPDATE users SET
         xp = $1, level = $2,
         streak = CASE
           WHEN last_active = CURRENT_DATE THEN streak
           WHEN last_active = CURRENT_DATE - 1 THEN streak + 1
           ELSE 1 END,
         last_active = CURRENT_DATE
       WHERE id = $3
       RETURNING id, email, nickname, avatar, xp, level, streak`,
      [newXp, after.level, req.userId]);
    
    const cnt = await client.query("SELECT COUNT(*)::int AS n FROM sessions WHERE user_id = $1", [req.userId]);
    const pl = await client.query("SELECT COUNT(*)::int AS n FROM user_levels WHERE user_id = $1 AND stars > 0", [req.userId]);
    const tl = await client.query("SELECT COUNT(*)::int AS n FROM levels");

    const achievements = await grantAchievements(client, req.userId, {
      wpm, accuracy, duration, stars, isRecord,
      streak: upd.rows[0].streak,
      totalSessions: cnt.rows[0].n,
      passedLevels: pl.rows[0].n,
      totalLevels: tl.rows[0].n,
    });

    await client.query("COMMIT");

    res.status(201).json({
      wpm, accuracy, seconds: duration, xp, isRecord, prevBest,
      stars, passed: stars > 0, target, levelBonus, nextLevelId,
      leveledUp: after.level > before.level,
      level: after,
      streak: upd.rows[0].streak,
      achievements, quests: quest.completed,
      questXp: quest.xp,
      user: upd.rows[0]
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
});

module.exports = router;
const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");
const { levelInfo } = require("../game");
const { ACHIEVEMENTS } = require("../achievements");

const router = express.Router();
const DAILY_GOAL_WORDS = 300;

router.get("/stats", requireAuth, async (req, res) => {
  try {
    const id = req.userId;

    const [userQ, totalsQ, weekQ, todayQ, chartQ, daysQ, recentQ, achQ, nextQ] = await Promise.all([
      pool.query(
        "SELECT id, email, nickname, avatar, xp, level, streak FROM users WHERE id = $1", [id]),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COALESCE(ROUND(AVG(wpm)), 0)::int AS avg_wpm,
                COALESCE(ROUND(AVG(accuracy)), 0)::int AS avg_acc,
                COALESCE(MAX(wpm), 0)::int AS best_wpm
         FROM sessions WHERE user_id = $1`, [id]),
      pool.query(
        `SELECT COALESCE(SUM(duration), 0)::int AS seconds
         FROM sessions WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`, [id]),
      pool.query(
        `SELECT COALESCE(ROUND(SUM(wpm * duration / 60.0)), 0)::int AS words
         FROM sessions WHERE user_id = $1 AND created_at::date = CURRENT_DATE`, [id]),
      pool.query(
        `SELECT to_char(created_at, 'YYYY-MM-DD') AS day, ROUND(AVG(wpm))::int AS wpm
         FROM sessions WHERE user_id = $1 AND created_at >= CURRENT_DATE - 13
         GROUP BY 1 ORDER BY 1`, [id]),
      pool.query(
        `SELECT DISTINCT to_char(created_at, 'YYYY-MM-DD') AS day
         FROM sessions WHERE user_id = $1 AND created_at >= CURRENT_DATE - 6`, [id]),
      pool.query(
        `SELECT wpm, accuracy, xp_earned,
                to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS at
         FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [id]),
      pool.query(
        `SELECT code, to_char(earned_at, 'DD.MM.YYYY') AS day
         FROM user_achievements WHERE user_id = $1 ORDER BY earned_at DESC LIMIT 3`, [id]),
      pool.query(
        `SELECT l.id, l.category, l.title, l.target_wpm, l.xp_reward
         FROM levels l
         LEFT JOIN user_levels ul ON ul.level_id = l.id AND ul.user_id = $1
         WHERE COALESCE(ul.stars, 0) = 0
         ORDER BY l.id LIMIT 1`, [id]),
    ]);

    const user = userQ.rows[0];
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const defs = new Map(ACHIEVEMENTS.map(a => [a.code, a]));
    const recentAchievements = achQ.rows
      .filter(r => defs.has(r.code))
      .map(r => {
        const a = defs.get(r.code);
        return { icon: a.icon, title: a.title, rarity: a.rarity, day: r.day };
      });

    res.json({
      user,
      level: levelInfo(user.xp),
      totals: totalsQ.rows[0],
      weekSeconds: weekQ.rows[0].seconds,
      daily: { goal: DAILY_GOAL_WORDS, words: todayQ.rows[0].words },
      chart: chartQ.rows,
      activeDays: daysQ.rows.map(r => r.day),
      recent: recentQ.rows,
      recentAchievements,
      nextLevel: nextQ.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
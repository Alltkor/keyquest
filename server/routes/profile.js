const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");
const { levelInfo } = require("../game");
const { ACHIEVEMENTS, publicAch } = require("../achievements");

const router = express.Router();
const AVATARS = ["teal", "violet", "amber", "rose", "green", "blue", "orange", "gray"];

router.get("/", requireAuth, async (req, res) => {
  try {
    const id = req.userId;
    const [userQ, totalsQ, passedQ, levelsQ, achQ] = await Promise.all([
      pool.query(
        `SELECT id, nickname, avatar, xp, level, streak, showcase, show_in_leaderboard,
                to_char(created_at, 'DD.MM.YYYY') AS joined
         FROM users WHERE id = $1`, [id]),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COALESCE(ROUND(AVG(wpm)), 0)::int AS avg_wpm,
                COALESCE(ROUND(AVG(accuracy)), 0)::int AS avg_acc,
                COALESCE(MAX(wpm), 0)::int AS best_wpm,
                COALESCE(SUM(duration), 0)::int AS seconds
         FROM sessions WHERE user_id = $1`, [id]),
      pool.query("SELECT COUNT(*)::int AS n FROM user_levels WHERE user_id = $1 AND stars > 0", [id]),
      pool.query("SELECT COUNT(*)::int AS n FROM levels"),
      pool.query(
        `SELECT code, to_char(earned_at, 'DD.MM.YYYY') AS day
         FROM user_achievements WHERE user_id = $1 ORDER BY earned_at DESC`, [id]),
    ]);

    const user = userQ.rows[0];
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const defs = new Map(ACHIEVEMENTS.map(a => [a.code, a]));
    const achievements = achQ.rows
      .filter(r => defs.has(r.code))
      .map(r => ({ ...publicAch(defs.get(r.code)), day: r.day }));

    res.json({
      user,
      level: levelInfo(user.xp),
      totals: totalsQ.rows[0],
      levels: { passed: passedQ.rows[0].n, total: levelsQ.rows[0].n },
      achievements,
      totalAchievements: ACHIEVEMENTS.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Смена ника, аватара и витрины значков
router.patch("/", requireAuth, async (req, res) => {
  try {
    const { nickname, avatar, showcase } = req.body || {};
    const errors = {};
    const sets = [], vals = [];

    if (nickname !== undefined) {
      const n = String(nickname).trim();
      if (n.length < 3 || n.length > 20) errors.nickname = "Ник: от 3 до 20 символов";
      else { vals.push(n); sets.push(`nickname = $${vals.length}`); }
    }
    if (avatar !== undefined) {
      if (!AVATARS.includes(avatar)) errors.avatar = "Неизвестный аватар";
      else { vals.push(avatar); sets.push(`avatar = $${vals.length}`); }
    }
    if (showcase !== undefined) {
      if (!Array.isArray(showcase) || showcase.length > 6) errors.showcase = "Не больше 6 значков";
      else {
        const have = await pool.query("SELECT code FROM user_achievements WHERE user_id = $1", [req.userId]);
        const owned = new Set(have.rows.map(r => r.code));
        const clean = [...new Set(showcase)].filter(c => typeof c === "string" && owned.has(c));
        vals.push(clean); sets.push(`showcase = $${vals.length}`);
      }
    }
    if (Object.keys(errors).length) return res.status(400).json({ errors });
    if (!sets.length) return res.status(400).json({ error: "Нечего обновлять" });

    vals.push(req.userId);
    const r = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.length}
       RETURNING id, email, nickname, avatar, xp, level, streak`, vals);
    res.json({ user: r.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ errors: { nickname: "Этот ник уже занят" } });
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Приватность
router.patch("/settings", requireAuth, async (req, res) => {
  try {
    const v = (req.body || {}).show_in_leaderboard;
    if (typeof v !== "boolean") return res.status(400).json({ error: "Некорректное значение" });
    await pool.query("UPDATE users SET show_in_leaderboard = $1 WHERE id = $2", [v, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
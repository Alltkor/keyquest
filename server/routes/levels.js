const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Все уровни со статусами для пользователя 
async function loadLevels(userId) {
  const r = await pool.query(
    `SELECT l.id, l.category, l.title, l.description, l.target_wpm, l.xp_reward,
            COALESCE(ul.stars, 0)    AS stars,
            COALESCE(ul.best_wpm, 0) AS best_wpm
     FROM levels l
     LEFT JOIN user_levels ul ON ul.level_id = l.id AND ul.user_id = $1
     ORDER BY l.id`, [userId]);

  let prevDone = true;
  return r.rows.map(l => {
    const done = l.stars > 0;
    const unlocked = prevDone;
    prevDone = done;
    return { ...l, status: done ? "done" : unlocked ? "current" : "locked" };
  });
}

router.get("/", requireAuth, async (req, res) => {
    try {
        res.json({ levels: await loadLevels(req.userId) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.get("/:id/text", requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const levels = await loadLevels(req.userId);
        const level = levels.find(l => l.id === id);
        if (!level) return res.status(404).json({ error: "Уровень не найден" });
        if (level.status === "locked") return res.status(403).json({ error: "Уровень еще закрыт" });

        const lang = req.query.lang === "ru" ? "ru" : "en";
        const t = await pool.query(
            "SELECT id, content FROM texts WHERE level = $1 AND lang = $2 ORDER BY RANDOM() LIMIT 1", [id, lang]);
        if (!t.rows[0]) return res.status(404).json({ error: "Для уровня нет текстов" });

        res.json({
            id: t.rows[0].id,
            content: t.rows[0].content,
            level: { id: level.id, title: level.title, category: level.category, target_wpm: level.target_wpm, xp_reward: level.xp_reward, status: level.status }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

module.exports = router;
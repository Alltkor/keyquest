const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Выражения подставляем в SQL только из этого белого списка (не от пользователя)
const METRICS = { xp: "SUM(s.xp_earned)", wpm: "MAX(s.wpm)" };

router.get("/", requireAuth, async (req, res) => {
  try {
    const metric = ["xp", "wpm"].includes(req.query.metric) ? req.query.metric : "xp";
    const period = req.query.period === "all" ? "all" : "week";
    const m = METRICS[metric];
    const conds = ["u.show_in_leaderboard"];
    if (period === "week") conds.push("s.created_at >= date_trunc('week', CURRENT_DATE)");
    const where = "WHERE " + conds.join(" AND ");

    const cte = `
      WITH ranked AS (
        SELECT u.id, u.nickname, u.avatar, u.level,
               ${m}::int AS score,
               (RANK() OVER (ORDER BY ${m} DESC))::int AS pos
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        ${where}
        GROUP BY u.id
      )`;

    const top   = await pool.query(`${cte} SELECT * FROM ranked ORDER BY pos, id LIMIT 20`);
    const me    = await pool.query(`${cte} SELECT * FROM ranked WHERE id = $1`, [req.userId]);
    const total = await pool.query(`${cte} SELECT COUNT(*)::int AS n FROM ranked`);

    res.json({
      metric, period,
      top: top.rows,
      me: me.rows[0] || null,
      total: total.rows[0].n,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
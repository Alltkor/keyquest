const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");
const { ACHIEVEMENTS, publicAch } = require("../achievements");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT code, earned_at FROM user_achievements WHERE user_id = $1", [req.userId]);
    const earned = new Map(r.rows.map(x => [x.code, x.earned_at]));

    res.json({
      achievements: ACHIEVEMENTS.map(a => ({
        ...publicAch(a),
        earned: earned.has(a.code),
        earned_at: earned.get(a.code) || null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
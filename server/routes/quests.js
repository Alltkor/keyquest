const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/auth");
const { getQuestState } = require("../quests");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    res.json(await getQuestState(pool, req.userId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
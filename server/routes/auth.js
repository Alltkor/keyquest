const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const AVATARS = ["teal", "violet", "amber", "rose", "green", "blue", "orange", "gray"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(u) {
  return { id: u.id, email: u.email, nickname: u.nickname, avatar: u.avatar,
           xp: u.xp, level: u.level, streak: u.streak };
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname, avatar } = req.body;
    const errors = {};

    if (!email || !EMAIL_RE.test(email)) errors.email = "Введите корректный email";
    if (!password || password.length < 8 || password.length > 72) errors.password = "Пароль — от 8 до 72 символов";
    if (!nickname || nickname.length < 3 || nickname.length > 20) errors.nickname = "Ник: от 3 до 20 символов";
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const hash = await bcrypt.hash(password, 10);
    const av = AVATARS.includes(avatar) ? avatar : "teal";

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nickname, avatar)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [email.toLowerCase().trim(), hash, nickname.trim(), av]
    );
    const user = result.rows[0];
    res.status(201).json({ token: makeToken(user.id), user: publicUser(user) });
  } catch (err) {
    if (err.code === "23505") {   // нарушение UNIQUE в PostgreSQL
      const field = err.constraint.includes("email") ? "email" : "nickname";
      const msg = field === "email" ? "Этот email уже занят" : "Этот ник уже занят";
      return res.status(409).json({ errors: { [field]: msg } });
    }
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Введите email и пароль" });

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    const user = result.rows[0];
    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Неверный email или пароль" });

    res.json({ token: makeToken(user.id), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
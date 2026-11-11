require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./db");

const isProd = process.env.NODE_ENV === "production";

// Секрет для токенов должен быть длинным и случайным
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  const msg = "JWT_SECRET должен быть длинной случайной строкой (от 32 символов)";
  if (isProd) { console.error(msg); process.exit(1); }
  console.warn("⚠ " + msg);
}

const app = express();
if (isProd) app.set("trust proxy", 1);          // сайт стоит за прокси хостинга

// Заголовки безопасности. Скрипты разрешены только свои и Chart.js с jsDelivr
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "upgrade-insecure-requests": isProd ? [] : null,
    },
  },
}));

// Кому разрешено обращаться к API с другого адреса (нужно только для разработки с Live Server)
const origins = (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:5500,http://localhost:5500")
  .split(",").map(s => s.trim());
app.use(cors({ origin: (origin, cb) => cb(null, !origin || origins.includes(origin)) }));

app.use(express.json({ limit: "20kb" }));

// Ограничение частоты запросов
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false,
  message: { error: "Слишком много запросов. Попробуй позже." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: true,                  // считаем только неудачные попытки
  message: { error: "Слишком много попыток. Подожди 15 минут." },
});
app.use("/api", apiLimiter);
app.use(["/api/auth/login", "/api/auth/register"], authLimiter);

// Проверка, что сервер и база живы
app.get("/api/health", async (req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

// Случайный текст (для свободной практики)
app.get("/api/texts/random", async (req, res) => {
  try {
    const lang = req.query.lang === "ru" ? "ru" : "en";
    const level = parseInt(req.query.level) || null;
    const result = level
      ? await pool.query("SELECT id, level, content FROM texts WHERE lang = $1 AND level = $2 ORDER BY RANDOM() LIMIT 1", [lang, level])
      : await pool.query("SELECT id, level, content FROM texts WHERE lang = $1 ORDER BY RANDOM() LIMIT 1", [lang]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Тексты не найдены" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/sessions", require("./routes/sessions"));
app.use("/api/me", require("./routes/me"));
app.use("/api/levels", require("./routes/levels"));
app.use("/api/achievements", require("./routes/achievements"));
app.use("/api/leaderboard", require("./routes/leaderboard"));
app.use("/api/quests", require("./routes/quests"));
app.use("/api/profile", require("./routes/profile"));

app.use("/api", (req, res) => res.status(404).json({ error: "Не найдено" }));

// Сайт (папка client) отдаёт тот же сервер
app.use(express.static(path.join(__dirname, "..", "client"), { extensions: ["html"] }));

// Общий обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const bad = err.status === 400;
  res.status(bad ? 400 : 500).json({ error: bad ? "Некорректный запрос" : "Ошибка сервера" });
});

process.on("unhandledRejection", (e) => console.error("Необработанная ошибка:", e));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));
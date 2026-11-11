const jwt = require("jsonwebtoken");

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Нужно войти" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;          // дальше маршруты знают, кто пользователь
    next();
  } catch {
    res.status(401).json({ error: "Сессия истекла, войдите снова" });
  }
};
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./db");

(async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "setup.sql"), "utf8");
    await pool.query(sql);
    console.log("База данных готова");
  } catch (err) {
    console.error("Не удалось настроить базу:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
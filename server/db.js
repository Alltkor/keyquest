require("dotenv").config();
const { Pool } = require("pg");

// DB_SSL=true нужен для большинства облачных баз (соединение шифруется)
const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl,
      }
);

pool.on("error", (err) => console.error("Ошибка соединения с базой:", err.message));

module.exports = pool;
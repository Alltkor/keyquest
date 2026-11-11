CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname      VARCHAR(30)  UNIQUE NOT NULL,
  avatar        VARCHAR(30)  NOT NULL DEFAULT 'default',
  xp            INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  streak        INTEGER NOT NULL DEFAULT 0,
  last_active   DATE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS texts (
  id      SERIAL PRIMARY KEY,
  level   INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text_id    INTEGER REFERENCES texts(id),
  wpm        INTEGER NOT NULL,
  accuracy   INTEGER NOT NULL,
  duration   INTEGER NOT NULL,
  xp_earned  INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO texts (level, content) VALUES
  (1, 'asdf jkl; fall sad dad lad ask flask'),
  (1, 'sad lad has a flask and a salad'),
  (2, 'the quick brown fox jumps over the lazy dog'),
  (2, 'quiet river bank under pale light'),
  (3, 'a small team can build a big idea with steady practice');
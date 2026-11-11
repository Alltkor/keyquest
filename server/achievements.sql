CREATE TABLE IF NOT EXISTS user_achievements (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code      VARCHAR(40) NOT NULL,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, code)
);
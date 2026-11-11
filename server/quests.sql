CREATE TABLE IF NOT EXISTS quest_claims (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     DATE NOT NULL,
  code    VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, day, code)
);
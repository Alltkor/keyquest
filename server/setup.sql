CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       VARCHAR(255) NOT NULL,
  nickname            VARCHAR(30)  UNIQUE NOT NULL,
  avatar              VARCHAR(30)  NOT NULL DEFAULT 'default',
  xp                  INTEGER NOT NULL DEFAULT 0,
  level               INTEGER NOT NULL DEFAULT 1,
  streak              INTEGER NOT NULL DEFAULT 0,
  last_active         DATE,
  showcase            TEXT[] NOT NULL DEFAULT '{}',
  show_in_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS showcase TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_in_leaderboard BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS levels (
  id          INTEGER PRIMARY KEY,
  category    VARCHAR(40) NOT NULL,
  title       VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  target_wpm  INTEGER NOT NULL,
  xp_reward   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS texts (
  id      SERIAL PRIMARY KEY,
  level   INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  lang    VARCHAR(2) NOT NULL DEFAULT 'en'
);
ALTER TABLE texts ADD COLUMN IF NOT EXISTS lang VARCHAR(2) NOT NULL DEFAULT 'en';

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

CREATE TABLE IF NOT EXISTS user_levels (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL REFERENCES levels(id),
  stars    INTEGER NOT NULL DEFAULT 0,
  best_wpm INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, level_id)
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code      VARCHAR(40) NOT NULL,
  earned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, code)
);

CREATE TABLE IF NOT EXISTS quest_claims (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     DATE NOT NULL,
  code    VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, day, code)
);

-- Индексы: рейтинг и статистика читают сессии по пользователю и времени
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_texts_level_lang ON texts (level, lang);

-- Уровни: при повторном запуске исправляются до актуальных значений
INSERT INTO levels (id, category, title, description, target_wpm, xp_reward) VALUES
  (1, 'Домашний ряд', 'Старт', 'Буквы a s d f j k l ; — положи пальцы на опорные клавиши.', 20, 30),
  (2, 'Все буквы', 'Алфавит', 'Весь алфавит в предложениях, где есть каждая буква.', 25, 40),
  (3, 'Слова', 'Частые слова', 'Короткие частые слова. Не спеши, держи ритм.', 30, 50),
  (4, 'Цифры и символы', 'Цифры и знаки', 'Цифры, скобки, знаки препинания и спецсимволы.', 25, 60),
  (5, 'Тексты', 'Связный текст', 'Абзацы обычного текста: ритм важнее скорости.', 35, 70),
  (6, 'Код', 'Скобки и операторы', 'JavaScript: скобки, точки с запятой, операторы.', 30, 80),
  (7, 'Скоростной челлендж', 'Спринт', 'Быстрые предложения. Здесь важна скорость.', 45, 120)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category, title = EXCLUDED.title, description = EXCLUDED.description,
  target_wpm = EXCLUDED.target_wpm, xp_reward = EXCLUDED.xp_reward;

-- Английские тексты (вставляются только если их ещё нет)
INSERT INTO texts (level, content, lang)
SELECT * FROM (VALUES
  (1, 'asdf jkl; fall sad dad lad ask flask', 'en'),
  (1, 'sad lad has a flask and a salad', 'en'),
  (2, 'the quick brown fox jumps over the lazy dog', 'en'),
  (2, 'quiet river bank under pale light', 'en'),
  (3, 'a small team can build a big idea with steady practice', 'en'),
  (3, 'time people water world house school friend morning window garden', 'en'),
  (3, 'simple words help you type faster and with fewer mistakes', 'en'),
  (4, 'call 555-0199 or email test@mail.com by 12:30', 'en'),
  (4, 'total: 4 items x $7.50 = $30.00 (tax 10%)', 'en'),
  (4, 'room #42, floor 3, code 8-1-6-9!', 'en'),
  (5, 'Practice does not need to be long. Ten focused minutes every day beat one tired hour on the weekend.', 'en'),
  (5, 'A steady rhythm matters more than raw speed. Look at the text, trust your fingers, and keep going.', 'en'),
  (6, 'const sum = (a, b) => { return a + b; };', 'en'),
  (6, 'for (let i = 0; i < 10; i++) { console.log(i); }', 'en'),
  (6, 'if (user && user.age >= 18) { allow(); }', 'en'),
  (7, 'pack my box with five dozen liquor jugs, quickly', 'en'),
  (7, 'sphinx of black quartz, judge my vow, and watch me type', 'en')
) AS v(level, content, lang)
WHERE NOT EXISTS (SELECT 1 FROM texts WHERE lang = 'en');

-- Русские тексты
INSERT INTO texts (level, content, lang)
SELECT * FROM (VALUES
  (1, 'фыва олдж ава ода вал лад дол фара водопад', 'ru'),
  (1, 'ждал дар ода вал водопад фыва олдж', 'ru'),
  (2, 'Съешь же еще этих мягких французских булок да выпей чаю', 'ru'),
  (2, 'Шустрый щенок быстро ловит цветной мячик у забора', 'ru'),
  (3, 'время люди вода мир дом школа друг утро окно сад', 'ru'),
  (3, 'простые слова помогают печатать быстрее и с меньшим числом ошибок', 'ru'),
  (3, 'каждый день понемногу и навык растет', 'ru'),
  (4, 'звони 555-0199 или пиши до 12:30', 'ru'),
  (4, 'итого: 4 шт * 7.50 = 30.00 (налог 10%)', 'ru'),
  (4, 'комната №42, этаж 3, код 8-1-6-9!', 'ru'),
  (5, 'Практика не обязана быть долгой. Десять сосредоточенных минут каждый день лучше одного уставшего часа по выходным.', 'ru'),
  (5, 'Ровный ритм важнее скорости. Смотри на текст, доверяй пальцам и не останавливайся.', 'ru'),
  (6, 'const sum = (a, b) => { return a + b; };', 'ru'),
  (6, 'for (let i = 0; i < 10; i++) { console.log(i); }', 'ru'),
  (6, 'if (user && user.age >= 18) { allow(); }', 'ru'),
  (7, 'Широкая электрификация южных губерний даст мощный толчок подъему сельского хозяйства', 'ru'),
  (7, 'Грузчики экзаменатора быстро вынесли цветной шкаф из чужого подъезда', 'ru')
) AS v(level, content, lang)
WHERE NOT EXISTS (SELECT 1 FROM texts WHERE lang = 'ru');
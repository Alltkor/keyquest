CREATE TABLE IF NOT EXISTS levels (
  id          INTEGER PRIMARY KEY,
  category    VARCHAR(40) NOT NULL,
  title       VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  target_wpm  INTEGER NOT NULL,
  xp_reward   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_levels (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id  INTEGER NOT NULL REFERENCES levels(id),
  stars     INTEGER NOT NULL DEFAULT 0,
  best_wpm  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, level_id)
);

INSERT INTO levels (id, category, title, description, target_wpm, xp_reward) VALUES
  (1, 'Домашний ряд', 'Старт', 'Буквы a s d f j k l ; — положи пальцы на опорные клавиши.', 20, 30),
  (2, 'Все буквы', 'Алфавит', 'Весь алфавит в предложениях, где есть каждая буква.', 25, 40),
  (3, 'Слова', 'Частые слова', 'Короткие частые слова. Не спеши, держи ритм.', 30, 50),
  (4, 'Цифры и символы', 'Цифры и знаки', 'Цифры, скобки, знаки препинания и спецсимволы.', 25, 60),
  (5, 'Тексты', 'Связный текст', 'Абзацы обычного текста: ритм важнее скорости.', 35, 70),
  (6, 'Код', 'Скобки и операторы', 'JavaScript: скобки, точки с запятой, операторы.', 30, 80),
  (7, 'Скоростной челлендж', 'Спринт', 'Быстрые предложения. Здесь важна скорость.', 45, 120)
ON CONFLICT (id) DO NOTHING;

-- Тексты для уровней 3-7 (для 1 и 2 они уже есть)
INSERT INTO texts (level, content) VALUES
  (3, 'time people water world house school friend morning window garden'),
  (3, 'simple words help you type faster and with fewer mistakes'),
  (4, 'call 555-0199 or email test@mail.com by 12:30'),
  (4, 'total: 4 items x $7.50 = $30.00 (tax 10%)'),
  (4, 'room #42, floor 3, code 8-1-6-9!'),
  (5, 'Practice does not need to be long. Ten focused minutes every day beat one tired hour on the weekend.'),
  (5, 'A steady rhythm matters more than raw speed. Look at the text, trust your fingers, and keep going.'),
  (6, 'const sum = (a, b) => { return a + b; };'),
  (6, 'for (let i = 0; i < 10; i++) { console.log(i); }'),
  (6, 'if (user && user.age >= 18) { allow(); }'),
  (7, 'pack my box with five dozen liquor jugs, quickly'),
  (7, 'sphinx of black quartz, judge my vow, and watch me type');
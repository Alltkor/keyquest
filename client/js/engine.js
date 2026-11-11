class TypingEngine {
  constructor(text) {
    this.text = text;
    this.pos = 0;
    this.correct = 0;
    this.total = 0;
    this.startTime = null;
    this.pausedAt = null;
    this.states = Array(text.length).fill("pending");
    this.mistakes = {};        // "ожидалось\0нажато" -> сколько раз
  }

  get finished() { return this.pos >= this.text.length; }

  press(key) {
    if (this.finished) return;
    if (this.startTime === null) this.startTime = Date.now();
    this.total++;
    const expected = this.text[this.pos];
    if (key === expected) {
      this.states[this.pos] = "correct";
      this.correct++;
    } else {
      this.states[this.pos] = "wrong";
      const k = expected + "\u0000" + key;
      this.mistakes[k] = (this.mistakes[k] || 0) + 1;
    }
    this.pos++;
  }

  backspace() {
    if (this.pos === 0 || this.finished) return;
    this.pos--;
    this.states[this.pos] = "pending";
  }

  pause() {
    if (this.startTime !== null && this.pausedAt === null) this.pausedAt = Date.now();
  }

  resume() {
    if (this.pausedAt !== null) {
      this.startTime += Date.now() - this.pausedAt;   // время паузы не считается
      this.pausedAt = null;
    }
  }

  get seconds() {
    if (this.startTime === null) return 0;
    const end = this.pausedAt !== null ? this.pausedAt : Date.now();
    return (end - this.startTime) / 1000;
  }

  get wpm() {
    const minutes = this.seconds / 60;
    return minutes > 0 ? Math.round((this.correct / 5) / minutes) : 0;
  }

  get accuracy() {
    return this.total ? Math.round((this.correct / this.total) * 100) : 100;
  }

  // Самая частая ошибка: { expected, typed, count } или null
  topMistake() {
    let best = null;
    for (const [k, count] of Object.entries(this.mistakes)) {
      if (!best || count > best.count) {
        const [expected, typed] = k.split("\u0000");
        best = { expected, typed, count };
      }
    }
    return best;
  }
}
const readline = require('readline');

class ProgressBar {
  constructor(options = {}) {
    this.total = options.total || 100;
    this.current = 0;
    this.width = options.width || 40;
    this.completeChar = '█';
    this.incompleteChar = '░';
    this.label = options.label || '';
    this.startTime = Date.now();
    this.lastRender = 0;
    this.renderInterval = 50; // 最小渲染间隔(ms)
  }

  update(current, label) {
    this.current = current;
    if (label) this.label = label;

    const now = Date.now();
    if (now - this.lastRender < this.renderInterval && current < this.total) {
      return;
    }
    this.lastRender = now;

    this.render();
  }

  increment(amount = 1, label) {
    this.update(this.current + amount, label);
  }

  render() {
    const percent = Math.min(this.current / this.total, 1);
    const filled = Math.round(this.width * percent);
    const empty = this.width - filled;

    const bar = this.completeChar.repeat(filled) + this.incompleteChar.repeat(empty);
    const percentage = Math.round(percent * 100);

    const elapsed = Date.now() - this.startTime;
    const speed = this.current / (elapsed / 1000);
    const remaining = this.total - this.current;
    const eta = speed > 0 ? remaining / speed : 0;

    const elapsedStr = this.formatTime(elapsed);
    const etaStr = eta > 0 ? this.formatTime(eta * 1000) : '--:--';

    const line = `\r  ${this.label ? this.label + ' ' : ''}[${bar}] ${percentage}% | ${this.current}/${this.total} | ${elapsedStr} | ETA: ${etaStr}`;

    process.stderr.write(line);

    if (this.current >= this.total) {
      process.stderr.write('\n');
    }
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  done(label) {
    this.current = this.total;
    if (label) this.label = label;
    this.render();
  }
}

class Spinner {
  constructor(text = '') {
    this.text = text;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.current = 0;
    this.interval = null;
    this.stream = process.stderr;
  }

  start(text) {
    if (text) this.text = text;
    // 防止重复 start 导致多个定时器叠加
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.interval = setInterval(() => {
      this.render();
    }, 80);
    return this;
  }

  render() {
    const frame = this.frames[this.current];
    this.stream.write(`\r  ${frame} ${this.text}`);
    this.current = (this.current + 1) % this.frames.length;
  }

  stop(finalText) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.stream.write('\r' + ' '.repeat(this.text.length + 10) + '\r');
    if (finalText) {
      this.stream.write(`  ✓ ${finalText}\n`);
    }
  }

  succeed(text) {
    this.stop(text);
  }

  fail(text) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.stream.write('\r' + ' '.repeat(this.text.length + 10) + '\r');
    this.stream.write(`  ✗ ${text}\n`);
  }
}

module.exports = { ProgressBar, Spinner };

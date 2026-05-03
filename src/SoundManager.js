export class SoundManager {
  constructor() {
    this.audioCtx    = null;
    this.introPlaying = false;
  }

  unlock() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playIntroTune() {
    this.unlock();
    if (!this.audioCtx) return;
    this.introPlaying = true;

    // [frequency, startTime, duration, gain]
    const notes = [
      [392,  0.0,  0.3,  0.4],
      [523,  0.3,  0.3,  0.4],
      [659,  0.6,  0.3,  0.4],
      [784,  0.9,  0.5,  0.5],
      [659,  1.4,  0.2,  0.35],
      [784,  1.6,  0.8,  0.55],
      [880,  2.4,  0.3,  0.4],
      [784,  2.7,  0.2,  0.35],
      [659,  2.9,  0.2,  0.3],
      [523,  3.1,  0.2,  0.3],
      [392,  3.3,  0.15, 0.3],
      [523,  3.45, 0.15, 0.3],
      [659,  3.6,  0.15, 0.3],
      [784,  3.75, 1.0,  0.5],
      [523,  4.75, 0.2,  0.3],
      [659,  4.95, 0.2,  0.35],
      [784,  5.15, 0.2,  0.4],
      [1047, 5.35, 1.5,  0.5],
    ];

    const now = this.audioCtx.currentTime;
    notes.forEach(([freq, start, dur, gain]) => {
      const osc      = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + start);
      gainNode.gain.setValueAtTime(0, now + start);
      gainNode.gain.linearRampToValueAtTime(gain * 0.25, now + start + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.1);
    });

    setTimeout(() => { this.introPlaying = false; }, 7000);
  }

  stopIntro() {
    this.introPlaying = false;
  }

  playBallHit(hitSpeed) {
    this.unlock();
    if (!this.audioCtx) return;
    const freq = 800 + hitSpeed * 200;
    const gain = Math.min(0.3, hitSpeed * 0.05);
    this._playTone('sine', freq, gain, 0.08);
  }

  playPocket() {
    this.unlock();
    if (!this.audioCtx) return;
    this._playTone('sine', 120, 0.25, 0.25);
  }

  playFoul() {
    this.unlock();
    if (!this.audioCtx) return;
    this._playTone('sawtooth', 120, 0.2, 0.4);
  }

  playTurnSwitch() {
    this.unlock();
    if (!this.audioCtx) return;
    this._playTone('sine', 880, 0.15, 0.15);
  }

  _playTone(oscType, freq, gain, duration) {
    if (!this.audioCtx) return;
    const osc      = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    osc.type          = oscType;
    osc.frequency.value = freq;
    const now = this.audioCtx.currentTime;
    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }
}

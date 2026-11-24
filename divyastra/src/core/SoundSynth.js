/**
 * Procedural WebAudio sound recipes for Divyastra.
 * Keeps each sound under 0.4s and applies pitch randomization (+/-5%).
 */
export class SoundSynth {
  constructor(ctx, sfxGain, getVoiceSlot) {
    this.ctx = ctx;
    this.sfxGain = sfxGain;
    this.getVoiceSlot = getVoiceSlot;
    this.noiseBuffer = this.createNoiseBuffer(0.4);
  }

  createNoiseBuffer(duration = 0.4) {
    if (!this.ctx) return null;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  getPitchMod() {
    return 1.0 + (Math.random() - 0.5) * 0.10; // +/-5%
  }

  // Agni: crackling noise burst with a low whoosh
  playAgniCast() {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;
    const pm = this.getPitchMod();

    // Low whoosh
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 * pm, now);
    osc.frequency.exponentialRampToValueAtTime(75 * pm, now + 0.22);
    oscGain.gain.setValueAtTime(0.14, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);

    // Crackling noise burst
    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 * pm, now);
      filter.Q.setValueAtTime(3.0, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.18, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      src.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.16);
    }
    slot.release(0.24);
  }

  // Jala: a filtered bubbling sweep
  playJalaCast() {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;
    const pm = this.getPitchMod();

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340 * pm, now);
    osc.frequency.exponentialRampToValueAtTime(720 * pm, now + 0.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600 * pm, now);
    filter.frequency.exponentialRampToValueAtTime(1600 * pm, now + 0.2);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);
    slot.release(0.24);
  }

  // Prithvi: low thud with rumble
  playPrithviCast() {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;
    const pm = this.getPitchMod();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160 * pm, now);
    osc.frequency.exponentialRampToValueAtTime(50 * pm, now + 0.22);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
    slot.release(0.22);
  }

  playImpact(element = 'E') {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;
    const pm = this.getPitchMod();

    if (element === 'F') {
      // Agni: crackle burst
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'bandpass';
        flt.frequency.setValueAtTime(1800 * pm, now);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        src.connect(flt);
        flt.connect(g);
        g.connect(this.sfxGain);
        src.start(now);
        src.stop(now + 0.14);
      }
    } else if (element === 'W') {
      // Jala: bubbling splash
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580 * pm, now);
      osc.frequency.exponentialRampToValueAtTime(220 * pm, now + 0.15);
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Prithvi: low thud rumble
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110 * pm, now);
      osc.frequency.exponentialRampToValueAtTime(35 * pm, now + 0.22);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    }
    slot.release(0.22);
  }

  playDashWhoosh() {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;
    const pm = this.getPitchMod();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640 * pm, now);
    osc.frequency.exponentialRampToValueAtTime(180 * pm, now + 0.18);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
    slot.release(0.18);
  }

  playPickupChime() {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;
    const pm = this.getPitchMod();

    [659 * pm, 987 * pm].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.10, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.12);
    });
    slot.release(0.20);
  }

  playLevelUpArpeggio() {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;
    const pm = this.getPitchMod();
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq * pm, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.14);
    });
    slot.release(0.35);
  }

  playKillSting() {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;
    const pm = this.getPitchMod();

    [440 * pm, 659 * pm].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.28);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.28);
    });
    slot.release(0.30);
  }

  playHeartbeat() {
    const slot = this.getVoiceSlot();
    if (!slot) return;
    const now = this.ctx.currentTime;

    // Lub-dub double thud
    [0, 0.14].forEach((delay, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + delay;
      osc.frequency.setValueAtTime(i === 0 ? 58 : 50, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.10);
      gain.gain.setValueAtTime(i === 0 ? 0.22 : 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);
    });
    slot.release(0.30);
  }
}

/**
 * Looping ambient BGM drone (tanpura-like) with two detuned low sine notes,
 * slow lowpass filter movement, match-start fade-in, and 30% ducking during cast.
 */
export class SoundDrone {
  constructor(ctx, musicGain) {
    this.ctx = ctx;
    this.musicGain = musicGain;
    this.isPlaying = false;
    this.droneGain = null;
    this.duckGain = null;
    this.filter = null;
    this.osc1 = null;
    this.osc2 = null;
    this.lfo = null;
  }

  start() {
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;
    const now = this.ctx.currentTime;

    // Gain nodes: droneGain (fade-in/out) -> duckGain (cast ducking) -> musicGain
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.001, now);
    this.droneGain.gain.exponentialRampToValueAtTime(0.24, now + 1.8);

    this.duckGain = this.ctx.createGain();
    this.duckGain.gain.setValueAtTime(1.0, now);

    // Filter with slow tanpura sweep
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(260, now);
    this.filter.Q.setValueAtTime(2.5, now);

    // LFO for slow filter movement (~0.12 Hz, ~8.3s cycle)
    this.lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.lfo.frequency.setValueAtTime(0.12, now);
    lfoGain.gain.setValueAtTime(120, now); // sweeps frequency +/-120 Hz around 260
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);

    // Two detuned low sine notes (A2 ~110 Hz and fifth E3 ~165 Hz slightly detuned)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc1.frequency.setValueAtTime(110.0, now);

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.setValueAtTime(164.8, now);
    this.osc2.detune.setValueAtTime(7, now); // +7 cents detune

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.droneGain);
    this.droneGain.connect(this.duckGain);
    this.duckGain.connect(this.musicGain);

    this.osc1.start(now);
    this.osc2.start(now);
    this.lfo.start(now);
  }

  duck(duration = 0.45) {
    if (!this.isPlaying || !this.duckGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Duck 30% during a cast (drops to 0.70 of music volume, then recovers)
    this.duckGain.gain.cancelScheduledValues(now);
    this.duckGain.gain.setValueAtTime(this.duckGain.gain.value, now);
    this.duckGain.gain.linearRampToValueAtTime(0.70, now + 0.05);
    this.duckGain.gain.linearRampToValueAtTime(1.0, now + duration);
  }

  stop() {
    if (!this.isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.droneGain) {
      this.droneGain.gain.cancelScheduledValues(now);
      this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
      this.droneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    }
    setTimeout(() => {
      try {
        this.osc1?.stop();
        this.osc2?.stop();
        this.lfo?.stop();
      } catch {}
      this.isPlaying = false;
    }, 1050);
  }
}

import { SoundSynth } from './SoundSynth.js';
import { SoundDrone } from './SoundDrone.js';

const MUTE_KEY = 'magica_sound_muted';
const SFX_VOL_KEY = 'divyastra_sfx_vol';
const MUSIC_VOL_KEY = 'divyastra_music_vol';

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sfxVol = 0.8;
    this.musicVol = 0.5;
    this.activeVoices = 0;
    this.maxVoices = 6;
    this.heartbeatTimer = 0;

    try {
      this.muted = localStorage.getItem(MUTE_KEY) === 'true';
      const s = localStorage.getItem(SFX_VOL_KEY);
      if (s !== null) this.sfxVol = Math.max(0, Math.min(1, parseFloat(s)));
      const m = localStorage.getItem(MUSIC_VOL_KEY);
      if (m !== null) this.musicVol = Math.max(0, Math.min(1, parseFloat(m)));
    } catch {}

    this.initAudioContext();
    this.initMuteUI();
  }

  initAudioContext() {
    const startAudio = () => {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.sfxGain = this.ctx.createGain();
          this.musicGain = this.ctx.createGain();

          this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1.0, this.ctx.currentTime);
          this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
          this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);

          this.sfxGain.connect(this.masterGain);
          this.musicGain.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);

          this.synth = new SoundSynth(this.ctx, this.sfxGain, () => this.getVoiceSlot());
          this.drone = new SoundDrone(this.ctx, this.musicGain);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    };

    ['pointerdown', 'keydown', 'touchstart', 'touchend', 'click'].forEach((evt) => {
      window.addEventListener(evt, startAudio, { once: true, passive: true });
    });
  }

  getVoiceSlot() {
    if (this.muted || !this.ctx || this.activeVoices >= this.maxVoices) return null;
    this.activeVoices++;
    let released = false;
    return {
      release: (delay = 0.3) => {
        if (released) return;
        released = true;
        setTimeout(() => {
          this.activeVoices = Math.max(0, this.activeVoices - 1);
        }, Math.min(400, delay * 1000));
      }
    };
  }

  setSfxVolume(val) {
    this.sfxVol = Math.max(0, Math.min(1, val));
    try { localStorage.setItem(SFX_VOL_KEY, String(this.sfxVol)); } catch {}
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    this.musicVol = Math.max(0, Math.min(1, val));
    try { localStorage.setItem(MUSIC_VOL_KEY, String(this.musicVol)); } catch {}
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, String(this.muted)); } catch {}
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1.0, this.ctx.currentTime);
    }
    this.updateMuteButtons();
    return this.muted;
  }

  updateMuteButtons() {
    const btns = [document.getElementById('mute-btn'), document.getElementById('hud-mute-btn')].filter(Boolean);
    btns.forEach((b) => { b.textContent = this.muted ? '🔇' : '🔊'; });
  }

  initMuteUI() {
    this.updateMuteButtons();
    const btns = [document.getElementById('mute-btn'), document.getElementById('hud-mute-btn')].filter(Boolean);
    btns.forEach((b) => {
      b.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMute(); });
    });
  }

  startMatchDrone() { this.drone?.start(); }
  stopMatchDrone() { this.drone?.stop(); }

  _resolveElement(spellOrId) {
    if (!spellOrId) return 'E';
    if (typeof spellOrId === 'object') {
      if (spellOrId.elements?.includes('F')) return 'F';
      if (spellOrId.elements?.includes('W')) return 'W';
      return 'E';
    }
    const str = String(spellOrId).toUpperCase();
    if (str.includes('F') || str.includes('AGNI') || str.includes('PYRO')) return 'F';
    if (str.includes('W') || str.includes('JALA') || str.includes('CRYO')) return 'W';
    return 'E';
  }

  playCast(spellOrId = 'AGNI') {
    if (this.muted || !this.synth) return;
    this.drone?.duck(0.45);
    const elem = this._resolveElement(spellOrId);
    if (elem === 'F') this.synth.playAgniCast();
    else if (elem === 'W') this.synth.playJalaCast();
    else this.synth.playPrithviCast();
  }

  playHit(spellOrElem = 'E') {
    if (this.muted || !this.synth) return;
    const elem = this._resolveElement(spellOrElem);
    this.synth.playImpact(elem);
  }

  playExplosion() {
    if (this.muted || !this.synth) return;
    this.synth.playImpact('F');
  }

  playPlayerDamage() {
    if (this.muted || !this.synth) return;
    this.synth.playImpact('E');
  }

  playDash() {
    if (this.muted || !this.synth) return;
    this.synth.playDashWhoosh();
  }

  playPickup() {
    if (this.muted || !this.synth) return;
    this.synth.playPickupChime();
  }

  playLevelUp() {
    if (this.muted || !this.synth) return;
    this.synth.playLevelUpArpeggio();
  }

  playKillSting() {
    if (this.muted || !this.synth) return;
    this.synth.playKillSting();
  }

  playTapasReady() {
    if (this.muted || !this.synth) return;
    this.synth.playPickupChime();
  }

  updateHeartbeat(dt, hp, maxHp, inMatch = true) {
    if (!inMatch || this.muted || !this.synth || hp <= 0 || maxHp <= 0) return;
    if (hp / maxHp < 0.25) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = 0.85;
        this.synth.playHeartbeat();
      }
    } else {
      this.heartbeatTimer = 0;
    }
  }
}

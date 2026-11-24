import { SoundSynth } from './SoundSynth.js';
import { SoundDrone } from './SoundDrone.js';
import { assetLoader } from './AssetLoader.js';

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
    this.bgmSource = null;

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

          assetLoader.setAudioContext(this.ctx);
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

  playAudioBuffer(key, gainNode = this.sfxGain, loop = false) {
    if (this.muted || !this.ctx) return null;
    const buffer = assetLoader.getAudioBuffer(key);
    if (!buffer) return null;
    const slot = loop ? null : this.getVoiceSlot();
    if (!loop && !slot) return null;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(gainNode || this.sfxGain);
    source.start();
    if (slot) slot.release(buffer.duration);
    return source;
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

  startMatchDrone() {
    if (assetLoader.hasAudioBuffer('bgm')) {
      this.stopMatchDrone();
      this.bgmSource = this.playAudioBuffer('bgm', this.musicGain, true);
      return;
    }
    this.drone?.start();
  }

  stopMatchDrone() {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch {}
      this.bgmSource = null;
    }
    this.drone?.stop();
  }

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
    if (this.muted) return;
    this.drone?.duck(0.45);
    const elem = this._resolveElement(spellOrId);
    const key = elem === 'F' ? 'cast_fire' : (elem === 'W' ? 'cast_water' : 'cast_earth');
    if (this.playAudioBuffer(key)) return;
    if (!this.synth) return;
    if (elem === 'F') this.synth.playAgniCast();
    else if (elem === 'W') this.synth.playJalaCast();
    else this.synth.playPrithviCast();
  }

  playHit(spellOrElem = 'E') {
    if (this.muted) return;
    const elem = this._resolveElement(spellOrElem);
    const key = elem === 'F' ? 'hit_fire' : (elem === 'W' ? 'hit_water' : 'hit_earth');
    if (this.playAudioBuffer(key)) return;
    if (!this.synth) return;
    this.synth.playImpact(elem);
  }

  playExplosion() {
    if (this.muted) return;
    if (this.playAudioBuffer('explosion')) return;
    if (!this.synth) return;
    this.synth.playImpact('F');
  }

  playPlayerDamage() {
    if (this.muted) return;
    if (this.playAudioBuffer('player_damage')) return;
    if (!this.synth) return;
    this.synth.playImpact('E');
  }

  playDash() {
    if (this.muted) return;
    if (this.playAudioBuffer('dash')) return;
    if (!this.synth) return;
    this.synth.playDashWhoosh();
  }

  playPickup() {
    if (this.muted) return;
    if (this.playAudioBuffer('pickup')) return;
    if (!this.synth) return;
    this.synth.playPickupChime();
  }

  playLevelUp() {
    if (this.muted) return;
    if (this.playAudioBuffer('level_up')) return;
    if (!this.synth) return;
    this.synth.playLevelUpArpeggio();
  }

  playKillSting() {
    if (this.muted) return;
    if (this.playAudioBuffer('kill')) return;
    if (!this.synth) return;
    this.synth.playKillSting();
  }

  playTapasReady() {
    if (this.muted) return;
    if (this.playAudioBuffer('tapas_ready')) return;
    if (!this.synth) return;
    this.synth.playPickupChime();
  }

  updateHeartbeat(dt, hp, maxHp, inMatch = true) {
    if (!inMatch || this.muted || hp <= 0 || maxHp <= 0) return;
    if (hp / maxHp < 0.25) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = 0.85;
        if (!this.playAudioBuffer('heartbeat') && this.synth) {
          this.synth.playHeartbeat();
        }
      }
    } else {
      this.heartbeatTimer = 0;
    }
  }
}

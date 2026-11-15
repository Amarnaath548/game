import { CAMERA_CONFIG } from '../config/constants.js';

export class CameraZoom {
  constructor() {
    this.levels = CAMERA_CONFIG.ZOOM_LEVELS || { NORMAL: 1.0, CLOSE: 0.82 };
    this.mode = this.resolveInitialMode();
    this.targetZoom = this.levels[this.mode] ?? 0.82;
    this.currentZoom = this.targetZoom;
    this.setupControls();
  }

  resolveInitialMode() {
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const param = new URLSearchParams(window.location.search).get('zoom');
        if (param) {
          const p = param.toLowerCase();
          if (p === 'normal') return 'NORMAL';
          if (p === 'close') return 'CLOSE';
        }
      }
    } catch (e) {}

    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('magica_zoom');
        if (saved) {
          const s = saved.toLowerCase();
          if (s === 'normal') return 'NORMAL';
          if (s === 'close') return 'CLOSE';
        }
      }
    } catch (e) {}

    return CAMERA_CONFIG.DEFAULT_ZOOM || 'CLOSE';
  }

  toggle() {
    this.setMode(this.mode === 'CLOSE' ? 'NORMAL' : 'CLOSE');
  }

  setMode(newMode) {
    this.mode = newMode.toUpperCase() === 'NORMAL' ? 'NORMAL' : 'CLOSE';
    this.targetZoom = this.levels[this.mode] ?? (this.mode === 'NORMAL' ? 1.0 : 0.82);
    try {
      localStorage.setItem('magica_zoom', this.mode.toLowerCase());
    } catch (e) {}
    this.updateButton();
  }

  setupControls() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyZ' && !e.repeat) this.toggle();
    });
    this.setupButton();
  }

  setupButton() {
    let btn = document.getElementById('zoom-toggle-btn');
    if (!btn && typeof document !== 'undefined') {
      const parent = document.querySelector('.header-right') || document.getElementById('lobby-screen');
      if (parent) {
        btn = document.createElement('button');
        btn.id = 'zoom-toggle-btn';
        btn.className = 'fs-btn';
        btn.style.cssText = 'width:auto;padding:0 8px;font-size:11px;font-weight:700;';
        btn.textContent = 'View: Close / Normal';
        btn.title = 'View: Close / Normal';
        parent.insertBefore(btn, parent.firstChild);
      }
    }
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
      this.updateButton();
    }
  }

  updateButton() {
    const btn = document.getElementById('zoom-toggle-btn');
    if (btn) btn.dataset.zoom = this.mode.toLowerCase();
  }

  update(lerpSpeed = CAMERA_CONFIG.LERP_SPEED) {
    this.currentZoom += (this.targetZoom - this.currentZoom) * (lerpSpeed || 0.1);
    return this.currentZoom;
  }
}

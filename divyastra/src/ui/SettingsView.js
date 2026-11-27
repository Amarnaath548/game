import '../settings.css';
import { QUALITY_PRESETS, saveQuality } from '../config/quality.js';
import { getSavedCamDistance, saveCamDistance } from '../core/CameraZoom.js';
import { iconFullscreen, iconClose } from './icons.js';

export class SettingsView {
  constructor(sceneManager, sound = null) {
    this.sceneManager = sceneManager;
    this.sound = sound;
    this.selectEl = document.getElementById('quality-select');
    this.camSelectEl = document.getElementById('camera-select');
    this.sfxSlider = document.getElementById('sfx-vol-slider');
    this.musicSlider = document.getElementById('music-vol-slider');
    this.restartNoticeEl = document.getElementById('quality-restart-notice');
    this.init();
  }

  init() {
    const fsBtn = document.getElementById('fullscreen-btn');
    if (fsBtn) fsBtn.innerHTML = iconFullscreen(18);
    const closeBtn = document.getElementById('settings-close-btn');
    if (closeBtn) closeBtn.innerHTML = iconClose(16);

    if (this.selectEl) {
      this.syncValue();
      this.selectEl.querySelectorAll('.seg-pill').forEach((btn) => {
        btn.addEventListener('click', () => this.onQualitySelect(btn.dataset.value));
      });
    }
    if (this.camSelectEl) {
      this.syncCamValue();
      this.camSelectEl.querySelectorAll('.seg-pill').forEach((btn) => {
        btn.addEventListener('click', () => this.onCamSelect(btn.dataset.value));
      });
    }
    this.bindSlider(this.sfxSlider, this.sound ? this.sound.sfxVol : 0.8, (v) => this.sound?.setSfxVolume(v));
    this.bindSlider(this.musicSlider, this.sound ? this.sound.musicVol : 0.5, (v) => this.sound?.setMusicVolume(v));

    if (this.restartNoticeEl) {
      this.restartNoticeEl.addEventListener('click', () => window.location.reload());
    }
    if (this.sceneManager) {
      this.sceneManager.onQualityChange = (newTier) => {
        this.setActivePill(this.selectEl, newTier);
        this.updateNotice(newTier);
      };
    }
  }

  bindSlider(slider, initialVal, onUpdate) {
    if (!slider) return;
    const updateFill = (val) => {
      slider.style.setProperty('--pct', `${Math.round(val * 100)}%`);
    };
    slider.value = initialVal;
    updateFill(initialVal);
    const handle = () => {
      const val = parseFloat(slider.value);
      updateFill(val);
      onUpdate(val);
    };
    slider.addEventListener('input', handle);
    slider.addEventListener('change', handle);
  }

  setActivePill(groupEl, value) {
    if (!groupEl) return;
    groupEl.querySelectorAll('.seg-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  syncValue() {
    if (!this.selectEl || !this.sceneManager) return;
    const tier = this.sceneManager.qualityTier || 'HIGH';
    this.setActivePill(this.selectEl, tier);
    this.updateNotice(tier);
  }

  syncCamValue() {
    if (!this.camSelectEl) return;
    this.setActivePill(this.camSelectEl, getSavedCamDistance());
  }

  onCamSelect(distance) {
    this.setActivePill(this.camSelectEl, distance);
    saveCamDistance(distance);
    if (this.sceneManager?.zoom) {
      this.sceneManager.zoom.setDistance(distance);
    }
  }

  onQualitySelect(tier) {
    this.setActivePill(this.selectEl, tier);
    if (!this.sceneManager) return;
    this.sceneManager.applyQuality(tier);
    saveQuality(tier);
    this.updateNotice(tier);
  }

  updateNotice(tier) {
    if (!this.restartNoticeEl || !this.sceneManager) return;
    const initialAntialias = this.sceneManager.createdWithAntialias;
    const targetAntialias = QUALITY_PRESETS[tier]?.antialias;
    const needsRestart = targetAntialias !== initialAntialias;
    this.restartNoticeEl.style.display = needsRestart ? 'block' : 'none';
    if (needsRestart) {
      this.restartNoticeEl.textContent = 'Restart needed ⟳';
    }
  }
}

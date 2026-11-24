import { QUALITY_PRESETS, saveQuality } from '../config/quality.js';
import { getSavedCamDistance, saveCamDistance } from '../core/CameraZoom.js';

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
    if (this.selectEl) {
      this.syncValue();
      this.selectEl.addEventListener('change', () => this.onChange());
    }
    if (this.camSelectEl) {
      this.syncCamValue();
      this.camSelectEl.addEventListener('change', () => this.onCamChange());
    }
    if (this.sfxSlider) {
      this.sfxSlider.value = this.sound ? this.sound.sfxVol : 0.8;
      const onSfx = () => {
        const val = parseFloat(this.sfxSlider.value);
        this.sound?.setSfxVolume(val);
      };
      this.sfxSlider.addEventListener('input', onSfx);
      this.sfxSlider.addEventListener('change', onSfx);
    }
    if (this.musicSlider) {
      this.musicSlider.value = this.sound ? this.sound.musicVol : 0.5;
      const onMusic = () => {
        const val = parseFloat(this.musicSlider.value);
        this.sound?.setMusicVolume(val);
      };
      this.musicSlider.addEventListener('input', onMusic);
      this.musicSlider.addEventListener('change', onMusic);
    }
    if (this.restartNoticeEl) {
      this.restartNoticeEl.addEventListener('click', () => window.location.reload());
    }
    if (this.sceneManager) {
      this.sceneManager.onQualityChange = (newTier) => {
        if (this.selectEl) this.selectEl.value = newTier;
        this.updateNotice(newTier);
      };
    }
  }

  syncValue() {
    if (!this.selectEl || !this.sceneManager) return;
    this.selectEl.value = this.sceneManager.qualityTier || 'HIGH';
    this.updateNotice(this.sceneManager.qualityTier);
  }

  syncCamValue() {
    if (!this.camSelectEl) return;
    this.camSelectEl.value = getSavedCamDistance();
  }

  onCamChange() {
    if (!this.camSelectEl) return;
    const distance = this.camSelectEl.value;
    saveCamDistance(distance);
    if (this.sceneManager?.zoom) {
      this.sceneManager.zoom.setDistance(distance);
    }
  }

  onChange() {
    const tier = this.selectEl.value;
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

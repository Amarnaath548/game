import { QUALITY_PRESETS, saveQuality } from '../config/quality.js';
import { getSavedCamDistance, saveCamDistance } from '../core/CameraZoom.js';

export class SettingsView {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.selectEl = document.getElementById('quality-select');
    this.camSelectEl = document.getElementById('camera-select');
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

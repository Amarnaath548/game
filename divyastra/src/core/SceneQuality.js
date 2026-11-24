import { QUALITY_PRESETS, getLowerQualityTier, saveQuality } from '../config/quality.js';

export class SceneQuality {
  constructor(sceneManager) {
    this.sm = sceneManager;
    this.qualityTier = sceneManager.qualityTier;
    this.qualityEvaluated = false;
    this.matchFpsTimer = 0;
    this.matchFpsFrames = 0;
  }

  onMatchStart() {
    this.qualityEvaluated = false;
    this.matchFpsTimer = 0;
    this.matchFpsFrames = 0;
  }

  checkPerformanceFallback(dt, particleSys = null) {
    if (this.qualityEvaluated) return;
    this.matchFpsTimer += dt;
    this.matchFpsFrames++;
    if (this.matchFpsTimer >= 4.0) {
      this.qualityEvaluated = true;
      if (this.matchFpsFrames / this.matchFpsTimer < 40) {
        this.stepDownQuality(particleSys);
      }
    }
  }

  stepDownQuality(particleSys = null) {
    const nextTier = getLowerQualityTier(this.qualityTier);
    if (nextTier !== this.qualityTier) {
      this.applyQuality(nextTier, particleSys);
      saveQuality(nextTier);
      if (this.sm.onQualityChange) this.sm.onQualityChange(nextTier);
    }
  }

  applyQuality(tier, particleSys = null) {
    const preset = QUALITY_PRESETS[tier];
    if (!preset) return;
    this.qualityTier = tier;
    this.sm.qualityTier = tier;
    this.sm.renderer.setPixelRatio(preset.pixelRatio);
    if (this.sm.postProcessing) this.sm.postProcessing.setQuality(tier);

    const hasShadows = preset.shadows !== 'off' && !!preset.shadows;
    this.sm.renderer.shadowMap.enabled = hasShadows;
    if (this.sm.dirLight) {
      this.sm.dirLight.castShadow = hasShadows;
      if (hasShadows) {
        const size = typeof preset.shadows === 'number' ? preset.shadows : (preset.shadowMapSize || 1024);
        this.sm.dirLight.shadow.mapSize.set(size, size);
        if (this.sm.shadowFollower) this.sm.shadowFollower.applyCameraBounds();
        if (this.sm.dirLight.shadow.map) {
          this.sm.dirLight.shadow.map.dispose();
          this.sm.dirLight.shadow.map = null;
        }
      }
    }
    if (this.sm.floorMesh) this.sm.floorMesh.receiveShadow = hasShadows;

    const ps = particleSys || this.sm.particleSys;
    if (ps) {
      ps.particleScale = preset.particleScale;
      if (ps.baseMaxParticles === undefined) ps.baseMaxParticles = ps.maxParticles;
      ps.maxParticles = Math.floor(ps.baseMaxParticles * preset.particleScale);
      if (ps.baseMaxRings === undefined) ps.baseMaxRings = ps.maxRings || 12;
      ps.maxRings = Math.max(4, Math.floor(ps.baseMaxRings * preset.particleScale));
    }
  }
}

import * as THREE from 'three';
import { COLORS, ARENA, CAMERA_CONFIG, CAMERA_PHONE, BIOMES } from '../config/constants.js';
import { QUALITY_PRESETS, getSavedQuality, getLowerQualityTier, saveQuality } from '../config/quality.js';
import { CameraZoom, isTouchDevice } from './CameraZoom.js';
import { ShadowFollower } from './ShadowFollower.js';
import { createMap } from '../maps/index.js';
import {
  MYTHIC_CHEST, CHEST_COORDS, CRYSTAL_COORDS, BUSH_COORDS, PAD_COORDS, SURYA_COORDS, BRAZIER_COORDS
} from '../config/worldLayout.js';
import { loadBiomeHistory, saveBiomeHistory, initNextBiome, pickNextBiome } from './BiomeRotation.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BIOMES.GRASS.skyColor);
    this.camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.FOV || 58, window.innerWidth / window.innerHeight, 0.5, 160);

    const initialTier = getSavedQuality();
    this.qualityTier = initialTier;
    const preset = QUALITY_PRESETS[initialTier];
    this.createdWithAntialias = preset.antialias;

    this.renderer = new THREE.WebGLRenderer({ antialias: preset.antialias, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(preset.pixelRatio);
    this.renderer.setClearColor(BIOMES.GRASS.skyColor, 1.0);

    const hasShadows = preset.shadows !== 'off' && !!preset.shadows;
    this.renderer.shadowMap.enabled = hasShadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.cameraTarget = new THREE.Vector3();
    this.cameraDesiredPos = new THREE.Vector3();
    this.cameraLookPos = new THREE.Vector3();
    this.hitShakeTimer = 0; this.hitShakeDuration = 0.15; this.hitShakeAmp = 0.12; this.trauma = 0;
    this.zoom = new CameraZoom();
    this.obelisks = []; this.obeliskMeshes = [];
    this.biomeHistory = loadBiomeHistory();
    this.nextBiomeKey = initNextBiome(this.biomeHistory);
    this.qualityEvaluated = false;
    this.matchFpsTimer = 0; this.matchFpsFrames = 0;
    this.particleSys = null;
    this.onQualityChange = null;

    this.initLights();
    this.initArena();
    this.map = null;
    this.mapId = null;
    this.ready = this.applyBiome(this.nextBiomeKey);
    window.addEventListener('resize', () => this.onResize());
  }

  onMatchStart() { this.qualityEvaluated = false; this.matchFpsTimer = 0; this.matchFpsFrames = 0; }

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
      if (this.onQualityChange) this.onQualityChange(nextTier);
    }
  }

  applyQuality(tier, particleSys = null) {
    const preset = QUALITY_PRESETS[tier];
    if (!preset) return;
    this.qualityTier = tier;
    this.renderer.setPixelRatio(preset.pixelRatio);

    const hasShadows = preset.shadows !== 'off' && !!preset.shadows;
    this.renderer.shadowMap.enabled = hasShadows;
    if (this.dirLight) {
      this.dirLight.castShadow = hasShadows;
      if (hasShadows) {
        const size = typeof preset.shadows === 'number' ? preset.shadows : (preset.shadowMapSize || 1024);
        this.dirLight.shadow.mapSize.set(size, size);
        if (this.shadowFollower) this.shadowFollower.applyCameraBounds();
        if (this.dirLight.shadow.map) {
          this.dirLight.shadow.map.dispose();
          this.dirLight.shadow.map = null;
        }
      }
    }
    if (this.floorMesh) this.floorMesh.receiveShadow = hasShadows;

    const ps = particleSys || this.particleSys;
    if (ps) {
      ps.particleScale = preset.particleScale;
      if (ps.baseMaxParticles === undefined) ps.baseMaxParticles = ps.maxParticles;
      ps.maxParticles = Math.floor(ps.baseMaxParticles * preset.particleScale);
      if (ps.baseMaxRings === undefined) ps.baseMaxRings = ps.maxRings || 12;
      ps.maxRings = Math.max(4, Math.floor(ps.baseMaxRings * preset.particleScale));
    }
  }

  getNextBiomeName() {
    return (BIOMES[this.nextBiomeKey] || BIOMES.GRASS).name;
  }

  async startMatchBiome(bushes = [], forcedBiomeKey = null) {
    const biomeKey = (forcedBiomeKey && BIOMES[forcedBiomeKey.toUpperCase()])
      ? forcedBiomeKey.toUpperCase()
      : (this.nextBiomeKey || pickNextBiome(this.biomeHistory));
    this.biomeHistory.push(biomeKey);
    if (this.biomeHistory.length > 8) this.biomeHistory.shift();
    await this.applyBiome(biomeKey, bushes);
    this.nextBiomeKey = pickNextBiome(this.biomeHistory);
    saveBiomeHistory(this.biomeHistory, this.nextBiomeKey);
    return biomeKey;
  }

  addTrauma(amount = 0.4) { this.trauma = Math.min(1.0, this.trauma + amount); }
  triggerHitShake(amp = 0.12, dur = 0.15) { this.hitShakeAmp = amp; this.hitShakeDuration = dur; this.hitShakeTimer = dur; }

  initLights() {
    const preset = QUALITY_PRESETS[this.qualityTier] || QUALITY_PRESETS.HIGH;
    const hasShadows = preset.shadows !== 'off' && !!preset.shadows;

    this.hemiLight = new THREE.HemisphereLight(0xFFFBEB, 0x3D6B24, 0.7);
    this.scene.add(this.hemiLight);

    const lightOffset = new THREE.Vector3(40, 65, 30);
    this.dirLight = new THREE.DirectionalLight(0xFFF4D2, 1.45);
    this.dirLight.position.copy(lightOffset);
    this.dirLight.target.position.set(0, 0, 0);
    this.dirLight.castShadow = hasShadows;

    const mapSize = typeof preset.shadows === 'number' ? preset.shadows : (preset.shadowMapSize || 1024);
    this.dirLight.shadow.mapSize.set(mapSize, mapSize);
    this.dirLight.shadow.bias = -0.0004;
    this.dirLight.shadow.normalBias = 0.03;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 160;

    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);
    this.shadowFollower = new ShadowFollower(this.dirLight, lightOffset, 25);
  }

  initArena() {
    const preset = QUALITY_PRESETS[this.qualityTier] || QUALITY_PRESETS.HIGH;
    const hasShadows = preset.shadows !== 'off' && !!preset.shadows;
    this.floorMat = new THREE.MeshLambertMaterial({ color: BIOMES.GRASS.floorColor });
    this.floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(ARENA.RADIUS, ARENA.RADIUS, 1, 64), this.floorMat);
    this.floorMesh.position.y = -0.5;
    this.floorMesh.receiveShadow = hasShadows;
    this.scene.add(this.floorMesh);
  }

  async buildMap(biome) {
    const mapId = biome.id.toLowerCase();
    if (this.map && this.mapId === mapId) return;
    if (this.map) this.map.dispose();
    this.obelisks.length = 0;
    this.map = await createMap(mapId, this.scene, {
      obstacles: this.obelisks,
      floor: false,
      anchors: {
        mythicChest: MYTHIC_CHEST, chests: CHEST_COORDS, crystals: CRYSTAL_COORDS,
        bushes: BUSH_COORDS, pads: PAD_COORDS, suryas: SURYA_COORDS, braziers: BRAZIER_COORDS
      }
    });
    this.mapId = mapId;
  }

  async applyBiome(biomeKey = null, bushes = []) {
    let biome = typeof biomeKey === 'string' ? BIOMES[biomeKey.toUpperCase()] : biomeKey;
    if (!biome) { const k = Object.keys(BIOMES); biome = BIOMES[k[Math.floor(Math.random() * k.length)]]; }
    this.currentBiome = biome;
    this.scene.background.setHex(biome.skyColor);
    this.renderer.setClearColor(biome.skyColor, 1.0);
    const near = biome.fogNear || 45, far = biome.fogFar || 140;
    if (!this.scene.fog) this.scene.fog = new THREE.Fog(biome.fogColor, near, far);
    else { this.scene.fog.color.setHex(biome.fogColor); this.scene.fog.near = near; this.scene.fog.far = far; }
    await this.buildMap(biome);

    if (this.hemiLight) { this.hemiLight.color.setHex(0xFFFBEB); this.hemiLight.groundColor.setHex(0x3D6B24); this.hemiLight.intensity = 0.7; }
    if (this.dirLight) { this.dirLight.color.setHex(0xFFF4D2); this.dirLight.intensity = 1.45; }
    if (this.map && this.hemiLight && this.dirLight) this.map.applyLighting(this.hemiLight, this.dirLight);
    if (this.floorMat) this.floorMat.color.setHex(this.map?.floorColor ?? biome.floorColor);
    if (this.obeliskMeshes) {
      this.obeliskMeshes.forEach((mesh) => {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m, i) => m.color.setHex(i === 2 ? biome.obeliskTopColor : biome.obeliskColor));
        else if (mesh.material) mesh.material.color.setHex(biome.obeliskTopColor || biome.obeliskColor);
      });
    }
    if (bushes && bushes.length > 0) bushes.forEach((b) => b.setBiomeColor && b.setBiomeColor(biome.bushColor, biome.bushEdgeColor));
    return biome;
  }

  updateCamera(playerPos, aimDir, dt = 0.016) {
    if (this.shadowFollower) this.shadowFollower.update(playerPos);

    const lookAheadX = aimDir.x * CAMERA_CONFIG.AIM_LOOKAHEAD;
    const lookAheadZ = aimDir.z * CAMERA_CONFIG.AIM_LOOKAHEAD;
    let shakeX = 0, shakeZ = 0;
    if (this.trauma > 0) {
      const shakePower = this.trauma * this.trauma * 0.9;
      shakeX = (Math.random() - 0.5) * shakePower;
      shakeZ = (Math.random() - 0.5) * shakePower;
      this.trauma = Math.max(0, this.trauma - dt * 2.5);
    }
    if (this.hitShakeTimer > 0) {
      const decay = this.hitShakeTimer / (this.hitShakeDuration || 0.15);
      shakeX += (Math.random() * 2 - 1) * this.hitShakeAmp * decay;
      shakeZ += (Math.random() * 2 - 1) * this.hitShakeAmp * decay;
      this.hitShakeTimer = Math.max(0, this.hitShakeTimer - dt);
    }

    const zoomMult = this.zoom.update();
    const camCfg = isTouchDevice() ? CAMERA_PHONE : CAMERA_CONFIG;
    const pitchBias = CAMERA_CONFIG.PITCH_BIAS || 1.0;
    const desiredX = playerPos.x + lookAheadX + shakeX;
    const desiredY = camCfg.OFFSET_Y * pitchBias * zoomMult;
    const desiredZ = playerPos.z + (camCfg.OFFSET_Z * pitchBias * zoomMult) + lookAheadZ + shakeZ;

    this.cameraDesiredPos.set(desiredX, desiredY, desiredZ);
    this.camera.position.lerp(this.cameraDesiredPos, CAMERA_CONFIG.LERP_SPEED);
    const forwardLead = camCfg.LOOK_FORWARD ?? 3.0;
    this.cameraLookPos.set(playerPos.x + lookAheadX * 0.5, 0, playerPos.z - forwardLead + lookAheadZ * 0.5);
    this.cameraTarget.lerp(this.cameraLookPos, CAMERA_CONFIG.LERP_SPEED);
    this.camera.lookAt(this.cameraTarget);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const preset = QUALITY_PRESETS[this.qualityTier] || QUALITY_PRESETS.HIGH;
    this.renderer.setPixelRatio(preset.pixelRatio);
    if (this.zoom?.syncWithDevice) this.zoom.syncWithDevice();
  }

  render() { this.renderer.render(this.scene, this.camera); }
}

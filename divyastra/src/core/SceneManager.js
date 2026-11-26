import * as THREE from 'three';
import { ARENA, CAMERA_CONFIG, CAMERA_PHONE, BIOMES } from '../config/constants.js';
import { QUALITY_PRESETS, getSavedQuality } from '../config/quality.js';
import { CameraZoom, isTouchDevice } from './CameraZoom.js';
import { ShadowFollower } from './ShadowFollower.js';
import { PostProcessingManager } from './PostProcessingManager.js';
import { SceneQuality } from './SceneQuality.js';
import { createMap } from '../maps/index.js';
import {
  MYTHIC_CHEST, CHEST_COORDS, CRYSTAL_COORDS, BUSH_COORDS, PAD_COORDS, SURYA_COORDS, BRAZIER_COORDS
} from '../config/worldLayout.js';
import { loadBiomeHistory, saveBiomeHistory, initNextBiome, pickNextBiome } from './BiomeRotation.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BIOMES.GRASS.skyColor);
    this.scene.fog = new THREE.FogExp2(BIOMES.GRASS.fogColor, 0.012);
    this.camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.FOV || 58, window.innerWidth / window.innerHeight, 0.5, 160);

    const initialTier = getSavedQuality();
    this.qualityTier = initialTier;
    const preset = QUALITY_PRESETS[initialTier];
    this.createdWithAntialias = preset.antialias;

    this.renderer = new THREE.WebGLRenderer({ antialias: preset.antialias, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(preset.pixelRatio);
    this.renderer.setClearColor(BIOMES.GRASS.skyColor, 1.0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const hasShadows = preset.shadows !== 'off' && !!preset.shadows;
    this.renderer.shadowMap.enabled = hasShadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.postProcessing = new PostProcessingManager(this.renderer, this.scene, this.camera, this.qualityTier);
    this.quality = new SceneQuality(this);

    this.cameraTarget = new THREE.Vector3();
    this.scene.userData.cameraTarget = this.cameraTarget;
    this.cameraDesiredPos = new THREE.Vector3();
    this.cameraLookPos = new THREE.Vector3();
    this.hitShakeTimer = 0; this.hitShakeDuration = 0.15; this.hitShakeAmp = 0.12; this.trauma = 0;
    this.zoom = new CameraZoom();
    this.obelisks = []; this.obeliskMeshes = [];
    this.biomeHistory = loadBiomeHistory();
    this.nextBiomeKey = initNextBiome(this.biomeHistory);
    this.particleSys = null;
    this.onQualityChange = null;

    this.initLights();
    this.initArena();
    this.map = null;
    this.mapId = null;
    this.ready = this.applyBiome(this.nextBiomeKey);
    window.addEventListener('resize', () => this.onResize());
  }

  onMatchStart() { this.quality.onMatchStart(); }
  checkPerformanceFallback(dt, particleSys = null) { this.quality.checkPerformanceFallback(dt, particleSys); }
  stepDownQuality(particleSys = null) { this.quality.stepDownQuality(particleSys); }
  applyQuality(tier, particleSys = null) { this.quality.applyQuality(tier, particleSys); }

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

    this.hemiLight = new THREE.HemisphereLight(0x8FA8FF, 0x4A3A2A, 0.7);
    this.scene.add(this.hemiLight);

    const lightOffset = new THREE.Vector3(40, 65, 30);
    this.dirLight = new THREE.DirectionalLight(0xFFE2B0, 2.2);
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

    const fogDensity = 0.012;
    if (!this.scene.fog || !(this.scene.fog instanceof THREE.FogExp2)) {
      this.scene.fog = new THREE.FogExp2(biome.fogColor, fogDensity);
    } else {
      this.scene.fog.color.setHex(biome.fogColor);
      this.scene.fog.density = fogDensity;
    }
    await this.buildMap(biome);

    if (this.hemiLight) {
      this.hemiLight.color.setHex(0x8FA8FF);
      this.hemiLight.groundColor.setHex(0x4A3A2A);
      this.hemiLight.intensity = 0.7;
    }
    if (this.dirLight) {
      this.dirLight.color.setHex(0xFFE2B0);
      this.dirLight.intensity = 2.2;
    }
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

    const isTouch = isTouchDevice();
    const camCfg = isTouch ? CAMERA_PHONE : CAMERA_CONFIG;
    const aimLookahead = isTouch ? (CAMERA_PHONE.AIM_LOOKAHEAD ?? 1.5) : CAMERA_CONFIG.AIM_LOOKAHEAD;
    const lookAheadX = aimDir.x * aimLookahead;
    const lookAheadZ = aimDir.z * aimLookahead;
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
    const pitchBias = CAMERA_CONFIG.PITCH_BIAS || 1.0;
    const desiredX = playerPos.x + lookAheadX + shakeX;
    const desiredY = camCfg.OFFSET_Y * pitchBias * zoomMult;
    const desiredZ = playerPos.z + (camCfg.OFFSET_Z * pitchBias * zoomMult) + lookAheadZ + shakeZ;

    this.cameraDesiredPos.set(desiredX, desiredY, desiredZ);
    this.camera.position.lerp(this.cameraDesiredPos, CAMERA_CONFIG.LERP_SPEED);
    const forwardLead = camCfg.LOOK_FORWARD ?? (isTouch ? -0.4 : -1.3);
    this.cameraLookPos.set(playerPos.x + lookAheadX * 0.5, 0, playerPos.z - forwardLead + lookAheadZ * 0.5);
    this.cameraTarget.lerp(this.cameraLookPos, CAMERA_CONFIG.LERP_SPEED);

    // Keep player at ~45% screen height and never lower than 60% of screen height (ndc.y >= -0.20)
    const maxLead = isTouch ? 2.5 : 4.0;
    if (playerPos.z - this.cameraTarget.z > maxLead) {
      this.cameraTarget.z = playerPos.z - maxLead;
    }
    this.camera.lookAt(this.cameraTarget);
    if (this.map?.updateTreeOcclusion) this.map.updateTreeOcclusion(playerPos, this.camera.position, dt);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const preset = QUALITY_PRESETS[this.qualityTier] || QUALITY_PRESETS.HIGH;
    this.renderer.setPixelRatio(preset.pixelRatio);
    if (this.postProcessing) this.postProcessing.setSize(window.innerWidth, window.innerHeight);
    if (this.zoom?.syncWithDevice) this.zoom.syncWithDevice();
  }

  render() {
    if (this.postProcessing) this.postProcessing.render();
    else this.renderer.render(this.scene, this.camera);
  }
}

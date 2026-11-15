import * as THREE from 'three';
import { COLORS, ARENA, CAMERA_CONFIG, BIOMES, QUALITY } from '../config/constants.js';
import { CameraZoom } from './CameraZoom.js';
import { WorldEnvironment } from './WorldEnvironment.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BIOMES.GRASS.skyColor);
    this.camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.FOV || 58, window.innerWidth / window.innerHeight, 0.5, 160);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(BIOMES.GRASS.skyColor, 1.0);

    const isMobile = typeof navigator !== 'undefined' && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
    this.renderer.shadowMap.enabled = !isMobile;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.cameraTarget = new THREE.Vector3();
    this.cameraDesiredPos = new THREE.Vector3();
    this.cameraLookPos = new THREE.Vector3();
    this.hitShakeTimer = 0; this.hitShakeDuration = 0.15; this.hitShakeAmp = 0.12; this.trauma = 0;
    this.zoom = new CameraZoom();
    this.obelisks = [];
    this.obeliskMeshes = [];
    this.biomeHistory = this.loadBiomeHistory();
    this.nextBiomeKey = this.initNextBiome();
    this.qualityMode = QUALITY || 'auto';
    this.qualityEvaluated = false;
    this.matchFpsTimer = 0;
    this.matchFpsFrames = 0;

    this.initLights(isMobile);
    this.initArena();
    this.worldEnv = new WorldEnvironment(this.scene);
    this.applyBiome(this.nextBiomeKey);
    window.addEventListener('resize', () => this.onResize());
  }

  onMatchStart() {
    this.qualityEvaluated = false;
    this.matchFpsTimer = 0;
    this.matchFpsFrames = 0;
    if (this.qualityMode === 'low') this.applyLowQuality();
  }

  checkPerformanceFallback(dt, particleSys = null) {
    if (this.qualityMode !== 'auto' || this.qualityEvaluated) return;
    this.matchFpsTimer += dt;
    this.matchFpsFrames++;
    if (this.matchFpsTimer >= 4.0) {
      this.qualityEvaluated = true;
      if (this.matchFpsFrames / this.matchFpsTimer < 40) this.applyLowQuality(particleSys);
    }
  }

  applyLowQuality(particleSys = null) {
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = false;
    if (this.dirLight) this.dirLight.castShadow = false;
    if (this.floorMesh) this.floorMesh.receiveShadow = false;
    if (particleSys) {
      if (particleSys.maxParticles) particleSys.maxParticles = Math.floor(particleSys.maxParticles * 0.5);
      if (particleSys.maxRings) particleSys.maxRings = Math.floor(particleSys.maxRings * 0.5);
    }
  }

  loadBiomeHistory() {
    try { const s = localStorage.getItem('magica_biome_history'); if (s) { const a = JSON.parse(s); if (Array.isArray(a)) return a; } } catch (e) {}
    return [];
  }

  saveBiomeHistory() {
    try { localStorage.setItem('magica_biome_history', JSON.stringify(this.biomeHistory)); localStorage.setItem('magica_next_biome', this.nextBiomeKey); } catch (e) {}
  }

  initNextBiome() {
    try { const s = localStorage.getItem('magica_next_biome'); if (s && BIOMES[s]) return s; } catch (e) {}
    const p = this.pickNextBiome();
    try { localStorage.setItem('magica_next_biome', p); } catch (e) {}
    return p;
  }

  pickNextBiome() {
    const h = this.biomeHistory, n = h.length;
    if (n >= 2 && h[n - 1] === h[n - 2]) return h[n - 1] === 'GRASS' ? 'SNOW' : 'GRASS';
    return Math.random() < 0.5 ? 'GRASS' : 'SNOW';
  }

  getNextBiomeName() {
    return (BIOMES[this.nextBiomeKey] || BIOMES.GRASS).name;
  }

  startMatchBiome(bushes = []) {
    const biomeKey = this.nextBiomeKey || this.pickNextBiome();
    this.biomeHistory.push(biomeKey);
    if (this.biomeHistory.length > 8) this.biomeHistory.shift();
    this.applyBiome(biomeKey, bushes);
    this.nextBiomeKey = this.pickNextBiome();
    this.saveBiomeHistory();
    return biomeKey;
  }

  addTrauma(amount = 0.4) { this.trauma = Math.min(1.0, this.trauma + amount); }
  triggerHitShake(amp = 0.12, dur = 0.15) { this.hitShakeAmp = amp; this.hitShakeDuration = dur; this.hitShakeTimer = dur; }

  initLights(isMobile = false) {
    this.ambientLight = new THREE.AmbientLight(BIOMES.GRASS.ambientColor, BIOMES.GRASS.ambientIntensity);
    this.scene.add(this.ambientLight);
    this.dirLight = new THREE.DirectionalLight(BIOMES.GRASS.dirLightColor, BIOMES.GRASS.dirLightIntensity);
    this.dirLight.position.set(35, 65, 30);
    this.dirLight.castShadow = !isMobile;
    if (!isMobile) {
      this.dirLight.shadow.mapSize.set(1024, 1024);
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 160;
      const d = 60, sc = this.dirLight.shadow.camera;
      sc.left = -d; sc.right = d; sc.top = d; sc.bottom = -d;
    }
    this.scene.add(this.dirLight);
  }

  initArena() {
    this.floorMat = new THREE.MeshLambertMaterial({ color: BIOMES.GRASS.floorColor });
    this.floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(ARENA.RADIUS, ARENA.RADIUS, 1, 64), this.floorMat);
    this.floorMesh.position.y = -0.5;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    [ARENA.RINGS.SANCTUM_MAX, ARENA.RINGS.RUINS_MAX, ARENA.RINGS.SPAWN_MAX].forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.35, radius, 64).rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 2 ? COLORS.STORM_RING : COLORS.RING_DIVIDER,
        transparent: true, opacity: idx === 2 ? 0.95 : 0.65, side: THREE.DoubleSide, depthWrite: false
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.04;
      ringMesh.renderOrder = 1;
      this.scene.add(ringMesh);
    });

    [[10, 10], [-10, 10], [10, -10], [-10, -10]].forEach(([x, z]) => {
      const obeliskGroup = new THREE.Group();
      obeliskGroup.position.set(x, 0, z);

      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(2.4, 16).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
      );
      shadow.position.y = 0.02;
      obeliskGroup.add(shadow);

      const pillarGeo = new THREE.BoxGeometry(2.4, 5.6, 2.4);
      const sideMat = new THREE.MeshLambertMaterial({ color: BIOMES.GRASS.obeliskColor, flatShading: true });
      const topMat = new THREE.MeshLambertMaterial({ color: BIOMES.GRASS.obeliskTopColor, flatShading: true });
      const pillar = new THREE.Mesh(pillarGeo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
      pillar.position.y = 2.8; pillar.castShadow = true; pillar.receiveShadow = true;
      obeliskGroup.add(pillar);
      this.obeliskMeshes.push(pillar);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.4, 4), topMat);
      cap.position.y = 6.3; cap.rotation.y = Math.PI / 4; cap.castShadow = true;
      obeliskGroup.add(cap);
      this.obeliskMeshes.push(cap);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeo), new THREE.LineBasicMaterial({ color: 0xcfd8dc, transparent: true, opacity: 0.65 }));
      edges.position.y = 2.8;
      obeliskGroup.add(edges);

      this.scene.add(obeliskGroup);
      this.obelisks.push({ x, z, radius: 1.5 });
    });
  }

  applyBiome(biomeKey = null, bushes = []) {
    let biome = typeof biomeKey === 'string' ? BIOMES[biomeKey.toUpperCase()] : biomeKey;
    if (!biome) { const k = Object.keys(BIOMES); biome = BIOMES[k[Math.floor(Math.random() * k.length)]]; }
    this.currentBiome = biome;
    this.scene.background.setHex(biome.skyColor);
    this.renderer.setClearColor(biome.skyColor, 1.0);
    const near = biome.fogNear || 45, far = biome.fogFar || 140;
    if (!this.scene.fog) this.scene.fog = new THREE.Fog(biome.fogColor, near, far);
    else { this.scene.fog.color.setHex(biome.fogColor); this.scene.fog.near = near; this.scene.fog.far = far; }
    if (this.ambientLight) { this.ambientLight.color.setHex(biome.ambientColor); this.ambientLight.intensity = biome.ambientIntensity; }
    if (this.dirLight) { this.dirLight.color.setHex(biome.dirLightColor); this.dirLight.intensity = biome.dirLightIntensity; }
    if (this.floorMat) this.floorMat.color.setHex(biome.floorColor);
    if (this.worldEnv) this.worldEnv.applyBiome(biome);
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
    const pitchBias = CAMERA_CONFIG.PITCH_BIAS || 1.0;
    const desiredX = playerPos.x + lookAheadX + shakeX;
    const desiredY = CAMERA_CONFIG.OFFSET_Y * pitchBias * zoomMult;
    const desiredZ = playerPos.z + (CAMERA_CONFIG.OFFSET_Z * pitchBias * zoomMult) + lookAheadZ + shakeZ;

    this.cameraDesiredPos.set(desiredX, desiredY, desiredZ);
    this.camera.position.lerp(this.cameraDesiredPos, CAMERA_CONFIG.LERP_SPEED);
    const forwardLead = CAMERA_CONFIG.LOOK_FORWARD || 3.0;
    this.cameraLookPos.set(playerPos.x + lookAheadX * 0.5, 0, playerPos.z - forwardLead + lookAheadZ * 0.5);
    this.cameraTarget.lerp(this.cameraLookPos, CAMERA_CONFIG.LERP_SPEED);
    this.camera.lookAt(this.cameraTarget);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

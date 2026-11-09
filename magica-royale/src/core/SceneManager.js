import * as THREE from 'three';
import { COLORS, ARENA, CAMERA_CONFIG, BIOMES } from '../config/constants.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BIOMES.GRASS.skyColor);
    this.camera = new THREE.PerspectiveCamera(CAMERA_CONFIG.FOV || 45, window.innerWidth / window.innerHeight, 0.5, 350);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.cameraTarget = new THREE.Vector3();
    this.trauma = 0;
    this.obelisks = [];
    this.obeliskMeshes = [];
    this.biomeHistory = this.loadBiomeHistory();
    this.nextBiomeKey = this.initNextBiome();

    this.initLights();
    this.initArena();
    this.applyBiome(this.nextBiomeKey);
    window.addEventListener('resize', () => this.onResize());
  }

  loadBiomeHistory() {
    try {
      const saved = localStorage.getItem('magica_biome_history');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    return [];
  }

  saveBiomeHistory() {
    try {
      localStorage.setItem('magica_biome_history', JSON.stringify(this.biomeHistory));
      localStorage.setItem('magica_next_biome', this.nextBiomeKey);
    } catch (e) {}
  }

  initNextBiome() {
    try {
      const saved = localStorage.getItem('magica_next_biome');
      if (saved && BIOMES[saved]) return saved;
    } catch (e) {}
    const picked = this.pickNextBiome();
    try { localStorage.setItem('magica_next_biome', picked); } catch (e) {}
    return picked;
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

  addTrauma(amount = 0.4) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  initLights() {
    this.ambientLight = new THREE.AmbientLight(0xfff3db, 1.0);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffae0, 1.4);
    this.dirLight.position.set(35, 65, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 160;
    const d = 60, sc = this.dirLight.shadow.camera;
    sc.left = -d; sc.right = d; sc.top = d; sc.bottom = -d;
    this.scene.add(this.dirLight);
  }

  createCheckerTexture(c1, c2) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = new THREE.Color(c1).getStyle();
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = new THREE.Color(c2).getStyle();
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(36, 36); texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  initArena() {
    const floorGeo = new THREE.CylinderGeometry(ARENA.RADIUS, ARENA.RADIUS, 1, 64);
    this.floorMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorMesh.position.y = -0.5;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    [ARENA.RINGS.SANCTUM_MAX, ARENA.RINGS.RUINS_MAX, ARENA.RINGS.SPAWN_MAX].forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.35, radius, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 2 ? COLORS.STORM_RING : COLORS.RING_DIVIDER,
        transparent: true, opacity: idx === 2 ? 0.95 : 0.65, side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.04;
      this.scene.add(ringMesh);
    });

    const positions = [[10, 10], [-10, 10], [10, -10], [-10, -10]];
    positions.forEach(([x, z]) => {
      const obeliskGroup = new THREE.Group();
      obeliskGroup.position.set(x, 0, z);

      const shadowGeo = new THREE.CircleGeometry(2.4, 16);
      shadowGeo.rotateX(-Math.PI / 2);
      const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
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
    let biome = biomeKey;
    if (typeof biome === 'string') biome = BIOMES[biome.toUpperCase()];
    if (!biome) {
      const keys = Object.keys(BIOMES);
      biome = BIOMES[keys[Math.floor(Math.random() * keys.length)]];
    }
    this.currentBiome = biome;
    this.scene.background = new THREE.Color(biome.skyColor);
    if (!this.scene.fog) {
      this.scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
    } else {
      this.scene.fog.color.setHex(biome.fogColor);
      this.scene.fog.density = biome.fogDensity;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(biome.ambientColor);
      this.ambientLight.intensity = biome.ambientIntensity;
    }
    if (this.dirLight) {
      this.dirLight.color.setHex(biome.dirLightColor);
      this.dirLight.intensity = biome.dirLightIntensity;
    }
    if (this.floorMesh) {
      if (this.floorTexture) this.floorTexture.dispose();
      this.floorTexture = this.createCheckerTexture(biome.floorColor, biome.floorAccentColor);
      this.floorMesh.material.map = this.floorTexture;
      this.floorMesh.material.needsUpdate = true;
    }
    if (this.obeliskMeshes) {
      this.obeliskMeshes.forEach((mesh) => {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m, i) => m.color.setHex(i === 2 ? biome.obeliskTopColor : biome.obeliskColor));
        } else if (mesh.material) {
          mesh.material.color.setHex(biome.obeliskTopColor || biome.obeliskColor);
        }
      });
    }
    if (bushes && bushes.length > 0) {
      bushes.forEach((b) => {
        if (b.setBiomeColor) b.setBiomeColor(biome.bushColor, biome.bushEdgeColor);
      });
    }
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

    const pitchBias = CAMERA_CONFIG.PITCH_BIAS || 1.0;
    const desiredX = playerPos.x + lookAheadX + shakeX;
    const desiredY = CAMERA_CONFIG.OFFSET_Y * pitchBias;
    const desiredZ = playerPos.z + (CAMERA_CONFIG.OFFSET_Z * pitchBias) + lookAheadZ + shakeZ;

    this.camera.position.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), CAMERA_CONFIG.LERP_SPEED);
    this.cameraTarget.lerp(
      new THREE.Vector3(playerPos.x + lookAheadX * 0.5, 0, playerPos.z + lookAheadZ * 0.5),
      CAMERA_CONFIG.LERP_SPEED
    );
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

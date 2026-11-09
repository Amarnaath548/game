import * as THREE from 'three';
import { COLORS, ARENA, CAMERA_CONFIG, BIOMES } from '../config/constants.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BIOMES.GRASS.skyColor);

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.FOV || 45,
      window.innerWidth / window.innerHeight,
      0.5,
      350
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    document.body.appendChild(this.renderer.domElement);

    this.cameraTarget = new THREE.Vector3();
    this.trauma = 0; // Screen shake trauma (0 - 1)
    this.obelisks = [];
    this.obeliskMeshes = [];

    this.initLights();
    this.initArena();
    this.applyBiome('GRASS');

    window.addEventListener('resize', () => this.onResize());
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
    const d = 60;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);
  }

  createCheckerTexture(c1, c2) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = new THREE.Color(c1).getStyle();
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = new THREE.Color(c2).getStyle();
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(36, 36);
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  initArena() {
    const floorGeo = new THREE.CylinderGeometry(ARENA.RADIUS, ARENA.RADIUS, 1, 64);
    this.floorMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorMesh.position.y = -0.5;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Tactical zone rings
    [ARENA.RINGS.SANCTUM_MAX, ARENA.RINGS.RUINS_MAX, ARENA.RINGS.SPAWN_MAX].forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.35, radius, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 2 ? COLORS.STORM_RING : 0xffffff,
        transparent: true,
        opacity: idx === 2 ? 0.95 : 0.45,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.04;
      this.scene.add(ringMesh);
    });

    // 4 Chunky Low-Poly Sanctum Obelisks with lighter stone & darker top face
    const positions = [[10, 10], [-10, 10], [10, -10], [-10, -10]];
    positions.forEach(([x, z]) => {
      const obeliskGroup = new THREE.Group();
      obeliskGroup.position.set(x, 0, z);

      const shadowGeo = new THREE.CircleGeometry(2.4, 16);
      shadowGeo.rotateX(-Math.PI / 2);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.y = 0.02;
      obeliskGroup.add(shadow);

      const pillarGeo = new THREE.BoxGeometry(2.4, 5.6, 2.4);
      const sideMat = new THREE.MeshLambertMaterial({ color: BIOMES.GRASS.obeliskColor, flatShading: true });
      const topMat = new THREE.MeshLambertMaterial({ color: BIOMES.GRASS.obeliskTopColor, flatShading: true });
      const pillarMats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
      const pillar = new THREE.Mesh(pillarGeo, pillarMats);
      pillar.position.y = 2.8;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      obeliskGroup.add(pillar);
      this.obeliskMeshes.push(pillar);

      const capGeo = new THREE.ConeGeometry(1.9, 1.4, 4);
      const cap = new THREE.Mesh(capGeo, topMat);
      cap.position.y = 6.3;
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = true;
      obeliskGroup.add(cap);
      this.obeliskMeshes.push(cap);

      const edgesGeo = new THREE.EdgesGeometry(pillarGeo);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0xcfd8dc, transparent: true, opacity: 0.65 });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      edges.position.y = 2.8;
      obeliskGroup.add(edges);

      this.scene.add(obeliskGroup);
      this.obelisks.push({ x, z, radius: 1.5 });
    });
  }

  applyBiome(biomeKey = null) {
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
          mesh.material[0].color.setHex(biome.obeliskColor);
          mesh.material[1].color.setHex(biome.obeliskColor);
          mesh.material[2].color.setHex(biome.obeliskTopColor);
          mesh.material[3].color.setHex(biome.obeliskColor);
          mesh.material[4].color.setHex(biome.obeliskColor);
          mesh.material[5].color.setHex(biome.obeliskColor);
        } else if (mesh.material) {
          mesh.material.color.setHex(biome.obeliskTopColor || biome.obeliskColor);
        }
      });
    }

    return biome;
  }

  updateCamera(playerPos, aimDir, dt = 0.016) {
    const lookAheadX = aimDir.x * CAMERA_CONFIG.AIM_LOOKAHEAD;
    const lookAheadZ = aimDir.z * CAMERA_CONFIG.AIM_LOOKAHEAD;

    let shakeX = 0;
    let shakeZ = 0;
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

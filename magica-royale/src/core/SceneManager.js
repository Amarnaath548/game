import * as THREE from 'three';
import { COLORS, ARENA, CAMERA_CONFIG } from '../config/constants.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.BG_VOID);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.5,
      250
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);

    this.cameraTarget = new THREE.Vector3();
    this.trauma = 0; // Screen shake trauma (0 - 1)
    this.obelisks = [];

    this.initLights();
    this.initArena();

    window.addEventListener('resize', () => this.onResize());
  }

  addTrauma(amount = 0.4) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  initLights() {
    const ambient = new THREE.AmbientLight(0xdbe4ff, 0.85);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.3);
    dirLight.position.set(35, 65, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 160;
    const d = 60;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);
  }

  initArena() {
    // Obsidian circular floor
    const floorGeo = new THREE.CylinderGeometry(ARENA.RADIUS, ARENA.RADIUS, 1, 64);
    const floorMat = new THREE.MeshLambertMaterial({ color: COLORS.FLOOR_SLATE });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle runes grid
    const grid = new THREE.GridHelper(ARENA.RADIUS * 2, 40, COLORS.GRID_RUNE, COLORS.GRID_RUNE);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // Tactical zone rings
    [ARENA.RINGS.SANCTUM_MAX, ARENA.RINGS.RUINS_MAX, ARENA.RINGS.SPAWN_MAX].forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.25, radius, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 2 ? COLORS.STORM_RING : COLORS.RING_DIVIDER,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = 0.04;
      this.scene.add(ringMesh);
    });

    // 4 Indestructible Sanctum Obelisks
    const obeliskGeo = new THREE.BoxGeometry(2.4, 6.0, 2.4);
    const obeliskMat = new THREE.MeshLambertMaterial({ color: COLORS.OBELISK });
    const positions = [
      [10, 10], [-10, 10], [10, -10], [-10, -10]
    ];
    positions.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(obeliskGeo, obeliskMat);
      pillar.position.set(x, 3.0, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
      this.obelisks.push({ x, z, radius: 1.5 });
    });
  }

  updateCamera(playerPos, aimDir, dt = 0.016) {
    const lookAheadX = aimDir.x * CAMERA_CONFIG.AIM_LOOKAHEAD;
    const lookAheadZ = aimDir.z * CAMERA_CONFIG.AIM_LOOKAHEAD;

    // Shake offset
    let shakeX = 0;
    let shakeZ = 0;
    if (this.trauma > 0) {
      const shakePower = this.trauma * this.trauma * 0.9;
      shakeX = (Math.random() - 0.5) * shakePower;
      shakeZ = (Math.random() - 0.5) * shakePower;
      this.trauma = Math.max(0, this.trauma - dt * 2.5);
    }

    const desiredX = playerPos.x + lookAheadX + shakeX;
    const desiredY = CAMERA_CONFIG.OFFSET_Y;
    const desiredZ = playerPos.z + CAMERA_CONFIG.OFFSET_Z + lookAheadZ + shakeZ;

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

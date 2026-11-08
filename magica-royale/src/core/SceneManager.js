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
    // Cap pixel ratio at 1.5 for mobile WebView performance
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.appendChild(this.renderer.domElement);

    this.cameraTarget = new THREE.Vector3();
    this.initLights();
    this.initArena();

    window.addEventListener('resize', () => this.onResize());
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
    // Main circular obsidian floor
    const floorGeo = new THREE.CylinderGeometry(ARENA.RADIUS, ARENA.RADIUS, 1, 64);
    const floorMat = new THREE.MeshLambertMaterial({ color: COLORS.FLOOR_SLATE });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle grid helper
    const grid = new THREE.GridHelper(ARENA.RADIUS * 2, 40, COLORS.GRID_RUNE, COLORS.GRID_RUNE);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // Concentric tactical zone rings (Sanctum 20, Ruins 50, Outer 80)
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

    // 4 Sanctum Obelisks in Center Ring
    const obeliskGeo = new THREE.BoxGeometry(2.2, 5.5, 2.2);
    const obeliskMat = new THREE.MeshLambertMaterial({ color: COLORS.OBELISK });
    const positions = [
      [10, 10], [-10, 10], [10, -10], [-10, -10]
    ];
    positions.forEach(([x, z]) => {
      const pillar = new THREE.Mesh(obeliskGeo, obeliskMat);
      pillar.position.set(x, 2.75, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    });
  }

  updateCamera(playerPos, aimDir) {
    const lookAheadX = aimDir.x * CAMERA_CONFIG.AIM_LOOKAHEAD;
    const lookAheadZ = aimDir.z * CAMERA_CONFIG.AIM_LOOKAHEAD;

    const desiredX = playerPos.x + lookAheadX;
    const desiredY = CAMERA_CONFIG.OFFSET_Y;
    const desiredZ = playerPos.z + CAMERA_CONFIG.OFFSET_Z + lookAheadZ;

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
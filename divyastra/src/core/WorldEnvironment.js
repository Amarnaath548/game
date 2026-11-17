import * as THREE from 'three';

/* ── Pond definitions with ghat rings ── */
const POND_DEFS = [
  { x: -52, z: 46, waterR: 11.0, shoreR: 13.5 },
  { x: 55, z: 42, waterR: 10.0, shoreR: 12.5 },
  { x: 42, z: -56, waterR: 12.0, shoreR: 14.8 }
];

/* ── Banyan tree positions (GRASS) & Pine positions (SNOW) ── */
const BANYAN_LOCS = [
  [-68, 48, 1.1], [-42, 36, 1.0], [-66, 60, 0.95], [66, 52, 0.9],
  [46, 54, 1.05], [30, -50, 1.1], [54, -68, 1.2], [42, -72, 1.05],
  [-85, 20, 1.2], [-75, -45, 1.0], [-30, -90, 1.05], [85, -25, 1.15],
  [78, 68, 1.1], [-20, 95, 1.2], [15, 95, 0.9]
];

const PINE_LOCS = [
  [-62, 34, 0.9], [-40, 58, 1.2], [44, 30, 1.0], [68, 36, 1.15],
  [58, 56, 0.85], [56, -48, 0.95], [32, -66, 0.9], [-90, -30, 1.1],
  [-15, -95, 0.95], [92, 15, 1.0]
];

/* ── Megalith rock clusters (Prithvi Vanam sector ~-50, 50) ── */
const MEGALITH_LOCS = [
  [-55, 55, 2.2, 0.9], [-48, 62, 1.8, 1.4], [-62, 48, 2.0, 0.6],
  [-45, 50, 1.5, 2.1], [-58, 58, 1.7, 1.0], [-52, 65, 1.4, 1.8]
];

const ROCK_LOCS = [
  [-40, 48, 1.4, 0.8, 1.2, 0.6], [-63, 42, 1.1, 1.1, 1.0, 1.2],
  [44, 46, 1.2, 0.9, 1.3, 0.4], [65, 46, 1.5, 1.0, 1.2, 1.8],
  [28, -58, 1.3, 0.9, 1.4, 1.1], [55, -60, 1.6, 1.2, 1.5, 0.9],
  [-78, 5, 2.0, 1.3, 1.8, 0.5], [-55, -75, 1.8, 1.2, 1.6, 2.9],
  [75, -50, 1.7, 1.1, 1.5, 0.8], [88, -10, 1.5, 0.9, 1.4, 1.4],
  [82, 35, 1.9, 1.4, 1.8, 2.2], [-25, 85, 1.6, 1.0, 1.5, 0.3]
];

export class WorldEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();
    this.isSnow = false;
    this.initPonds();
    this.initGhats();
    this.initBanyans();
    this.initPines();
    this.initMegaliths();
    this.initRocks();
  }

  initPonds() {
    this.shoreMat = new THREE.MeshLambertMaterial({ color: 0xe9d8a6 });
    this.pondEdgeMat = new THREE.MeshLambertMaterial({ color: 0x4d75a8 });
    this.pondMat = new THREE.MeshLambertMaterial({ color: 0x3b5f8a });
    POND_DEFS.forEach(p => {
      const sMesh = new THREE.Mesh(new THREE.CircleGeometry(p.shoreR, 32).rotateX(-Math.PI / 2), this.shoreMat);
      sMesh.position.set(p.x, 0.015, p.z); this.scene.add(sMesh);
      const eMesh = new THREE.Mesh(new THREE.CircleGeometry(p.waterR, 32).rotateX(-Math.PI / 2), this.pondEdgeMat);
      eMesh.position.set(p.x, 0.02, p.z); this.scene.add(eMesh);
      const wMesh = new THREE.Mesh(new THREE.CircleGeometry(p.waterR - 0.7, 32).rotateX(-Math.PI / 2), this.pondMat);
      wMesh.position.set(p.x, 0.025, p.z); this.scene.add(wMesh);
    });
  }

  initGhats() {
    this.ghatMat = new THREE.MeshLambertMaterial({ color: 0xD9B382, flatShading: true });
    this.lotusMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, side: THREE.DoubleSide, depthWrite: false });
    this.lotusPadMat = new THREE.MeshLambertMaterial({ color: 0x22c55e });
    POND_DEFS.forEach(p => {
      // Stepped concentric ghat rings
      [p.shoreR + 1.5, p.shoreR + 3.0].forEach((r, i) => {
        const geo = new THREE.RingGeometry(r - 0.6, r, 24); geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, this.ghatMat);
        mesh.position.set(p.x, 0.03 + i * 0.08, p.z);
        mesh.renderOrder = 1; this.scene.add(mesh);
      });
      // 3 floating lotus pads per pond
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + p.x * 0.01;
        const lx = p.x + Math.cos(a) * (p.waterR * 0.55);
        const lz = p.z + Math.sin(a) * (p.waterR * 0.55);
        // Pad circle
        const padGeo = new THREE.CircleGeometry(0.6, 8); padGeo.rotateX(-Math.PI / 2);
        const pad = new THREE.Mesh(padGeo, this.lotusPadMat);
        pad.position.set(lx, 0.04, lz); pad.renderOrder = 2; this.scene.add(pad);
        // Tiny bud cone
        const budGeo = new THREE.ConeGeometry(0.15, 0.4, 5);
        const bud = new THREE.Mesh(budGeo, this.lotusMat);
        bud.position.set(lx, 0.3, lz); this.scene.add(bud);
      }
    });
  }

  initBanyans() {
    const count = BANYAN_LOCS.length;
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.65, 2.0, 7);
    this.banyanTrunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
    this.banyanTrunkMesh = new THREE.InstancedMesh(trunkGeo, this.banyanTrunkMat, count);
    // Aerial root pillars (2 per tree)
    const rootGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.6, 4);
    this.banyanRootMesh = new THREE.InstancedMesh(rootGeo, this.banyanTrunkMat, count * 2);
    // Wide 3-lobe canopy
    const canopyGeo = new THREE.DodecahedronGeometry(1.0, 0);
    this.banyanCanopyMat = new THREE.MeshLambertMaterial({ color: 0x237A1E, flatShading: true });
    this.banyanCanopyMat2 = new THREE.MeshLambertMaterial({ color: 0x4CC22A, flatShading: true });
    this.banyanCanopyMesh = new THREE.InstancedMesh(canopyGeo, this.banyanCanopyMat, count * 2);
    this.banyanCanopyMesh2 = new THREE.InstancedMesh(canopyGeo, this.banyanCanopyMat2, count);
    let rIdx = 0, cIdx = 0, c2Idx = 0;
    BANYAN_LOCS.forEach(([x, z, s], i) => {
      // Trunk
      this.dummy.position.set(x, 1.0 * s, z);
      this.dummy.rotation.set(0, i * 1.1, 0);
      this.dummy.scale.set(s, s, s); this.dummy.updateMatrix();
      this.banyanTrunkMesh.setMatrixAt(i, this.dummy.matrix);
      // 2 aerial roots
      for (let r = 0; r < 2; r++) {
        const ra = i * 2.1 + r * 2.4;
        this.dummy.position.set(x + Math.cos(ra) * 1.3 * s, 0.8 * s, z + Math.sin(ra) * 1.3 * s);
        this.dummy.scale.set(s, s, s); this.dummy.updateMatrix();
        this.banyanRootMesh.setMatrixAt(rIdx++, this.dummy.matrix);
      }
      // 3 canopy lobes (2 dark, 1 light)
      const cY = 2.6 * s;
      for (let c = 0; c < 2; c++) {
        const ca = i * 1.5 + c * 2.1;
        this.dummy.position.set(x + Math.cos(ca) * 0.8 * s, cY, z + Math.sin(ca) * 0.8 * s);
        this.dummy.scale.set(s * 1.6, s * 0.65, s * 1.6); this.dummy.updateMatrix();
        this.banyanCanopyMesh.setMatrixAt(cIdx++, this.dummy.matrix);
      }
      this.dummy.position.set(x, cY + 0.3 * s, z);
      this.dummy.scale.set(s * 1.3, s * 0.5, s * 1.3); this.dummy.updateMatrix();
      this.banyanCanopyMesh2.setMatrixAt(c2Idx++, this.dummy.matrix);
    });
    [this.banyanTrunkMesh, this.banyanRootMesh, this.banyanCanopyMesh, this.banyanCanopyMesh2].forEach(m => {
      m.instanceMatrix.needsUpdate = true; this.scene.add(m);
    });
  }

  initPines() {
    const count = PINE_LOCS.length;
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 1.6, 6);
    this.pineTrunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
    this.pineTrunkMesh = new THREE.InstancedMesh(trunkGeo, this.pineTrunkMat, count);
    const coneGeo = new THREE.ConeGeometry(1.6, 1.8, 6);
    this.pineCanopyMat = new THREE.MeshLambertMaterial({ color: 0x1e4e3d, flatShading: true });
    this.pineCanopyMesh = new THREE.InstancedMesh(coneGeo, this.pineCanopyMat, count * 3);
    let fIdx = 0;
    PINE_LOCS.forEach(([x, z, s], i) => {
      this.dummy.position.set(x, 0.8 * s, z);
      this.dummy.rotation.set(0, i * 1.3 % Math.PI, 0);
      this.dummy.scale.set(s, s, s); this.dummy.updateMatrix();
      this.pineTrunkMesh.setMatrixAt(i, this.dummy.matrix);
      [{ y: 1.6, sc: 1.0 }, { y: 2.6, sc: 0.78 }, { y: 3.5, sc: 0.55 }].forEach(t => {
        this.dummy.position.set(x, t.y * s, z);
        this.dummy.scale.set(s * t.sc, s * t.sc, s * t.sc); this.dummy.updateMatrix();
        this.pineCanopyMesh.setMatrixAt(fIdx++, this.dummy.matrix);
      });
    });
    [this.pineTrunkMesh, this.pineCanopyMesh].forEach(m => {
      m.instanceMatrix.needsUpdate = true; this.scene.add(m);
    });
  }

  initMegaliths() {
    const geo = new THREE.DodecahedronGeometry(1.0, 0);
    this.megalithMat = new THREE.MeshLambertMaterial({ color: 0x6b7280, flatShading: true });
    this.megalithMesh = new THREE.InstancedMesh(geo, this.megalithMat, MEGALITH_LOCS.length);
    MEGALITH_LOCS.forEach(([x, z, s, rot], i) => {
      this.dummy.position.set(x, s * 0.5, z);
      this.dummy.rotation.set(0.15, rot, 0.1);
      this.dummy.scale.set(s * 0.7, s, s * 0.7); this.dummy.updateMatrix();
      this.megalithMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.megalithMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.megalithMesh);
  }

  initRocks() {
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    this.rockMat = new THREE.MeshLambertMaterial({ color: 0x7c858d, flatShading: true });
    this.rockMesh = new THREE.InstancedMesh(rockGeo, this.rockMat, ROCK_LOCS.length);
    ROCK_LOCS.forEach(([x, z, sx, sy, sz, rot], i) => {
      this.dummy.position.set(x, sy * 0.6, z);
      this.dummy.rotation.set(0.1, rot, 0.1);
      this.dummy.scale.set(sx, sy, sz); this.dummy.updateMatrix();
      this.rockMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.rockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.rockMesh);
  }

  applyBiome(biome) {
    const isSnow = biome && biome.id === 'SNOW';
    this.isSnow = isSnow;
    if (this.shoreMat) this.shoreMat.color.setHex(isSnow ? 0xdbeafe : (biome.shorelineColor || 0xe9d8a6));
    if (this.pondEdgeMat) this.pondEdgeMat.color.setHex(isSnow ? 0x93c5fd : (biome.pondEdgeColor || 0x4d75a8));
    if (this.pondMat) this.pondMat.color.setHex(isSnow ? 0x60a5fa : (biome.pondColor || 0x3b5f8a));
    if (this.rockMat) this.rockMat.color.setHex(isSnow ? 0x94a3b8 : 0x7c858d);
    if (this.megalithMat) this.megalithMat.color.setHex(isSnow ? 0x94a3b8 : 0x6b7280);
    if (this.ghatMat) this.ghatMat.color.setHex(isSnow ? 0x94a3b8 : 0xD9B382);
    // Banyan: show in GRASS, hide in SNOW
    [this.banyanTrunkMesh, this.banyanRootMesh, this.banyanCanopyMesh, this.banyanCanopyMesh2].forEach(m => {
      if (m) m.visible = !isSnow;
    });
    // Pine: show in SNOW, hide in GRASS
    [this.pineTrunkMesh, this.pineCanopyMesh].forEach(m => {
      if (m) m.visible = isSnow;
    });
    if (this.banyanCanopyMat) this.banyanCanopyMat.color.setHex(0x237A1E);
    if (this.banyanCanopyMat2) this.banyanCanopyMat2.color.setHex(0x4CC22A);
    if (this.pineCanopyMat) this.pineCanopyMat.color.setHex(isSnow ? 0x1e4e3d : 0x236b32);
  }
}

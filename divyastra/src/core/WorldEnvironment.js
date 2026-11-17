import * as THREE from 'three';

const POND_LOCS = [[-38, 34], [46, 28]];
const BANYAN_LOCS = [
  [-68, 48, 1.1], [-22, 62, 1.0], [-66, 60, 0.95], [68, 46, 0.9],
  [42, 60, 1.05], [20, -56, 1.1], [56, -68, 1.2], [38, -74, 1.05],
  [-85, 20, 1.2], [-75, -45, 1.0], [-30, -90, 1.05], [85, -25, 1.15],
  [78, 68, 1.1], [-20, 95, 1.2], [15, 95, 0.9]
];
const PINE_LOCS = [
  [-64, 30, 0.9], [-38, 60, 1.2], [24, 14, 1.0], [68, 20, 1.15],
  [58, 56, 0.85], [62, -56, 0.95], [30, -68, 0.9], [-90, -30, 1.1],
  [-15, -95, 0.95], [92, 15, 1.0]
];
const MEGALITH_LOCS = [
  [-55, 55, 2.2, 0.9], [-48, 64, 1.8, 1.4], [-64, 48, 2.0, 0.6],
  [-36, 56, 1.5, 2.1], [-58, 60, 1.7, 1.0], [-52, 68, 1.4, 1.8]
];
const ROCK_LOCS = [
  [-30, 52, 1.4, 0.8, 1.2, 0.6], [-65, 42, 1.1, 1.1, 1.0, 1.2],
  [32, 48, 1.2, 0.9, 1.3, 0.4], [66, 40, 1.5, 1.0, 1.2, 1.8],
  [22, -58, 1.3, 0.9, 1.4, 1.1], [56, -62, 1.6, 1.2, 1.5, 0.9],
  [-78, 5, 2.0, 1.3, 1.8, 0.5], [-55, -75, 1.8, 1.2, 1.6, 2.9],
  [75, -50, 1.7, 1.1, 1.5, 0.8], [88, -10, 1.5, 0.9, 1.4, 1.4],
  [82, 35, 1.9, 1.4, 1.8, 2.2], [-25, 85, 1.6, 1.0, 1.5, 0.3]
];

export class WorldEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();
    this.initPonds();
    this.initBanyans();
    this.initPines();
    this.initMegaliths();
    this.initRocks();
    this.initScatter();
  }

  /* ── Stepped Jala Step-Well with Azure Water & Shrines ── */
  initPonds() {
    this.stepHiMat = new THREE.MeshLambertMaterial({ color: 0xE6C28A, flatShading: true });
    this.stepShMat = new THREE.MeshLambertMaterial({ color: 0xC49E66, flatShading: true });
    this.pondMat = new THREE.MeshLambertMaterial({ color: 0x2B8CBE });
    this.lotusMat = new THREE.MeshBasicMaterial({ color: 0xF472B6 });
    this.lotusPadMat = new THREE.MeshLambertMaterial({ color: 0x2E8B22 });

    POND_LOCS.forEach(([px, pz]) => {
      // 3 descending concentric sandstone step tiers (14x10, 12x8, 10x6)
      [[5.8, 7.6, 0.16, this.stepShMat], [4.4, 5.8, 0.10, this.stepHiMat], [3.2, 4.4, 0.05, this.stepShMat]].forEach(([ir, or, y, mat]) => {
        const t = new THREE.Mesh(new THREE.RingGeometry(ir, or, 8).rotateX(-Math.PI / 2), mat);
        t.position.set(px, y, pz); t.scale.set(1.2, 1, 0.9); t.renderOrder = 1; this.scene.add(t);
      });
      const water = new THREE.Mesh(new THREE.CircleGeometry(3.6, 16).rotateX(-Math.PI / 2), this.pondMat);
      water.position.set(px, 0.035, pz); water.scale.set(1.2, 1, 0.9); this.scene.add(water);

      // Central 2-tier stepped stone shrine pedestal in water
      const ped1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.6), this.stepShMat);
      ped1.position.set(px, 0.2, pz); ped1.castShadow = true; this.scene.add(ped1);
      const ped2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 1.0), this.stepHiMat);
      ped2.position.set(px, 0.55, pz); ped2.castShadow = true; this.scene.add(ped2);
      const fin = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), this.stepShMat);
      fin.position.set(px, 0.85, pz); fin.castShadow = true; this.scene.add(fin);

      // Lotus pads (r=0.95) with multi-cone pink lotus blossoms
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const lx = px + Math.cos(a) * 2.8, lz = pz + Math.sin(a) * 2.1;
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.95, 8).rotateX(-Math.PI / 2), this.lotusPadMat);
        pad.position.set(lx, 0.045, lz); pad.renderOrder = 2; this.scene.add(pad);
        for (let k = 0; k < 3; k++) {
          const bud = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 4), this.lotusMat);
          bud.position.set(lx + (k - 1) * 0.16, 0.25, lz + (k % 2) * 0.1); this.scene.add(bud);
        }
      }
    });
  }

  /* ── Lush Banyans with Multi-Lobe Canopies & Vines ── */
  initBanyans() {
    const count = BANYAN_LOCS.length;
    this.bTrunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.6, 1.1, 3.4, 7), new THREE.MeshLambertMaterial({ color: 0x5c3a21 }), count);
    this.bTrunkMesh.castShadow = true;
    this.bRootMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 2.8, 4), new THREE.MeshLambertMaterial({ color: 0x4a2e1b }), count * 7);

    const fGeo = new THREE.DodecahedronGeometry(1.0, 0);
    this.foliageShMat = new THREE.MeshLambertMaterial({ color: 0x4E9A1E, flatShading: true });
    this.foliageHiMat = new THREE.MeshLambertMaterial({ color: 0x8CD926, flatShading: true });
    this.bLobeShMesh = new THREE.InstancedMesh(fGeo, this.foliageShMat, count * 3);
    this.bLobeHiMesh = new THREE.InstancedMesh(fGeo, this.foliageHiMat, count * 3);
    this.bLobeShMesh.castShadow = true; this.bLobeHiMesh.castShadow = true;

    let rIdx = 0, shIdx = 0, hiIdx = 0;
    BANYAN_LOCS.forEach(([x, z, s], i) => {
      this.dummy.position.set(x, 1.7 * s, z); this.dummy.rotation.set(0, i * 1.1, 0);
      this.dummy.scale.set(s, s, s); this.dummy.updateMatrix();
      this.bTrunkMesh.setMatrixAt(i, this.dummy.matrix);

      for (let r = 0; r < 7; r++) {
        const ra = i * 1.8 + r * 0.897, rad = (1.5 + (r % 3) * 0.3) * s;
        this.dummy.position.set(x + Math.cos(ra) * rad, 1.4 * s, z + Math.sin(ra) * rad);
        this.dummy.scale.set(s, s, s); this.dummy.updateMatrix();
        this.bRootMesh.setMatrixAt(rIdx++, this.dummy.matrix);
      }
      for (let c = 0; c < 3; c++) {
        const ca = i * 1.4 + c * 2.094;
        this.dummy.position.set(x + Math.cos(ca) * 1.3 * s, (3.3 + c * 0.2) * s, z + Math.sin(ca) * 1.3 * s);
        this.dummy.scale.set(s * 2.5, s * 0.85, s * 2.5); this.dummy.updateMatrix();
        this.bLobeShMesh.setMatrixAt(shIdx++, this.dummy.matrix);
      }
      for (let c = 0; c < 3; c++) {
        const ca = i * 1.4 + c * 2.094 + 1.047;
        this.dummy.position.set(x + Math.cos(ca) * 1.1 * s, (3.7 + c * 0.2) * s, z + Math.sin(ca) * 1.1 * s);
        this.dummy.scale.set(s * 2.2, s * 0.75, s * 2.2); this.dummy.updateMatrix();
        this.bLobeHiMesh.setMatrixAt(hiIdx++, this.dummy.matrix);
      }
    });

    [this.bTrunkMesh, this.bRootMesh, this.bLobeShMesh, this.bLobeHiMesh].forEach((m) => {
      m.instanceMatrix.needsUpdate = true; this.scene.add(m);
    });
  }

  initPines() {
    const count = PINE_LOCS.length;
    this.pineTrunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x5c3a21 }), count);
    this.pineCanopyMat = new THREE.MeshLambertMaterial({ color: 0x1e4e3d, flatShading: true });
    this.pineCanopyMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 1.8, 6), this.pineCanopyMat, count * 3);
    this.pineTrunkMesh.castShadow = true; this.pineCanopyMesh.castShadow = true;
    let fIdx = 0;
    PINE_LOCS.forEach(([x, z, s], i) => {
      this.dummy.position.set(x, 0.8 * s, z); this.dummy.rotation.set(0, (i * 1.3) % Math.PI, 0);
      this.dummy.scale.set(s, s, s); this.dummy.updateMatrix();
      this.pineTrunkMesh.setMatrixAt(i, this.dummy.matrix);
      [{ y: 1.6, sc: 1.0 }, { y: 2.6, sc: 0.78 }, { y: 3.5, sc: 0.55 }].forEach((t) => {
        this.dummy.position.set(x, t.y * s, z); this.dummy.scale.set(s * t.sc, s * t.sc, s * t.sc);
        this.dummy.updateMatrix(); this.pineCanopyMesh.setMatrixAt(fIdx++, this.dummy.matrix);
      });
    });
    [this.pineTrunkMesh, this.pineCanopyMesh].forEach((m) => { m.instanceMatrix.needsUpdate = true; this.scene.add(m); });
  }

  /* ── Moss-Capped Megaliths & Boulders ── */
  initMegaliths() {
    const count = MEGALITH_LOCS.length, g = new THREE.DodecahedronGeometry(1.0, 0);
    this.megalithMat = new THREE.MeshLambertMaterial({ color: 0x78828C, flatShading: true });
    this.mossMat = new THREE.MeshLambertMaterial({ color: 0x65B82A, flatShading: true });
    this.megMesh = new THREE.InstancedMesh(g, this.megalithMat, count);
    this.megMossMesh = new THREE.InstancedMesh(g, this.mossMat, count);
    this.megMesh.castShadow = true; this.megMossMesh.castShadow = true;

    MEGALITH_LOCS.forEach(([x, z, s, rot], i) => {
      this.dummy.position.set(x, s * 0.5, z); this.dummy.rotation.set(0.15, rot, 0.1);
      this.dummy.scale.set(s * 0.7, s, s * 0.7); this.dummy.updateMatrix();
      this.megMesh.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.set(x, s * 0.72, z); this.dummy.scale.set(s * 0.65, s * 0.35, s * 0.65);
      this.dummy.updateMatrix(); this.megMossMesh.setMatrixAt(i, this.dummy.matrix);
    });
    [this.megMesh, this.megMossMesh].forEach((m) => { m.instanceMatrix.needsUpdate = true; this.scene.add(m); });
  }

  initRocks() {
    const count = ROCK_LOCS.length, g = new THREE.DodecahedronGeometry(1.0, 0);
    this.rockMat = new THREE.MeshLambertMaterial({ color: 0x78828C, flatShading: true });
    this.rockMesh = new THREE.InstancedMesh(g, this.rockMat, count);
    this.rockMossMesh = new THREE.InstancedMesh(g, this.mossMat, count);
    this.rockMesh.castShadow = true; this.rockMossMesh.castShadow = true;

    ROCK_LOCS.forEach(([x, z, sx, sy, sz, rot], i) => {
      this.dummy.position.set(x, sy * 0.6, z); this.dummy.rotation.set(0.1, rot, 0.1);
      this.dummy.scale.set(sx, sy, sz); this.dummy.updateMatrix();
      this.rockMesh.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.set(x, sy * 0.85, z); this.dummy.scale.set(sx * 0.95, sy * 0.35, sz * 0.95);
      this.dummy.updateMatrix(); this.rockMossMesh.setMatrixAt(i, this.dummy.matrix);
    });
    [this.rockMesh, this.rockMossMesh].forEach((m) => { m.instanceMatrix.needsUpdate = true; this.scene.add(m); });
  }

  /* ── Ground Fern Rosettes, Matka Clusters & Shadows ── */
  initScatter() {
    // 1. Broad 6-leaf fern/agave rosettes (24 instances)
    const fernGeo = new THREE.ConeGeometry(0.18, 0.65, 3);
    const fernMat = new THREE.MeshLambertMaterial({ color: 0x3B8E22, flatShading: true });
    const fernMesh = new THREE.InstancedMesh(fernGeo, fernMat, 24 * 6);
    let fIdx = 0;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, d = 24 + ((i * 13) % 46);
      const fx = Math.cos(a) * d, fz = Math.sin(a) * d;
      for (let l = 0; l < 6; l++) {
        const la = (l / 6) * Math.PI * 2;
        this.dummy.position.set(fx + Math.cos(la) * 0.22, 0.2, fz + Math.sin(la) * 0.22);
        this.dummy.rotation.set(0.35 * Math.sin(la), la, 0.35 * Math.cos(la));
        this.dummy.scale.set(1, 1, 1); this.dummy.updateMatrix();
        fernMesh.setMatrixAt(fIdx++, this.dummy.matrix);
      }
    }
    fernMesh.instanceMatrix.needsUpdate = true; this.scene.add(fernMesh);

    // 2. Terracotta Matka Pots (16 instances beside gates and steps)
    const potMat = new THREE.MeshLambertMaterial({ color: 0xC85A32, flatShading: true });
    const potMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 6, 6), potMat, 16);
    const potRimMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.18, 0.06, 4, 8), potMat, 16);
    potMesh.castShadow = true;
    const matkaSpots = [[0,-17.5],[0,17.5],[-17.5,0],[17.5,0],[1.5,-22],[-1.5,-22],[1.5,22],[-1.5,22],[-22,1.5],[-22,-1.5],[22,1.5],[22,-1.5],[29,-35],[29,-37],[47,-35],[47,-37]];
    matkaSpots.forEach(([mx, mz], i) => {
      this.dummy.position.set(mx, 0.28, mz); this.dummy.scale.set(1, 1.15, 1); this.dummy.rotation.set(0, i * 0.5, 0); this.dummy.updateMatrix(); potMesh.setMatrixAt(i, this.dummy.matrix);
      this.dummy.position.set(mx, 0.56, mz); this.dummy.rotation.set(Math.PI / 2, 0, 0); this.dummy.scale.set(1, 1, 1); this.dummy.updateMatrix(); potRimMesh.setMatrixAt(i, this.dummy.matrix);
    });
    potMesh.instanceMatrix.needsUpdate = true; potRimMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(potMesh); this.scene.add(potRimMesh);

    // 3. Ground Contact Shadows
    const shadowItems = [
      ...BANYAN_LOCS.map(([x, z, s]) => [x, z, s * 2.4, s * 2.4]),
      ...PINE_LOCS.map(([x, z, s]) => [x, z, s * 1.5, s * 1.5]),
      ...MEGALITH_LOCS.map(([x, z, s]) => [x, z, s * 1.1, s * 1.1]),
      ...ROCK_LOCS.map(([x, z, sx, , sz]) => [x, z, sx * 1.1, sz * 1.1]),
      ...matkaSpots.map(([mx, mz]) => [mx, mz, 0.45, 0.45])
    ];
    const shadowGeo = new THREE.CircleGeometry(1.0, 12).rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false });
    this.shadowMesh = new THREE.InstancedMesh(shadowGeo, shadowMat, shadowItems.length);
    shadowItems.forEach(([x, z, sx, sz], i) => {
      this.dummy.position.set(x, 0.02, z); this.dummy.scale.set(sx, 1, sz);
      this.dummy.updateMatrix(); this.shadowMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.shadowMesh.instanceMatrix.needsUpdate = true; this.scene.add(this.shadowMesh);
  }

  applyBiome(biome) {
    const isSnow = biome && biome.id === 'SNOW';
    const sHi = isSnow ? 0x64748B : 0xE6C28A;
    const sSh = isSnow ? 0x334155 : 0xC49E66;

    if (this.stepHiMat) this.stepHiMat.color.setHex(sHi);
    if (this.stepShMat) this.stepShMat.color.setHex(sSh);
    if (this.pondMat) this.pondMat.color.setHex(isSnow ? 0x60a5fa : 0x2B8CBE);
    const stoneCol = isSnow ? 0x94a3b8 : 0x78828C;
    if (this.rockMat) this.rockMat.color.setHex(stoneCol);
    if (this.megalithMat) this.megalithMat.color.setHex(stoneCol);

    [this.bTrunkMesh, this.bRootMesh, this.bLobeShMesh, this.bLobeHiMesh].forEach((m) => { if (m) m.visible = !isSnow; });
    [this.pineTrunkMesh, this.pineCanopyMesh].forEach((m) => { if (m) m.visible = isSnow; });
    if (this.pineCanopyMat) this.pineCanopyMat.color.setHex(isSnow ? 0x1e4e3d : 0x236b32);
  }
}

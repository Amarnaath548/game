import * as THREE from 'three';

const POND_DEFS = [
  { x: -52, z: 46, waterR: 11.0, shoreR: 13.5 },
  { x: 55, z: 42, waterR: 10.0, shoreR: 12.5 },
  { x: 42, z: -56, waterR: 12.0, shoreR: 14.8 }
];

const TREE_LOCS = [
  [-68, 48, 1.1], [-62, 34, 0.9], [-40, 58, 1.2], [-42, 36, 1.0], [-66, 60, 0.95],
  [44, 30, 1.0], [68, 36, 1.15], [66, 52, 0.9], [46, 54, 1.05], [58, 56, 0.85],
  [30, -50, 1.1], [56, -48, 0.95], [54, -68, 1.2], [32, -66, 0.9], [42, -72, 1.05],
  [-85, 20, 1.2], [-75, -45, 1.0], [-90, -30, 1.1], [-30, -90, 1.05], [-15, -95, 0.95],
  [85, -25, 1.15], [92, 15, 1.0], [78, 68, 1.1], [-20, 95, 1.2], [15, 95, 0.9]
];

const ROCK_LOCS = [
  [-40, 48, 1.4, 0.8, 1.2, 0.6], [-63, 42, 1.1, 1.1, 1.0, 1.2], [-50, 60, 1.6, 0.7, 1.5, 2.1],
  [44, 46, 1.2, 0.9, 1.3, 0.4], [65, 46, 1.5, 1.0, 1.2, 1.8], [54, 30, 0.9, 0.8, 1.1, 2.7],
  [28, -58, 1.3, 0.9, 1.4, 1.1], [55, -60, 1.6, 1.2, 1.5, 0.9], [40, -43, 1.0, 0.7, 1.1, 2.3],
  [-78, 5, 2.0, 1.3, 1.8, 0.5], [-82, -20, 1.4, 1.0, 1.5, 1.7], [-55, -75, 1.8, 1.2, 1.6, 2.9],
  [75, -50, 1.7, 1.1, 1.5, 0.8], [88, -10, 1.5, 0.9, 1.4, 1.4], [82, 35, 1.9, 1.4, 1.8, 2.2],
  [-25, 85, 1.6, 1.0, 1.5, 0.3], [30, 85, 1.4, 0.9, 1.3, 1.9], [-60, -60, 1.7, 1.1, 1.6, 1.5]
];

const FENCE_LOCS = [
  [-44, 34, 0.4], [-42, 32, 0.4], [-60, 62, -0.6], [-58, 64, -0.6],
  [48, 28, -0.5], [50, 26, -0.5], [64, 54, 0.8], [66, 56, 0.8],
  [32, -48, 0.9], [34, -46, 0.9], [52, -70, -0.4], [54, -72, -0.4]
];

const PILLAR_LOCS = [
  [-85, 0], [-80, 35], [-60, 75], [-25, 90], [25, 90], [70, 65],
  [88, 20], [85, -20], [65, -70], [20, -92], [-20, -92], [-65, -68]
];

export class WorldEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();
    this.initPonds();
    this.initTrees();
    this.initRocks();
    this.initFences();
    this.initPillars();
  }

  initPonds() {
    this.shoreMat = new THREE.MeshLambertMaterial({ color: 0xe9d8a6 });
    this.pondEdgeMat = new THREE.MeshLambertMaterial({ color: 0x4d75a8 });
    this.pondMat = new THREE.MeshLambertMaterial({ color: 0x3b5f8a });

    POND_DEFS.forEach((p) => {
      const sMesh = new THREE.Mesh(new THREE.CircleGeometry(p.shoreR, 32).rotateX(-Math.PI / 2), this.shoreMat);
      sMesh.position.set(p.x, 0.015, p.z);
      this.scene.add(sMesh);

      const eMesh = new THREE.Mesh(new THREE.CircleGeometry(p.waterR, 32).rotateX(-Math.PI / 2), this.pondEdgeMat);
      eMesh.position.set(p.x, 0.02, p.z);
      this.scene.add(eMesh);

      const wMesh = new THREE.Mesh(new THREE.CircleGeometry(p.waterR - 0.7, 32).rotateX(-Math.PI / 2), this.pondMat);
      wMesh.position.set(p.x, 0.025, p.z);
      this.scene.add(wMesh);
    });
  }

  initTrees() {
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 1.6, 6);
    this.trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });
    this.trunkMesh = new THREE.InstancedMesh(trunkGeo, this.trunkMat, TREE_LOCS.length);

    const coneGeo = new THREE.ConeGeometry(1.6, 1.8, 6);
    this.foliageMat = new THREE.MeshLambertMaterial({ color: 0x236b32, flatShading: true });
    this.foliageMesh = new THREE.InstancedMesh(coneGeo, this.foliageMat, TREE_LOCS.length * 3);

    let fIdx = 0;
    TREE_LOCS.forEach(([x, z, s], i) => {
      this.dummy.position.set(x, 0.8 * s, z);
      this.dummy.rotation.set(0, (i * 1.3) % Math.PI, 0);
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.trunkMesh.setMatrixAt(i, this.dummy.matrix);

      const tiers = [
        { y: 1.6 * s, sc: s },
        { y: 2.6 * s, sc: s * 0.78 },
        { y: 3.5 * s, sc: s * 0.55 }
      ];
      tiers.forEach((t) => {
        this.dummy.position.set(x, t.y, z);
        this.dummy.scale.set(t.sc, t.sc, t.sc);
        this.dummy.updateMatrix();
        this.foliageMesh.setMatrixAt(fIdx++, this.dummy.matrix);
      });
    });

    this.trunkMesh.instanceMatrix.needsUpdate = true;
    this.foliageMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.trunkMesh);
    this.scene.add(this.foliageMesh);
  }

  initRocks() {
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    this.rockMat = new THREE.MeshLambertMaterial({ color: 0x7c858d, flatShading: true });
    this.rockMesh = new THREE.InstancedMesh(rockGeo, this.rockMat, ROCK_LOCS.length);

    ROCK_LOCS.forEach(([x, z, sx, sy, sz, rot], i) => {
      this.dummy.position.set(x, sy * 0.6, z);
      this.dummy.rotation.set(0.1, rot, 0.1);
      this.dummy.scale.set(sx, sy, sz);
      this.dummy.updateMatrix();
      this.rockMesh.setMatrixAt(i, this.dummy.matrix);
    });

    this.rockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.rockMesh);
  }

  initFences() {
    const fenceGeo = new THREE.BoxGeometry(0.25, 0.85, 2.0);
    this.fenceMat = new THREE.MeshLambertMaterial({ color: 0x7c4f24 });
    this.fenceMesh = new THREE.InstancedMesh(fenceGeo, this.fenceMat, FENCE_LOCS.length);

    FENCE_LOCS.forEach(([x, z, rot], i) => {
      this.dummy.position.set(x, 0.42, z);
      this.dummy.rotation.set(0, rot, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.fenceMesh.setMatrixAt(i, this.dummy.matrix);
    });

    this.fenceMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.fenceMesh);
  }

  initPillars() {
    const pillarGeo = new THREE.CylinderGeometry(0.7, 0.8, 3.4, 6);
    this.pillarMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
    this.pillarMesh = new THREE.InstancedMesh(pillarGeo, this.pillarMat, PILLAR_LOCS.length);

    PILLAR_LOCS.forEach(([x, z], i) => {
      this.dummy.position.set(x, 1.7, z);
      this.dummy.rotation.set(0, (i * 0.8) % Math.PI, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.pillarMesh.setMatrixAt(i, this.dummy.matrix);
    });

    this.pillarMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.pillarMesh);
  }

  applyBiome(biome) {
    const isSnow = biome && biome.id === 'SNOW';
    if (this.shoreMat) this.shoreMat.color.setHex(isSnow ? 0xdbeafe : (biome.shorelineColor || 0xe9d8a6));
    if (this.pondEdgeMat) this.pondEdgeMat.color.setHex(isSnow ? 0x93c5fd : (biome.pondEdgeColor || 0x4d75a8));
    if (this.pondMat) this.pondMat.color.setHex(isSnow ? 0x60a5fa : (biome.pondColor || 0x3b5f8a));
    if (this.foliageMat) this.foliageMat.color.setHex(isSnow ? 0x1e4e3d : (biome.treeFoliageColor || 0x236b32));
    if (this.rockMat) this.rockMat.color.setHex(isSnow ? 0x94a3b8 : 0x7c858d);
  }
}

import * as THREE from 'three';
import { ARENA } from '../config/constants.js';
import {
  mulberry32, isClear, RING_ROAD, PATH_HALF_W, PATH_END_R
} from '../config/worldLayout.js';
import { decalMat } from './geoUtils.js';

const PALETTE = {
  GRASS: {
    patchLight: 0xA6DE32, patchDark: 0x5BB81D,
    pathFill: 0xDDB574, pathEdge: 0xC59A58, stone: 0xEACB8F,
    ledge: 0x9ED836, wall: 0xD4783A, cap: 0x9BE02F,
    blocks: [0xD2713A, 0xBF5E2C, 0xDB8346, 0xA9531F, 0xC96A33]
  },
  SNOW: {
    patchLight: 0xFFFFFF, patchDark: 0xCFE3F5,
    pathFill: 0xB4C3D3, pathEdge: 0x94A7BC, stone: 0xD5E0EB,
    ledge: 0xEAF4FF, wall: 0x64748B, cap: 0xF1F8FF,
    blocks: [0x64748B, 0x56657A, 0x75849A, 0x475569, 0x5E6E84]
  }
};

/**
 * Ground dressing for the arena: mottled lime grass, sandy cross-roads with a ring road,
 * stepping stones, and a terracotta cliff rim.
 * All decals are flat Lambert meshes (so they receive shadows) layered by renderOrder.
 */
export class WorldTerrain {
  constructor(scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();
    this.mats = {};
    this.initPatches();
    this.initPaths();
    this.initStones();
    this.initRim();
  }

  flat(geo, mat, y, order) {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.renderOrder = order;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  /* ── Mottled grass: lighter & darker blobs over the base lime ── */
  initPatches() {
    const rng = mulberry32(1207);
    const geo = new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);
    this.mats.patchLight = decalMat(PALETTE.GRASS.patchLight);
    this.mats.patchDark = decalMat(PALETTE.GRASS.patchDark);

    const build = (mat, count, y, order) => {
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      mesh.receiveShadow = true;
      mesh.renderOrder = order;
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const d = Math.sqrt(rng()) * (ARENA.RADIUS - 2);
        const sx = 3 + rng() * 6.5;
        const sz = 2.5 + rng() * 5.5;
        this.dummy.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
        this.dummy.rotation.set(0, rng() * Math.PI, 0);
        this.dummy.scale.set(sx, 1, sz);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      return mesh;
    };
    build(this.mats.patchDark, 130, 0.004, 1);
    build(this.mats.patchLight, 150, 0.006, 2);
  }

  /* ── Sandy cross-roads (4 arms to the outer toranas) + ring road round the plaza ── */
  initPaths() {
    this.mats.pathEdge = decalMat(PALETTE.GRASS.pathEdge);
    this.mats.pathFill = decalMat(PALETTE.GRASS.pathFill);

    const [r0, r1] = RING_ROAD;
    this.flat(new THREE.RingGeometry(r0 - 0.7, r1 + 0.7, 56).rotateX(-Math.PI / 2), this.mats.pathEdge, 0.009, 3);
    this.flat(new THREE.RingGeometry(r0, r1, 56).rotateX(-Math.PI / 2), this.mats.pathFill, 0.012, 4);

    // Tapered arm: wide at the ring road, narrowing toward the gate
    const arm = (half0, half1, y0, y1) => {
      const s = new THREE.Shape();
      s.moveTo(-half0, y0); s.lineTo(half0, y0);
      s.lineTo(half1 * 1.05, (y0 + y1) * 0.5); s.lineTo(half1, y1);
      s.lineTo(-half1, y1); s.lineTo(-half1 * 1.05, (y0 + y1) * 0.5);
      s.closePath();
      return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2);
    };
    // Shape y -> world -z after rotateX(-90°); rotate around Y for each arm
    const edgeGeo = arm(PATH_HALF_W + 0.8, PATH_HALF_W - 0.1, r0 - 1, PATH_END_R + 0.6);
    const fillGeo = arm(PATH_HALF_W, PATH_HALF_W - 0.7, r0 - 1, PATH_END_R);
    for (let k = 0; k < 4; k++) {
      const e = this.flat(edgeGeo, this.mats.pathEdge, 0.009, 3);
      const f = this.flat(fillGeo, this.mats.pathFill, 0.012, 4);
      e.rotation.y = f.rotation.y = (k * Math.PI) / 2;
    }
  }

  /* ── Scattered stepping stones beside the roads ── */
  initStones() {
    const rng = mulberry32(88);
    this.mats.stone = decalMat(PALETTE.GRASS.stone);
    const spots = [];
    for (let k = 0; k < 10; k++) {
      const base = (k / 10) * Math.PI * 2 + 0.3;
      for (let j = 0; j < 4; j++) {
        const a = base + (rng() - 0.5) * 0.35;
        const d = 28 + rng() * 9 + j * 1.4;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        if (isClear(x, z, 1.2)) spots.push([x, z, 0.8 + rng() * 0.6]);
      }
    }
    const geo = new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2);
    const mesh = new THREE.InstancedMesh(geo, this.mats.stone, spots.length);
    mesh.receiveShadow = true;
    mesh.renderOrder = 5;
    spots.forEach(([x, z, r], i) => {
      this.dummy.position.set(x, 0.016, z);
      this.dummy.rotation.set(0, rng() * 3, 0);
      this.dummy.scale.set(r * 1.15, 1, r);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);
  }

  /* ── Terracotta cliff rim, grassy ledge, and translucent purple storm glass ── */
  initRim() {
    const R = ARENA.RADIUS;
    const rng = mulberry32(4242);

    this.mats.ledge = decalMat(PALETTE.GRASS.ledge);
    this.flat(new THREE.RingGeometry(R - 3.2, R, 64).rotateX(-Math.PI / 2), this.mats.ledge, 0.01, 2);

    // Continuous sloped inner wall
    this.mats.wall = new THREE.MeshLambertMaterial({ color: PALETTE.GRASS.wall, flatShading: true, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 3.4, R, 3.8, 56, 1, true), this.mats.wall);
    wall.position.y = 1.9;
    wall.receiveShadow = true;
    this.scene.add(wall);

    // Green cap on top of the wall
    this.mats.cap = new THREE.MeshLambertMaterial({ color: PALETTE.GRASS.cap, flatShading: true });
    const cap = new THREE.Mesh(new THREE.RingGeometry(R + 3.4, R + 9, 56).rotateX(-Math.PI / 2), this.mats.cap);
    cap.position.y = 3.8;
    cap.receiveShadow = true;
    this.scene.add(cap);

    // Chunky outer cliff blocks (instanced, per-instance terracotta tint) + green block caps
    const COUNT = 88;
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    this.mats.blocks = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    this.mats.blockCap = new THREE.MeshLambertMaterial({ color: PALETTE.GRASS.cap, flatShading: true });
    this.blockMesh = new THREE.InstancedMesh(blockGeo, this.mats.blocks, COUNT);
    this.blockCapMesh = new THREE.InstancedMesh(blockGeo, this.mats.blockCap, COUNT);
    this.blockMesh.castShadow = true;
    this.blockMesh.receiveShadow = true;
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2 + (rng() - 0.5) * 0.04;
      const d = R + 6 + rng() * 5;
      const w = 9 + rng() * 5;
      const dp = 5 + rng() * 5;
      const h = 4 + rng() * 7;
      const rot = -a + Math.PI / 2 + (rng() - 0.5) * 0.25;
      this.dummy.position.set(Math.cos(a) * d, h / 2 + 2, Math.sin(a) * d);
      this.dummy.rotation.set((rng() - 0.5) * 0.12, rot, (rng() - 0.5) * 0.12);
      this.dummy.scale.set(w, h, dp);
      this.dummy.updateMatrix();
      this.blockMesh.setMatrixAt(i, this.dummy.matrix);
      col.setHex(PALETTE.GRASS.blocks[Math.floor(rng() * PALETTE.GRASS.blocks.length)]);
      this.blockMesh.setColorAt(i, col);

      this.dummy.position.y = h + 2.25;
      this.dummy.scale.set(w + 0.8, 0.7, dp + 0.8);
      this.dummy.updateMatrix();
      this.blockCapMesh.setMatrixAt(i, this.dummy.matrix);
    }
    [this.blockMesh, this.blockCapMesh].forEach((m) => { m.instanceMatrix.needsUpdate = true; this.scene.add(m); });
    if (this.blockMesh.instanceColor) this.blockMesh.instanceColor.needsUpdate = true;
  }

  applyBiome(biome) {
    const p = biome && biome.id === 'SNOW' ? PALETTE.SNOW : PALETTE.GRASS;
    this.mats.patchLight.color.setHex(p.patchLight);
    this.mats.patchDark.color.setHex(p.patchDark);
    this.mats.pathFill.color.setHex(p.pathFill);
    this.mats.pathEdge.color.setHex(p.pathEdge);
    this.mats.stone.color.setHex(p.stone);
    this.mats.ledge.color.setHex(p.ledge);
    this.mats.wall.color.setHex(p.wall);
    this.mats.cap.color.setHex(p.cap);
    this.mats.blockCap.color.setHex(p.cap);

    const col = new THREE.Color();
    const rng = mulberry32(4242);
    // Re-tint blocks deterministically (same sequence as initRim colour picks is not needed; use palette cycle)
    for (let i = 0; i < this.blockMesh.count; i++) {
      col.setHex(p.blocks[Math.floor(rng() * p.blocks.length)]);
      this.blockMesh.setColorAt(i, col);
    }
    if (this.blockMesh.instanceColor) this.blockMesh.instanceColor.needsUpdate = true;
  }
}

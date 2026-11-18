import * as THREE from 'three';
import { part, merge, decalMat } from './geoUtils.js';
import {
  mulberry32, isClear, STEPWELL, TORANA_R, PATH_HALF_W
} from '../config/worldLayout.js';

const FEATURE_BANYANS = [
  [-52, -54, 1.55], [-35, -61, 1.35], // NW pair
  [52, 46, 1.6]                        // SE giant
];

const LAND = {
  GRASS: {
    water: 0x29A3DD, waterEdge: 0x86D6F5, pad: 0x4CB82E,
    treadLight: 0xEBCB92, treadDark: 0xCFA66A, riser: 0xAD8450,
    stone: 0xD4C7A8, stoneDark: 0xB3A47F,
    rock: [0x8B939A, 0x737C84, 0x9AA2A8], moss: 0x6FC22B, brown: 0xB5683A
  },
  SNOW: {
    water: 0x60A5FA, waterEdge: 0xBFE0FF, pad: 0x8FB8D8,
    treadLight: 0xAFC0D2, treadDark: 0x8FA3BA, riser: 0x6F8299,
    stone: 0x94A3B8, stoneDark: 0x64748B,
    rock: [0x94A3B8, 0x7C8CA2, 0xA9B7C9], moss: 0xDCEBFA, brown: 0x7B8CA3
  }
};

export class WorldEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();
    this.rng = mulberry32(2026);
    this.placed = []; // [x, z, r] footprints of placed trees/rocks for spacing
    this.initStepwell();
    this.initBanyans();
    this.initPines();
    this.initRocks();
    this.initScatter();
  }

  // Rejection-sample a clear spot (away from gameplay anchors and previously placed footprints)
  findSpot(rMin, rMax, footprint, tries = 80, opts = {}) {
    for (let t = 0; t < tries; t++) {
      const a = this.rng() * Math.PI * 2;
      const d = rMin + this.rng() * (rMax - rMin);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (!isClear(x, z, footprint, opts)) continue;
      if (this.placed.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr + footprint)) continue;
      return [x, z];
    }
    return null;
  }

  /* ── Octagonal Jala step-well: descending sandstone treads, lotus pond, shrine, lotus pedestals ── */
  initStepwell() {
    const { x: px, z: pz } = STEPWELL;
    const g = new THREE.Group();
    g.position.set(px, 0, pz);
    g.rotation.y = Math.PI / 8;
    this.scene.add(g);

    const treadMats = [0, 1, 2, 3, 4].map((k) => decalMat(k % 2 ? LAND.GRASS.treadDark : LAND.GRASS.treadLight));
    const riserMat = decalMat(LAND.GRASS.riser);
    this.riserMat = riserMat;
    this.treadMats = treadMats;

    const R0 = 11.5, W = 1.3;
    for (let k = 0; k < 5; k++) {
      const outer = R0 - W * k;
      const inner = outer - W;
      const t = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 8).rotateX(-Math.PI / 2), treadMats[k]);
      t.position.y = 0.02 + k * 0.004; t.renderOrder = 6 + k * 2; t.receiveShadow = true; g.add(t);
      // dark riser shadow band along the outer edge of each tread
      const s = new THREE.Mesh(new THREE.RingGeometry(outer - 0.4, outer, 8).rotateX(-Math.PI / 2), riserMat);
      s.position.y = 0.024 + k * 0.004; s.renderOrder = 7 + k * 2; s.receiveShadow = true; g.add(s);
    }

    this.waterMat = decalMat(LAND.GRASS.water);
    const water = new THREE.Mesh(new THREE.CircleGeometry(R0 - W * 5, 8).rotateX(-Math.PI / 2), this.waterMat);
    water.position.y = 0.04; water.renderOrder = 18; g.add(water);

    this.waterEdgeMat = decalMat(LAND.GRASS.waterEdge, { opacity: 0.55, transparent: true });
    const shine = new THREE.Mesh(new THREE.RingGeometry(R0 - W * 5 - 0.55, R0 - W * 5, 8).rotateX(-Math.PI / 2), this.waterEdgeMat);
    shine.position.y = 0.044; shine.renderOrder = 19; g.add(shine);

    // Central shrine: 2-tier plinth, four columns, slab + pyramid roof
    this.stoneMat = new THREE.MeshLambertMaterial({ color: LAND.GRASS.stone, flatShading: true });
    this.stoneDarkMat = new THREE.MeshLambertMaterial({ color: LAND.GRASS.stoneDark, flatShading: true });
    const plinthA = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.34, 3.2), this.stoneDarkMat);
    plinthA.position.y = 0.17; g.add(plinthA);
    const plinthB = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.34, 2.4), this.stoneMat);
    plinthB.position.y = 0.51; g.add(plinthB);
    const colGeo = new THREE.BoxGeometry(0.3, 1.5, 0.3);
    [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach(([cx, cz]) => {
      const c = new THREE.Mesh(colGeo, this.stoneMat); c.position.set(cx, 1.5, cz); c.castShadow = true; g.add(c);
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.4), this.stoneDarkMat);
    slab.position.y = 2.35; slab.castShadow = true; g.add(slab);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 0.9, 4), this.stoneMat);
    roof.position.y = 2.9; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshLambertMaterial({ color: 0xF2C14E, flatShading: true }));
    finial.position.y = 3.45; g.add(finial);

    // Four lotus pedestals at the diagonals
    const pinkMat = new THREE.MeshLambertMaterial({ color: 0xF472B6, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xFACC15, flatShading: true });
    const petalGeo = new THREE.ConeGeometry(0.16, 0.42, 4);
    const lotus = (parent, lx, ly, lz, s = 1) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = new THREE.Mesh(petalGeo, pinkMat);
        p.position.set(lx + Math.cos(a) * 0.17 * s, ly + 0.2 * s, lz + Math.sin(a) * 0.17 * s);
        p.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        p.scale.setScalar(s); parent.add(p);
      }
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 5, 4), goldMat);
      c.position.set(lx, ly + 0.16 * s, lz); parent.add(c);
    };
    [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]].forEach(([ox, oz]) => {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.0), this.stoneDarkMat);
      b1.position.set(ox, 0.2, oz); b1.castShadow = true; g.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.68), this.stoneMat);
      b2.position.set(ox, 0.57, oz); b2.castShadow = true; g.add(b2);
      lotus(g, ox, 0.74, oz, 1.1);
    });

    // Lily pads with the odd blossom
    this.padMat = decalMat(LAND.GRASS.pad);
    const padGeo = new THREE.CircleGeometry(0.75, 8).rotateX(-Math.PI / 2);
    const prng = mulberry32(77);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + prng() * 0.5;
      const d = 2.2 + prng() * 2.3;
      const lx = Math.cos(a) * d, lz = Math.sin(a) * d;
      if ((Math.abs(Math.abs(lx) - 2.9) < 0.9) && (Math.abs(Math.abs(lz) - 2.9) < 0.9)) continue;
      const pad = new THREE.Mesh(padGeo, this.padMat);
      pad.position.set(lx, 0.05, lz); pad.scale.setScalar(0.8 + prng() * 0.5); pad.renderOrder = 20; g.add(pad);
      if (i % 4 === 0) lotus(g, lx, 0.05, lz, 0.7);
    }
    this.stepwell = g;
  }

  /* ── Banyans: stacked faceted canopy lobes, buttressed trunks, hanging aerial roots ── */
  initBanyans() {
    const feature = FEATURE_BANYANS.map(([x, z, s]) => ({ x, z, s }));
    feature.forEach((b) => this.placed.push([b.x, b.z, 3.6 * b.s]));

    const trees = [...feature];
    const target = 22;
    let guard = 0;
    while (trees.length < target && guard++ < 600) {
      const s = 0.95 + this.rng() * 0.5;
      const spot = this.findSpot(34, 112, 3.4 * s, 12);
      if (!spot) continue;
      trees.push({ x: spot[0], z: spot[1], s });
      this.placed.push([spot[0], spot[1], 3.6 * s]);
    }
    this.banyanData = trees;

    const trunkGeo = merge([
      part(new THREE.CylinderGeometry(0.75, 1.3, 4.4, 7), [0, 2.2, 0]),
      ...[0, 2.1, 4.2].map((a) => part(
        new THREE.CylinderGeometry(0.34, 0.55, 3.6, 6),
        [Math.cos(a) * 1.55, 1.7, Math.sin(a) * 1.55], [Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14]
      )),
      ...[0.4, 1.5, 2.6, 3.7, 4.9].map((a) => part(
        new THREE.ConeGeometry(0.55, 1.1, 4),
        [Math.cos(a) * 1.35, 0.5, Math.sin(a) * 1.35], [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55]
      ))
    ]);
    const n = trees.length;
    this.bTrunkMesh = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x6B4426, flatShading: true }), n);
    this.bTrunkMesh.castShadow = true;

    const ROOTS = 16;
    const rootGeo = new THREE.CylinderGeometry(0.05, 0.085, 1, 4).translate(0, -0.5, 0);
    this.bRootMesh = new THREE.InstancedMesh(rootGeo, new THREE.MeshLambertMaterial({ color: 0x5A3A22, flatShading: true }), n * ROOTS);

    const lobeGeo = new THREE.IcosahedronGeometry(1, 1);
    this.foliageDarkMat = new THREE.MeshLambertMaterial({ color: 0x3F8E1C, flatShading: true });
    this.foliageMidMat = new THREE.MeshLambertMaterial({ color: 0x5BB22A, flatShading: true });
    this.foliageHiMat = new THREE.MeshLambertMaterial({ color: 0x86D63A, flatShading: true });
    this.bLobeDark = new THREE.InstancedMesh(lobeGeo, this.foliageDarkMat, n * 4);
    this.bLobeMid = new THREE.InstancedMesh(lobeGeo, this.foliageMidMat, n * 3);
    this.bLobeHi = new THREE.InstancedMesh(lobeGeo, this.foliageHiMat, n * 2);
    [this.bLobeDark, this.bLobeMid, this.bLobeHi].forEach((m) => { m.castShadow = true; });

    let rI = 0, dI = 0, mI = 0, hI = 0;
    const d = this.dummy;
    const set = (mesh, idx, x, y, z, sx, sy, sz, ry = 0) => {
      d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.set(sx, sy, sz); d.updateMatrix();
      mesh.setMatrixAt(idx, d.matrix);
    };
    trees.forEach((t, i) => {
      const { x, z, s } = t;
      set(this.bTrunkMesh, i, x, 0, z, s, s, s, i * 1.3);
      for (let k = 0; k < ROOTS; k++) {
        const a = (k / ROOTS) * Math.PI * 2 + i;
        const rad = (2.1 + ((k * 7) % 5) * 0.45) * s;
        const len = (3.3 + ((k * 3) % 4) * 0.35) * s;
        set(this.bRootMesh, rI++, x + Math.cos(a) * rad, 3.9 * s, z + Math.sin(a) * rad, s, len, s);
      }
      for (let k = 0; k < 4; k++) {
        const a = i * 1.7 + (k / 4) * Math.PI * 2;
        set(this.bLobeDark, dI++, x + Math.cos(a) * 2.2 * s, (4.2 + (k % 2) * 0.35) * s, z + Math.sin(a) * 2.2 * s, 2.7 * s, 1.35 * s, 2.7 * s, a);
      }
      for (let k = 0; k < 3; k++) {
        const a = i * 1.1 + (k / 3) * Math.PI * 2 + 0.5;
        set(this.bLobeMid, mI++, x + Math.cos(a) * 1.4 * s, (5.3 + k * 0.2) * s, z + Math.sin(a) * 1.4 * s, 2.4 * s, 1.2 * s, 2.4 * s, a);
      }
      for (let k = 0; k < 2; k++) {
        const a = i * 0.7 + k * Math.PI;
        set(this.bLobeHi, hI++, x + Math.cos(a) * 0.6 * s, (6.4 + k * 0.25) * s, z + Math.sin(a) * 0.6 * s, 2.0 * s, 1.0 * s, 2.0 * s, a);
      }
    });
    [this.bTrunkMesh, this.bRootMesh, this.bLobeDark, this.bLobeMid, this.bLobeHi].forEach((m) => {
      m.instanceMatrix.needsUpdate = true; this.scene.add(m);
    });
  }

  /* ── Pines (Frozen Peaks biome only) ── */
  initPines() {
    const trees = [];
    let guard = 0;
    while (trees.length < 22 && guard++ < 300) {
      const s = 0.85 + this.rng() * 0.4;
      const spot = this.findSpot(30, 112, 2.4 * s, 10);
      if (!spot) continue;
      trees.push([spot[0], spot[1], s]);
    }
    const count = trees.length;
    this.pineTrunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x5c3a21 }), count);
    this.pineCanopyMat = new THREE.MeshLambertMaterial({ color: 0x1e4e3d, flatShading: true });
    this.pineCanopyMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 1.8, 6), this.pineCanopyMat, count * 3);
    this.pineTrunkMesh.castShadow = true; this.pineCanopyMesh.castShadow = true;
    let fIdx = 0;
    trees.forEach(([x, z, s], i) => {
      this.dummy.position.set(x, 0.8 * s, z); this.dummy.rotation.set(0, (i * 1.3) % Math.PI, 0);
      this.dummy.scale.set(s, s, s); this.dummy.updateMatrix();
      this.pineTrunkMesh.setMatrixAt(i, this.dummy.matrix);
      [{ y: 1.6, sc: 1.0 }, { y: 2.6, sc: 0.78 }, { y: 3.5, sc: 0.55 }].forEach((t) => {
        this.dummy.position.set(x, t.y * s, z); this.dummy.scale.set(s * t.sc, s * t.sc, s * t.sc);
        this.dummy.updateMatrix(); this.pineCanopyMesh.setMatrixAt(fIdx++, this.dummy.matrix);
      });
    });
    [this.pineTrunkMesh, this.pineCanopyMesh].forEach((m) => {
      m.instanceMatrix.needsUpdate = true; m.visible = false; this.scene.add(m);
    });
  }

  /* ── Mossy boulder clusters + a few terracotta boulders ── */
  initRocks() {
    const clusters = [
      [-62, -36, 7], [-30, -78, 6], [-18, -60, 5],           // NW, behind the banyans
      [56, 62, 7], [70, 48, 6], [38, 80, 5],                 // SE
      [-80, 22, 6], [-70, 70, 6], [84, -34, 6], [14, 92, 5],
      [-92, -30, 5], [92, 30, 5], [30, -92, 5], [-28, 96, 5]
    ];
    const rocks = [];
    clusters.forEach(([cx, cz, n]) => {
      for (let k = 0; k < n; k++) {
        const a = this.rng() * Math.PI * 2;
        const d = this.rng() * 4.6;
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        const sc = 0.8 + this.rng() * 1.5;
        if (!isClear(x, z, sc * 1.1, { rim: 6 })) continue;
        rocks.push({ x, z, sc, rot: this.rng() * 3 });
      }
    });
    for (let k = 0; k < 26; k++) {
      const spot = this.findSpot(28, 112, 1.4, 20, { rim: 6 });
      if (spot) rocks.push({ x: spot[0], z: spot[1], sc: 0.6 + this.rng() * 0.9, rot: this.rng() * 3 });
    }

    const geo = new THREE.DodecahedronGeometry(1, 0);
    this.rockMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    this.mossMat = new THREE.MeshLambertMaterial({ color: LAND.GRASS.moss, flatShading: true });
    this.rockMesh = new THREE.InstancedMesh(geo, this.rockMat, rocks.length);
    this.rockMossMesh = new THREE.InstancedMesh(geo, this.mossMat, rocks.length);
    this.rockMesh.castShadow = true; this.rockMossMesh.castShadow = true;
    this.rockCount = rocks.length;
    const col = new THREE.Color();
    rocks.forEach(({ x, z, sc, rot }, i) => {
      this.dummy.position.set(x, sc * 0.62, z); this.dummy.rotation.set(0.1, rot, 0.08);
      this.dummy.scale.set(sc * 1.05, sc * 0.9, sc); this.dummy.updateMatrix();
      this.rockMesh.setMatrixAt(i, this.dummy.matrix);
      col.setHex(LAND.GRASS.rock[i % 3]); this.rockMesh.setColorAt(i, col);
      this.dummy.position.set(x, sc * 1.0, z); this.dummy.scale.set(sc * 0.92, sc * 0.4, sc * 0.9); this.dummy.updateMatrix();
      this.rockMossMesh.setMatrixAt(i, this.dummy.matrix);
    });
    [this.rockMesh, this.rockMossMesh].forEach((m) => { m.instanceMatrix.needsUpdate = true; this.scene.add(m); });
    if (this.rockMesh.instanceColor) this.rockMesh.instanceColor.needsUpdate = true;

    // Warm brown boulders hugging the paths
    const brown = [];
    [[-8, -55], [8, 58], [-55, 8], [56, -8], [-8, 68], [9, -68], [-68, -8], [68, 9]].forEach(([x, z]) => {
      for (let k = 0; k < 2; k++) {
        const bx = x + (this.rng() - 0.5) * 3, bz = z + (this.rng() - 0.5) * 3;
        if (Math.abs(bx) > PATH_HALF_W + 1.6 || Math.abs(bz) > PATH_HALF_W + 1.6) {
          if (Math.hypot(bx, bz) < TORANA_R + 12) brown.push([bx, bz, 0.7 + this.rng() * 0.7]);
        }
      }
    });
    this.brownMat = new THREE.MeshLambertMaterial({ color: LAND.GRASS.brown, flatShading: true });
    this.brownMesh = new THREE.InstancedMesh(geo, this.brownMat, Math.max(1, brown.length));
    this.brownMesh.castShadow = true;
    brown.forEach(([x, z, sc], i) => {
      this.dummy.position.set(x, sc * 0.6, z); this.dummy.rotation.set(0.1, i, 0.05);
      this.dummy.scale.set(sc * 0.9, sc * 1.1, sc * 0.8); this.dummy.updateMatrix();
      this.brownMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.brownMesh.count = brown.length;
    this.brownMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.brownMesh);
  }

  /* ── Agave rosettes, clay matka pots (clustered at gates), and contact shadows ── */
  initScatter() {
    // Agave: 9 outer leaves + 4 upright inner leaves merged into one geometry
    const leaf = new THREE.ConeGeometry(0.17, 1.25, 4);
    const leaves = [];
    for (let l = 0; l < 9; l++) {
      const a = (l / 9) * Math.PI * 2;
      leaves.push(part(leaf, [Math.cos(a) * 0.2, 0.5, Math.sin(a) * 0.2], [Math.sin(a) * 0.95, 0, -Math.cos(a) * 0.95]));
    }
    for (let l = 0; l < 4; l++) {
      const a = (l / 4) * Math.PI * 2 + 0.4;
      leaves.push(part(leaf, [Math.cos(a) * 0.07, 0.62, Math.sin(a) * 0.07], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]));
    }
    const agaveGeo = merge(leaves);

    const agaves = [];
    const flank = (gx, gz, nx, nz) => {
      for (const side of [-1, 1]) {
        agaves.push([
          gx + nx * (PATH_HALF_W + 2.6) * side + (this.rng() - 0.5),
          gz + nz * (PATH_HALF_W + 2.6) * side + (this.rng() - 0.5),
          1 + this.rng() * 0.4
        ]);
      }
    };
    [[0, -TORANA_R, 1, 0], [0, TORANA_R, 1, 0], [-TORANA_R, 0, 0, 1], [TORANA_R, 0, 0, 1]].forEach(([gx, gz, nx, nz]) => {
      flank(gx, gz, nx, nz);
      flank(gx * 0.94, gz * 0.94, nx, nz);
    });
    for (let i = 0; i < 40; i++) {
      const spot = this.findSpot(26, 112, 1.1, 20, { rim: 5 });
      if (spot) agaves.push([spot[0], spot[1], 0.85 + this.rng() * 0.5]);
    }
    this.agaveMat = new THREE.MeshLambertMaterial({ color: 0x35966A, flatShading: true });
    const agaveMesh = new THREE.InstancedMesh(agaveGeo, this.agaveMat, agaves.length);
    agaveMesh.castShadow = true;
    agaves.forEach(([x, z, s], i) => {
      this.dummy.position.set(x, 0, z); this.dummy.rotation.set(0, this.rng() * 6, 0);
      this.dummy.scale.setScalar(s); this.dummy.updateMatrix();
      agaveMesh.setMatrixAt(i, this.dummy.matrix);
    });
    agaveMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(agaveMesh);

    // Clay pots: lathe profile, clustered by gates, pond edge and the Agni platform
    const profile = [[0, 0], [0.26, 0], [0.4, 0.12], [0.46, 0.3], [0.38, 0.5], [0.2, 0.62], [0.26, 0.72], [0.22, 0.74]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const potGeo = new THREE.LatheGeometry(profile, 8);
    this.potMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
    const potSpots = [];
    const cluster = (cx, cz, n, spread = 1.6) => {
      for (let k = 0; k < n; k++) {
        const x = cx + (this.rng() - 0.5) * spread * 2;
        const z = cz + (this.rng() - 0.5) * spread * 2;
        if (Math.abs(x) < PATH_HALF_W + 0.8 && Math.abs(z) < TORANA_R + 8) continue;
        if (Math.abs(z) < PATH_HALF_W + 0.8 && Math.abs(x) < TORANA_R + 8) continue;
        potSpots.push([x, z, 0.8 + this.rng() * 0.6]);
      }
    };
    [[-8.5, -TORANA_R + 3], [8.5, -TORANA_R + 3], [-8.5, TORANA_R - 3], [8.5, TORANA_R - 3],
      [-TORANA_R + 3, -8.5], [-TORANA_R + 3, 8.5], [TORANA_R - 3, -8.5], [TORANA_R - 3, 8.5]].forEach(([x, z]) => cluster(x, z, 4));
    [[-27, -9], [27, 9], [-27, 9], [27, -9]].forEach(([x, z]) => cluster(x, z, 2, 1.0));
    cluster(STEPWELL.x - 13, STEPWELL.z + 4, 3); cluster(STEPWELL.x + 12, STEPWELL.z - 6, 3);
    cluster(26, -52, 3); cluster(52, -26, 3);
    const potMesh = new THREE.InstancedMesh(potGeo, this.potMat, potSpots.length);
    potMesh.castShadow = true;
    const potCols = [0xC4602F, 0xAD4A22, 0xD0733A];
    const col = new THREE.Color();
    potSpots.forEach(([x, z, s], i) => {
      this.dummy.position.set(x, 0, z); this.dummy.rotation.set(0, this.rng() * 6, 0);
      this.dummy.scale.set(s, s * 1.1, s); this.dummy.updateMatrix();
      potMesh.setMatrixAt(i, this.dummy.matrix);
      col.setHex(potCols[i % 3]); potMesh.setColorAt(i, col);
    });
    potMesh.instanceMatrix.needsUpdate = true;
    if (potMesh.instanceColor) potMesh.instanceColor.needsUpdate = true;
    this.scene.add(potMesh);

    // Contact shadows: banyan shadows are separate so they hide with the trees in the snow biome
    const makeShadows = (items) => {
      const geo = new THREE.CircleGeometry(1.0, 12).rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
      mesh.renderOrder = 30;
      items.forEach(([x, z, sx, sz], i) => {
        this.dummy.position.set(x, 0.05, z); this.dummy.rotation.set(0, 0, 0); this.dummy.scale.set(sx, 1, sz);
        this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
      this.scene.add(mesh);
      return mesh;
    };
    this.treeShadowMesh = makeShadows(this.banyanData.map(({ x, z, s }) => [x, z, s * 3.0, s * 3.0]));
    this.shadowMesh = makeShadows([
      ...potSpots.map(([x, z, s]) => [x, z, s * 0.55, s * 0.55]),
      ...agaves.map(([x, z, s]) => [x, z, s * 0.9, s * 0.9])
    ]);
  }

  applyBiome(biome) {
    const isSnow = biome && biome.id === 'SNOW';
    const L = isSnow ? LAND.SNOW : LAND.GRASS;

    [this.bTrunkMesh, this.bRootMesh, this.bLobeDark, this.bLobeMid, this.bLobeHi, this.treeShadowMesh].forEach((m) => { if (m) m.visible = !isSnow; });
    [this.pineTrunkMesh, this.pineCanopyMesh].forEach((m) => { if (m) m.visible = isSnow; });
    if (this.pineCanopyMat) this.pineCanopyMat.color.setHex(isSnow ? 0x1e4e3d : 0x236b32);

    this.treadMats.forEach((m, k) => m.color.setHex(k % 2 ? L.treadDark : L.treadLight));
    this.riserMat.color.setHex(L.riser);
    this.waterMat.color.setHex(L.water);
    this.waterEdgeMat.color.setHex(L.waterEdge);
    this.padMat.color.setHex(L.pad);
    this.stoneMat.color.setHex(L.stone);
    this.stoneDarkMat.color.setHex(L.stoneDark);
    this.mossMat.color.setHex(L.moss);
    this.brownMat.color.setHex(L.brown);
    const col = new THREE.Color();
    for (let i = 0; i < this.rockCount; i++) { col.setHex(L.rock[i % 3]); this.rockMesh.setColorAt(i, col); }
    if (this.rockMesh.instanceColor) this.rockMesh.instanceColor.needsUpdate = true;
  }
}

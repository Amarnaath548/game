import * as THREE from 'three';
import { decalMat, lambert, mulberry32, merge, part } from './geo.js';
import { makeLayout } from './layout.js';
import { buildPlaza, buildMonuments } from './monuments.js';
import { buildAgni, buildStepwell } from './structures.js';
import { updateTreeOcclusion } from './vegTrees.js';
import { buildStory } from './story.js';

export class ArenaMap {
  constructor(scene, theme, opts = {}) {
    this.scene = scene;
    this.theme = theme;
    this.radius = opts.radius ?? 120;
    this.layout = makeLayout(this.radius, opts.anchors);
    this.obstacles = opts.obstacles ?? [];
    this.rng = mulberry32(theme.seed ?? 2026);
    this.dummy = new THREE.Object3D();
    this.placed = [];
    this.floorColor = theme.floor;
    this.sky = theme.sky;
    this.fog = theme.fog;

    this.root = new THREE.Group();
    this.root.name = `map:${theme.id}`;
    this.root.matrixAutoUpdate = false;
    scene.add(this.root);

    if (opts.floor !== false) this.buildFloor();
    this.buildPatches();
    this.buildPaths();
    this.buildStones();
    this.buildRim();
    buildPlaza(this);
    buildMonuments(this);
    buildAgni(this);
    buildStepwell(this);
    buildStory(this);
    if (theme.vegetation) theme.vegetation(this);
    if (opts.applyEnvironment) this.applyEnvironment();
    this.root.updateMatrix();
  }

  isClear(x, z, r, o) { return this.layout.isClear(x, z, r, o); }

  findSpot(rMin, rMax, footprint, tries = 80, opts = {}) {
    for (let t = 0; t < tries; t++) {
      const a = this.rng() * Math.PI * 2;
      const d = rMin + this.rng() * (rMax - rMin);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!this.isClear(x, z, footprint, opts)) continue;
      if (this.placed.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr + footprint)) continue;
      return [x, z];
    }
    return null;
  }

  flat(geo, mat, y, order, parent = this.root) {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y; m.renderOrder = order; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix();
    parent.add(m);
    return m;
  }

  addContactShadows(items, key = 'shadow') {
    if (!items.length) return null;
    const geo = new THREE.CircleGeometry(1.0, 12).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.renderOrder = 30; mesh.name = key;
    mesh.matrixAutoUpdate = false;
    items.forEach(([x, z, sx, sz], i) => {
      this.dummy.position.set(x, 0.05, z); this.dummy.rotation.set(0, 0, 0); this.dummy.scale.set(sx, 1, sz);
      this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.updateMatrix();
    this.root.add(mesh);
    return mesh;
  }

  applyEnvironment() {
    this._prevEnv = { background: this.scene.background, fog: this.scene.fog };
    this.scene.background = new THREE.Color(this.theme.sky);
    this.scene.fog = new THREE.Fog(this.theme.fog, 45, 140);
  }

  applyLighting(hemi, sun) {
    const L = this.theme.lighting;
    if (!L) return;
    this._prevLight = {
      hemi, sun,
      hs: hemi.color.getHex(), hg: hemi.groundColor.getHex(), hi: hemi.intensity,
      sc: sun.color.getHex(), si: sun.intensity
    };
    hemi.color.setHex(L.hemiSky); hemi.groundColor.setHex(L.hemiGround); hemi.intensity = L.hemiIntensity;
    sun.color.setHex(L.sun); sun.intensity = L.sunIntensity;
  }

  updateTreeOcclusion(playerPos, cameraPos, dt) {
    if (this.treeOcclusionGroups) updateTreeOcclusion(this, playerPos, cameraPos, dt);
    if (this.updateStory) this.updateStory(dt);
  }

  dispose() {
    this.treeOcclusionGroups = null;
    if (this._prevLight) {
      const p = this._prevLight;
      p.hemi.color.setHex(p.hs); p.hemi.groundColor.setHex(p.hg); p.hemi.intensity = p.hi;
      p.sun.color.setHex(p.sc); p.sun.intensity = p.si;
    }
    if (this._prevEnv) {
      this.scene.background = this._prevEnv.background;
      this.scene.fog = this._prevEnv.fog;
    }
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      if (o.isInstancedMesh) o.dispose();
    });
  }

  buildFloor() {
    this.floorMat = lambert(this.theme.floor);
    this.floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(this.radius, this.radius, 1, 64), this.floorMat);
    this.floorMesh.position.y = -0.5;
    this.floorMesh.receiveShadow = true;
    this.floorMesh.matrixAutoUpdate = false;
    this.floorMesh.updateMatrix();
    this.root.add(this.floorMesh);
  }

  buildPatches() {
    const T = this.theme, rng = mulberry32((T.seed ?? 2026) + 11);
    const geo = new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);
    const dummy = new THREE.Object3D();
    const build = (color, count, y, order) => {
      const mesh = new THREE.InstancedMesh(geo, decalMat(color), count);
      mesh.receiveShadow = true; mesh.renderOrder = order;
      mesh.matrixAutoUpdate = false;
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * (this.radius - 2);
        dummy.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
        dummy.rotation.set(0, rng() * Math.PI, 0);
        dummy.scale.set(3 + rng() * 6.5, 1, 2.5 + rng() * 5.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.updateMatrix();
      this.root.add(mesh);
    };
    build(T.patchDark, T.patchCount?.[0] ?? 130, 0.004, 1);
    build(T.patchLight, T.patchCount?.[1] ?? 150, 0.006, 2);
  }

  buildPaths() {
    const T = this.theme, L = this.layout.landmarks;
    const edgeMat = decalMat(T.path.edge), fillMat = decalMat(T.path.fill);
    const [r0, r1] = L.ringRoad;
    const arm = (h0, h1, y0, y1) => {
      const s = new THREE.Shape();
      s.moveTo(-h0, y0); s.lineTo(h0, y0);
      s.lineTo(h1 * 1.05, (y0 + y1) * 0.5); s.lineTo(h1, y1);
      s.lineTo(-h1, y1); s.lineTo(-h1 * 1.05, (y0 + y1) * 0.5);
      s.closePath();
      return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2);
    };
    const edgeGeo = arm(L.pathHalfW + 0.8, L.pathHalfW - 0.1, r0 - 1, L.pathEndR + 0.6);
    const fillGeo = arm(L.pathHalfW, L.pathHalfW - 0.7, r0 - 1, L.pathEndR);

    const edgeParts = [new THREE.RingGeometry(r0 - 0.7, r1 + 0.7, 56).rotateX(-Math.PI / 2)];
    const fillParts = [new THREE.RingGeometry(r0, r1, 56).rotateX(-Math.PI / 2)];
    for (let k = 0; k < 4; k++) {
      const rot = (k * Math.PI) / 2;
      edgeParts.push(part(edgeGeo, [0, 0, 0], [0, rot, 0]));
      fillParts.push(part(fillGeo, [0, 0, 0], [0, rot, 0]));
    }
    this.flat(merge(edgeParts), edgeMat, 0.009, 3);
    this.flat(merge(fillParts), fillMat, 0.012, 4);
  }

  buildStones() {
    const rng = mulberry32((this.theme.seed ?? 2026) + 33);
    const mat = decalMat(this.theme.path.stone), spots = [];
    for (let k = 0; k < 10; k++) {
      const base = (k / 10) * Math.PI * 2 + 0.3;
      for (let j = 0; j < 4; j++) {
        const a = base + (rng() - 0.5) * 0.35, d = 28 + rng() * 9 + j * 1.4;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (this.isClear(x, z, 1.2)) spots.push([x, z, 0.8 + rng() * 0.6]);
      }
    }
    const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2), mat, spots.length);
    mesh.receiveShadow = true; mesh.renderOrder = 5; mesh.matrixAutoUpdate = false;
    spots.forEach(([x, z, r], i) => {
      this.dummy.position.set(x, 0.016, z); this.dummy.rotation.set(0, rng() * 3, 0); this.dummy.scale.set(r * 1.15, 1, r);
      this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.updateMatrix();
    this.root.add(mesh);
  }

  buildRim() {
    const T = this.theme, R = this.radius, rng = mulberry32((T.seed ?? 2026) + 77);
    const dummy = new THREE.Object3D();
    this.flat(new THREE.RingGeometry(R - 3.2, R, 64).rotateX(-Math.PI / 2), decalMat(T.ledge), 0.01, 2);

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 3.4, R, 3.8, 56, 1, true),
      new THREE.MeshLambertMaterial({ color: T.wall, flatShading: true, side: THREE.DoubleSide })
    );
    wall.position.y = 1.9; wall.receiveShadow = true; wall.matrixAutoUpdate = false; wall.updateMatrix();
    this.root.add(wall);

    const cap = new THREE.Mesh(new THREE.RingGeometry(R + 3.4, R + 9, 56).rotateX(-Math.PI / 2), lambert(T.cap));
    cap.position.y = 3.8; cap.receiveShadow = true; cap.matrixAutoUpdate = false; cap.updateMatrix();
    this.root.add(cap);

    const COUNT = 88, geo = new THREE.BoxGeometry(1, 1, 1);
    const blocks = new THREE.InstancedMesh(geo, lambert(0xffffff), COUNT);
    const caps = new THREE.InstancedMesh(geo, lambert(T.blockCap ?? T.cap), COUNT);
    blocks.receiveShadow = true; blocks.matrixAutoUpdate = false; caps.matrixAutoUpdate = false;
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2 + (rng() - 0.5) * 0.04, d = R + 6 + rng() * 5;
      const w = 9 + rng() * 5, dp = 5 + rng() * 5, h = (T.rimHeight ?? 1) * (4 + rng() * 7);
      const rot = -a + Math.PI / 2 + (rng() - 0.5) * 0.25;
      dummy.position.set(Math.cos(a) * d, h / 2 + 2, Math.sin(a) * d);
      dummy.rotation.set((rng() - 0.5) * 0.12, rot, (rng() - 0.5) * 0.12);
      dummy.scale.set(w, h, dp); dummy.updateMatrix();
      blocks.setMatrixAt(i, dummy.matrix);
      col.setHex(T.blocks[Math.floor(rng() * T.blocks.length)]);
      blocks.setColorAt(i, col);
      dummy.position.y = h + 2.25;
      dummy.scale.set(w + 0.8, T.blockCapThickness ?? 0.7, dp + 0.8); dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    [blocks, caps].forEach((m) => { m.instanceMatrix.needsUpdate = true; m.updateMatrix(); this.root.add(m); });
    blocks.instanceColor.needsUpdate = true;
  }
}

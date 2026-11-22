import * as THREE from 'three';
import { decalMat, lambert, mulberry32 } from './geo.js';
import { makeLayout } from './layout.js';
import { makeAgaveGeometry } from './vegetation.js';

/**
 * Self-contained arena map. Builds all visuals into `this.root` (a Group added to `scene`),
 * driven entirely by a theme object (see ../themes/*.js). No game systems are touched:
 *   const map = new DesertMap(scene, { obstacles: collisionObstacles });
 *   ...
 *   map.dispose();
 *
 * opts:
 *   radius            arena radius (default 120)
 *   anchors           gameplay anchor overrides (see kit/layout.js)
 *   obstacles         array to push pillar / torana colliders into ({x, z, radius})
 *   floor             false to skip the floor disc (if your SceneManager already owns one)
 *   applyEnvironment  true to also set scene.background / scene.fog from the theme
 */
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
    scene.add(this.root);

    if (opts.floor !== false) this.buildFloor();
    this.buildPatches();
    this.buildPaths();
    this.buildStones();
    this.buildRim();
    this.buildPlaza();
    this.buildPillars();
    this.buildTorana();
    this.buildAgni();
    this.buildStepwell();
    if (theme.vegetation) theme.vegetation(this);
    if (opts.applyEnvironment) this.applyEnvironment();
  }

  /* ───────────── helpers (also used by vegetation builders) ───────────── */

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
    parent.add(m);
    return m;
  }

  addContactShadows(items, key = 'shadow') {
    if (!items.length) return null;
    const geo = new THREE.CircleGeometry(1.0, 12).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.renderOrder = 30; mesh.name = key;
    items.forEach(([x, z, sx, sz], i) => {
      this.dummy.position.set(x, 0.05, z); this.dummy.rotation.set(0, 0, 0); this.dummy.scale.set(sx, 1, sz);
      this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.root.add(mesh);
    return mesh;
  }

  applyEnvironment() {
    this._prevEnv = { background: this.scene.background, fog: this.scene.fog };
    this.scene.background = new THREE.Color(this.theme.sky);
    this.scene.fog = new THREE.Fog(this.theme.fog, 45, 140);
  }

  /**
   * Optional: tint the game's lights to suit this map (snow needs neutral/cool light or the white
   * ground reads beige). Pass your hemisphere + directional lights; restored on dispose().
   */
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

  dispose() {
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

  /* ───────────── terrain ───────────── */

  buildFloor() {
    this.floorMat = lambert(this.theme.floor);
    this.floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(this.radius, this.radius, 1, 64), this.floorMat);
    this.floorMesh.position.y = -0.5;
    this.floorMesh.receiveShadow = true;
    this.root.add(this.floorMesh);
  }

  buildPatches() {
    const T = this.theme;
    const rng = mulberry32((T.seed ?? 2026) + 11);
    const geo = new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2);
    const dummy = new THREE.Object3D();
    const build = (color, count, y, order) => {
      const mesh = new THREE.InstancedMesh(geo, decalMat(color), count);
      mesh.receiveShadow = true; mesh.renderOrder = order;
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const d = Math.sqrt(rng()) * (this.radius - 2);
        dummy.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
        dummy.rotation.set(0, rng() * Math.PI, 0);
        dummy.scale.set(3 + rng() * 6.5, 1, 2.5 + rng() * 5.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      this.root.add(mesh);
    };
    build(T.patchDark, T.patchCount?.[0] ?? 130, 0.004, 1);
    build(T.patchLight, T.patchCount?.[1] ?? 150, 0.006, 2);
  }

  buildPaths() {
    const T = this.theme, L = this.layout.landmarks;
    const edgeMat = decalMat(T.path.edge), fillMat = decalMat(T.path.fill);
    const [r0, r1] = L.ringRoad;
    this.flat(new THREE.RingGeometry(r0 - 0.7, r1 + 0.7, 56).rotateX(-Math.PI / 2), edgeMat, 0.009, 3);
    this.flat(new THREE.RingGeometry(r0, r1, 56).rotateX(-Math.PI / 2), fillMat, 0.012, 4);
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
    for (let k = 0; k < 4; k++) {
      const e = this.flat(edgeGeo, edgeMat, 0.009, 3);
      const f = this.flat(fillGeo, fillMat, 0.012, 4);
      e.rotation.y = f.rotation.y = (k * Math.PI) / 2;
    }
  }

  buildStones() {
    const rng = mulberry32((this.theme.seed ?? 2026) + 33);
    const mat = decalMat(this.theme.path.stone);
    const spots = [];
    for (let k = 0; k < 10; k++) {
      const base = (k / 10) * Math.PI * 2 + 0.3;
      for (let j = 0; j < 4; j++) {
        const a = base + (rng() - 0.5) * 0.35;
        const d = 28 + rng() * 9 + j * 1.4;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (this.isClear(x, z, 1.2)) spots.push([x, z, 0.8 + rng() * 0.6]);
      }
    }
    const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2), mat, spots.length);
    mesh.receiveShadow = true; mesh.renderOrder = 5;
    spots.forEach(([x, z, r], i) => {
      this.dummy.position.set(x, 0.016, z); this.dummy.rotation.set(0, rng() * 3, 0); this.dummy.scale.set(r * 1.15, 1, r);
      this.dummy.updateMatrix(); mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    this.root.add(mesh);
  }

  buildRim() {
    const T = this.theme, R = this.radius;
    const rng = mulberry32((T.seed ?? 2026) + 77);
    const dummy = new THREE.Object3D();

    this.flat(new THREE.RingGeometry(R - 3.2, R, 64).rotateX(-Math.PI / 2), decalMat(T.ledge), 0.01, 2);

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 3.4, R, 3.8, 56, 1, true),
      new THREE.MeshLambertMaterial({ color: T.wall, flatShading: true, side: THREE.DoubleSide })
    );
    wall.position.y = 1.9; wall.receiveShadow = true;
    this.root.add(wall);

    const cap = new THREE.Mesh(new THREE.RingGeometry(R + 3.4, R + 9, 56).rotateX(-Math.PI / 2), lambert(T.cap));
    cap.position.y = 3.8; cap.receiveShadow = true;
    this.root.add(cap);

    const COUNT = 88;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const blocks = new THREE.InstancedMesh(geo, lambert(0xffffff), COUNT);
    const caps = new THREE.InstancedMesh(geo, lambert(T.blockCap ?? T.cap), COUNT);
    blocks.castShadow = true; blocks.receiveShadow = true;
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2 + (rng() - 0.5) * 0.04;
      const d = R + 6 + rng() * 5;
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
    [blocks, caps].forEach((m) => { m.instanceMatrix.needsUpdate = true; this.root.add(m); });
    blocks.instanceColor.needsUpdate = true;
  }

  /* ───────────── plaza, pillars, arches ───────────── */

  buildPlaza() {
    const T = this.theme, P = T.plaza, L = this.layout.landmarks;
    const R = L.plazaR;
    [[R, P.rim, 0.02, 8], [14.2, P.mid, 0.024, 9], [12.8, P.inner, 0.028, 10]].forEach(([r, c, y, o]) => {
      this.flat(new THREE.CircleGeometry(r, 56).rotateX(-Math.PI / 2), decalMat(c), y, o);
    });
    const seamMat = decalMat(P.seam);
    [6.4, 9.6, 12.8].forEach((r) => {
      this.flat(new THREE.RingGeometry(r - 0.07, r + 0.07, 56).rotateX(-Math.PI / 2), seamMat, 0.032, 11);
    });
    const seamGeo = new THREE.PlaneGeometry(0.14, 6.4).rotateX(-Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const s = this.flat(seamGeo, seamMat, 0.032, 11);
      s.position.set(Math.cos(a) * 9.6, 0.032, Math.sin(a) * 9.6);
      s.rotation.y = -a + Math.PI / 2;
    }
    if (T.plaza.snowRing) {
      this.flat(new THREE.RingGeometry(R - 0.9, R, 56).rotateX(-Math.PI / 2), decalMat(T.plaza.snowRing), 0.034, 12);
    }

    // Dais under the mythic chest + soft glow
    const [cx, cz] = this.layout.anchors.mythicChest;
    const d1 = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.3, 0.2, 24), lambert(P.dais));
    d1.position.set(cx, 0.1, cz); d1.renderOrder = 12; d1.receiveShadow = true; d1.castShadow = true; this.root.add(d1);
    const d2 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.0, 0.2, 20), lambert(P.daisTop));
    d2.position.set(cx, 0.3, cz); d2.renderOrder = 12; d2.receiveShadow = true; d2.castShadow = true; this.root.add(d2);
    const inlay = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.45, 24).rotateX(-Math.PI / 2), lambert(P.inlay));
    inlay.position.set(cx, 0.405, cz); inlay.renderOrder = 13; this.root.add(inlay);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: P.glow ?? 0xFFD54A, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    glow.position.set(cx, 0.42, cz); glow.renderOrder = 14; this.root.add(glow);
  }

  contactShadow(r) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 16).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26, depthWrite: false })
    );
    m.renderOrder = 30;
    return m;
  }

  buildPillars() {
    const T = this.theme;
    const hi = lambert(T.stone.hi), sh = lambert(T.stone.sh);
    const snow = T.snowCap ? lambert(T.snowCap) : null;
    const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const heights = [2.4, 3.4, 2.7, 3.1];
    angles.forEach((a, i) => {
      const px = Math.cos(a) * 13.5, pz = Math.sin(a) * 13.5, h = heights[i];
      const g = new THREE.Group(); g.position.set(px, 0, pz);
      const shad = this.contactShadow(1.5); shad.position.y = 0.04; g.add(shad);
      const add = (geo, mat, y, rot) => {
        const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true;
        if (rot) m.rotation.set(...rot); g.add(m); return m;
      };
      add(new THREE.BoxGeometry(1.6, 0.4, 1.6), sh, 0.2);
      add(new THREE.CylinderGeometry(0.52, 0.65, h, 8), hi, 0.4 + h * 0.5);
      add(new THREE.BoxGeometry(1.0, 0.18, 1.0), sh, 0.4 + h + 0.09);
      add(new THREE.BoxGeometry(1.4, 0.32, 1.4), sh, 0.4 + h + 0.34);
      add(new THREE.DodecahedronGeometry(0.55, 0), hi, 0.4 + h + 0.65, [0.2, a, 0.25]);
      if (snow) add(new THREE.CylinderGeometry(0.62, 0.74, 0.22, 8), snow, 0.4 + h + 0.58);
      if (snow) add(new THREE.BoxGeometry(1.5, 0.16, 1.5), snow, 0.4 + h + 0.58 + 0.12);
      this.root.add(g);
      this.obstacles.push({ x: px, z: pz, radius: 0.8 });
    });
  }

  buildTorana() {
    const T = this.theme, L = this.layout.landmarks;
    const hi = lambert(T.stone.hi), sh = lambert(T.stone.sh);
    const snow = T.snowCap ? lambert(T.snowCap) : null;
    const A = L.innerToranaR, B = L.toranaR;
    const list = [
      { x: 0, z: -A, rot: 0 }, { x: 0, z: A, rot: Math.PI }, { x: -A, z: 0, rot: Math.PI / 2 }, { x: A, z: 0, rot: -Math.PI / 2 },
      { x: 0, z: -B, rot: 0 }, { x: 0, z: B, rot: Math.PI }, { x: -B, z: 0, rot: Math.PI / 2 }, { x: B, z: 0, rot: -Math.PI / 2 }
    ];
    const plinth = new THREE.BoxGeometry(1.5, 0.4, 1.5);
    const col = new THREE.CylinderGeometry(0.48, 0.58, 4.4, 8);
    const l1 = new THREE.BoxGeometry(5.2, 0.4, 1.0);
    const l2 = new THREE.BoxGeometry(5.8, 0.35, 0.9);
    const arc = new THREE.TorusGeometry(2.0, 0.22, 6, 12, Math.PI);
    const apex = new THREE.OctahedronGeometry(0.35, 0);
    const fin = new THREE.ConeGeometry(0.28, 0.8, 4);
    list.forEach((tp) => {
      const g = new THREE.Group(); g.position.set(tp.x, 0, tp.z); g.rotation.y = tp.rot;
      const add = (geo, mat, x, y) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.castShadow = true; g.add(m); return m; };
      [-2.2, 2.2].forEach((ox) => {
        add(plinth, sh, ox, 0.2); add(col, hi, ox, 2.6);
        const s = this.contactShadow(1.2); s.position.set(ox, 0.04, 0); g.add(s);
        if (snow) add(new THREE.CylinderGeometry(0.55, 0.62, 0.2, 8), snow, ox, 4.9);
      });
      add(l1, sh, 0, 4.6); add(l2, hi, 0, 5.0); add(arc, hi, 0, 5.1); add(apex, sh, 0, 7.2);
      [-2.6, 2.6].forEach((fx) => add(fin, hi, fx, 5.6));
      if (snow) {
        add(new THREE.BoxGeometry(5.8, 0.2, 0.95), snow, 0, 5.28);
        add(new THREE.BoxGeometry(1.3, 0.2, 1.3), snow, -2.2, 0.44);
        add(new THREE.BoxGeometry(1.3, 0.2, 1.3), snow, 2.2, 0.44);
      }
      this.root.add(g);
      const c = Math.cos(tp.rot), s = Math.sin(tp.rot);
      [-2.2, 2.2].forEach((ox) => this.obstacles.push({ x: tp.x + ox * c, z: tp.z + ox * s, radius: 0.7 }));
    });
  }

  /* ───────────── Agni yajna-shala (terracotta tiled platform) ───────────── */

  buildAgni() {
    const T = this.theme, A = T.agni, L = this.layout.landmarks;
    const tileHi = lambert(A.tileHi), tileSh = lambert(A.tileSh), seam = lambert(A.seam);
    const curb = lambert(A.curb), curbDk = lambert(A.curbDk);
    const snow = T.snowCap ? lambert(T.snowCap) : null;
    const grp = new THREE.Group();
    grp.position.set(L.agni.x, 0, L.agni.z); grp.rotation.y = L.agni.rot;

    const base = new THREE.Mesh(new THREE.BoxGeometry(19, 0.2, 19), curbDk); base.position.y = 0.1; base.receiveShadow = true; grp.add(base);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.16, 16.4), tileHi); floor.position.y = 0.26; floor.receiveShadow = true; grp.add(floor);

    const lineH = new THREE.PlaneGeometry(16.0, 0.09).rotateX(-Math.PI / 2);
    const lineV = new THREE.PlaneGeometry(0.09, 16.0).rotateX(-Math.PI / 2);
    for (let i = -3; i <= 3; i++) {
      const h = new THREE.Mesh(lineH, seam); h.position.set(0, 0.345, i * 2.0); h.renderOrder = 15; grp.add(h);
      const v = new THREE.Mesh(lineV, seam); v.position.set(i * 2.0, 0.345, 0); v.renderOrder = 15; grp.add(v);
    }
    const tile = new THREE.PlaneGeometry(1.92, 1.92).rotateX(-Math.PI / 2);
    [[-6, 2], [-2, -6], [2, 4], [6, -2], [-4, -4], [4, 6], [0, 0], [-6, 6], [6, 6]].forEach(([cx, cz]) => {
      const t = new THREE.Mesh(tile, tileSh); t.position.set(cx + 1, 0.347, cz + 1); t.renderOrder = 16; t.receiveShadow = true; grp.add(t);
    });

    const half = 8.35;
    const panel = new THREE.BoxGeometry(2.0, 0.34, 0.1);
    const addWall = (cx, cz, len, ry) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(len, 0.6, 0.7), curb);
      w.position.set(cx, 0.5, cz); w.rotation.y = ry; w.castShadow = true; w.receiveShadow = true; grp.add(w);
      const holder = new THREE.Group(); holder.position.set(cx, 0.5, cz); holder.rotation.y = ry;
      const n = Math.max(1, Math.floor(len / 2.4));
      for (let k = 0; k < n; k++) {
        const px = -len / 2 + (k + 0.5) * (len / n);
        const p = new THREE.Mesh(panel, curbDk); p.position.set(px, 0, 0.38); holder.add(p);
        const p2 = new THREE.Mesh(panel, curbDk); p2.position.set(px, 0, -0.38); holder.add(p2);
      }
      if (snow) {
        const sc = new THREE.Mesh(new THREE.BoxGeometry(len * 0.8, 0.14, 0.62), snow);
        sc.position.set(len * 0.05, 0.37, 0); holder.add(sc);
      }
      grp.add(holder);
    };
    addWall(0, -half, 17.3, 0); addWall(half, 0, 17.3, Math.PI / 2); addWall(-half, 0, 17.3, Math.PI / 2);
    const gap = 5.6, seg = (17.3 - gap) / 2;
    addWall(-(gap / 2 + seg / 2), half, seg, 0); addWall(gap / 2 + seg / 2, half, seg, 0);
    for (let st = 0; st < 4; st++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(gap - 0.4, 0.14, 0.8), st % 2 ? curb : curbDk);
      step.position.set(0, 0.09 + st * 0.11, half + 2.3 - st * 0.8); step.castShadow = true; step.receiveShadow = true; grp.add(step);
    }

    const ped = new THREE.BoxGeometry(1.5, 1.0, 1.5);
    const bowl = new THREE.CylinderGeometry(0.85, 0.55, 0.55, 8);
    const bowlMat = lambert(A.bowl);
    const f1 = new THREE.MeshBasicMaterial({ color: 0xF97316 }), f2 = new THREE.MeshBasicMaterial({ color: 0xFDE047 });
    const fg1 = new THREE.ConeGeometry(0.55, 1.2, 5), fg2 = new THREE.ConeGeometry(0.34, 1.1, 5), fg3 = new THREE.ConeGeometry(0.22, 0.7, 5);
    [[-8.5, -8.5], [8.5, -8.5], [-8.5, 8.5], [8.5, 8.5]].forEach(([bx, bz]) => {
      const p = new THREE.Mesh(ped, curb); p.position.set(bx, 0.7, bz); p.castShadow = true; grp.add(p);
      if (snow) { const sc = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.5), snow); sc.position.set(bx, 1.22, bz - 0.0); sc.scale.set(0.6, 1, 0.6); sc.position.x += 0.35; sc.position.z += 0.35; grp.add(sc); }
      const b = new THREE.Mesh(bowl, bowlMat); b.position.set(bx, 1.45, bz); b.castShadow = true; grp.add(b);
      const a = new THREE.Mesh(fg1, f1); a.position.set(bx, 2.25, bz); grp.add(a);
      const b2 = new THREE.Mesh(fg2, f2); b2.position.set(bx, 2.6, bz); grp.add(b2);
      const c = new THREE.Mesh(fg3, f1); c.position.set(bx + 0.3, 2.35, bz - 0.2); c.rotation.z = -0.25; grp.add(c);
    });

    if (snow) {
      // drifts along the platform's outer edge
      [[-9.5, -3, 3.2, 1.6], [9.4, 4, 2.6, 1.8], [2, -9.7, 3.6, 1.4], [-4, 9.8, 2.8, 1.5]].forEach(([dx, dz, w, d]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), snow); m.position.set(dx, 0.14, dz); m.castShadow = true; grp.add(m);
      });
    }
    this.root.add(grp);
  }

  /* ───────────── Jala step-well (octagonal lotus pond) ───────────── */

  buildStepwell() {
    const W = this.theme.well, L = this.layout.landmarks;
    const g = new THREE.Group();
    g.position.set(L.stepwell.x, 0, L.stepwell.z); g.rotation.y = Math.PI / 8;
    this.root.add(g);

    const treads = [0, 1, 2, 3, 4].map((k) => decalMat(k % 2 ? W.treadDark : W.treadLight));
    const riser = decalMat(W.riser);
    const R0 = 11.5, STEP = 1.3;
    for (let k = 0; k < 5; k++) {
      const outer = R0 - STEP * k, inner = outer - STEP;
      const t = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 8).rotateX(-Math.PI / 2), treads[k]);
      t.position.y = 0.02 + k * 0.004; t.renderOrder = 6 + k * 2; t.receiveShadow = true; g.add(t);
      const s = new THREE.Mesh(new THREE.RingGeometry(outer - 0.4, outer, 8).rotateX(-Math.PI / 2), riser);
      s.position.y = 0.024 + k * 0.004; s.renderOrder = 7 + k * 2; s.receiveShadow = true; g.add(s);
    }
    const waterR = R0 - STEP * 5;
    const water = new THREE.Mesh(new THREE.CircleGeometry(waterR, 8).rotateX(-Math.PI / 2), decalMat(W.water));
    water.position.y = 0.04; water.renderOrder = 18; g.add(water);
    const shine = new THREE.Mesh(
      new THREE.RingGeometry(waterR - 0.55, waterR, 8).rotateX(-Math.PI / 2),
      decalMat(W.waterEdge, { opacity: 0.55, transparent: true })
    );
    shine.position.y = 0.044; shine.renderOrder = 19; g.add(shine);

    if (W.frozen) {
      // hairline cracks + snow drifts on the ice
      const crackMat = decalMat(W.crack ?? 0x6FA8CF, { opacity: 0.8, transparent: true });
      const crng = mulberry32(5);
      for (let i = 0; i < 9; i++) {
        const len = 1.5 + crng() * 2.6;
        const c = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.07).rotateX(-Math.PI / 2), crackMat);
        const a = crng() * Math.PI * 2, d = crng() * (waterR - 1.0);
        c.position.set(Math.cos(a) * d, 0.046, Math.sin(a) * d); c.rotation.y = crng() * 3; c.renderOrder = 20; g.add(c);
      }
      const snowPatch = decalMat(W.snow ?? 0xF4FAFF);
      [[-3.2, 1.4, 1.3], [3.4, -2.2, 1.1], [1.0, 3.8, 0.9], [-1.5, -3.8, 1.0]].forEach(([sx, sz, sr]) => {
        const p = new THREE.Mesh(new THREE.CircleGeometry(sr, 7).rotateX(-Math.PI / 2), snowPatch);
        p.position.set(sx, 0.048, sz); p.renderOrder = 21; g.add(p);
      });
    }

    // Central shrine
    const stone = lambert(W.stone), stoneDk = lambert(W.stoneDk);
    const snow = this.theme.snowCap ? lambert(this.theme.snowCap) : null;
    const add = (geo, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; g.add(m); return m; };
    add(new THREE.BoxGeometry(3.2, 0.34, 3.2), stoneDk, 0, 0.17, 0);
    add(new THREE.BoxGeometry(2.4, 0.34, 2.4), stone, 0, 0.51, 0);
    [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach(([cx, cz]) => add(new THREE.BoxGeometry(0.3, 1.5, 0.3), stone, cx, 1.5, cz));
    add(new THREE.BoxGeometry(2.4, 0.2, 2.4), stoneDk, 0, 2.35, 0);
    const roof = add(new THREE.ConeGeometry(1.75, 0.9, 4), stone, 0, 2.9, 0); roof.rotation.y = Math.PI / 4;
    if (snow) { const sc = add(new THREE.ConeGeometry(1.35, 0.55, 4), snow, 0, 3.08, 0); sc.rotation.y = Math.PI / 4; }
    add(new THREE.OctahedronGeometry(0.16, 0), lambert(0xF2C14E), 0, 3.5, 0, false);

    // Lotus pedestals
    const flower = lambert(W.lotus), gold = lambert(0xFACC15);
    const petal = new THREE.ConeGeometry(0.16, 0.42, 4);
    const lotus = (lx, ly, lz, s = 1) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = new THREE.Mesh(petal, flower);
        p.position.set(lx + Math.cos(a) * 0.17 * s, ly + 0.2 * s, lz + Math.sin(a) * 0.17 * s);
        p.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); p.scale.setScalar(s); g.add(p);
      }
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 5, 4), gold);
      c.position.set(lx, ly + 0.16 * s, lz); g.add(c);
    };
    [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]].forEach(([ox, oz]) => {
      add(new THREE.BoxGeometry(1.0, 0.4, 1.0), stoneDk, ox, 0.2, oz);
      add(new THREE.BoxGeometry(0.68, 0.34, 0.68), stone, ox, 0.57, oz);
      lotus(ox, 0.74, oz, 1.1);
    });

    // Lily pads
    const padMat = decalMat(W.pad);
    const padGeo = new THREE.CircleGeometry(0.75, 8).rotateX(-Math.PI / 2);
    const prng = mulberry32(77);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + prng() * 0.5, d = 2.2 + prng() * 2.3;
      const lx = Math.cos(a) * d, lz = Math.sin(a) * d;
      if (Math.abs(Math.abs(lx) - 2.9) < 0.9 && Math.abs(Math.abs(lz) - 2.9) < 0.9) continue;
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(lx, 0.05, lz); pad.scale.setScalar(0.8 + prng() * 0.5); pad.renderOrder = 20; g.add(pad);
      if (i % 4 === 0 && !W.frozen) lotus(lx, 0.05, lz, 0.7);
    }

    // Reeds in the water (desert oasis)
    if (W.reeds) {
      const reedGeo = makeAgaveGeometry();
      const reedMat = lambert(W.reeds);
      [[0.4, -3.9], [-3.9, 0.3], [3.9, 0.9], [-0.6, 4.1]].forEach(([rx, rz], i) => {
        const m = new THREE.Mesh(reedGeo, reedMat);
        m.position.set(rx, 0.04, rz); m.scale.setScalar(1.1 + (i % 2) * 0.3); m.castShadow = true; g.add(m);
      });
    }
  }
}

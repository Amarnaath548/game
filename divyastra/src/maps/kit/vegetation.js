import * as THREE from 'three';
import { part, partQ, merge, lambert } from './geo.js';

/**
 * Prop builders. Every builder takes the ArenaMap instance (`map`) and a params object, and
 * adds instanced meshes to `map.root`. All geometry is shared per builder; placement is
 * deterministic (seeded) and respects `map.isClear`.
 */

function inst(map, geo, mat, count, { shadow = true, receive = false } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
  m.count = count;
  m.castShadow = shadow;
  m.receiveShadow = receive;
  map.root.add(m);
  return m;
}

function put(map, mesh, i, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  const d = map.dummy;
  d.position.set(x, y, z);
  d.rotation.set(rx, ry, rz);
  d.scale.set(sx, sy, sz);
  d.updateMatrix();
  mesh.setMatrixAt(i, d.matrix);
}

function finish(mesh) {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

/* ───────────────────────────── Geometry factories ───────────────────────────── */

export function makeAgaveGeometry() {
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
  return merge(leaves);
}

export function makePotGeometry() {
  const profile = [[0, 0], [0.26, 0], [0.4, 0.12], [0.46, 0.3], [0.38, 0.5], [0.2, 0.62], [0.26, 0.72], [0.22, 0.74]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, 8);
}

function makeBanyanTrunk() {
  return merge([
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
}

function makePalm() {
  // Unit palm ~10 tall with a gentle lean; trunk and fronds are returned separately (two materials)
  const trunkParts = [];
  const SEG = 6;
  let prev = [0, 0];
  for (let i = 0; i < SEG; i++) {
    const t0 = i / SEG, t1 = (i + 1) / SEG;
    const x0 = 1.0 * t0 * t0, x1 = 1.0 * t1 * t1;
    const y0 = t0 * 10, y1 = t1 * 10;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const r0 = 0.6 - 0.2 * t0, r1 = 0.6 - 0.2 * t1;
    const ang = Math.atan2(x1 - x0, y1 - y0);
    trunkParts.push(part(new THREE.CylinderGeometry(r1, r0, len * 1.04, 6), [(x0 + x1) / 2, (y0 + y1) / 2, 0], [0, 0, -ang]));
    prev = [x1, y1];
  }
  const crown = prev;
  trunkParts.push(part(new THREE.SphereGeometry(0.42, 6, 5), [crown[0], crown[1] - 0.1, 0], [0, 0, 0], [1, 0.8, 1]));

  const blade = new THREE.ConeGeometry(0.55, 2.3, 4);
  const up = new THREE.Vector3(0, 1, 0);
  const frondParts = [];
  const FR = 14;
  for (let k = 0; k < FR; k++) {
    const a = (k / FR) * Math.PI * 2 + (k % 2) * 0.2;
    const e1 = 0.62 + (k % 3) * 0.08;
    const e2 = -0.32 - (k % 2) * 0.12;
    const d1 = new THREE.Vector3(Math.cos(a) * Math.cos(e1), Math.sin(e1), Math.sin(a) * Math.cos(e1));
    const d2 = new THREE.Vector3(Math.cos(a) * Math.cos(e2), Math.sin(e2), Math.sin(a) * Math.cos(e2));
    const base1 = new THREE.Vector3(crown[0], crown[1], 0);
    const p1 = base1.clone().addScaledVector(d1, 1.15);
    frondParts.push(partQ(blade, [p1.x, p1.y, p1.z], new THREE.Quaternion().setFromUnitVectors(up, d1), [1, 1, 0.32]));
    const base2 = base1.clone().addScaledVector(d1, 2.25);
    const p2 = base2.clone().addScaledVector(d2, 1.2);
    frondParts.push(partQ(blade, [p2.x, p2.y, p2.z], new THREE.Quaternion().setFromUnitVectors(up, d2), [0.85, 1.05, 0.3]));
  }
  return { trunk: merge(trunkParts), fronds: merge(frondParts) };
}

function makeSaguaro() {
  const g = [];
  g.push(part(new THREE.CylinderGeometry(0.32, 0.36, 3.2, 7), [0, 1.6, 0]));
  g.push(part(new THREE.SphereGeometry(0.32, 7, 5), [0, 3.2, 0], [0, 0, 0], [1, 0.85, 1]));
  // left arm
  g.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.75, 6), [-0.55, 1.9, 0], [0, 0, Math.PI / 2]));
  g.push(part(new THREE.CylinderGeometry(0.2, 0.22, 1.2, 6), [-0.92, 2.45, 0]));
  g.push(part(new THREE.SphereGeometry(0.2, 6, 5), [-0.92, 3.05, 0], [0, 0, 0], [1, 0.85, 1]));
  // right arm
  g.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 6), [0.52, 1.45, 0], [0, 0, Math.PI / 2]));
  g.push(part(new THREE.CylinderGeometry(0.2, 0.22, 0.95, 6), [0.86, 1.9, 0]));
  g.push(part(new THREE.SphereGeometry(0.2, 6, 5), [0.86, 2.4, 0], [0, 0, 0], [1, 0.85, 1]));
  return merge(g);
}

function makeTuft() {
  const blade = new THREE.ConeGeometry(0.05, 0.95, 3);
  const list = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tilt = 0.25 + (i % 3) * 0.18;
    list.push(part(blade, [Math.cos(a) * 0.1, 0.45, Math.sin(a) * 0.1], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], [1, 0.7 + (i % 3) * 0.25, 1]));
  }
  return merge(list);
}

/* ───────────────────────────── Builders ───────────────────────────── */

/**
 * Banyans: stacked faceted canopy lobes, buttressed trunks, hanging roots.
 * params: { palettes:[{dark,mid,hi,trunk,root,cap?}], feature:[[x,z,scale,paletteIdx]], scatter, scatterPalettes:[idx...] }
 * A palette with `cap` adds a snow-white cap on every lobe.
 */
export function banyans(map, { palettes, feature = [], scatter = 0, scatterPalettes = [0], scatterRange = [34, 112] }) {
  const trees = feature.map(([x, z, s, p = 0]) => ({ x, z, s, p }));
  trees.forEach((t) => map.placed.push([t.x, t.z, 3.6 * t.s]));
  let guard = 0;
  let added = 0;
  while (added < scatter && guard++ < 800) {
    const s = 0.95 + map.rng() * 0.5;
    const spot = map.findSpot(scatterRange[0], scatterRange[1], 3.4 * s, 12);
    if (!spot) continue;
    const p = scatterPalettes[Math.floor(map.rng() * scatterPalettes.length)];
    trees.push({ x: spot[0], z: spot[1], s, p });
    map.placed.push([spot[0], spot[1], 3.6 * s]);
    added++;
  }
  map.banyanData = trees;

  const trunkGeo = makeBanyanTrunk();
  const lobeGeo = new THREE.IcosahedronGeometry(1, 1);
  const rootGeo = new THREE.CylinderGeometry(0.05, 0.085, 1, 4).translate(0, -0.5, 0);
  const ROOTS = 16;

  palettes.forEach((pal, pi) => {
    const group = trees.filter((t) => t.p === pi);
    if (!group.length) return;
    const n = group.length;
    const trunk = inst(map, trunkGeo, lambert(pal.trunk), n);
    const roots = inst(map, rootGeo, lambert(pal.root ?? 0x5A3A22), n * ROOTS, { shadow: false });
    const dark = inst(map, lobeGeo, lambert(pal.dark), n * 4);
    const mid = inst(map, lobeGeo, lambert(pal.mid), n * 3);
    const hi = inst(map, lobeGeo, lambert(pal.hi), n * 2);
    const cap = pal.cap ? inst(map, lobeGeo, lambert(pal.cap), n * 9, { shadow: false }) : null;

    let rI = 0, dI = 0, mI = 0, hI = 0, cI = 0;
    group.forEach((t, i) => {
      const { x, z, s } = t;
      put(map, trunk, i, x, 0, z, s, s, s, i * 1.3);
      for (let k = 0; k < ROOTS; k++) {
        const a = (k / ROOTS) * Math.PI * 2 + i;
        const rad = (2.1 + ((k * 7) % 5) * 0.45) * s;
        const len = (3.3 + ((k * 3) % 4) * 0.35) * s;
        put(map, roots, rI++, x + Math.cos(a) * rad, 3.9 * s, z + Math.sin(a) * rad, s, len, s);
      }
      const lobe = (mesh, idx, ang, rad, y, sx, sy, sz) => {
        const lx = x + Math.cos(ang) * rad * s, lz = z + Math.sin(ang) * rad * s;
        put(map, mesh, idx, lx, y * s, lz, sx * s, sy * s, sz * s, ang);
        if (cap) put(map, cap, cI++, lx, (y + sy * 0.62) * s, lz, sx * 0.86 * s, sy * 0.3 * s, sz * 0.86 * s, ang);
      };
      for (let k = 0; k < 4; k++) lobe(dark, dI++, i * 1.7 + (k / 4) * Math.PI * 2, 2.2, 4.2 + (k % 2) * 0.35, 2.7, 1.35, 2.7);
      for (let k = 0; k < 3; k++) lobe(mid, mI++, i * 1.1 + (k / 3) * Math.PI * 2 + 0.5, 1.4, 5.3 + k * 0.2, 2.4, 1.2, 2.4);
      for (let k = 0; k < 2; k++) lobe(hi, hI++, i * 0.7 + k * Math.PI, 0.6, 6.4 + k * 0.25, 2.0, 1.0, 2.0);
    });
    [trunk, roots, dark, mid, hi, cap].forEach((m) => m && finish(m));
    if (cap) cap.count = cI;
  });

  // Contact shadows under every tree
  map.addContactShadows(trees.map(({ x, z, s }) => [x, z, s * 3.0, s * 3.0]), 'trees');
}

/**
 * Boulder clusters. params: { clusters:[[x,z,n]], solo, colors:[hex...], cap:{color,sy}|null,
 *   accent:{color, spots:[[x,z]...]} }
 * `cap` adds moss / snow / autumn-yellow caps; `accent` adds warm boulders hugging the roads.
 */
export function rocks(map, { clusters = [], solo = 26, colors, cap = null, accent = null, rim = 6 }) {
  const list = [];
  clusters.forEach(([cx, cz, n, smax = 2.3, spread = 4.6]) => {
    for (let k = 0; k < n; k++) {
      const a = map.rng() * Math.PI * 2;
      const d = map.rng() * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const sc = 0.8 + map.rng() * (smax - 0.8);
      if (!map.isClear(x, z, sc * 1.1, { rim })) continue;
      list.push({ x, z, sc, rot: map.rng() * 3 });
    }
  });
  for (let k = 0; k < solo; k++) {
    const spot = map.findSpot(28, 112, 1.4, 20, { rim });
    if (spot) list.push({ x: spot[0], z: spot[1], sc: 0.6 + map.rng() * 0.9, rot: map.rng() * 3 });
  }

  const geo = new THREE.DodecahedronGeometry(1, 0);
  const body = inst(map, geo, lambert(0xffffff), list.length, { receive: true });
  const capMesh = cap ? inst(map, geo, lambert(cap.color), list.length) : null;
  const col = new THREE.Color();
  list.forEach(({ x, z, sc, rot }, i) => {
    put(map, body, i, x, sc * 0.62, z, sc * 1.05, sc * 0.9, sc, rot, 0.1, 0.08);
    col.setHex(colors[i % colors.length]);
    body.setColorAt(i, col);
    if (capMesh) put(map, capMesh, i, x, sc * 1.0, z, sc * 0.92, sc * (cap.sy ?? 0.4), sc * 0.9, rot);
  });
  finish(body);
  if (capMesh) finish(capMesh);

  if (accent) {
    const spots = [];
    accent.spots.forEach(([x, z]) => {
      for (let k = 0; k < 2; k++) {
        const bx = x + (map.rng() - 0.5) * 3, bz = z + (map.rng() - 0.5) * 3;
        const hw = map.layout.landmarks.pathHalfW + 1.6;
        if (Math.abs(bx) > hw || Math.abs(bz) > hw) spots.push([bx, bz, 0.7 + map.rng() * 0.7]);
      }
    });
    const m = inst(map, geo, lambert(accent.color), spots.length);
    spots.forEach(([x, z, sc], i) => put(map, m, i, x, sc * 0.6, z, sc * 0.9, sc * 1.1, sc * 0.8, i, 0.1, 0.05));
    finish(m);
  }
  map.rockSpots = list;
}

/** Agave rosettes: flanking each gate + scattered. params: { color, solo } */
export function agaves(map, { color, solo = 40, tint = null }) {
  const L = map.layout.landmarks;
  const spots = [];
  const flank = (gx, gz, nx, nz) => {
    for (const side of [-1, 1]) {
      spots.push([
        gx + nx * (L.pathHalfW + 2.6) * side + (map.rng() - 0.5),
        gz + nz * (L.pathHalfW + 2.6) * side + (map.rng() - 0.5),
        1 + map.rng() * 0.4
      ]);
    }
  };
  [[0, -L.toranaR, 1, 0], [0, L.toranaR, 1, 0], [-L.toranaR, 0, 0, 1], [L.toranaR, 0, 0, 1]].forEach(([gx, gz, nx, nz]) => {
    flank(gx, gz, nx, nz);
    flank(gx * 0.94, gz * 0.94, nx, nz);
  });
  for (let i = 0; i < solo; i++) {
    const spot = map.findSpot(26, 112, 1.1, 20, { rim: 5 });
    if (spot) spots.push([spot[0], spot[1], 0.85 + map.rng() * 0.5]);
  }
  const mesh = inst(map, makeAgaveGeometry(), lambert(0xffffff), spots.length);
  const base = new THREE.Color(color);
  const alt = tint ? new THREE.Color(tint) : base;
  spots.forEach(([x, z, s], i) => {
    put(map, mesh, i, x, 0, z, s, s, s, map.rng() * 6);
    mesh.setColorAt(i, i % 3 === 0 ? alt : base);
  });
  finish(mesh);
  map.agaveSpots = spots;
  map.addContactShadows(spots.map(([x, z, s]) => [x, z, s * 0.9, s * 0.9]), 'agave');
}

/** Clay pots clustered by the gates. params: { colors, snowCap } */
export function pots(map, { colors, snowCap = null }) {
  const L = map.layout.landmarks;
  const spots = [];
  const cluster = (cx, cz, n, spread = 1.6) => {
    for (let k = 0; k < n; k++) {
      const x = cx + (map.rng() - 0.5) * spread * 2;
      const z = cz + (map.rng() - 0.5) * spread * 2;
      if (Math.abs(x) < L.pathHalfW + 0.8 && Math.abs(z) < L.toranaR + 8) continue;
      if (Math.abs(z) < L.pathHalfW + 0.8 && Math.abs(x) < L.toranaR + 8) continue;
      spots.push([x, z, 0.8 + map.rng() * 0.6]);
    }
  };
  const T = L.toranaR;
  [[-8.5, -T + 3], [8.5, -T + 3], [-8.5, T - 3], [8.5, T - 3],
    [-T + 3, -8.5], [-T + 3, 8.5], [T - 3, -8.5], [T - 3, 8.5]].forEach(([x, z]) => cluster(x, z, 4));
  [[-27, -9], [27, 9], [-27, 9], [27, -9]].forEach(([x, z]) => cluster(x, z, 2, 1.0));
  cluster(L.stepwell.x - 13, L.stepwell.z + 4, 3);
  cluster(L.stepwell.x + 12, L.stepwell.z - 6, 3);
  cluster(26, -52, 3);
  cluster(52, -26, 3);

  const mesh = inst(map, makePotGeometry(), lambert(0xffffff, { side: THREE.DoubleSide }), spots.length);
  const col = new THREE.Color();
  spots.forEach(([x, z, s], i) => {
    put(map, mesh, i, x, 0, z, s, s * 1.1, s, map.rng() * 6);
    col.setHex(colors[i % colors.length]);
    mesh.setColorAt(i, col);
  });
  finish(mesh);
  if (snowCap) {
    const lids = inst(map, new THREE.CircleGeometry(0.26, 8).rotateX(-Math.PI / 2), lambert(snowCap), spots.length, { shadow: false });
    spots.forEach(([x, z, s], i) => put(map, lids, i, x, 0.78 * s * 1.1, z, s, 1, s));
    finish(lids);
  }
  map.addContactShadows(spots.map(([x, z, s]) => [x, z, s * 0.55, s * 0.55]), 'pots');
}

/** Piles of fallen leaves (autumn). params: { colors, piles:[[x,z,radius]] } */
export function leafPiles(map, { colors, piles }) {
  const blobs = [];
  piles.forEach(([px, pz, pr]) => {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = map.rng() * Math.PI * 2;
      const d = Math.sqrt(map.rng()) * pr;
      blobs.push([px + Math.cos(a) * d, pz + Math.sin(a) * d, 0.9 + map.rng() * 1.3, map.rng() * 3]);
    }
  });
  const mesh = inst(map, new THREE.DodecahedronGeometry(1, 0), lambert(0xffffff), blobs.length, { shadow: false, receive: true });
  const col = new THREE.Color();
  blobs.forEach(([x, z, r, rot], i) => {
    put(map, mesh, i, x, 0.1, z, r, 0.2, r * 0.8, rot, 0.1, 0.1);
    col.setHex(colors[i % colors.length]);
    mesh.setColorAt(i, col);
  });
  finish(mesh);
}

/**
 * Palm groves (desert). params: { groves:[[cx,cz,count,spread]], trunk, fronds:[hex,hex], minH, maxH }
 */
export function palms(map, { groves, trunk, fronds, minH = 8.5, maxH = 13 }) {
  const spots = [];
  groves.forEach(([cx, cz, n, spread]) => {
    let tries = 0, added = 0;
    while (added < n && tries++ < 60) {
      const a = map.rng() * Math.PI * 2;
      const d = Math.sqrt(map.rng()) * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (!map.isClear(x, z, 1.6, { rim: 6 })) continue;
      if (spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 3.1)) continue;
      spots.push([x, z, minH + map.rng() * (maxH - minH), map.rng() * Math.PI * 2]);
      added++;
    }
  });
  const palm = makePalm();
  const t = inst(map, palm.trunk, lambert(trunk), spots.length);
  const f = inst(map, palm.fronds, lambert(0xffffff), spots.length);
  const col = new THREE.Color();
  spots.forEach(([x, z, h, ry], i) => {
    const s = h / 10;
    put(map, t, i, x, 0, z, s, s, s, ry);
    put(map, f, i, x, 0, z, s, s, s, ry);
    col.setHex(fronds[i % fronds.length]);
    f.setColorAt(i, col);
    map.placed.push([x, z, 1.8]);
  });
  finish(t); finish(f);
  map.addContactShadows(spots.map(([x, z, h]) => [x, z, h * 0.28, h * 0.28]), 'palms');
}

/** Saguaro cacti. params: { color, spots:[[x,z]], solo } */
export function cacti(map, { color, spots = [], solo = 0, scale = 1.6 }) {
  const list = [];
  spots.forEach(([x, z]) => { if (map.isClear(x, z, 1.4, { rim: 5 })) list.push([x, z, (1 + map.rng() * 0.5) * scale]); });
  for (let i = 0; i < solo; i++) {
    const s = map.findSpot(32, 108, 1.5, 30, { rim: 6 });
    if (s) list.push([s[0], s[1], (0.9 + map.rng() * 0.6) * scale]);
  }
  const mesh = inst(map, makeSaguaro(), lambert(0xffffff), list.length);
  const base = new THREE.Color(color), alt = new THREE.Color(color).offsetHSL(0, 0, -0.06);
  list.forEach(([x, z, s], i) => {
    put(map, mesh, i, x, 0, z, s, s, s, map.rng() * 6);
    mesh.setColorAt(i, i % 2 ? alt : base);
    map.placed.push([x, z, 1.2]);
  });
  finish(mesh);
  map.addContactShadows(list.map(([x, z, s]) => [x, z, s * 0.9, s * 0.9]), 'cacti');
}

/**
 * Snow-laden conifers. params: { groves:[[cx,cz,count,spread]], green, white, trunk, solo }
 * Each tree = 4 stacked green tiers + 4 white snow caps sitting just above them.
 */
export function pines(map, { groves, green, white, trunk, solo = 0, tiers = 4, scale = [0.95, 1.55] }) {
  const trees = [];
  groves.forEach(([cx, cz, n, spread]) => {
    let tries = 0, added = 0;
    while (added < n && tries++ < 120) {
      const a = map.rng() * Math.PI * 2;
      const d = Math.sqrt(map.rng()) * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const s = scale[0] + map.rng() * (scale[1] - scale[0]);
      if (!map.isClear(x, z, 2.2 * s, { rim: 6 })) continue;
      if (trees.some((t) => Math.hypot(t[0] - x, t[1] - z) < 3.6)) continue;
      trees.push([x, z, s]);
      added++;
    }
  });
  for (let i = 0; i < solo; i++) {
    const s = 0.85 + map.rng() * 0.5;
    const spot = map.findSpot(30, 110, 2.4 * s, 20, { rim: 6 });
    if (spot) trees.push([spot[0], spot[1], s]);
  }
  const n = trees.length;
  const trunkM = inst(map, new THREE.CylinderGeometry(0.32, 0.46, 2.2, 6), lambert(trunk), n);
  const greenM = inst(map, new THREE.ConeGeometry(1.9, 3.1, 8), lambert(green), n * tiers);
  const whiteM = inst(map, new THREE.ConeGeometry(1.9, 3.1, 8), lambert(white), n * tiers);
  let gi = 0;
  trees.forEach(([x, z, s], i) => {
    put(map, trunkM, i, x, 1.1 * s, z, s, s, s);
    for (let k = 0; k < tiers; k++) {
      const r = (1 - k * 0.2) * s;
      const y = (2.5 + k * 2.2) * s;
      put(map, greenM, gi, x, y, z, r, s * (1 - k * 0.05), r, k * 0.7);
      put(map, whiteM, gi, x, y + 0.34 * s, z, r * 0.86, s * (0.92 - k * 0.05), r * 0.86, k * 0.7);
      gi++;
    }
    map.placed.push([x, z, 2.4 * s]);
  });
  [trunkM, greenM, whiteM].forEach(finish);
  map.addContactShadows(trees.map(([x, z, s]) => [x, z, s * 2.4, s * 2.4]), 'pines');
}

/** Dry grass tufts. params: { count, colors } */
export function tufts(map, { count, colors }) {
  const spots = [];
  for (let i = 0; i < count; i++) {
    const s = map.findSpot(22, 114, 0.6, 12, { rim: 4 });
    if (s) spots.push([s[0], s[1], 0.8 + map.rng() * 0.8]);
  }
  const mesh = inst(map, makeTuft(), lambert(0xffffff), spots.length, { shadow: false });
  const col = new THREE.Color();
  spots.forEach(([x, z, s], i) => {
    put(map, mesh, i, x, 0, z, s, s, s, map.rng() * 6);
    col.setHex(colors[i % colors.length]);
    mesh.setColorAt(i, col);
  });
  finish(mesh);
}

/** Pebble scatter in loose patches. params: { clusters:[[x,z,n,spread]], color } */
export function pebbles(map, { clusters, color }) {
  const list = [];
  clusters.forEach(([cx, cz, n, spread]) => {
    for (let k = 0; k < n; k++) {
      const a = map.rng() * Math.PI * 2, d = Math.sqrt(map.rng()) * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (map.isClear(x, z, 0.4, { rim: 4 })) list.push([x, z, 0.16 + map.rng() * 0.2]);
    }
  });
  const mesh = inst(map, new THREE.DodecahedronGeometry(1, 0), lambert(color), list.length, { shadow: false });
  list.forEach(([x, z, r], i) => put(map, mesh, i, x, r * 0.3, z, r * 1.2, r * 0.6, r, map.rng() * 3));
  finish(mesh);
}

/** Broken low walls hugging the ring road (desert ruins). params: { color, darkColor } */
export function ringWalls(map, { color, darkColor }) {
  const L = map.layout.landmarks;
  const R = L.ringRoad[1] + 2.0;
  const pieces = [];
  for (let k = 0; k < 14; k++) {
    const deg = k * (360 / 14) + 9;
    const a = (deg * Math.PI) / 180;
    // keep the four gates open
    const nearGate = [0, 90, 180, 270].some((g) => Math.abs(((deg - g + 540) % 360) - 180) > 172);
    if (nearGate) continue;
    for (let j = 0; j < 3; j++) {
      const aa = a + (j - 1) * 0.07;
      const x = Math.cos(aa) * R, z = Math.sin(aa) * R;
      if (!map.isClear(x, z, 1.2, { paths: false })) continue;
      pieces.push([x, z, -aa + Math.PI / 2 + (map.rng() - 0.5) * 0.15, 0.45 + map.rng() * 0.6]);
    }
  }
  const mesh = inst(map, new THREE.BoxGeometry(3.4, 1, 0.9), lambert(0xffffff), pieces.length, { receive: true });
  const c1 = new THREE.Color(color), c2 = new THREE.Color(darkColor);
  pieces.forEach(([x, z, ry, h], i) => {
    put(map, mesh, i, x, h / 2, z, 1, h, 1, ry);
    mesh.setColorAt(i, i % 2 ? c1 : c2);
  });
  finish(mesh);
}

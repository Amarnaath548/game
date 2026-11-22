import * as THREE from 'three';
import { part, merge, lambert } from './geo.js';

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
  mesh.updateMatrix();
}

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

export function makeTuft() {
  const blade = new THREE.ConeGeometry(0.05, 0.95, 3);
  const list = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tilt = 0.25 + (i % 3) * 0.18;
    list.push(part(blade, [Math.cos(a) * 0.1, 0.45, Math.sin(a) * 0.1], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt], [1, 0.7 + (i % 3) * 0.25, 1]));
  }
  return merge(list);
}

export function rocks(map, { clusters = [], solo = 26, colors, cap = null, accent = null, rim = 6 }) {
  const list = [];
  clusters.forEach(([cx, cz, n, smax = 2.3, spread = 4.6]) => {
    for (let k = 0; k < n; k++) {
      const a = map.rng() * Math.PI * 2, d = map.rng() * spread;
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

  const accentSpots = [];
  if (accent) {
    accent.spots.forEach(([x, z]) => {
      for (let k = 0; k < 2; k++) {
        const bx = x + (map.rng() - 0.5) * 3, bz = z + (map.rng() - 0.5) * 3;
        const hw = map.layout.landmarks.pathHalfW + 1.6;
        if (Math.abs(bx) > hw || Math.abs(bz) > hw) accentSpots.push([bx, bz, 0.7 + map.rng() * 0.7]);
      }
    });
  }

  const total = list.length + accentSpots.length;
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const body = new THREE.InstancedMesh(geo, lambert(0xffffff), total);
  body.receiveShadow = true;
  body.matrixAutoUpdate = false;
  const col = new THREE.Color();

  list.forEach(({ x, z, sc, rot }, i) => {
    put(map, body, i, x, sc * 0.62, z, sc * 1.05, sc * 0.9, sc, rot, 0.1, 0.08);
    col.setHex(colors[i % colors.length]);
    body.setColorAt(i, col);
  });

  const baseOffset = list.length;
  accentSpots.forEach(([x, z, sc], j) => {
    put(map, body, baseOffset + j, x, sc * 0.6, z, sc * 0.9, sc * 1.1, sc * 0.8, j, 0.1, 0.05);
    col.setHex(accent.color);
    body.setColorAt(baseOffset + j, col);
  });
  finish(body);
  map.root.add(body);

  if (cap && list.length > 0) {
    const capMesh = new THREE.InstancedMesh(geo, lambert(cap.color), list.length);
    capMesh.matrixAutoUpdate = false;
    list.forEach(({ x, z, sc, rot }, i) => {
      put(map, capMesh, i, x, sc * 1.0, z, sc * 0.92, sc * (cap.sy ?? 0.4), sc * 0.9, rot);
    });
    finish(capMesh);
    map.root.add(capMesh);
  }

  map.rockSpots = list;
}

export function agaves(map, { color, solo = 40, tint = null }) {
  const L = map.layout.landmarks, spots = [];
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
    flank(gx, gz, nx, nz); flank(gx * 0.94, gz * 0.94, nx, nz);
  });
  for (let i = 0; i < solo; i++) {
    const spot = map.findSpot(26, 112, 1.1, 20, { rim: 5 });
    if (spot) spots.push([spot[0], spot[1], 0.85 + map.rng() * 0.5]);
  }
  const mesh = new THREE.InstancedMesh(makeAgaveGeometry(), lambert(0xffffff), spots.length);
  mesh.matrixAutoUpdate = false;
  const base = new THREE.Color(color), alt = tint ? new THREE.Color(tint) : base;
  spots.forEach(([x, z, s], i) => {
    put(map, mesh, i, x, 0, z, s, s, s, map.rng() * 6);
    mesh.setColorAt(i, i % 3 === 0 ? alt : base);
  });
  finish(mesh);
  map.root.add(mesh);
  map.agaveSpots = spots;
  map.addContactShadows(spots.map(([x, z, s]) => [x, z, s * 0.9, s * 0.9]), 'agave');
}

export function pots(map, { colors, snowCap = null }) {
  const L = map.layout.landmarks, spots = [];
  const cluster = (cx, cz, n, spread = 1.6) => {
    for (let k = 0; k < n; k++) {
      const x = cx + (map.rng() - 0.5) * spread * 2, z = cz + (map.rng() - 0.5) * spread * 2;
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
  cluster(26, -52, 3); cluster(52, -26, 3);

  const mesh = new THREE.InstancedMesh(makePotGeometry(), lambert(0xffffff, { side: THREE.DoubleSide }), spots.length);
  mesh.matrixAutoUpdate = false;
  const col = new THREE.Color();
  spots.forEach(([x, z, s], i) => {
    put(map, mesh, i, x, 0, z, s, s * 1.1, s, map.rng() * 6);
    col.setHex(colors[i % colors.length]);
    mesh.setColorAt(i, col);
  });
  finish(mesh);
  map.root.add(mesh);

  if (snowCap) {
    const lids = new THREE.InstancedMesh(new THREE.CircleGeometry(0.26, 8).rotateX(-Math.PI / 2), lambert(snowCap), spots.length);
    lids.matrixAutoUpdate = false;
    spots.forEach(([x, z, s], i) => put(map, lids, i, x, 0.78 * s * 1.1, z, s, 1, s));
    finish(lids);
    map.root.add(lids);
  }
  map.addContactShadows(spots.map(([x, z, s]) => [x, z, s * 0.55, s * 0.55]), 'pots');
}

export function tufts(map, { count, colors }) {
  const spots = [];
  for (let i = 0; i < count; i++) {
    const s = map.findSpot(22, 114, 0.6, 12, { rim: 4 });
    if (s) spots.push([s[0], s[1], 0.8 + map.rng() * 0.8]);
  }
  const mesh = new THREE.InstancedMesh(makeTuft(), lambert(0xffffff), spots.length);
  mesh.matrixAutoUpdate = false;
  const col = new THREE.Color();
  spots.forEach(([x, z, s], i) => {
    put(map, mesh, i, x, 0, z, s, s, s, map.rng() * 6);
    col.setHex(colors[i % colors.length]);
    mesh.setColorAt(i, col);
  });
  finish(mesh);
  map.root.add(mesh);
}

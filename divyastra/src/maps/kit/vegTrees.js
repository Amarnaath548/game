import * as THREE from 'three';
import { part, partQ, partColor, withColor, merge, lambert } from './geo.js';
import { registerTreeMesh, updateTreeOcclusion } from './treeOcclusion.js';

export { registerTreeMesh, updateTreeOcclusion };

function put(map, mesh, i, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  const d = map.dummy;
  d.position.set(x, y, z);
  d.rotation.set(rx, ry, rz);
  d.scale.set(sx, sy, sz);
  d.updateMatrix();
  mesh.setMatrixAt(i, d.matrix);
}

function makeBanyanTrunk() {
  return merge([
    part(new THREE.CylinderGeometry(0.75, 1.3, 4.4, 7), [0, 2.2, 0]),
    ...[0, 2.1, 4.2].map((a) => part(new THREE.CylinderGeometry(0.34, 0.55, 3.6, 6), [Math.cos(a) * 1.55, 1.7, Math.sin(a) * 1.55], [Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14])),
    ...[0.4, 1.5, 2.6, 3.7, 4.9].map((a) => part(new THREE.ConeGeometry(0.55, 1.1, 4), [Math.cos(a) * 1.35, 0.5, Math.sin(a) * 1.35], [Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55]))
  ]);
}

function makeBanyanModel(pal) {
  const parts = [];
  parts.push(withColor(makeBanyanTrunk(), pal.trunk));

  const rootCyl = new THREE.CylinderGeometry(0.05, 0.085, 1, 4).translate(0, -0.5, 0);
  const rootCol = pal.root ?? 0x5A3A22;
  const ROOTS = 16;
  for (let k = 0; k < ROOTS; k++) {
    const a = (k / ROOTS) * Math.PI * 2;
    const rad = 2.1 + ((k * 7) % 5) * 0.45;
    const len = 3.3 + ((k * 3) % 4) * 0.35;
    parts.push(partColor(rootCyl, rootCol, [Math.cos(a) * rad, 3.9, Math.sin(a) * rad], [0, 0, 0], [1, len, 1]));
  }

  const lobeGeo = new THREE.IcosahedronGeometry(1, 1);
  const addLobe = (ang, rad, y, sx, sy, sz, color, capColor) => {
    const lx = Math.cos(ang) * rad, lz = Math.sin(ang) * rad;
    parts.push(partColor(lobeGeo, color, [lx, y, lz], [0, ang, 0], [sx, sy, sz]));
    if (capColor) {
      parts.push(partColor(lobeGeo, capColor, [lx, y + sy * 0.62, lz], [0, ang, 0], [sx * 0.86, sy * 0.3, sz * 0.86]));
    }
  };

  for (let k = 0; k < 4; k++) addLobe((k / 4) * Math.PI * 2, 2.2, 4.2 + (k % 2) * 0.35, 2.7, 1.35, 2.7, pal.dark, pal.cap);
  for (let k = 0; k < 3; k++) addLobe((k / 3) * Math.PI * 2 + 0.5, 1.4, 5.3 + k * 0.2, 2.4, 1.2, 2.4, pal.mid, pal.cap);
  for (let k = 0; k < 2; k++) addLobe(k * Math.PI, 0.6, 6.4 + k * 0.25, 2.0, 1.0, 2.0, pal.hi, pal.cap);

  return merge(parts);
}

export function banyans(map, { palettes, feature = [], scatter = 0, scatterPalettes = [0], scatterRange = [34, 112] }) {
  const trees = feature.map(([x, z, s, p = 0]) => ({ x, z, s, p }));
  trees.forEach((t) => map.placed.push([t.x, t.z, 3.6 * t.s]));
  let guard = 0, added = 0;
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

  palettes.forEach((pal, pi) => {
    const group = trees.filter((t) => t.p === pi);
    if (!group.length) return;
    const treeGeo = makeBanyanModel(pal);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const mesh = new THREE.InstancedMesh(treeGeo, mat, group.length);
    mesh.castShadow = true;
    mesh.matrixAutoUpdate = false;
    group.forEach((t, i) => put(map, mesh, i, t.x, 0, t.z, t.s, t.s, t.s, i * 1.3));
    registerTreeMesh(map, mesh, group.map((t, i) => ({ x: t.x, z: t.z, sx: t.s, sy: t.s, sz: t.s, ry: i * 1.3 })));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.updateMatrix();
    map.root.add(mesh);
  });

  map.addContactShadows(trees.map(({ x, z, s }) => [x, z, s * 3.0, s * 3.0]), 'trees');
}

function makePineModel(green, white, trunk, tiers) {
  const parts = [];
  parts.push(withColor(new THREE.CylinderGeometry(0.32, 0.46, 2.2, 6).translate(0, 1.1, 0), trunk));
  const coneGeo = new THREE.ConeGeometry(1.9, 3.1, 8);
  for (let k = 0; k < tiers; k++) {
    const r = 1 - k * 0.2, y = 2.5 + k * 2.2, sy = 1 - k * 0.05, rot = k * 0.7;
    parts.push(partColor(coneGeo, green, [0, y, 0], [0, rot, 0], [r, sy, r]));
    parts.push(partColor(coneGeo, white, [0, y + 0.34, 0], [0, rot, 0], [r * 0.86, 0.92 - k * 0.05, r * 0.86]));
  }
  return merge(parts);
}

export function pines(map, { groves, green, white, trunk, solo = 0, tiers = 4, scale = [0.95, 1.55] }) {
  const trees = [];
  groves.forEach(([cx, cz, n, spread]) => {
    let tries = 0, added = 0;
    while (added < n && tries++ < 120) {
      const a = map.rng() * Math.PI * 2, d = Math.sqrt(map.rng()) * spread;
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

  const treeGeo = makePineModel(green, white, trunk, tiers);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.InstancedMesh(treeGeo, mat, trees.length);
  mesh.castShadow = true;
  mesh.matrixAutoUpdate = false;
  trees.forEach(([x, z, s], i) => {
    put(map, mesh, i, x, 0, z, s, s, s);
    map.placed.push([x, z, 2.4 * s]);
  });
  registerTreeMesh(map, mesh, trees.map(([x, z, s]) => ({ x, z, sx: s, sy: s, sz: s, ry: 0 })));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.updateMatrix();
  map.root.add(mesh);

  map.addContactShadows(trees.map(([x, z, s]) => [x, z, s * 2.4, s * 2.4]), 'pines');
}

function makePalmModel(trunkCol, frondColors) {
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
  const tGeo = withColor(merge(trunkParts), trunkCol);

  const blade = new THREE.ConeGeometry(0.55, 2.3, 4);
  const up = new THREE.Vector3(0, 1, 0);
  const frondParts = [];
  const FR = 14;
  for (let k = 0; k < FR; k++) {
    const col = frondColors[k % frondColors.length];
    const a = (k / FR) * Math.PI * 2 + (k % 2) * 0.2;
    const e1 = 0.62 + (k % 3) * 0.08, e2 = -0.32 - (k % 2) * 0.12;
    const d1 = new THREE.Vector3(Math.cos(a) * Math.cos(e1), Math.sin(e1), Math.sin(a) * Math.cos(e1));
    const d2 = new THREE.Vector3(Math.cos(a) * Math.cos(e2), Math.sin(e2), Math.sin(a) * Math.cos(e2));
    const base1 = new THREE.Vector3(crown[0], crown[1], 0);
    const p1 = base1.clone().addScaledVector(d1, 1.15);
    frondParts.push(withColor(partQ(blade, [p1.x, p1.y, p1.z], new THREE.Quaternion().setFromUnitVectors(up, d1), [1, 1, 0.32]), col));
    const base2 = base1.clone().addScaledVector(d1, 2.25);
    const p2 = base2.clone().addScaledVector(d2, 1.2);
    frondParts.push(withColor(partQ(blade, [p2.x, p2.y, p2.z], new THREE.Quaternion().setFromUnitVectors(up, d2), [0.85, 1.05, 0.3]), col));
  }
  return merge([tGeo, ...frondParts]);
}

export function palms(map, { groves, trunk, fronds, minH = 8.5, maxH = 13 }) {
  const spots = [];
  groves.forEach(([cx, cz, n, spread]) => {
    let tries = 0, added = 0;
    while (added < n && tries++ < 60) {
      const a = map.rng() * Math.PI * 2, d = Math.sqrt(map.rng()) * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (!map.isClear(x, z, 1.6, { rim: 6 })) continue;
      if (spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 3.1)) continue;
      spots.push([x, z, minH + map.rng() * (maxH - minH), map.rng() * Math.PI * 2]);
      added++;
    }
  });

  const palmGeo = makePalmModel(trunk, fronds);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.InstancedMesh(palmGeo, mat, spots.length);
  mesh.castShadow = true;
  mesh.matrixAutoUpdate = false;
  spots.forEach(([x, z, h, ry], i) => {
    const s = h / 10;
    put(map, mesh, i, x, 0, z, s, s, s, ry);
    map.placed.push([x, z, 1.8]);
  });
  registerTreeMesh(map, mesh, spots.map(([x, z, h, ry]) => ({ x, z, sx: h / 10, sy: h / 10, sz: h / 10, ry })));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.updateMatrix();
  map.root.add(mesh);

  map.addContactShadows(spots.map(([x, z, h]) => [x, z, h * 0.28, h * 0.28]), 'palms');
}

function makeSaguaro() {
  return merge([
    part(new THREE.CylinderGeometry(0.32, 0.36, 3.2, 7), [0, 1.6, 0]),
    part(new THREE.SphereGeometry(0.32, 7, 5), [0, 3.2, 0], [0, 0, 0], [1, 0.85, 1]),
    part(new THREE.CylinderGeometry(0.2, 0.2, 0.75, 6), [-0.55, 1.9, 0], [0, 0, Math.PI / 2]),
    part(new THREE.CylinderGeometry(0.2, 0.22, 1.2, 6), [-0.92, 2.45, 0]),
    part(new THREE.SphereGeometry(0.2, 6, 5), [-0.92, 3.05, 0], [0, 0, 0], [1, 0.85, 1]),
    part(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 6), [0.52, 1.45, 0], [0, 0, Math.PI / 2]),
    part(new THREE.CylinderGeometry(0.2, 0.22, 0.95, 6), [0.86, 1.9, 0]),
    part(new THREE.SphereGeometry(0.2, 6, 5), [0.86, 2.4, 0], [0, 0, 0], [1, 0.85, 1])
  ]);
}

export function cacti(map, { color, spots = [], solo = 0, scale = 1.6 }) {
  const list = [];
  spots.forEach(([x, z]) => { if (map.isClear(x, z, 1.4, { rim: 5 })) list.push([x, z, (1 + map.rng() * 0.5) * scale]); });
  for (let i = 0; i < solo; i++) {
    const s = map.findSpot(32, 108, 1.5, 30, { rim: 6 });
    if (s) list.push([s[0], s[1], (0.9 + map.rng() * 0.6) * scale]);
  }
  const mesh = new THREE.InstancedMesh(makeSaguaro(), lambert(0xffffff), list.length);
  mesh.castShadow = true;
  mesh.matrixAutoUpdate = false;
  const base = new THREE.Color(color), alt = new THREE.Color(color).offsetHSL(0, 0, -0.06);
  const instances = [];
  list.forEach(([x, z, s], i) => {
    const ry = map.rng() * 6;
    put(map, mesh, i, x, 0, z, s, s, s, ry);
    mesh.setColorAt(i, i % 2 ? alt : base);
    map.placed.push([x, z, 1.2]);
    instances.push({ x, z, sx: s, sy: s, sz: s, ry });
  });
  registerTreeMesh(map, mesh, instances);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  mesh.updateMatrix();
  map.root.add(mesh);

  map.addContactShadows(list.map(([x, z, s]) => [x, z, s * 0.9, s * 0.9]), 'cacti');
}

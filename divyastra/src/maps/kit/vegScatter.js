import * as THREE from 'three';
import { lambert } from './geo.js';

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

export function leafPiles(map, { colors, piles }) {
  const blobs = [];
  piles.forEach(([px, pz, pr]) => {
    for (let i = 0; i < 9; i++) {
      const a = map.rng() * Math.PI * 2, d = Math.sqrt(map.rng()) * pr;
      blobs.push([px + Math.cos(a) * d, pz + Math.sin(a) * d, 0.9 + map.rng() * 1.3, map.rng() * 3]);
    }
  });
  const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lambert(0xffffff), blobs.length);
  mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
  const col = new THREE.Color();
  blobs.forEach(([x, z, r, rot], i) => {
    put(map, mesh, i, x, 0.1, z, r, 0.2, r * 0.8, rot, 0.1, 0.1);
    col.setHex(colors[i % colors.length]);
    mesh.setColorAt(i, col);
  });
  finish(mesh);
  map.root.add(mesh);
}

export function pebbles(map, { clusters, color }) {
  const list = [];
  clusters.forEach(([cx, cz, n, spread]) => {
    for (let k = 0; k < n; k++) {
      const a = map.rng() * Math.PI * 2, d = Math.sqrt(map.rng()) * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (map.isClear(x, z, 0.4, { rim: 4 })) list.push([x, z, 0.16 + map.rng() * 0.2]);
    }
  });
  const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lambert(color), list.length);
  mesh.matrixAutoUpdate = false;
  list.forEach(([x, z, r], i) => put(map, mesh, i, x, r * 0.3, z, r * 1.2, r * 0.6, r, map.rng() * 3));
  finish(mesh);
  map.root.add(mesh);
}

export function ringWalls(map, { color, darkColor }) {
  const L = map.layout.landmarks, R = L.ringRoad[1] + 2.0, pieces = [];
  for (let k = 0; k < 14; k++) {
    const deg = k * (360 / 14) + 9, a = (deg * Math.PI) / 180;
    if ([0, 90, 180, 270].some((g) => Math.abs(((deg - g + 540) % 360) - 180) > 172)) continue;
    for (let j = 0; j < 3; j++) {
      const aa = a + (j - 1) * 0.07, x = Math.cos(aa) * R, z = Math.sin(aa) * R;
      if (map.isClear(x, z, 1.2, { paths: false })) pieces.push([x, z, -aa + Math.PI / 2 + (map.rng() - 0.5) * 0.15, 0.45 + map.rng() * 0.6]);
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 1, 0.9), lambert(0xffffff), pieces.length);
  mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
  const c1 = new THREE.Color(color), c2 = new THREE.Color(darkColor);
  pieces.forEach(([x, z, ry, h], i) => {
    put(map, mesh, i, x, h / 2, z, 1, h, 1, ry);
    mesh.setColorAt(i, i % 2 ? c1 : c2);
  });
  finish(mesh);
  map.root.add(mesh);
}

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Transformed, attribute-normalised clone of a geometry so many parts can be merged. */
export function part(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], order = 'XYZ') {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  _e.set(r[0], r[1], r[2], order);
  _q.setFromEuler(_e);
  _m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
  g.applyMatrix4(_m);
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  }
  return g;
}

/** Same as part() but orientation given as a quaternion (used for leaf blades / palm fronds). */
export function partQ(geo, p, q, s = [1, 1, 1]) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  _m.compose(_p.set(p[0], p[1], p[2]), q, _s.set(s[0], s[1], s[2]));
  g.applyMatrix4(_m);
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  }
  return g;
}

/** Attaches vertex colors to an attribute-normalised geometry for single-draw-call props. */
export function withColor(geo, hexColor) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color(hexColor);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/** Combines part transform and vertex coloring into one step. */
export function partColor(geo, color, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], order = 'XYZ') {
  const g = part(geo, p, r, s, order);
  return withColor(g, color);
}

/** Merge that first normalises every input (non-indexed, position/normal/color only) so mixed Ring/Shape/Plane geometries never return null. */
export function merge(list) {
  const norm = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'color') n.deleteAttribute(k);
    }
    return n;
  });
  const out = BufferGeometryUtils.mergeGeometries(norm, false);
  if (!out) console.warn('[merge] attribute mismatch, returning empty geometry');
  return out || new THREE.BufferGeometry();
}

/** Flat ground decal: Lambert (receives shadows), no depth write, polygon-offset against z-fighting. */
export function decalMat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({
    color, flatShading: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    ...opts
  });
}

export const lambert = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

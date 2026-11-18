import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Transformed, attribute-normalised clone of a geometry (so many parts can be merged). */
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

export const merge = (list) => BufferGeometryUtils.mergeGeometries(list, false);

/** Flat ground decal material: Lambert (receives shadows), no depth write, polygon-offset to avoid z-fight. */
export function decalMat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({
    color, flatShading: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    ...opts
  });
}

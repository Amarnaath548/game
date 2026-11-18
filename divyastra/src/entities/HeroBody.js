import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Static, hero-independent body-part geometries (built once, shared by every actor).
 * Each key is merged per-material so an actor needs only ~10 meshes.
 * Coordinates are in the local space of the group they are attached to:
 *   torso group origin = waist (world y 0.65), head group origin = head centre,
 *   arm group origin = shoulder pivot, leg group origin = hip pivot.
 */

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function part(geo, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], order = 'XYZ') {
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

const merge = (list) => BufferGeometryUtils.mergeGeometries(list, false);

// ---- Torso surface helpers (so sash strips and beads hug the chest) ----
const TORSO_H = 0.52;
const R_TOP = 0.30;
const R_BOT = 0.21;
const DEPTH = 0.72;

function torsoRx(y) {
  return R_BOT + (R_TOP - R_BOT) * THREE.MathUtils.clamp(y / TORSO_H, 0, 1);
}
function surfaceZ(x, y, lift = 0) {
  const rx = torsoRx(y);
  const k = Math.min(Math.abs(x) / rx, 0.98);
  return rx * DEPTH * Math.sqrt(1 - k * k) + lift;
}

// ---- Builders ----
function buildTorsoSkin() {
  const shoulder = new THREE.SphereGeometry(0.14, 8, 6);
  const pec = new THREE.SphereGeometry(0.115, 8, 6);
  return merge([
    part(new THREE.CylinderGeometry(R_TOP, R_BOT, TORSO_H, 10), [0, TORSO_H / 2, 0], [0, 0, 0], [1, 1, DEPTH]),
    part(shoulder, [-0.34, 0.44, 0]),
    part(shoulder, [0.34, 0.44, 0]),
    part(pec, [-0.11, 0.34, 0.135], [0, 0, 0], [1, 0.8, 0.62]),
    part(pec, [0.11, 0.34, 0.135], [0, 0, 0], [1, 0.8, 0.62]),
    part(new THREE.CylinderGeometry(0.08, 0.095, 0.18, 7), [0, 0.58, 0])
  ]);
}

function buildDhoti() {
  const thigh = new THREE.SphereGeometry(0.16, 8, 6);
  return merge([
    part(new THREE.CylinderGeometry(0.235, 0.31, 0.5, 10), [0, -0.18, 0], [0, 0, 0], [1, 1, 0.9]),
    part(thigh, [-0.13, -0.2, 0], [0, 0, 0], [1, 1.3, 1]),
    part(thigh, [0.13, -0.2, 0], [0, 0, 0], [1, 1.3, 1]),
    // central hanging pleats
    part(new THREE.BoxGeometry(0.17, 0.4, 0.06), [0, -0.2, 0.25], [-0.14, 0, 0]),
    part(new THREE.BoxGeometry(0.1, 0.34, 0.05), [0.15, -0.22, 0.225], [-0.12, 0, 0.08])
  ]);
}

function buildBelt() {
  return merge([part(new THREE.TorusGeometry(0.245, 0.05, 6, 14), [0, 0.07, 0], [Math.PI / 2, 0, 0], [1, 0.9, 1])]);
}

// Diagonal uttariya (shoulder -> opposite hip) front + back, shoulder drape, waist knot + tails
function buildSash() {
  const list = [];
  const N = 7;
  const at = (t) => ({
    x: THREE.MathUtils.lerp(0.22, -0.19, t),
    y: THREE.MathUtils.lerp(0.52, 0.04, t)
  });

  for (let i = 0; i < N; i++) {
    const a = at(i / N);
    const b = at((i + 1) / N);
    const m = at((i + 0.5) / N);
    const len = Math.hypot(b.x - a.x, b.y - a.y) * 1.22;
    // direction pointing up-the-strap
    const ux = a.x - b.x;
    const uy = a.y - b.y;
    const roll = Math.atan2(-ux, uy);
    const rx = torsoRx(m.y);
    const yaw = Math.asin(THREE.MathUtils.clamp(m.x / rx, -0.9, 0.9)) * 0.85;
    const z = surfaceZ(m.x, m.y, 0.025);
    const box = new THREE.BoxGeometry(0.17, len, 0.05);

    list.push(part(box, [m.x, m.y, z], [0, yaw, roll], [1, 1, 1], 'YXZ'));
    list.push(part(box, [m.x, m.y, -z], [0, Math.PI - yaw, -roll], [1, 1, 1], 'YXZ'));
  }

  // Shoulder drape
  list.push(part(new THREE.SphereGeometry(0.17, 8, 6), [0.34, 0.5, 0], [0, 0, -0.35], [1.2, 0.7, 1.1]));
  // Knot + trailing tails at the waist
  list.push(part(new THREE.SphereGeometry(0.065, 6, 5), [-0.17, 0.06, 0.25]));
  list.push(part(new THREE.BoxGeometry(0.11, 0.34, 0.03), [-0.19, -0.14, 0.265], [-0.05, 0, 0.1]));
  list.push(part(new THREE.BoxGeometry(0.09, 0.28, 0.03), [-0.12, -0.12, 0.255], [-0.05, 0, -0.12]));
  return merge(list);
}

// Rudraksha bead necklace (U-curve on the chest)
function buildNecklace() {
  const bead = new THREE.IcosahedronGeometry(0.03, 0);
  const list = [];
  const COUNT = 11;
  for (let i = 0; i < COUNT; i++) {
    const t = (i / (COUNT - 1)) * 2 - 1;
    const x = 0.2 * t;
    const y = 0.5 - 0.23 * (1 - t * t);
    list.push(part(bead, [x, y, surfaceZ(x, y, 0.055)]));
  }
  return merge(list);
}

function buildHeadSkin() {
  const ear = new THREE.SphereGeometry(0.045, 6, 5);
  return merge([
    part(new THREE.SphereGeometry(0.24, 12, 10), [0, 0, 0], [0, 0, 0], [0.96, 1.05, 1.0]),
    part(new THREE.ConeGeometry(0.04, 0.1, 4), [0, -0.025, 0.245], [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(0.2, 0.04, 0.05), [0, 0.07, 0.212], [0.1, 0, 0]),
    part(ear, [-0.23, -0.01, -0.01], [0, 0, 0], [0.6, 1, 0.8]),
    part(ear, [0.23, -0.01, -0.01], [0, 0, 0], [0.6, 1, 0.8])
  ]);
}

function buildHairCap() {
  const cap = new THREE.SphereGeometry(0.258, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.47);
  return merge([part(cap, [0, 0, -0.01], [-0.4, 0, 0], [0.97, 1.05, 1.02])]);
}

function buildBeard() {
  const shell = new THREE.SphereGeometry(0.255, 12, 8, 0, Math.PI, Math.PI * 0.6, Math.PI * 0.36);
  return merge([
    part(shell, [0, 0, 0], [0, 0, 0], [0.96, 1.05, 1.02]),
    part(new THREE.ConeGeometry(0.11, 0.26, 6), [0, -0.3, 0.12], [Math.PI, 0, 0], [1, 1, 0.8]),
    part(new THREE.BoxGeometry(0.17, 0.035, 0.05), [0, -0.065, 0.238], [0.15, 0, 0])
  ]);
}

function buildArm() {
  return merge([
    part(new THREE.CylinderGeometry(0.085, 0.072, 0.32, 8), [0, -0.16, 0]),
    part(new THREE.SphereGeometry(0.072, 7, 6), [0, -0.32, 0]),
    part(new THREE.CylinderGeometry(0.07, 0.054, 0.32, 8), [0, -0.48, 0]),
    part(new THREE.DodecahedronGeometry(0.09, 0), [0, -0.69, 0], [0, 0, 0], [0.95, 1.15, 0.95])
  ]);
}

function buildArmBeads() {
  return merge([
    part(new THREE.TorusGeometry(0.084, 0.022, 5, 10), [0, -0.13, 0], [Math.PI / 2, 0, 0]),
    part(new THREE.TorusGeometry(0.062, 0.02, 5, 10), [0, -0.6, 0], [Math.PI / 2, 0, 0])
  ]);
}

function buildLeg() {
  return merge([
    part(new THREE.CylinderGeometry(0.088, 0.062, 0.58, 8), [0, -0.29, 0]),
    part(new THREE.BoxGeometry(0.13, 0.07, 0.27), [0, -0.585, 0.06])
  ]);
}

// Kamandalu (water pot) hanging from the free hand
function buildPot() {
  return merge([
    part(new THREE.SphereGeometry(0.1, 8, 6), [0, -0.88, 0.03], [0, 0, 0], [1, 0.9, 1]),
    part(new THREE.CylinderGeometry(0.045, 0.06, 0.09, 7), [0, -0.79, 0.03]),
    part(new THREE.TorusGeometry(0.05, 0.012, 5, 8), [0, -0.74, 0.03], [Math.PI / 2, 0, 0])
  ]);
}

function buildPouch() {
  return merge([
    part(new THREE.SphereGeometry(0.085, 7, 6), [0.22, -0.1, 0.14], [0, 0, 0], [1, 1.2, 0.9]),
    part(new THREE.ConeGeometry(0.04, 0.07, 5), [0.22, 0.0, 0.14])
  ]);
}

// Soft radial halo glow: opaque plateau that fades out at the rim (vertex alpha, no textures)
function buildGlow(radius = 0.6) {
  const geo = new THREE.RingGeometry(0.0001, radius, 32, 8);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i)) / radius;
    const a = r < 0.7 ? 0.42 : 0.42 * Math.pow(Math.max(0, 1 - (r - 0.7) / 0.3), 1.5);
    colors[i * 4] = 1;
    colors[i * 4 + 1] = 1;
    colors[i * 4 + 2] = 1;
    colors[i * 4 + 3] = a;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  return geo;
}

// Ring of beads reused by archetype hair-knots
export function buildBeadRing(radius = 0.14, count = 9, beadRadius = 0.03) {
  const bead = new THREE.IcosahedronGeometry(beadRadius, 0);
  const list = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    list.push(part(bead, [Math.cos(a) * radius, 0, Math.sin(a) * radius]));
  }
  return merge(list);
}

let cache = null;
export function getBodyGeometries() {
  if (cache) return cache;
  cache = {
    torsoSkin: buildTorsoSkin(),
    dhoti: buildDhoti(),
    belt: buildBelt(),
    sash: buildSash(),
    necklace: buildNecklace(),
    headSkin: buildHeadSkin(),
    hair: buildHairCap(),
    beard: buildBeard(),
    arm: buildArm(),
    armBeads: buildArmBeads(),
    leg: buildLeg(),
    pot: buildPot(),
    pouch: buildPouch(),
    glow: buildGlow()
  };
  return cache;
}

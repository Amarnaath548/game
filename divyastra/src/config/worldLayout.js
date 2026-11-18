import { ARENA } from './constants.js';

/**
 * Single source of truth for gameplay anchor points on the map.
 * SpawnManager / ArenaInteractables read from here, and the world decorators use isClear()
 * so trees, rocks and props never sit on top of loot, pads, pillars, paths or landmarks.
 */
export const MYTHIC_CHEST = [0, -12];
export const CHEST_COORDS = [
  [-20, -20], [20, -20], [-20, 20], [20, 20],
  [-45, -25], [45, -25], [-45, 25], [45, 25],
  [0, 50], [0, -50], [-50, 0], [50, 0],
  [-75, -40], [75, -40], [-75, 40], [75, 40],
  [40, 70], [-40, -70], [70, 40], [-70, -40],
  [-90, 0], [90, 0], [0, -90], [0, 90]
];
export const CRYSTAL_COORDS = [
  [-35, 0], [35, 0], [0, -35], [0, 35],
  [-60, -60], [60, 60], [-60, 60], [60, -60]
];
export const BUSH_COORDS = [[-20, -12], [20, 12], [-15, 28], [15, -28], [-42, 15], [42, -15]];
export const PAD_COORDS = [[35, 0], [-35, 0], [0, 35], [0, -35]];
export const SURYA_COORDS = [[25, 25], [-25, 25], [25, -25], [-25, -25]];
export const BRAZIER_COORDS = [[-25, 50], [55, -15], [-45, -45], [25, -55]];

// Landmarks
export const PLAZA_R = 15.5;
export const RING_ROAD = [18.6, 24.0];
export const TORANA_R = 62;
export const PATH_HALF_W = 3.3;
export const PATH_END_R = 96;
export const STEPWELL = { x: -38, z: 34, r: 12 };
export const AGNI = { x: 38, z: -38, r: 13, rot: 0.62 };

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

const KEEP_CLEAR = [
  ...CHEST_COORDS.map(([x, z]) => [x, z, 2.2]),
  [MYTHIC_CHEST[0], MYTHIC_CHEST[1], 3.4],
  ...CRYSTAL_COORDS.map(([x, z]) => [x, z, 2.2]),
  ...BUSH_COORDS.map(([x, z]) => [x, z, 3.4]),
  ...PAD_COORDS.map(([x, z]) => [x, z, 2.4]),
  ...SURYA_COORDS.map(([x, z]) => [x, z, 2.4]),
  ...BRAZIER_COORDS.map(([x, z]) => [x, z, 2.4]),
  // Torana pillars and plaza pillars (obstacles)
  [0, -24, 3.2], [0, 24, 3.2], [-24, 0, 3.2], [24, 0, 3.2],
  [0, -TORANA_R, 3.6], [0, TORANA_R, 3.6], [-TORANA_R, 0, 3.6], [TORANA_R, 0, 3.6],
  [STEPWELL.x, STEPWELL.z, STEPWELL.r],
  [AGNI.x, AGNI.z, AGNI.r]
];

/**
 * True when a circle (x, z, r) is free of gameplay anchors, the plaza, ring road,
 * the four cross paths, and the arena rim.
 */
export function isClear(x, z, r = 1, { paths = true, rim = 4 } = {}) {
  const d = Math.hypot(x, z);
  if (d > ARENA.RADIUS - rim - r) return false;
  if (paths) {
    if (d < RING_ROAD[1] + r + 0.5) return false;
    if (Math.abs(x) < PATH_HALF_W + r + 0.8 && Math.abs(z) < PATH_END_R + 6) return false;
    if (Math.abs(z) < PATH_HALF_W + r + 0.8 && Math.abs(x) < PATH_END_R + 6) return false;
  }
  for (const [kx, kz, kr] of KEEP_CLEAR) {
    if (Math.hypot(x - kx, z - kz) < kr + r) return false;
  }
  return true;
}

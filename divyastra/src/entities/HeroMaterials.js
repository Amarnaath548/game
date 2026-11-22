import * as THREE from 'three';

// Global shared materials (flatShading: true, zero textures) for mobile WebGL
// Sage-style palette (matches the low-poly ascetic reference art)
export const SKIN_COLOR = 0xd69c68;
export const HAIR_COLOR = 0x3a2515;
export const BEAD_COLOR = 0x7a4325;
export const CLAY_COLOR = 0x8c5a33;
export const CLOTH_SAND = 0xe3cfa5;

export const MAT_SKIN = new THREE.MeshLambertMaterial({ color: SKIN_COLOR, flatShading: true });
export const MAT_WOOD = new THREE.MeshLambertMaterial({ color: 0x5c3a21, flatShading: true });
export const MAT_GOLD = new THREE.MeshLambertMaterial({ color: 0xf59e0b, flatShading: true });
export const MAT_ORANGE_FIRE = new THREE.MeshLambertMaterial({ color: 0xf97316, flatShading: true });
export const MAT_CRIMSON = new THREE.MeshLambertMaterial({ color: 0xd92638, flatShading: true });
export const MAT_SEAFOAM = new THREE.MeshLambertMaterial({ color: 0x99f6e4, flatShading: true });
export const MAT_TURBAN_TAIL = new THREE.MeshLambertMaterial({ color: 0x38bdf8, flatShading: true });
export const MAT_STONE_GREY = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
export const MAT_BEARD = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
export const MAT_ROCK = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
export const MAT_SASH = new THREE.MeshLambertMaterial({ color: 0xfbbf24, flatShading: true });

export const MAT_SHIELD = new THREE.MeshBasicMaterial({
  color: 0x3b82f6,
  transparent: true,
  opacity: 0.35,
  wireframe: true
});

const matCache = new Map();
const glowMatCache = new Map();

/**
 * Returns or creates a shared MeshLambertMaterial for a given color.
 */
export function getHeroMaterial(hexColor) {
  const key = Number(hexColor);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({
      color: key,
      flatShading: true,
      emissive: 0x000000
    }));
  }
  return matCache.get(key);
}

/**
 * Returns or creates a shared halo glow BasicMaterial for a given accent color.
 */
export function getGlowMaterial(hexColor) {
  const key = Number(hexColor);
  if (!glowMatCache.has(key)) {
    const m = new THREE.MeshBasicMaterial({
      color: key,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    m.userData.keepTransparent = true;
    glowMatCache.set(key, m);
  }
  return glowMatCache.get(key);
}

// Reusable primitive geometries cache
export const GEO_CACHE = {
  head: new THREE.SphereGeometry(0.22, 12, 10),
  nose: new THREE.ConeGeometry(0.035, 0.08, 4),
  upperTorso: new THREE.CylinderGeometry(0.24, 0.17, 0.48, 10),
  shoulderJoint: new THREE.SphereGeometry(0.13, 8, 6),
  dhoti: new THREE.CylinderGeometry(0.18, 0.32, 0.46, 10, 1, true),
  waistSash: new THREE.TorusGeometry(0.21, 0.045, 6, 12),
  limbSegment: new THREE.CylinderGeometry(0.065, 0.055, 0.28, 8),
  limbJoint: new THREE.SphereGeometry(0.065, 6, 5),
  mittenFist: new THREE.DodecahedronGeometry(0.075, 0),
  wedgeFoot: new THREE.BoxGeometry(0.11, 0.07, 0.22),
  staffShaft: new THREE.CylinderGeometry(0.03, 0.035, 1.55, 8),
  staffOrb: new THREE.IcosahedronGeometry(0.11, 1),
  staffAccentRing: new THREE.CylinderGeometry(0.052, 0.052, 0.04, 8),
  shield: new THREE.SphereGeometry(1.6, 12, 12)
};

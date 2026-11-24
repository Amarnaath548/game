import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {
  MAT_CRIMSON, MAT_SEAFOAM, MAT_ROCK, MAT_STONE_GREY, MAT_ORANGE_FIRE
} from './HeroMaterials.js';
import { getBodyGeometries, part, buildBeadRing } from './HeroBody.js';

const merge = (list) => BufferGeometryUtils.mergeGeometries(list, false);
const staticCache = new Map();
const headCache = new Map();
const tipCache = new Map();

/**
 * Returns static geometries and shared inverted-hull outline geometry for a hero archetype.
 * Geometries are cached and shared across all actors of the same archetype (zero cloning).
 */
export function getBotStaticGeos(archetype, hero) {
  const key = `${archetype}_${hero.bodyColor}_${hero.accentColor}`;
  if (staticCache.has(key)) return staticCache.get(key);

  const G = getBodyGeometries();
  const skin = merge([
    part(G.torsoSkin, [0, 0, 0]),
    part(G.leg, [-0.14, -0.03, 0]),
    part(G.leg, [0.14, -0.03, 0])
  ]);
  const cloth = merge([part(G.dhoti, [0, 0, 0])]);
  const body = merge([part(G.sash, [0, 0, 0])]);
  const accentParts = [part(G.belt, [0, 0, 0])];
  const bead = merge([part(G.necklace, [0, 0, 0])]);
  const clay = merge([part(G.pouch, [0, 0, 0])]);

  let extraGeo = null, extraMat = null;
  if (archetype === 'AGNI') {
    const cGeo = new THREE.ConeGeometry(0.08, 0.22, 5);
    extraGeo = merge([part(cGeo, [-0.41, 0.54, 0], [0, 0, 0.45]), part(cGeo, [0.41, 0.54, 0], [0, 0, -0.45])]);
    extraMat = MAT_CRIMSON;
  } else if (archetype === 'JALA') {
    extraGeo = part(new THREE.TorusGeometry(0.3, 0.035, 6, 12), [0, 0.5, 0], [Math.PI / 2, 0, 0], [1, 0.75, 1]);
    extraMat = MAT_SEAFOAM;
    const wGeo = new THREE.SphereGeometry(0.18, 8, 6);
    accentParts.push(part(wGeo, [-0.4, 0.5, 0], [0, 0, -0.2], [1.2, 0.55, 0.9]));
    accentParts.push(part(wGeo, [0.4, 0.5, 0], [0, 0, 0.2], [1.2, 0.55, 0.9]));
  } else if (archetype === 'PRITHVI') {
    const rGeo = new THREE.DodecahedronGeometry(0.18, 0);
    extraGeo = merge([part(rGeo, [-0.45, 0.5, 0], [0.4, 0.2, -0.3]), part(rGeo, [0.45, 0.5, 0], [-0.3, 0.4, 0.2])]);
    extraMat = MAT_ROCK;
  }

  const accent = merge(accentParts);
  const outlineParts = [skin, cloth, body, accent, bead, clay];
  if (extraGeo) outlineParts.push(extraGeo);
  const outlineGeo = merge(outlineParts);

  const res = { skin, cloth, body, accent, bead, clay, extraGeo, extraMat, outlineGeo };
  staticCache.set(key, res);
  return res;
}

export function getBotHeadGeos(archetype) {
  if (headCache.has(archetype)) return headCache.get(archetype);
  const G = getBodyGeometries();
  const face = G.headSkin;
  const hairParts = [part(G.hair, [0, 0, 0]), part(G.beard, [0, 0, 0])];
  let accentGeo = null, beadGeo = null, extraGeo = null, extraMat = null, extra2Geo = null, extra2Mat = null;

  if (archetype === 'TAPASVI') {
    hairParts.push(part(new THREE.CylinderGeometry(0.1, 0.15, 0.14, 8), [0, 0.26, -0.03]));
    hairParts.push(part(new THREE.SphereGeometry(0.15, 9, 8), [0, 0.39, -0.04], [0, 0, 0], [1, 0.9, 1]));
    beadGeo = part(buildBeadRing(0.14, 9, 0.03), [0, 0.32, -0.04]);
    accentGeo = part(new THREE.TorusGeometry(0.115, 0.018, 5, 12), [0, 0.26, -0.03], [Math.PI / 2, 0, 0]);
  } else if (archetype === 'AGNI') {
    extraGeo = part(new THREE.ConeGeometry(0.08, 0.32, 5), [0, 0.35, -0.08], [-0.52, 0, 0]);
    extraMat = MAT_CRIMSON;
    const sGeo = new THREE.ConeGeometry(0.065, 0.26, 5);
    extra2Geo = merge([part(sGeo, [-0.09, 0.32, -0.09], [-0.52, 0, 0.26]), part(sGeo, [0.09, 0.32, -0.09], [-0.52, 0, -0.26])]);
    extra2Mat = MAT_ORANGE_FIRE;
  } else if (archetype === 'JALA') {
    accentGeo = merge([
      part(new THREE.SphereGeometry(0.27, 10, 8), [0, 0.11, -0.02]),
      part(new THREE.TorusGeometry(0.265, 0.045, 6, 12), [0, 0.07, -0.02], [0.25, 0, 0.2]),
      part(new THREE.BoxGeometry(0.09, 0.42, 0.02), [0.08, -0.08, -0.29], [-0.7, 0, -0.2])
    ]);
    extraGeo = merge([
      part(new THREE.TorusGeometry(0.25, 0.042, 6, 12), [0, 0.14, -0.03], [-0.2, 0, -0.25]),
      part(new THREE.BoxGeometry(0.09, 0.42, 0.02), [-0.08, -0.08, -0.29], [-0.7, 0, 0.2])
    ]);
    extraMat = MAT_SEAFOAM;
  } else if (archetype === 'PRITHVI') {
    extraGeo = part(new THREE.CylinderGeometry(0.265, 0.265, 0.08, 8), [0, 0.15, 0]);
    extraMat = MAT_STONE_GREY;
    hairParts.push(part(new THREE.ConeGeometry(0.1, 0.3, 5), [0, -0.36, 0.17], [Math.PI - 0.3, 0, 0]));
  }

  const hair = merge(hairParts);
  const headOutlineParts = [face, hair];
  if (accentGeo) headOutlineParts.push(accentGeo);
  if (extraGeo) headOutlineParts.push(extraGeo);
  if (extra2Geo) headOutlineParts.push(extra2Geo);
  const headOutlineGeo = merge(headOutlineParts);

  const res = { face, hair, accentGeo, beadGeo, extraGeo, extraMat, extra2Geo, extra2Mat, headOutlineGeo };
  headCache.set(archetype, res);
  return res;
}

export function getStaffTipGeo(archetype) {
  if (tipCache.has(archetype)) return tipCache.get(archetype);
  let g;
  if (archetype === 'TAPASVI') g = new THREE.TorusGeometry(0.12, 0.025, 6, 12);
  else if (archetype === 'AGNI') g = new THREE.OctahedronGeometry(0.12, 0);
  else if (archetype === 'JALA') g = new THREE.TorusGeometry(0.15, 0.03, 6, 12, Math.PI);
  else g = new THREE.IcosahedronGeometry(0.12, 0);
  tipCache.set(archetype, g);
  return g;
}

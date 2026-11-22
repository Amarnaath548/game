import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {
  MAT_SKIN, MAT_WOOD, MAT_GOLD, MAT_CRIMSON, MAT_ORANGE_FIRE,
  MAT_SEAFOAM, MAT_STONE_GREY, MAT_ROCK, MAT_SHIELD,
  GEO_CACHE, HAIR_COLOR, BEAD_COLOR, CLAY_COLOR, CLOTH_SAND,
  getHeroMaterial, getGlowMaterial
} from './HeroMaterials.js';
import { getBodyGeometries, part, buildBeadRing } from './HeroBody.js';
import { buildTierVisuals } from './HeroTierVisuals.js';

const merge = (list) => BufferGeometryUtils.mergeGeometries(list, false);
const staticCache = new Map();
const headCache = new Map();
const tipCache = new Map();

function getBotStaticGeos(archetype, hero) {
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

  const res = { skin, cloth, body, accent: merge(accentParts), bead, clay, extraGeo, extraMat };
  staticCache.set(key, res);
  return res;
}

function getBotHeadGeos(archetype) {
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

  const res = { face, hair: merge(hairParts), accentGeo, beadGeo, extraGeo, extraMat, extra2Geo, extra2Mat };
  headCache.set(archetype, res);
  return res;
}

function getStaffTipGeo(archetype) {
  if (tipCache.has(archetype)) return tipCache.get(archetype);
  let g;
  if (archetype === 'TAPASVI') g = new THREE.TorusGeometry(0.12, 0.025, 6, 12);
  else if (archetype === 'AGNI') g = new THREE.OctahedronGeometry(0.12, 0);
  else if (archetype === 'JALA') g = new THREE.TorusGeometry(0.15, 0.03, 6, 12, Math.PI);
  else g = new THREE.IcosahedronGeometry(0.12, 0);
  tipCache.set(archetype, g);
  return g;
}

export function buildBotVisual(actor, hero) {
  const G = getBodyGeometries();
  const archetype = hero.archetype || 'TAPASVI';
  const elder = archetype === 'PRITHVI';

  const bodyMat = getHeroMaterial(hero.bodyColor);
  const accentMat = getHeroMaterial(hero.accentColor);
  const skinMat = MAT_SKIN;
  const hairMat = elder ? getHeroMaterial(0xcbd5e1) : getHeroMaterial(HAIR_COLOR);
  const beadMat = getHeroMaterial(BEAD_COLOR);
  const clayMat = getHeroMaterial(CLAY_COLOR);
  const clothMat = getHeroMaterial(new THREE.Color(CLOTH_SAND).lerp(new THREE.Color(hero.bodyColor), 0.2).getHex());
  const woodMat = MAT_WOOD;
  const glowMat = getGlowMaterial(hero.accentColor);
  const staffOrbMat = getHeroMaterial(0x00f2ff);
  const staffAccentMat = MAT_GOLD;

  actor.bodyMat = bodyMat; actor.accentMat = accentMat; actor.robeMat = bodyMat;
  actor.hatMat = accentMat; actor.skinMat = skinMat; actor.hairMat = hairMat;
  actor.beadMat = beadMat; actor.clothMat = clothMat; actor.staffOrbMat = staffOrbMat;

  // 1. Static parts: merged into one mesh per material
  const staticGroup = new THREE.Group();
  staticGroup.position.set(0, 0.65, 0);
  const sG = getBotStaticGeos(archetype, hero);
  staticGroup.add(new THREE.Mesh(sG.skin, skinMat));
  staticGroup.add(new THREE.Mesh(sG.cloth, clothMat));
  staticGroup.add(new THREE.Mesh(sG.body, bodyMat));
  staticGroup.add(new THREE.Mesh(sG.accent, accentMat));
  staticGroup.add(new THREE.Mesh(sG.bead, beadMat));
  staticGroup.add(new THREE.Mesh(sG.clay, clayMat));
  if (sG.extraGeo) staticGroup.add(new THREE.Mesh(sG.extraGeo, sG.extraMat));
  actor.visualMesh.add(staticGroup);

  // 2. Head (moving part)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.45, 0);
  const hG = getBotHeadGeos(archetype);
  headGroup.add(new THREE.Mesh(hG.face, skinMat));
  headGroup.add(new THREE.Mesh(hG.hair, hairMat));
  if (hG.accentGeo) headGroup.add(new THREE.Mesh(hG.accentGeo, accentMat));
  if (hG.beadGeo) headGroup.add(new THREE.Mesh(hG.beadGeo, beadMat));
  if (hG.extraGeo) headGroup.add(new THREE.Mesh(hG.extraGeo, hG.extraMat));
  if (hG.extra2Geo) headGroup.add(new THREE.Mesh(hG.extra2Geo, hG.extra2Mat));

  const glow = new THREE.Mesh(G.glow, glowMat);
  glow.position.set(0, 0.03, -0.22);
  glow.rotation.x = -0.4;
  glow.renderOrder = -1;
  headGroup.add(glow);
  actor.haloGlow = glow;
  actor.headGroup = headGroup;
  actor.visualMesh.add(headGroup);

  // 3. Arms (moving parts)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.39, 1.07, 0);
  leftArm.add(new THREE.Mesh(G.arm, skinMat));
  leftArm.add(new THREE.Mesh(G.armBeads, beadMat));
  leftArm.add(new THREE.Mesh(G.pot, clayMat));
  actor.leftArm = leftArm;
  actor.visualMesh.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.39, 1.07, 0);
  rightArm.add(new THREE.Mesh(G.arm, skinMat));
  rightArm.add(new THREE.Mesh(G.armBeads, beadMat));
  actor.rightArm = rightArm;
  actor.visualMesh.add(rightArm);

  // 4. Staff (moving part, attached to rightArm)
  const staffGroup = new THREE.Group();
  staffGroup.position.set(0.08, -0.3, 0.04);
  staffGroup.rotation.z = -0.209;
  const staffShaft = new THREE.Mesh(GEO_CACHE.staffShaft, woodMat);
  staffShaft.position.set(0, 0.05, 0);
  staffGroup.add(staffShaft);
  actor.staffShaft = staffShaft;

  const staffOrb = new THREE.Mesh(GEO_CACHE.staffOrb, staffOrbMat);
  staffOrb.position.set(0, 0.88, 0);
  staffGroup.add(staffOrb);
  actor.staffOrb = staffOrb;

  const staffAccentMesh = new THREE.Mesh(GEO_CACHE.staffAccentRing, staffAccentMat);
  staffAccentMesh.position.set(0, 0.76, 0);
  staffGroup.add(staffAccentMesh);
  actor.staffAccentMesh = staffAccentMesh;

  const tipGeo = getStaffTipGeo(archetype);
  if (archetype === 'TAPASVI') {
    const mount = new THREE.Mesh(tipGeo, MAT_GOLD);
    mount.position.set(0, 0.8, 0); mount.rotation.x = Math.PI / 2;
    staffGroup.add(mount);
  } else if (archetype === 'AGNI') {
    const tip = new THREE.Mesh(tipGeo, MAT_ORANGE_FIRE);
    tip.position.set(0, 0.88, 0); staffGroup.add(tip);
    actor.spinningStaffTip = tip;
  } else if (archetype === 'JALA') {
    const fork = new THREE.Mesh(tipGeo, MAT_SEAFOAM);
    fork.position.set(0, 0.85, 0); fork.rotation.set(0, 0, Math.PI);
    staffGroup.add(fork);
  } else if (archetype === 'PRITHVI') {
    const boulder = new THREE.Mesh(tipGeo, MAT_ROCK);
    boulder.position.set(0, 0.88, 0); staffGroup.add(boulder);
  }

  rightArm.add(staffGroup);
  actor.staffGroup = staffGroup;

  buildTierVisuals(actor, headGroup, staticGroup, staffGroup);

  actor.shieldMesh = new THREE.Mesh(GEO_CACHE.shield, MAT_SHIELD);
  actor.shieldMesh.position.y = 1.0;
  actor.shieldMesh.visible = false;
  actor.visualMesh.add(actor.shieldMesh);

  actor.heroMats = [bodyMat, accentMat, skinMat, hairMat, beadMat, clayMat, clothMat, woodMat, glowMat, staffOrbMat, staffAccentMat];
  actor.visualMats = actor.heroMats;
}

import * as THREE from 'three';
import {
  MAT_SKIN, MAT_WOOD, MAT_GOLD, MAT_SHIELD,
  GEO_CACHE, HAIR_COLOR, BEAD_COLOR, CLAY_COLOR, CLOTH_SAND,
  getHeroMaterial, getGlowMaterial, getEmissiveTipMaterial, MAT_OUTLINE_ENEMY
} from './HeroMaterials.js';
import { getBodyGeometries } from './HeroBody.js';
import { buildTierVisuals } from './HeroTierVisuals.js';
import { getBotStaticGeos, getBotHeadGeos, getStaffTipGeo } from './HeroOutlines.js';
import { PALETTE } from '../config/palette.js';

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
  const clothMat = getHeroMaterial(new THREE.Color(CLOTH_SAND).lerp(new THREE.Color(hero.bodyColor), 0.6).getHex());
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

  // Inverted-hull outline (back-face copy scaled 1.04, flat ink colour, no lighting)
  if (sG.outlineGeo) {
    const outlineMesh = new THREE.Mesh(sG.outlineGeo, MAT_OUTLINE_ENEMY);
    outlineMesh.scale.set(1.04, 1.04, 1.04);
    outlineMesh.renderOrder = -1;
    staticGroup.add(outlineMesh);
    actor.outlineMesh = outlineMesh;
  }
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

  if (hG.headOutlineGeo) {
    const headOutline = new THREE.Mesh(hG.headOutlineGeo, MAT_OUTLINE_ENEMY);
    headOutline.scale.set(1.04, 1.04, 1.04);
    headOutline.renderOrder = -1;
    headGroup.add(headOutline);
    actor.headOutlineMesh = headOutline;
  }

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
  staffOrb.scale.setScalar(1.25);
  staffGroup.add(staffOrb);
  actor.staffOrb = staffOrb;

  const staffAccentMesh = new THREE.Mesh(GEO_CACHE.staffAccentRing, staffAccentMat);
  staffAccentMesh.position.set(0, 0.76, 0);
  staffGroup.add(staffAccentMesh);
  actor.staffAccentMesh = staffAccentMesh;

  let tipColor = PALETTE.gold;
  if (archetype === 'AGNI') tipColor = PALETTE.sindoor;
  else if (archetype === 'JALA') tipColor = PALETTE.elements.JALA;
  else if (archetype === 'PRITHVI') tipColor = PALETTE.elements.PRITHVI;
  const tipMat = getEmissiveTipMaterial(tipColor);
  const tipGeo = getStaffTipGeo(archetype);

  if (archetype === 'TAPASVI') {
    const mount = new THREE.Mesh(tipGeo, tipMat);
    mount.scale.setScalar(1.25);
    mount.position.set(0, 0.8, 0); mount.rotation.x = Math.PI / 2;
    staffGroup.add(mount);
  } else if (archetype === 'AGNI') {
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.scale.setScalar(1.25);
    tip.position.set(0, 0.88, 0); staffGroup.add(tip);
    actor.spinningStaffTip = tip;
  } else if (archetype === 'JALA') {
    const fork = new THREE.Mesh(tipGeo, tipMat);
    fork.scale.setScalar(1.25);
    fork.position.set(0, 0.85, 0); fork.rotation.set(0, 0, Math.PI);
    staffGroup.add(fork);
  } else if (archetype === 'PRITHVI') {
    const boulder = new THREE.Mesh(tipGeo, tipMat);
    boulder.scale.setScalar(1.25);
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

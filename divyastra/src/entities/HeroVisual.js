import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {
  MAT_SKIN, MAT_WOOD, MAT_SASH, MAT_SHIELD,
  GEO_CACHE, getHeroMaterial
} from './HeroMaterials.js';
import { attachArchetypeVisuals } from './HeroArchetypes.js';
import { buildTierVisuals } from './HeroTierVisuals.js';

export function buildHeroVisual(actor, hero) {
  const bodyMat = getHeroMaterial(hero.bodyColor);
  const accentMat = getHeroMaterial(hero.accentColor);

  actor.bodyMat = bodyMat;
  actor.accentMat = accentMat;
  actor.robeMat = bodyMat;
  actor.hatMat = accentMat;

  // 1. Torso & Dhoti (Merged static body parts)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.65, 0);

  const upperTorsoGeo = GEO_CACHE.upperTorso.clone();
  upperTorsoGeo.translate(0, 0.24, 0);

  const shoulderLGeo = GEO_CACHE.shoulderJoint.clone();
  shoulderLGeo.translate(-0.34, 0.44, 0);

  const shoulderRGeo = GEO_CACHE.shoulderJoint.clone();
  shoulderRGeo.translate(0.34, 0.44, 0);

  const dhotiGeo = GEO_CACHE.dhoti.clone();
  dhotiGeo.translate(0, -0.16, 0);

  const mergedBodyGeo = BufferGeometryUtils.mergeGeometries([
    upperTorsoGeo, shoulderLGeo, shoulderRGeo, dhotiGeo
  ], false);

  const bodyMesh = new THREE.Mesh(mergedBodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  torsoGroup.add(bodyMesh);

  // Waist sash (flattened TorusGeometry on Y)
  const sashMesh = new THREE.Mesh(GEO_CACHE.waistSash, MAT_SASH);
  sashMesh.position.set(0, 0.05, 0);
  sashMesh.scale.set(1.0, 0.5, 1.1);
  sashMesh.rotation.x = Math.PI / 2;
  torsoGroup.add(sashMesh);

  actor.visualMesh.add(torsoGroup);

  // 2. Head & Clean Faceted Face (No eyes, no symbols - cultural respect)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.45, 0);

  const headGeo = GEO_CACHE.head.clone();
  const noseGeo = GEO_CACHE.nose.clone();
  noseGeo.rotateX(Math.PI / 2);
  noseGeo.translate(0, -0.02, 0.22);

  const mergedHeadGeo = BufferGeometryUtils.mergeGeometries([headGeo, noseGeo], false);
  const headMesh = new THREE.Mesh(mergedHeadGeo, MAT_SKIN);
  headMesh.castShadow = true;
  headGroup.add(headMesh);
  actor.visualMesh.add(headGroup);

  // 3. Limbs (Pivoted Groups for Walk / Punch Animations)
  const leftArmGroup = buildLimbGroup(-0.38, 1.05, 0, false, MAT_SKIN);
  actor.visualMesh.add(leftArmGroup);
  actor.leftArm = leftArmGroup;

  const rightArmGroup = buildLimbGroup(0.38, 1.05, 0, false, MAT_SKIN);
  actor.visualMesh.add(rightArmGroup);
  actor.rightArm = rightArmGroup;

  const leftLegGroup = buildLimbGroup(-0.16, 0.42, 0, true, MAT_SKIN);
  actor.visualMesh.add(leftLegGroup);
  actor.leftLeg = leftLegGroup;

  const rightLegGroup = buildLimbGroup(0.16, 0.42, 0, true, MAT_SKIN);
  actor.visualMesh.add(rightLegGroup);
  actor.rightLeg = rightLegGroup;

  // 4. Staff (Danda) & Spell Orb (Tilted 12° outward from right hand)
  const staffGroup = new THREE.Group();
  staffGroup.position.set(0.12, -0.28, 0.16);
  staffGroup.rotation.z = -0.209; // 12° outward

  const staffShaft = new THREE.Mesh(GEO_CACHE.staffShaft, MAT_WOOD);
  staffShaft.position.set(0, 0.05, 0);
  staffShaft.castShadow = true;
  staffGroup.add(staffShaft);
  actor.staffShaft = staffShaft;

  actor.staffOrbMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
  actor.staffOrb = new THREE.Mesh(GEO_CACHE.staffOrb, actor.staffOrbMat);
  actor.staffOrb.position.set(0, 0.88, 0);
  staffGroup.add(actor.staffOrb);

  rightArmGroup.add(staffGroup);
  actor.staffGroup = staffGroup;

  // 5. Archetype-specific Crown + Shoulders + Staff Tip
  const archetype = hero.archetype || getArchetypeFromLegacy(hero.hatType);
  attachArchetypeVisuals(actor, archetype, accentMat, headGroup, torsoGroup, staffGroup);

  // 6. Pre-attach Dynamic Power Tier Visuals (T2 Shastra & T3 Astra)
  buildTierVisuals(actor, headGroup, torsoGroup, staffGroup);

  // 7. Shield Mesh
  actor.shieldMesh = new THREE.Mesh(GEO_CACHE.shield, MAT_SHIELD);
  actor.shieldMesh.position.y = 1.0;
  actor.shieldMesh.visible = false;
  actor.visualMesh.add(actor.shieldMesh);
}

function buildLimbGroup(px, py, pz, isLeg, mat) {
  const group = new THREE.Group();
  group.position.set(px, py, pz);

  const upperGeo = GEO_CACHE.limbSegment.clone();
  upperGeo.translate(0, -0.14, 0);

  const jointGeo = GEO_CACHE.limbJoint.clone();
  jointGeo.translate(0, -0.28, 0);

  const lowerGeo = GEO_CACHE.limbSegment.clone();
  lowerGeo.translate(0, -0.42, 0);

  let endGeo;
  if (isLeg) {
    endGeo = GEO_CACHE.wedgeFoot.clone();
    endGeo.translate(0, -0.58, 0.05);
  } else {
    endGeo = GEO_CACHE.mittenFist.clone();
    endGeo.translate(0, -0.56, 0);
  }

  const merged = BufferGeometryUtils.mergeGeometries([
    upperGeo, jointGeo, lowerGeo, endGeo
  ], false);

  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

function getArchetypeFromLegacy(hatType) {
  const h = (hatType || '').toUpperCase();
  if (h.includes('FLAME') || h.includes('WIZARD')) return 'AGNI';
  if (h.includes('TURBAN') || h.includes('HOOD')) return 'JALA';
  if (h.includes('CIRCLET') || h.includes('HELMET') || h.includes('HORN')) return 'PRITHVI';
  return 'TAPASVI';
}

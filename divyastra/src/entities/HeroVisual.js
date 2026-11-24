import * as THREE from 'three';
import { assetLoader } from '../core/AssetLoader.js';
import {
  MAT_WOOD, MAT_SHIELD, GEO_CACHE,
  SKIN_COLOR, HAIR_COLOR, BEAD_COLOR, CLAY_COLOR, CLOTH_SAND, MAT_OUTLINE_PLAYER
} from './HeroMaterials.js';
import { getBodyGeometries } from './HeroBody.js';
import { attachArchetypeVisuals } from './HeroArchetypes.js';
import { buildTierVisuals } from './HeroTierVisuals.js';
import { buildBotVisual } from './BotVisual.js';
import { getBotStaticGeos, getBotHeadGeos } from './HeroOutlines.js';

const mk = (hex) => new THREE.MeshLambertMaterial({ color: hex, flatShading: true, emissive: 0x000000 });

function addMesh(parent, geo, mat, shadow = true) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = shadow;
  parent.add(mesh);
  return mesh;
}

/**
 * Builds the sage-style hero model.
 * Materials are created per actor (so hit-flash / fade / bush transparency never leak
 * between actors that share a hero). actor.heroMats lists every material that should
 * flash and fade together; see Actor.setHeroEmissive / setHeroOpacity.
 */
export function buildHeroVisual(actor, hero) {
  const customModel = assetLoader.getHeroModel(hero.id);
  if (customModel) {
    customModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    actor.visualMesh.add(customModel);
    actor.customModel = customModel;
    return;
  }
  if (actor.isBot) {
    buildBotVisual(actor, hero);
    return;
  }
  const G = getBodyGeometries();
  const archetype = hero.archetype || getArchetypeFromLegacy(hero.hatType);
  const elder = archetype === 'PRITHVI';

  const bodyMat = mk(hero.bodyColor);      // sash / drape (staff robe colour is applied here)
  const accentMat = mk(hero.accentColor);  // belt + ornaments
  const skinMat = mk(SKIN_COLOR);
  const hairMat = mk(elder ? 0xcbd5e1 : HAIR_COLOR);
  const beadMat = mk(BEAD_COLOR);
  const clayMat = mk(CLAY_COLOR);
  const clothMat = mk(new THREE.Color(CLOTH_SAND).lerp(new THREE.Color(hero.bodyColor), 0.6).getHex());
  const woodMat = MAT_WOOD.clone();
  const glowMat = new THREE.MeshBasicMaterial({
    color: hero.accentColor, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide
  });
  glowMat.userData.keepTransparent = true;

  actor.bodyMat = bodyMat;
  actor.accentMat = accentMat;
  actor.robeMat = bodyMat;
  actor.hatMat = accentMat;
  actor.skinMat = skinMat;
  actor.hairMat = hairMat;
  actor.beadMat = beadMat;
  actor.clothMat = clothMat;

  // 1. Torso: bare chest, diagonal sash, knotted waist wrap, dhoti, beads, pouch
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.65, 0);
  addMesh(torsoGroup, G.torsoSkin, skinMat);
  addMesh(torsoGroup, G.dhoti, clothMat);
  addMesh(torsoGroup, G.belt, accentMat);
  addMesh(torsoGroup, G.sash, bodyMat);
  addMesh(torsoGroup, G.necklace, beadMat, false);
  addMesh(torsoGroup, G.pouch, clayMat, false);

  const sG = getBotStaticGeos(archetype, hero);
  if (sG.outlineGeo) {
    const outlineMesh = new THREE.Mesh(sG.outlineGeo, MAT_OUTLINE_PLAYER);
    outlineMesh.scale.set(1.04, 1.04, 1.04);
    outlineMesh.renderOrder = -1;
    torsoGroup.add(outlineMesh);
    actor.outlineMesh = outlineMesh;
  }
  actor.visualMesh.add(torsoGroup);

  // 2. Head: faceted face (no eyes, no symbols), beard, hair, soft halo glow
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.45, 0);
  addMesh(headGroup, G.headSkin, skinMat);
  addMesh(headGroup, G.hair, hairMat);
  addMesh(headGroup, G.beard, hairMat);

  const hG = getBotHeadGeos(archetype);
  if (hG.headOutlineGeo) {
    const headOutline = new THREE.Mesh(hG.headOutlineGeo, MAT_OUTLINE_PLAYER);
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
  actor.visualMesh.add(headGroup);

  // 3. Limbs (pivoted groups for walk / punch animations)
  const makeArm = (x) => {
    const g = new THREE.Group();
    g.position.set(x, 1.07, 0);
    addMesh(g, G.arm, skinMat);
    addMesh(g, G.armBeads, beadMat, false);
    actor.visualMesh.add(g);
    return g;
  };
  const makeLeg = (x) => {
    const g = new THREE.Group();
    g.position.set(x, 0.62, 0);
    addMesh(g, G.leg, skinMat);
    actor.visualMesh.add(g);
    return g;
  };

  actor.leftArm = makeArm(-0.39);
  actor.rightArm = makeArm(0.39);
  actor.leftLeg = makeLeg(-0.14);
  actor.rightLeg = makeLeg(0.14);
  addMesh(actor.leftArm, G.pot, clayMat, false); // kamandalu swings with the free hand

  // 4. Staff (Danda) & spell orb, gripped in the right fist (tilted 12° outward)
  const staffGroup = new THREE.Group();
  staffGroup.position.set(0.08, -0.3, 0.04);
  staffGroup.rotation.z = -0.209;

  const staffShaft = addMesh(staffGroup, GEO_CACHE.staffShaft, woodMat);
  staffShaft.position.set(0, 0.05, 0);
  actor.staffShaft = staffShaft;

  actor.staffOrbMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
  actor.staffOrb = new THREE.Mesh(GEO_CACHE.staffOrb, actor.staffOrbMat);
  actor.staffOrb.scale.setScalar(1.25);
  actor.staffOrb.position.set(0, 0.88, 0);
  staffGroup.add(actor.staffOrb);

  actor.staffAccentMat = mk(0xffd166);
  const staffAccentMesh = addMesh(staffGroup, GEO_CACHE.staffAccentRing, actor.staffAccentMat, false);
  staffAccentMesh.position.set(0, 0.76, 0);
  actor.staffAccentMesh = staffAccentMesh;

  actor.rightArm.add(staffGroup);
  actor.staffGroup = staffGroup;

  // 5. Archetype-specific crown + shoulders + staff tip
  attachArchetypeVisuals(actor, archetype, accentMat, headGroup, torsoGroup, staffGroup);

  // 6. Pre-attach dynamic power-tier visuals (T2 Shastra & T3 Astra)
  buildTierVisuals(actor, headGroup, torsoGroup, staffGroup);

  // 7. Shield mesh
  actor.shieldMesh = new THREE.Mesh(GEO_CACHE.shield, MAT_SHIELD);
  actor.shieldMesh.position.y = 1.0;
  actor.shieldMesh.visible = false;
  actor.visualMesh.add(actor.shieldMesh);

  actor.heroMats = [
    bodyMat, accentMat, skinMat, hairMat, beadMat, clayMat, clothMat, woodMat, glowMat, actor.staffOrbMat, actor.staffAccentMat
  ];
  actor.visualMats = actor.heroMats;
}

function getArchetypeFromLegacy(hatType) {
  const h = (hatType || '').toUpperCase();
  if (h.includes('FLAME') || h.includes('WIZARD')) return 'AGNI';
  if (h.includes('TURBAN') || h.includes('HOOD')) return 'JALA';
  if (h.includes('CIRCLET') || h.includes('HELMET') || h.includes('HORN')) return 'PRITHVI';
  return 'TAPASVI';
}

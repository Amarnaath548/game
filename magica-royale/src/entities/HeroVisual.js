import * as THREE from 'three';

const GEO = {
  body: new THREE.BoxGeometry(0.85, 0.9, 0.65),
  head: new THREE.BoxGeometry(0.85, 0.85, 0.85),
  eye: new THREE.BoxGeometry(0.14, 0.14, 0.05),
  arm: new THREE.BoxGeometry(0.24, 0.65, 0.24),
  staffShaft: new THREE.BoxGeometry(0.1, 1.6, 0.1),
  staffOrb: new THREE.SphereGeometry(0.26, 8, 8),
  shield: new THREE.SphereGeometry(1.6, 12, 12),
  wizardBrim: new THREE.BoxGeometry(1.3, 0.12, 1.3),
  wizardCone: new THREE.ConeGeometry(0.55, 1.0, 4),
  hood: new THREE.BoxGeometry(0.96, 0.92, 0.96),
  horn: new THREE.BoxGeometry(0.18, 0.55, 0.18),
  crest: new THREE.BoxGeometry(0.16, 0.45, 0.95),
  crown: new THREE.BoxGeometry(0.95, 0.25, 0.95),
  mask: new THREE.BoxGeometry(0.42, 0.35, 0.42),
  cape: new THREE.BoxGeometry(0.72, 0.88, 0.08),
  backpack: new THREE.BoxGeometry(0.55, 0.62, 0.35),
  tail: new THREE.BoxGeometry(0.22, 0.22, 0.65),
  pauldron: new THREE.BoxGeometry(0.38, 0.3, 0.38)
};

const MAT_EYE = new THREE.MeshBasicMaterial({ color: 0x111827 });
const MAT_WOOD = new THREE.MeshLambertMaterial({ color: 0x5c3a21 });

export function buildHeroVisual(actor, hero) {
  const bodyMat = new THREE.MeshLambertMaterial({
    color: hero.bodyColor,
    flatShading: true,
    emissive: 0x000000
  });
  const accentMat = new THREE.MeshLambertMaterial({
    color: hero.accentColor,
    flatShading: true,
    emissive: 0x000000
  });

  // Torso & Head
  const body = new THREE.Mesh(GEO.body, bodyMat);
  body.position.y = 0.65;
  body.castShadow = true;
  actor.visualMesh.add(body);

  const head = new THREE.Mesh(GEO.head, bodyMat);
  head.position.y = 1.5;
  head.castShadow = true;
  actor.visualMesh.add(head);

  // Eyes (front face at z = 0.43)
  const leftEye = new THREE.Mesh(GEO.eye, MAT_EYE);
  leftEye.position.set(-0.22, 1.55, 0.43);
  actor.visualMesh.add(leftEye);
  const rightEye = new THREE.Mesh(GEO.eye, MAT_EYE);
  rightEye.position.set(0.22, 1.55, 0.43);
  actor.visualMesh.add(rightEye);

  // Arms
  const leftArm = new THREE.Mesh(GEO.arm, bodyMat);
  leftArm.position.set(-0.56, 0.7, 0);
  actor.visualMesh.add(leftArm);

  const rightArm = new THREE.Mesh(GEO.arm, bodyMat);
  rightArm.position.set(0.56, 0.7, 0);
  actor.visualMesh.add(rightArm);

  // Staff in right hand
  const staffShaft = new THREE.Mesh(GEO.staffShaft, MAT_WOOD);
  staffShaft.position.set(0.68, 1.0, 0.28);
  staffShaft.castShadow = true;
  actor.visualMesh.add(staffShaft);

  actor.staffOrbMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
  actor.staffOrb = new THREE.Mesh(GEO.staffOrb, actor.staffOrbMat);
  actor.staffOrb.position.set(0.68, 1.85, 0.28);
  actor.visualMesh.add(actor.staffOrb);

  // Headgear silhouette
  attachHeadgear(actor.visualMesh, hero.hatType, accentMat);

  // Cosmetic Extra silhouette
  attachCosmeticExtra(actor.visualMesh, hero.extra, accentMat);

  // Shield mesh
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.35,
    wireframe: true
  });
  actor.shieldMesh = new THREE.Mesh(GEO.shield, shieldMat);
  actor.shieldMesh.position.y = 1.25;
  actor.shieldMesh.visible = false;
  actor.visualMesh.add(actor.shieldMesh);

  actor.bodyMat = bodyMat;
  actor.accentMat = accentMat;
}

function attachHeadgear(group, hatType, mat) {
  if (hatType === 'WIZARD_HAT') {
    const brim = new THREE.Mesh(GEO.wizardBrim, mat);
    brim.position.y = 1.95;
    group.add(brim);
    const cone = new THREE.Mesh(GEO.wizardCone, mat);
    cone.position.y = 2.45;
    cone.rotation.y = Math.PI / 4;
    group.add(cone);
  } else if (hatType === 'HOOD') {
    const hood = new THREE.Mesh(GEO.hood, mat);
    hood.position.set(0, 1.55, -0.04);
    group.add(hood);
  } else if (hatType === 'HORNS') {
    const hornL = new THREE.Mesh(GEO.horn, mat);
    hornL.position.set(-0.36, 2.05, -0.05);
    hornL.rotation.z = 0.35;
    group.add(hornL);
    const hornR = new THREE.Mesh(GEO.horn, mat);
    hornR.position.set(0.36, 2.05, -0.05);
    hornR.rotation.z = -0.35;
    group.add(hornR);
  } else if (hatType === 'HELMET') {
    const crest = new THREE.Mesh(GEO.crest, mat);
    crest.position.set(0, 2.05, 0);
    group.add(crest);
  } else if (hatType === 'CROWN') {
    const crown = new THREE.Mesh(GEO.crown, mat);
    crown.position.set(0, 1.98, 0);
    group.add(crown);
  } else if (hatType === 'MASK') {
    const snout = new THREE.Mesh(GEO.mask, mat);
    snout.position.set(0, 1.45, 0.48);
    group.add(snout);
  }
}

function attachCosmeticExtra(group, extra, mat) {
  if (extra === 'CAPE') {
    const cape = new THREE.Mesh(GEO.cape, mat);
    cape.position.set(0, 0.65, -0.38);
    cape.rotation.x = -0.15;
    group.add(cape);
  } else if (extra === 'BACKPACK') {
    const pack = new THREE.Mesh(GEO.backpack, mat);
    pack.position.set(0, 0.72, -0.46);
    group.add(pack);
  } else if (extra === 'TAIL') {
    const tail = new THREE.Mesh(GEO.tail, mat);
    tail.position.set(0, 0.35, -0.45);
    tail.rotation.x = 0.4;
    group.add(tail);
  } else if (extra === 'PAULDRONS') {
    const pL = new THREE.Mesh(GEO.pauldron, mat);
    pL.position.set(-0.58, 1.05, 0);
    group.add(pL);
    const pR = new THREE.Mesh(GEO.pauldron, mat);
    pR.position.set(0.58, 1.05, 0);
    group.add(pR);
  }
}


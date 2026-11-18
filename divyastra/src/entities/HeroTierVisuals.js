import * as THREE from 'three';
import { MAT_GOLD } from './HeroMaterials.js';

export function buildTierVisuals(actor, headGroup, torsoGroup, staffGroup) {
  // Tier 2 (Shastra): Brow-band, shoulder rings, staff ferrule
  const browBandGeo = new THREE.TorusGeometry(0.275, 0.022, 6, 14);
  const browBand = new THREE.Mesh(browBandGeo, MAT_GOLD);
  browBand.position.set(0, 0.1, 0);
  browBand.rotation.x = Math.PI / 2;
  browBand.visible = false;
  headGroup.add(browBand);

  const shoulderRingGeo = new THREE.TorusGeometry(0.18, 0.02, 6, 12);
  const shoulderL = new THREE.Mesh(shoulderRingGeo, MAT_GOLD);
  shoulderL.position.set(-0.4, 0.46, 0);
  shoulderL.rotation.y = Math.PI / 2;
  shoulderL.visible = false;
  torsoGroup.add(shoulderL);

  const shoulderR = new THREE.Mesh(shoulderRingGeo, MAT_GOLD);
  shoulderR.position.set(0.4, 0.46, 0);
  shoulderR.rotation.y = Math.PI / 2;
  shoulderR.visible = false;
  torsoGroup.add(shoulderR);

  const ferruleGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.12, 8);
  const ferrule = new THREE.Mesh(ferruleGeo, MAT_GOLD);
  ferrule.position.set(0, 0.68, 0);
  ferrule.visible = false;
  staffGroup.add(ferrule);

  // Tier 3 (Astra): Floating halo tilted 25° backward + rotating orb outer ring
  const haloGeo = new THREE.TorusGeometry(0.34, 0.026, 6, 16);
  const halo = new THREE.Mesh(haloGeo, MAT_GOLD);
  halo.position.set(0, 0.32, -0.16);
  halo.rotation.x = -0.436; // 25° backward tilt for 58° camera framing
  halo.visible = false;
  headGroup.add(halo);

  const orbRingGeo = new THREE.TorusGeometry(0.19, 0.018, 6, 14);
  const orbRing = new THREE.Mesh(orbRingGeo, MAT_GOLD);
  orbRing.position.set(0, 0.88, 0);
  orbRing.visible = false;
  staffGroup.add(orbRing);

  actor.tierVisuals = {
    browBand,
    shoulderL,
    shoulderR,
    ferrule,
    halo,
    orbRing
  };
  actor.tierBaseScale = 1.0;
}

export function updateTierVisuals(actor, tier, dt = 0.016) {
  if (!actor.tierVisuals) return;
  const { browBand, shoulderL, shoulderR, ferrule, halo, orbRing } = actor.tierVisuals;

  const isT2 = tier >= 2;
  const isT3 = tier >= 3;

  if (browBand.visible !== isT2) browBand.visible = isT2;
  if (shoulderL.visible !== isT2) shoulderL.visible = isT2;
  if (shoulderR.visible !== isT2) shoulderR.visible = isT2;
  if (ferrule.visible !== isT2) ferrule.visible = isT2;

  if (halo.visible !== isT3) halo.visible = isT3;
  if (orbRing.visible !== isT3) orbRing.visible = isT3;

  if (isT3) {
    orbRing.rotation.z += dt * 2.2;
    orbRing.rotation.y += dt * 1.5;
  }

  const targetBaseScale = isT3 ? 1.45 : (isT2 ? 1.25 : 1.0);
  actor.tierBaseScale = targetBaseScale;

  if (actor.staffOrb && (!actor.orbTimer || actor.orbTimer <= 0)) {
    actor.staffOrb.scale.set(targetBaseScale, targetBaseScale, targetBaseScale);
  }
}

import * as THREE from 'three';
import {
  MAT_GOLD, MAT_CRIMSON, MAT_ORANGE_FIRE, MAT_SEAFOAM,
  MAT_STONE_GREY, MAT_ROCK, getHeroMaterial, getEmissiveTipMaterial
} from './HeroMaterials.js';
import { PALETTE } from '../config/palette.js';
import { buildBeadRing } from './HeroBody.js';

export function attachArchetypeVisuals(actor, archetype, accentMat, headGroup, torsoGroup, staffGroup) {
  switch (archetype) {
    case 'TAPASVI':
      buildTapasviVisuals(actor, headGroup, torsoGroup, staffGroup, accentMat);
      break;
    case 'AGNI':
      buildAgniVisuals(actor, headGroup, torsoGroup, staffGroup, accentMat);
      break;
    case 'JALA':
      buildJalaVisuals(actor, headGroup, torsoGroup, staffGroup, accentMat);
      break;
    case 'PRITHVI':
      buildPrithviVisuals(actor, headGroup, torsoGroup, staffGroup, accentMat);
      break;
    default:
      buildTapasviVisuals(actor, headGroup, torsoGroup, staffGroup, accentMat);
      break;
  }
}

function buildTapasviVisuals(actor, head, torso, staff, accentMat) {
  // Jata topknot: tapered tuft + bun, a ring of rudraksha beads and a thin accent band
  const tuft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.14, 8), actor.hairMat);
  tuft.position.set(0, 0.26, -0.03);
  head.add(tuft);

  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.15, 9, 8), actor.hairMat);
  bun.scale.set(1, 0.9, 1);
  bun.position.set(0, 0.39, -0.04);
  head.add(bun);

  const beads = new THREE.Mesh(buildBeadRing(0.14, 9, 0.03), actor.beadMat);
  beads.position.set(0, 0.32, -0.04);
  head.add(beads);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 5, 12), accentMat);
  band.position.set(0, 0.26, -0.03);
  band.rotation.x = Math.PI / 2;
  head.add(band);

  // Lotus staff mount (25% larger, emissive tip)
  const mount = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 12), getEmissiveTipMaterial(PALETTE.gold));
  mount.scale.setScalar(1.25);
  mount.position.set(0, 0.8, 0);
  mount.rotation.x = Math.PI / 2;
  staff.add(mount);
}

function buildAgniVisuals(actor, head, torso, staff, accentMat) {
  // 3-prong swept flame hair crest (30° backward)
  const flameGroup = new THREE.Group();
  flameGroup.position.set(0, 0.22, 0);
  flameGroup.rotation.x = -0.52;

  const centerSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 5), MAT_CRIMSON);
  centerSpike.position.set(0, 0.16, 0);
  flameGroup.add(centerSpike);

  const sideSpikeGeo = new THREE.ConeGeometry(0.065, 0.26, 5);
  const spikeL = new THREE.Mesh(sideSpikeGeo, MAT_ORANGE_FIRE);
  spikeL.position.set(-0.09, 0.12, -0.02);
  spikeL.rotation.z = 0.26;
  flameGroup.add(spikeL);

  const spikeR = new THREE.Mesh(sideSpikeGeo, MAT_ORANGE_FIRE);
  spikeR.position.set(0.09, 0.12, -0.02);
  spikeR.rotation.z = -0.26;
  flameGroup.add(spikeR);
  head.add(flameGroup);

  // Spiked shoulder mantle
  const mantleGeo = new THREE.ConeGeometry(0.08, 0.22, 5);
  const mantleL = new THREE.Mesh(mantleGeo, MAT_CRIMSON);
  mantleL.position.set(-0.41, 0.54, 0);
  mantleL.rotation.z = 0.45;
  torso.add(mantleL);

  const mantleR = new THREE.Mesh(mantleGeo, MAT_CRIMSON);
  mantleR.position.set(0.41, 0.54, 0);
  mantleR.rotation.z = -0.45;
  torso.add(mantleR);

  // Spinning octahedron staff tip (25% larger, emissive sindoor)
  const octaTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), getEmissiveTipMaterial(PALETTE.sindoor));
  octaTip.scale.setScalar(1.25);
  octaTip.position.set(0, 0.88, 0);
  staff.add(octaTip);
  actor.spinningStaffTip = octaTip;
}

function buildJalaVisuals(actor, head, torso, staff, accentMat) {
  // Layered wrapped turban + 2 offset tilted torus wraps
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), accentMat);
  dome.position.set(0, 0.11, -0.02);
  head.add(dome);

  const wrap1 = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.045, 6, 12), accentMat);
  wrap1.position.set(0, 0.07, -0.02);
  wrap1.rotation.set(0.25, 0, 0.2);
  head.add(wrap1);

  const wrap2 = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.042, 6, 12), MAT_SEAFOAM);
  wrap2.position.set(0, 0.14, -0.03);
  wrap2.rotation.set(-0.2, 0, -0.25);
  head.add(wrap2);

  // Two flat angled cloth tails trailing behind the head
  const tailGeo = new THREE.BoxGeometry(0.09, 0.42, 0.02);
  const tailL = new THREE.Mesh(tailGeo, MAT_SEAFOAM);
  tailL.position.set(-0.08, -0.08, -0.29);
  tailL.rotation.set(-0.7, 0, 0.2);
  head.add(tailL);

  const tailR = new THREE.Mesh(tailGeo, accentMat);
  tailR.position.set(0.08, -0.08, -0.29);
  tailR.rotation.set(-0.7, 0, -0.2);
  head.add(tailR);

  // Drooping wave shoulder pads + pale seafoam collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 12), MAT_SEAFOAM);
  collar.position.set(0, 0.5, 0);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1, 0.75, 1);
  torso.add(collar);

  const waveGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const waveL = new THREE.Mesh(waveGeo, accentMat);
  waveL.scale.set(1.2, 0.55, 0.9);
  waveL.position.set(-0.4, 0.5, 0);
  waveL.rotation.z = -0.2;
  torso.add(waveL);

  const waveR = new THREE.Mesh(waveGeo, accentMat);
  waveR.scale.set(1.2, 0.55, 0.9);
  waveR.position.set(0.4, 0.5, 0);
  waveR.rotation.z = 0.2;
  torso.add(waveR);

  // Crescent half-torus staff fork cradling the orb (25% larger, emissive teal)
  const fork = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 12, Math.PI), getEmissiveTipMaterial(PALETTE.elements.JALA));
  fork.scale.setScalar(1.25);
  fork.position.set(0, 0.85, 0);
  fork.rotation.set(0, 0, Math.PI);
  staff.add(fork);
}

function buildPrithviVisuals(actor, head, torso, staff, accentMat) {
  // Flat-topped stone circlet tinted with olive school colour
  const circlet = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.08, 8), getHeroMaterial(PALETTE.elements.PRITHVI));
  circlet.position.set(0, 0.15, 0);
  head.add(circlet);

  // Long grey beard point, tilted forward for camera readability (base beard comes from the body)
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), actor.hairMat);
  beard.position.set(0, -0.36, 0.17);
  beard.rotation.set(Math.PI - 0.3, 0, 0);
  head.add(beard);

  // Bulky faceted rock shoulders
  const rockGeo = new THREE.DodecahedronGeometry(0.18, 0);
  const rockL = new THREE.Mesh(rockGeo, MAT_ROCK);
  rockL.position.set(-0.45, 0.5, 0);
  rockL.rotation.set(0.4, 0.2, -0.3);
  torso.add(rockL);

  const rockR = new THREE.Mesh(rockGeo, MAT_ROCK);
  rockR.position.set(0.45, 0.5, 0);
  rockR.rotation.set(-0.3, 0.4, 0.2);
  torso.add(rockR);

  // Rough boulder staff tip (25% larger, emissive olive)
  const boulder = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), getEmissiveTipMaterial(PALETTE.elements.PRITHVI));
  boulder.scale.setScalar(1.25);
  boulder.position.set(0, 0.88, 0);
  staff.add(boulder);
}

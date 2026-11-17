import * as THREE from 'three';
import {
  MAT_GOLD, MAT_CRIMSON, MAT_ORANGE_FIRE, MAT_SEAFOAM,
  MAT_STONE_GREY, MAT_BEARD, MAT_ROCK
} from './HeroMaterials.js';

export function attachArchetypeVisuals(actor, archetype, accentMat, headGroup, torsoGroup, staffGroup) {
  switch (archetype) {
    case 'TAPASVI':
      buildTapasviVisuals(headGroup, torsoGroup, staffGroup, accentMat);
      break;
    case 'AGNI':
      buildAgniVisuals(actor, headGroup, torsoGroup, staffGroup, accentMat);
      break;
    case 'JALA':
      buildJalaVisuals(headGroup, torsoGroup, staffGroup, accentMat);
      break;
    case 'PRITHVI':
      buildPrithviVisuals(headGroup, torsoGroup, staffGroup, accentMat);
      break;
    default:
      buildTapasviVisuals(headGroup, torsoGroup, staffGroup, accentMat);
      break;
  }
}

function buildTapasviVisuals(head, torso, staff, accentMat) {
  // 2-tier jata topknot: tapered cylinder base + tilted sphere bun + thick gold bullseye ring
  const jataBaseGeo = new THREE.CylinderGeometry(0.09, 0.13, 0.16, 8);
  const jataBase = new THREE.Mesh(jataBaseGeo, accentMat);
  jataBase.position.set(0, 0.26, -0.02);
  head.add(jataBase);

  const bunGeo = new THREE.SphereGeometry(0.12, 8, 8);
  const bun = new THREE.Mesh(bunGeo, accentMat);
  bun.position.set(0, 0.38, -0.04);
  bun.rotation.x = -0.15;
  head.add(bun);

  const goldRingGeo = new THREE.TorusGeometry(0.13, 0.035, 6, 14);
  const goldRing = new THREE.Mesh(goldRingGeo, MAT_GOLD);
  goldRing.position.set(0, 0.31, -0.03);
  goldRing.rotation.x = Math.PI / 2 + 0.15;
  head.add(goldRing);

  // Asymmetrical saffron uttariya drape over left shoulder with marigold trim
  const drapeGeo = new THREE.SphereGeometry(0.24, 8, 8);
  const drape = new THREE.Mesh(drapeGeo, accentMat);
  drape.scale.set(1.1, 0.6, 0.75);
  drape.position.set(-0.32, 0.38, 0);
  drape.rotation.z = -0.3;
  torso.add(drape);

  const trimGeo = new THREE.TorusGeometry(0.24, 0.028, 6, 14);
  const trim = new THREE.Mesh(trimGeo, MAT_GOLD);
  trim.position.set(-0.16, 0.28, 0.04);
  trim.rotation.set(0.4, 0.3, -0.7);
  torso.add(trim);

  // Lotus staff mount
  const mountGeo = new THREE.TorusGeometry(0.12, 0.025, 6, 12);
  const mount = new THREE.Mesh(mountGeo, MAT_GOLD);
  mount.position.set(0, 0.8, 0);
  mount.rotation.x = Math.PI / 2;
  staff.add(mount);
}

function buildAgniVisuals(actor, head, torso, staff, accentMat) {
  // 3-prong swept flame hair crest (30° backward)
  const flameGroup = new THREE.Group();
  flameGroup.position.set(0, 0.22, 0);
  flameGroup.rotation.x = -0.52; // 30° backward

  const centerSpikeGeo = new THREE.ConeGeometry(0.08, 0.32, 5);
  const centerSpike = new THREE.Mesh(centerSpikeGeo, MAT_CRIMSON);
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
  mantleL.position.set(-0.38, 0.44, 0);
  mantleL.rotation.z = 0.45;
  torso.add(mantleL);

  const mantleR = new THREE.Mesh(mantleGeo, MAT_CRIMSON);
  mantleR.position.set(0.38, 0.44, 0);
  mantleR.rotation.z = -0.45;
  torso.add(mantleR);

  // Spinning octahedron staff tip
  const octaGeo = new THREE.OctahedronGeometry(0.12, 0);
  const octaTip = new THREE.Mesh(octaGeo, MAT_ORANGE_FIRE);
  octaTip.position.set(0, 0.88, 0);
  staff.add(octaTip);
  actor.spinningStaffTip = octaTip;
}

function buildJalaVisuals(head, torso, staff, accentMat) {
  // Layered wrapped turban + 2 offset tilted torus wraps
  const domeGeo = new THREE.SphereGeometry(0.24, 10, 8);
  const dome = new THREE.Mesh(domeGeo, accentMat);
  dome.position.set(0, 0.12, -0.02);
  head.add(dome);

  const wrapGeo1 = new THREE.TorusGeometry(0.23, 0.045, 6, 12);
  const wrap1 = new THREE.Mesh(wrapGeo1, accentMat);
  wrap1.position.set(0, 0.08, -0.02);
  wrap1.rotation.set(0.25, 0, 0.2);
  head.add(wrap1);

  const wrapGeo2 = new THREE.TorusGeometry(0.22, 0.042, 6, 12);
  const wrap2 = new THREE.Mesh(wrapGeo2, MAT_SEAFOAM);
  wrap2.position.set(0, 0.14, -0.03);
  wrap2.rotation.set(-0.2, 0, -0.25);
  head.add(wrap2);

  // Two flat angled cloth tails trailing 40° behind head for comet silhouette
  const tailGeo = new THREE.BoxGeometry(0.09, 0.42, 0.02);
  const tailL = new THREE.Mesh(tailGeo, MAT_SEAFOAM);
  tailL.position.set(-0.08, -0.08, -0.26);
  tailL.rotation.set(-0.7, 0, 0.2); // 40° back
  head.add(tailL);

  const tailR = new THREE.Mesh(tailGeo, accentMat);
  tailR.position.set(0.08, -0.08, -0.26);
  tailR.rotation.set(-0.7, 0, -0.2);
  head.add(tailR);

  // Smooth drooping wave shoulder pads + pale seafoam collar
  const collarGeo = new THREE.TorusGeometry(0.24, 0.035, 6, 12);
  const collar = new THREE.Mesh(collarGeo, MAT_SEAFOAM);
  collar.position.set(0, 0.38, 0);
  collar.rotation.x = Math.PI / 2;
  torso.add(collar);

  const waveGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const waveL = new THREE.Mesh(waveGeo, accentMat);
  waveL.scale.set(1.2, 0.55, 0.9);
  waveL.position.set(-0.36, 0.36, 0);
  waveL.rotation.z = -0.2;
  torso.add(waveL);

  const waveR = new THREE.Mesh(waveGeo, accentMat);
  waveR.scale.set(1.2, 0.55, 0.9);
  waveR.position.set(0.36, 0.36, 0);
  waveR.rotation.z = 0.2;
  torso.add(waveR);

  // Crescent half-torus staff fork cradling the orb
  const forkGeo = new THREE.TorusGeometry(0.15, 0.03, 6, 12, Math.PI);
  const fork = new THREE.Mesh(forkGeo, MAT_SEAFOAM);
  fork.position.set(0, 0.85, 0);
  fork.rotation.set(0, 0, Math.PI);
  staff.add(fork);
}

function buildPrithviVisuals(head, torso, staff, accentMat) {
  // Flat-topped stone circlet
  const circletGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 8);
  const circlet = new THREE.Mesh(circletGeo, MAT_STONE_GREY);
  circlet.position.set(0, 0.14, 0);
  head.add(circlet);

  // Forward-jutting faceted grey beard (tilted 20° forward for 58° camera readability)
  const beardGeo = new THREE.ConeGeometry(0.12, 0.28, 5);
  const beard = new THREE.Mesh(beardGeo, MAT_BEARD);
  beard.position.set(0, -0.14, 0.20);
  beard.rotation.set(0.35, 0, 0); // 20° forward
  head.add(beard);

  // Bulky faceted rock shoulders
  const rockGeo = new THREE.DodecahedronGeometry(0.18, 0);
  const rockL = new THREE.Mesh(rockGeo, MAT_ROCK);
  rockL.position.set(-0.42, 0.38, 0);
  rockL.rotation.set(0.4, 0.2, -0.3);
  torso.add(rockL);

  const rockR = new THREE.Mesh(rockGeo, MAT_ROCK);
  rockR.position.set(0.42, 0.38, 0);
  rockR.rotation.set(-0.3, 0.4, 0.2);
  torso.add(rockR);

  // Rough boulder staff tip
  const boulderGeo = new THREE.IcosahedronGeometry(0.12, 0);
  const boulder = new THREE.Mesh(boulderGeo, MAT_ROCK);
  boulder.position.set(0, 0.88, 0);
  staff.add(boulder);
}

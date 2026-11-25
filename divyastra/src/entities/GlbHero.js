import * as THREE from 'three';
import { HERO_VISUAL_SCALE } from '../config/constants.js';
import { HERO_FACING_OFFSET } from '../config/assets.js';
import { GEO_CACHE, MAT_OUTLINE_PLAYER, MAT_OUTLINE_ENEMY, MAT_SHIELD } from './HeroMaterials.js';
import {
  GLB_MOTION_CFG,
  easeOutCubic,
  createAttackTrail,
  createDashDust,
  triggerAttackTrail,
  updateGlbMotion,
} from './GlbHeroMotion.js';

const DEG_TO_RAD = Math.PI / 180;

function cloneActorMaterials(root) {
  const matMap = new Map(), mats = [], meshes = [];
  const cloneMat = (m) => {
    if (!m) return m;
    if (!matMap.has(m)) { const c = m.clone(); matMap.set(m, c); mats.push(c); }
    return matMap.get(m);
  };
  root.traverse((c) => {
    if (!c.isMesh) return;
    c.castShadow = true; c.receiveShadow = true; meshes.push(c);
    c.material = Array.isArray(c.material) ? c.material.map(cloneMat) : cloneMat(c.material);
  });
  return { mats, meshes };
}

function detectOrbMesh(meshes, box, size, center, mats) {
  let best = null, bestY = -Infinity;
  const minY = box.min.y + size.y * 0.85, minSide = size.x * 0.28;
  const mBox = new THREE.Box3(), mCenter = new THREE.Vector3();
  for (const mesh of meshes) {
    mBox.setFromObject(mesh); mBox.getCenter(mCenter);
    if (mCenter.y >= minY && Math.abs(mCenter.x - center.x) >= minSide && mCenter.y > bestY) {
      best = mesh; bestY = mCenter.y;
    }
  }
  if (!best || Array.isArray(best.material) || !best.material) return null;
  const orbMat = best.material.clone();
  best.material = orbMat; mats.push(orbMat);
  return { mesh: best, mat: orbMat };
}

export class GlbHero {
  constructor(wrapper, actor) {
    this.wrapper = wrapper; this.actor = actor;
    this.idleTime = Math.random() * 2; this.stepPhase = 0; this.landSquashTimer = 0;
    this.leanX = 0; this.leanZ = 0; this.yawY = 0; this.swayX = 0; this.bobY = 0;
    this.scaleX = 1; this.scaleY = 1; this.scaleZ = 1;
    this.castState = 'NONE'; this.castT = 0; this.castDur = 0; this.externalWindup = false;
    this.hitTimer = 0; this.hitDirX = 0; this.hitDirZ = 0;
    this.wasDashing = false; this.deathElapsed = 0;
    this.trail = createAttackTrail(wrapper);
    this.dust = createDashDust(actor.group);
  }

  reset() {
    this.castState = 'NONE'; this.externalWindup = false; this.hitTimer = 0;
    this.landSquashTimer = 0; this.wasDashing = false; this.deathElapsed = 0;
    this.leanX = 0; this.leanZ = 0; this.yawY = 0; this.swayX = 0; this.bobY = 0;
    this.scaleX = 1; this.scaleY = 1; this.scaleZ = 1;
    if (this.trail) { this.trail.timer = 0; this.trail.mesh.visible = false; }
    if (this.dust) { this.dust.timer = 0; for (const p of this.dust.puffs) p.visible = false; }
    this.wrapper.position.set(0, 0, 0); this.wrapper.rotation.set(0, 0, 0); this.wrapper.scale.set(1, 1, 1);
  }

  startWindup(isTier3 = false) {
    this.externalWindup = true;
    this.castState = isTier3 ? 'CHARGE' : 'WINDUP';
    this.castT = 0;
    this.castDur = isTier3 ? GLB_MOTION_CFG.attack.chargeDur : GLB_MOTION_CFG.attack.windupDur;
  }

  triggerSnap() {
    this.externalWindup = false; this.castState = 'SNAP';
    this.castT = 0; this.castDur = GLB_MOTION_CFG.attack.snapDur;
    triggerAttackTrail(this.trail, this.actor);
  }

  cancelCast() { this.externalWindup = false; this.castState = 'NONE'; }

  triggerAttack(isTier3 = false) {
    this.externalWindup = false;
    this.castState = isTier3 ? 'CHARGE' : 'WINDUP';
    this.castT = 0;
    this.castDur = isTier3 ? GLB_MOTION_CFG.attack.chargeDur : GLB_MOTION_CFG.attack.windupDur;
  }

  triggerHit(dirX = 0, dirZ = 0) {
    const len = Math.hypot(dirX, dirZ) || 1;
    this.hitDirX = dirX / len; this.hitDirZ = dirZ / len;
    this.hitTimer = GLB_MOTION_CFG.hit.dur;
    this.actor.hitTimer = Math.max(this.actor.hitTimer || 0, GLB_MOTION_CFG.hit.dur);
    this.actor.setHeroEmissive?.(0xffffff);
  }

  updateDeath(dt) {
    this.deathElapsed += dt;
    const e = easeOutCubic(this.deathElapsed / GLB_MOTION_CFG.death.dur);
    this.wrapper.rotation.set(GLB_MOTION_CFG.death.pitchDeg * DEG_TO_RAD * e, 0, 0);
    this.wrapper.position.set(0, (GLB_MOTION_CFG.death.dropY / HERO_VISUAL_SCALE) * e, 0);
    this.wrapper.scale.set(1, 1, 1);
  }

  update(dt, isMoving = false, moveX = 0, moveZ = 0, isDashing = false) {
    if (this.actor.isDead) { this.updateDeath(dt); return; }
    updateGlbMotion(this, dt, isMoving, moveX, moveZ, isDashing);
  }
}

export function buildGlbHero(actor, hero, rawModel) {
  rawModel.updateMatrixWorld(true);
  const { mats, meshes } = cloneActorMaterials(rawModel);
  const box = new THREE.Box3().setFromObject(rawModel);
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);

  const orb = detectOrbMesh(meshes, box, size, center, mats);
  if (orb) { actor.staffOrb = orb.mesh; actor.staffOrbMat = orb.mat; }

  const outlineMat = actor.isBot ? MAT_OUTLINE_ENEMY : MAT_OUTLINE_PLAYER;
  actor.outlineMeshes = meshes.map((mesh) => {
    const outline = new THREE.Mesh(mesh.geometry, outlineMat);
    outline.scale.setScalar(1.04); outline.renderOrder = -1;
    outline.castShadow = false; outline.receiveShadow = false;
    mesh.add(outline);
    return outline;
  });
  actor.outlineMesh = actor.outlineMeshes[0] || null;

  const normScale = size.y > 0.0001 ? (2.4 / HERO_VISUAL_SCALE) / size.y : 1;
  const normGroup = new THREE.Group();
  normGroup.scale.setScalar(normScale);
  normGroup.position.set(-center.x * normScale, -box.min.y * normScale, -center.z * normScale);
  normGroup.add(rawModel);

  const facingGroup = new THREE.Group();
  facingGroup.rotation.y = HERO_FACING_OFFSET[hero.id] ?? 0;
  facingGroup.add(normGroup);

  const animWrapper = new THREE.Group();
  animWrapper.add(facingGroup);
  actor.visualMesh.add(animWrapper);

  actor.shieldMesh = new THREE.Mesh(GEO_CACHE.shield, MAT_SHIELD);
  actor.shieldMesh.position.y = 1.0; actor.shieldMesh.visible = false;
  actor.visualMesh.add(actor.shieldMesh);

  actor.heroMats = mats; actor.visualMats = mats;
  actor.glbHero = new GlbHero(animWrapper, actor);
}

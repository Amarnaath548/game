import * as THREE from 'three';
import { HERO_VISUAL_SCALE } from '../config/constants.js';
import { HERO_FACING_OFFSET } from '../config/assets.js';
import { GEO_CACHE, MAT_OUTLINE_PLAYER, MAT_OUTLINE_ENEMY, MAT_SHIELD } from './HeroMaterials.js';
import {
  MOTION_CONFIG, clamp01, easeOutCubic,
  createCastTrail, createDashDust,
  computeWalkTarget, computeIdleTarget, computeCastOffset, computeHitOffset, updateTrailAndDust
} from './GlbHeroMotion.js';

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
    this.idleTime = Math.random() * 2; this.stepPhase = 0; this.landTimer = 0;
    this.swayX = 0; this.bobY = 0; this.leanX = 0; this.leanZ = 0; this.yawY = 0;
    this.scaleX = 1; this.scaleY = 1; this.scaleZ = 1;
    this.castState = 'NONE'; this.castT = 0; this.castDur = 0; this.externalWindup = false;
    this.hitTimer = 0; this.hitDirX = 0; this.hitDirZ = 0;
    this.wasDashing = false; this.deathElapsed = 0;
    this.trailTimer = 0; this.dustTimer = 0;
    this.trail = createCastTrail(wrapper);
    this.dust = createDashDust(actor.scene);
    this._target = { bobY: 0, swayX: 0, leanX: 0, leanZ: 0, yawY: 0, scaleY: 1, scaleXZ: 1 };
    this._cast = { posZ: 0, rotX: 0, rotY: 0, scaleY: 1, scaleXZ: 1 };
    this._hit = { posX: 0, posZ: 0, rotX: 0, rotZ: 0, scaleY: 1, scaleXZ: 1 };
  }

  reset() {
    this.castState = 'NONE'; this.externalWindup = false; this.hitTimer = 0;
    this.landTimer = 0; this.wasDashing = false; this.deathElapsed = 0;
    this.trailTimer = 0; this.dustTimer = 0;
    this.trail.mesh.visible = false; this.dust.group.visible = false;
    this.swayX = 0; this.bobY = 0; this.leanX = 0; this.leanZ = 0; this.yawY = 0;
    this.scaleX = 1; this.scaleY = 1; this.scaleZ = 1;
    this.wrapper.position.set(0, 0, 0); this.wrapper.rotation.set(0, 0, 0); this.wrapper.scale.set(1, 1, 1);
  }

  startWindup(isTier3 = false) {
    this.externalWindup = true;
    this.castState = isTier3 ? 'CHARGE' : 'WINDUP';
    this.castT = 0;
    this.castDur = isTier3 ? MOTION_CONFIG.attack.chargeDur : MOTION_CONFIG.attack.windupDur;
  }

  triggerSnap() {
    this.externalWindup = false;
    this.castState = 'SNAP'; this.castT = 0; this.castDur = MOTION_CONFIG.attack.snapDur;
    const elemColor = this.actor.currentSpell?.color || this.actor.spellSlot?.activeSpell?.color || 0xffaa44;
    this.trail.mat.color.setHex(elemColor);
    this.trail.mat.opacity = 0.9;
    this.trail.mesh.rotation.y = -0.35;
    this.trail.mesh.visible = true;
    this.trailTimer = MOTION_CONFIG.attack.trailDuration;
  }

  cancelCast() { this.externalWindup = false; this.castState = 'NONE'; }

  triggerAttack(isTier3 = false) {
    this.externalWindup = false;
    this.castState = isTier3 ? 'CHARGE' : 'WINDUP';
    this.castT = 0;
    this.castDur = isTier3 ? MOTION_CONFIG.attack.chargeDur : MOTION_CONFIG.attack.windupDur;
  }

  triggerHit(dirX = 0, dirZ = 0) {
    const len = Math.hypot(dirX, dirZ) || 1;
    this.hitDirX = dirX / len; this.hitDirZ = dirZ / len;
    this.hitTimer = MOTION_CONFIG.hit.duration;
    if (this.actor.hitTimer !== undefined) this.actor.hitTimer = Math.max(this.actor.hitTimer, MOTION_CONFIG.hit.duration);
    this.actor.setHeroEmissive?.(0xffffff);
  }

  updateDeath(dt) {
    const cfg = MOTION_CONFIG.death;
    this.deathElapsed += dt;
    const e = easeOutCubic(this.deathElapsed / cfg.duration);
    this.wrapper.rotation.set(-cfg.pitchRad * e, 0, 0);
    this.wrapper.position.set(0, (-cfg.dropY / HERO_VISUAL_SCALE) * e, 0);
    this.wrapper.scale.set(1, 1, 1);
  }

  update(dt, isMoving = false, moveX = 0, moveZ = 0, isDashing = false) {
    if (this.actor.isDead) { this.updateDeath(dt); return; }

    updateTrailAndDust(this, dt);

    if (isDashing && !this.wasDashing) {
      this.dustTimer = MOTION_CONFIG.dash.dustDuration;
      this.dust.group.position.set(this.actor.x || 0, 0.14, this.actor.z || 0);
      this.dust.group.visible = true;
    }
    this.wasDashing = isDashing;

    const tgt = this._target;
    tgt.bobY = 0; tgt.swayX = 0; tgt.leanX = 0; tgt.leanZ = 0; tgt.yawY = 0; tgt.scaleY = 1; tgt.scaleXZ = 1;
    let tScaleX = 1, tScaleZ = 1;

    if (this.castState === 'NONE') {
      if (isDashing) {
        const dCfg = MOTION_CONFIG.dash;
        const dx = this.actor.dashVec?.x ?? moveX, dz = this.actor.dashVec?.z ?? moveZ;
        const dLen = Math.hypot(dx, dz);
        if (dLen > 0.01) {
          const nx = dx / dLen, nz = dz / dLen, ang = this.actor.visualMesh.rotation.y;
          tgt.leanX = (nx * Math.sin(ang) + nz * Math.cos(ang)) * dCfg.leanRad;
          tgt.leanZ = -(nx * Math.cos(ang) - nz * Math.sin(ang)) * dCfg.leanRad;
        } else {
          tgt.leanX = dCfg.leanRad;
        }
        tScaleX = dCfg.stretchXY; tgt.scaleY = dCfg.stretchXY; tScaleZ = dCfg.stretchZ;
      } else if (isMoving) {
        computeWalkTarget(this, dt, moveX, moveZ, tgt);
        tScaleX = tgt.scaleXZ; tScaleZ = tgt.scaleXZ;
      } else {
        computeIdleTarget(this, dt, tgt);
        tScaleX = tgt.scaleXZ; tScaleZ = tgt.scaleXZ;
      }
    }

    const damp = 1 - Math.exp(-MOTION_CONFIG.dampRate * dt);
    this.bobY = THREE.MathUtils.lerp(this.bobY, tgt.bobY, damp);
    this.swayX = THREE.MathUtils.lerp(this.swayX, tgt.swayX, damp);
    this.leanX = THREE.MathUtils.lerp(this.leanX, tgt.leanX, damp);
    this.leanZ = THREE.MathUtils.lerp(this.leanZ, tgt.leanZ, damp);
    this.yawY = THREE.MathUtils.lerp(this.yawY, tgt.yawY, damp);
    this.scaleX = THREE.MathUtils.lerp(this.scaleX, tScaleX, damp);
    this.scaleY = THREE.MathUtils.lerp(this.scaleY, tgt.scaleY, damp);
    this.scaleZ = THREE.MathUtils.lerp(this.scaleZ, tScaleZ, damp);

    computeCastOffset(this, dt, this._cast);
    computeHitOffset(this, dt, this._hit);

    this.wrapper.position.set(
      this.swayX + this._hit.posX,
      this.bobY,
      this._cast.posZ + this._hit.posZ
    );
    this.wrapper.rotation.set(
      this.leanX + this._cast.rotX + this._hit.rotX,
      this.yawY + this._cast.rotY,
      this.leanZ + this._hit.rotZ
    );
    this.wrapper.scale.set(
      this.scaleX * this._cast.scaleXZ * this._hit.scaleXZ,
      this.scaleY * this._cast.scaleY * this._hit.scaleY,
      this.scaleZ * this._cast.scaleXZ * this._hit.scaleXZ
    );
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

import * as THREE from 'three';
import { HERO_VISUAL_SCALE, PLAYER_BASE } from '../config/constants.js';
import { HERO_FACING_OFFSET } from '../config/assets.js';
import { GEO_CACHE, MAT_OUTLINE_PLAYER, MAT_OUTLINE_ENEMY, MAT_SHIELD } from './HeroMaterials.js';

const DEG3 = THREE.MathUtils.degToRad(3), DEG5 = THREE.MathUtils.degToRad(5);
const DEG8 = THREE.MathUtils.degToRad(8), DEG10 = THREE.MathUtils.degToRad(10);
const DEG14 = THREE.MathUtils.degToRad(14), DEG80 = THREE.MathUtils.degToRad(80);

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeOutBack = (t) => { const x = clamp01(t) - 1; return 1 + 2.70158 * x * x * x + 1.70158 * x * x; };

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
    this.idleTime = Math.random() * 2; this.stepPhase = 0;
    this.leanX = 0; this.leanZ = 0; this.rollZ = 0; this.bobY = 0; this.scaleY = 1; this.scaleXZ = 1;
    this.castState = 'NONE'; this.castT = 0; this.castDur = 0; this.externalWindup = false;
    this.hitTimer = 0; this.hitDur = 0.12; this.hitDirX = 0; this.hitDirZ = 0;
    this.deathElapsed = 0;
  }

  reset() {
    this.castState = 'NONE'; this.externalWindup = false; this.hitTimer = 0; this.deathElapsed = 0;
    this.leanX = 0; this.leanZ = 0; this.rollZ = 0; this.bobY = 0; this.scaleY = 1; this.scaleXZ = 1;
    this.wrapper.position.set(0, 0, 0); this.wrapper.rotation.set(0, 0, 0); this.wrapper.scale.set(1, 1, 1);
  }

  startWindup(isTier3 = false) {
    this.externalWindup = true; this.castState = isTier3 ? 'CHARGE' : 'WINDUP';
    this.castT = 0; this.castDur = isTier3 ? 0.25 : 0.10;
  }

  triggerSnap() { this.externalWindup = false; this.castState = 'SNAP'; this.castT = 0; this.castDur = 0.08; }
  cancelCast() { this.externalWindup = false; this.castState = 'NONE'; }

  triggerAttack(isTier3 = false) {
    this.externalWindup = false; this.castState = isTier3 ? 'CHARGE' : 'WINDUP';
    this.castT = 0; this.castDur = isTier3 ? 0.25 : 0.10;
  }

  triggerHit(dirX = 0, dirZ = 0) {
    const len = Math.hypot(dirX, dirZ) || 1;
    this.hitDirX = dirX / len; this.hitDirZ = dirZ / len; this.hitTimer = this.hitDur;
  }

  updateDeath(dt) {
    this.deathElapsed += dt;
    const e = easeOutCubic(this.deathElapsed / 0.5);
    this.wrapper.rotation.set(-DEG80 * e, 0, 0);
    this.wrapper.position.set(0, (-0.2 / HERO_VISUAL_SCALE) * e, 0);
    this.wrapper.scale.set(1, 1, 1);
  }

  update(dt, isMoving = false, moveX = 0, moveZ = 0, isDashing = false) {
    if (this.actor.isDead) { this.updateDeath(dt); return; }

    const damp = 1 - Math.exp(-16 * dt);
    let tBob = 0, tLeanX = 0, tLeanZ = 0, tRollZ = 0, tScaleY = 1, tScaleXZ = 1;

    if (isMoving && !isDashing) {
      const base = this.actor.baseSpeed || PLAYER_BASE.MOVE_SPEED;
      const speedRatio = clamp01((this.actor.speed || base) / base) || 1;
      this.stepPhase += dt * Math.PI * 2 * speedRatio;
      const s = Math.sin(this.stepPhase), absS = Math.abs(s);
      tBob = absS * (0.1 / HERO_VISUAL_SCALE);
      const footfall = Math.max(0, 1 - absS * 4);
      tScaleY = 1 - 0.04 * footfall; tScaleXZ = 1 + 0.02 * footfall; tRollZ = s * DEG3;
      const mLen = Math.hypot(moveX, moveZ);
      if (mLen > 0.01) {
        const nx = moveX / mLen, nz = moveZ / mLen, ang = this.actor.visualMesh.rotation.y;
        tLeanX = (nx * Math.sin(ang) + nz * Math.cos(ang)) * DEG8;
        tLeanZ = -(nx * Math.cos(ang) - nz * Math.sin(ang)) * DEG8;
      }
    } else {
      this.idleTime += dt;
      const breath = Math.sin(this.idleTime * Math.PI);
      tScaleY = 1 + 0.015 * breath;
      tBob = (0.005 / HERO_VISUAL_SCALE) * (1 + breath);
    }

    this.bobY = THREE.MathUtils.lerp(this.bobY, tBob, damp);
    this.leanX = THREE.MathUtils.lerp(this.leanX, tLeanX, damp);
    this.leanZ = THREE.MathUtils.lerp(this.leanZ, tLeanZ, damp);
    this.rollZ = THREE.MathUtils.lerp(this.rollZ, tRollZ, damp);
    this.scaleY = THREE.MathUtils.lerp(this.scaleY, tScaleY, damp);
    this.scaleXZ = THREE.MathUtils.lerp(this.scaleXZ, tScaleXZ, damp);

    let castRotX = 0, castScaleY = 1, castScaleXZ = 1;
    if (this.castState !== 'NONE') {
      this.castT += dt;
      const p = clamp01(this.castT / (this.castDur || 0.1));
      if (this.castState === 'CHARGE') {
        const e = easeOutCubic(p);
        castRotX = -DEG5 * e; castScaleY = 1 - 0.04 * e; castScaleXZ = 1 + 0.02 * e;
        if (!this.externalWindup && p >= 1) { this.castState = 'WINDUP'; this.castT = 0; this.castDur = 0.10; }
      } else if (this.castState === 'WINDUP') {
        castRotX = -DEG10 * easeOutCubic(p);
        if (!this.externalWindup && p >= 1) { this.castState = 'SNAP'; this.castT = 0; this.castDur = 0.08; }
      } else if (this.castState === 'SNAP') {
        castRotX = THREE.MathUtils.lerp(-DEG10, DEG14, easeOutBack(p));
        castScaleY = 1 + 0.06 * easeOutCubic(p); castScaleXZ = 1 - 0.03 * easeOutCubic(p);
        if (p >= 1) { this.castState = 'RECOVER'; this.castT = 0; this.castDur = 0.20; }
      } else if (this.castState === 'RECOVER') {
        const e = 1 - easeOutCubic(p);
        castRotX = DEG14 * e; castScaleY = 1 + 0.06 * e; castScaleXZ = 1 - 0.03 * e;
        if (p >= 1) this.castState = 'NONE';
      }
    }

    let hitRotX = 0, hitRotZ = 0, hitScaleY = 1, hitScaleXZ = 1;
    if (this.hitTimer > 0) {
      this.hitTimer = Math.max(0, this.hitTimer - dt);
      const pulse = Math.sin(clamp01(1 - this.hitTimer / this.hitDur) * Math.PI);
      const ang = this.actor.visualMesh.rotation.y;
      hitRotX = (this.hitDirX * Math.sin(ang) + this.hitDirZ * Math.cos(ang)) * DEG10 * pulse;
      hitRotZ = -(this.hitDirX * Math.cos(ang) - this.hitDirZ * Math.sin(ang)) * DEG10 * pulse;
      hitScaleY = 1 - 0.10 * pulse; hitScaleXZ = 1 + 0.05 * pulse;
    }

    this.wrapper.position.set(0, this.bobY, 0);
    this.wrapper.rotation.set(this.leanX + castRotX + hitRotX, 0, this.leanZ + this.rollZ + hitRotZ);
    this.wrapper.scale.set(
      this.scaleXZ * castScaleXZ * hitScaleXZ,
      this.scaleY * castScaleY * hitScaleY,
      this.scaleXZ * castScaleXZ * hitScaleXZ
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

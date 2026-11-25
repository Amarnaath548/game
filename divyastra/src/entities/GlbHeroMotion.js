import * as THREE from 'three';
import { HERO_VISUAL_SCALE, PLAYER_BASE } from '../config/constants.js';

export const GLB_MOTION_CFG = {
  dampSpeed: 16,
  walk: {
    stepsPerSec: 3,
    hopHeight: 0.22,
    landSquashDur: 0.06,
    landScaleY: 0.88,
    landScaleXZ: 1.08,
    takeoffScaleY: 1.08,
    takeoffScaleXZ: 0.95,
    yawDeg: 10,
    leanDeg: 14,
    sideSway: 0.05,
  },
  idle: {
    breathAmp: 0.025,
    breathHz: 0.6,
    yawDeg: 3,
    yawHz: 0.3,
  },
  attack: {
    chargeDur: 0.25,
    chargePitchDeg: -5,
    chargeScaleY: 0.96,
    windupDur: 0.12,
    windupPitchDeg: -18,
    windupScaleY: 0.92,
    windupBack: 0.15,
    snapDur: 0.07,
    snapForward: 0.35,
    snapPitchDeg: 14,
    snapYawDeg: 20,
    snapScaleY: 1.1,
    recoverDur: 0.25,
    trailDur: 0.15,
    trailOpacity: 0.9,
  },
  dash: {
    leanDeg: 25,
    scaleZ: 1.25,
    scaleXY: 0.9,
    dustDur: 0.26,
    dustSpread: 0.75,
  },
  hit: {
    dur: 0.15,
    recoilDist: 0.2,
    leanDeg: 12,
    squashY: 0.85,
    squashXZ: 1.08,
  },
  death: {
    dur: 0.5,
    pitchDeg: -80,
    dropY: -0.2,
  },
};

const D2R = Math.PI / 180;
export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeOutBack = (t) => {
  const x = clamp01(t) - 1;
  return 1 + 2.70158 * x * x * x + 1.70158 * x * x;
};

let SHARED_TRAIL_GEO = null;
let SHARED_DUST_GEO = null;

function getTrailGeo() {
  if (!SHARED_TRAIL_GEO) {
    SHARED_TRAIL_GEO = new THREE.RingGeometry(0.65, 1.15, 16, 1, -0.35, Math.PI * 0.85);
    SHARED_TRAIL_GEO.rotateX(-Math.PI / 2);
  }
  return SHARED_TRAIL_GEO;
}

function getDustGeo() {
  if (!SHARED_DUST_GEO) SHARED_DUST_GEO = new THREE.DodecahedronGeometry(0.18, 0);
  return SHARED_DUST_GEO;
}

export function createAttackTrail(parent) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(getTrailGeo(), mat);
  mesh.position.set(0.1, 1.05 / HERO_VISUAL_SCALE, 0.15);
  mesh.rotation.z = 0.18;
  mesh.visible = false;
  mesh.renderOrder = 6;
  parent.add(mesh);
  return { mesh, mat, timer: 0 };
}

export function triggerAttackTrail(trail, actor) {
  if (!trail) return;
  const color = actor.currentSpell?.color ?? actor.spellSlot?.activeSpell?.color ?? actor.hero?.accentColor ?? 0xffffff;
  trail.mat.color.setHex(color);
  trail.mat.opacity = GLB_MOTION_CFG.attack.trailOpacity;
  trail.timer = GLB_MOTION_CFG.attack.trailDur;
  trail.mesh.rotation.y = -0.5;
  trail.mesh.scale.setScalar(0.85);
  trail.mesh.visible = true;
}

export function createDashDust(parent) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xe5e0d0, transparent: true, opacity: 0, depthWrite: false });
  const puffs = [];
  const geo = getDustGeo();
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    group.add(m);
    puffs.push(m);
  }
  group.position.y = 0.14;
  parent.add(group);
  return { group, mat, puffs, timer: 0 };
}

function triggerDashDust(dust) {
  if (!dust) return;
  dust.timer = GLB_MOTION_CFG.dash.dustDur;
  dust.mat.opacity = 0.75;
  for (let i = 0; i < dust.puffs.length; i++) {
    const p = dust.puffs[i];
    p.visible = true;
    p.position.set(0, 0, 0);
    p.scale.setScalar(0.6);
  }
}

function updateTrailAndDust(hero, dt) {
  const tr = hero.trail;
  if (tr && tr.timer > 0) {
    tr.timer = Math.max(0, tr.timer - dt);
    const p = 1 - tr.timer / GLB_MOTION_CFG.attack.trailDur;
    tr.mat.opacity = (1 - p) * GLB_MOTION_CFG.attack.trailOpacity;
    tr.mesh.rotation.y = -0.5 + p * 0.9;
    tr.mesh.scale.setScalar(0.85 + p * 0.35);
    if (tr.timer <= 0) tr.mesh.visible = false;
  }
  const dust = hero.dust;
  if (dust && dust.timer > 0) {
    dust.timer = Math.max(0, dust.timer - dt);
    const p = 1 - dust.timer / GLB_MOTION_CFG.dash.dustDur;
    const spread = GLB_MOTION_CFG.dash.dustSpread * easeOutCubic(p);
    dust.mat.opacity = (1 - p) * 0.75;
    const sc = 0.6 + p * 1.1;
    for (let i = 0; i < dust.puffs.length; i++) {
      const puff = dust.puffs[i];
      const angle = (i * Math.PI) * 0.5 + 0.4;
      puff.position.set(Math.cos(angle) * spread, p * 0.25, Math.sin(angle) * spread);
      puff.scale.setScalar(sc);
      if (dust.timer <= 0) puff.visible = false;
    }
  }
}

export function updateGlbMotion(hero, dt, isMoving, moveX, moveZ, isDashing) {
  const cfg = GLB_MOTION_CFG;
  const damp = 1 - Math.exp(-cfg.dampSpeed * dt);
  const isAttacking = hero.castState !== 'NONE';
  const ang = hero.actor.visualMesh.rotation.y;
  const sinA = Math.sin(ang);
  const cosA = Math.cos(ang);

  if (isDashing && !hero.wasDashing) triggerDashDust(hero.dust);
  hero.wasDashing = isDashing;

  let tBob = 0, tSwayX = 0, tLeanX = 0, tLeanZ = 0, tYaw = 0;
  let tScaleX = 1, tScaleY = 1, tScaleZ = 1;

  if (isDashing) {
    const mLen = Math.hypot(moveX, moveZ);
    const dx = mLen > 0.01 ? moveX / mLen : sinA;
    const dz = mLen > 0.01 ? moveZ / mLen : cosA;
    const dashRad = cfg.dash.leanDeg * D2R;
    tLeanX = (dx * sinA + dz * cosA) * dashRad;
    tLeanZ = -(dx * cosA - dz * sinA) * dashRad;
    tScaleX = cfg.dash.scaleXY;
    tScaleY = cfg.dash.scaleXY;
    tScaleZ = cfg.dash.scaleZ;
  } else if (isMoving && !isAttacking) {
    const base = hero.actor.baseSpeed || PLAYER_BASE.MOVE_SPEED;
    const speedRatio = clamp01((hero.actor.speed || base) / base) || 1;
    const prevStep = Math.floor(hero.stepPhase / Math.PI);
    hero.stepPhase += dt * Math.PI * cfg.walk.stepsPerSec * speedRatio;
    if (Math.floor(hero.stepPhase / Math.PI) > prevStep) {
      hero.landSquashTimer = cfg.walk.landSquashDur;
    }

    const s = Math.sin(hero.stepPhase);
    const absS = Math.abs(s);
    tBob = absS * (cfg.walk.hopHeight / HERO_VISUAL_SCALE);
    tSwayX = s * (cfg.walk.sideSway / HERO_VISUAL_SCALE);
    tYaw = s * (cfg.walk.yawDeg * D2R);

    if (hero.landSquashTimer > 0) {
      hero.landSquashTimer = Math.max(0, hero.landSquashTimer - dt);
      tScaleY = cfg.walk.landScaleY;
      tScaleX = cfg.walk.landScaleXZ;
      tScaleZ = cfg.walk.landScaleXZ;
    } else {
      const stretch = clamp01(absS * 1.4);
      tScaleY = 1 + (cfg.walk.takeoffScaleY - 1) * stretch;
      const xz = 1 + (cfg.walk.takeoffScaleXZ - 1) * stretch;
      tScaleX = xz;
      tScaleZ = xz;
    }

    const mLen = Math.hypot(moveX, moveZ);
    if (mLen > 0.01) {
      const nx = moveX / mLen;
      const nz = moveZ / mLen;
      const leanRad = cfg.walk.leanDeg * D2R * speedRatio;
      tLeanX = (nx * sinA + nz * cosA) * leanRad;
      tLeanZ = -(nx * cosA - nz * sinA) * leanRad;
    }
  } else if (!isAttacking) {
    hero.idleTime += dt;
    const breath = Math.sin(hero.idleTime * Math.PI * 2 * cfg.idle.breathHz);
    tScaleY = 1 + cfg.idle.breathAmp * breath;
    tYaw = Math.sin(hero.idleTime * Math.PI * 2 * cfg.idle.yawHz) * (cfg.idle.yawDeg * D2R);
  }

  const scaleDamp = hero.landSquashTimer > 0 ? 1 : damp;
  hero.bobY = THREE.MathUtils.lerp(hero.bobY, tBob, damp);
  hero.swayX = THREE.MathUtils.lerp(hero.swayX, tSwayX, damp);
  hero.leanX = THREE.MathUtils.lerp(hero.leanX, tLeanX, damp);
  hero.leanZ = THREE.MathUtils.lerp(hero.leanZ, tLeanZ, damp);
  hero.yawY = THREE.MathUtils.lerp(hero.yawY, tYaw, damp);
  hero.scaleX = THREE.MathUtils.lerp(hero.scaleX, tScaleX, scaleDamp);
  hero.scaleY = THREE.MathUtils.lerp(hero.scaleY, tScaleY, scaleDamp);
  hero.scaleZ = THREE.MathUtils.lerp(hero.scaleZ, tScaleZ, scaleDamp);

  let castPitch = 0, castYaw = 0, castPosZ = 0, castScaleY = 1, castScaleXZ = 1;
  if (isAttacking) {
    hero.castT += dt;
    const p = clamp01(hero.castT / (hero.castDur || 0.1));
    const ac = cfg.attack;
    if (hero.castState === 'CHARGE') {
      const e = easeOutCubic(p);
      castPitch = ac.chargePitchDeg * D2R * e;
      castScaleY = 1 + (ac.chargeScaleY - 1) * e;
      castScaleXZ = 1 + (1 - ac.chargeScaleY) * 0.5 * e;
      if (!hero.externalWindup && p >= 1) {
        hero.castState = 'WINDUP'; hero.castT = 0; hero.castDur = ac.windupDur;
      }
    } else if (hero.castState === 'WINDUP') {
      const e = easeOutCubic(p);
      castPitch = ac.windupPitchDeg * D2R * e;
      castScaleY = 1 + (ac.windupScaleY - 1) * e;
      castScaleXZ = 1 + (1 - ac.windupScaleY) * 0.5 * e;
      castPosZ = -(ac.windupBack / HERO_VISUAL_SCALE) * e;
      if (!hero.externalWindup && p >= 1) {
        hero.castState = 'SNAP'; hero.castT = 0; hero.castDur = ac.snapDur;
        triggerAttackTrail(hero.trail, hero.actor);
      }
    } else if (hero.castState === 'SNAP') {
      const e = easeOutCubic(p);
      castPitch = THREE.MathUtils.lerp(ac.windupPitchDeg * D2R, ac.snapPitchDeg * D2R, e);
      castYaw = ac.snapYawDeg * D2R * e;
      castPosZ = THREE.MathUtils.lerp(-ac.windupBack / HERO_VISUAL_SCALE, ac.snapForward / HERO_VISUAL_SCALE, e);
      castScaleY = THREE.MathUtils.lerp(ac.windupScaleY, ac.snapScaleY, e);
      castScaleXZ = 1 - (castScaleY - 1) * 0.45;
      if (p >= 1) {
        hero.castState = 'RECOVER'; hero.castT = 0; hero.castDur = ac.recoverDur;
      }
    } else if (hero.castState === 'RECOVER') {
      const e = 1 - easeOutBack(p);
      castPitch = ac.snapPitchDeg * D2R * e;
      castYaw = ac.snapYawDeg * D2R * e;
      castPosZ = (ac.snapForward / HERO_VISUAL_SCALE) * e;
      castScaleY = 1 + (ac.snapScaleY - 1) * e;
      castScaleXZ = 1 - (castScaleY - 1) * 0.45;
      if (p >= 1) hero.castState = 'NONE';
    }
  }

  let hitX = 0, hitZ = 0, hitRotX = 0, hitRotZ = 0, hitScaleY = 1, hitScaleXZ = 1;
  if (hero.hitTimer > 0) {
    hero.hitTimer = Math.max(0, hero.hitTimer - dt);
    const pulse = Math.sin(clamp01(1 - hero.hitTimer / cfg.hit.dur) * Math.PI);
    const lx = hero.hitDirX * cosA - hero.hitDirZ * sinA;
    const lz = hero.hitDirX * sinA + hero.hitDirZ * cosA;
    const recoil = (cfg.hit.recoilDist / HERO_VISUAL_SCALE) * pulse;
    hitX = -lx * recoil;
    hitZ = -lz * recoil;
    const hitRad = cfg.hit.leanDeg * D2R * pulse;
    hitRotX = (hero.hitDirX * sinA + hero.hitDirZ * cosA) * hitRad;
    hitRotZ = -(hero.hitDirX * cosA - hero.hitDirZ * sinA) * hitRad;
    hitScaleY = 1 + (cfg.hit.squashY - 1) * pulse;
    hitScaleXZ = 1 + (cfg.hit.squashXZ - 1) * pulse;
  }

  updateTrailAndDust(hero, dt);

  hero.wrapper.position.set(hero.swayX + hitX, hero.bobY, castPosZ + hitZ);
  hero.wrapper.rotation.set(hero.leanX + castPitch + hitRotX, hero.yawY + castYaw, hero.leanZ + hitRotZ);
  hero.wrapper.scale.set(
    hero.scaleX * castScaleXZ * hitScaleXZ,
    hero.scaleY * castScaleY * hitScaleY,
    hero.scaleZ * castScaleXZ * hitScaleXZ
  );
}

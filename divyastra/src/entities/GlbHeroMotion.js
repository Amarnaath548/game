import * as THREE from 'three';
import { HERO_VISUAL_SCALE, PLAYER_BASE } from '../config/constants.js';

const D2R = THREE.MathUtils.degToRad;
export const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeOutBack = (t) => { const x = clamp01(t) - 1; return 1 + 2.70158 * x * x * x + 1.70158 * x * x; };

export const MOTION_CONFIG = {
  dampRate: 16,
  walk: {
    stepsPerSec: 3,
    hopHeight: 0.22,
    landSquashY: 0.88,
    landSquashXZ: 1.08,
    landDuration: 0.06,
    takeoffStretchY: 1.08,
    takeoffStretchXZ: 0.95,
    yawRockRad: D2R(10),
    forwardLeanRad: D2R(14),
    sideSway: 0.05
  },
  idle: {
    breathAmp: 0.025,
    breathHz: 0.6,
    yawSwayRad: D2R(3),
    yawSwayHz: 0.35
  },
  attack: {
    chargeDur: 0.25,
    windupDur: 0.12,
    windupBackRad: D2R(18),
    windupScaleY: 0.92,
    windupBackOffset: 0.15,
    snapDur: 0.07,
    snapFwdOffset: 0.35,
    snapPitchRad: D2R(14),
    snapYawRad: D2R(20),
    snapScaleY: 1.1,
    recoverDur: 0.25,
    trailDuration: 0.15
  },
  dash: {
    leanRad: D2R(25),
    stretchZ: 1.25,
    stretchXY: 0.9,
    dustDuration: 0.28
  },
  hit: {
    duration: 0.15,
    recoilDist: 0.2,
    leanRad: D2R(12),
    squashY: 0.86,
    squashXZ: 1.08
  },
  death: {
    duration: 0.5,
    dropY: 0.2,
    pitchRad: D2R(80)
  }
};

export function createCastTrail(parent) {
  const geo = new THREE.RingGeometry(0.45, 0.95, 16, 1, -0.45, 1.7);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffaa44,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(0.28, 1.05 / HERO_VISUAL_SCALE, 0.15);
  mesh.visible = false;
  mesh.renderOrder = 4;
  parent.add(mesh);
  return { mesh, mat };
}

export function createDashDust(scene) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.18, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xe7dfd0,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const puffs = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(geo, mat);
    const a = (i / 4) * Math.PI * 2 + 0.4;
    m.userData.dx = Math.cos(a);
    m.userData.dz = Math.sin(a);
    group.add(m);
    puffs.push(m);
  }
  group.visible = false;
  if (scene) scene.add(group);
  return { group, mat, puffs };
}

export function computeWalkTarget(hero, dt, moveX, moveZ, out) {
  const cfg = MOTION_CONFIG.walk;
  const base = hero.actor.baseSpeed || PLAYER_BASE.MOVE_SPEED;
  const speedRatio = clamp01((hero.actor.speed || base) / base) || 1;
  const prevStep = Math.floor(hero.stepPhase / Math.PI);
  hero.stepPhase += dt * Math.PI * cfg.stepsPerSec * speedRatio;
  if (Math.floor(hero.stepPhase / Math.PI) !== prevStep) {
    hero.landTimer = cfg.landDuration;
  }

  const s = Math.sin(hero.stepPhase);
  const absS = Math.abs(s);
  out.bobY = absS * (cfg.hopHeight / HERO_VISUAL_SCALE);
  out.swayX = s * (cfg.sideSway / HERO_VISUAL_SCALE);
  out.yawY = s * cfg.yawRockRad;

  if (hero.landTimer > 0) {
    hero.landTimer = Math.max(0, hero.landTimer - dt);
    out.scaleY = cfg.landSquashY;
    out.scaleXZ = cfg.landSquashXZ;
  } else {
    const stretch = clamp01((absS - 0.15) * 1.4);
    out.scaleY = THREE.MathUtils.lerp(1, cfg.takeoffStretchY, stretch);
    out.scaleXZ = THREE.MathUtils.lerp(1, cfg.takeoffStretchXZ, stretch);
  }

  const mLen = Math.hypot(moveX, moveZ);
  if (mLen > 0.01) {
    const nx = moveX / mLen, nz = moveZ / mLen;
    const ang = hero.actor.visualMesh.rotation.y;
    const lean = cfg.forwardLeanRad * speedRatio;
    out.leanX = (nx * Math.sin(ang) + nz * Math.cos(ang)) * lean;
    out.leanZ = -(nx * Math.cos(ang) - nz * Math.sin(ang)) * lean;
  }
}

export function computeIdleTarget(hero, dt, out) {
  const cfg = MOTION_CONFIG.idle;
  hero.idleTime += dt;
  const breath = Math.sin(hero.idleTime * Math.PI * 2 * cfg.breathHz);
  out.scaleY = 1 + cfg.breathAmp * breath;
  out.yawY = Math.sin(hero.idleTime * Math.PI * 2 * cfg.yawSwayHz) * cfg.yawSwayRad;
}

export function computeCastOffset(hero, dt, out) {
  out.posZ = 0; out.rotX = 0; out.rotY = 0; out.scaleY = 1; out.scaleXZ = 1;
  if (hero.castState === 'NONE') return;

  const cfg = MOTION_CONFIG.attack;
  hero.castT += dt;
  const p = clamp01(hero.castT / (hero.castDur || 0.1));
  const invScale = 1 / HERO_VISUAL_SCALE;

  if (hero.castState === 'CHARGE') {
    const e = easeOutCubic(p);
    out.rotX = -cfg.windupBackRad * 0.5 * e;
    out.scaleY = THREE.MathUtils.lerp(1, cfg.windupScaleY, e * 0.5);
    out.posZ = -cfg.windupBackOffset * 0.5 * invScale * e;
    if (!hero.externalWindup && p >= 1) {
      hero.castState = 'WINDUP'; hero.castT = 0; hero.castDur = cfg.windupDur;
    }
  } else if (hero.castState === 'WINDUP') {
    const e = easeOutCubic(p);
    out.rotX = -cfg.windupBackRad * e;
    out.scaleY = THREE.MathUtils.lerp(1, cfg.windupScaleY, e);
    out.posZ = -cfg.windupBackOffset * invScale * e;
    if (!hero.externalWindup && p >= 1) {
      hero.triggerSnap();
    }
  } else if (hero.castState === 'SNAP') {
    const e = easeOutCubic(p);
    out.posZ = THREE.MathUtils.lerp(-cfg.windupBackOffset, cfg.snapFwdOffset, e) * invScale;
    out.rotX = THREE.MathUtils.lerp(-cfg.windupBackRad, cfg.snapPitchRad, e);
    out.rotY = cfg.snapYawRad * e;
    out.scaleY = THREE.MathUtils.lerp(cfg.windupScaleY, cfg.snapScaleY, e);
    if (p >= 1) {
      hero.castState = 'RECOVER'; hero.castT = 0; hero.castDur = cfg.recoverDur;
    }
  } else if (hero.castState === 'RECOVER') {
    const e = 1 - easeOutBack(p);
    out.posZ = cfg.snapFwdOffset * invScale * e;
    out.rotX = cfg.snapPitchRad * e;
    out.rotY = cfg.snapYawRad * e;
    out.scaleY = THREE.MathUtils.lerp(1, cfg.snapScaleY, e);
    if (p >= 1) hero.castState = 'NONE';
  }
  out.scaleXZ = 1 / Math.sqrt(Math.max(0.5, out.scaleY));
}

export function computeHitOffset(hero, dt, out) {
  out.posX = 0; out.posZ = 0; out.rotX = 0; out.rotZ = 0; out.scaleY = 1; out.scaleXZ = 1;
  if (hero.hitTimer <= 0) return;

  const cfg = MOTION_CONFIG.hit;
  hero.hitTimer = Math.max(0, hero.hitTimer - dt);
  const pulse = Math.sin(clamp01(1 - hero.hitTimer / cfg.duration) * Math.PI);
  const ang = hero.actor.visualMesh.rotation.y;
  const localX = hero.hitDirX * Math.cos(ang) - hero.hitDirZ * Math.sin(ang);
  const localZ = hero.hitDirX * Math.sin(ang) + hero.hitDirZ * Math.cos(ang);
  const dist = (cfg.recoilDist / HERO_VISUAL_SCALE) * pulse;

  out.posX = localX * dist;
  out.posZ = localZ * dist;
  out.rotX = localZ * cfg.leanRad * pulse;
  out.rotZ = -localX * cfg.leanRad * pulse;
  out.scaleY = THREE.MathUtils.lerp(1, cfg.squashY, pulse);
  out.scaleXZ = THREE.MathUtils.lerp(1, cfg.squashXZ, pulse);
}

export function updateTrailAndDust(hero, dt) {
  if (hero.trailTimer > 0) {
    hero.trailTimer = Math.max(0, hero.trailTimer - dt);
    const p = 1 - hero.trailTimer / MOTION_CONFIG.attack.trailDuration;
    hero.trail.mat.opacity = 0.9 * (1 - p);
    hero.trail.mesh.rotation.y = -0.35 + p * 1.45;
    if (hero.trailTimer <= 0) hero.trail.mesh.visible = false;
  }

  if (hero.dustTimer > 0) {
    hero.dustTimer = Math.max(0, hero.dustTimer - dt);
    const p = 1 - hero.dustTimer / MOTION_CONFIG.dash.dustDuration;
    hero.dust.mat.opacity = 0.65 * (1 - p);
    const spread = 0.15 + p * 0.75;
    const sc = 0.9 * (1 - p * 0.45);
    for (let i = 0; i < hero.dust.puffs.length; i++) {
      const puff = hero.dust.puffs[i];
      puff.position.set(puff.userData.dx * spread, p * 0.3, puff.userData.dz * spread);
      puff.scale.setScalar(sc);
    }
    if (hero.dustTimer <= 0) hero.dust.group.visible = false;
  }
}

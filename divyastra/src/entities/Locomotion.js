import { PLAYER_BASE } from '../config/constants.js';

const TWO_PI = Math.PI * 2;
const RAD_TO_DEG = 180 / Math.PI;
const LEAN_RAD = (6 * Math.PI) / 180;
const YAW_OFFSET_RATE = 12;
const LEAN_RATE = LEAN_RAD / 0.12;
const TURN_MOVE_RATE = 14;
const TURN_AIM_RATE = 22;
const POST_CAST_HOLD = 0.4;

export function wrapAngle(a) {
  while (a > Math.PI) a -= TWO_PI;
  while (a < -Math.PI) a += TWO_PI;
  return a;
}

export function turnToward(current, target, maxSpeed, dt) {
  const diff = wrapAngle(target - current);
  const step = maxSpeed * dt;
  if (Math.abs(diff) <= step) return wrapAngle(target);
  return wrapAngle(current + Math.sign(diff) * step);
}

function moveToward(current, target, maxStep) {
  const diff = target - current;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

export function snapFaceYaw(actor, yaw) {
  actor.faceYaw = wrapAngle(yaw);
  actor.visualMesh.rotation.y = actor.faceYaw;
}

/**
 * Updates actor.faceYaw for rigged GLB heroes based on aiming, casting, and movement.
 */
export function updateActorFacing(actor, dt, moveX, moveZ, aimX, aimZ, isAiming, realSpeed) {
  const isCasting = !!(actor.glbHero?.isCasting || actor.castTimer > 0);
  if (isCasting) {
    actor.postCastTimer = POST_CAST_HOLD;
  } else if (actor.postCastTimer > 0) {
    actor.postCastTimer = Math.max(0, actor.postCastTimer - dt);
  }

  const hasAim = (aimX * aimX + aimZ * aimZ) > 0.0001;
  const hasMove = (moveX * moveX + moveZ * moveZ) > 0.0001;
  const combatAim = isAiming || isCasting || actor.postCastTimer > 0;

  if (combatAim && hasAim) {
    actor.faceYaw = turnToward(actor.faceYaw || 0, Math.atan2(aimX, aimZ), TURN_AIM_RATE, dt);
  } else if (!combatAim && realSpeed > 0.5 && hasMove) {
    actor.faceYaw = turnToward(actor.faceYaw || 0, Math.atan2(moveX, moveZ), TURN_MOVE_RATE, dt);
  }

  actor.visualMesh.rotation.y = actor.faceYaw || 0;
}

export function initLocomotionState(heroCtrl) {
  heroCtrl.wrapper.rotation.order = 'YXZ';
  heroCtrl.loco = { yawOffset: 0, leanX: 0, leanZ: 0, timeScale: 1 };
}

export function resetLocomotionOffsets(heroCtrl) {
  if (!heroCtrl.loco) return;
  heroCtrl.loco.yawOffset = 0;
  heroCtrl.loco.leanX = 0;
  heroCtrl.loco.leanZ = 0;
  heroCtrl.wrapper.rotation.set(0, 0, 0);
}

export function resetLocomotionState(heroCtrl) {
  resetLocomotionOffsets(heroCtrl);
  if (heroCtrl.loco) heroCtrl.loco.timeScale = 1;
}

/**
 * Updates strafe yaw twist, directional lean, and smooth run timeScale for rigged GLB heroes.
 */
export function updateRiggedLocomotion(heroCtrl, dt, isMoving, moveX, moveZ, isDashing) {
  const loco = heroCtrl.loco;
  if (!loco) return;

  const actor = heroCtrl.actor;
  const base = actor.baseSpeed || PLAYER_BASE.MOVE_SPEED;
  const moveMag = Math.min(1, Math.hypot(moveX, moveZ));
  const realSpeed = isDashing ? PLAYER_BASE.DASH_SPEED : (isMoving ? moveMag * (actor.speed || 0) : 0);
  const rawRatio = isDashing ? 1.6 : (realSpeed / base);
  const speedRatio = rawRatio < 0.5 ? 0.5 : (rawRatio > 1.6 ? 1.6 : rawRatio);

  let targetYawOffset = 0;
  let targetLeanX = 0;
  let targetLeanZ = 0;
  let targetTimeScale = speedRatio;

  if (isMoving && !isDashing && !heroCtrl.isCasting && moveMag > 0.01) {
    const moveYaw = Math.atan2(moveX, moveZ);
    const delta = wrapAngle(moveYaw - (actor.faceYaw || 0));
    const absDeg = Math.abs(delta) * RAD_TO_DEG;

    if (absDeg <= 50) {
      targetTimeScale = speedRatio;
    } else if (absDeg <= 130) {
      targetYawOffset = delta * 0.5;
      targetLeanZ = -Math.sign(delta) * LEAN_RAD;
      targetTimeScale = speedRatio;
    } else {
      targetLeanX = -LEAN_RAD;
      targetTimeScale = -0.8 * speedRatio;
    }
  }

  const yawRate = heroCtrl.isCasting ? TURN_AIM_RATE : YAW_OFFSET_RATE;
  loco.yawOffset = moveToward(loco.yawOffset, targetYawOffset, yawRate * dt);
  loco.leanX = moveToward(loco.leanX, targetLeanX, LEAN_RATE * dt);
  loco.leanZ = moveToward(loco.leanZ, targetLeanZ, LEAN_RATE * dt);

  if (heroCtrl.currentState !== 'run') {
    loco.timeScale = targetTimeScale;
  } else {
    const span = Math.abs(targetTimeScale - loco.timeScale);
    const maxStep = span > 0.0001
      ? Math.max(8, span / 0.1) * Math.min(0.045, dt)
      : 0;
    loco.timeScale = moveToward(loco.timeScale, targetTimeScale, maxStep);
  }

  heroCtrl.wrapper.rotation.y = loco.yawOffset;
  heroCtrl.wrapper.rotation.x = loco.leanX;
  heroCtrl.wrapper.rotation.z = loco.leanZ;

  if (heroCtrl.actions.run) {
    heroCtrl.actions.run.setEffectiveTimeScale(loco.timeScale);
  }
}

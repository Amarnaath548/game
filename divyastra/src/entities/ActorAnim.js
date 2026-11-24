import * as THREE from 'three';

/**
 * Handles limb walk-cycle sway and movement lean for actors.
 */
export function setActorWobble(actor, isMoving, dt, moveX = 0, moveZ = 0, isDashing = false) {
  let targetLeanX = 0, targetLeanZ = 0;
  if (isMoving && !isDashing) {
    actor.walkTime += dt * 14;
    actor.visualMesh.position.y = Math.abs(Math.sin(actor.walkTime)) * 0.28;
    actor.wobbleZ = Math.sin(actor.walkTime) * 0.08;
    if (actor.leftLeg && actor.rightLeg) {
      actor.leftLeg.rotation.x = Math.sin(actor.walkTime) * 0.45;
      actor.rightLeg.rotation.x = -Math.sin(actor.walkTime) * 0.45;
    }
    if (actor.leftArm && actor.punchTimer <= 0 && actor.castTimer <= 0) {
      actor.leftArm.rotation.x = -Math.sin(actor.walkTime) * 0.35;
    }
    if (actor.headGroup) actor.headGroup.rotation.y = Math.sin(actor.walkTime * 0.5) * 0.08;
    const len = Math.hypot(moveX, moveZ);
    if (len > 0.01) {
      const nx = moveX / len, nz = moveZ / len, ang = actor.visualMesh.rotation.y;
      targetLeanX = (nx * Math.sin(ang) + nz * Math.cos(ang)) * 0.12;
      targetLeanZ = -(nx * Math.cos(ang) - nz * Math.sin(ang)) * 0.12;
    }
  } else {
    actor.visualMesh.position.y = THREE.MathUtils.lerp(actor.visualMesh.position.y, 0, 0.2);
    actor.wobbleZ = THREE.MathUtils.lerp(actor.wobbleZ || 0, 0, 0.2);
    if (actor.leftLeg && actor.rightLeg) {
      actor.leftLeg.rotation.x = THREE.MathUtils.lerp(actor.leftLeg.rotation.x, 0, 0.2);
      actor.rightLeg.rotation.x = THREE.MathUtils.lerp(actor.rightLeg.rotation.x, 0, 0.2);
    }
    if (actor.leftArm && actor.punchTimer <= 0 && actor.castTimer <= 0) {
      actor.leftArm.rotation.x = THREE.MathUtils.lerp(actor.leftArm.rotation.x, 0, 0.2);
    }
    if (actor.headGroup) actor.headGroup.rotation.y = THREE.MathUtils.lerp(actor.headGroup.rotation.y || 0, 0, 0.2);
  }
  actor.leanX = THREE.MathUtils.lerp(actor.leanX || 0, targetLeanX, 0.15);
  actor.leanZ = THREE.MathUtils.lerp(actor.leanZ || 0, targetLeanZ, 0.15);
  actor.visualMesh.rotation.x = actor.leanX;
  actor.visualMesh.rotation.z = (actor.wobbleZ || 0) + actor.leanZ;
}

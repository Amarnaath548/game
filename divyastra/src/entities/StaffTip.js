import * as THREE from 'three';

const _v = new THREE.Vector3();
const _best = new THREE.Vector3();
const _handObj = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _defaultOut = new THREE.Vector3();
const MAX_TIP_DIST_SQ = 2.5 * 2.5;
const _loggedHeroes = new Set();

/**
 * Finds the staff-side hand bone on a rigged model and attaches a "staffTip"
 * Object3D at the weighted (>0.9) vertex with the highest Y in rest-pose object space.
 */
export function attachStaffTip(actor, rawModel) {
  actor.staffTip = null;
  const skinnedMeshes = [];
  rawModel.traverse((c) => {
    if (c.isSkinnedMesh && c.skeleton && c.geometry?.attributes?.skinIndex && c.geometry?.attributes?.skinWeight) {
      skinnedMeshes.push(c);
    }
  });
  if (skinnedMeshes.length === 0) return null;

  const handCounts = new Map();
  for (const mesh of skinnedMeshes) {
    const bones = mesh.skeleton.bones;
    const si = mesh.geometry.attributes.skinIndex;
    const sw = mesh.geometry.attributes.skinWeight;
    const vCount = si.count;
    for (let v = 0; v < vCount; v++) {
      for (let k = 0; k < 4; k++) {
        const w = k === 0 ? sw.getX(v) : k === 1 ? sw.getY(v) : k === 2 ? sw.getZ(v) : sw.getW(v);
        if (w <= 0.9) continue;
        const bi = k === 0 ? si.getX(v) : k === 1 ? si.getY(v) : k === 2 ? si.getZ(v) : si.getW(v);
        const bone = bones[bi];
        if (bone && /hand/i.test(bone.name)) {
          handCounts.set(bone, (handCounts.get(bone) || 0) + 1);
        }
      }
    }
  }

  let bestBone = null;
  let maxCount = 0;
  for (const [bone, count] of handCounts) {
    if (count > maxCount) {
      maxCount = count;
      bestBone = bone;
    }
  }
  if (!bestBone) return null;

  let maxY = -Infinity;
  let bestBoneInv = null;
  _best.set(0, 0, 0);

  for (const mesh of skinnedMeshes) {
    const bones = mesh.skeleton.bones;
    const boneIdx = bones.indexOf(bestBone);
    if (boneIdx < 0) continue;
    const pos = mesh.geometry.attributes.position;
    const si = mesh.geometry.attributes.skinIndex;
    const sw = mesh.geometry.attributes.skinWeight;
    const boneInv = mesh.skeleton.boneInverses[boneIdx];

    for (let v = 0; v < pos.count; v++) {
      let matched = false;
      for (let k = 0; k < 4; k++) {
        const bi = k === 0 ? si.getX(v) : k === 1 ? si.getY(v) : k === 2 ? si.getZ(v) : si.getW(v);
        const w = k === 0 ? sw.getX(v) : k === 1 ? sw.getY(v) : k === 2 ? sw.getZ(v) : sw.getW(v);
        if (bi === boneIdx && w > 0.9) { matched = true; break; }
      }
      if (!matched) continue;
      _v.fromBufferAttribute(pos, v).applyMatrix4(mesh.bindMatrix);
      if (_v.y > maxY) {
        maxY = _v.y;
        bestBoneInv = boneInv;
        _best.copy(_v).applyMatrix4(boneInv);
      }
    }
  }

  if (!bestBoneInv) return null;

  const tip = new THREE.Object3D();
  tip.name = 'staffTip';
  tip.position.copy(_best);
  bestBone.add(tip);
  actor.staffTip = tip;

  _m.copy(bestBoneInv).invert();
  _handObj.set(0, 0, 0).applyMatrix4(_m);
  const heightAboveHand = maxY - _handObj.y;
  const heroKey = actor?.hero?.id || actor?.heroDef?.id || actor?.heroId || actor?.name || rawModel?.name || 'hero';
  if (!_loggedHeroes.has(heroKey)) {
    _loggedHeroes.add(heroKey);
    console.info(
      `[StaffTip] ${heroKey} (${bestBone.name}) offset=(${_best.x.toFixed(3)}, ${_best.y.toFixed(3)}, ${_best.z.toFixed(3)}) heightAboveHand=${heightAboveHand.toFixed(3)}`
    );
  }
  return tip;
}

/**
 * Computes world-space staff tip position into outVec3 with zero allocations.
 * Falls back to actor position + 1.2 up + 0.6 forward when no rigged tip exists.
 */
export function getActorStaffTipWorld(actor, outVec3 = _defaultOut) {
  if (actor?.staffTip) {
    actor.staffTip.getWorldPosition(outVec3);
    return outVec3;
  }
  const yaw = actor?.visualMesh ? actor.visualMesh.rotation.y : 0;
  const x = actor?.x || 0;
  const z = actor?.z || 0;
  outVec3.set(x + Math.sin(yaw) * 0.6, 1.2, z + Math.cos(yaw) * 0.6);
  return outVec3;
}

/**
 * Resolves staff tip spawn position, falling back to body centre if > 2.5u away.
 */
export function resolveTipSpawn(actor, outVec3 = _defaultOut) {
  getActorStaffTipWorld(actor, outVec3);
  const dx = outVec3.x - actor.x;
  const dy = outVec3.y - 1.2;
  const dz = outVec3.z - actor.z;
  if (dx * dx + dy * dy + dz * dz > MAX_TIP_DIST_SQ) {
    outVec3.set(actor.x, 1.2, actor.z);
  }
  return outVec3;
}

/**
 * Sets tip spawn coordinates, re-aims projectile trajectories from the tip,
 * and triggers muzzle flash/burst/ring VFX at the tip.
 */
export function prepareTipPayloads(owner, payloads, aimDir, castWindup, particleSys) {
  resolveTipSpawn(owner, _v);
  const first = payloads[0];
  if (!first || first.trajectory === 'MELEE' || first.trajectory === 'SELF_DASH') return;
  if (owner.visible && owner.group.visible) {
    const col = first.color || 0xf97316, isT3 = first.tier === 3;
    castWindup?.triggerMuzzleFlash(_v.x, _v.y, _v.z, col, isT3);
    const ax = aimDir?.x ?? first.dirX ?? 0, az = aimDir?.z ?? first.dirZ ?? 1;
    particleSys?.spawnMuzzleBurst(_v.x, _v.y, _v.z, ax, az, col, 7, first.elements);
    if (isT3) particleSys?.spawnRing(_v.x, _v.z, col, 2.2, 0.22, _v.y);
  }
  for (const p of payloads) {
    if (p.trajectory !== 'LINEAR' && p.trajectory !== 'SPREAD' && p.trajectory !== 'LOBBED') continue;
    const rng = p.range || 24;
    const dx = (owner.x + p.dirX * rng) - _v.x;
    const dz = (owner.z + p.dirZ * rng) - _v.z;
    const dist = Math.hypot(dx, dz) || 1;
    p.tipX = _v.x; p.tipY = _v.y; p.tipZ = _v.z;
    p.dirX = dx / dist; p.dirZ = dz / dist; p.range = dist;
  }
}

import * as THREE from 'three';

const _dummy = new THREE.Object3D();

export function registerTreeMesh(map, mesh, items) {
  if (!map || !mesh || !items?.length) return;
  if (!map.treeOcclusionGroups) map.treeOcclusionGroups = [];
  const count = items.length;
  const xs = new Float32Array(count);
  const zs = new Float32Array(count);
  const sxs = new Float32Array(count);
  const sys = new Float32Array(count);
  const szs = new Float32Array(count);
  const rys = new Float32Array(count);
  const currentH = new Float32Array(count);
  const targetH = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const it = items[i];
    xs[i] = it.x;
    zs[i] = it.z;
    sxs[i] = it.sx;
    sys[i] = it.sy;
    szs[i] = it.sz;
    rys[i] = it.ry || 0;
    currentH[i] = 1.0;
    targetH[i] = 1.0;
  }

  map.treeOcclusionGroups.push({
    mesh, count, xs, zs, sxs, sys, szs, rys, currentH, targetH
  });
}

export function updateTreeOcclusion(map, playerPos, cameraPos, dt = 0.016) {
  if (!map?.treeOcclusionGroups || !playerPos || !cameraPos) return;

  map._treeFrame = (map._treeFrame || 0) + 1;
  const checkDist = (map._treeFrame % 2 === 0);

  const px = playerPos.x;
  const pz = playerPos.z;
  const vx = cameraPos.x - px;
  const vz = cameraPos.z - pz;
  const groups = map.treeOcclusionGroups;
  const lerpSpeed = Math.min(1.0, dt * 10);

  for (let g = 0; g < groups.length; g++) {
    const grp = groups[g];
    const count = grp.count;
    const xs = grp.xs;
    const zs = grp.zs;
    const sxs = grp.sxs;
    const sys = grp.sys;
    const szs = grp.szs;
    const rys = grp.rys;
    const currentH = grp.currentH;
    const targetH = grp.targetH;
    const mesh = grp.mesh;
    let needsUpdate = false;

    for (let i = 0; i < count; i++) {
      if (checkDist) {
        const dx = xs[i] - px;
        const dz = zs[i] - pz;
        const distSq = dx * dx + dz * dz;
        if (distSq <= 64 && (dx * vx + dz * vz) > 0) {
          targetH[i] = 0.3;
        } else {
          targetH[i] = 1.0;
        }
      }

      const cur = currentH[i];
      const tgt = targetH[i];
      if (Math.abs(cur - tgt) > 0.001) {
        let next = cur + (tgt - cur) * lerpSpeed;
        if (Math.abs(next - tgt) < 0.005) next = tgt;
        currentH[i] = next;

        _dummy.position.set(xs[i], 0, zs[i]);
        _dummy.rotation.set(0, rys[i], 0);
        _dummy.scale.set(sxs[i], sys[i] * next, szs[i]);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

import * as THREE from 'three';

export class ShadowFollower {
  constructor(dirLight, lightOffset = new THREE.Vector3(40, 65, 30), halfSize = 25) {
    this.dirLight = dirLight;
    this.lightOffset = lightOffset;
    this.halfSize = halfSize;
    this.shadowBasisZ = this.lightOffset.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    this.shadowBasisX = new THREE.Vector3().crossVectors(up, this.shadowBasisZ).normalize();
    this.shadowBasisY = new THREE.Vector3().crossVectors(this.shadowBasisZ, this.shadowBasisX).normalize();
    this.shadowTargetPos = new THREE.Vector3();
    this.applyCameraBounds();
  }

  applyCameraBounds() {
    if (!this.dirLight) return;
    const sc = this.dirLight.shadow.camera;
    sc.left = -this.halfSize;
    sc.right = this.halfSize;
    sc.top = this.halfSize;
    sc.bottom = -this.halfSize;
    sc.updateProjectionMatrix();
  }

  update(playerPos) {
    if (!this.dirLight || !this.dirLight.castShadow || !playerPos) return;
    const mapSize = this.dirLight.shadow.mapSize.x || 1024;
    if (mapSize <= 0) return;

    const texelSize = (this.halfSize * 2) / mapSize;
    const px = playerPos.x;
    const py = playerPos.y || 0;
    const pz = playerPos.z;

    const u = px * this.shadowBasisX.x + py * this.shadowBasisX.y + pz * this.shadowBasisX.z;
    const v = px * this.shadowBasisY.x + py * this.shadowBasisY.y + pz * this.shadowBasisY.z;
    const w = px * this.shadowBasisZ.x + py * this.shadowBasisZ.y + pz * this.shadowBasisZ.z;

    const uSnap = Math.floor(u / texelSize) * texelSize;
    const vSnap = Math.floor(v / texelSize) * texelSize;

    this.shadowTargetPos.set(
      uSnap * this.shadowBasisX.x + vSnap * this.shadowBasisY.x + w * this.shadowBasisZ.x,
      uSnap * this.shadowBasisX.y + vSnap * this.shadowBasisY.y + w * this.shadowBasisZ.y,
      uSnap * this.shadowBasisX.z + vSnap * this.shadowBasisY.z + w * this.shadowBasisZ.z
    );

    this.dirLight.target.position.copy(this.shadowTargetPos);
    this.dirLight.position.copy(this.shadowTargetPos).add(this.lightOffset);
    this.dirLight.target.updateMatrixWorld();
  }
}

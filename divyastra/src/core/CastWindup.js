import * as THREE from 'three';

export class CastWindup {
  constructor(player, scene) {
    this.player = player;
    this.scene = scene;
    this.active = false;
    this.timer = 0;
    this.duration = 0.10;
    this.isTier3 = false;
    this.payloads = [];
    this.input = null;
    this.onFire = null;
    this.snapTimer = 0;

    const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.glowRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.glowRing = new THREE.Mesh(ringGeo, this.glowRingMat);
    this.glowRing.position.y = 0.06;
    this.glowRing.renderOrder = 6;
    this.glowRing.visible = false;
    this.scene.add(this.glowRing);
  }

  isWindingUp() {
    return this.active;
  }

  start(payloads, input, spell, onFire) {
    if (this.active || this.player.isDead) return;
    this.isTier3 = (payloads[0]?.tier === 3) || (spell?.tier === 3);
    this.duration = this.isTier3 ? 0.25 : 0.10;
    this.timer = this.duration;
    this.payloads = payloads;
    this.input = input;
    this.onFire = onFire;
    this.active = true;

    const elemColor = spell?.color || 0xf97316;
    if (this.player.staffOrbMat) {
      this.player.staffOrbMat.color.setHex(elemColor);
      this.player.staffOrbMat.emissive?.setHex(elemColor);
    }
    if (this.player.staffOrb) {
      this.player.staffOrb.scale.setScalar(1.6);
    }

    if (this.isTier3) {
      this.glowRing.visible = true;
      this.glowRingMat.color.setHex(elemColor);
      this.glowRing.scale.set(0.1, 1, 0.1);
      this.glowRing.position.set(this.player.x, 0.06, this.player.z);
    }
  }

  update(dt) {
    if (this.snapTimer > 0) {
      this.snapTimer = Math.max(0, this.snapTimer - dt);
      const ratio = this.snapTimer / 0.10;
      this.player.visualMesh.rotation.x = ratio * 0.35; // Snap forward decay
      if (this.player.rightArm) this.player.rightArm.rotation.x = -1.1 * ratio;
      if (this.snapTimer <= 0 && this.player.staffOrbMat) {
        this.player.staffOrbMat.emissive?.setHex(0x000000);
      }
    }

    if (!this.active) return;
    if (this.player.isDead) {
      this.cancel();
      return;
    }

    this.timer -= dt;

    // Hero leans back during anticipation
    this.player.visualMesh.rotation.x = -0.32;
    if (this.player.rightArm) this.player.rightArm.rotation.x = 0.65;
    if (this.player.staffShaft) this.player.staffShaft.rotation.x = 0.65;

    // Tier 3 growing glow ring
    if (this.isTier3 && this.glowRing.visible) {
      const progress = Math.min(1.0, 1.0 - this.timer / this.duration);
      const ringScale = 0.1 + progress * 0.95;
      this.glowRing.scale.set(ringScale, 1, ringScale);
      this.glowRing.position.set(this.player.x, 0.06, this.player.z);
      this.glowRingMat.opacity = 0.4 + Math.sin(progress * Math.PI) * 0.55;
    }

    if (this.timer <= 0) {
      this.active = false;
      this.glowRing.visible = false;
      this.snapTimer = 0.10; // Trigger snap forward
      this.player.visualMesh.rotation.x = 0.35;
      if (this.player.rightArm) this.player.rightArm.rotation.x = -1.1;
      this.onFire?.(this.payloads, this.input);
    }
  }

  cancel() {
    this.active = false;
    this.glowRing.visible = false;
    this.snapTimer = 0;
    if (this.player.staffOrbMat) this.player.staffOrbMat.emissive?.setHex(0x000000);
  }
}

import * as THREE from 'three';
import { TAPAS_DELAY, TAPAS_BONUS, TAPAS_HEAL_PCT_PER_SEC } from '../config/constants.js';

export class TapasComponent {
  constructor(actor) {
    this.actor = actor;
    this.timer = 0;
    this.active = false;
    this.healParticleTimer = 0;
    this.onReady = null;

    const geo = new THREE.RingGeometry(1.65, 1.85, 32);
    geo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
    });
    this.ring = new THREE.Mesh(geo, this.ringMat);
    this.ring.position.y = 0.05;
    this.actor.group.add(this.ring);

    this.plusPool = [];
    const pMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.06), pMat);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.06), pMat);
      g.add(h); g.add(v);
      g.position.set(0, -999, 0);
      this.actor.scene.add(g);
      const matInstance = pMat.clone();
      h.material = matInstance; v.material = matInstance;
      this.plusPool.push({ group: g, mat: matInstance, life: 0, maxLife: 0.5 });
    }
  }

  breakTapas() {
    this.timer = 0;
    this.active = false;
    this.healParticleTimer = 0;
    if (this.ringMat) {
      this.ringMat.opacity = 0;
      this.ringMat.color.setHex(0xfbbf24);
    }
  }

  consumeBonus() {
    const bonus = this.active ? TAPAS_BONUS : 0;
    this.breakTapas();
    return bonus;
  }

  spawnPlus() {
    const p = this.plusPool.find((item) => item.life <= 0) || this.plusPool[0];
    p.life = p.maxLife;
    const ox = (Math.random() - 0.5) * 0.6, oz = (Math.random() - 0.5) * 0.6;
    p.group.position.set(this.actor.x + ox, 1.2, this.actor.z + oz);
    p.mat.opacity = 0.95;
  }

  update(dt, isMoving, isCasting) {
    for (const p of this.plusPool) {
      if (p.life > 0) {
        p.life -= dt;
        p.group.position.y += dt * 1.5;
        p.mat.opacity = Math.max(0, (p.life / p.maxLife) * 0.95);
        if (p.life <= 0) p.group.position.set(0, -999, 0);
      }
    }
    if (isMoving || isCasting) {
      this.breakTapas();
      return;
    }
    this.timer += dt;
    const progress = Math.min(1.0, this.timer / TAPAS_DELAY);
    this.ringMat.opacity = progress * 0.85;
    const sc = 0.8 + progress * 0.2;
    this.ring.scale.set(sc, 1, sc);
    if (progress >= 1.0) {
      if (!this.active) {
        this.active = true;
        this.ringMat.color.setHex(0x4ade80);
        if (this.onReady) this.onReady();
      }
      this.actor.heal(this.actor.maxHp * TAPAS_HEAL_PCT_PER_SEC * dt);
      this.healParticleTimer += dt;
      if (this.healParticleTimer >= 0.5) {
        this.healParticleTimer = 0;
        this.spawnPlus();
      }
    } else {
      this.ringMat.color.setHex(0xfbbf24);
    }
  }

  destroy() {
    if (this.ring?.parent) this.ring.parent.remove(this.ring);
    this.plusPool.forEach((p) => { if (p.group.parent) p.group.parent.remove(p.group); });
  }
}

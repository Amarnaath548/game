import { PROJECTILE_DEFLECT_MAX_PER_CAST } from '../config/constants.js';

export class ProjectileDeflect {
  constructor() {
    this.barriers = [];
    this.soundTimer = 0;
  }

  addBarrier(x, z, config, owner, ring = null) {
    const expandDuration = ring?.duration || 0.42;
    const holdDuration = config.deflectHold || 0.3;
    const totalDuration = expandDuration + holdDuration;
    this.barriers.push({
      x,
      z,
      currentRadius: 0.5,
      maxRadius: config.radius || 6.0,
      expandDuration,
      holdDuration,
      timeLeft: totalDuration,
      owner,
      config,
      ring,
      deflectCount: 0,
      flashTimer: 0
    });
  }

  update(dt, projectiles = [], particleSys = null, sound = null) {
    if (this.soundTimer > 0) this.soundTimer -= dt;
    for (let i = this.barriers.length - 1; i >= 0; i--) {
      const b = this.barriers[i];
      b.timeLeft -= dt;
      if (b.timeLeft <= 0) {
        this.barriers.splice(i, 1);
        continue;
      }
      b.currentRadius = (b.ring && b.ring.active) ? b.ring.curRadius : b.maxRadius;

      if (b.flashTimer > 0) {
        b.flashTimer -= dt;
        if (b.ring?.mat) b.ring.mat.opacity = 1.0;
      }

      if (b.deflectCount >= PROJECTILE_DEFLECT_MAX_PER_CAST) continue;

      for (const p of projectiles) {
        if (!p.active || p.owner === b.owner) continue;
        const dist = Math.hypot(p.x - b.x, p.z - b.z);
        if (dist <= b.currentRadius + (p.radius || 0.5)) {
          p.reachedMaxRange = false;
          p.despawn();
          b.deflectCount++;
          if (b.ring?.mat) {
            b.ring.mat.opacity = 1.0;
            b.flashTimer = 0.08;
          }
          if (particleSys) {
            particleSys.spawnBurst(p.x, p.y || 1.0, p.z, b.config?.color || 0xffffff, 8, 4, 0.8, b.config?.elements);
          }
          if (sound && this.soundTimer <= 0) {
            sound.playHit();
            this.soundTimer = 0.1;
          }
          if (b.deflectCount >= PROJECTILE_DEFLECT_MAX_PER_CAST) break;
        }
      }
    }
  }

  reset() {
    this.barriers.length = 0;
    this.soundTimer = 0;
  }
}

export const projectileDeflect = new ProjectileDeflect();

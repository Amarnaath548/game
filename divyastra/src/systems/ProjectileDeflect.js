import { PROJECTILE_DEFLECT_MAX_PER_CAST } from '../config/constants.js';

export function destroyProjectilesInCircle(x, z, radius, owner, config, projectiles = [], particleSys = null, sound = null) {
  if (!projectiles || !projectiles.length) return 0;
  const cfg = config || {};
  if (cfg.deflectCount === undefined) cfg.deflectCount = 0;
  if (cfg.deflectCount >= PROJECTILE_DEFLECT_MAX_PER_CAST) return 0;

  let destroyed = 0;
  for (const p of projectiles) {
    if (!p.active || p.owner === owner) continue;
    const dist = Math.hypot(p.x - x, p.z - z);
    if (dist <= radius + (p.radius || 0.5)) {
      p.reachedMaxRange = false;
      p.despawn();
      destroyed++;
      cfg.deflectCount++;
      if (particleSys) {
        particleSys.spawnBurst(p.x, p.y || 1.0, p.z, cfg.color || 0xffffff, 8, 4, 0.8, cfg.elements);
      }
      if (sound && projectileDeflect.soundTimer <= 0) {
        sound.playHit();
        projectileDeflect.soundTimer = 0.1;
      }
      if (cfg.deflectCount >= PROJECTILE_DEFLECT_MAX_PER_CAST) break;
    }
  }
  return destroyed;
}

export function destroyProjectilesInRotatedRect(x, z, angle, width, depth, owner, config, projectiles = [], particleSys = null, sound = null) {
  if (!projectiles || !projectiles.length) return 0;
  const cfg = config || {};
  if (cfg.deflectCount === undefined) cfg.deflectCount = 0;
  if (cfg.deflectCount >= PROJECTILE_DEFLECT_MAX_PER_CAST) return 0;

  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  const halfW = width * 0.5, halfD = depth * 0.5;
  let destroyed = 0;
  for (const p of projectiles) {
    if (!p.active || p.owner === owner) continue;
    const dx = p.x - x, dz = p.z - z;
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    const pr = p.radius || 0.5;
    if (Math.abs(lx) <= halfW + pr && Math.abs(lz) <= halfD + pr) {
      p.reachedMaxRange = false;
      p.despawn();
      destroyed++;
      cfg.deflectCount++;
      if (particleSys) {
        particleSys.spawnBurst(p.x, p.y || 1.0, p.z, cfg.color || 0xffffff, 8, 4, 0.8, cfg.elements);
      }
      if (sound && projectileDeflect.soundTimer <= 0) {
        sound.playHit();
        projectileDeflect.soundTimer = 0.1;
      }
      if (cfg.deflectCount >= PROJECTILE_DEFLECT_MAX_PER_CAST) break;
    }
  }
  return destroyed;
}

export const destroyProjectilesInRectangle = destroyProjectilesInRotatedRect;
export const destroyProjectilesInRect = destroyProjectilesInRotatedRect;

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

      const hit = destroyProjectilesInCircle(b.x, b.z, b.currentRadius, b.owner, b.config, projectiles, particleSys, sound);
      if (hit > 0) {
        b.deflectCount = b.config?.deflectCount || (b.deflectCount + hit);
        if (b.ring?.mat) {
          b.ring.mat.opacity = 1.0;
          b.flashTimer = 0.08;
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

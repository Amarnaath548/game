import * as THREE from 'three';

export class Projectile {
  constructor(mesh, pool) {
    this.mesh = mesh;
    this.pool = pool;
    this.active = false;

    this.x = 0;
    this.y = 1.2;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.radius = 0.5;
    this.damage = 50;
    this.distanceTraveled = 0;
    this.maxRange = 24;
    this.spellConfig = null;
    this.lobHeight = 0;
    this.owner = null; // 'player' or 'bot'
    this.hitTargets = new Set();
  }

  spawn(originX, originZ, dirX, dirZ, spellConfig, owner = 'player') {
    this.active = true;
    this.x = originX;
    this.z = originZ;
    this.spellConfig = spellConfig;
    this.owner = owner;
    this.hitTargets.clear();

    this.vx = dirX * spellConfig.speed;
    this.vz = dirZ * spellConfig.speed;
    this.radius = spellConfig.radius || 0.5;
    this.damage = spellConfig.damage;
    this.maxRange = spellConfig.range;
    this.distanceTraveled = 0;

    this.lobHeight = spellConfig.lobArcHeight || 0;
    this.y = 1.2;

    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.scale.setScalar(this.radius / 0.5);
    this.mesh.material.color.setHex(spellConfig.color);
    this.mesh.visible = true;
  }

  update(dt, targets = []) {
    if (!this.active) return;

    // Homing steer towards nearest valid enemy at 2.0 rad/s
    if (this.spellConfig?.homing && targets.length > 0) {
      let nearest = null;
      let nearestDist = 20;
      for (const t of targets) {
        if (t === this.owner || t.isDead) continue;
        const d = Math.hypot(t.x - this.x, t.z - this.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = t;
        }
      }
      if (nearest) {
        const targetAngle = Math.atan2(nearest.x - this.x, nearest.z - this.z);
        const curAngle = Math.atan2(this.vx, this.vz);
        let diff = targetAngle - curAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const maxTurn = (this.spellConfig.turnRate || 2.0) * dt;
        const turn = Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
        const newAngle = curAngle + turn;
        const spd = this.spellConfig.speed;
        this.vx = Math.sin(newAngle) * spd;
        this.vz = Math.cos(newAngle) * spd;
      }
    }

    const dx = this.vx * dt;
    const dz = this.vz * dt;
    this.x += dx;
    this.z += dz;
    this.distanceTraveled += Math.hypot(dx, dz);

    // Parabolic lob if lobHeight > 0 (Venomancy)
    if (this.lobHeight > 0) {
      const progress = Math.min(1.0, this.distanceTraveled / this.maxRange);
      this.y = 1.2 + Math.sin(progress * Math.PI) * this.lobHeight;
    } else {
      this.y = 1.2;
    }

    this.mesh.position.set(this.x, this.y, this.z);

    if (this.distanceTraveled >= this.maxRange) {
      this.despawn(true); // reached end of range (can splash)
    }
  }

  despawn(reachedMaxRange = false) {
    if (!this.active) return;
    this.active = false;
    this.mesh.visible = false;
    if (this.pool) this.pool.release(this.mesh);
  }
}

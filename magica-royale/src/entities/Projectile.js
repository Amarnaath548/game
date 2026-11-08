import * as THREE from 'three';

export class Projectile {
  constructor(mesh, pool) {
    this.mesh = mesh;
    this.pool = pool;
    this.active = false;

    this.x = 0;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.radius = 0.5;
    this.damage = 50;
    this.distanceTraveled = 0;
    this.maxRange = 24;
    this.spellId = 'PYRO';
  }

  spawn(originX, originZ, dirX, dirZ, spellConfig) {
    this.active = true;
    this.x = originX;
    this.z = originZ;
    this.vx = dirX * spellConfig.speed;
    this.vz = dirZ * spellConfig.speed;
    this.radius = spellConfig.radius;
    this.damage = spellConfig.damage;
    this.maxRange = spellConfig.range;
    this.distanceTraveled = 0;
    this.spellId = spellConfig.id;

    this.mesh.position.set(this.x, 1.2, this.z);
    this.mesh.scale.setScalar(this.radius / 0.5);
    this.mesh.material.color.setHex(spellConfig.color);
    this.mesh.visible = true;
  }

  update(dt) {
    if (!this.active) return;

    const dx = this.vx * dt;
    const dz = this.vz * dt;
    this.x += dx;
    this.z += dz;
    this.distanceTraveled += Math.hypot(dx, dz);

    this.mesh.position.set(this.x, 1.2, this.z);

    if (this.distanceTraveled >= this.maxRange) {
      this.despawn();
    }
  }

  despawn() {
    if (!this.active) return;
    this.active = false;
    this.pool.release(this.mesh);
  }
}
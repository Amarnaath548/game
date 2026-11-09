export class XPGem {
  constructor(mesh, pool) {
    this.mesh = mesh;
    this.pool = pool;
    this.active = false;
    this.x = 0;
    this.z = 0;
    this.radius = 0.4;
    this.xpValue = 25;
    this.magnetRadius = 6.0;
    this.flySpeed = 0;
    this.rotSpeed = 3.5;
  }

  spawn(x, z, xpValue = 25) {
    this.active = true;
    this.x = x;
    this.z = z;
    this.xpValue = xpValue;
    this.flySpeed = 0;

    this.mesh.position.set(this.x, 0.5, this.z);
    this.mesh.visible = true;
  }

  update(dt, playerX, playerZ) {
    if (!this.active) return false;

    this.mesh.rotation.y += this.rotSpeed * dt;
    this.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.006) * 0.15;

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist < this.magnetRadius) {
      this.flySpeed += 38 * dt;
      this.x += (dx / dist) * this.flySpeed * dt;
      this.z += (dz / dist) * this.flySpeed * dt;
      this.mesh.position.set(this.x, 0.5, this.z);

      if (dist < 0.9) {
        this.despawn();
        return true;
      }
    }
    return false;
  }

  despawn() {
    if (!this.active) return;
    this.active = false;
    this.mesh.visible = false;
    if (this.pool) this.pool.release(this.mesh);
  }
}

export class HealthOrb {
  constructor(mesh, pool) {
    this.mesh = mesh;
    this.pool = pool;
    this.active = false;
    this.x = 0;
    this.z = 0;
    this.radius = 0.5;
    this.healPercent = 0.25;
    this.magnetRadius = 4.5;
    this.flySpeed = 0;
  }

  spawn(x, z, healPercent = 0.25) {
    this.active = true;
    this.x = x;
    this.z = z;
    this.healPercent = healPercent;
    this.flySpeed = 0;

    this.mesh.position.set(this.x, 0.6, this.z);
    this.mesh.visible = true;
  }

  update(dt, playerX, playerZ) {
    if (!this.active) return false;

    this.mesh.rotation.y += 2.0 * dt;
    this.mesh.position.y = 0.6 + Math.sin(Date.now() * 0.008) * 0.12;

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist < this.magnetRadius) {
      this.flySpeed += 30 * dt;
      this.x += (dx / dist) * this.flySpeed * dt;
      this.z += (dz / dist) * this.flySpeed * dt;
      this.mesh.position.set(this.x, 0.6, this.z);

      if (dist < 0.9) {
        this.despawn();
        return true;
      }
    }
    return false;
  }

  despawn() {
    if (!this.active) return;
    this.active = false;
    this.mesh.visible = false;
    if (this.pool) this.pool.release(this.mesh);
  }
}


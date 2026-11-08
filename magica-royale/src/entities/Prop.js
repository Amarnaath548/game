import * as THREE from 'three';

export class Chest {
  constructor(x, z, scene, isMythic = false) {
    this.x = x;
    this.z = z;
    this.isMythic = isMythic;
    this.radius = isMythic ? 1.8 : 1.3;
    this.maxHp = isMythic ? 400 : 150;
    this.hp = this.maxHp;
    this.isDead = false;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    // Chest Body
    const bodyGeo = new THREE.BoxGeometry(
      isMythic ? 2.4 : 1.8,
      isMythic ? 1.5 : 1.1,
      isMythic ? 1.6 : 1.2
    );
    this.baseColor = isMythic ? 0x9333ea : 0x8b5a2b;
    this.mat = new THREE.MeshLambertMaterial({ color: this.baseColor });
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.mat);
    this.bodyMesh.position.y = isMythic ? 0.75 : 0.55;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // Gold Trim / Lock
    const lockGeo = new THREE.BoxGeometry(0.4, 0.45, 0.25);
    const lockMat = new THREE.MeshBasicMaterial({ color: isMythic ? 0x00f2ff : 0xffd700 });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(0, isMythic ? 0.8 : 0.6, isMythic ? 0.82 : 0.62);
    this.group.add(lock);

    this.scene.add(this.group);
    this.hitTimer = 0;
  }

  takeDamage(amount) {
    if (this.isDead) return false;
    this.hp -= amount;
    this.hitTimer = 0.08;
    this.mat.color.setHex(0xffffff);

    // Wobble bump on hit
    this.group.scale.set(1.15, 0.85, 1.15);

    if (this.hp <= 0) {
      this.destroy();
      return true; // Broke
    }
    return false;
  }

  update(dt) {
    if (this.isDead) return;

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        this.mat.color.setHex(this.baseColor);
        this.group.scale.set(1, 1, 1);
      }
    }
  }

  destroy() {
    this.isDead = true;
    this.scene.remove(this.group);
  }
}

export class ArcaneCrystal {
  constructor(x, z, scene) {
    this.x = x;
    this.z = z;
    this.radius = 1.1;
    this.maxHp = 50;
    this.hp = this.maxHp;
    this.isDead = false;
    this.scene = scene;
    this.explosionRadius = 6.0;
    this.explosionDamage = 120;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    // Crystal Spire
    const crystalGeo = new THREE.ConeGeometry(0.8, 2.2, 5);
    this.mat = new THREE.MeshLambertMaterial({
      color: 0xff2a6d,
      emissive: 0x660022
    });
    this.mesh = new THREE.Mesh(crystalGeo, this.mat);
    this.mesh.position.y = 1.1;
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    // Base ring
    const baseGeo = new THREE.CylinderGeometry(1.0, 1.1, 0.3, 8);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x2a2e42 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.15;
    this.group.add(base);

    this.scene.add(this.group);
    this.hitTimer = 0;
  }

  takeDamage(amount) {
    if (this.isDead) return false;
    this.hp -= amount;
    this.hitTimer = 0.08;
    this.mat.color.setHex(0xffffff);

    if (this.hp <= 0) {
      this.destroy();
      return true; // Exploded
    }
    return false;
  }

  update(dt) {
    if (this.isDead) return;

    // Gentle floating hum
    this.mesh.rotation.y += 1.5 * dt;

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        this.mat.color.setHex(0xff2a6d);
      }
    }
  }

  destroy() {
    this.isDead = true;
    this.scene.remove(this.group);
  }
}

export class ShadowBush {
  constructor(x, z, scene, radius = 2.8) {
    this.x = x;
    this.z = z;
    this.radius = radius;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    const bushGeo = new THREE.DodecahedronGeometry(radius, 1);
    const bushMat = new THREE.MeshLambertMaterial({
      color: 0x11221c,
      transparent: true,
      opacity: 0.85
    });
    this.mesh = new THREE.Mesh(bushGeo, bushMat);
    this.mesh.scale.set(1, 0.45, 1);
    this.mesh.position.y = 0.8;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    this.scene.add(this.group);
  }

  checkInside(actorX, actorZ) {
    const dx = actorX - this.x;
    const dz = actorZ - this.z;
    return (dx * dx + dz * dz) <= (this.radius * this.radius);
  }
}

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
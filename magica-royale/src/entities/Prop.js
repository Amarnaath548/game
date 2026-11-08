import * as THREE from 'three';

export class Chest {
  constructor(x, z, scene) {
    this.x = x;
    this.z = z;
    this.radius = 1.3;
    this.maxHp = 150;
    this.hp = this.maxHp;
    this.isDead = false;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    // Chest Body
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.1, 1.2);
    this.mat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.mat);
    this.bodyMesh.position.y = 0.55;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // Gold Trim / Lock
    const lockGeo = new THREE.BoxGeometry(0.35, 0.4, 0.2);
    const lockMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(0, 0.6, 0.62);
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
        this.mat.color.setHex(0x8b5a2b);
        this.group.scale.set(1, 1, 1);
      }
    }
  }

  destroy() {
    this.isDead = true;
    this.scene.remove(this.group);
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
    this.magnetRadius = 5.5;
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

    // Spin animation
    this.mesh.rotation.y += this.rotSpeed * dt;
    this.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.006) * 0.15;

    // Distance to player
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);

    // Magnetic attraction towards player
    if (dist < this.magnetRadius) {
      this.flySpeed += 35 * dt;
      this.x += (dx / dist) * this.flySpeed * dt;
      this.z += (dz / dist) * this.flySpeed * dt;
      this.mesh.position.set(this.x, 0.5, this.z);

      // Collect threshold
      if (dist < 0.9) {
        this.despawn();
        return true; // Collected
      }
    }
    return false;
  }

  despawn() {
    if (!this.active) return;
    this.active = false;
    this.pool.release(this.mesh);
  }
}
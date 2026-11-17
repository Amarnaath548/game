import * as THREE from 'three';
export { XPGem, HealthOrb } from './Collectibles.js';

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
  constructor(x, z, scene, radius = 2.8, bushColor = 0x3A9620) {
    this.x = x;
    this.z = z;
    this.radius = radius;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    const shadowGeo = new THREE.CircleGeometry(radius * 0.95, 16); shadowGeo.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    shadow.position.y = 0.02; this.group.add(shadow);

    // Multi-lobe opaque low-poly leafy shrub (3-4 overlapping clusters in #3A9620 & #5BC227)
    this.mat1 = new THREE.MeshLambertMaterial({ color: bushColor, flatShading: true });
    this.mat2 = new THREE.MeshLambertMaterial({ color: 0x5BC227, flatShading: true });

    const lobeOffsets = [
      [0, 0, 0, radius * 0.65, this.mat1],
      [radius * 0.35, 0, radius * 0.2, radius * 0.52, this.mat2],
      [-radius * 0.32, 0, -radius * 0.22, radius * 0.5, this.mat2],
      [0, 0, -radius * 0.32, radius * 0.46, this.mat1]
    ];

    lobeOffsets.forEach(([ox, , oz, r, mat]) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat);
      m.position.set(ox, r * 0.55, oz); m.scale.set(1.15, 0.55, 1.15);
      m.castShadow = true; m.receiveShadow = true; this.group.add(m);
    });

    this.scene.add(this.group);
  }

  setBiomeColor(color, edgeColor = 0x5BC227) {
    if (this.mat1) this.mat1.color.setHex(color);
    if (this.mat2) this.mat2.color.setHex(edgeColor);
  }

  checkInside(actorX, actorZ) {
    const dx = actorX - this.x, dz = actorZ - this.z;
    const inside = (dx * dx + dz * dz) <= (this.radius * this.radius);
    const op = inside ? 0.35 : 1.0;
    if (this.mat1) { this.mat1.opacity = op; this.mat1.transparent = inside; }
    if (this.mat2) { this.mat2.opacity = op; this.mat2.transparent = inside; }
    return inside;
  }
}

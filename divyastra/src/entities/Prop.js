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
  constructor(x, z, scene, radius = 2.8, bushColor = 0x22c55e) {
    this.x = x;
    this.z = z;
    this.radius = radius;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    // Soft darker contact shadow on floor
    const shadowGeo = new THREE.CircleGeometry(radius * 0.95, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    this.group.add(shadow);

    // Chunky low-poly faceted bush
    const bushGeo = new THREE.DodecahedronGeometry(radius, 0);
    this.mat = new THREE.MeshLambertMaterial({
      color: bushColor,
      flatShading: true,
      transparent: true,
      opacity: 0.88
    });
    this.mesh = new THREE.Mesh(bushGeo, this.mat);
    this.mesh.scale.set(1.05, 0.46, 1.05);
    this.mesh.position.y = radius * 0.35;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // Lighter edge highlights
    const edgesGeo = new THREE.EdgesGeometry(bushGeo);
    this.edgesMat = new THREE.LineBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.55
    });
    const edges = new THREE.LineSegments(edgesGeo, this.edgesMat);
    edges.scale.copy(this.mesh.scale);
    edges.position.copy(this.mesh.position);
    this.group.add(edges);

    this.scene.add(this.group);
  }

  setBiomeColor(color, edgeColor = 0x86efac) {
    if (this.mat) this.mat.color.setHex(color);
    if (this.edgesMat) this.edgesMat.color.setHex(edgeColor);
  }

  checkInside(actorX, actorZ) {
    const dx = actorX - this.x;
    const dz = actorZ - this.z;
    return (dx * dx + dz * dz) <= (this.radius * this.radius);
  }
}

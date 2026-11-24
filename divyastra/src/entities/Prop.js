import * as THREE from 'three';
import { PALETTE } from '../config/palette.js';
import { assetLoader } from '../core/AssetLoader.js';
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

    const modelKey = isMythic ? 'chest_mythic' : 'chest';
    const customModel = assetLoader.getPropModel(modelKey);
    if (customModel) {
      this.group.add(customModel);
      this.customModel = customModel;
      this.scene.add(this.group);
      this.hitTimer = 0;
      return;
    }

    // Chest body + domed lid + gold bands (mythic sits on the plaza dais and glows)
    const W = isMythic ? 2.4 : 1.8;
    const H = isMythic ? 1.0 : 0.75;
    const D = isMythic ? 1.6 : 1.2;
    const baseY = isMythic ? 0.4 : 0;
    this.baseColor = isMythic ? 0xF2B01E : 0x8b5a2b;
    this.mat = new THREE.MeshLambertMaterial({ color: this.baseColor, flatShading: true, emissive: isMythic ? 0x5A3D00 : 0x000000 });
    const bandMat = new THREE.MeshLambertMaterial({ color: isMythic ? 0xB45309 : 0xD9A520, flatShading: true });
    const goldMat = new THREE.MeshLambertMaterial({ color: PALETTE.gold, flatShading: true });

    this.bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), this.mat);
    this.bodyMesh.position.y = baseY + H / 2;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(D / 2, D / 2, W, 10, 1, false, 0, Math.PI), this.mat);
    lid.rotation.set(0, 0, Math.PI / 2); // axis along X, dome facing up
    lid.position.y = baseY + H;
    this.group.add(lid);

    [-W * 0.32, W * 0.32].forEach((bx) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.18, H + 0.04, D + 0.06), bandMat);
      band.position.set(bx, baseY + H / 2, 0); this.group.add(band);
      const bandLid = new THREE.Mesh(new THREE.CylinderGeometry(D / 2 + 0.04, D / 2 + 0.04, 0.18, 10, 1, false, 0, Math.PI), bandMat);
      bandLid.rotation.set(0, 0, Math.PI / 2);
      bandLid.position.set(bx, baseY + H, 0); this.group.add(bandLid);
    });

    const lockMat = new THREE.MeshBasicMaterial({ color: isMythic ? PALETTE.gold : PALETTE.saffron });
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.18), lockMat);
    lock.position.set(0, baseY + H * 0.72, D / 2 + 0.06);
    this.group.add(lock);

    if (isMythic) {
      // Gilded corner studs + soft ground glow
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const stud = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), goldMat);
        stud.position.set(sx * (W / 2 - 0.05), baseY + 0.12, sz * (D / 2 - 0.05)); this.group.add(stud);
      });
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(2.6, 20).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      glow.position.y = baseY + 0.03; glow.renderOrder = 15; this.group.add(glow);
    }

    this.scene.add(this.group);
    this.hitTimer = 0;
  }

  takeDamage(amount) {
    if (this.isDead) return false;
    this.hp -= amount;
    this.hitTimer = 0.08;
    if (this.mat) this.mat.color.setHex(0xffffff);
    this.group.scale.set(1.15, 0.85, 1.15);
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  update(dt) {
    if (this.isDead) return;
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        if (this.mat) this.mat.color.setHex(this.baseColor);
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

    const customModel = assetLoader.getPropModel('crystal');
    if (customModel) {
      this.group.add(customModel);
      this.customModel = customModel;
      this.scene.add(this.group);
      this.hitTimer = 0;
      return;
    }

    // Crystal Spire
    const crystalGeo = new THREE.ConeGeometry(0.8, 2.2, 5);
    this.mat = new THREE.MeshLambertMaterial({
      color: PALETTE.saffron,
      emissive: 0x4a1805
    });
    this.mesh = new THREE.Mesh(crystalGeo, this.mat);
    this.mesh.position.y = 1.1;
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
    if (this.mat) this.mat.color.setHex(0xffffff);
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  update(dt) {
    if (this.isDead) return;
    if (this.mesh) this.mesh.rotation.y += 1.5 * dt;
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0 && this.mat) this.mat.color.setHex(PALETTE.saffron);
    }
  }

  destroy() {
    this.isDead = true;
    this.scene.remove(this.group);
  }
}

export class ShadowBush {
  constructor(x, z, scene, radius = 2.8, bushColor = 0x4F7F3F) {
    this.x = x;
    this.z = z;
    this.radius = radius;
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);

    const customModel = assetLoader.getPropModel('bush');
    if (customModel) {
      this.group.add(customModel);
      this.customModel = customModel;
      this.scene.add(this.group);
      return;
    }

    const shadowGeo = new THREE.CircleGeometry(radius * 0.95, 16); shadowGeo.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    shadow.position.y = 0.02; this.group.add(shadow);

    // Multi-lobe opaque low-poly leafy shrub
    this.mat1 = new THREE.MeshLambertMaterial({ color: bushColor, flatShading: true });
    this.mat2 = new THREE.MeshLambertMaterial({ color: 0x8DB06A, flatShading: true });

    const lobeOffsets = [
      [0, 0, 0, radius * 0.65, this.mat1],
      [radius * 0.35, 0, radius * 0.2, radius * 0.52, this.mat2],
      [-radius * 0.32, 0, -radius * 0.22, radius * 0.5, this.mat2],
      [0, 0, -radius * 0.32, radius * 0.46, this.mat1]
    ];

    lobeOffsets.forEach(([ox, , oz, r, mat]) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat);
      m.position.set(ox, r * 0.55, oz); m.scale.set(1.15, 0.55, 1.15);
      m.receiveShadow = true; this.group.add(m);
    });

    this.scene.add(this.group);
  }

  setBiomeColor(color, edgeColor = 0x8DB06A) {
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

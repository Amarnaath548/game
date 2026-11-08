import * as THREE from 'three';
import { PLAYER_BASE } from '../config/constants.js';

export class Actor {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.x = options.x || 0;
    this.z = options.z || 0;
    this.radius = options.radius || PLAYER_BASE.RADIUS;
    this.maxHp = options.maxHp || PLAYER_BASE.MAX_HP;
    this.hp = this.maxHp;
    this.baseSpeed = options.moveSpeed || PLAYER_BASE.MOVE_SPEED;
    this.speed = this.baseSpeed;
    this.isDead = false;
    this.isInvulnerable = false;
    this.shieldActive = false;

    // Status effects
    this.status = {
      chillTimer: 0,
      chillFactor: 1.0,
      burnTimer: 0,
      burnDps: 0,
      poisonTimer: 0,
      poisonDps: 0
    };

    // Visuals
    this.group = new THREE.Group();
    this.visualMesh = new THREE.Group();
    this.group.add(this.visualMesh);
    this.scene.add(this.group);

    this.robeColor = options.robeColor || 0xd92638;
    this.hatColor = options.hatColor || 0x1e2238;
    this.buildMesh();

    this.hitTimer = 0;
    this.walkTime = 0;
  }

  buildMesh() {
    // Robe Cone
    const robeGeo = new THREE.ConeGeometry(0.95, 2.2, 12);
    this.robeMat = new THREE.MeshLambertMaterial({
      color: this.robeColor,
      emissive: 0x000000
    });
    this.robe = new THREE.Mesh(robeGeo, this.robeMat);
    this.robe.position.y = 1.1;
    this.robe.castShadow = true;
    this.visualMesh.add(this.robe);

    // Hat Brim
    const hatBrimGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.12, 12);
    this.hatMat = new THREE.MeshLambertMaterial({
      color: this.hatColor,
      emissive: 0x000000
    });
    const hatBrim = new THREE.Mesh(hatBrimGeo, this.hatMat);
    hatBrim.position.y = 2.15;
    this.visualMesh.add(hatBrim);

    // Hat Top
    const hatTopGeo = new THREE.ConeGeometry(0.65, 1.3, 10);
    const hatTop = new THREE.Mesh(hatTopGeo, this.hatMat);
    hatTop.position.y = 2.8;
    this.visualMesh.add(hatTop);

    // Staff Orb
    const staffOrbGeo = new THREE.SphereGeometry(0.26, 8, 8);
    this.staffOrbMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
    this.staffOrb = new THREE.Mesh(staffOrbGeo, this.staffOrbMat);
    this.staffOrb.position.set(0.65, 1.4, 0.75);
    this.visualMesh.add(this.staffOrb);
  }

  takeDamage(amount, sourceSpell = null) {
    if (this.isDead || this.isInvulnerable) return 0;

    if (this.shieldActive) {
      this.shieldActive = false;
      return 0; // absorbed by shield
    }

    this.hp -= amount;
    this.hitTimer = 0.08;
    this.robeMat.emissive.setHex(0xffffff);
    this.hatMat.emissive.setHex(0xffffff);

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
    return amount;
  }

  applyChill(factor = 0.3, duration = 1.5) {
    this.status.chillTimer = duration;
    this.status.chillFactor = 1.0 - factor;
  }

  applyBurn(dps = 10, duration = 2.0) {
    this.status.burnTimer = duration;
    this.status.burnDps = dps;
  }

  applyPoison(dps = 8, duration = 4.0) {
    this.status.poisonTimer = duration;
    this.status.poisonDps = dps;
  }

  heal(amount) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt) {
    if (this.isDead) return;

    // Hit Flash Reset
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        this.robeMat.emissive.setHex(0x000000);
        this.hatMat.emissive.setHex(0x000000);
      }
    }

    // Status Effects
    if (this.status.chillTimer > 0) {
      this.status.chillTimer -= dt;
      this.speed = this.baseSpeed * this.status.chillFactor;
    } else {
      this.speed = this.baseSpeed;
    }

    if (this.status.burnTimer > 0) {
      this.status.burnTimer -= dt;
      this.takeDamage(this.status.burnDps * dt);
    }

    if (this.status.poisonTimer > 0) {
      this.status.poisonTimer -= dt;
      this.takeDamage(this.status.poisonDps * dt);
    }

    this.group.position.set(this.x, 0, this.z);
  }

  setWobble(isMoving, dt) {
    if (isMoving) {
      this.walkTime += dt * 14;
      this.visualMesh.position.y = Math.abs(Math.sin(this.walkTime)) * 0.28;
      this.visualMesh.rotation.z = Math.sin(this.walkTime) * 0.08;
    } else {
      this.visualMesh.position.y = THREE.MathUtils.lerp(this.visualMesh.position.y, 0, 0.2);
      this.visualMesh.rotation.z = THREE.MathUtils.lerp(this.visualMesh.rotation.z, 0, 0.2);
    }
  }

  die() {
    this.isDead = true;
    this.scene.remove(this.group);
  }
}


import * as THREE from 'three';
import { PLAYER_BASE, HEROES, HERO_VISUAL_SCALE } from '../config/constants.js';
import { buildHeroVisual } from './HeroVisual.js';

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
    this.shieldHp = 0;
    this.shieldTimer = 0;
    this.kbTimer = 0;
    this.kbVx = 0;
    this.kbVz = 0;
    this.lastX = this.x;
    this.lastZ = this.z;
    this.vx = 0;
    this.vz = 0;

    // Status effects
    this.status = {
      chillTimer: 0,
      chillFactor: 1.0,
      burnTimer: 0,
      burnDps: 0,
      poisonTimer: 0,
      poisonDps: 0
    };

    // Hero configuration
    this.hero = options.hero || (options.heroId ? HEROES.find(h => h.id === options.heroId) : null) || HEROES[0];
    if (options.robeColor && !options.hero) {
      this.hero = { ...this.hero, bodyColor: options.robeColor, accentColor: options.hatColor || this.hero.accentColor };
    }

    // Visuals
    this.group = new THREE.Group();
    this.visualMesh = new THREE.Group();
    this.visualMesh.scale.setScalar(HERO_VISUAL_SCALE);
    this.group.add(this.visualMesh);
    this.scene.add(this.group);

    buildHeroVisual(this, this.hero);
    // Backwards-compatible aliases for robe/hat materials
    this.robeMat = this.bodyMat;
    this.hatMat = this.accentMat;

    this.hitTimer = 0;
    this.walkTime = 0;
  }

  applyShield(amount = 80, duration = 3.0) {
    this.shieldHp = amount;
    this.shieldTimer = duration;
    this.shieldActive = true;
    if (this.shieldMesh) this.shieldMesh.visible = true;
  }

  takeDamage(amount, sourceSpell = null) {
    if (this.isDead || this.isInvulnerable) return 0;

    if (this.shieldActive && this.shieldHp > 0) {
      if (this.shieldHp >= amount) {
        this.shieldHp -= amount;
        return 0;
      }
      const remaining = amount - this.shieldHp;
      this.shieldHp = 0;
      this.shieldActive = false;
      if (this.shieldMesh) this.shieldMesh.visible = false;
      amount = remaining;
    } else if (this.shieldActive) {
      this.shieldActive = false;
      if (this.shieldMesh) this.shieldMesh.visible = false;
      return 0;
    }

    this.hp -= amount;
    this.hitTimer = 0.08;
    this.bodyMat.emissive.setHex(0xffffff);
    this.accentMat.emissive.setHex(0xffffff);

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

  applyKnockback(dirX, dirZ, distance = 2.5) {
    if (this.dashTimer > 0 || this.isInvulnerable || this.isDead) return;
    const len = Math.hypot(dirX, dirZ) || 1;
    this.kbVx = (dirX / len) * (distance / 0.15) * 2;
    this.kbVz = (dirZ / len) * (distance / 0.15) * 2;
    this.kbTimer = 0.15;
  }

  heal(amount) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt) {
    if (this.isDead) return;

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        this.bodyMat.emissive.setHex(0x000000);
        this.accentMat.emissive.setHex(0x000000);
      }
    }

    if (this.kbTimer > 0) {
      const decay = this.kbTimer / 0.15;
      this.x += this.kbVx * decay * dt;
      this.z += this.kbVz * decay * dt;
      this.kbTimer -= dt;
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
        this.shieldHp = 0;
        if (this.shieldMesh) this.shieldMesh.visible = false;
      }
    }

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

    if (dt > 0.001) {
      this.vx = (this.x - this.lastX) / dt;
      this.vz = (this.z - this.lastZ) / dt;
    }
    this.lastX = this.x;
    this.lastZ = this.z;

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

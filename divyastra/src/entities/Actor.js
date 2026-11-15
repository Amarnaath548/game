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
    this.spellDash = false;

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
    this.wobbleZ = 0;
    this.leanX = 0;
    this.leanZ = 0;
    this.punchTimer = 0;
    this.castTimer = 0;
    this.orbTimer = 0;
    this.isDying = false;
    this.deathTimer = 0;
    this.rightArm = this.visualMesh.children.find((c) => c.position && Math.abs(c.position.x - 0.56) < 0.05 && Math.abs(c.position.y - 0.7) < 0.05);
    this.staffShaft = this.visualMesh.children.find((c) => c.position && Math.abs(c.position.x - 0.68) < 0.05 && Math.abs(c.position.y - 1.0) < 0.05);
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

  applyChill(factor = 0.3, duration = 1.5) { this.status.chillTimer = duration; this.status.chillFactor = 1.0 - factor; }
  applyBurn(dps = 10, duration = 2.0) { this.status.burnTimer = duration; this.status.burnDps = dps; }
  applyPoison(dps = 8, duration = 4.0) { this.status.poisonTimer = duration; this.status.poisonDps = dps; }
  heal(amount) { if (!this.isDead) this.hp = Math.min(this.maxHp, this.hp + amount); }

  triggerCastAnim() { this.castTimer = 0.23; this.orbTimer = 0.2; }

  applyKnockback(dirX, dirZ, distance = 2.5) {
    if (this.dashTimer > 0 || this.isInvulnerable || this.isDead) return;
    const len = Math.hypot(dirX, dirZ) || 1;
    this.kbDuration = 0.12; this.kbTimer = 0.12;
    this.kbVx = (dirX / len) * (distance / 0.12) * 2; this.kbVz = (dirZ / len) * (distance / 0.12) * 2;
  }

  update(dt) {
    if (this.isDead) {
      if (this.isDying) {
        this.deathTimer -= dt;
        const progress = Math.max(0, this.deathTimer / 0.35), sc = progress * HERO_VISUAL_SCALE;
        this.visualMesh.scale.set(sc, sc, sc);
        if (this.bodyMat) this.bodyMat.opacity = progress;
        if (this.accentMat) this.accentMat.opacity = progress;
        if (this.staffOrbMat) this.staffOrbMat.opacity = progress;
        if (this.deathTimer <= 0) { this.isDying = false; this.destroyVisuals(); }
      }
      return;
    }

    if (this.hitTimer > 0 && (this.hitTimer -= dt) <= 0) {
      if (this.bodyMat?.emissive) this.bodyMat.emissive.setHex(0x000000);
      if (this.accentMat?.emissive) this.accentMat.emissive.setHex(0x000000);
    }

    if (this.punchTimer > 0) {
      this.punchTimer -= dt;
      if (this.rightArm) this.rightArm.rotation.x = -1.2;
      if (this.staffShaft) this.staffShaft.rotation.x = -1.2;
    } else if (this.castTimer > 0) {
      this.castTimer -= dt;
      const rotX = this.castTimer > 0.15 ? 0.25 : 0.25 * (this.castTimer / 0.15);
      if (this.rightArm) this.rightArm.rotation.x = rotX;
      if (this.staffShaft) this.staffShaft.rotation.x = rotX;
    } else {
      if (this.rightArm && this.rightArm.rotation.x !== 0) this.rightArm.rotation.x = 0;
      if (this.staffShaft && this.staffShaft.rotation.x !== 0) this.staffShaft.rotation.x = 0;
    }

    if (this.orbTimer > 0) {
      this.orbTimer -= dt;
      if (this.staffOrb) {
        const p = 1.0 - (this.orbTimer / 0.2);
        const sc = this.orbTimer > 0 ? (1.0 + 0.4 * Math.sin(Math.max(0, Math.min(1, p)) * Math.PI)) : 1.0;
        this.staffOrb.scale.set(sc, sc, sc);
      }
    }

    if (this.kbTimer > 0) {
      const decay = this.kbTimer / (this.kbDuration || 0.12);
      this.x += this.kbVx * decay * dt; this.z += this.kbVz * decay * dt;
      this.kbTimer -= dt;
    }

    if (this.shieldTimer > 0 && (this.shieldTimer -= dt) <= 0) {
      this.shieldActive = false; this.shieldHp = 0;
      if (this.shieldMesh) this.shieldMesh.visible = false;
    }

    if (this.status.chillTimer > 0) {
      this.status.chillTimer -= dt;
      this.speed = this.baseSpeed * this.status.chillFactor;
    } else { this.speed = this.baseSpeed; }

    if (this.status.burnTimer > 0) { this.status.burnTimer -= dt; this.takeDamage(this.status.burnDps * dt); }
    if (this.status.poisonTimer > 0) { this.status.poisonTimer -= dt; this.takeDamage(this.status.poisonDps * dt); }

    if (dt > 0.001) { this.vx = (this.x - this.lastX) / dt; this.vz = (this.z - this.lastZ) / dt; }
    this.lastX = this.x; this.lastZ = this.z;
    this.group.position.set(this.x, 0, this.z);
  }

  setWobble(isMoving, dt, moveX = 0, moveZ = 0, isDashing = false) {
    let targetLeanX = 0, targetLeanZ = 0;
    if (isMoving && !isDashing) {
      this.walkTime += dt * 14;
      this.visualMesh.position.y = Math.abs(Math.sin(this.walkTime)) * 0.28;
      this.wobbleZ = Math.sin(this.walkTime) * 0.08;
      const len = Math.hypot(moveX, moveZ);
      if (len > 0.01) {
        const nx = moveX / len, nz = moveZ / len, ang = this.visualMesh.rotation.y;
        targetLeanX = (nx * Math.sin(ang) + nz * Math.cos(ang)) * 0.12;
        targetLeanZ = -(nx * Math.cos(ang) - nz * Math.sin(ang)) * 0.12;
      }
    } else {
      this.visualMesh.position.y = THREE.MathUtils.lerp(this.visualMesh.position.y, 0, 0.2);
      this.wobbleZ = THREE.MathUtils.lerp(this.wobbleZ || 0, 0, 0.2);
    }
    this.leanX = THREE.MathUtils.lerp(this.leanX || 0, targetLeanX, 0.15);
    this.leanZ = THREE.MathUtils.lerp(this.leanZ || 0, targetLeanZ, 0.15);
    this.visualMesh.rotation.x = this.leanX;
    this.visualMesh.rotation.z = (this.wobbleZ || 0) + this.leanZ;
  }

  die() {
    if (this.isDead) return;
    this.isDead = true; this.isDying = true; this.deathTimer = 0.35;
    if (this.shieldMesh) this.shieldMesh.visible = false;
    if (this.bodyMat) this.bodyMat.transparent = true;
    if (this.accentMat) this.accentMat.transparent = true;
    if (this.staffOrbMat) this.staffOrbMat.transparent = true;
  }

  destroyVisuals() {
    if (this.isPlayer) {
      this.group.visible = false;
      return;
    }
    this.scene.remove(this.group);
    if (this.bodyMat) this.bodyMat.dispose();
    if (this.accentMat) this.accentMat.dispose();
    if (this.staffOrbMat) this.staffOrbMat.dispose();
    if (this.shieldMesh?.material) this.shieldMesh.material.dispose();
  }

  destroy() { this.isDead = true; this.isDying = false; this.destroyVisuals(); }
}

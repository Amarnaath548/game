import * as THREE from 'three';
import { PLAYER_BASE, HEROES, HERO_VISUAL_SCALE } from '../config/constants.js';
import { buildHeroVisual } from './HeroVisual.js';
import { updateTierVisuals } from './HeroTierVisuals.js';
import { setActorWobble } from './ActorAnim.js';
import { getActorStaffTipWorld } from './StaffTip.js';

export class Actor {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.x = options.x || 0; this.z = options.z || 0;
    this.radius = options.radius || PLAYER_BASE.RADIUS;
    this.maxHp = options.maxHp || PLAYER_BASE.MAX_HP; this.hp = this.maxHp;
    this.baseSpeed = options.moveSpeed || PLAYER_BASE.MOVE_SPEED; this.speed = this.baseSpeed;
    this.isDead = false; this.isInvulnerable = false;
    this.shieldActive = false; this.shieldHp = 0; this.shieldTimer = 0;
    this.kbTimer = 0; this.kbVx = 0; this.kbVz = 0;
    this.lastX = this.x; this.lastZ = this.z; this.vx = 0; this.vz = 0;
    this.spellDash = false; this.damageTakenMult = 1.0; this.damageTakenTimer = 0;
    this.onDeath = null; this._killCredited = false;
    this.status = { chillTimer: 0, chillFactor: 1.0, burnTimer: 0, burnDps: 0, poisonTimer: 0, poisonDps: 0, stunTimer: 0, dotOwner: null, dotSpellId: null };

    this.hero = options.hero || (options.heroId ? HEROES.find(h => h.id === options.heroId) : null) || HEROES[0];
    if (options.robeColor && !options.hero) {
      this.hero = { ...this.hero, bodyColor: options.robeColor, accentColor: options.hatColor || this.hero.accentColor };
    }
    this.isBot = !!options.isBot;

    this.group = new THREE.Group();
    this.visualMesh = new THREE.Group();
    this.visualMesh.scale.setScalar(HERO_VISUAL_SCALE);
    this.group.add(this.visualMesh);
    this.scene.add(this.group);

    buildHeroVisual(this, this.hero);
    this.robeMat = this.bodyMat; this.hatMat = this.accentMat;

    this.hitTimer = 0; this.walkTime = 0; this.wobbleZ = 0; this.leanX = 0; this.leanZ = 0;
    this.faceYaw = 0; this.postCastTimer = 0;
    this.punchTimer = 0; this.castTimer = 0; this.orbTimer = 0; this.isDying = false; this.deathTimer = 0;
    this.rightArm = this.rightArm || this.visualMesh.children.find((c) => c.position && Math.abs(c.position.x - 0.38) < 0.1);
    this.staffShaft = this.staffShaft || this.visualMesh.children.find((c) => c.position && Math.abs(c.position.x - 0.68) < 0.1);
  }

  get visible() { return this.group ? this.group.visible : true; }
  set visible(val) { if (this.group) this.group.visible = val; }

  rebuildHeroVisual(hero) {
    this.hero = hero;
    this.rightArm = this.leftArm = this.leftLeg = this.rightLeg = this.staffShaft = null;
    this.staffOrb = this.staffOrbMat = this.staffAccentMesh = this.staffAccentMat = this.staffTip = null;
    this.headGroup = this.haloGlow = this.headOutlineMesh = this.bodyMat = this.accentMat = null;
    this.spinningStaffTip = this.tierVisuals = this.shieldMesh = this.outlineMesh = this.outlineMeshes = null;
    while (this.visualMesh.children.length > 0) this.visualMesh.remove(this.visualMesh.children[0]);
    buildHeroVisual(this, hero);
    this.robeMat = this.bodyMat; this.hatMat = this.accentMat;
  }

  getStaffTipWorld(outVec3) {
    return getActorStaffTipWorld(this, outVec3);
  }

  setHeroEmissive(hex) {
    if (this.isBot && !this.glbHero) return;
    for (const m of this.visualMats || this.heroMats || [this.bodyMat, this.accentMat]) m?.emissive?.setHex(hex);
  }

  setHeroOpacity(opacity) {
    if (this.isBot) return;
    const translucent = opacity < 1;
    for (const m of this.visualMats || this.heroMats || [this.bodyMat, this.accentMat, this.staffOrbMat]) {
      if (!m) continue;
      m.transparent = translucent || !!m.userData?.keepTransparent;
      m.opacity = opacity;
    }
  }

  _hideShield() { if (this.shieldMesh && this.damageTakenTimer <= 0) this.shieldMesh.visible = false; }
  _showShield(color) {
    if (!this.shieldMesh) return;
    this.shieldMesh.visible = true;
    if (this.shieldMesh.material) { this.shieldMesh.material.color.setHex(color); this.shieldMesh.material.opacity = 0.45; }
  }

  applyDamageReduction(mult = 0.7, duration = 4.0) {
    this.damageTakenMult = mult; this.damageTakenTimer = duration; this._showShield(0x8b5a2b);
  }

  applyShield(amount = 80, duration = 3.0) {
    this.shieldHp = amount; this.shieldTimer = duration; this.shieldActive = true; this._showShield(0x38bdf8);
  }

  takeDamage(amount, sourceSpell = null) {
    if (this.isDead || this.isInvulnerable) return 0;
    if (this.damageTakenTimer > 0) amount *= this.damageTakenMult;

    if (this.shieldActive && this.shieldHp > 0) {
      if (this.shieldHp >= amount) { this.shieldHp -= amount; return 0; }
      const rem = amount - this.shieldHp; this.shieldHp = 0; this.shieldActive = false;
      this._hideShield(); amount = rem;
    } else if (this.shieldActive) {
      this.shieldActive = false; this._hideShield(); return 0;
    }

    this.hp -= amount; this.hitTimer = 0.08; this.setHeroEmissive(0xffffff);
    if (this.hp <= 0) {
      this.hp = 0; this.die();
      if (!this._killCredited && this.onDeath && this.status.dotOwner) {
        this._killCredited = true; this.onDeath(this.status.dotOwner, this.status.dotSpellId);
      }
    }
    return amount;
  }

  applyChill(factor = 0.3, duration = 1.5) { this.status.chillTimer = duration; this.status.chillFactor = Math.max(0.3, 1.0 - factor); }
  applyStun(duration = 0.5) { this.status.stunTimer = duration; }
  _applyDot(tKey, dKey, dps, dur, owner, spellId) {
    this.status[tKey] = dur; this.status[dKey] = dps;
    if (owner) { this.status.dotOwner = owner; this.status.dotSpellId = spellId; }
  }
  applyBurn(dps = 8, dur = 3.0, owner = null, spellId = null) { this._applyDot('burnTimer', 'burnDps', dps, dur, owner, spellId); }
  applyPoison(dps = 8, dur = 4.0, owner = null, spellId = null) { this._applyDot('poisonTimer', 'poisonDps', dps, dur, owner, spellId); }
  heal(amount) { if (!this.isDead) this.hp = Math.min(this.maxHp, this.hp + amount); }

  triggerCastAnim(isTier3 = false) {
    this.castTimer = 0.23; this.orbTimer = 0.2;
    this.glbHero?.triggerAttack(isTier3);
  }

  triggerHitAnim(dirX = 0, dirZ = 0) {
    this.glbHero?.triggerHit(dirX, dirZ);
  }

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
        if (this.glbHero) {
          this.glbHero.updateDeath(dt);
        } else {
          const progress = Math.max(0, this.deathTimer / 0.35), sc = progress * HERO_VISUAL_SCALE;
          this.visualMesh.scale.set(sc, sc, sc);
          this.setHeroOpacity(progress);
        }
        if (this.deathTimer <= 0) { this.isDying = false; this.destroyVisuals(); }
      }
      return;
    }

    if (this.hitTimer > 0) {
      if ((this.hitTimer -= dt) <= 0) this.setHeroEmissive(this.status.burnTimer > 0 ? 0xff5500 : 0x000000);
    } else if (this.status.burnTimer > 0) {
      this.setHeroEmissive(0xff5500);
    }

    if (this.visible && this.group.visible) {
      const armRotX = this.punchTimer > 0 ? ((this.punchTimer -= dt), -1.2) : (this.castTimer > 0 ? ((this.castTimer -= dt), this.castTimer > 0.15 ? 0.25 : 0.25 * (this.castTimer / 0.15)) : 0);
      if (this.rightArm) this.rightArm.rotation.x = armRotX;
      if (this.staffShaft && this.staffShaft.parent === this.visualMesh) this.staffShaft.rotation.x = armRotX;

      const tier = this.spellSlot?.elements?.length || this.spellSlot?.activeSpell?.tier || 0;
      updateTierVisuals(this, tier, dt);
      if (this.spinningStaffTip) this.spinningStaffTip.rotation.y += dt * 3.0;

      if (this.orbTimer > 0) {
        this.orbTimer -= dt;
        if (this.staffOrb) {
          const pulse = 1.0 + 0.35 * Math.sin(Math.max(0, Math.min(1, 1.0 - this.orbTimer / 0.2)) * Math.PI);
          this.staffOrb.scale.setScalar((this.tierBaseScale || 1.25) * pulse);
        }
      }
    } else {
      if (this.punchTimer > 0) this.punchTimer -= dt;
      if (this.castTimer > 0) this.castTimer -= dt;
      if (this.orbTimer > 0) this.orbTimer -= dt;
    }

    if (this.kbTimer > 0) {
      const decay = this.kbTimer / (this.kbDuration || 0.12);
      this.x += this.kbVx * decay * dt; this.z += this.kbVz * decay * dt;
      this.kbTimer -= dt;
    }

    if (this.shieldTimer > 0 && (this.shieldTimer -= dt) <= 0) {
      this.shieldActive = false; this.shieldHp = 0;
      this._hideShield();
    }

    if (this.damageTakenTimer > 0 && (this.damageTakenTimer -= dt) <= 0) {
      this.damageTakenMult = 1.0;
      if (!this.shieldActive) this._hideShield();
    }

    if (this.status.stunTimer > 0) {
      this.status.stunTimer -= dt; this.speed = 0;
    } else if (this.status.chillTimer > 0) {
      this.status.chillTimer -= dt;
      this.speed = Math.max(this.baseSpeed * 0.3, this.baseSpeed * this.status.chillFactor);
    } else {
      this.speed = this.baseSpeed;
    }

    if (this.status.burnTimer > 0) {
      this.status.burnTimer -= dt; this.takeDamage(this.status.burnDps * dt);
      if (this.status.burnTimer <= 0 && this.hitTimer <= 0) this.setHeroEmissive(0x000000);
    }
    if (this.status.poisonTimer > 0) {
      this.status.poisonTimer -= dt; this.takeDamage(this.status.poisonDps * dt);
    }

    if (dt > 0.001) { this.vx = (this.x - this.lastX) / dt; this.vz = (this.z - this.lastZ) / dt; }
    this.lastX = this.x; this.lastZ = this.z;
    this.group.position.set(this.x, 0, this.z);
  }

  setWobble(isMoving, dt, moveX = 0, moveZ = 0, isDashing = false) {
    setActorWobble(this, isMoving, dt, moveX, moveZ, isDashing);
  }

  die() {
    if (this.isDead) return;
    this.isDead = true; this.isDying = true; this.deathTimer = this.glbHero ? 1.5 : 0.35;
    this._hideShield();
    this.glbHero?.triggerDeath?.();
    if (!this.isBot && !this.glbHero) for (const m of this.visualMats || this.heroMats || []) m.transparent = true;
  }

  destroyVisuals() {
    if (this.isPlayer) { this.group.visible = false; return; }
    this.scene.remove(this.group);
    if (!this.isBot) {
      for (const m of this.visualMats || this.heroMats || []) m.dispose();
      this.shieldMesh?.material?.dispose();
    }
  }

  destroy() { this.isDead = true; this.isDying = false; this.destroyVisuals(); }
}

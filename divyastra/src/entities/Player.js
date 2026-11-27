import * as THREE from 'three';
import { Actor } from './Actor.js';
import { PLAYER_BASE, getLevelConfig, COLORS, ARENA, HEROES } from '../config/constants.js';
import { SpellSlotController } from './SpellSlotController.js';
import { getSpell, FIST_SPELL } from '../config/spellRegistry.js';
import { TapasComponent } from './TapasComponent.js';
import { getDifficulty } from '../config/difficulty.js';
import { updateActorFacing } from './Locomotion.js';

export class Player extends Actor {
  constructor(scene, inputManager, hero = null) {
    const selectedHeroId = (typeof localStorage !== 'undefined') ? localStorage.getItem('magica_selected_hero') : null;
    const playerHero = hero || HEROES.find((h) => h.id === selectedHeroId) || HEROES[0];

    super(scene, { x: 0, z: 0, radius: PLAYER_BASE.RADIUS, maxHp: PLAYER_BASE.MAX_HP, moveSpeed: PLAYER_BASE.MOVE_SPEED, hero: playerHero });

    this.input = inputManager;
    this.isPlayer = true;
    this.spellSlot = new SpellSlotController();
    this.punchTimer = 0;
    this.level = 1;
    this.xp = 0;
    this.kills = 0;
    this.dmgBonus = 0;
    this.allowInfiniteLevels = false;
    this.perks = [];
    this.staffElement = null;
    this.spellDamageMult = 1.0;
    this.cooldownMult = 1.0;
    this.metaDamageTakenMult = 1.0;
    this.dashCooldownMult = 1.0;
    this.xpMult = 1.0;
    this.arcaneShieldTimer = 0;

    // Dash state
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashVec = { x: 0, z: 0 };
    this.shootCooldown = 0;
    this.castMoveMult = 1.0;

    this.tapas = new TapasComponent(this);

    // Aim Indicator
    const aimLineGeo = new THREE.PlaneGeometry(0.35, 9);
    aimLineGeo.translate(0, 4.5, 0); aimLineGeo.rotateX(-Math.PI / 2);
    this.aimLineMat = new THREE.MeshBasicMaterial({
      color: this.currentSpell.color || COLORS.AIM_LASER,
      transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false
    });
    this.aimLine = new THREE.Mesh(aimLineGeo, this.aimLineMat);
    this.aimLine.position.y = 0.05; this.aimLine.renderOrder = 5;
    this.group.add(this.aimLine);

    const aimCircleGeo = new THREE.RingGeometry(0.96, 1.0, 32); aimCircleGeo.rotateX(-Math.PI / 2);
    this.aimCircleMat = new THREE.MeshBasicMaterial({ color: COLORS.AIM_LASER, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    this.aimCircle = new THREE.Mesh(aimCircleGeo, this.aimCircleMat);
    this.aimCircle.position.y = 0.05; this.aimCircle.renderOrder = 5; this.aimCircle.visible = false;
    this.group.add(this.aimCircle);

    // Player Marker
    this.markerTime = 0;
    const ringGeo = new THREE.RingGeometry(1.25, 1.48, 32); ringGeo.rotateX(-Math.PI / 2);
    this.markerRingMat = new THREE.MeshBasicMaterial({ color: COLORS.AIM_LASER, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
    this.markerRing = new THREE.Mesh(ringGeo, this.markerRingMat);
    this.markerRing.position.y = 0.05; this.markerRing.renderOrder = 5; this.group.add(this.markerRing);

    const glowGeo = new THREE.RingGeometry(1.05, 1.75, 32); glowGeo.rotateX(-Math.PI / 2);
    this.markerGlowMat = new THREE.MeshBasicMaterial({ color: COLORS.AIM_LASER, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    this.markerGlow = new THREE.Mesh(glowGeo, this.markerGlowMat);
    this.markerGlow.position.y = 0.048; this.markerGlow.renderOrder = 5; this.group.add(this.markerGlow);

    const arrowGeo = new THREE.ConeGeometry(0.32, 0.58, 4);
    arrowGeo.rotateX(Math.PI);
    this.markerArrowMat = new THREE.MeshBasicMaterial({ color: COLORS.AIM_LASER, transparent: true, opacity: 0.95 });
    this.markerArrow = new THREE.Mesh(arrowGeo, this.markerArrowMat);
    this.markerArrow.position.y = 3.6;
    this.group.add(this.markerArrow);

    if (this.staffOrbMat && this.currentSpell) {
      this.staffOrbMat.color.setHex(this.currentSpell.color);
    }
  }

  get currentSpell() {
    return this.spellSlot ? this.spellSlot.activeSpell : FIST_SPELL;
  }

  set currentSpell(val) {
    if (this.spellSlot) this.spellSlot.currentSpell = val;
  }

  setSpell(spellKey) {
    const sp = getSpell(spellKey);
    if (sp) {
      if (this.spellSlot) this.spellSlot.currentSpell = sp;
      if (this.staffOrbMat) this.staffOrbMat.color.setHex(sp.color);
      if (this.aimLineMat) this.aimLineMat.color.setHex(sp.color);
    }
  }

  get tapasActive() { return this.tapas?.active || false; }
  get tapasTimer() { return this.tapas?.timer || 0; }
  get tapasRingMat() { return this.tapas?.ringMat; }
  set onTapasReadyCallback(cb) { if (this.tapas) this.tapas.onReady = cb; }
  get onTapasReadyCallback() { return this.tapas?.onReady; }

  takeDamage(amount, sourceSpell = null) {
    if (this.tapas) this.tapas.breakTapas();
    const hadShield = this.shieldActive;
    const reduced = amount * (this.metaDamageTakenMult ?? 1.0);
    const dealt = super.takeDamage(reduced, sourceSpell);
    if (hadShield && !this.shieldActive && this.perks.includes('ARCANE_SHIELD')) {
      this.arcaneShieldTimer = 20.0;
    }
    if (dealt > 0) this.onDamage?.(dealt);
    return dealt;
  }

  breakTapas() {
    this.tapas?.breakTapas();
  }

  consumeTapasBonus() {
    return this.tapas ? this.tapas.consumeBonus() : 0;
  }

  addXP(amount, onLevelUp) {
    const mult = (getDifficulty()?.playerXpMult ?? 1.0) * (this.xpMult ?? 1.0);
    this.xp += Math.round(amount * mult);
    const nextConfig = getLevelConfig(this.level + 1, this.allowInfiniteLevels);
    if (nextConfig && this.xp >= nextConfig.xpReq) {
      this.level += 1;
      this.maxHp += nextConfig.hpBonus;
      this.hp = Math.min(this.maxHp, this.hp + nextConfig.hpBonus);
      this.dmgBonus += nextConfig.dmgBonus;
      if (onLevelUp) onLevelUp(this.level, nextConfig.rewardType);
      const afterConfig = getLevelConfig(this.level + 1, this.allowInfiniteLevels);
      if (afterConfig && this.xp >= afterConfig.xpReq) this.xp = afterConfig.xpReq - 1;
    }
  }

  applyPerk(perk) {
    if (perk.stackable) {
      if (perk.id === 'ENDLESS_POWER') this.spellDamageMult = +((this.spellDamageMult ?? 1.0) + 0.10).toFixed(2);
      if (perk.id === 'ENDLESS_VITALITY') {
        this.maxHp += 60;
        this.hp = Math.min(this.maxHp, this.hp + 80);
      }
      if (perk.id === 'ENDLESS_HASTE') this.cooldownMult = Math.max(0.35, +((this.cooldownMult ?? 1.0) * 0.92).toFixed(3));
      if (perk.id === 'ENDLESS_SWIFT') {
        this.baseSpeed *= 1.08;
        this.speed = this.baseSpeed;
      }
      if (perk.id === 'ENDLESS_WISDOM') this.xpMult = +((this.xpMult ?? 1.0) + 0.15).toFixed(2);
      return;
    }
    this.perks.push(perk.id);
    if (perk.id === 'WINDWALKER') this.baseSpeed *= 1.2;
    if (perk.id === 'ARCANE_SHIELD') {
      this.shieldActive = true;
      if (this.shieldMesh) this.shieldMesh.visible = true;
      this.arcaneShieldTimer = 0;
    }
  }

  update(dt, bushes = []) {
    if (this.isDead) {
      this.castMoveMult = 1.0;
      if (this.isDying) {
        super.update(dt);
      }
      return;
    }

    if (this.perks.includes('ARCANE_SHIELD')) {
      if (!this.shieldActive) {
        if (this.arcaneShieldTimer > 0) {
          this.arcaneShieldTimer -= dt;
          if (this.arcaneShieldTimer <= 0) {
            this.shieldActive = true;
            if (this.shieldMesh) this.shieldMesh.visible = true;
          }
        }
      } else if (this.shieldMesh && !this.shieldMesh.visible) {
        this.shieldMesh.visible = true;
      }
    }

    if (this.spellSlot) {
      this.spellSlot.update(dt);
      this.shootCooldown = this.spellSlot.cooldownTimer;
    } else if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }

    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;

    if (this.input.dashRequested) {
      this.input.dashRequested = false;
      const baseCd = this.perks.includes('WINDWALKER') ? Math.max(1.5, PLAYER_BASE.DASH_COOLDOWN - 1.0) : PLAYER_BASE.DASH_COOLDOWN;
      const cooldown = Math.max(1.2, baseCd * (this.dashCooldownMult ?? 1.0));
      if (this.dashCooldownTimer <= 0 && this.dashTimer <= 0 && !(this.status?.stunTimer > 0)) {
        this.dashTimer = PLAYER_BASE.DASH_DURATION;
        this.dashCooldownTimer = cooldown;
        this.isInvulnerable = true;
        const hasMove = Math.hypot(this.input.moveDir.x, this.input.moveDir.z) > 0.1;
        this.dashVec.x = hasMove ? this.input.moveDir.x : this.input.aimDir.x;
        this.dashVec.z = hasMove ? this.input.moveDir.z : this.input.aimDir.z;
      }
    }

    const moveSpeed = this.speed * this.castMoveMult;
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.x += this.dashVec.x * PLAYER_BASE.DASH_SPEED * dt;
      this.z += this.dashVec.z * PLAYER_BASE.DASH_SPEED * dt;
      if (this.dashTimer <= 0) this.isInvulnerable = false;
    } else {
      this.x += this.input.moveDir.x * moveSpeed * dt;
      this.z += this.input.moveDir.z * moveSpeed * dt;
    }

    const distFromCenter = Math.hypot(this.x, this.z), maxAllowed = ARENA.RADIUS - this.radius;
    if (distFromCenter > maxAllowed) {
      this.x = (this.x / distFromCenter) * maxAllowed;
      this.z = (this.z / distFromCenter) * maxAllowed;
    }

    const aimAngle = Math.atan2(this.input.aimDir.x, this.input.aimDir.z);
    if (this.glbHero?.isRigged) {
      const moveLen = Math.hypot(this.input.moveDir.x, this.input.moveDir.z);
      const realSpeed = this.dashTimer > 0 ? PLAYER_BASE.DASH_SPEED : Math.min(1, moveLen) * moveSpeed;
      updateActorFacing(this, dt, this.input.moveDir.x, this.input.moveDir.z, this.input.aimDir.x, this.input.aimDir.z, this.input.isAiming, realSpeed);
    } else {
      this.visualMesh.rotation.y = aimAngle;
    }
    this.aimLine.rotation.y = aimAngle;
    const isRadial = this.currentSpell?.trajectory === 'RADIAL', isGiant = this.perks?.includes('GIANT_ARCANA');
    const showAim = this.input.isAiming || !this.input.usingTouch;
    if (isRadial) {
      const rad = (this.currentSpell?.radius || 6.0) * (isGiant ? 1.4 : 1.0);
      this.aimCircle.scale.set(rad, 1, rad);
      this.aimCircleMat.color.setHex(this.currentSpell?.color || COLORS.AIM_LASER);
      this.aimCircle.visible = showAim; this.aimLine.visible = false;
    } else {
      this.aimCircle.visible = false; this.aimLine.visible = showAim;
    }

    const isMoving = Math.hypot(this.input.moveDir.x, this.input.moveDir.z) > 0.05 || this.dashTimer > 0;
    this.setWobble(isMoving && this.dashTimer <= 0, dt, this.input.moveDir.x, this.input.moveDir.z, this.dashTimer > 0);

    this.tapas.update(dt, isMoving, this.shootCooldown > 0);

    const inBush = bushes.some((bush) => bush.checkInside(this.x, this.z));
    const targetOpacity = inBush ? 0.35 : 1.0;
    this.setHeroOpacity(targetOpacity);

    this.markerTime += dt;
    const pulse = 1.0 + Math.sin(this.markerTime * 4.5) * 0.08;
    this.markerRing.scale.set(pulse, 1, pulse); this.markerGlow.scale.set(pulse, 1, pulse);
    this.markerRingMat.opacity = (0.75 + Math.sin(this.markerTime * 4.5) * 0.15) * targetOpacity;
    this.markerGlowMat.opacity = 0.5 * targetOpacity; this.markerArrowMat.opacity = targetOpacity;
    this.markerArrow.position.y = 3.6 + Math.sin(this.markerTime * 4.0) * 0.12;
    this.markerArrow.rotation.y += dt * 1.5;

    super.update(dt);
  }

  destroyVisuals() {
    this.tapas?.destroy();
    this.group.visible = false;
  }
}

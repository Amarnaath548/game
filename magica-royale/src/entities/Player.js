import * as THREE from 'three';
import { Actor } from './Actor.js';
import { PLAYER_BASE, SPELLS, LEVEL_TABLE, COLORS, ARENA, HEROES } from '../config/constants.js';

export class Player extends Actor {
  constructor(scene, inputManager, hero = null) {
    const selectedHeroId = (typeof localStorage !== 'undefined') ? localStorage.getItem('magica_selected_hero') : null;
    const playerHero = hero || HEROES.find((h) => h.id === selectedHeroId) || HEROES[0];

    super(scene, {
      x: 0,
      z: 0,
      radius: PLAYER_BASE.RADIUS,
      maxHp: PLAYER_BASE.MAX_HP,
      moveSpeed: PLAYER_BASE.MOVE_SPEED,
      hero: playerHero
    });

    this.input = inputManager;
    this.isPlayer = true;
    this.currentSpell = SPELLS.PYRO;
    this.level = 1;
    this.xp = 0;
    this.kills = 0;
    this.dmgBonus = 0;
    this.perks = [];

    // Dash state
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashVec = { x: 0, z: 0 };
    this.shootCooldown = 0;

    // Ground Aim Indicator
    const aimLineGeo = new THREE.PlaneGeometry(0.35, 9);
    aimLineGeo.translate(0, 4.5, 0);
    aimLineGeo.rotateX(-Math.PI / 2);
    this.aimLineMat = new THREE.MeshBasicMaterial({
      color: COLORS.AIM_LASER,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    this.aimLine = new THREE.Mesh(aimLineGeo, this.aimLineMat);
    this.aimLine.position.y = 0.06;
    this.group.add(this.aimLine);
  }

  setSpell(spellKey) {
    if (SPELLS[spellKey]) {
      this.currentSpell = SPELLS[spellKey];
      this.staffOrbMat.color.setHex(this.currentSpell.color);
      this.aimLineMat.color.setHex(this.currentSpell.color);
    }
  }

  addXP(amount, onLevelUp) {
    this.xp += amount;
    const nextConfig = LEVEL_TABLE.find((lvl) => lvl.level === this.level + 1);
    if (nextConfig && this.xp >= nextConfig.xpReq) {
      this.level += 1;
      this.maxHp += nextConfig.hpBonus;
      this.hp = Math.min(this.maxHp, this.hp + nextConfig.hpBonus);
      this.dmgBonus += nextConfig.dmgBonus;
      if (onLevelUp) onLevelUp(this.level, nextConfig.rewardType);
    }
  }

  applyPerk(perk) {
    this.perks.push(perk.id);
    if (perk.id === 'WINDWALKER') {
      this.baseSpeed *= 1.2;
    }
    if (perk.id === 'ARCANE_SHIELD') {
      this.shieldActive = true;
    }
  }

  update(dt, bushes = []) {
    if (this.isDead) return;

    // Timers
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    // Dash Trigger
    if (this.input.dashRequested) {
      this.input.dashRequested = false;
      const cooldown = this.perks.includes('WINDWALKER')
        ? Math.max(1.5, PLAYER_BASE.DASH_COOLDOWN - 1.0)
        : PLAYER_BASE.DASH_COOLDOWN;

      if (this.dashCooldownTimer <= 0 && this.dashTimer <= 0) {
        this.dashTimer = PLAYER_BASE.DASH_DURATION;
        this.dashCooldownTimer = cooldown;
        this.isInvulnerable = true;

        const hasMove = Math.hypot(this.input.moveDir.x, this.input.moveDir.z) > 0.1;
        this.dashVec.x = hasMove ? this.input.moveDir.x : this.input.aimDir.x;
        this.dashVec.z = hasMove ? this.input.moveDir.z : this.input.aimDir.z;
      }
    }

    // Movement
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.x += this.dashVec.x * PLAYER_BASE.DASH_SPEED * dt;
      this.z += this.dashVec.z * PLAYER_BASE.DASH_SPEED * dt;
      if (this.dashTimer <= 0) {
        this.isInvulnerable = false;
      }
    } else {
      this.x += this.input.moveDir.x * this.speed * dt;
      this.z += this.input.moveDir.z * this.speed * dt;
    }

    // Arena Boundary Clamp
    const distFromCenter = Math.hypot(this.x, this.z);
    const maxAllowed = ARENA.RADIUS - this.radius;
    if (distFromCenter > maxAllowed) {
      this.x = (this.x / distFromCenter) * maxAllowed;
      this.z = (this.z / distFromCenter) * maxAllowed;
    }

    // Orient Mesh & Aim Indicator
    const aimAngle = Math.atan2(this.input.aimDir.x, this.input.aimDir.z);
    this.visualMesh.rotation.y = aimAngle;
    this.aimLine.rotation.y = aimAngle;
    this.aimLine.visible = this.input.isAiming || !this.input.usingTouch;

    // Wobble
    const isMoving = Math.hypot(this.input.moveDir.x, this.input.moveDir.z) > 0.05;
    this.setWobble(isMoving && this.dashTimer <= 0, dt);

    // Bush Stealth
    const inBush = bushes.some((bush) => bush.checkInside(this.x, this.z));
    const targetOpacity = inBush ? 0.35 : 1.0;
    this.robeMat.transparent = inBush;
    this.robeMat.opacity = targetOpacity;

    super.update(dt);
  }
}


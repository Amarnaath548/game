import * as THREE from 'three';
import { Actor } from './Actor.js';
import { PLAYER_BASE, ARENA, LEVEL_TABLE, HEROES } from '../config/constants.js';
import { BotBrain } from './BotBrain.js';
import { SpellSlotController } from './SpellSlotController.js';

export class Bot extends Actor {
  constructor(scene, x, z, id = 1, hero = null) {
    const botHero = hero || HEROES[(id - 1) % HEROES.length];
    super(scene, {
      x,
      z,
      radius: PLAYER_BASE.RADIUS,
      maxHp: PLAYER_BASE.MAX_HP,
      moveSpeed: PLAYER_BASE.MOVE_SPEED * (0.85 + Math.random() * 0.15),
      hero: botHero
    });

    this.id = id;
    this.name = `${botHero.name}_${id}`;
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.dmgBonus = 0;

    // Personality (0.3 - 1.0)
    this.personality = {
      aggression: 0.3 + Math.random() * 0.7,
      caution: 0.3 + Math.random() * 0.7,
      skill: 0.3 + Math.random() * 0.7
    };

    // SpellSlotController with start element weighted by personality
    const startElem = this.personality.aggression > 0.65 ? 'F' : (this.personality.caution > 0.65 ? 'W' : 'E');
    this.spellSlot = new SpellSlotController(startElem);
    if (this.staffOrbMat && this.currentSpell) {
      this.staffOrbMat.color.setHex(this.currentSpell.color);
    }

    this.state = 'FORAGE';
    this.skirmishMoveTimer = 1.0 + Math.random() * 0.8;
    this.strafeDir = (this.id % 2 === 0) ? 1 : -1;
    this.shootCooldown = 0.5 + Math.random() * 0.5;

    // Dash
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashVec = { x: 0, z: 0 };

    this.roamTarget = { x: 0, z: 0 };
    this.pickRoamWaypoint(30);
    this.waypointTimer = 0;

    this.brain = new BotBrain(this);
  }

  get currentSpell() {
    return this.spellSlot ? this.spellSlot.currentSpell : null;
  }

  set currentSpell(val) {
    if (this.spellSlot) this.spellSlot.currentSpell = val;
  }

  pickElementalUpgrade() {
    if (!this.spellSlot || this.spellSlot.elements.length >= 3) return;
    const fireW = this.personality.aggression * 2.5;
    const waterW = this.personality.caution * 2.5;
    const earthW = Math.max(0.6, 2.4 - Math.abs(this.personality.aggression - this.personality.caution));
    const total = fireW + waterW + earthW;
    const roll = Math.random() * total;
    const picked = roll < fireW ? 'F' : (roll < fireW + waterW ? 'W' : 'E');
    this.spellSlot.addElement(picked);
    if (this.staffOrbMat && this.currentSpell) {
      this.staffOrbMat.color.setHex(this.currentSpell.color);
    }
  }

  addXP(amount) {
    this.xp += amount;
    while (true) {
      const nextConfig = LEVEL_TABLE.find((lvl) => lvl.level === this.level + 1);
      if (nextConfig && this.xp >= nextConfig.xpReq) {
        this.level += 1;
        this.maxHp += nextConfig.hpBonus;
        this.hp = Math.min(this.maxHp, this.hp + nextConfig.hpBonus);
        this.dmgBonus += nextConfig.dmgBonus;
        this.pickElementalUpgrade();
      } else {
        break;
      }
    }
  }

  dash(dirX, dirZ) {
    if (this.dashCooldownTimer <= 0 && this.dashTimer <= 0) {
      this.dashTimer = PLAYER_BASE.DASH_DURATION;
      this.dashCooldownTimer = PLAYER_BASE.DASH_COOLDOWN;
      this.isInvulnerable = true;
      const len = Math.hypot(dirX, dirZ) || 1;
      this.dashVec.x = dirX / len;
      this.dashVec.z = dirZ / len;
    }
  }

  pickRoamWaypoint(maxR = 35) {
    const angle = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * Math.max(4, maxR - 4);
    this.roamTarget.x = Math.cos(angle) * r;
    this.roamTarget.z = Math.sin(angle) * r;
  }

  think(dt, zoneRadius, allActors, chests = [], gems = [], healthOrbs = [], playerKills = 0, projectiles = [], onShoot) {
    if (this.isDead) return;

    if (this.spellSlot) {
      this.spellSlot.update(dt);
      this.shootCooldown = this.spellSlot.cooldownTimer;
    } else {
      this.shootCooldown -= dt;
    }
    this.waypointTimer -= dt;
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;

    let moveX = 0, moveZ = 0, aimX = 0, aimZ = 0;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.x += this.dashVec.x * PLAYER_BASE.DASH_SPEED * dt;
      this.z += this.dashVec.z * PLAYER_BASE.DASH_SPEED * dt;
      if (this.dashTimer <= 0) this.isInvulnerable = false;
      aimX = this.dashVec.x;
      aimZ = this.dashVec.z;
    } else {
      const decision = this.brain.evaluate(dt, zoneRadius, allActors, chests, gems, healthOrbs, playerKills, projectiles, onShoot);
      moveX = decision.moveX;
      moveZ = decision.moveZ;
      aimX = decision.aimX;
      aimZ = decision.aimZ;

      const moveLen = Math.hypot(moveX, moveZ);
      if (moveLen > 0.01) {
        this.x += (moveX / moveLen) * this.speed * dt;
        this.z += (moveZ / moveLen) * this.speed * dt;
      }
    }

    const distFromCenter = Math.hypot(this.x, this.z);
    const maxAllowed = ARENA.RADIUS - this.radius;
    if (distFromCenter > maxAllowed) {
      this.x = (this.x / distFromCenter) * maxAllowed;
      this.z = (this.z / distFromCenter) * maxAllowed;
    }

    const aimLen = Math.hypot(aimX, aimZ);
    if (aimLen > 0.01) {
      const aimAngle = Math.atan2(aimX, aimZ);
      this.visualMesh.rotation.y = THREE.MathUtils.lerp(this.visualMesh.rotation.y, aimAngle, 0.2);
    }

    this.setWobble(Math.hypot(moveX, moveZ) > 0.05 && this.dashTimer <= 0, dt);
    super.update(dt);
  }
}

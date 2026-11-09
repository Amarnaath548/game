import * as THREE from 'three';
import { Actor } from './Actor.js';
import { SPELLS, PLAYER_BASE, ARENA, LEVEL_TABLE } from '../config/constants.js';
import { BotBrain } from './BotBrain.js';

const BOT_ROBE_COLORS = [0x2563eb, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];

export class Bot extends Actor {
  constructor(scene, x, z, id = 1) {
    const robeColor = BOT_ROBE_COLORS[id % BOT_ROBE_COLORS.length];
    super(scene, {
      x,
      z,
      radius: PLAYER_BASE.RADIUS,
      maxHp: PLAYER_BASE.MAX_HP,
      moveSpeed: PLAYER_BASE.MOVE_SPEED * (0.85 + Math.random() * 0.15),
      robeColor,
      hatColor: 0x1f2937
    });

    this.id = id;
    this.name = `Bot_${id}`;
    this.kills = 0;

    // Progression
    this.level = 1;
    this.xp = 0;
    this.dmgBonus = 0;

    // Personality (0.3 - 1.0)
    this.personality = {
      aggression: 0.3 + Math.random() * 0.7,
      caution: 0.3 + Math.random() * 0.7,
      skill: 0.3 + Math.random() * 0.7
    };

    // Spell & visuals
    const spellKeys = Object.keys(SPELLS);
    this.currentSpell = SPELLS[spellKeys[Math.floor(Math.random() * spellKeys.length)]];
    this.staffOrbMat.color.setHex(this.currentSpell.color);

    // State & Timers
    this.state = 'FORAGE';
    this.skirmishMoveTimer = 1.0 + Math.random() * 0.8;
    this.strafeDir = (this.id % 2 === 0) ? 1 : -1;
    this.shootCooldown = 0.5 + Math.random() * 0.5;

    // Dash
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashVec = { x: 0, z: 0 };

    // Roam target
    this.roamTarget = { x: 0, z: 0 };
    this.pickRoamWaypoint(40);
    this.waypointTimer = 0;

    this.brain = new BotBrain(this);
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

  pickRoamWaypoint(maxR = 60) {
    const angle = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * (maxR - 8);
    this.roamTarget.x = Math.cos(angle) * r;
    this.roamTarget.z = Math.sin(angle) * r;
  }

  think(dt, zoneRadius, allActors, chests = [], gems = [], healthOrbs = [], playerKills = 0, projectiles = [], onShoot) {
    if (this.isDead) return;

    this.shootCooldown -= dt;
    this.waypointTimer -= dt;
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;

    let moveX = 0;
    let moveZ = 0;
    let aimX = 0;
    let aimZ = 0;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.x += this.dashVec.x * PLAYER_BASE.DASH_SPEED * dt;
      this.z += this.dashVec.z * PLAYER_BASE.DASH_SPEED * dt;
      if (this.dashTimer <= 0) {
        this.isInvulnerable = false;
      }
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

    // Arena boundary clamp
    const distFromCenter = Math.hypot(this.x, this.z);
    const maxAllowed = ARENA.RADIUS - this.radius;
    if (distFromCenter > maxAllowed) {
      this.x = (this.x / distFromCenter) * maxAllowed;
      this.z = (this.z / distFromCenter) * maxAllowed;
    }

    // Aim rotation
    const aimLen = Math.hypot(aimX, aimZ);
    if (aimLen > 0.01) {
      const aimAngle = Math.atan2(aimX, aimZ);
      this.visualMesh.rotation.y = THREE.MathUtils.lerp(this.visualMesh.rotation.y, aimAngle, 0.2);
    }

    this.setWobble(Math.hypot(moveX, moveZ) > 0.05 && this.dashTimer <= 0, dt);
    super.update(dt);
  }
}

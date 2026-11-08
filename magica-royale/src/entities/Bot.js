import * as THREE from 'three';
import { Actor } from './Actor.js';
import { SPELLS, PLAYER_BASE } from '../config/constants.js';

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
    const spellKeys = Object.keys(SPELLS);
    this.currentSpell = SPELLS[spellKeys[Math.floor(Math.random() * spellKeys.length)]];
    this.staffOrbMat.color.setHex(this.currentSpell.color);

    this.shootCooldown = 1.0 + Math.random() * 0.5;
    this.target = null;
    this.roamTarget = { x: 0, z: 0 };
    this.pickRoamWaypoint(30);

    this.state = 'ROAM'; // 'SAFE', 'COMBAT', 'LOOT', 'ROAM'
    this.changeStateTimer = 0;
    this.lootCooldown = 0;
  }

  pickRoamWaypoint(maxR = 60) {
    const angle = Math.random() * Math.PI * 2;
    const r = 15 + Math.random() * (maxR - 15);
    this.roamTarget.x = Math.cos(angle) * r;
    this.roamTarget.z = Math.sin(angle) * r;
  }

  think(dt, zoneRadius, allActors, chests, onShoot) {
    if (this.isDead) return;

    this.shootCooldown -= dt;
    this.changeStateTimer -= dt;

    const distFromCenter = Math.hypot(this.x, this.z);
    let moveX = 0;
    let moveZ = 0;
    let aimX = 0;
    let aimZ = 0;

    // 1. SAFE_CHECK: outside or close to edge of zone
    if (distFromCenter > zoneRadius * 0.88) {
      this.state = 'SAFE';
      // Pull toward (0,0) with some lateral evasion
      moveX = -this.x / (distFromCenter || 1);
      moveZ = -this.z / (distFromCenter || 1);
      aimX = moveX;
      aimZ = moveZ;
    } else {
      // 2. CHECK NEARBY CHESTS FIRST (Prioritize looting early game)
      let closestChest = null;
      let closestChestDist = 22;

      for (const chest of chests) {
        if (chest.isDead) continue;
        const dist = Math.hypot(chest.x - this.x, chest.z - this.z);
        if (dist < closestChestDist) {
          closestChestDist = dist;
          closestChest = chest;
        }
      }

      // Check for alive actors (bots strongly prioritize the player if in range)
      let targetEnemy = null;
      let targetEnemyDist = 18;

      // Find player first if nearby
      const playerActor = allActors.find((a) => !a.isDead && a.constructor.name === 'Player');
      if (playerActor) {
        const pDist = Math.hypot(playerActor.x - this.x, playerActor.z - this.z);
        if (pDist < 25) {
          targetEnemy = playerActor;
          targetEnemyDist = pDist;
        }
      }

      // If no player nearby and no chests, look for other bots (shorter engagement radius)
      if (!targetEnemy && !closestChest) {
        for (const other of allActors) {
          if (other === this || other.isDead) continue;
          const dist = Math.hypot(other.x - this.x, other.z - this.z);
          if (dist < 14) { // only engage bots if very close
            targetEnemyDist = dist;
            targetEnemy = other;
            break;
          }
        }
      }

      if (targetEnemy) {
        this.state = 'COMBAT';
        const edx = targetEnemy.x - this.x;
        const edz = targetEnemy.z - this.z;
        const edist = Math.hypot(edx, edz) || 1;

        // Aim at enemy with realistic human-like aim spread
        const aimJitter = (Math.random() - 0.5) * 0.25;
        const baseAngle = Math.atan2(edx, edz) + aimJitter;
        aimX = Math.sin(baseAngle);
        aimZ = Math.cos(baseAngle);

        // Strafe around enemy
        const strafeDir = (this.id % 2 === 0) ? 1 : -1;
        const perpX = -Math.cos(baseAngle) * strafeDir;
        const perpZ = Math.sin(baseAngle) * strafeDir;

        // Keep optimal distance (~10-15 units)
        const distanceBias = edist < 9 ? -0.6 : (edist > 15 ? 0.5 : 0);
        moveX = perpX + (edx / edist) * distanceBias;
        moveZ = perpZ + (edz / edist) * distanceBias;

        // Slower fire rate so bots do NOT wipe each other out immediately
        if (this.shootCooldown <= 0 && onShoot) {
          this.shootCooldown = this.currentSpell.cooldown * (2.2 + Math.random() * 1.0);
          onShoot(this, aimX, aimZ);
        }
      } else if (closestChest) {
        this.state = 'LOOT';
        const cdx = closestChest.x - this.x;
        const cdz = closestChest.z - this.z;
        const cdist = Math.hypot(cdx, cdz) || 1;

        aimX = cdx / cdist;
        aimZ = cdz / cdist;

        if (cdist > 7) {
          moveX = aimX;
          moveZ = aimZ;
        } else {
          // In firing range of chest
          if (this.shootCooldown <= 0 && onShoot) {
            this.shootCooldown = this.currentSpell.cooldown * 1.5;
            onShoot(this, aimX, aimZ);
          }
        }
      } else {
        // 4. ROAM
        this.state = 'ROAM';
        if (this.changeStateTimer <= 0) {
          this.changeStateTimer = 4 + Math.random() * 4;
          this.pickRoamWaypoint(Math.min(zoneRadius * 0.75, 55));
        }
        const rdx = this.roamTarget.x - this.x;
        const rdz = this.roamTarget.z - this.z;
        const rdist = Math.hypot(rdx, rdz) || 1;
        moveX = rdx / rdist;
        moveZ = rdz / rdist;
        aimX = moveX;
        aimZ = moveZ;
      }
    }

    // Normalize movement
    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 0.01) {
      moveX /= moveLen;
      moveZ /= moveLen;
      this.x += moveX * this.speed * dt;
      this.z += moveZ * this.speed * dt;
    }

    // Aim rotation
    const aimLen = Math.hypot(aimX, aimZ);
    if (aimLen > 0.01) {
      const aimAngle = Math.atan2(aimX, aimZ);
      this.visualMesh.rotation.y = THREE.MathUtils.lerp(this.visualMesh.rotation.y, aimAngle, 0.2);
    }

    this.setWobble(moveLen > 0.05, dt);
    super.update(dt);
  }
}


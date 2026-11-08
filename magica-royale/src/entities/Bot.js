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

  pickRoamWaypoint(maxR = 60, playerX = 0, playerZ = 0) {
    // 65% chance to roam towards player's general vicinity to create action
    if (Math.random() < 0.65) {
      const offsetAngle = (Math.random() - 0.5) * Math.PI * 0.8;
      const baseAngle = Math.atan2(playerX - this.x, playerZ - this.z) + offsetAngle;
      const dist = 10 + Math.random() * 20;
      this.roamTarget.x = this.x + Math.sin(baseAngle) * dist;
      this.roamTarget.z = this.z + Math.cos(baseAngle) * dist;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * (maxR - 10);
      this.roamTarget.x = Math.cos(angle) * r;
      this.roamTarget.z = Math.sin(angle) * r;
    }
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

    // Locate player among all actors
    const playerActor = allActors.find((a) => a.isPlayer && !a.isDead);

    // 1. SAFE_CHECK: outside or close to edge of zone -> run inside toward center
    if (distFromCenter > zoneRadius * 0.82) {
      this.state = 'SAFE';
      moveX = -this.x / (distFromCenter || 1);
      moveZ = -this.z / (distFromCenter || 1);
      aimX = moveX;
      aimZ = moveZ;
    } else {
      // 2. CHECK FOR ENEMY THREATS
      // Priority #1: PLAYER up to 55 units away!
      let targetEnemy = null;
      let targetEnemyDist = 55;

      if (playerActor) {
        const pDist = Math.hypot(playerActor.x - this.x, playerActor.z - this.z);
        if (pDist <= 55) {
          targetEnemy = playerActor;
          targetEnemyDist = pDist;
        }
      }

      // Priority #2: Only fight another bot if no player nearby and bot is very close (<10)
      if (!targetEnemy) {
        for (const other of allActors) {
          if (other === this || other.isDead || other.isPlayer) continue;
          const dist = Math.hypot(other.x - this.x, other.z - this.z);
          if (dist < 10) {
            targetEnemy = other;
            targetEnemyDist = dist;
            break;
          }
        }
      }

      if (targetEnemy) {
        this.state = 'COMBAT';
        const edx = targetEnemy.x - this.x;
        const edz = targetEnemy.z - this.z;
        const edist = Math.hypot(edx, edz) || 1;

        // Aim directly at target with slight aim variance
        const aimJitter = (Math.random() - 0.5) * 0.12;
        const baseAngle = Math.atan2(edx, edz) + aimJitter;
        aimX = Math.sin(baseAngle);
        aimZ = Math.cos(baseAngle);

        // Movement: Strafe + close the gap or back away
        const strafeDir = (this.id % 2 === 0) ? 1 : -1;
        const perpX = -Math.cos(baseAngle) * strafeDir;
        const perpZ = Math.sin(baseAngle) * strafeDir;

        // When chasing player: stay at comfortable attack range (7-14 units)
        const distBias = edist > 13 ? 0.85 : (edist < 6 ? -0.6 : 0.2);
        moveX = perpX * 0.5 + (edx / edist) * distBias;
        moveZ = perpZ * 0.5 + (edz / edist) * distBias;

        // Shoot at enemy when cooldown ready
        if (this.shootCooldown <= 0 && onShoot) {
          const cdMult = targetEnemy.isPlayer ? 1.0 : 2.5;
          this.shootCooldown = this.currentSpell.cooldown * (cdMult + Math.random() * 0.3);
          onShoot(this, aimX, aimZ);
        }
      } else {
        // 3. CHECK CHESTS IF NO PLAYER IS NEARBY
        let closestChest = null;
        let closestChestDist = 20;

        for (const chest of chests) {
          if (chest.isDead) continue;
          const dist = Math.hypot(chest.x - this.x, chest.z - this.z);
          if (dist < closestChestDist) {
            closestChestDist = dist;
            closestChest = chest;
          }
        }

        if (closestChest) {
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
          // 4. ROAM TOWARD PLAYER / WAYPOINT
          this.state = 'ROAM';
          if (this.changeStateTimer <= 0) {
            this.changeStateTimer = 3 + Math.random() * 3;
            const px = playerActor ? playerActor.x : 0;
            const pz = playerActor ? playerActor.z : 0;
            this.pickRoamWaypoint(Math.min(zoneRadius * 0.75, 60), px, pz);
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


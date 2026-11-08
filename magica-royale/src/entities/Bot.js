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
  }

  pickRoamWaypoint(maxR = 40) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * maxR;
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
    if (distFromCenter > zoneRadius * 0.82) {
      this.state = 'SAFE';
      // Pull heavily toward (0,0)
      moveX = -this.x / (distFromCenter || 1);
      moveZ = -this.z / (distFromCenter || 1);
      aimX = moveX;
      aimZ = moveZ;
    } else {
      // 2. COMBAT CHECK: Find closest visible alive enemy (player or other bot)
      let closestEnemy = null;
      let closestEnemyDist = 20; // Aggro range

      for (const other of allActors) {
        if (other === this || other.isDead) continue;
        const dist = Math.hypot(other.x - this.x, other.z - this.z);
        if (dist < closestEnemyDist) {
          closestEnemyDist = dist;
          closestEnemy = other;
        }
      }

      if (closestEnemy) {
        this.state = 'COMBAT';
        const edx = closestEnemy.x - this.x;
        const edz = closestEnemy.z - this.z;
        const edist = Math.hypot(edx, edz) || 1;

        aimX = edx / edist;
        aimZ = edz / edist;

        // Strafe around enemy
        const strafeDir = (this.id % 2 === 0) ? 1 : -1;
        const perpX = -aimZ * strafeDir;
        const perpZ = aimX * strafeDir;

        // Keep optimal distance (~8-12 units)
        const distanceBias = edist < 8 ? -0.5 : (edist > 14 ? 0.6 : 0);
        moveX = perpX + aimX * distanceBias;
        moveZ = perpZ + aimZ * distanceBias;

        // Shoot if cooldown ready
        if (this.shootCooldown <= 0 && onShoot) {
          this.shootCooldown = this.currentSpell.cooldown * (1.1 + Math.random() * 0.3);
          onShoot(this, aimX, aimZ);
        }
      } else {
        // 3. LOOT: Check nearby chests
        let closestChest = null;
        let closestChestDist = 18;

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

          if (cdist > 6) {
            moveX = aimX;
            moveZ = aimZ;
          } else {
            // In firing range of chest
            if (this.shootCooldown <= 0 && onShoot) {
              this.shootCooldown = this.currentSpell.cooldown * 1.2;
              onShoot(this, aimX, aimZ);
            }
          }
        } else {
          // 4. ROAM
          this.state = 'ROAM';
          if (this.changeStateTimer <= 0) {
            this.changeStateTimer = 4 + Math.random() * 3;
            this.pickRoamWaypoint(Math.min(zoneRadius * 0.7, 35));
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


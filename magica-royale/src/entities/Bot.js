import * as THREE from 'three';
import { Actor } from './Actor.js';
import { SPELLS, PLAYER_BASE, ARENA } from '../config/constants.js';

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

    this.state = 'FORAGE';
    this.skirmishMoveTimer = 1.0 + Math.random() * 0.8;
    this.pauseTimer = 0;
    this.strafeDir = (this.id % 2 === 0) ? 1 : -1;
    this.shootCooldown = 0.5 + Math.random() * 0.5;

    this.roamTarget = { x: 0, z: 0 };
    this.pickRoamWaypoint(40);
    this.waypointTimer = 0;
  }

  pickRoamWaypoint(maxR = 60) {
    const angle = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * (maxR - 8);
    this.roamTarget.x = Math.cos(angle) * r;
    this.roamTarget.z = Math.sin(angle) * r;
  }

  think(dt, zoneRadius, allActors, chests = [], gems = [], healthOrbs = [], playerKills = 0, onShoot) {
    if (this.isDead) return;

    this.shootCooldown -= dt;
    this.waypointTimer -= dt;

    const distFromCenter = Math.hypot(this.x, this.z);
    let moveX = 0;
    let moveZ = 0;
    let aimX = 0;
    let aimZ = 0;

    const playerActor = allActors.find((a) => a.isPlayer && !a.isDead);

    // STATE 4: HAZARD & LOW-HP EVASION
    const isLowHp = (this.hp / this.maxHp) <= 0.25;
    const isStormThreat = distFromCenter > zoneRadius * 0.82;

    if (isLowHp || isStormThreat) {
      this.state = 'EVADE';
      let nearestOrb = null;
      let nearestOrbDist = 28;
      for (const orb of healthOrbs) {
        if (!orb.active) continue;
        const d = Math.hypot(orb.x - this.x, orb.z - this.z);
        if (d < nearestOrbDist) {
          nearestOrbDist = d;
          nearestOrb = orb;
        }
      }

      if (nearestOrb) {
        if (nearestOrbDist < 1.2) {
          nearestOrb.despawn();
          this.heal(this.maxHp * nearestOrb.healPercent);
        } else {
          moveX = (nearestOrb.x - this.x) / nearestOrbDist;
          moveZ = (nearestOrb.z - this.z) / nearestOrbDist;
          aimX = moveX;
          aimZ = moveZ;
        }
      } else {
        let threatX = isStormThreat ? -this.x / (distFromCenter || 1) : 0;
        let threatZ = isStormThreat ? -this.z / (distFromCenter || 1) : 0;

        if (isLowHp) {
          let closestHostile = null;
          let minHDist = 18;
          for (const a of allActors) {
            if (a === this || a.isDead) continue;
            const d = Math.hypot(a.x - this.x, a.z - this.z);
            if (d < minHDist) {
              minHDist = d;
              closestHostile = a;
            }
          }
          if (closestHostile) {
            threatX += (this.x - closestHostile.x) / minHDist;
            threatZ += (this.z - closestHostile.z) / minHDist;
          }
        }

        const tlen = Math.hypot(threatX, threatZ) || 1;
        moveX = threatX / tlen;
        moveZ = threatZ / tlen;
        aimX = moveX;
        aimZ = moveZ;
      }
    } else {
      // STATE 3: KING-SLAYER AGGRO BIAS & TARGETING
      const baseAggro = 9.5;
      const isKing = playerKills >= 3;
      const playerWeight = isKing ? (playerKills >= 5 ? 2.8 : 2.2) : 1.0;
      const playerAggroRadius = baseAggro * playerWeight;

      let targetEnemy = null;
      let targetDist = Infinity;

      if (playerActor) {
        const pDist = Math.hypot(playerActor.x - this.x, playerActor.z - this.z);
        if (pDist <= playerAggroRadius) {
          targetEnemy = playerActor;
          targetDist = pDist;
        }
      }

      if (!targetEnemy || (!isKing && Math.random() < 0.4)) {
        for (const other of allActors) {
          if (other === this || other.isDead || other.isPlayer) continue;
          const dist = Math.hypot(other.x - this.x, other.z - this.z);
          if (dist <= baseAggro && dist < targetDist) {
            targetEnemy = other;
            targetDist = dist;
          }
        }
      }

      // STATE 2: SKIRMISH & STRAFE
      if (targetEnemy) {
        this.state = 'SKIRMISH';
        const edx = targetEnemy.x - this.x;
        const edz = targetEnemy.z - this.z;
        const edist = targetDist || 1;
        const baseAngle = Math.atan2(edx, edz);

        if (this.pauseTimer > 0) {
          this.pauseTimer -= dt;
          moveX = 0;
          moveZ = 0;

          const aimOffset = (Math.random() - 0.5) * (30 * Math.PI / 180);
          aimX = Math.sin(baseAngle + aimOffset);
          aimZ = Math.cos(baseAngle + aimOffset);

          if (this.shootCooldown <= 0 && onShoot && edist <= this.currentSpell.range) {
            this.shootCooldown = this.currentSpell.cooldown * (1.1 + Math.random() * 0.4);
            onShoot(this, aimX, aimZ);
          }

          if (this.pauseTimer <= 0) {
            this.skirmishMoveTimer = 1.0 + Math.random() * 0.8;
            this.strafeDir *= -1;
          }
        } else {
          this.skirmishMoveTimer -= dt;
          if (this.skirmishMoveTimer <= 0) {
            this.pauseTimer = 0.25;
          }

          aimX = Math.sin(baseAngle);
          aimZ = Math.cos(baseAngle);

          const perpX = -Math.cos(baseAngle) * this.strafeDir;
          const perpZ = Math.sin(baseAngle) * this.strafeDir;
          const distBias = edist > 10 ? 0.7 : (edist < 6 ? -0.7 : 0.1);
          moveX = perpX * 0.75 + (edx / edist) * distBias;
          moveZ = perpZ * 0.75 + (edz / edist) * distBias;
        }
      } else {
        // STATE 1: FORAGE (DEFAULT)
        this.state = 'FORAGE';

        let closestGem = null;
        let closestGemDist = 24;
        for (const gem of gems) {
          if (!gem.active) continue;
          const d = Math.hypot(gem.x - this.x, gem.z - this.z);
          if (d < closestGemDist) {
            closestGemDist = d;
            closestGem = gem;
          }
        }

        if (closestGem) {
          if (closestGemDist < 1.2) {
            closestGem.despawn();
          } else {
            moveX = (closestGem.x - this.x) / closestGemDist;
            moveZ = (closestGem.z - this.z) / closestGemDist;
            aimX = moveX;
            aimZ = moveZ;
          }
        } else {
          let closestChest = null;
          let closestChestDist = 22;
          for (const chest of chests) {
            if (chest.isDead) continue;
            const d = Math.hypot(chest.x - this.x, chest.z - this.z);
            if (d < closestChestDist) {
              closestChestDist = d;
              closestChest = chest;
            }
          }

          if (closestChest) {
            const cdx = closestChest.x - this.x;
            const cdz = closestChest.z - this.z;
            const cdist = closestChestDist || 1;
            aimX = cdx / cdist;
            aimZ = cdz / cdist;

            if (cdist > 5.5) {
              moveX = aimX;
              moveZ = aimZ;
            } else {
              const perpX = -aimZ * this.strafeDir;
              const perpZ = aimX * this.strafeDir;
              moveX = perpX * 0.45;
              moveZ = perpZ * 0.45;
              if (this.shootCooldown <= 0 && onShoot) {
                this.shootCooldown = this.currentSpell.cooldown * 1.3;
                onShoot(this, aimX, aimZ);
              }
            }
          } else {
            const rdx = this.roamTarget.x - this.x;
            const rdz = this.roamTarget.z - this.z;
            const rdist = Math.hypot(rdx, rdz);

            if (rdist < 1.8 || this.waypointTimer <= 0) {
              this.waypointTimer = 3 + Math.random() * 2;
              this.pickRoamWaypoint(Math.min(zoneRadius * 0.7, 50));
            }

            const ren = rdist || 1;
            moveX = rdx / ren;
            moveZ = rdz / ren;
            aimX = moveX;
            aimZ = moveZ;
          }
        }
      }
    }

    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 0.01) {
      moveX /= moveLen;
      moveZ /= moveLen;
      this.x += moveX * this.speed * dt;
      this.z += moveZ * this.speed * dt;
    }

    const aimLen = Math.hypot(aimX, aimZ);
    if (aimLen > 0.01) {
      const aimAngle = Math.atan2(aimX, aimZ);
      this.visualMesh.rotation.y = THREE.MathUtils.lerp(this.visualMesh.rotation.y, aimAngle, 0.2);
    }

    const maxAllowed = ARENA.RADIUS - this.radius;
    if (distFromCenter > maxAllowed) {
      this.x = (this.x / distFromCenter) * maxAllowed;
      this.z = (this.z / distFromCenter) * maxAllowed;
    }

    this.setWobble(moveLen > 0.05, dt);
    super.update(dt);
  }
}

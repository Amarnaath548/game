import * as THREE from 'three';
import { BotSenses } from './BotSenses.js';

export class BotBrain {
  constructor(bot) {
    this.bot = bot;
  }

  evaluate(dt, zoneRadius, allActors, chests, gems, healthOrbs, playerKills, projectiles, onShoot) {
    const bot = this.bot;
    const distFromCenter = Math.hypot(bot.x, bot.z);

    // 0. ABSOLUTE ZONE SAFETY OVERRIDE:
    // If bot is outside or near storm boundary (>= 86% of zone radius), sprint directly to center
    if (distFromCenter >= zoneRadius * 0.86) {
      bot.state = 'EVADE';
      const toCenterX = -bot.x / (distFromCenter || 1);
      const toCenterZ = -bot.z / (distFromCenter || 1);
      const threats = BotSenses.findThreatsAndTargets(bot, allActors, playerKills);
      const aimX = threats.bestTarget ? (threats.bestTarget.x - bot.x) : toCenterX;
      const aimZ = threats.bestTarget ? (threats.bestTarget.z - bot.z) : toCenterZ;

      // Dash towards center if outside the zone
      if (distFromCenter >= zoneRadius && bot.dashCooldownTimer <= 0) {
        bot.dash(toCenterX, toCenterZ);
      }
      return { moveX: toCenterX, moveZ: toCenterZ, aimX, aimZ };
    }

    let moveX = 0;
    let moveZ = 0;
    let aimX = 0;
    let aimZ = 0;

    // Helper: only target loot inside the safe zone
    const isSafeLoot = (item) => item && Math.hypot(item.x, item.z) < zoneRadius * 0.82;

    // 1. Gather Sensory Information
    const loot = BotSenses.findNearestLoot(bot, gems, healthOrbs, chests);
    const threats = BotSenses.findThreatsAndTargets(bot, allActors, playerKills);
    const incoming = BotSenses.detectIncomingProjectile(bot, projectiles);

    // 2. State Decision: EVADE Check
    const fleeThreshold = 0.18 + bot.personality.caution * 0.22;
    const isLowHp = (bot.hp / bot.maxHp) <= fleeThreshold;
    const isStormThreat = distFromCenter > zoneRadius * 0.70;
    const hasHighThreat = threats.highLevelThreat !== null;

    if (isLowHp || isStormThreat || hasHighThreat) {
      bot.state = 'EVADE';

      if (loot.nearestOrb && isSafeLoot(loot.nearestOrb) && loot.nearestOrbDist < 28) {
        if (loot.nearestOrbDist < 1.2) {
          loot.nearestOrb.despawn();
          bot.heal(bot.maxHp * loot.nearestOrb.healPercent);
        } else {
          moveX = (loot.nearestOrb.x - bot.x) / loot.nearestOrbDist;
          moveZ = (loot.nearestOrb.z - bot.z) / loot.nearestOrbDist;
          aimX = moveX;
          aimZ = moveZ;
        }
      } else {
        const toCenterX = -bot.x / (distFromCenter || 1);
        const toCenterZ = -bot.z / (distFromCenter || 1);
        let threatX = toCenterX * (isStormThreat ? 2.5 : 0.8);
        let threatZ = toCenterZ * (isStormThreat ? 2.5 : 0.8);

        const threatHostile = threats.highLevelThreat || (isLowHp ? threats.nearestHostile : null);
        if (threatHostile) {
          const d = Math.hypot(bot.x - threatHostile.x, bot.z - threatHostile.z) || 1;
          threatX += ((bot.x - threatHostile.x) / d) * 1.0;
          threatZ += ((bot.z - threatHostile.z) / d) * 1.0;
        }

        const tlen = Math.hypot(threatX, threatZ) || 1;
        moveX = threatX / tlen;
        moveZ = threatZ / tlen;
        aimX = moveX;
        aimZ = moveZ;

        if (isLowHp && bot.dashCooldownTimer <= 0) {
          bot.dash(moveX, moveZ);
        }
      }
    } else if (threats.bestTarget) {
      // 3. State: SKIRMISH & STRAFE
      bot.state = 'SKIRMISH';
      const target = threats.bestTarget;
      const edx = target.x - bot.x;
      const edz = target.z - bot.z;
      const edist = threats.targetDist || 1;

      bot.skirmishMoveTimer -= dt;
      if (bot.skirmishMoveTimer <= 0) {
        bot.skirmishMoveTimer = 1.0 + Math.random() * 0.8;
        bot.strafeDir *= -1;
      }

      // Target Leading
      const spellSpeed = bot.currentSpell.speed || 28;
      const flightTime = edist / spellSpeed;
      const tvx = target.vx || 0;
      const tvz = target.vz || 0;
      const leadX = target.x + tvx * flightTime * bot.personality.skill;
      const leadZ = target.z + tvz * flightTime * bot.personality.skill;
      const baseAngle = Math.atan2(leadX - bot.x, leadZ - bot.z);

      const maxErrDeg = 20 - bot.personality.skill * 17;
      const aimOffset = (Math.random() - 0.5) * 2 * (maxErrDeg * Math.PI / 180);
      aimX = Math.sin(baseAngle + aimOffset);
      aimZ = Math.cos(baseAngle + aimOffset);

      // Regulate distance and strafe
      const perpX = -Math.cos(baseAngle) * bot.strafeDir;
      const perpZ = Math.sin(baseAngle) * bot.strafeDir;
      const distBias = edist > 10 ? 0.7 : (edist < 6 ? -0.7 : 0.1);
      moveX = perpX * 0.75 + (edx / edist) * distBias;
      moveZ = perpZ * 0.75 + (edz / edist) * distBias;

      if (bot.shootCooldown <= 0 && onShoot && edist <= bot.currentSpell.range) {
        const reactDelay = 0.40 - bot.personality.skill * 0.25;
        bot.shootCooldown = bot.currentSpell.cooldown + reactDelay + Math.random() * 0.1;
        onShoot(bot, aimX, aimZ);
      }
    } else {
      // 4. State: FORAGE
      bot.state = 'FORAGE';

      if (loot.nearestGem && isSafeLoot(loot.nearestGem)) {
        if (loot.nearestGemDist < 1.2) {
          loot.nearestGem.despawn();
          bot.addXP(loot.nearestGem.xpValue || 25);
        } else {
          moveX = (loot.nearestGem.x - bot.x) / loot.nearestGemDist;
          moveZ = (loot.nearestGem.z - bot.z) / loot.nearestGemDist;
          aimX = moveX;
          aimZ = moveZ;
        }
      } else if (loot.nearestChest && isSafeLoot(loot.nearestChest)) {
        const cdx = loot.nearestChest.x - bot.x;
        const cdz = loot.nearestChest.z - bot.z;
        const cdist = loot.nearestChestDist || 1;
        aimX = cdx / cdist;
        aimZ = cdz / cdist;

        if (cdist > 5.5) {
          moveX = aimX;
          moveZ = aimZ;
        } else {
          const perpX = -aimZ * bot.strafeDir;
          const perpZ = aimX * bot.strafeDir;
          moveX = perpX * 0.45;
          moveZ = perpZ * 0.45;
          if (bot.shootCooldown <= 0 && onShoot) {
            bot.shootCooldown = bot.currentSpell.cooldown * 1.2;
            onShoot(bot, aimX, aimZ);
          }
        }
      } else {
        const rdx = bot.roamTarget.x - bot.x;
        const rdz = bot.roamTarget.z - bot.z;
        const rdist = Math.hypot(rdx, rdz);

        if (rdist < 1.8 || bot.waypointTimer <= 0) {
          bot.waypointTimer = 3 + Math.random() * 2;
          bot.pickRoamWaypoint(Math.min(zoneRadius * 0.65, 45));
        }

        const ren = rdist || 1;
        moveX = rdx / ren;
        moveZ = rdz / ren;
        aimX = moveX;
        aimZ = moveZ;
      }
    }

    // 5. Dodging Override: if incoming projectile detected
    if (incoming && Math.random() < bot.personality.skill) {
      moveX = incoming.dodgeX;
      moveZ = incoming.dodgeZ;
      if (bot.personality.skill > 0.6 && bot.dashCooldownTimer <= 0) {
        bot.dash(incoming.dodgeX, incoming.dodgeZ);
      }
    }

    // 6. Safe Zone Inward Force: blend movement inwards when nearing perimeter (> 65% of zoneRadius)
    if (distFromCenter > zoneRadius * 0.65) {
      const danger = (distFromCenter - zoneRadius * 0.65) / (zoneRadius * 0.25);
      const toCenterX = -bot.x / (distFromCenter || 1);
      const toCenterZ = -bot.z / (distFromCenter || 1);
      moveX = THREE.MathUtils.lerp(moveX, toCenterX, Math.min(1.0, danger * 0.9));
      moveZ = THREE.MathUtils.lerp(moveZ, toCenterZ, Math.min(1.0, danger * 0.9));
    }

    return { moveX, moveZ, aimX, aimZ };
  }
}

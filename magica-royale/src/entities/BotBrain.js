import * as THREE from 'three';
import { BotSenses } from './BotSenses.js';

export class BotBrain {
  constructor(bot) {
    this.bot = bot;
  }

  evaluate(dt, zoneRadius, allActors, chests, gems, healthOrbs, playerKills, projectiles, onShoot) {
    const bot = this.bot;
    const distFromCenter = Math.hypot(bot.x, bot.z);

    // 0. Zone Safety
    if (distFromCenter >= zoneRadius * 0.86) {
      bot.state = 'EVADE';
      const toCenterX = -bot.x / (distFromCenter || 1), toCenterZ = -bot.z / (distFromCenter || 1);
      const threats = BotSenses.findThreatsAndTargets(bot, allActors, playerKills);
      const aimX = threats.bestTarget ? (threats.bestTarget.x - bot.x) : toCenterX;
      const aimZ = threats.bestTarget ? (threats.bestTarget.z - bot.z) : toCenterZ;
      if (distFromCenter >= zoneRadius && bot.dashCooldownTimer <= 0) bot.dash(toCenterX, toCenterZ);
      return { moveX: toCenterX, moveZ: toCenterZ, aimX, aimZ };
    }

    let moveX = 0, moveZ = 0, aimX = 0, aimZ = 0;
    const isSafeLoot = (item) => item && Math.hypot(item.x, item.z) < zoneRadius * 0.82;

    const loot = BotSenses.findNearestLoot(bot, gems, healthOrbs, chests);
    const threats = BotSenses.findThreatsAndTargets(bot, allActors, playerKills);
    const incoming = BotSenses.detectIncomingProjectile(bot, projectiles);

    const fleeThreshold = 0.18 + bot.personality.caution * 0.22;
    const isLowHp = (bot.hp / bot.maxHp) <= fleeThreshold;
    const isStormThreat = distFromCenter > zoneRadius * 0.70;

    if (isLowHp || isStormThreat || threats.highLevelThreat !== null) {
      bot.state = 'EVADE';
      if (loot.nearestOrb && isSafeLoot(loot.nearestOrb) && loot.nearestOrbDist < 28) {
        if (loot.nearestOrbDist < 1.2) { loot.nearestOrb.despawn(); bot.heal(bot.maxHp * loot.nearestOrb.healPercent); }
        else { moveX = (loot.nearestOrb.x - bot.x) / loot.nearestOrbDist; moveZ = (loot.nearestOrb.z - bot.z) / loot.nearestOrbDist; aimX = moveX; aimZ = moveZ; }
      } else {
        const toCenterX = -bot.x / (distFromCenter || 1), toCenterZ = -bot.z / (distFromCenter || 1);
        let threatX = toCenterX * (isStormThreat ? 2.5 : 0.8), threatZ = toCenterZ * (isStormThreat ? 2.5 : 0.8);
        const threatHostile = threats.highLevelThreat || (isLowHp ? threats.nearestHostile : null);
        if (threatHostile) {
          const d = Math.hypot(bot.x - threatHostile.x, bot.z - threatHostile.z) || 1;
          threatX += ((bot.x - threatHostile.x) / d) * 1.0; threatZ += ((bot.z - threatHostile.z) / d) * 1.0;
        }
        const tlen = Math.hypot(threatX, threatZ) || 1;
        moveX = threatX / tlen; moveZ = threatZ / tlen; aimX = moveX; aimZ = moveZ;
        if (isLowHp && bot.dashCooldownTimer <= 0) bot.dash(moveX, moveZ);
      }
    } else if (threats.bestTarget) {
      bot.state = 'SKIRMISH';
      const target = threats.bestTarget;
      const edx = target.x - bot.x, edz = target.z - bot.z, edist = threats.targetDist || 1;
      const spell = bot.currentSpell || {};
      const traj = spell.trajectory || 'LINEAR';

      bot.skirmishMoveTimer -= dt;
      if (bot.skirmishMoveTimer <= 0) {
        bot.skirmishMoveTimer = 1.0 + Math.random() * 0.8;
        bot.strafeDir *= -1;
      }

      // Aiming adapted per trajectory
      let baseAngle = Math.atan2(edx, edz);
      const tvx = target.vx || 0, tvz = target.vz || 0;

      if (traj === 'MELEE') {
        baseAngle = Math.atan2(edx, edz);
      } else if (traj === 'SELF_DASH') {
        baseAngle = Math.atan2(edx, edz);
      } else if (traj === 'WAVE' || traj === 'INSTANT_STRIKE') {
        baseAngle = Math.atan2(edx + tvx * 0.15, edz + tvz * 0.15);
      } else {
        // LINEAR, SPREAD, LOBBED: lead target
        const spd = spell.speed || 28;
        const flightTime = edist / spd;
        const leadX = target.x + tvx * flightTime * bot.personality.skill;
        const leadZ = target.z + tvz * flightTime * bot.personality.skill;
        baseAngle = Math.atan2(leadX - bot.x, leadZ - bot.z);
      }

      const maxErrDeg = traj === 'MELEE' ? 0 : (18 - bot.personality.skill * 15);
      const aimOffset = (Math.random() - 0.5) * 2 * (maxErrDeg * Math.PI / 180);
      aimX = Math.sin(baseAngle + aimOffset);
      aimZ = Math.cos(baseAngle + aimOffset);

      // Positioning per trajectory
      if (traj === 'MELEE') {
        moveX = edx / (edist || 1);
        moveZ = edz / (edist || 1);
      } else {
        const perpX = -Math.cos(baseAngle) * bot.strafeDir, perpZ = Math.sin(baseAngle) * bot.strafeDir;
        let idealDist = 12;
        if (traj === 'SELF_DASH') idealDist = 7;
        else if (traj === 'LOBBED') idealDist = 14;

        const distBias = edist > idealDist ? 0.75 : (edist < idealDist - 3 ? -0.7 : 0.1);
        moveX = perpX * 0.65 + (edx / edist) * distBias;
        moveZ = perpZ * 0.65 + (edz / edist) * distBias;
      }

      // Shooting condition per trajectory
      const inRange = traj === 'MELEE' ? (edist <= 1.8) : (edist <= (spell.range || 22));
      const dashReady = traj !== 'SELF_DASH' || (edist <= 12 && edist >= 2.0);

      if (bot.shootCooldown <= 0 && onShoot && inRange && dashReady) {
        const reactDelay = 0.35 - bot.personality.skill * 0.22;
        bot.shootCooldown = (spell.cooldown || 0.7) + reactDelay + Math.random() * 0.1;
        onShoot(bot, aimX, aimZ);
      }
    } else {
      bot.state = 'FORAGE';
      if (loot.nearestGem && isSafeLoot(loot.nearestGem)) {
        if (loot.nearestGemDist < 1.2) { loot.nearestGem.despawn(); bot.addXP(loot.nearestGem.xpValue || 25); }
        else { moveX = (loot.nearestGem.x - bot.x) / loot.nearestGemDist; moveZ = (loot.nearestGem.z - bot.z) / loot.nearestGemDist; aimX = moveX; aimZ = moveZ; }
      } else if (loot.nearestChest && isSafeLoot(loot.nearestChest)) {
        const cdx = loot.nearestChest.x - bot.x, cdz = loot.nearestChest.z - bot.z, cdist = loot.nearestChestDist || 1;
        aimX = cdx / cdist; aimZ = cdz / cdist;
        if (cdist > 5.5) { moveX = aimX; moveZ = aimZ; }
        else {
          moveX = -aimZ * bot.strafeDir * 0.45; moveZ = aimX * bot.strafeDir * 0.45;
          if (bot.shootCooldown <= 0 && onShoot) { bot.shootCooldown = (bot.currentSpell?.cooldown || 0.7) * 1.2; onShoot(bot, aimX, aimZ); }
        }
      } else {
        const rdx = bot.roamTarget.x - bot.x, rdz = bot.roamTarget.z - bot.z, rdist = Math.hypot(rdx, rdz);
        if (rdist < 1.8 || bot.waypointTimer <= 0) { bot.waypointTimer = 3 + Math.random() * 2; bot.pickRoamWaypoint(Math.min(zoneRadius * 0.65, 45)); }
        moveX = rdx / (rdist || 1); moveZ = rdz / (rdist || 1); aimX = moveX; aimZ = moveZ;
      }
    }

    if (incoming && Math.random() < bot.personality.skill) {
      moveX = incoming.dodgeX; moveZ = incoming.dodgeZ;
      if (bot.personality.skill > 0.6 && bot.dashCooldownTimer <= 0) bot.dash(incoming.dodgeX, incoming.dodgeZ);
    }

    if (distFromCenter > zoneRadius * 0.65) {
      const danger = (distFromCenter - zoneRadius * 0.65) / (zoneRadius * 0.25);
      moveX = THREE.MathUtils.lerp(moveX, -bot.x / (distFromCenter || 1), Math.min(1.0, danger * 0.9));
      moveZ = THREE.MathUtils.lerp(moveZ, -bot.z / (distFromCenter || 1), Math.min(1.0, danger * 0.9));
    }

    return { moveX, moveZ, aimX, aimZ };
  }
}

export class BotSenses {
  static findNearestLoot(bot, gems = [], healthOrbs = [], chests = []) {
    let nearestOrb = null;
    let nearestOrbDist = Infinity;
    for (const orb of healthOrbs) {
      if (!orb.active) continue;
      const d = Math.hypot(orb.x - bot.x, orb.z - bot.z);
      if (d < nearestOrbDist) {
        nearestOrbDist = d;
        nearestOrb = orb;
      }
    }

    let nearestGem = null;
    let nearestGemDist = 26;
    for (const gem of gems) {
      if (!gem.active) continue;
      const d = Math.hypot(gem.x - bot.x, gem.z - bot.z);
      if (d < nearestGemDist) {
        nearestGemDist = d;
        nearestGem = gem;
      }
    }

    let nearestChest = null;
    let nearestChestDist = 22;
    for (const chest of chests) {
      if (chest.isDead) continue;
      const d = Math.hypot(chest.x - bot.x, chest.z - bot.z);
      if (d < nearestChestDist) {
        nearestChestDist = d;
        nearestChest = chest;
      }
    }

    return { nearestOrb, nearestOrbDist, nearestGem, nearestGemDist, nearestChest, nearestChestDist };
  }

  static findThreatsAndTargets(bot, allActors, playerKills = 0) {
    const isKing = playerKills >= 3;
    const baseAggro = 10 * bot.personality.aggression;
    const playerAggro = isKing ? baseAggro * (playerKills >= 5 ? 2.8 : 2.2) : baseAggro;

    let bestTarget = null;
    let bestScore = -Infinity;
    let bestDist = Infinity;

    let highLevelThreat = null;
    let highLevelDist = Infinity;

    let nearestHostile = null;
    let nearestHostileDist = Infinity;

    for (const actor of allActors) {
      if (actor === bot || actor.isDead) continue;
      const dist = Math.hypot(actor.x - bot.x, actor.z - bot.z);

      if (dist < nearestHostileDist) {
        nearestHostileDist = dist;
        nearestHostile = actor;
      }

      // Flee enemies 2+ levels above within 12 units
      const enemyLevel = actor.level || 1;
      if (enemyLevel >= bot.level + 2 && dist < 13) {
        if (dist < highLevelDist) {
          highLevelDist = dist;
          highLevelThreat = actor;
        }
      }

      const allowedAggro = actor.isPlayer ? playerAggro : baseAggro;
      if (dist <= allowedAggro) {
        // Score: level difference, low HP, distance
        const hpPercent = actor.hp / (actor.maxHp || 1);
        let score = (bot.level - enemyLevel) * 16 + (1 - hpPercent) * 36 - dist * 2.2;
        if (actor.isPlayer && isKing) score += 20;

        if (score > bestScore) {
          bestScore = score;
          bestTarget = actor;
          bestDist = dist;
        }
      }
    }

    return { bestTarget, targetDist: bestDist, highLevelThreat, nearestHostile, nearestHostileDist };
  }

  static detectIncomingProjectile(bot, projectiles = []) {
    let closestProj = null;
    let minDist = Infinity;
    let dodgeX = 0;
    let dodgeZ = 0;

    for (const proj of projectiles) {
      if (!proj.active || proj.owner === bot) continue;

      const toBotX = bot.x - proj.x;
      const toBotZ = bot.z - proj.z;
      const dist = Math.hypot(toBotX, toBotZ);
      if (dist > 14 || dist < 0.1) continue;

      const pSpeed = Math.hypot(proj.vx, proj.vz);
      if (pSpeed < 1.0) continue;

      const pdx = proj.vx / pSpeed;
      const pdz = proj.vz / pSpeed;

      // Check if heading towards bot
      const dot = (pdx * toBotX + pdz * toBotZ) / dist;
      if (dot > 0.9) {
        const projDist = dot * dist;
        const perpDistSq = Math.max(0, dist * dist - projDist * projDist);
        const requiredClearance = bot.radius + (proj.radius || 0.5) + 0.8;

        if (perpDistSq < requiredClearance * requiredClearance) {
          if (dist < minDist) {
            minDist = dist;
            closestProj = proj;
            // Perpendicular sidestep
            dodgeX = -pdz * bot.strafeDir;
            dodgeZ = pdx * bot.strafeDir;
          }
        }
      }
    }

    if (closestProj) {
      return { proj: closestProj, dist: minDist, dodgeX, dodgeZ };
    }
    return null;
  }
}


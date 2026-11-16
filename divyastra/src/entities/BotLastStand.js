import { LAST_STAND_ZONE_RADIUS, LAST_STAND_ALIVE, EVADE_PATIENCE } from '../config/constants.js';

/**
 * Computes whether a bot is "cornered" and must fight instead of flee.
 * Returns { cornered, finalPhase, isLowHp }.
 */
export function evaluateCornered(bot, dt, zoneRadius, aliveCount, nearestHostile, nearestHostileDist) {
  const isLowHp = (bot.hp / bot.maxHp) <= (0.12 + bot.personality.caution * 0.18);
  const finalPhase = zoneRadius <= LAST_STAND_ZONE_RADIUS;
  const fewAlive = aliveCount <= LAST_STAND_ALIVE;

  if (bot.state === 'EVADE') {
    bot.evadeTimer = (bot.evadeTimer || 0) + dt;
  } else {
    bot.evadeTimer = 0;
  }

  const evadeExhausted = isLowHp && nearestHostile && nearestHostileDist <= 5 && (bot.evadeTimer || 0) > EVADE_PATIENCE;
  const cornered = finalPhase || fewAlive || Boolean(evadeExhausted);

  return { cornered, finalPhase, isLowHp };
}

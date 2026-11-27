export const ENDLESS_STORAGE_KEY = 'divyastra_endless_v1';

export const ENDLESS_CONFIG = {
  INITIAL_BOTS: 6,
  MAX_BOTS: 12,
  TIER_INTERVAL_SEC: 30,
  RESPAWN_DELAY_SEC: 2.0,
  MIN_SPAWN_DIST_FROM_PLAYER: 25,
  STEADY_ZONE_RADIUS: 52,
  PROP_REFRESH_INTERVAL: 45,
  MIN_CHESTS: 6,
  MIN_CRYSTALS: 3
};

export function getEndlessTierConfig(tier = 1) {
  const t = Math.max(1, tier);
  return {
    key: `ENDLESS_T${t}`,
    name: `Endless Tier ${t}`,
    tier: t,
    targetBots: Math.min(ENDLESS_CONFIG.MAX_BOTS, ENDLESS_CONFIG.INITIAL_BOTS + Math.floor((t - 1) / 2)),
    botStartLevel: Math.min(8, 1 + Math.floor((t - 1) / 2)),
    botDamageMult: +(0.85 + (t - 1) * 0.12).toFixed(2),
    botHpMult: +(0.90 + (t - 1) * 0.15).toFixed(2),
    botAimErrorDeg: Math.max(1, 10 - (t - 1) * 1.2),
    botReactionMult: Math.max(0.55, +(1.15 - (t - 1) * 0.08).toFixed(2)),
    zoneTimeMult: 0.75,
    playerXpMult: 1.0
  };
}

export function computeEndlessScore(survivalSec = 0, kills = 0) {
  return Math.floor(Math.max(0, survivalSec)) * 10 + Math.max(0, kills) * 100;
}

export function formatEndlessTime(sec = 0) {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

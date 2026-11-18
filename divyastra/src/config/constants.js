export const GAME_TITLE = 'Divyastra';

export const COLORS = {
  BG_VOID: 0x0d0e15,
  FLOOR_SLATE: 0x1a1c29,
  GRID_RUNE: 0x2a2e42,
  RING_DIVIDER: 0x3b4262,
  OBELISK: 0xb8b2a7,
  OBELISK_TOP: 0x9f998f,
  PLAYER_ROBE: 0xd92638,
  PLAYER_HAT: 0x1e2238,
  AIM_LASER: 0x00f2ff,
  STORM_RING: 0xb700ff
};

export const HERO_VISUAL_SCALE = 1.4;
export const QUALITY = 'auto'; // 'auto' | 'high' | 'low'

export const BIOMES = {
  GRASS: {
    id: 'GRASS',
    name: 'Grass Plains',
    floorColor: 0x76C725,
    floorAccentColor: 0x58c016,
    shorelineColor: 0xe9d8a6,
    pondColor: 0x3b5f8a,
    pondEdgeColor: 0x4d75a8,
    treeFoliageColor: 0x236b32,
    skyColor: 0x7ff5e4,
    fogColor: 0x7ff5e4,
    fogNear: 45,
    fogFar: 140,
    ambientColor: 0xffffff,
    ambientIntensity: 1.15,
    dirLightColor: 0xfffae0,
    dirLightIntensity: 0.85,
    obeliskColor: 0xb8b2a7,
    obeliskTopColor: 0x9f998f,
    bushColor: 0x22c55e,
    bushEdgeColor: 0x86efac
  },
  SNOW: {
    id: 'SNOW',
    name: 'Frozen Peaks',
    floorColor: 0xe8f4ff,
    floorAccentColor: 0xd6e8fa,
    shorelineColor: 0xdbeafe,
    pondColor: 0x60a5fa,
    pondEdgeColor: 0x93c5fd,
    treeFoliageColor: 0x1e4e3d,
    skyColor: 0x9be8ff,
    fogColor: 0x9be8ff,
    fogNear: 45,
    fogFar: 140,
    ambientColor: 0xe0f2fe,
    ambientIntensity: 1.15,
    dirLightColor: 0xffffff,
    dirLightIntensity: 0.85,
    obeliskColor: 0x64748b,
    obeliskTopColor: 0x475569,
    bushColor: 0x065f46,
    bushEdgeColor: 0x38bdf8
  }
};

export const HEROES = [
  { id: 'tapasvi', name: 'Tapasvi', archetype: 'TAPASVI', bodyColor: 0xe06014, accentColor: 0xfbbf24, hatType: 'JATA', extra: 'UTTARIYA' },
  { id: 'agni', name: 'Agni Sadhaka', archetype: 'AGNI', bodyColor: 0xd92638, accentColor: 0xf97316, hatType: 'FLAME_CREST', extra: 'MANTLE' },
  { id: 'jala', name: 'Jala Sadhaka', archetype: 'JALA', bodyColor: 0x0284c7, accentColor: 0x99f6e4, hatType: 'TURBAN', extra: 'WAVE_PADS' },
  { id: 'prithvi', name: 'Prithvi Sadhaka', archetype: 'PRITHVI', bodyColor: 0x166534, accentColor: 0xc2410c, hatType: 'CIRCLET', extra: 'ROCK_SHOULDERS' }
];

/** Safe hero lookup — falls back to HEROES[0] if id is not found (e.g. old saved id). */
export function getHeroById(id) {
  return HEROES.find((h) => h.id === id) || HEROES[0];
}

/** Valid hero ids and default unlocked set. */
export const VALID_HERO_IDS = HEROES.map((h) => h.id);
export const DEFAULT_UNLOCKED_HEROES = ['tapasvi'];

export const ARENA = {
  RADIUS: 120,
  RINGS: {
    SANCTUM_MAX: 30,
    RUINS_MAX: 75,
    SPAWN_MAX: 120
  }
};

export const CAMERA_CONFIG = {
  OFFSET_Y: 23.5,
  OFFSET_Z: 14.7,
  FOV: 58,
  PITCH_BIAS: 1.0,
  LERP_SPEED: 0.1,
  AIM_LOOKAHEAD: 4.5,
  LOOK_FORWARD: 3.0,
  SHAKE_AMPLITUDE: 0.12,
  SHAKE_DURATION: 0.15,
  SHAKE_DMG_THRESHOLD: 25,
  ZOOM: 1.0
};

export const PLAYER_BASE = {
  MAX_HP: 300,
  MOVE_SPEED: 14,
  RADIUS: 1.0,
  DASH_SPEED: 48,
  DASH_DURATION: 0.16,
  DASH_COOLDOWN: 4.0
};

export const AIM_ASSIST = true;
export const KILL_XP = 35;
export const KILL_GEM_DROP = 3;

// Target pacing: first pick ~20s, second ~60-90s, third ~3-4 min.
export const LEVEL_TABLE = [
  { level: 1, xpReq: 0, hpBonus: 0, dmgBonus: 0, rewardType: 'START' },
  { level: 2, xpReq: 25, hpBonus: 40, dmgBonus: 5, rewardType: 'ELEMENT' },
  { level: 3, xpReq: 120, hpBonus: 40, dmgBonus: 5, rewardType: 'ELEMENT' },
  { level: 4, xpReq: 280, hpBonus: 50, dmgBonus: 8, rewardType: 'ELEMENT' },
  { level: 5, xpReq: 480, hpBonus: 60, dmgBonus: 10, rewardType: 'MASTERY' },
  { level: 6, xpReq: 730, hpBonus: 80, dmgBonus: 12, rewardType: 'STAT_BOOST' },
  { level: 7, xpReq: 1030, hpBonus: 80, dmgBonus: 12, rewardType: 'STAT_BOOST' },
  { level: 8, xpReq: 1380, hpBonus: 80, dmgBonus: 12, rewardType: 'STAT_BOOST' }
];

export const TAPAS_DELAY = 1.2;
export const TAPAS_BONUS = 0.4;
export const TAPAS_HEAL_PCT_PER_SEC = 0.04;
export const AOE_SPLASH_DAMAGE_MULT = 0.7;
export const HAZARD_TICK_RATE = 0.25;
export const SEPARATION_FACTOR = 1.25;
export const PROJECTILE_DEFLECT_MAX_PER_CAST = 12;

// Bot AI tuning
export const BOT_AGGRO_BASE = 14;
export const BOT_DAMAGE_MULT = 1.25;
export const LAST_STAND_ZONE_RADIUS = 30;
export const LAST_STAND_ALIVE = 3;
export const EVADE_PATIENCE = 3;

export const STORM_PHASES = [
  { duration: 25, startRadius: 120, endRadius: 120, tickDamage: 0 },
  { duration: 30, startRadius: 120, endRadius: 75, tickDamage: 10 },
  { duration: 30, startRadius: 75, endRadius: 30, tickDamage: 20 },
  { duration: 25, startRadius: 30, endRadius: 8, tickDamage: 40 }
];

export { ELEMENTS, ELEMENT_NAMES, ELEMENT_COLORS, TRAJECTORY, getSpell, ALL_SPELLS } from './spellRegistry.js';

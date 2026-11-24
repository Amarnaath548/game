import { PALETTE } from './palette.js';

export const GAME_TITLE = 'Divyastra';

export const COLORS = {
  BG_VOID: PALETTE.ink,
  FLOOR_SLATE: PALETTE.indigo,
  GRID_RUNE: 0x2a2e42,
  RING_DIVIDER: 0x3b4262,
  OBELISK: PALETTE.stone,
  OBELISK_TOP: 0x9f998f,
  PLAYER_ROBE: PALETTE.sindoor,
  PLAYER_HAT: PALETTE.indigo,
  AIM_LASER: PALETTE.gold,
  STORM_RING: PALETTE.sindoor
};

export const HERO_VISUAL_SCALE = 1.568;
export const QUALITY = 'auto'; // 'auto' | 'high' | 'low'

export const BIOMES = {
  GRASS: {
    id: 'GRASS',
    name: 'Dharma Plains',
    floorColor: 0x7A9A4A,
    floorAccentColor: 0x6A8A3E,
    shorelineColor: 0xD9C79A,
    pondColor: 0x2E5E6E,
    pondEdgeColor: 0x3F7A8C,
    treeFoliageColor: 0x2F5A3A,
    skyColor: 0xE8C9A0,
    fogColor: 0xE8C9A0,
    fogNear: 45,
    fogFar: 140,
    ambientColor: 0xfff5ea,
    ambientIntensity: 1.15,
    dirLightColor: 0xfffae0,
    dirLightIntensity: 0.85,
    obeliskColor: PALETTE.stone,
    obeliskTopColor: 0x9f998f,
    bushColor: 0x4F7F3F,
    bushEdgeColor: 0x8DB06A
  },
  SNOW: {
    id: 'SNOW',
    name: 'Frozen Peaks',
    floorColor: 0xE6EEF2,
    floorAccentColor: 0xCDD9E2,
    shorelineColor: 0xDCE8F0,
    pondColor: 0x3E6E96,
    pondEdgeColor: 0x5A8AB4,
    treeFoliageColor: 0x1E4E3D,
    skyColor: 0xB8CCE0,
    fogColor: 0xB8CCE0,
    fogNear: 45,
    fogFar: 140,
    ambientColor: 0xe0f2fe,
    ambientIntensity: 1.15,
    dirLightColor: 0xffffff,
    dirLightIntensity: 0.85,
    obeliskColor: 0x64748b,
    obeliskTopColor: 0x475569,
    bushColor: 0x3E6E5E,
    bushEdgeColor: 0x9EC0B0
  },
  DESERT: {
    id: 'DESERT',
    name: 'Sunscorched Dunes',
    floorColor: 0xD9A864,
    floorAccentColor: 0xC48F4E,
    shorelineColor: 0xEBD5A0,
    pondColor: 0x2E6E73,
    pondEdgeColor: 0x3F8A8C,
    treeFoliageColor: 0x6B7A3A,
    skyColor: 0xF4D7A8,
    fogColor: 0xF4D7A8,
    fogNear: 45,
    fogFar: 140,
    ambientColor: 0xfff1cc,
    ambientIntensity: 1.15,
    dirLightColor: 0xffe7b0,
    dirLightIntensity: 0.85,
    obeliskColor: 0xCA9068,
    obeliskTopColor: 0xA87249,
    bushColor: 0x7A8A44,
    bushEdgeColor: 0xA8B56A
  },
  AUTUMN: {
    id: 'AUTUMN',
    name: 'Harvest Hollow',
    floorColor: 0x9A7A3A,
    floorAccentColor: 0x8A5A2A,
    shorelineColor: 0xD4B97A,
    pondColor: 0x34586E,
    pondEdgeColor: 0x46728C,
    treeFoliageColor: 0xB8532A,
    skyColor: 0xE8B88A,
    fogColor: 0xE8B88A,
    fogNear: 45,
    fogFar: 140,
    ambientColor: 0xfff1cf,
    ambientIntensity: 1.15,
    dirLightColor: 0xffe9b8,
    dirLightIntensity: 0.85,
    obeliskColor: 0xD9CEB3,
    obeliskTopColor: 0xB8AB8C,
    bushColor: 0xA8622A,
    bushEdgeColor: 0xD98A3A
  }
};

export const HEROES = [
  { id: 'tapasvi', name: 'Tapasvi', archetype: 'TAPASVI', bodyColor: PALETTE.saffron, accentColor: PALETTE.gold, hatType: 'JATA', extra: 'UTTARIYA' },
  { id: 'agni', name: 'Agni Sadhaka', archetype: 'AGNI', bodyColor: PALETTE.sindoor, accentColor: PALETTE.sindoor, hatType: 'FLAME_CREST', extra: 'MANTLE' },
  { id: 'jala', name: 'Jala Sadhaka', archetype: 'JALA', bodyColor: PALETTE.elements.JALA, accentColor: PALETTE.elements.JALA, hatType: 'TURBAN', extra: 'WAVE_PADS' },
  { id: 'prithvi', name: 'Prithvi Sadhaka', archetype: 'PRITHVI', bodyColor: PALETTE.elements.PRITHVI, accentColor: PALETTE.elements.PRITHVI, hatType: 'CIRCLET', extra: 'ROCK_SHOULDERS' }
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
  LOOK_FORWARD: -1.3,
  SHAKE_AMPLITUDE: 0.12,
  SHAKE_DURATION: 0.15,
  SHAKE_DMG_THRESHOLD: 25,
  ZOOM: 1.0
};

export const CAMERA_PHONE = {
  OFFSET_Y: 12,
  OFFSET_Z: 8.5,
  LOOK_FORWARD: -0.4,
  AIM_LOOKAHEAD: 1.5
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

export { PALETTE } from './palette.js';
export { ELEMENTS, ELEMENT_NAMES, ELEMENT_COLORS, TRAJECTORY, getSpell, ALL_SPELLS } from './spellRegistry.js';

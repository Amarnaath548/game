export const COLORS = {
  BG_VOID: 0x0d0e15,
  FLOOR_SLATE: 0x1a1c29,
  GRID_RUNE: 0x2a2e42,
  RING_DIVIDER: 0x3b4262,
  OBELISK: 0x25283d,
  PLAYER_ROBE: 0xd92638,
  PLAYER_HAT: 0x1e2238,
  AIM_LASER: 0x00f2ff,
  STORM_RING: 0xb700ff
};

export const ARENA = {
  RADIUS: 120,
  RINGS: {
    SANCTUM_MAX: 30,
    RUINS_MAX: 75,
    SPAWN_MAX: 120
  }
};

export const CAMERA_CONFIG = {
  OFFSET_Y: 34,
  OFFSET_Z: 28, // ~50 degree pitch
  LERP_SPEED: 0.1,
  AIM_LOOKAHEAD: 3.5
};

export const PLAYER_BASE = {
  MAX_HP: 300,
  MOVE_SPEED: 14,
  RADIUS: 1.0,
  DASH_SPEED: 48,
  DASH_DURATION: 0.16,
  DASH_COOLDOWN: 4.0
};

export const SPELLS = {
  PYRO: {
    id: 'PYRO',
    name: 'Fireball',
    color: 0xff5500,
    damage: 50,
    speed: 28,
    range: 24,
    radius: 0.55,
    aoeRadius: 3.5,
    cooldown: 0.65
  },
  CRYO: {
    id: 'CRYO',
    name: 'Frost Shards',
    color: 0x00f2ff,
    damage: 24,
    projectiles: 3,
    spreadAngle: 0.35,
    speed: 34,
    range: 18,
    radius: 0.35,
    slowFactor: 0.3,
    cooldown: 0.55
  },
  ELECTRO: {
    id: 'ELECTRO',
    name: 'Lightning Orb',
    color: 0xffe600,
    damage: 42,
    speed: 42,
    range: 26,
    radius: 0.45,
    chainCount: 2,
    chainRadius: 6.0,
    cooldown: 0.6
  },
  VENOM: {
    id: 'VENOM',
    name: 'Plague Glob',
    color: 0x39ff14,
    damage: 30,
    speed: 22,
    range: 20,
    radius: 0.6,
    lobArcHeight: 4.5,
    dps: 8,
    duration: 4.0,
    cooldown: 0.75
  },
  PIERCE: {
    id: 'PIERCE',
    name: 'Arcane Lance',
    color: 0xd946ef,
    damage: 42,
    speed: 46,
    range: 28,
    radius: 0.45,
    cooldown: 0.7,
    pierce: true
  },
  BLAST: {
    id: 'BLAST',
    name: 'Solar Blast',
    color: 0xf97316,
    damage: 65,
    speed: 24,
    range: 20,
    radius: 0.8,
    aoeRadius: 5.5,
    cooldown: 0.95,
    lobArcHeight: 3.5,
    telegraph: 0.4
  },
  HOMING: {
    id: 'HOMING',
    name: 'Seeking Orb',
    color: 0x06b6d4,
    damage: 36,
    speed: 26,
    range: 26,
    radius: 0.5,
    cooldown: 0.65,
    homing: true,
    turnRate: 2.0
  },
  SHIELD: {
    id: 'SHIELD',
    name: 'Arcane Ward',
    color: 0x3b82f6,
    damage: 0,
    speed: 0,
    range: 0,
    radius: 0,
    cooldown: 5.0,
    isSelfCast: true,
    shieldAmount: 80,
    shieldDuration: 3.0
  }
};

export const AIM_ASSIST = true;

export const LEVEL_TABLE = [
  { level: 1, xpReq: 0, hpBonus: 0, dmgBonus: 0, rewardType: 'START' },
  { level: 2, xpReq: 50, hpBonus: 40, dmgBonus: 5, rewardType: 'MINOR_PASSIVE' },
  { level: 3, xpReq: 120, hpBonus: 40, dmgBonus: 5, rewardType: 'SPELL_MOD' },
  { level: 4, xpReq: 220, hpBonus: 50, dmgBonus: 8, rewardType: 'MINOR_PASSIVE' },
  { level: 5, xpReq: 350, hpBonus: 60, dmgBonus: 10, rewardType: 'MASTERY' },
  { level: 6, xpReq: 550, hpBonus: 80, dmgBonus: 12, rewardType: 'STAT_BOOST' },
  { level: 7, xpReq: 750, hpBonus: 80, dmgBonus: 12, rewardType: 'STAT_BOOST' },
  { level: 8, xpReq: 950, hpBonus: 80, dmgBonus: 12, rewardType: 'STAT_BOOST' }
];

export const STORM_PHASES = [
  { duration: 25, startRadius: 120, endRadius: 120, tickDamage: 0 },
  { duration: 30, startRadius: 120, endRadius: 75, tickDamage: 10 },
  { duration: 30, startRadius: 75, endRadius: 30, tickDamage: 20 },
  { duration: 25, startRadius: 30, endRadius: 8, tickDamage: 40 }
];
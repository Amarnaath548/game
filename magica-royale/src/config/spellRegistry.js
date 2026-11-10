import { SPELLS_T3 } from './spellRegistryT3.js';

export const ELEMENTS = {
  EARTH: 'E',
  FIRE: 'F',
  WATER: 'W'
};

export const ELEMENT_NAMES = {
  E: 'Earth',
  F: 'Fire',
  W: 'Water'
};

export const ELEMENT_COLORS = {
  E: 0x8b5a2b,
  F: 0xef4444,
  W: 0x06b6d4
};

export const TRAJECTORY = {
  MELEE: 'MELEE',
  LINEAR: 'LINEAR',
  SPREAD: 'SPREAD',
  LOBBED: 'LOBBED',
  SELF_DASH: 'SELF_DASH',
  RADIAL: 'RADIAL',
  WAVE: 'WAVE',
  INSTANT_STRIKE: 'INSTANT_STRIKE'
};

export const FIST_SPELL = {
  id: 'fist',
  name: 'Fist',
  tier: 0,
  elements: [],
  trajectory: TRAJECTORY.MELEE,
  damage: 18,
  cooldown: 0.55,
  range: 2.2,
  arc: 1.75,
  knockback: 1.5,
  color: 0xffaa44
};

export const SPELLS_T1_T2 = {
  // Tier 1 (1 Element)
  E: {
    id: 'E',
    tier: 1,
    name: 'Lump of Dirt',
    elements: ['E'],
    trajectory: 'LINEAR',
    color: 0x8b5a2b,
    damage: 42,
    speed: 26,
    range: 22,
    radius: 0.6,
    knockback: 4.0,
    cooldown: 0.7
  },
  F: {
    id: 'F',
    tier: 1,
    name: 'Fire Ball',
    elements: ['F'],
    trajectory: 'LINEAR',
    color: 0xff5500,
    damage: 48,
    speed: 28,
    range: 24,
    radius: 0.55,
    aoeRadius: 2.5,
    burnDuration: 2.0,
    burnDps: 8,
    cooldown: 0.65
  },
  W: {
    id: 'W',
    tier: 1,
    name: 'Blob of Water',
    elements: ['W'],
    trajectory: 'LINEAR',
    color: 0x06b6d4,
    damage: 38,
    speed: 28,
    range: 22,
    radius: 0.5,
    slowFactor: 0.25,
    slowDuration: 1.5,
    lifesteal: 0.2,
    cooldown: 0.6
  },

  // Tier 2 (2 Elements)
  E_E: {
    id: 'E_E',
    tier: 2,
    name: 'Boulder',
    elements: ['E', 'E'],
    trajectory: 'LINEAR',
    color: 0x785535,
    damage: 65,
    speed: 24,
    range: 22,
    radius: 0.8,
    knockback: 6.0,
    stunDuration: 0.75,
    cooldown: 0.9
  },
  F_F: {
    id: 'F_F',
    tier: 2,
    name: 'Explosive Salvo',
    elements: ['F', 'F'],
    trajectory: 'SPREAD',
    color: 0xf97316,
    damage: 26,
    projectiles: 3,
    spreadAngle: 0.25,
    speed: 32,
    range: 22,
    radius: 0.45,
    aoeRadius: 2.0,
    burnDuration: 2.0,
    burnDps: 8,
    cooldown: 0.85
  },
  W_W: {
    id: 'W_W',
    tier: 2,
    name: 'Spray',
    elements: ['W', 'W'],
    trajectory: 'SPREAD',
    color: 0x0284c7,
    damage: 18,
    projectiles: 4,
    spreadAngle: 0.35,
    speed: 30,
    range: 20,
    radius: 0.4,
    slowFactor: 0.3,
    slowDuration: 1.5,
    lifesteal: 0.25,
    cooldown: 0.75
  },
  E_F: {
    id: 'E_F',
    tier: 2,
    name: 'Meteor',
    elements: ['E', 'F'],
    trajectory: 'LOBBED',
    color: 0xd946ef,
    damage: 70,
    speed: 22,
    range: 24,
    radius: 0.8,
    aoeRadius: 4.5,
    lobArcHeight: 4.0,
    burnDuration: 2.0,
    burnDps: 10,
    cooldown: 1.05
  },
  E_W: {
    id: 'E_W',
    tier: 2,
    name: 'Ice Lance',
    elements: ['E', 'W'],
    trajectory: 'LINEAR',
    color: 0x38bdf8,
    damage: 52,
    speed: 40,
    range: 26,
    radius: 0.45,
    pierce: true,
    slowFactor: 0.4,
    slowDuration: 2.0,
    cooldown: 0.8
  },
  F_W: {
    id: 'F_W',
    tier: 2,
    name: 'Lightning Ball',
    elements: ['F', 'W'],
    trajectory: 'LINEAR',
    color: 0xffe600,
    damage: 48,
    speed: 38,
    range: 26,
    radius: 0.5,
    chainTargets: 2,
    chainRange: 6.5,
    cooldown: 0.75
  }
};

export const ALL_SPELLS = { ...SPELLS_T1_T2, ...SPELLS_T3 };

export function getSpell(key) {
  if (!key) return null;
  if (key === 'fist') return FIST_SPELL;
  if (Array.isArray(key)) {
    key = key.slice().sort().join('_');
  } else if (typeof key === 'string' && key.includes('_')) {
    key = key.split('_').sort().join('_');
  }
  return SPELLS_T1_T2[key] || SPELLS_T3[key] || null;
}


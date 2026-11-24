import { SCHOOLS, UPGRADES, SIDE_EFFECTS, resolveSpell } from './spellSchools.js';
import { PALETTE } from './palette.js';

export { SCHOOLS, UPGRADES, SIDE_EFFECTS, resolveSpell };

export const ELEMENTS = {
  EARTH: 'E',
  FIRE: 'F',
  WATER: 'W'
};

export const ELEMENT_NAMES = {
  E: 'Prithvi',
  F: 'Agni',
  W: 'Jala'
};

export const ELEMENT_COLORS = {
  E: PALETTE.elements.PRITHVI,
  F: PALETTE.elements.AGNI,
  W: PALETTE.elements.JALA
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
  name: 'Mushti',
  lore: 'Barehanded martial strike with innate spiritual force',
  tier: 0,
  elements: [],
  trajectory: TRAJECTORY.MELEE,
  damage: 18,
  cooldown: 0.55,
  range: 2.2,
  arc: 1.75,
  knockback: 1.5,
  color: PALETTE.gold
};

// Tier 1 & Tier 2 Spells
export const SPELLS_T1_T2 = {
  // Tier 1
  E: resolveSpell(['E']),
  F: resolveSpell(['F']),
  W: resolveSpell(['W']),

  // Tier 2 - Upgrades
  E_PARVAT: resolveSpell(['E', 'E'], 'PARVAT'),
  E_KAVACHA: resolveSpell(['E', 'E'], 'KAVACHA'),
  F_JWALA: resolveSpell(['F', 'F'], 'JWALA'),
  F_DAHA: resolveSpell(['F', 'F'], 'DAHA'),
  W_PRAVAHA: resolveSpell(['W', 'W'], 'PRAVAHA'),
  W_HIMKANA: resolveSpell(['W', 'W'], 'HIMKANA'),

  // Tier 2 - Cross-School Side Effects
  E_LAVA: resolveSpell(['E', 'F']),
  E_MUD: resolveSpell(['E', 'W']),
  F_LAVA: resolveSpell(['F', 'E']),
  F_STEAM: resolveSpell(['F', 'W']),
  W_STEAM: resolveSpell(['W', 'F']),
  W_MUD: resolveSpell(['W', 'E'])
};

// Tier 3 Spells
export const SPELLS_T3 = {
  // Pure Astras
  E_ASTRA: resolveSpell(['E', 'E', 'E']),
  F_ASTRA: resolveSpell(['F', 'F', 'F']),
  W_ASTRA: resolveSpell(['W', 'W', 'W']),

  // Astras with Side Effects
  E_ASTRA_LAVA: resolveSpell(['E', 'E', 'F']),
  E_ASTRA_MUD: resolveSpell(['E', 'E', 'W']),
  F_ASTRA_LAVA: resolveSpell(['F', 'F', 'E']),
  F_ASTRA_STEAM: resolveSpell(['F', 'F', 'W']),
  W_ASTRA_STEAM: resolveSpell(['W', 'W', 'F']),
  W_ASTRA_MUD: resolveSpell(['W', 'W', 'E'])
};

export const ALL_SPELLS = { ...SPELLS_T1_T2, ...SPELLS_T3 };

export function getSpell(key, upgradeId = null) {
  if (!key) return null;
  if (key === 'fist') return FIST_SPELL;

  if (Array.isArray(key)) {
    return resolveSpell(key, upgradeId);
  }

  if (typeof key !== 'string') return null;

  // Direct lookup in registered spells
  if (ALL_SPELLS[key]) return ALL_SPELLS[key];

  // Old pure T3 aliases
  if (key === 'E_E_E') return ALL_SPELLS.E_ASTRA;
  if (key === 'F_F_F') return ALL_SPELLS.F_ASTRA;
  if (key === 'W_W_W') return ALL_SPELLS.W_ASTRA;

  // Old T2 same-school aliases
  if (key === 'E_E') return ALL_SPELLS.E_PARVAT;
  if (key === 'F_F') return ALL_SPELLS.F_JWALA;
  if (key === 'W_W') return ALL_SPELLS.W_PRAVAHA;

  // Parse letters e.g. 'F_W', 'E_F', 'E_F_W'
  const parts = key.split('_').filter(Boolean);
  if (parts.length > 0 && parts.every((p) => p === 'E' || p === 'F' || p === 'W')) {
    return resolveSpell(parts, upgradeId);
  }

  // Fallback: match any element letters
  const matched = key.match(/[EFW]/g);
  if (matched && matched.length > 0) {
    return resolveSpell(matched, upgradeId);
  }

  return null;
}

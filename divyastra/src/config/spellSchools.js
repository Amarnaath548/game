import { SPELLS_T3 } from './spellRegistryT3.js';

export const UPGRADES = {
  F: {
    JWALA: { id: 'JWALA', name: 'Jwala', aoeRadius: 3.2 },
    DAHA: { id: 'DAHA', name: 'Daha', burnSpread: true, burnRadius: 5 }
  },
  W: {
    PRAVAHA: { id: 'PRAVAHA', name: 'Pravaha', trajectory: 'WAVE', width: 5, depth: 2.0, speed: 22, range: 16, knockback: 6 },
    HIMKANA: { id: 'HIMKANA', name: 'Himkana', slowFactor: 0.4, slowDuration: 2.5 }
  },
  E: {
    PARVAT: { id: 'PARVAT', name: 'Parvat', radiusMult: 1.5, stunDuration: 0.5, damageMult: 1.15 },
    KAVACHA: { id: 'KAVACHA', name: 'Kavacha', selfShield: 30, selfShieldDuration: 4 }
  }
};

export const SIDE_EFFECTS = {
  E_F: { id: 'LAVA', name: 'Lava', radius: 2.5, duration: 3, dps: 10 },
  F_W: { id: 'STEAM', name: 'Steam', radius: 3, duration: 2.5, slowFactor: 0.3, dps: 6 },
  E_W: { id: 'MUD', name: 'Mud', radius: 3, duration: 3, slowFactor: 0.5 }
};

export const SCHOOLS = {
  E: {
    id: 'E',
    name: 'Prithvi',
    t1: {
      id: 'E',
      tier: 1,
      name: 'Shila Bana',
      lore: 'Hardened earthen projectile hurled with piercing momentum',
      elements: ['E'],
      trajectory: 'LINEAR',
      color: 0x8b5a2b,
      damage: 42,
      speed: 20,
      range: 22,
      radius: 0.7,
      knockback: 5.5,
      cooldown: 0.7
    },
    upgrades: UPGRADES.E,
    t3: SPELLS_T3.E_E_E
  },
  F: {
    id: 'F',
    name: 'Agni',
    t1: {
      id: 'F',
      tier: 1,
      name: 'Agni Bana',
      lore: 'Blazing arrow of consecrated fire that incinerates targets',
      elements: ['F'],
      trajectory: 'LINEAR',
      color: 0xff5500,
      damage: 48,
      speed: 28,
      range: 24,
      radius: 0.55,
      burnDuration: 3,
      burnDps: 8,
      cooldown: 0.65
    },
    upgrades: UPGRADES.F,
    t3: SPELLS_T3.F_F_F
  },
  W: {
    id: 'W',
    name: 'Jala',
    t1: {
      id: 'W',
      tier: 1,
      name: 'Jala Bana',
      lore: 'Swift torrent dart that slows foes and revitalizes',
      elements: ['W'],
      trajectory: 'LINEAR',
      color: 0x06b6d4,
      damage: 38,
      speed: 28,
      range: 22,
      radius: 0.5,
      knockback: 4.5,
      cooldown: 0.6
    },
    upgrades: UPGRADES.W,
    t3: SPELLS_T3.W_W_W
  }
};

export function resolveSpell(picks, upgradeId = null) {
  if (!picks) return null;
  const arr = Array.isArray(picks) ? picks : (typeof picks === 'string' ? picks.split('_').filter(Boolean) : []);
  if (arr.length === 0) return null;

  const validPicks = arr.slice(0, 3);

  // Main school = most picked; tie -> first pick
  const counts = {};
  for (const p of validPicks) {
    counts[p] = (counts[p] || 0) + 1;
  }
  let mainSchool = validPicks[0];
  let maxCount = counts[mainSchool] || 0;
  for (const p of validPicks) {
    if (counts[p] > maxCount) {
      maxCount = counts[p];
      mainSchool = p;
    }
  }

  const school = SCHOOLS[mainSchool];
  if (!school) return null;

  // Side effect = pair (main school, LAST pick that is a different school)
  let lastDiffSchool = null;
  for (let i = validPicks.length - 1; i >= 0; i--) {
    if (validPicks[i] !== mainSchool) {
      lastDiffSchool = validPicks[i];
      break;
    }
  }

  let sideEffect = null;
  if (lastDiffSchool) {
    const pairKey = [mainSchool, lastDiffSchool].sort().join('_');
    sideEffect = SIDE_EFFECTS[pairKey] || null;
  }

  // 1 pick: school t1
  if (validPicks.length === 1) {
    return {
      ...school.t1,
      tier: 1,
      school: mainSchool,
      upgradeId: null,
      sideEffect: null,
      mods: {},
      elements: [...validPicks],
      id: mainSchool,
      name: school.t1.name
    };
  }

  // 2 picks: school t1 with chosen upgrade mods merged (when both same school)
  // If picks differ: t1 of main school with sideEffect attached, no upgrade
  if (validPicks.length === 2) {
    const isSameSchool = validPicks[0] === validPicks[1];
    if (isSameSchool) {
      const upgList = Object.values(school.upgrades);
      let chosenKey = upgradeId;
      let chosenUpgrade = chosenKey && school.upgrades[chosenKey] ? school.upgrades[chosenKey] : null;
      if (!chosenUpgrade) {
        chosenKey = Object.keys(school.upgrades)[0];
        chosenUpgrade = upgList[0];
      }

      const mods = { ...chosenUpgrade };
      const merged = { ...school.t1, ...mods };
      if (mods.radiusMult && school.t1.radius) merged.radius = school.t1.radius * mods.radiusMult;
      if (mods.damageMult && school.t1.damage) merged.damage = Math.round(school.t1.damage * mods.damageMult);

      return {
        ...merged,
        tier: 2,
        school: mainSchool,
        upgradeId: chosenKey,
        sideEffect: null,
        mods,
        elements: [...validPicks],
        id: `${mainSchool}_${chosenKey}`,
        name: `${school.t1.name} . ${chosenUpgrade.name}`
      };
    } else {
      return {
        ...school.t1,
        tier: 2,
        school: mainSchool,
        upgradeId: null,
        sideEffect: sideEffect ? { ...sideEffect } : null,
        mods: {},
        elements: [...validPicks],
        id: sideEffect ? `${mainSchool}_${sideEffect.id}` : `${mainSchool}_COMBO`,
        name: sideEffect ? `${school.t1.name} . ${sideEffect.name}` : school.t1.name
      };
    }
  }

  // 3 picks: school t3 (circle Astra of main school) with sideEffect attached if any
  const baseT3 = school.t3 || {};
  return {
    ...baseT3,
    tier: 3,
    school: mainSchool,
    upgradeId: null,
    sideEffect: sideEffect ? { ...sideEffect } : null,
    mods: {},
    elements: [...validPicks],
    id: sideEffect ? `${mainSchool}_ASTRA_${sideEffect.id}` : `${mainSchool}_ASTRA`,
    name: sideEffect ? `${baseT3.name || 'Astra'} . ${sideEffect.name}` : (baseT3.name || 'Astra')
  };
}

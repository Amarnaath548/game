const STORAGE_KEY = 'MAGICA_ROYALE_PROGRESSION_V1';

export const RANKS = [
  { minTrophies: 0, title: 'Novice Seeker', color: '#94a3b8' },
  { minTrophies: 100, title: 'Sadhaka', color: '#38bdf8' },
  { minTrophies: 300, title: 'Tapasvi', color: '#10b981' },
  { minTrophies: 600, title: 'Rishi', color: '#f59e0b' },
  { minTrophies: 1000, title: 'Maharishi', color: '#b700ff' }
];

import { PALETTE } from '../config/palette.js';

export const STAVES = [
  {
    id: 'PYRO_STAFF',
    name: 'Agni Danda',
    elementBonus: 'F',
    cost: 0,
    perkDesc: '+12% Damage for Agni spells',
    colorHex: PALETTE.elements.AGNI,
    robeColor: PALETTE.sindoor
  },
  {
    id: 'CRYO_STAFF',
    name: 'Jala Danda',
    elementBonus: 'W',
    cost: 150,
    perkDesc: '+12% Damage for Jala spells',
    colorHex: PALETTE.elements.JALA,
    robeColor: PALETTE.elements.JALA
  },
  {
    id: 'ELECTRO_STAFF',
    name: 'Prithvi Danda',
    elementBonus: 'E',
    cost: 300,
    perkDesc: '+12% Damage for Prithvi spells',
    colorHex: PALETTE.elements.PRITHVI,
    robeColor: PALETTE.gold
  },
  {
    id: 'VENOM_STAFF',
    name: 'Naga Danda',
    cooldownReduction: 0.15,
    cost: 500,
    perkDesc: '-15% Spell Cooldown',
    colorHex: PALETTE.elements.PRITHVI,
    robeColor: PALETTE.elements.PRITHVI
  },
  {
    id: 'PIERCE_STAFF',
    name: 'Vayu Danda',
    speedBonus: 0.10,
    cost: 400,
    perkDesc: '+10% Movement Speed',
    colorHex: PALETTE.bone,
    robeColor: PALETTE.saffron
  },
  {
    id: 'BLAST_STAFF',
    name: 'Surya Danda',
    hpBonus: 60,
    cost: 550,
    perkDesc: '+60 Max HP',
    colorHex: PALETTE.gold,
    robeColor: PALETTE.saffron
  },
  {
    id: 'HOMING_STAFF',
    name: 'Akasha Danda',
    pickupRadiusBonus: 3.0,
    cost: 700,
    perkDesc: '+3.0m Pickup Magnet Radius',
    colorHex: PALETTE.elements.JALA,
    robeColor: PALETTE.indigo
  },
  {
    id: 'SHIELD_STAFF',
    name: 'Kavacha Danda',
    hpBonus: 40,
    cooldownReduction: 0.10,
    cost: 850,
    perkDesc: '+40 Max HP & -10% Spell Cooldown',
    colorHex: PALETTE.stone,
    robeColor: PALETTE.ink
  }
];

export const UPGRADES = [
  { id: 'VITALITY', name: 'Soul Vitality', desc: '+25 Max Base HP per level', maxLevel: 5, baseCost: 80, costMult: 1.5 },
  { id: 'SWIFTNESS', name: 'Arcane Swiftness', desc: '+4% Base Movement Speed per level', maxLevel: 5, baseCost: 100, costMult: 1.6 },
  { id: 'MAGNETISM', name: 'Mana Magnet', desc: '+1.0 unit Loot Pickup Radius per level', maxLevel: 5, baseCost: 75, costMult: 1.4 },
  { id: 'POWER', name: 'Spell Power', desc: '+3% spell damage per level', maxLevel: 5, baseCost: 120, costMult: 1.6 },
  { id: 'HASTE', name: 'Swift Casting', desc: '-2% spell cooldown per level', maxLevel: 5, baseCost: 140, costMult: 1.7 },
  { id: 'WARD', name: 'Iron Skin', desc: '-2% damage taken per level', maxLevel: 5, baseCost: 150, costMult: 1.7 },
  { id: 'DASHMASTERY', name: 'Dash Mastery', desc: '-4% dash cooldown per level', maxLevel: 5, baseCost: 110, costMult: 1.5 },
  { id: 'FORTUNE', name: "Fortune's Favour", desc: '+5% gold earned per match per level', maxLevel: 5, baseCost: 90, costMult: 1.5 },
  { id: 'WISDOM', name: "Scholar's Insight", desc: '+4% XP gained per level', maxLevel: 5, baseCost: 100, costMult: 1.5 }
];

export class MetaProgression {
  constructor() {
    this.data = this.load();
  }

  getDefaultData() {
    return {
      trophies: 0,
      gold: 100,
      gems: 0,
      matchesPlayed: 0,
      wins: 0,
      selectedStaffId: 'PYRO_STAFF',
      unlockedStaves: ['PYRO_STAFF'],
      upgradeLevels: {
        VITALITY: 0,
        SWIFTNESS: 0,
        MAGNETISM: 0,
        POWER: 0,
        HASTE: 0,
        WARD: 0,
        DASHMASTERY: 0,
        FORTUNE: 0,
        WISDOM: 0
      }
    };
  }

  get gems() { return this.data.gems || 0; }
  set gems(val) { this.data.gems = val; }

  load() {
    const defaults = this.getDefaultData();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...defaults,
          ...parsed,
          upgradeLevels: { ...defaults.upgradeLevels, ...(parsed.upgradeLevels || {}) }
        };
      }
    } catch (e) {
      console.warn('Could not load progression:', e);
    }
    return defaults;
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save progression:', e);
    }
  }

  getRank() {
    let currentRank = RANKS[0];
    for (const r of RANKS) {
      if (this.data.trophies >= r.minTrophies) currentRank = r;
    }
    return currentRank;
  }

  getSelectedStaff() {
    return STAVES.find((s) => s.id === this.data.selectedStaffId) || STAVES[0];
  }

  ownsSpell() {
    return true;
  }

  selectStaff(staffId) {
    if (this.data.unlockedStaves.includes(staffId)) {
      this.data.selectedStaffId = staffId;
      this.save();
      return true;
    }
    return false;
  }

  unlockStaff(staffId) {
    const staff = STAVES.find((s) => s.id === staffId);
    if (!staff || this.data.unlockedStaves.includes(staffId)) return false;
    if (this.data.gold >= staff.cost) {
      this.data.gold -= staff.cost;
      this.data.unlockedStaves.push(staffId);
      this.data.selectedStaffId = staffId;
      this.save();
      return true;
    }
    return false;
  }

  getUpgradeCost(upgradeId) {
    const upg = UPGRADES.find((u) => u.id === upgradeId);
    if (!upg) return Infinity;
    const lvl = this.data.upgradeLevels[upgradeId] || 0;
    if (lvl >= upg.maxLevel) return Infinity;
    return Math.round(upg.baseCost * Math.pow(upg.costMult, lvl));
  }

  buyUpgrade(upgradeId) {
    const cost = this.getUpgradeCost(upgradeId);
    if (this.data.gold >= cost) {
      this.data.gold -= cost;
      this.data.upgradeLevels[upgradeId] = (this.data.upgradeLevels[upgradeId] || 0) + 1;
      this.save();
      return true;
    }
    return false;
  }

  applyMatchResults(placement) {
    this.data.matchesPlayed++;
    let trophyChange = -10, goldEarned = 20;

    if (placement === 1) { trophyChange = 30; goldEarned = 150; this.data.wins++; }
    else if (placement <= 3) { trophyChange = 15; goldEarned = 80; }
    else if (placement <= 6) { trophyChange = 5; goldEarned = 45; }

    const bonuses = this.getMetaBonuses();
    goldEarned = Math.round(goldEarned * (bonuses.goldMultiplier ?? 1.0));

    this.data.trophies = Math.max(0, this.data.trophies + trophyChange);
    this.data.gold += goldEarned;
    this.save();

    return {
      placement,
      trophyChange,
      goldEarned,
      newTrophies: this.data.trophies,
      newGold: this.data.gold,
      rank: this.getRank()
    };
  }

  addGold(amount) {
    this.data.gold += amount;
    this.save();
    return this.data.gold;
  }

  getMetaBonuses() {
    const lvls = this.data.upgradeLevels || {};
    const hpLevel = lvls.VITALITY || 0;
    const speedLevel = lvls.SWIFTNESS || 0;
    const magLevel = lvls.MAGNETISM || 0;
    const powerLevel = lvls.POWER || 0;
    const hasteLevel = lvls.HASTE || 0;
    const wardLevel = lvls.WARD || 0;
    const dashLevel = lvls.DASHMASTERY || 0;
    const fortuneLevel = lvls.FORTUNE || 0;
    const wisdomLevel = lvls.WISDOM || 0;
    const staff = this.getSelectedStaff();

    const staffHp = staff.hpBonus || 0;
    const staffSpeed = staff.speedBonus || 0;
    const staffPickup = staff.pickupRadiusBonus || 0;
    const staffCd = staff.cooldownReduction || 0;

    return {
      bonusHp: hpLevel * 25 + staffHp,
      speedMultiplier: Math.min(1.6, (1.0 + speedLevel * 0.04) * (1.0 + staffSpeed)),
      pickupRadiusBonus: magLevel * 1.0 + staffPickup,
      damageMultiplier: Math.min(1.5, 1.0 + powerLevel * 0.03),
      cooldownMultiplier: Math.max(0.55, (1.0 - staffCd) * (1.0 - hasteLevel * 0.02)),
      damageTakenMultiplier: Math.max(0.7, 1.0 - wardLevel * 0.02),
      dashCooldownMultiplier: Math.max(0.6, 1.0 - dashLevel * 0.04),
      goldMultiplier: Math.min(1.5, 1.0 + fortuneLevel * 0.05),
      xpMultiplier: Math.min(1.5, 1.0 + wisdomLevel * 0.04),
      staffElementBonus: staff.elementBonus || null
    };
  }
}

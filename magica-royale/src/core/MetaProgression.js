const STORAGE_KEY = 'MAGICA_ROYALE_PROGRESSION_V1';

export const RANKS = [
  { minTrophies: 0, title: 'Apprentice Mage', color: '#94a3b8' },
  { minTrophies: 100, title: 'Battle Evoker', color: '#38bdf8' },
  { minTrophies: 300, title: 'Elemental Adept', color: '#10b981' },
  { minTrophies: 600, title: 'Grand Sorcerer', color: '#f59e0b' },
  { minTrophies: 1000, title: 'Archmage Sovereign', color: '#b700ff' }
];

export const STAVES = [
  {
    id: 'PYRO_STAFF',
    name: 'Infernal Staff',
    elementBonus: 'F',
    cost: 0,
    perkDesc: '+12% Damage for Fire spells',
    colorHex: 0xff5500,
    robeColor: 0xd92638
  },
  {
    id: 'CRYO_STAFF',
    name: 'Glacial Scepter',
    elementBonus: 'W',
    cost: 150,
    perkDesc: '+12% Damage for Water spells',
    colorHex: 0x00f2ff,
    robeColor: 0x0284c7
  },
  {
    id: 'ELECTRO_STAFF',
    name: 'Storm Rod',
    elementBonus: 'E',
    cost: 300,
    perkDesc: '+12% Damage for Earth spells',
    colorHex: 0xffe600,
    robeColor: 0xf59e0b
  },
  {
    id: 'VENOM_STAFF',
    name: 'Vile Spire',
    cooldownReduction: 0.15,
    cost: 500,
    perkDesc: '-15% Spell Cooldown',
    colorHex: 0x39ff14,
    robeColor: 0x10b981
  },
  {
    id: 'PIERCE_STAFF',
    name: 'Prismatic Lance',
    speedBonus: 0.10,
    cost: 400,
    perkDesc: '+10% Movement Speed',
    colorHex: 0xd946ef,
    robeColor: 0xa21caf
  },
  {
    id: 'BLAST_STAFF',
    name: 'Solar Cannon',
    hpBonus: 60,
    cost: 550,
    perkDesc: '+60 Max HP',
    colorHex: 0xf97316,
    robeColor: 0xc2410c
  },
  {
    id: 'HOMING_STAFF',
    name: 'Aether Seeker',
    pickupRadiusBonus: 3.0,
    cost: 700,
    perkDesc: '+3.0m Pickup Magnet Radius',
    colorHex: 0x06b6d4,
    robeColor: 0x0e7490
  },
  {
    id: 'SHIELD_STAFF',
    name: 'Aegis Staff',
    hpBonus: 40,
    cooldownReduction: 0.10,
    cost: 850,
    perkDesc: '+40 Max HP & -10% Spell Cooldown',
    colorHex: 0x3b82f6,
    robeColor: 0x1d4ed8
  }
];

export const UPGRADES = [
  { id: 'VITALITY', name: 'Soul Vitality', desc: '+25 Max Base HP per level', maxLevel: 5, baseCost: 80, costMult: 1.5 },
  { id: 'SWIFTNESS', name: 'Arcane Swiftness', desc: '+4% Base Movement Speed per level', maxLevel: 5, baseCost: 100, costMult: 1.6 },
  { id: 'MAGNETISM', name: 'Mana Magnet', desc: '+1.0 unit Loot Pickup Radius per level', maxLevel: 5, baseCost: 75, costMult: 1.4 }
];

export class MetaProgression {
  constructor() {
    this.data = this.load();
  }

  getDefaultData() {
    return {
      trophies: 0,
      gold: 100,
      matchesPlayed: 0,
      wins: 0,
      selectedStaffId: 'PYRO_STAFF',
      unlockedStaves: ['PYRO_STAFF'],
      upgradeLevels: { VITALITY: 0, SWIFTNESS: 0, MAGNETISM: 0 }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...this.getDefaultData(), ...JSON.parse(raw) };
    } catch (e) {
      console.warn('Could not load progression:', e);
    }
    return this.getDefaultData();
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
    const hpLevel = this.data.upgradeLevels.VITALITY || 0;
    const speedLevel = this.data.upgradeLevels.SWIFTNESS || 0;
    const magLevel = this.data.upgradeLevels.MAGNETISM || 0;
    const staff = this.getSelectedStaff();

    const staffHp = staff.hpBonus || 0;
    const staffSpeed = staff.speedBonus || 0;
    const staffPickup = staff.pickupRadiusBonus || 0;
    const staffCd = staff.cooldownReduction || 0;

    return {
      bonusHp: hpLevel * 25 + staffHp,
      speedMultiplier: (1.0 + speedLevel * 0.04) * (1.0 + staffSpeed),
      pickupRadiusBonus: magLevel * 1.0 + staffPickup,
      cooldownMultiplier: Math.max(0.6, 1.0 - staffCd),
      staffElementBonus: staff.elementBonus || null
    };
  }
}

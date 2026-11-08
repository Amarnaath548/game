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
    element: 'PYRO',
    cost: 0,
    perkDesc: '+10% Fireball Damage & Burn Duration',
    colorHex: 0xff5500,
    robeColor: 0xd92638
  },
  {
    id: 'CRYO_STAFF',
    name: 'Glacial Scepter',
    element: 'CRYO',
    cost: 150,
    perkDesc: '+15% Shard Speed & 40% Chill Slow',
    colorHex: 0x00f2ff,
    robeColor: 0x0284c7
  },
  {
    id: 'ELECTRO_STAFF',
    name: 'Storm Rod',
    element: 'ELECTRO',
    cost: 300,
    perkDesc: '+1 Extra Chain Target',
    colorHex: 0xffe600,
    robeColor: 0xf59e0b
  },
  {
    id: 'VENOM_STAFF',
    name: 'Vile Spire',
    element: 'VENOM',
    cost: 500,
    perkDesc: '+20% Poison DoT & Blast Radius',
    colorHex: 0x39ff14,
    robeColor: 0x10b981
  }
];

export const UPGRADES = [
  {
    id: 'VITALITY',
    name: 'Soul Vitality',
    desc: '+25 Max Base HP per level',
    maxLevel: 5,
    baseCost: 80,
    costMult: 1.5
  },
  {
    id: 'SWIFTNESS',
    name: 'Arcane Swiftness',
    desc: '+4% Base Movement Speed per level',
    maxLevel: 5,
    baseCost: 100,
    costMult: 1.6
  },
  {
    id: 'MAGNETISM',
    name: 'Mana Magnet',
    desc: '+1.0 unit Loot Pickup Radius per level',
    maxLevel: 5,
    baseCost: 75,
    costMult: 1.4
  }
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
      upgradeLevels: {
        VITALITY: 0,
        SWIFTNESS: 0,
        MAGNETISM: 0
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...this.getDefaultData(), ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Could not load progression from localStorage:', e);
    }
    return this.getDefaultData();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save progression to localStorage:', e);
    }
  }

  getRank() {
    let currentRank = RANKS[0];
    for (const r of RANKS) {
      if (this.data.trophies >= r.minTrophies) {
        currentRank = r;
      }
    }
    return currentRank;
  }

  getSelectedStaff() {
    return STAVES.find((s) => s.id === this.data.selectedStaffId) || STAVES[0];
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
    let trophyChange = -10;
    let goldEarned = 25;

    if (placement === 1) {
      trophyChange = 30;
      goldEarned = 150;
      this.data.wins++;
    } else if (placement <= 3) {
      trophyChange = 15;
      goldEarned = 80;
    } else if (placement <= 6) {
      trophyChange = 5;
      goldEarned = 45;
    } else {
      trophyChange = -10;
      goldEarned = 20;
    }

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

  // Helper stats computed from purchased upgrades
  getMetaBonuses() {
    const hpLevel = this.data.upgradeLevels.VITALITY || 0;
    const speedLevel = this.data.upgradeLevels.SWIFTNESS || 0;
    const magLevel = this.data.upgradeLevels.MAGNETISM || 0;

    return {
      bonusHp: hpLevel * 25,
      speedMultiplier: 1.0 + speedLevel * 0.04,
      pickupRadiusBonus: magLevel * 1.0
    };
  }
}


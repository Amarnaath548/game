import { ALL_SPELLS, getSpell } from '../config/spellRegistry.js';

const STORAGE_KEY = 'MAGICA_ROYALE_SPELLBOOK_V1';
const KILL_MILESTONES = [10, 30, 75, 150];
const TIER_REACH_GOLD = { 1: 25, 2: 50, 3: 100 };

export class SpellbookManager {
  constructor() {
    this.data = this.load();
    this.matchEvents = { newSpells: [], starsEarned: 0 };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Failed to load spellbook:', e);
    }
    return {};
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save spellbook:', e);
    }
  }

  getEntry(spellKey) {
    if (!spellKey) return null;
    const cleanKey = Array.isArray(spellKey) ? spellKey.slice().sort().join('_') : spellKey.split('_').sort().join('_');
    if (!this.data[cleanKey]) {
      this.data[cleanKey] = { stars: 0, kills: 0, reached: false, claimedMilestones: [] };
    }
    return this.data[cleanKey];
  }

  onMatchStart() {
    this.matchEvents = { newSpells: [], starsEarned: 0 };
  }

  recordSpellReached(spellKey, metaProgression = null) {
    const spell = getSpell(spellKey);
    if (!spell) return null;
    const entry = this.getEntry(spell.id);

    if (!entry.reached) {
      entry.reached = true;
      entry.stars = Math.min(5, entry.stars + 1);
      const tier = spell.tier || 1;
      const gold = TIER_REACH_GOLD[tier] || 25;
      if (metaProgression) metaProgression.addGold(gold);

      this.matchEvents.newSpells.push(spell.name);
      this.matchEvents.starsEarned += 1;
      this.save();
      return { unlocked: true, gold, stars: entry.stars };
    }
    return null;
  }

  recordKill(spellKey, metaProgression = null) {
    const spell = getSpell(spellKey);
    if (!spell) return null;
    const entry = this.getEntry(spell.id);
    entry.kills += 1;

    let starAdded = false;
    const tier = spell.tier || 1;

    KILL_MILESTONES.forEach((ms) => {
      if (entry.kills >= ms && !entry.claimedMilestones.includes(ms)) {
        entry.claimedMilestones.push(ms);
        if (entry.stars < 5) {
          entry.stars += 1;
          starAdded = true;
          this.matchEvents.starsEarned += 1;
        }
        const gold = 20 * tier;
        if (metaProgression) metaProgression.addGold(gold);
      }
    });

    this.save();
    return { kills: entry.kills, starAdded };
  }

  getDamageMultiplier(spellKey) {
    const entry = this.getEntry(spellKey);
    return 1.0 + (entry ? entry.stars * 0.05 : 0);
  }

  getNextMilestone(kills) {
    return KILL_MILESTONES.find((m) => m > kills) || null;
  }

  getMatchSummary() {
    return {
      newSpells: [...this.matchEvents.newSpells],
      starsEarned: this.matchEvents.starsEarned
    };
  }

  getAllSpellsByTier() {
    const spells = Object.values(ALL_SPELLS);
    return {
      1: spells.filter((s) => s.tier === 1),
      2: spells.filter((s) => s.tier === 2),
      3: spells.filter((s) => s.tier === 3)
    };
  }
}


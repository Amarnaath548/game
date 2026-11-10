const STORAGE_KEY = 'MAGICA_ROYALE_QUESTS_V1';

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function createSeededRandom(seedStr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function generateDailyQuests(dateStr) {
  const rng = createSeededRandom(dateStr);
  const pool = [
    () => {
      const target = Math.floor(rng() * 6) + 3;
      return { type: 'kills', text: `Get ${target} kills in total`, target, goldReward: 30 + (target - 3) * 10 };
    },
    () => ({ type: 'win', text: 'Win a match', target: 1, goldReward: 100 }),
    () => ({ type: 'top3', text: 'Finish in the top 3', target: 1, goldReward: 60 }),
    () => {
      const target = Math.floor(rng() * 13) * 100 + 800;
      return { type: 'damage', text: `Deal ${target} total damage`, target, goldReward: 40 + Math.round(((target - 800) / 1200) * 50) };
    },
    () => {
      const target = Math.floor(rng() * 26) + 15;
      return { type: 'gems', text: `Collect ${target} XP gems`, target, goldReward: 35 + Math.round(((target - 15) / 25) * 45) };
    },
    () => {
      const target = Math.floor(rng() * 41) + 60;
      return { type: 'survive', text: `Survive ${target} seconds in one match`, target, goldReward: 40 + Math.round(((target - 60) / 40) * 40) };
    },
    () => {
      const target = Math.floor(rng() * 61) + 40;
      return { type: 'casts', text: `Cast ${target} spells`, target, goldReward: 30 + Math.round(((target - 40) / 60) * 50) };
    },
    () => {
      const target = Math.floor(rng() * 3) + 4;
      return { type: 'level', text: `Reach level ${target} in one match`, target, goldReward: 50 + (target - 4) * 25 };
    },
    () => {
      const target = Math.floor(rng() * 3) + 1;
      return { type: 'reachT3', text: `Reach a Tier 3 spell ${target} time${target > 1 ? 's' : ''}`, target, goldReward: 40 + target * 20 };
    }
  ];

  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, 3).map((idx) => {
    const q = pool[idx]();
    return { id: `${dateStr}_${q.type}`, ...q, progress: 0, claimed: false };
  });
}

export class QuestManager {
  constructor() {
    this.completedAtMatchStart = new Set();
    this.load();
  }

  load() {
    const today = getTodayString();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === today && Array.isArray(parsed.quests) && parsed.quests.length === 3) {
          this.date = parsed.date;
          this.quests = parsed.quests;
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load daily quests from localStorage:', e);
    }
    this.date = today;
    this.quests = generateDailyQuests(today);
    this.save();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: this.date, quests: this.quests }));
    } catch (e) {
      console.warn('Failed to save daily quests to localStorage:', e);
    }
  }

  checkDate() {
    const today = getTodayString();
    if (this.date !== today) {
      this.date = today;
      this.quests = generateDailyQuests(today);
      this.save();
    }
  }

  onMatchStart() {
    this.checkDate();
    this.completedAtMatchStart = new Set(
      this.quests.filter((q) => q.progress >= q.target).map((q) => q.id)
    );
  }

  record(event, data = 1) {
    this.checkDate();
    let updated = false;

    this.quests.forEach((q) => {
      if (q.claimed || q.progress >= q.target) return;

      if (event === 'kill' && q.type === 'kills') {
        q.progress = Math.min(q.target, q.progress + (typeof data === 'number' ? data : 1));
        updated = true;
      } else if (event === 'damage' && q.type === 'damage') {
        q.progress = Math.min(q.target, q.progress + data);
        updated = true;
      } else if (event === 'gem' && q.type === 'gems') {
        q.progress = Math.min(q.target, q.progress + 1);
        updated = true;
      } else if (event === 'cast' && q.type === 'casts') {
        q.progress = Math.min(q.target, q.progress + 1);
        updated = true;
      } else if (event === 'reachT3' && q.type === 'reachT3') {
        q.progress = Math.min(q.target, q.progress + 1);
        updated = true;
      } else if (event === 'matchEnd' && typeof data === 'object') {
        if (q.type === 'win' && data.placement === 1) {
          q.progress = 1;
          updated = true;
        } else if (q.type === 'top3' && data.placement <= 3) {
          q.progress = 1;
          updated = true;
        } else if (q.type === 'survive' && data.survivalTime >= q.target) {
          q.progress = q.target;
          updated = true;
        } else if (q.type === 'level' && data.level >= q.target) {
          q.progress = q.target;
          updated = true;
        }
      }
    });

    if (updated) this.save();
  }

  getQuestsCompletedThisMatch() {
    this.checkDate();
    return this.quests.filter((q) => q.progress >= q.target && !this.completedAtMatchStart.has(q.id));
  }

  claim(questId, metaProgression) {
    this.checkDate();
    const q = this.quests.find((item) => item.id === questId);
    if (q && q.progress >= q.target && !q.claimed) {
      q.claimed = true;
      this.save();
      if (metaProgression) {
        metaProgression.addGold ? metaProgression.addGold(q.goldReward) : (metaProgression.data.gold += q.goldReward, metaProgression.save());
      }
      return q.goldReward;
    }
    return 0;
  }

  hasClaimable() {
    this.checkDate();
    return this.quests.some((q) => q.progress >= q.target && !q.claimed);
  }

  getQuests() {
    this.checkDate();
    return this.quests;
  }
}


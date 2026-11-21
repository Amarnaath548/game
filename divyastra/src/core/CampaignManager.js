import { LEVELS } from '../config/levels.js';
import { setDifficulty, DIFFICULTIES } from '../config/difficulty.js';

const STORAGE_KEY = 'divyastra_campaign';

export class CampaignManager {
  constructor(deps = {}) {
    this.deps = deps; // { matchManager, ui, banners }
    this.currentLevelId = null;
    this.data = this.load();
  }

  setDeps(deps) {
    this.deps = Object.assign(this.deps || {}, deps);
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            unlocked: parsed.unlocked || 1,
            stars: parsed.stars || {}
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load campaign data:', e);
    }
    return { unlocked: 1, stars: {} };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save campaign data:', e);
    }
  }

  isUnlocked(levelId) {
    if (typeof this.data.unlocked === 'number') {
      return levelId <= this.data.unlocked;
    }
    if (Array.isArray(this.data.unlocked)) {
      return this.data.unlocked.includes(levelId);
    }
    return levelId === 1;
  }

  getStars(levelId) {
    return this.data.stars[levelId] || 0;
  }

  getCurrentLevel() {
    return LEVELS.find((l) => l.id === this.currentLevelId) || null;
  }

  startLevel(levelId) {
    const level = LEVELS.find((l) => l.id === levelId);
    if (!level) return false;
    this.currentLevelId = levelId;
    const diff = setDifficulty(level.difficulty);

    if (this.deps.matchManager) {
      this.deps.matchManager.startMatch(level.biome, level.botCount);
    }
    if (this.deps.banners) {
      this.deps.banners.showMatchStartBanner(level.name, diff.name);
    }
    if (this.deps.ui?.onLevelStarted) {
      this.deps.ui.onLevelStarted(level, diff);
    }
    return true;
  }

  completeLevel(levelId, rank, kills, won) {
    const level = LEVELS.find((l) => l.id === levelId);
    if (!level) return null;

    const completed = rank <= level.completeRank;
    let starsEarned = 0;
    if (won && kills >= 5) {
      starsEarned = 3;
    } else if (won) {
      starsEarned = 2;
    } else if (completed) {
      starsEarned = 1;
    }

    const prevStars = this.getStars(levelId);
    const newStars = Math.max(prevStars, starsEarned);
    this.data.stars[levelId] = newStars;

    let unlockedNext = false;
    const nextLevelId = levelId + 1;
    const nextLevelExists = LEVELS.some((l) => l.id === nextLevelId);

    if (completed && nextLevelExists) {
      if (typeof this.data.unlocked === 'number') {
        if (this.data.unlocked < nextLevelId) {
          this.data.unlocked = nextLevelId;
          unlockedNext = true;
        }
      } else if (Array.isArray(this.data.unlocked)) {
        if (!this.data.unlocked.includes(nextLevelId)) {
          this.data.unlocked.push(nextLevelId);
          unlockedNext = true;
        }
      }
    }

    this.save();

    return {
      completed,
      won,
      rank,
      kills,
      completeRank: level.completeRank,
      starsEarned,
      totalStars: newStars,
      unlockedNext,
      nextLevelId: nextLevelExists ? nextLevelId : null
    };
  }

  unlockAll() {
    this.data.unlocked = LEVELS.length;
    this.save();
    if (this.deps.levelSelectView) {
      this.deps.levelSelectView.render();
    }
  }
}

export const DIFFICULTIES = {
  EASY: {
    key: 'EASY',
    name: 'Easy',
    botDamageMult: 0.7,
    botAimErrorDeg: 14,
    botReactionMult: 1.4,
    botHpMult: 0.85,
    zoneTimeMult: 1.3,
    playerXpMult: 1.2,
    badgeColor: '#22c55e'
  },
  NORMAL: {
    key: 'NORMAL',
    name: 'Normal',
    botDamageMult: 1.0,
    botAimErrorDeg: 8,
    botReactionMult: 1.0,
    botHpMult: 1.0,
    zoneTimeMult: 1.0,
    playerXpMult: 1.0,
    badgeColor: '#38bdf8'
  },
  DIFFICULT: {
    key: 'DIFFICULT',
    name: 'Difficult',
    botDamageMult: 1.15,
    botAimErrorDeg: 4,
    botReactionMult: 0.8,
    botHpMult: 1.1,
    zoneTimeMult: 0.9,
    playerXpMult: 1.0,
    badgeColor: '#f97316'
  },
  HARD: {
    key: 'HARD',
    name: 'Hard',
    botDamageMult: 1.3,
    botAimErrorDeg: 1,
    botReactionMult: 0.6,
    botHpMult: 1.25,
    zoneTimeMult: 0.8,
    playerXpMult: 0.9,
    badgeColor: '#ef4444'
  }
};

let currentDifficulty = DIFFICULTIES.NORMAL;

export function setDifficulty(key) {
  if (typeof key === 'string') {
    const upper = key.toUpperCase();
    if (DIFFICULTIES[upper]) {
      currentDifficulty = DIFFICULTIES[upper];
      return currentDifficulty;
    }
  } else if (key && typeof key === 'object' && key.botDamageMult !== undefined) {
    currentDifficulty = key;
    return currentDifficulty;
  }
  currentDifficulty = DIFFICULTIES.NORMAL;
  return currentDifficulty;
}

export function getDifficulty() {
  return currentDifficulty || DIFFICULTIES.NORMAL;
}

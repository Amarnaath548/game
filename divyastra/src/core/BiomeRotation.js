import { BIOMES } from '../config/constants.js';

export function loadBiomeHistory() {
  try {
    const s = localStorage.getItem('magica_biome_history');
    if (s) {
      const a = JSON.parse(s);
      if (Array.isArray(a)) return a;
    }
  } catch (e) {}
  return [];
}

export function saveBiomeHistory(history, nextKey) {
  try {
    localStorage.setItem('magica_biome_history', JSON.stringify(history));
    localStorage.setItem('magica_next_biome', nextKey);
  } catch (e) {}
}

export function pickNextBiome(history = []) {
  const keys = Object.keys(BIOMES);
  const last = history[history.length - 1];
  const pool = keys.filter((k) => k !== last);
  return pool[Math.floor(Math.random() * pool.length)] || keys[0];
}

export function initNextBiome(history = []) {
  try {
    const s = localStorage.getItem('magica_next_biome');
    if (s && BIOMES[s]) return s;
  } catch (e) {}
  const picked = pickNextBiome(history);
  try { localStorage.setItem('magica_next_biome', picked); } catch (e) {}
  return picked;
}

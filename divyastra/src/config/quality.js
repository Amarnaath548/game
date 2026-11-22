export const QUALITY_TIERS = ['LOW', 'MEDIUM', 'HIGH'];

export const QUALITY_PRESETS = {
  LOW: {
    id: 'LOW',
    label: 'Low',
    pixelRatio: 1,
    antialias: false,
    shadows: 'off',
    shadowMapSize: 0,
    particleScale: 0.5
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'Medium',
    pixelRatio: 1.25,
    antialias: false,
    shadows: 512,
    shadowMapSize: 512,
    particleScale: 0.75
  },
  HIGH: {
    id: 'HIGH',
    label: 'High',
    get pixelRatio() {
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      return Math.min(dpr, 2);
    },
    antialias: true,
    shadows: 1024,
    shadowMapSize: 1024,
    particleScale: 1
  }
};

export function detectDefaultQuality() {
  if (typeof window === 'undefined') return 'HIGH';
  const isTouch = (
    'ontouchstart' in window ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
  const isSmallScreen = window.innerWidth < 900 || (window.screen && window.screen.width < 900);
  return (isTouch || isSmallScreen) ? 'LOW' : 'HIGH';
}

export function getSavedQuality() {
  try {
    const saved = localStorage.getItem('divyastra_quality');
    if (saved && QUALITY_PRESETS[saved.toUpperCase()]) {
      return saved.toUpperCase();
    }
  } catch (e) {}
  return detectDefaultQuality();
}

export function saveQuality(tier) {
  try {
    if (tier && QUALITY_PRESETS[tier.toUpperCase()]) {
      localStorage.setItem('divyastra_quality', tier.toUpperCase());
    }
  } catch (e) {}
}

export function getLowerQualityTier(tier) {
  const current = (tier || 'HIGH').toUpperCase();
  if (current === 'HIGH') return 'MEDIUM';
  if (current === 'MEDIUM') return 'LOW';
  return 'LOW';
}

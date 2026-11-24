export const PALETTE = {
  ink: 0x15172B,
  indigo: 0x1B1F3B,
  gold: 0xE3B04B,
  saffron: 0xE08A2E,
  sindoor: 0xC8431E,
  stone: 0xB9AE98,
  bone: 0xEFE6D2,
  elements: {
    AGNI: 0xE4572E,
    JALA: 0x2FB5C9,
    PRITHVI: 0x7FA650,
    F: 0xE4572E,
    W: 0x2FB5C9,
    E: 0x7FA650
  }
};

export const CSS_PALETTE = {
  ink: '#15172B',
  indigo: '#1B1F3B',
  gold: '#E3B04B',
  saffron: '#E08A2E',
  sindoor: '#C8431E',
  stone: '#B9AE98',
  bone: '#EFE6D2',
  elements: {
    AGNI: '#E4572E',
    JALA: '#2FB5C9',
    PRITHVI: '#7FA650',
    F: '#E4572E',
    W: '#2FB5C9',
    E: '#7FA650'
  }
};

export function hexToCss(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

export function hexToRgba(hex, alpha = 1) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

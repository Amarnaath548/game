// Shared SVG Icons (stroke style, 2px line, currentColor, 24px viewBox)
const svg = (inner, size = 18, cls = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="dv-icon ${cls}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

export const iconCrown = (size = 16, cls = '') =>
  svg('<path d="M3 18h18l-2-11-5 5-4-7-4 7-5-5z"/><line x1="3" y1="20" x2="21" y2="20"/>', size, cls);

export const iconPeople = (size = 14, cls = '') =>
  svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', size, cls);

export const iconSkull = (size = 15, cls = '') =>
  svg('<path d="M9 18v3h6v-3"/><path d="M5 12c0-4.4 3.1-8 7-8s7 3.6 7 8c0 3.2-1.8 5.7-4 6.8V18H9v.8C6.8 17.7 5 15.2 5 12z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>', size, cls);

export const iconSpeaker = (size = 14, cls = '', muted = false) => {
  if (muted) {
    return svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>', size, cls);
  }
  return svg('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>', size, cls);
};

export const iconFist = (size = 18, cls = '') =>
  svg('<path d="M7 11V7a2 2 0 0 1 4 0v4"/><path d="M11 10V5a2 2 0 0 1 4 0v5"/><path d="M15 10V6a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6H9a5 5 0 0 1-5-5v-2a2 2 0 0 1 4 0"/><line x1="4" y1="13" x2="8" y2="13"/>', size, cls);

export const iconSwords = (size = 16, cls = '') =>
  svg('<line x1="14.5" y1="17.5" x2="3" y2="6"/><path d="M3 6l2-3 3 2-2 3"/><line x1="9.5" y1="6.5" x2="21" y2="18"/><path d="M21 18l-2 3-3-2 2-3"/><line x1="19" y1="5" x2="5" y2="19"/><line x1="17" y1="3" x2="21" y2="7"/><line x1="3" y1="17" x2="7" y2="21"/>', size, cls);

export const iconLock = (size = 14, cls = '') =>
  svg('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', size, cls);

export const iconUnlock = (size = 14, cls = '') =>
  svg('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>', size, cls);

export const iconCheck = (size = 14, cls = '') =>
  svg('<polyline points="20 6 9 17 4 12"/>', size, cls);

export const iconStar = (size = 14, filled = true, cls = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="dv-icon ${cls}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

export const iconMap = (size = 14, cls = '') =>
  svg('<polygon points="1 6 8 2 16 6 23 2 23 18 16 22 8 18 1 22 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>', size, cls);

export const iconTrophy = (size = 14, cls = '') =>
  svg('<path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/><path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M4 3h16v6a8 8 0 0 1-16 0V3z"/><path d="M12 17v4"/><path d="M8 21h8"/>', size, cls);

export const iconSparkle = (size = 16, cls = '') =>
  svg('<path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>', size, cls);

export const iconBook = (size = 14, cls = '') =>
  svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', size, cls);

export const iconFlame = (size = 16, cls = '') =>
  svg('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2.5-1.12 2.5-2.5 0-1.5-1.5-2.5-1.5-4 0-1.5 1-2.5 1-3.5-1 1-3 3-3 5.5z"/><path d="M12 2c1 3 5 4.5 5 9.5a7 7 0 1 1-14 0c0-4 3.5-7 5.5-9.5z"/>', size, cls);

export const iconDroplet = (size = 16, cls = '') =>
  svg('<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>', size, cls);

export const iconRock = (size = 16, cls = '') =>
  svg('<polygon points="3 14 7 5 17 3 21 11 18 20 6 21 3 14"/>', size, cls);

export const iconFullscreen = (size = 14, cls = '') =>
  svg('<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>', size, cls);

export const iconPhoneRotate = (size = 40, cls = '') =>
  svg('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/><path d="M18 9l3 3-3 3"/><path d="M21 12h-6"/>', size, cls);

export const iconDash = (size = 20, cls = '') =>
  svg('<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>', size, cls);

export const iconGold = (size = 15, cls = '') =>
  `<img src="./lobby/icon_gold.png" class="currency-coin ${cls}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="Gold" />`;

export const iconGem = (size = 15, cls = '') =>
  `<img src="./lobby/icon_gem.png" class="currency-gem ${cls}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;display:inline-block;" alt="Gems" />`;

export const elementIcon = (elem, size = 14) => {
  if (elem === 'F') return iconFlame(size);
  if (elem === 'W') return iconDroplet(size);
  if (elem === 'E') return iconRock(size);
  return '';
};

export const renderStars = (count, max = 5, size = 13) => {
  let res = '';
  for (let i = 1; i <= max; i++) {
    res += iconStar(size, i <= count);
  }
  return res;
};

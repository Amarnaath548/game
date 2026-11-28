import { ELEMENT_NAMES, ELEMENT_COLORS } from '../config/spellRegistry.js';
import { renderStars, iconLock } from './icons.js';
import { paintIcon, ELEMENT_PAINT } from './gameIcons.js';

export class SpellbookView {
  constructor(container, spellbookManager) {
    this.container = container;
    this.spellbook = spellbookManager;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';
    const tiers = this.spellbook.getAllSpellsByTier();
    const tierLabels = { 1: 'MANTRA', 2: 'SHASTRA', 3: 'ASTRA' };

    [1, 2, 3].forEach((tierNum) => {
      const tierSpells = tiers[tierNum] || [];
      const section = document.createElement('div');
      section.className = 'spellbook-tier-section';
      section.style.cssText = 'margin-bottom:16px;';

      const heading = document.createElement('div');
      heading.className = 'gm-ribbon gm-ribbon--sm spellbook-tier-ribbon';
      heading.innerHTML = `<span>${tierLabels[tierNum]}</span><span style="font-family:'Rubik',sans-serif;font-size:10px;color:#cbd5e1;font-weight:700;margin-left:6px;-webkit-text-stroke:0;">(${tierSpells.length})</span>`;
      section.appendChild(heading);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:10px;';

      tierSpells.forEach((spell) => {
        const entry = this.spellbook.getEntry(spell.id);
        const isReached = entry && entry.reached;
        const card = document.createElement('div');
        card.className = `spellbook-card gm-card ${isReached ? 'unlocked' : 'locked'}`;
        const primaryEl = (spell.elements && spell.elements[0]) || 'F';
        const tintHex = spell.color || ELEMENT_COLORS[primaryEl] || 0xE3B04B;
        const r = (tintHex >> 16) & 255;
        const g = (tintHex >> 8) & 255;
        const b = tintHex & 255;
        if (isReached) card.style.setProperty('--spell-tint', `rgba(${r}, ${g}, ${b}, 0.22)`);

        const elems = spell.elements || [primaryEl];
        const main = paintIcon(ELEMENT_PAINT[primaryEl] || 'flame', 100);
        const subs = elems.slice(1).map((e, i) => `<span class="sb-sub sb-sub-${i}">${paintIcon(ELEMENT_PAINT[e] || 'flame', 100)}</span>`).join('');
        const medallionIcon = isReached
          ? `<span class="sb-ico">${main}${subs}</span>`
          : iconLock(30);
        const medallionHtml = `<div class="gm-medallion sb-medal sb-tier-${tierNum}">${medallionIcon}</div>`;

        const chipsHtml = elems.map((e) => {
          const col = isReached && ELEMENT_COLORS[e] ? `#${ELEMENT_COLORS[e].toString(16).padStart(6, '0')}` : '#64748b';
          return `<span class="sb-chip" style="border-color:${col};color:${col};">${ELEMENT_NAMES[e] || e}</span>`;
        }).join('');

        if (!isReached) {
          card.innerHTML = `
            <div class="sb-row">${medallionHtml}
              <div class="sb-text">
                <div class="sb-name sb-name-locked">???</div>
                <div class="sb-chips">${chipsHtml}</div>
                <div class="sb-lore">Reach in match to unlock</div>
              </div>
            </div>`;
        } else {
          const starCount = entry.stars || 0;
          const nextMs = this.spellbook.getNextMilestone(entry.kills);
          const progressText = nextMs ? `${entry.kills} / ${nextMs} kills` : `${entry.kills} kills (MAX)`;
          card.innerHTML = `
            <div class="sb-row">${medallionHtml}
              <div class="sb-text">
                <div class="sb-name">${spell.name}</div>
                <div class="sb-stars" title="${starCount} Siddhi">${renderStars(starCount, 5, 12)}</div>
              </div>
            </div>
            ${spell.lore ? `<div class="sb-lore">${spell.lore}</div>` : ''}
            <div class="sb-chips">${chipsHtml}</div>
            <div class="sb-stats"><span class="sb-dmg">+${starCount * 5}% DMG</span><span class="sb-kills">${progressText}</span></div>`;
        }
        grid.appendChild(card);
      });

      section.appendChild(grid);
      this.container.appendChild(section);
    });
  }
}

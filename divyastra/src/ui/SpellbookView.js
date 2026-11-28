import { ELEMENT_NAMES, ELEMENT_COLORS } from '../config/spellRegistry.js';
import { elementIcon, renderStars, iconLock } from './icons.js';
import { assetLoader } from '../core/AssetLoader.js';

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
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:8px;';

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

        const iconUrl = assetLoader.getSpellIconUrl(primaryEl);
        const medallionIcon = isReached
          ? (iconUrl ? `<img src="${iconUrl}" alt="${spell.name}" />` : elementIcon(primaryEl, 36))
          : iconLock(30);
        const medallionHtml = `<div class="gm-medallion">${medallionIcon}</div>`;

        const chipsHtml = (spell.elements || []).map((e) => {
          const col = isReached && ELEMENT_COLORS[e] ? `#${ELEMENT_COLORS[e].toString(16).padStart(6, '0')}` : '#64748b';
          return `<span style="font-size:9px;font-weight:700;border:1px solid ${col};color:${col};padding:1px 4px;border-radius:3px;display:inline-flex;align-items:center;gap:3px;">${elementIcon(e, 11)} ${ELEMENT_NAMES[e] || e}</span>`;
        }).join(' ');

        if (!isReached) {
          card.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              ${medallionHtml}
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;font-weight:700;color:#64748b;">???</span>
                  <span style="font-size:10px;color:#475569;">Locked</span>
                </div>
                <div style="display:flex;gap:3px;margin:2px 0;">${chipsHtml}</div>
                <div style="font-size:10px;color:#64748b;">Reach in match to unlock</div>
              </div>
            </div>
          `;
        } else {
          const starCount = entry.stars || 0;
          const nextMs = this.spellbook.getNextMilestone(entry.kills);
          const progressText = nextMs ? `${entry.kills} / ${nextMs} kills` : `${entry.kills} kills (MAX)`;
          const dmgBonus = starCount * 5;
          const loreHtml = spell.lore ? `<div style="font-size:9px;color:#94a3b8;font-style:italic;line-height:1.2;margin:1px 0;">${spell.lore}</div>` : '';

          card.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              ${medallionHtml}
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:12px;font-weight:700;color:#fff;">${spell.name}</span>
                  <span style="display:inline-flex;gap:1px;color:#E3B04B;" title="${starCount} Siddhi">${renderStars(starCount, 5, 12)}</span>
                </div>
                ${loreHtml}
                <div style="display:flex;gap:3px;margin:1px 0;">${chipsHtml}</div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:#cbd5e1;font-weight:700;">
                  <span style="color:#7FA650;">+${dmgBonus}% DMG</span>
                  <span style="color:#94a3b8;">${progressText}</span>
                </div>
              </div>
            </div>
          `;
        }
        grid.appendChild(card);
      });

      section.appendChild(grid);
      this.container.appendChild(section);
    });
  }
}

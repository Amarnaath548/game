import { ELEMENT_NAMES, ELEMENT_COLORS } from '../config/spellRegistry.js';

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
    const icons = { E: '🪨', F: '🔥', W: '💧' };

    [1, 2, 3].forEach((tierNum) => {
      const tierSpells = tiers[tierNum] || [];
      const section = document.createElement('div');
      section.className = 'spellbook-tier-section';
      section.style.cssText = 'margin-bottom:16px;';

      const heading = document.createElement('div');
      heading.style.cssText = 'font-size:13px;font-weight:900;color:#38bdf8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:6px;';
      heading.innerHTML = `<span>${tierLabels[tierNum]} (TIER ${tierNum})</span> <span style="font-size:11px;color:#94a3b8;font-weight:700;">(${tierSpells.length} Spells)</span>`;
      section.appendChild(heading);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:8px;';

      tierSpells.forEach((spell) => {
        const entry = this.spellbook.getEntry(spell.id);
        const isReached = entry && entry.reached;
        const card = document.createElement('div');
        card.className = `spellbook-card ${isReached ? 'unlocked' : 'locked'}`;

        const borderCol = isReached ? `#${(spell.color || 0x38bdf8).toString(16).padStart(6, '0')}` : '#334155';
        card.style.cssText = `background:rgba(15,23,42,0.92);border:1.5px solid ${borderCol};border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;box-shadow:0 2px 8px rgba(0,0,0,0.5);`;

        const chipsHtml = (spell.elements || []).map((e) => {
          const col = isReached && ELEMENT_COLORS[e] ? `#${ELEMENT_COLORS[e].toString(16).padStart(6, '0')}` : '#64748b';
          return `<span style="font-size:9px;font-weight:800;border:1px solid ${col};color:${col};padding:1px 4px;border-radius:3px;">${icons[e] || ''} ${ELEMENT_NAMES[e] || e}</span>`;
        }).join(' ');

        if (!isReached) {
          card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;font-weight:900;color:#64748b;">???</span>
              <span style="font-size:10px;color:#475569;">Locked</span>
            </div>
            <div style="display:flex;gap:3px;margin:2px 0;">${chipsHtml}</div>
            <div style="font-size:10px;color:#64748b;">Reach in match to unlock</div>
          `;
        } else {
          const starCount = entry.stars || 0;
          const starsStr = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
          const nextMs = this.spellbook.getNextMilestone(entry.kills);
          const progressText = nextMs ? `${entry.kills} / ${nextMs} kills` : `${entry.kills} kills (MAX)`;
          const dmgBonus = starCount * 5;
          const loreHtml = spell.lore ? `<div style="font-size:9px;color:#94a3b8;font-style:italic;line-height:1.2;margin:1px 0;">${spell.lore}</div>` : '';

          card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;font-weight:900;color:#fff;">${spell.name}</span>
              <span style="font-size:11px;font-weight:800;color:#fbbf24;" title="${starCount} Siddhi">${starsStr}</span>
            </div>
            ${loreHtml}
            <div style="display:flex;gap:3px;margin:1px 0;">${chipsHtml}</div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#cbd5e1;font-weight:700;">
              <span style="color:#10b981;">+${dmgBonus}% DMG</span>
              <span style="color:#94a3b8;">${progressText}</span>
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


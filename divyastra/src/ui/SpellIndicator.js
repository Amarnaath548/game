import { ELEMENT_COLORS } from '../config/spellRegistry.js';

const PERK_ICONS = {
  TWIN_CAST: '♊',
  GIANT_ARCANA: '✴️',
  SNIPER_VELOCITY: '🎯',
  VAMPIRIC_SOUL: '🩸',
  WINDWALKER: '💨',
  ARCANE_SHIELD: '🛡️',
  EXECUTIONER: '⚔️'
};

export class SpellIndicator {
  constructor(containerEl = null) {
    this.container = containerEl || document.getElementById('spell-indicator');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'spell-indicator';
      const hud = document.getElementById('hud') || document.body;
      hud.appendChild(this.container);
    }
    this.container.innerHTML = `
      <div id="spell-ind-cd" class="spell-ind-cd">
        <div id="spell-ind-orb" class="spell-ind-orb">
          <span id="spell-ind-icon">✨</span>
          <span id="spell-ind-radius" class="spell-ind-radius" style="position:absolute;bottom:-2px;right:-2px;font-size:9px;font-weight:900;color:#fff;background:rgba(0,0,0,0.7);padding:0 3px;border-radius:4px;display:none;"></span>
        </div>
      </div>
      <div id="spell-ind-info" style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:3px;white-space:nowrap;pointer-events:none;">
        <span id="spell-ind-name" style="font-size:10px;font-weight:900;text-shadow:0 1px 3px #000;"></span>
        <span id="spell-ind-side" style="display:none;font-size:8px;font-weight:900;padding:0 3px;border-radius:3px;"></span>
        <span id="spell-ind-tier" style="display:none;font-size:8px;font-weight:900;background:#334155;padding:0 4px;border-radius:999px;">Astra</span>
      </div>
    `;
    this.cdEl = this.container.querySelector('#spell-ind-cd');
    this.orbEl = this.container.querySelector('#spell-ind-orb');
    this.iconEl = this.container.querySelector('#spell-ind-icon');
    this.radiusEl = this.container.querySelector('#spell-ind-radius');
    this.nameEl = this.container.querySelector('#spell-ind-name');
    this.sideEl = this.container.querySelector('#spell-ind-side');
    this.tierEl = this.container.querySelector('#spell-ind-tier');

    this.badgeRow = document.getElementById('perk-badge-row');
    if (!this.badgeRow && this.container?.parentNode) {
      this.badgeRow = document.createElement('div');
      this.badgeRow.id = 'perk-badge-row';
      this.badgeRow.className = 'perk-badge-row';
      this.container.parentNode.appendChild(this.badgeRow);
    }

    this.lastColor = null;
    this.lastDeg = -1;
    this.lastScale = 1.0;
    this.lastBadgesHtml = '';
  }

  update(player) {
    if (!player) return;
    const spell = player.currentSpell || {};
    const schoolColor = spell.school && ELEMENT_COLORS[spell.school] ? ELEMENT_COLORS[spell.school] : (spell.color || 0x38bdf8);
    const colorHex = `#${schoolColor.toString(16).padStart(6, '0')}`;

    if (this.nameEl) {
      this.nameEl.textContent = spell.name || (spell.id === 'fist' ? 'Mushti' : '');
      this.nameEl.style.color = colorHex;
    }
    if (this.tierEl) {
      this.tierEl.style.display = spell.tier === 3 ? 'inline-block' : 'none';
      this.tierEl.style.color = colorHex;
    }
    if (this.sideEl) {
      const side = spell.sideEffect;
      if (side && side.id) {
        const sideId = side.id.toUpperCase();
        const sideColors = { LAVA: { bg: '#c2410c', text: '#ffedd5', border: '#f97316' }, STEAM: { bg: '#e2e8f0', text: '#0f172a', border: '#ffffff' }, MUD: { bg: '#5c3a21', text: '#fef3c7', border: '#8b5a2b' } };
        const cfg = sideColors[sideId] || { bg: '#334155', text: '#fff', border: '#64748b' };
        this.sideEl.textContent = sideId; this.sideEl.style.background = cfg.bg;
        this.sideEl.style.color = cfg.text; this.sideEl.style.border = `1px solid ${cfg.border}`;
        this.sideEl.style.display = 'inline-block';
      } else {
        this.sideEl.style.display = 'none';
      }
    }

    if (this.lastColor !== colorHex) {
      if (this.orbEl) {
        this.orbEl.style.background = `radial-gradient(circle at 35% 35%, #ffffff 0%, ${colorHex} 60%, rgba(0,0,0,0.7) 100%)`;
        this.orbEl.style.boxShadow = `0 0 10px ${colorHex}88`;
      }
      if (this.iconEl) {
        const icons = { fist: '👊', fire: '🔥', water: '💧', earth: '🪨' };
        this.iconEl.textContent = icons[spell.id] || (spell.elements?.[0] ? { F: '🔥', W: '💧', E: '🪨' }[spell.elements[0]] : '✨');
      }
      this.lastColor = colorHex;
    }

    const isGiant = player.perks?.includes('GIANT_ARCANA');
    const targetScale = isGiant ? 1.25 : 1.0;
    if (this.lastScale !== targetScale) {
      this.lastScale = targetScale;
      this.container.style.transform = isGiant ? 'scale(1.25)' : 'none';
      this.container.style.transformOrigin = 'center center';
    }

    if (this.radiusEl) {
      if (spell.trajectory === 'RADIAL') {
        const rad = ((spell.radius || 6.0) * (isGiant ? 1.4 : 1.0)).toFixed(1);
        this.radiusEl.textContent = `r:${rad}`;
        this.radiusEl.style.display = 'block';
      } else {
        this.radiusEl.style.display = 'none';
      }
    }

    if (this.badgeRow) {
      const perks = player.perks || [];
      const html = perks.map((p) => `<span class="perk-badge" title="${p}">${PERK_ICONS[p] || '⭐'}</span>`).join('');
      if (this.lastBadgesHtml !== html) {
        this.lastBadgesHtml = html;
        this.badgeRow.innerHTML = html;
      }
    }

    const cdRatio = player.spellSlot
      ? player.spellSlot.getCooldownProgress()
      : Math.max(0, (player.shootCooldown || 0) / (spell.cooldown || 1));

    const fillProgress = Math.max(0, Math.min(1, 1 - cdRatio));
    const sweepDeg = Math.round(fillProgress * 360);

    if (this.lastDeg !== sweepDeg) {
      if (this.cdEl) {
        const sweepColor = cdRatio > 0 ? '#f59e0b' : colorHex;
        this.cdEl.style.background = `conic-gradient(${sweepColor} ${sweepDeg}deg, rgba(15, 23, 42, 0.9) ${sweepDeg}deg 360deg)`;
      }
      this.lastDeg = sweepDeg;
    }
  }

  reset() {
    this.lastColor = null;
    this.lastDeg = -1;
    this.lastScale = 1.0;
    this.lastBadgesHtml = '';
    if (this.container) this.container.style.transform = 'none';
    if (this.badgeRow) this.badgeRow.innerHTML = '';
  }
}

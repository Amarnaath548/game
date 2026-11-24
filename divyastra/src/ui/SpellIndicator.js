import { ELEMENT_COLORS } from '../config/spellRegistry.js';
import { PALETTE } from '../config/palette.js';
import { iconFist, iconFlame, iconDroplet, iconRock, iconSparkle, iconStar, iconSwords } from './icons.js';

const PERK_ICONS = {
  TWIN_CAST: iconSparkle(13),
  GIANT_ARCANA: iconStar(13),
  SNIPER_VELOCITY: iconSparkle(13),
  VAMPIRIC_SOUL: iconDroplet(13),
  WINDWALKER: iconSparkle(13),
  ARCANE_SHIELD: iconRock(13),
  EXECUTIONER: iconSwords(13)
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
          <span id="spell-ind-icon">${iconFist(22)}</span>
          <span id="spell-ind-radius" class="spell-ind-radius" style="position:absolute;bottom:-2px;right:-2px;font-size:9px;font-weight:700;color:#fff;background:rgba(0,0,0,0.7);padding:0 3px;border-radius:4px;display:none;"></span>
        </div>
      </div>
      <div id="spell-ind-info" style="position:absolute;bottom:-18px;right:0;display:flex;align-items:center;justify-content:flex-end;gap:3px;white-space:nowrap;pointer-events:none;">
        <span id="spell-ind-name" style="font-size:9px;font-weight:700;text-shadow:0 1px 3px #000;"></span>
        <span id="spell-ind-side" style="display:none;"></span>
        <span id="spell-ind-tier" style="display:none;font-size:8px;font-weight:700;background:#334155;padding:0 4px;border-radius:999px;">Astra</span>
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
    this.lastSpellId = null;
    this.lastDeg = -1;
    this.lastScale = 1.0;
    this.lastBadgesHtml = '';
  }

  getSpellIcon(spell) {
    if (!spell || spell.id === 'fist') return iconFist(22);
    if (spell.id === 'fire' || spell.elements?.[0] === 'F') return iconFlame(20);
    if (spell.id === 'water' || spell.elements?.[0] === 'W') return iconDroplet(20);
    if (spell.id === 'earth' || spell.elements?.[0] === 'E') return iconRock(20);
    return iconSparkle(20);
  }

  update(player) {
    if (!player) return;
    const spell = player.currentSpell || {};
    const schoolColor = spell.school && ELEMENT_COLORS[spell.school] ? ELEMENT_COLORS[spell.school] : (spell.color || PALETTE.elements.JALA);
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
      this.sideEl.style.display = 'none';
    }

    if (this.lastColor !== colorHex || this.lastSpellId !== spell.id) {
      if (this.orbEl) {
        this.orbEl.style.background = '#15172B';
        this.orbEl.style.border = '2.5px solid #E3B04B';
        this.orbEl.style.color = colorHex;
        this.orbEl.style.setProperty('--spell-glow', colorHex);
      }
      if (this.iconEl) {
        this.iconEl.innerHTML = this.getSpellIcon(spell);
      }
      this.lastColor = colorHex;
      this.lastSpellId = spell.id;
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
      const html = perks.map((p) => `<span class="perk-badge" title="${p}">${PERK_ICONS[p] || iconStar(12)}</span>`).join('');
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

    const isReady = cdRatio <= 0.01;
    if (this.orbEl) {
      if (isReady) {
        this.orbEl.classList.add('ready');
        this.orbEl.style.boxShadow = `0 0 16px ${colorHex}, inset 0 0 8px ${colorHex}55`;
      } else {
        this.orbEl.classList.remove('ready');
        this.orbEl.style.boxShadow = 'none';
      }
    }

    if (this.lastDeg !== sweepDeg) {
      if (this.cdEl) {
        const sweepColor = cdRatio > 0 ? '#E08A2E' : colorHex;
        this.cdEl.style.background = `conic-gradient(${sweepColor} ${sweepDeg}deg, rgba(27, 31, 59, 0.9) ${sweepDeg}deg 360deg)`;
      }
      this.lastDeg = sweepDeg;
    }
  }

  reset() {
    this.lastColor = null;
    this.lastSpellId = null;
    this.lastDeg = -1;
    this.lastScale = 1.0;
    this.lastBadgesHtml = '';
    if (this.container) this.container.style.transform = 'none';
    if (this.badgeRow) this.badgeRow.innerHTML = '';
  }
}

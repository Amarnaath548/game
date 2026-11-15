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
        </div>
      </div>
    `;
    this.cdEl = this.container.querySelector('#spell-ind-cd');
    this.orbEl = this.container.querySelector('#spell-ind-orb');
    this.iconEl = this.container.querySelector('#spell-ind-icon');
    this.lastColor = null;
    this.lastDeg = -1;
  }

  update(player) {
    if (!player) return;
    const spell = player.currentSpell || {};
    const colorHex = spell.color ? `#${spell.color.toString(16).padStart(6, '0')}` : '#38bdf8';

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

    const cdRatio = player.spellSlot
      ? player.spellSlot.getCooldownProgress()
      : Math.max(0, (player.shootCooldown || 0) / (spell.cooldown || 1));

    // Progress goes 0 -> 1 as cooldown ends (fills up)
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
  }
}

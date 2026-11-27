import { UPGRADES } from '../core/MetaProgression.js';
import {
  iconHeart,
  iconBoot,
  iconMagnet,
  iconFlame,
  iconClock,
  iconShield,
  iconDashArrows,
  iconCoin,
  iconBook,
  iconGold
} from './icons.js';

const UPGRADE_ICONS = {
  VITALITY: (s) => iconHeart(s),
  SWIFTNESS: (s) => iconBoot(s),
  MAGNETISM: (s) => iconMagnet(s),
  POWER: (s) => iconFlame(s),
  HASTE: (s) => iconClock(s),
  WARD: (s) => iconShield(s),
  DASHMASTERY: (s) => iconDashArrows(s),
  FORTUNE: (s) => iconCoin(s),
  WISDOM: (s) => iconBook(s)
};

const EFFECT_FORMATTERS = {
  VITALITY: (lvl) => `+${lvl * 25} HP`,
  SWIFTNESS: (lvl) => `+${lvl * 4}% Speed`,
  MAGNETISM: (lvl) => `+${lvl}.0u Pickup`,
  POWER: (lvl) => `+${lvl * 3}% Dmg`,
  HASTE: (lvl) => `-${lvl * 2}% CD`,
  WARD: (lvl) => `-${lvl * 2}% Taken`,
  DASHMASTERY: (lvl) => `-${lvl * 4}% Dash CD`,
  FORTUNE: (lvl) => `+${lvl * 5}% Gold`,
  WISDOM: (lvl) => `+${lvl * 4}% XP`
};

function formatEffectRange(upg, lvl) {
  const fmt = EFFECT_FORMATTERS[upg.id];
  if (!fmt) return '';
  if (lvl >= upg.maxLevel) return fmt(lvl);
  return `${fmt(lvl)} to ${fmt(lvl + 1)}`;
}

function renderPips(lvl, maxLevel, flash) {
  let html = '';
  for (let i = 1; i <= maxLevel; i++) {
    const owned = i <= lvl;
    const cls = owned ? (flash ? 'upg-pip owned flash' : 'upg-pip owned') : 'upg-pip';
    html += `<span class="${cls}"></span>`;
  }
  return html;
}

export class UpgradesView {
  constructor(container, metaProgression, onUpdate) {
    this.container = container;
    this.meta = metaProgression;
    this.onUpdate = onUpdate;
  }

  render(flashedId = null) {
    if (!this.container) return;
    this.container.innerHTML = '';

    UPGRADES.forEach((upg) => {
      const lvl = (this.meta.data.upgradeLevels && this.meta.data.upgradeLevels[upg.id]) || 0;
      const cost = this.meta.getUpgradeCost(upg.id);
      const isMax = lvl >= upg.maxLevel;
      const canAfford = !isMax && this.meta.data.gold >= cost;
      const iconFn = UPGRADE_ICONS[upg.id] || iconFlame;
      const flash = flashedId === upg.id;

      const card = document.createElement('div');
      card.className = `upgrade-card${isMax ? ' maxed' : ''}`;

      const actionHtml = isMax
        ? `<div class="upg-max-badge">MAX</div>`
        : `<button class="upg-buy-btn${canAfford ? '' : ' unaffordable'}" ${canAfford ? '' : 'disabled'}>${iconGold(14)} <span>${cost}</span></button>`;

      card.innerHTML = `
        <div class="upg-icon-box">${iconFn(22)}</div>
        <div class="upg-body">
          <div class="upg-title-row">
            <span class="upg-card-name">${upg.name}</span>
          </div>
          <div class="upg-card-desc">${upg.desc}</div>
          <div class="upg-pips" aria-label="Level ${lvl} of ${upg.maxLevel}">${renderPips(lvl, upg.maxLevel, flash)}</div>
          <div class="upg-effect">${formatEffectRange(upg, lvl)}</div>
        </div>
        <div class="upg-action">${actionHtml}</div>
      `;

      if (!isMax) {
        const btn = card.querySelector('.upg-buy-btn');
        btn.addEventListener('click', () => {
          if (this.meta.buyUpgrade(upg.id)) {
            this.onUpdate?.(upg.id);
          }
        });
      }

      this.container.appendChild(card);
    });
  }
}

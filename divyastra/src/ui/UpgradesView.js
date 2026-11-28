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

const EFFECT_SPECS = {
  VITALITY: { val: (l) => `+${l * 25}`, unit: 'HP' },
  SWIFTNESS: { val: (l) => `+${l * 4}%`, unit: 'speed' },
  MAGNETISM: { val: (l) => `+${l}.0u`, unit: 'pickup radius' },
  POWER: { val: (l) => `+${l * 3}%`, unit: 'damage' },
  HASTE: { val: (l) => `-${l * 2}%`, unit: 'cooldown' },
  WARD: { val: (l) => `-${l * 2}%`, unit: 'damage taken' },
  DASHMASTERY: { val: (l) => `-${l * 4}%`, unit: 'dash cooldown' },
  FORTUNE: { val: (l) => `+${l * 5}%`, unit: 'gold' },
  WISDOM: { val: (l) => `+${l * 4}%`, unit: 'XP' }
};

function formatEffectRange(upg, lvl) {
  const spec = EFFECT_SPECS[upg.id];
  if (!spec) return '';
  if (lvl <= 0) return `Next: ${spec.val(1)} ${spec.unit}`;
  if (lvl >= upg.maxLevel) return `Max: ${spec.val(lvl)} ${spec.unit}`;
  return `${spec.val(lvl)} \u2192 ${spec.val(lvl + 1)} ${spec.unit}`;
}

function renderPips(lvl, maxLevel) {
  return `
    <div class="gm-gems" style="--gm-lvl: ${lvl}; --gm-max: ${maxLevel};" aria-label="Level ${lvl} of ${maxLevel}">
      <img src="./ui/gems_empty.png" class="gm-gems-base" alt="" />
      <img src="./ui/gems_full.png" class="gm-gems-fill" alt="" />
    </div>
  `;
}

export class UpgradesView {
  constructor(container, metaProgression, onUpdate) {
    this.container = container;
    this.meta = metaProgression;
    this.onUpdate = onUpdate;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    UPGRADES.forEach((upg) => {
      const lvl = (this.meta.data.upgradeLevels && this.meta.data.upgradeLevels[upg.id]) || 0;
      const cost = this.meta.getUpgradeCost(upg.id);
      const isMax = lvl >= upg.maxLevel;
      const canAfford = !isMax && this.meta.data.gold >= cost;
      const iconFn = UPGRADE_ICONS[upg.id] || iconFlame;

      const card = document.createElement('div');
      card.className = `upgrade-card gm-card${isMax ? ' maxed' : ''}`;

      const actionHtml = isMax
        ? `<div class="upg-max-badge">MAX</div>`
        : `<button class="upg-buy-btn gm-btn ${canAfford ? 'gm-btn--gold' : 'gm-btn--stone unaffordable'}" ${canAfford ? '' : 'disabled'}>${iconGold(14)} <span>${cost}</span></button>`;

      card.innerHTML = `
        <div class="upg-icon-box gm-medallion">${iconFn(38)}</div>
        <div class="upg-body">
          <div class="upg-title-row">
            <span class="upg-card-name">${upg.name}</span>
          </div>
          <div class="upg-card-desc">${upg.desc}</div>
          <div class="upg-pips" aria-label="Level ${lvl} of ${upg.maxLevel}">${renderPips(lvl, upg.maxLevel)}</div>
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

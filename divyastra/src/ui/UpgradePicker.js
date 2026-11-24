import { UPGRADES } from '../config/spellSchools.js';
import { ELEMENT_COLORS, ELEMENT_NAMES } from '../config/spellRegistry.js';
import { PALETTE } from '../config/palette.js';

const UPGRADE_DESCRIPTIONS = {
  JWALA: 'Arrow explodes in a small area',
  DAHA: 'Burning spreads to nearby enemies',
  PRAVAHA: 'Wide wave pushes everyone back',
  HIMKANA: 'Slows the target by 40%',
  PARVAT: 'Bigger rock that stuns 0.5s',
  KAVACHA: 'Stone shield blocks 30 damage'
};

export class UpgradePicker {
  constructor(overlayContainer) {
    this.container = overlayContainer;
    this.timer = null;
    this.interval = null;
    this.timeLeft = 5.0;
    this.onPickCallback = null;
    this.active = false;
    this.school = null;
    this.currentUpgrades = [];

    this.initKeyboard();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Digit1' && this.currentUpgrades[0]) {
        this.choose(this.currentUpgrades[0].id);
      } else if (e.code === 'Digit2' && this.currentUpgrades[1]) {
        this.choose(this.currentUpgrades[1].id);
      }
    });
  }

  clearDelay() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  show(school, onPick) {
    this.clearDelay();
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.school = school;
    this.onPickCallback = onPick;
    this.active = true;
    this.timeLeft = 5.0;
    this.container.innerHTML = '';

    const upgradesMap = UPGRADES[school] || {};
    this.currentUpgrades = Object.values(upgradesMap);
    const colorHex = `#${(ELEMENT_COLORS[school] || PALETTE.elements.JALA).toString(16).padStart(6, '0')}`;
    const schoolName = ELEMENT_NAMES[school] || school;

    const wrapper = document.createElement('div');
    wrapper.id = 'upgrade-picker-wrapper';
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:auto;z-index:40;transform:translateY(40px);';

    const header = document.createElement('div');
    header.style.cssText = "font-family:'Yatra One',cursive,sans-serif;color:#f8fafc;font-size:14px;text-shadow:0 2px 4px #000;letter-spacing:1px;text-transform:uppercase;";
    header.innerHTML = `${schoolName} UPGRADE &bull; <span id="upgrade-timer-text" style="color:#E3B04B;">5s</span>`;
    wrapper.appendChild(header);

    const cardsRow = document.createElement('div');
    cardsRow.style.cssText = 'display:flex;gap:12px;';

    this.currentUpgrades.forEach((upg, index) => {
      const desc = UPGRADE_DESCRIPTIONS[upg.id] || '';
      const card = document.createElement('div');
      card.className = 'element-pick-card upgrade-pick-card dv-panel';
      card.style.cssText = `width:160px;min-height:96px;background:rgba(27,31,59,0.95);border:2px solid ${colorHex};border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.6);transition:transform 0.15s,box-shadow 0.15s;text-align:center;user-select:none;`;
      card.innerHTML = `
        <div style="font-size:11px;font-weight:800;color:#94a3b8;">(${index + 1}) CHOOSE</div>
        <div style="font-size:16px;font-weight:900;color:${colorHex};">${upg.name}</div>
        <div style="font-size:11px;font-weight:700;color:#cbd5e1;line-height:1.2;">${desc}</div>
      `;
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.choose(upg.id);
      });
      cardsRow.appendChild(card);
    });

    wrapper.appendChild(cardsRow);
    this.container.appendChild(wrapper);
    this.container.style.display = 'flex';

    const timerText = document.getElementById('upgrade-timer-text');
    this.interval = setInterval(() => {
      if (!this.active) {
        if (this.interval) { clearInterval(this.interval); this.interval = null; }
        return;
      }
      this.timeLeft -= 0.1;
      if (timerText) timerText.textContent = `${Math.max(0, Math.ceil(this.timeLeft))}s`;
      if (this.timeLeft <= 0) {
        if (this.interval) { clearInterval(this.interval); this.interval = null; }
        if (!this.active) return;
        const rand = this.currentUpgrades[Math.floor(Math.random() * this.currentUpgrades.length)];
        this.choose(rand ? rand.id : null);
      }
    }, 100);
  }

  choose(upgradeId) {
    if (!this.active) return;
    this.active = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.clearDelay();
    this.container.style.display = 'none';
    this.container.innerHTML = '';
    const cb = this.onPickCallback;
    this.onPickCallback = null;
    if (cb) cb(upgradeId);
  }

  hide() {
    this.active = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.clearDelay();
    this.onPickCallback = null;
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  reset() {
    this.hide();
  }
}

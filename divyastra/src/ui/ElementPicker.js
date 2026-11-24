import { ELEMENTS, ELEMENT_NAMES, ELEMENT_COLORS, resolveSpell } from '../config/spellRegistry.js';
import { PALETTE } from '../config/palette.js';
import { elementIcon } from './icons.js';
import { assetLoader } from '../core/AssetLoader.js';

export class ElementPicker {
  constructor(overlayContainer) {
    this.container = overlayContainer;
    this.timer = null;
    this.interval = null;
    this.timeLeft = 5;
    this.onPickCallback = null;
    this.active = false;
    this.pendingPicks = 0;

    this.initKeyboard();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Digit1') this.choose('E');
      else if (e.code === 'Digit2') this.choose('F');
      else if (e.code === 'Digit3') this.choose('W');
    });
  }

  clearDelay() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  show(player, onPick) {
    this.clearDelay();
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.onPickCallback = onPick;
    this.active = true;
    this.timeLeft = 5.0;
    this.container.innerHTML = '';

    const currentElems = player.spellSlot ? player.spellSlot.elements : [];
    const elements = [ELEMENTS.EARTH, ELEMENTS.FIRE, ELEMENTS.WATER];

    const pickerWrapper = document.createElement('div');
    pickerWrapper.id = 'element-picker-wrapper';
    pickerWrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:auto;z-index:40;transform:translateY(40px);';

    const header = document.createElement('div');
    header.style.cssText = "font-family:'Yatra One',cursive,sans-serif;color:#f8fafc;font-size:14px;text-shadow:0 2px 4px #000;letter-spacing:1px;text-transform:uppercase;";
    const queueNotice = this.pendingPicks > 1 ? ` &bull; <span style="color:#E3B04B;">(+${this.pendingPicks - 1} QUEUED)</span>` : '';
    header.innerHTML = `SANKALPA - CHOOSE YOUR ELEMENT${queueNotice} &bull; <span id="picker-timer-text" style="color:#E3B04B;">5s</span>`;
    pickerWrapper.appendChild(header);

    const cardsRow = document.createElement('div');
    cardsRow.style.cssText = 'display:flex;gap:12px;';

    elements.forEach((elem, index) => {
      let previewText = '';
      if (currentElems.length === 1 && currentElems[0] === elem) {
        previewText = 'Choose an upgrade next';
      } else {
        const nextSpell = resolveSpell([...currentElems, elem]);
        previewText = nextSpell ? nextSpell.name : 'Unknown';
      }
      const colorHex = `#${(ELEMENT_COLORS[elem] || PALETTE.elements.JALA).toString(16).padStart(6, '0')}`;
      const elemIconUrl = assetLoader.getSpellIconUrl(elem);
      const iconHtml = elemIconUrl
        ? `<img src="${elemIconUrl}" style="width:24px;height:24px;object-fit:contain;" alt="${ELEMENT_NAMES[elem]}" />`
        : elementIcon(elem, 24);

      const card = document.createElement('div');
      card.className = 'element-pick-card dv-panel';
      card.style.cssText = `width:130px;min-height:90px;background:rgba(27,31,59,0.95);border:2px solid ${colorHex};border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.6);transition:transform 0.15s,box-shadow 0.15s;text-align:center;user-select:none;color:${colorHex};`;
      card.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#94a3b8;">(${index + 1}) PICK</div>
        <div style="display:flex;align-items:center;justify-content:center;">${iconHtml}</div>
        <div style="font-size:14px;font-weight:700;color:${colorHex};">${ELEMENT_NAMES[elem]}</div>
        <div style="font-size:10px;font-weight:700;color:#cbd5e1;line-height:1.2;">&rarr; <b>${previewText}</b></div>
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.choose(elem);
      });
      cardsRow.appendChild(card);
    });

    pickerWrapper.appendChild(cardsRow);
    this.container.appendChild(pickerWrapper);
    this.container.style.display = 'flex';

    const timerText = document.getElementById('picker-timer-text');
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
        const randomElem = elements[Math.floor(Math.random() * elements.length)];
        this.choose(randomElem);
      }
    }, 100);
  }

  choose(element) {
    if (!this.active) return;
    this.active = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    this.clearDelay();
    this.container.style.display = 'none';
    this.container.innerHTML = '';
    const cb = this.onPickCallback;
    this.onPickCallback = null;
    if (cb) cb(element);
  }

  hide() {
    this.active = false;
    this.pendingPicks = 0;
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

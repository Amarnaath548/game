import { activeZoneSystem } from '../systems/ZoneSystem.js';
import { iconSkull, iconSpeaker } from './icons.js';

export class TopRightHUD {
  constructor(containerEl = null) {
    this.container = containerEl || document.getElementById('top-right-hud');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'top-right-hud';
      const hud = document.getElementById('hud') || document.body;
      hud.appendChild(this.container);
    }
    this.container.innerHTML = `
      <div class="top-counters">
        <div class="top-counter-pill dv-panel" id="counter-gems">
          <img src="./lobby/icon_gem.png" class="counter-currency-img" alt="Gems" />
          <span id="match-gems-count" class="counter-num">0</span>
        </div>
        <div class="top-counter-pill dv-panel" id="counter-kills">
          ${iconSkull(14)}
          <span id="match-kills-count" class="counter-num">0</span>
        </div>
      </div>
      <div class="top-subrow">
        <div class="badge badge-zone dv-panel" id="zone-badge">ZONE: <span id="zone-status">Safe</span> &bull; <span id="zone-countdown" style="color:#E3B04B;">Next shrink 0:25</span></div>
        <button id="hud-mute-btn" class="fs-btn hud-mute-btn" title="Toggle Sound">${iconSpeaker(14)}</button>
      </div>
    `;
    this.gemsEl = this.container.querySelector('#match-gems-count');
    this.killsEl = this.container.querySelector('#match-kills-count');
    this.zoneStatusEl = this.container.querySelector('#zone-status');
    this.zoneCountdownEl = this.container.querySelector('#zone-countdown');
    this.muteBtn = this.container.querySelector('#hud-mute-btn');
    this.lastGems = -1;
    this.lastKills = -1;
    this.lastSafe = null;
    this.lastCountdownText = '';
  }

  update(player, isSafe, zoneSysParam = null) {
    if (player) {
      const gems = player.gemsCollected || 0;
      if (this.lastGems !== gems) {
        if (this.gemsEl) this.gemsEl.textContent = `${gems}`;
        this.lastGems = gems;
      }
      const kills = player.kills || 0;
      if (this.lastKills !== kills) {
        if (this.killsEl) this.killsEl.textContent = `${kills}`;
        this.lastKills = kills;
      }
    }
    if (this.zoneStatusEl && this.lastSafe !== isSafe) {
      this.zoneStatusEl.textContent = isSafe ? 'Safe' : 'STORM';
      this.zoneStatusEl.style.color = isSafe ? '#E3B04B' : '#C8431E';
      this.lastSafe = isSafe;
    }

    const zSys = zoneSysParam || activeZoneSystem || (typeof window !== 'undefined' ? window.__zoneSys : null);
    if (this.zoneCountdownEl && zSys) {
      let text = '';
      if (zSys.isShrinking()) {
        text = 'Shrinking...';
      } else {
        const t = Math.max(0, Math.ceil(zSys.getTimeUntilNextShrink()));
        const m = Math.floor(t / 60);
        const s = (t % 60).toString().padStart(2, '0');
        text = `Next shrink ${m}:${s}`;
      }
      if (text !== this.lastCountdownText) {
        this.zoneCountdownEl.textContent = text;
        this.lastCountdownText = text;
      }
    }
  }

  reset() {
    this.lastGems = -1;
    this.lastKills = -1;
    this.lastSafe = null;
    this.lastCountdownText = '';
    if (this.gemsEl) this.gemsEl.textContent = '0';
    if (this.killsEl) this.killsEl.textContent = '0';
    if (this.zoneCountdownEl) this.zoneCountdownEl.textContent = 'Next shrink 0:25';
  }
}

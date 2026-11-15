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
        <div class="top-counter-pill">
          <span class="counter-icon">💎</span>
          <span id="match-gems-count" class="counter-num">0</span>
        </div>
        <div class="top-counter-pill">
          <span class="counter-icon">💀</span>
          <span id="match-kills-count" class="counter-num">0</span>
        </div>
      </div>
      <div class="top-subrow">
        <div class="badge badge-zone">ZONE: <span id="zone-status">Safe</span></div>
        <button id="hud-mute-btn" class="fs-btn hud-mute-btn" title="Toggle Sound">🔊</button>
      </div>
    `;
    this.gemsEl = this.container.querySelector('#match-gems-count');
    this.killsEl = this.container.querySelector('#match-kills-count');
    this.zoneStatusEl = this.container.querySelector('#zone-status');
    this.lastGems = -1;
    this.lastKills = -1;
    this.lastSafe = null;
  }

  update(player, isSafe) {
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
      this.zoneStatusEl.textContent = isSafe ? 'Safe' : 'DANGER';
      this.zoneStatusEl.style.color = isSafe ? '#a855f7' : '#ef4444';
      this.lastSafe = isSafe;
    }
  }

  reset() {
    this.lastGems = -1;
    this.lastKills = -1;
    this.lastSafe = null;
    if (this.gemsEl) this.gemsEl.textContent = '0';
    if (this.killsEl) this.killsEl.textContent = '0';
  }
}

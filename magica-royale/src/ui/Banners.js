export class BannerManager {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'banner-layer';
    document.body.appendChild(this.container);

    this.killHistory = {};
    this.toastTimer = null;
    this.lastZoneSafe = null;
  }

  onKill(killerName, isPlayer) {
    const now = Date.now();
    const history = this.killHistory[killerName] || { count: 0, lastTime: 0 };

    if (now - history.lastTime <= 4000) {
      history.count += 1;
    } else {
      history.count = 1;
    }
    history.lastTime = now;
    this.killHistory[killerName] = history;

    if (history.count >= 2) {
      let title = 'DOUBLE KILL!';
      if (history.count === 3) title = 'TRIPLE KILL!';
      else if (history.count === 4) title = 'QUADRA KILL!';
      else if (history.count >= 5) title = 'RAMPAGE!';

      const sub = isPlayer ? 'You are on a streak!' : `${killerName} is dominating!`;
      this.showKillBanner(title, sub, isPlayer);
    }
  }

  showKillBanner(title, subtitle, isPlayer) {
    const el = document.createElement('div');
    el.className = `kill-banner ${isPlayer ? 'player-banner' : 'bot-banner'}`;
    el.innerHTML = `
      <div class="banner-title">${title}</div>
      <div class="banner-sub">${subtitle}</div>
    `;
    this.container.appendChild(el);

    // Auto remove after 2.2s
    setTimeout(() => {
      el.classList.add('banner-fade');
      setTimeout(() => el.remove(), 400);
    }, 1800);
  }

  checkZoneStatus(isSafe) {
    if (this.lastZoneSafe === null) {
      this.lastZoneSafe = isSafe;
      return;
    }
    if (this.lastZoneSafe !== isSafe) {
      this.lastZoneSafe = isSafe;
      this.showZoneToast(isSafe);
    }
  }

  showZoneToast(isSafe) {
    const existing = document.getElementById('zone-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'zone-toast';
    toast.className = isSafe ? 'toast-safe' : 'toast-danger';
    toast.textContent = isSafe ? 'SAFE ZONE: Inside Boundary' : 'STORM WARNING: Return to Zone!';
    document.body.appendChild(toast);

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.add('toast-fade');
      setTimeout(() => toast.remove(), 400);
    }, 1800);
  }

  reset() {
    this.killHistory = {};
    this.lastZoneSafe = null;
    this.container.innerHTML = '';
  }
}


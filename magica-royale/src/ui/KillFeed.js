export class KillFeed {
  constructor(containerEl = null) {
    this.container = containerEl || document.getElementById('kill-feed');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'kill-feed';
      const hud = document.getElementById('hud') || document.body;
      hud.appendChild(this.container);
    }
    this.entries = [];
    this.maxEntries = 4;
  }

  addKill(killerName, victimName, isKillerPlayer = false, isVictimPlayer = false) {
    if (this.entries.length >= this.maxEntries) {
      const oldest = this.entries.shift();
      if (oldest.el.parentNode) {
        oldest.el.parentNode.removeChild(oldest.el);
      }
    }

    const row = document.createElement('div');
    row.className = 'kill-feed-row';

    const kSpan = document.createElement('span');
    kSpan.className = isKillerPlayer ? 'kill-feed-player' : 'kill-feed-bot';
    kSpan.textContent = killerName;

    const actionSpan = document.createElement('span');
    actionSpan.className = 'kill-feed-action';
    actionSpan.textContent = ' eliminated ';

    const vSpan = document.createElement('span');
    vSpan.className = isVictimPlayer ? 'kill-feed-player' : 'kill-feed-bot';
    vSpan.textContent = victimName;

    row.appendChild(kSpan);
    row.appendChild(actionSpan);
    row.appendChild(vSpan);

    this.container.appendChild(row);

    const entry = {
      el: row,
      timeoutId: setTimeout(() => {
        row.classList.add('fade-out');
        setTimeout(() => {
          if (row.parentNode) row.parentNode.removeChild(row.parentNode === this.container ? row : null);
          const idx = this.entries.indexOf(entry);
          if (idx !== -1) this.entries.splice(idx, 1);
        }, 400);
      }, 3600)
    };

    this.entries.push(entry);
  }

  reset() {
    for (const entry of this.entries) {
      clearTimeout(entry.timeoutId);
      if (entry.el.parentNode) {
        entry.el.parentNode.removeChild(entry.el);
      }
    }
    this.entries = [];
  }
}


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
    this.maxEntries = 3;
  }

  addKill(killerName, victimName, isKillerPlayer = false, isVictimPlayer = false) {
    if (this.entries.length >= this.maxEntries) {
      const oldest = this.entries.shift();
      if (oldest.timeoutId) clearTimeout(oldest.timeoutId);
      if (oldest.fadeTimeoutId) clearTimeout(oldest.fadeTimeoutId);
      if (oldest.el.parentNode) {
        oldest.el.parentNode.removeChild(oldest.el);
      }
    }

    const row = document.createElement('div');
    row.className = 'kill-feed-row dv-panel';

    const kSpan = document.createElement('span');
    kSpan.className = isKillerPlayer ? 'kill-feed-player' : 'kill-feed-actor';
    kSpan.textContent = (killerName || 'Unknown').toUpperCase();

    const actionSpan = document.createElement('span');
    actionSpan.className = 'kill-feed-action-red';
    actionSpan.textContent = ' KILLED ';

    const vSpan = document.createElement('span');
    vSpan.className = isVictimPlayer ? 'kill-feed-player' : 'kill-feed-actor';
    vSpan.textContent = (victimName || 'Unknown').toUpperCase();

    row.appendChild(kSpan);
    row.appendChild(actionSpan);
    row.appendChild(vSpan);

    this.container.appendChild(row);

    const entry = { el: row, timeoutId: null, fadeTimeoutId: null };
    entry.timeoutId = setTimeout(() => {
      row.classList.add('fade-out');
      entry.fadeTimeoutId = setTimeout(() => {
        if (row.parentNode) row.parentNode.removeChild(row);
        const idx = this.entries.indexOf(entry);
        if (idx !== -1) this.entries.splice(idx, 1);
      }, 400);
    }, 3600);

    this.entries.push(entry);
  }

  reset() {
    for (const entry of this.entries) {
      if (entry.timeoutId) clearTimeout(entry.timeoutId);
      if (entry.fadeTimeoutId) clearTimeout(entry.fadeTimeoutId);
      if (entry.el.parentNode) {
        entry.el.parentNode.removeChild(entry.el);
      }
    }
    this.entries = [];
    if (this.container) this.container.innerHTML = '';
  }
}

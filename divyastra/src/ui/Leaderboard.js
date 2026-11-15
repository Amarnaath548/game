export class Leaderboard {
  constructor(containerEl = null) {
    this.container = containerEl || document.getElementById('leaderboard');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'leaderboard';
      const hud = document.getElementById('hud') || document.body;
      hud.appendChild(this.container);
    }
    this.container.innerHTML = `
      <div class="leaderboard-header">
        <span class="leaderboard-title">👑 LEADERS</span>
        <span class="leaderboard-alive">👥 <span id="alive-count">12</span></span>
      </div>
      <div id="leaderboard-rows" class="leaderboard-rows"></div>
    `;
    this.rowsContainer = this.container.querySelector('#leaderboard-rows');
    this.aliveCountEl = this.container.querySelector('#alive-count');
    this.timer = 0;
    this.rowEls = [];
  }

  update(actors, player, dt = 0.5) {
    this.timer += dt;
    if (this.timer < 0.5) return;
    this.timer = 0;

    const alive = (actors || []).filter((a) => !a.isDead);
    if (this.aliveCountEl) this.aliveCountEl.textContent = alive.length;

    const sorted = [...alive].sort((a, b) => {
      const kA = a.kills || 0, kB = b.kills || 0;
      if (kB !== kA) return kB - kA;
      return (b.level || 1) - (a.level || 1);
    });

    const playerIdx = sorted.findIndex((a) => a === player || a.isPlayer);
    const top5 = sorted.slice(0, 5).map((actor, i) => ({
      actor,
      rank: i + 1,
      isPlayer: actor === player || actor.isPlayer
    }));

    if (player && playerIdx >= 5 && !player.isDead) {
      top5.push({ actor: player, rank: playerIdx + 1, isPlayer: true });
    }

    while (this.rowEls.length < top5.length) {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = `<span class="lb-name"></span><span class="lb-score"></span>`;
      this.rowsContainer.appendChild(row);
      this.rowEls.push(row);
    }

    for (let i = 0; i < this.rowEls.length; i++) {
      const row = this.rowEls[i];
      if (i < top5.length) {
        const item = top5[i];
        row.style.display = 'flex';
        row.className = `leaderboard-row ${item.isPlayer ? 'lb-player' : ''}`;
        const nameEl = row.querySelector('.lb-name');
        const scoreEl = row.querySelector('.lb-score');
        const dName = item.actor.displayName || item.actor.name || (item.isPlayer ? 'Player' : 'Bot');
        nameEl.textContent = `${item.rank}. ${dName}`;
        scoreEl.textContent = `${item.actor.kills || 0}`;
      } else {
        row.style.display = 'none';
      }
    }
  }

  reset() {
    this.timer = 0;
    if (this.rowEls) {
      this.rowEls.forEach((r) => r.style.display = 'none');
    }
  }
}

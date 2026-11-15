export class QuestView {
  constructor(container, tabBadgeEl, questManager, metaProgression, onClaim) {
    this.container = container;
    this.tabBadgeEl = tabBadgeEl;
    this.questManager = questManager;
    this.meta = metaProgression;
    this.onClaim = onClaim;
  }

  render() {
    if (this.tabBadgeEl) {
      this.tabBadgeEl.classList.toggle('visible', this.questManager.hasClaimable());
    }
    if (!this.container) return;

    this.container.innerHTML = '';
    const quests = this.questManager.getQuests();

    quests.forEach((q) => {
      const isComplete = q.progress >= q.target;
      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));

      const card = document.createElement('div');
      card.className = `quest-card ${q.claimed ? 'claimed' : isComplete ? 'claimable' : ''}`;

      const btnHtml = q.claimed
        ? `<button class="quest-btn quest-btn-claimed" disabled>CLAIMED</button>`
        : isComplete
          ? `<button class="quest-btn quest-btn-claim">CLAIM (+${q.goldReward} 🪙)</button>`
          : `<button class="quest-btn quest-btn-progress" disabled>+${q.goldReward} 🪙</button>`;

      card.innerHTML = `
        <div class="quest-info">
          <div class="quest-title">${q.text}</div>
          <div class="quest-bar-wrap">
            <div class="quest-bar-fill" style="width: ${pct}%"></div>
            <span class="quest-bar-text">${q.progress} / ${q.target}</span>
          </div>
        </div>
        ${btnHtml}
      `;

      if (isComplete && !q.claimed) {
        card.querySelector('.quest-btn-claim').addEventListener('click', () => {
          this.questManager.claim(q.id, this.meta);
          this.render();
          if (this.onClaim) this.onClaim();
        });
      }

      this.container.appendChild(card);
    });
  }
}


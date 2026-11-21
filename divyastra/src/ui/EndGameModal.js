export function showEndGameModal(ctx) {
  const {
    meta, endModal, endTitle, endSubtitle, rewardTrophy, rewardGold,
    modalPlayAgainBtn, modalLobbyBtn, campaignManager,
    isVictory, place, player, finishedQuests = [], spellbookSummary = null,
    devCheated = false, campRes = null
  } = ctx;

  const results = devCheated
    ? { trophyChange: 0, newTrophies: meta.data.trophies, goldEarned: 0, newGold: meta.data.gold }
    : meta.applyMatchResults(place);

  endModal.style.display = 'flex';
  const heroName = player?.hero?.name || 'Archmage';
  const kills = player?.kills || 0;

  if (campRes) {
    endTitle.innerHTML = campRes.completed
      ? `<span class="title-win">Level complete!</span>`
      : `<span class="title-loss">DEFEAT - #${place}</span>`;
    endSubtitle.textContent = campRes.completed
      ? (campRes.won ? `Sanctum Champion! All rivals fallen.` : `Mission complete! Achieved rank #${place}.`)
      : `${heroName} eliminated at rank #${place}. Required: top ${campRes.completeRank}.`;
  } else {
    endTitle.innerHTML = isVictory
      ? `<span class="title-win">#1 VICTORY ROYALE!</span>`
      : `<span class="title-loss">DEFEAT - #${place} of 12</span>`;
    endSubtitle.textContent = isVictory
      ? `Glory to ${heroName}! Sanctum Champion.`
      : `${heroName} eliminated at rank #${place}.`;
  }

  let statsEl = document.getElementById('match-hero-stats');
  if (!statsEl) {
    statsEl = document.createElement('div');
    statsEl.id = 'match-hero-stats';
    endModal.insertBefore(statsEl, document.querySelector('.match-rewards-box'));
  }

  const questHtml = finishedQuests?.length ? `<div class="quest-done-pill">✨ Quest completed!</div>` : '';
  const newSpellHtml = spellbookSummary?.newSpells?.length
    ? `<div class="quest-done-pill new-astra-pill" style="background:#0284c7;border-color:#38bdf8;">📖 New astra unlocked! (${spellbookSummary.newSpells.join(', ')})</div>`
    : '';
  const starHtml = spellbookSummary?.starsEarned
    ? `<div class="quest-done-pill" style="background:#ca8a04;border-color:#facc15;">⭐ Siddhi earned! (+${spellbookSummary.starsEarned})</div>`
    : '';
  const campStarsHtml = campRes
    ? `<div class="quest-done-pill" style="background:#eab308;border-color:#fde047;color:#0f172a;font-weight:900;">⭐ Level Stars: ${campRes.totalStars}/3 (${'★'.repeat(campRes.starsEarned || 0)}${'☆'.repeat(3 - (campRes.starsEarned || 0))})</div>`
    : '';
  const unlockedHtml = campRes?.unlockedNext
    ? `<div class="quest-done-pill" style="background:#16a34a;border-color:#4ade80;color:#fff;font-weight:900;">🔓 Next level unlocked!</div>`
    : '';
  const devHtml = devCheated
    ? `<div class="quest-done-pill" style="background:#ef4444;border-color:#f87171;color:#fff;font-weight:900;">DEV MATCH - no rewards</div>`
    : '';

  statsEl.innerHTML = `${devHtml}<div class="stat-pill">Hero: <b>${heroName}</b></div><div class="stat-pill">Placement: <b>#${place}</b></div><div class="stat-pill">Kills: <b>${kills} ⚔️</b></div>${campStarsHtml}${unlockedHtml}${questHtml}${newSpellHtml}${starHtml}`;

  const tSign = results.trophyChange >= 0 ? `+${results.trophyChange}` : `${results.trophyChange}`;
  rewardTrophy.textContent = `${tSign} 🏆 (${results.newTrophies})`;
  rewardGold.textContent = `+${results.goldEarned} 🪙 (${results.newGold})`;

  modalPlayAgainBtn.textContent = 'Retry';
  modalLobbyBtn.textContent = 'Menu';

  let nextBtn = document.getElementById('modal-next-level-btn');
  if (!nextBtn) {
    nextBtn = document.createElement('button');
    nextBtn.id = 'modal-next-level-btn';
    nextBtn.className = 'modal-btn';
    nextBtn.style.cssText = 'background:#16a34a;color:#fff;border:1px solid #4ade80;font-weight:800;';
    modalPlayAgainBtn.parentElement.insertBefore(nextBtn, modalPlayAgainBtn);
  }

  const canNext = campRes?.completed && campRes?.nextLevelId && (campaignManager ? campaignManager.isUnlocked(campRes.nextLevelId) : false);
  if (canNext) {
    nextBtn.style.display = 'inline-block';
    nextBtn.textContent = 'Next Level';
    nextBtn.onclick = () => {
      endModal.style.display = 'none';
      campaignManager.startLevel(campRes.nextLevelId);
    };
  } else {
    nextBtn.style.display = 'none';
  }
}

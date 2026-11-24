import { iconSparkle, iconBook, iconStar, iconUnlock, iconSwords, iconTrophy, iconGold, renderStars } from './icons.js';

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
      ? (campRes.won ? 'Sanctum Champion! All rivals fallen.' : `Mission complete! Achieved rank #${place}.`)
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
    endModal.querySelector('.end-modal-card')?.insertBefore(statsEl, document.querySelector('.match-rewards-box')) ||
      endModal.insertBefore(statsEl, document.querySelector('.match-rewards-box'));
  }

  const questHtml = finishedQuests?.length ? `<div class="quest-done-pill">${iconSparkle(12)} Quest completed!</div>` : '';
  const newSpellHtml = spellbookSummary?.newSpells?.length
    ? `<div class="quest-done-pill new-astra-pill" style="background:#1B1F3B;border-color:#E3B04B;">${iconBook(12)} New astra unlocked! (${spellbookSummary.newSpells.join(', ')})</div>`
    : '';
  const starHtml = spellbookSummary?.starsEarned
    ? `<div class="quest-done-pill" style="background:#E08A2E;border-color:#E3B04B;">${iconStar(12)} Siddhi earned! (+${spellbookSummary.starsEarned})</div>`
    : '';
  const campStarsHtml = campRes
    ? `<div class="quest-done-pill" style="background:#E3B04B;border-color:#EFE6D2;color:#15172B;font-weight:700;">Level Stars: ${campRes.totalStars}/3 (${renderStars(campRes.starsEarned || 0, 3, 13)})</div>`
    : '';
  const unlockedHtml = campRes?.unlockedNext
    ? `<div class="quest-done-pill" style="background:#7FA650;border-color:#B9AE98;color:#15172B;font-weight:700;">${iconUnlock(12)} Next level unlocked!</div>`
    : '';
  const devHtml = devCheated
    ? `<div class="quest-done-pill" style="background:#C8431E;border-color:#E08A2E;color:#fff;font-weight:700;">DEV MATCH - no rewards</div>`
    : '';

  statsEl.innerHTML = `${devHtml}<div class="stat-pill">Hero: <b>${heroName}</b></div><div class="stat-pill">Placement: <b>#${place}</b></div><div class="stat-pill">Kills: <b>${kills} ${iconSwords(13)}</b></div>${campStarsHtml}${unlockedHtml}${questHtml}${newSpellHtml}${starHtml}`;

  const tSign = results.trophyChange >= 0 ? `+${results.trophyChange}` : `${results.trophyChange}`;
  rewardTrophy.innerHTML = `${tSign} ${iconTrophy(14)} (${results.newTrophies})`;
  rewardGold.innerHTML = `+${results.goldEarned} ${iconGold(14)} (${results.newGold})`;

  modalPlayAgainBtn.textContent = 'Retry';
  modalLobbyBtn.textContent = 'Menu';

  let nextBtn = document.getElementById('modal-next-level-btn');
  if (!nextBtn) {
    nextBtn = document.createElement('button');
    nextBtn.id = 'modal-next-level-btn';
    nextBtn.className = 'modal-btn';
    nextBtn.style.cssText = 'background:#7FA650;color:#EFE6D2;border:1px solid #B9AE98;font-weight:700;';
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

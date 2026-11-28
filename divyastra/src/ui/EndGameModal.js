import { iconSparkle, iconBook, iconStar, iconUnlock, iconSwords, iconCrown } from './icons.js';
import { formatEndlessTime } from '../config/endless.js';
import { loadAndTrimHero, getHeroSrc } from './HeroImageTrim.js';

const HERO_IMG = { tapasvi: 'hero_tapasvi.webp', jala: 'hero_jala.webp', prithvi: 'hero_prithvi.webp', agni: 'hero_agni.png' };

export function showEndGameModal(ctx) {
  const {
    meta, endModal, endTitle, endSubtitle, rewardTrophy, rewardGold,
    modalPlayAgainBtn, modalLobbyBtn, campaignManager,
    isVictory, place, player, finishedQuests = [], spellbookSummary = null,
    devCheated = false, campRes = null, endlessRes = null
  } = ctx;

  const isEndless = Boolean(endlessRes);
  const results = (devCheated || isEndless)
    ? { trophyChange: 0, newTrophies: meta.data.trophies, goldEarned: 0, newGold: meta.data.gold }
    : meta.applyMatchResults(place);

  endModal.style.display = 'flex';
  const heroId = player?.hero?.id || 'tapasvi';
  const heroName = player?.hero?.name || 'Archmage';
  const heroFile = HERO_IMG[heroId] || HERO_IMG.tapasvi;
  const kills = player?.kills || 0;
  const isDefeat = isEndless ? !endlessRes.isNewBest : campRes ? !campRes.completed : !isVictory;

  if (isEndless) {
    endTitle.innerHTML = endlessRes.isNewBest
      ? `<span class="title-win">NEW HIGH SCORE!</span>`
      : `<span class="title-loss">ENDLESS RUN OVER</span>`;
    endSubtitle.textContent = `${heroName} survived ${formatEndlessTime(endlessRes.survivalTime)} (Tier ${endlessRes.tier}).`;
  } else if (campRes) {
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

  const cardEl = endModal.querySelector('.end-modal-card');
  const rewardsBox = cardEl?.querySelector('.match-rewards-box');
  let bodyRow = document.getElementById('end-body-row');
  if (!bodyRow && cardEl && rewardsBox) {
    bodyRow = document.createElement('div');
    bodyRow.id = 'end-body-row';
    bodyRow.className = 'end-body-row';
    bodyRow.innerHTML = `<div class="end-portrait-wrap"><img id="end-hero-portrait" class="end-hero-portrait" alt="" /></div><div class="end-right-col"><div id="end-camp-stars" class="end-camp-stars"></div><div id="match-hero-stats"></div></div>`;
    cardEl.insertBefore(bodyRow, rewardsBox);
  }

  const portraitEl = document.getElementById('end-hero-portrait');
  if (portraitEl) {
    portraitEl.src = getHeroSrc(heroId, heroFile);
    portraitEl.alt = heroName;
    portraitEl.classList.toggle('defeat', isDefeat);
    loadAndTrimHero(heroId, heroFile).then((url) => {
      if (portraitEl.isConnected && portraitEl.src !== url) portraitEl.src = url;
    });
  }

  const starsBox = document.getElementById('end-camp-stars');
  if (starsBox) {
    if (campRes) {
      const earned = campRes.starsEarned || 0;
      starsBox.style.display = 'flex';
      starsBox.innerHTML = [1, 2, 3].map((i) =>
        `<span class="end-star${i <= earned ? ' earned' : ''}">${iconStar(26, i <= earned)}</span>`
      ).join('');
    } else {
      starsBox.style.display = 'none';
      starsBox.innerHTML = '';
    }
  }

  const statsEl = document.getElementById('match-hero-stats');
  const questHtml = finishedQuests?.length ? `<div class="quest-done-pill pill-olive">${iconSparkle(12)} Quest completed!</div>` : '';
  const newSpellHtml = spellbookSummary?.newSpells?.length
    ? `<div class="quest-done-pill">${iconBook(12)} New astra unlocked! (${spellbookSummary.newSpells.join(', ')})</div>` : '';
  const starHtml = spellbookSummary?.starsEarned
    ? `<div class="quest-done-pill pill-saffron">${iconStar(12)} Siddhi earned! (+${spellbookSummary.starsEarned})</div>` : '';
  const unlockedHtml = campRes?.unlockedNext
    ? `<div class="quest-done-pill pill-olive">${iconUnlock(12)} Next level unlocked!</div>` : '';
  const devHtml = devCheated
    ? `<div class="quest-done-pill pill-sindoor">DEV MATCH - no rewards</div>` : '';
  const endlessPill = isEndless && endlessRes.isNewBest
    ? `<div class="quest-done-pill pill-gold">${iconCrown(12)} Personal Best!</div>` : '';

  if (statsEl) {
    if (isEndless) {
      statsEl.innerHTML = `${devHtml}${endlessPill}<div class="stat-pill">Score: <b>${endlessRes.score.toLocaleString()}</b></div><div class="stat-pill">Time: <b>${formatEndlessTime(endlessRes.survivalTime)}</b></div><div class="stat-pill">${iconSwords(13)} <b>${kills}</b></div><div class="stat-pill">Tier: <b>${endlessRes.tier}</b></div>${newSpellHtml}${starHtml}`;
    } else {
      statsEl.innerHTML = `${devHtml}<div class="stat-pill">${iconCrown(13)} <b>#${place}</b></div><div class="stat-pill">${iconSwords(13)} <b>${kills}</b></div>${unlockedHtml}${questHtml}${newSpellHtml}${starHtml}`;
    }
  }

  if (isEndless) {
    rewardTrophy.innerHTML = `<img src="./lobby/icon_gem.png" class="counter-currency-img" alt="Score" /> Score Mode`;
    rewardGold.innerHTML = `<img src="./lobby/icon_trophy.png" class="counter-currency-img" alt="Best" /> ${endlessRes.bestScore.toLocaleString()} pts`;
  } else {
    const tSign = results.trophyChange >= 0 ? `+${results.trophyChange}` : `${results.trophyChange}`;
    rewardTrophy.innerHTML = `<img src="./lobby/icon_trophy.png" class="counter-currency-img" alt="Trophies" /> ${tSign} (${results.newTrophies})`;
    rewardGold.innerHTML = `<img src="./lobby/icon_gold.png" class="counter-currency-img" alt="Gold" /> +${results.goldEarned} (${results.newGold})`;
  }

  modalPlayAgainBtn.textContent = 'Retry';
  modalLobbyBtn.textContent = 'Menu';

  let nextBtn = document.getElementById('modal-next-level-btn');
  if (!nextBtn) {
    nextBtn = document.createElement('button');
    nextBtn.id = 'modal-next-level-btn';
    nextBtn.className = 'modal-btn';
    modalPlayAgainBtn.parentElement.insertBefore(nextBtn, modalPlayAgainBtn);
  }

  const canNext = !isEndless && campRes?.completed && campRes?.nextLevelId && (campaignManager ? campaignManager.isUnlocked(campRes.nextLevelId) : false);
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

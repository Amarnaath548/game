import { LEVELS } from '../config/levels.js';
import { DIFFICULTIES } from '../config/difficulty.js';
import { BIOMES } from '../config/constants.js';
import { iconLock, iconMap, iconSwords, renderStars } from './icons.js';

export class LevelSelectView {
  constructor(campaignManager, callbacks = {}) {
    this.campaignManager = campaignManager;
    this.callbacks = callbacks;
    this.overlay = null;
    this._initDOM();
  }

  _initDOM() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'level-select-overlay';
    this.overlay.style.cssText = `
      display: none; position: fixed; inset: 0; z-index: 500;
      background: radial-gradient(circle at center, rgba(15, 23, 42, 0.94) 0%, rgba(5, 7, 15, 0.98) 100%);
      backdrop-filter: blur(10px); flex-direction: column; align-items: center; justify-content: center;
      padding: 16px 24px; box-sizing: border-box; overflow-y: auto; user-select: none;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; width:100%; max-width:980px; margin-bottom:14px;';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← BACK';
    backBtn.style.cssText = `
      background: #334155; color: #f8fafc; border: 1px solid #475569;
      padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 12px;
      cursor: pointer; letter-spacing: 0.5px; transition: background 0.15s;
    `;
    backBtn.onmouseenter = () => { backBtn.style.background = '#475569'; };
    backBtn.onmouseleave = () => { backBtn.style.background = '#334155'; };
    backBtn.onclick = () => {
      this.hide();
      this.callbacks.onBack?.();
    };

    const titleBox = document.createElement('div');
    titleBox.style.cssText = 'text-align: center;';
    titleBox.innerHTML = `
      <div style="font-family:'Yatra One',cursive,sans-serif; font-size:22px; color:#E3B04B; letter-spacing:1.5px; text-shadow:0 0 16px rgba(227,176,75,0.5);">CAMPAIGN MISSIONS</div>
      <div style="font-size:11px; font-weight:700; color:#94a3b8; letter-spacing:0.5px;">Select a trial to prove your mastery</div>
    `;

    const dummyRight = document.createElement('div');
    dummyRight.style.width = '70px';

    header.appendChild(backBtn);
    header.appendChild(titleBox);
    header.appendChild(dummyRight);
    this.overlay.appendChild(header);

    this.cardsContainer = document.createElement('div');
    this.cardsContainer.className = 'level-cards-row';
    this.cardsContainer.style.cssText = `
      display: flex; flex-direction: row; gap: 14px; align-items: stretch;
      width: 100%; max-width: 980px; flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden;
      scroll-snap-type: x proximity; padding: 6px 4px 10px; box-sizing: border-box;
      -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: #c8963e transparent;
    `;
    this.overlay.appendChild(this.cardsContainer);

    document.body.appendChild(this.overlay);
  }

  show() {
    this.render();
    this.overlay.style.display = 'flex';
  }

  hide() {
    this.overlay.style.display = 'none';
  }

  render() {
    this.cardsContainer.innerHTML = '';

    LEVELS.forEach((level) => {
      const unlocked = this.campaignManager.isUnlocked(level.id);
      const stars = this.campaignManager.getStars(level.id);
      const diff = DIFFICULTIES[level.difficulty] || DIFFICULTIES.NORMAL;
      const mapName = (BIOMES[level.biome] || BIOMES.GRASS).name;

      const card = document.createElement('div');
      card.className = `level-card dv-panel ${unlocked ? 'unlocked' : 'locked'}`;
      card.style.cssText = `
        flex: 0 0 200px; min-width: 200px; scroll-snap-align: start;
        background: ${unlocked ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)' : 'rgba(15, 23, 42, 0.75)'};
        border: 2px solid ${unlocked ? '#38bdf8' : '#334155'};
        border-radius: 12px; padding: 14px 12px; display: flex; flex-direction: column;
        justify-content: space-between; align-items: center; text-align: center;
        box-shadow: ${unlocked ? '0 8px 24px rgba(0,0,0,0.6)' : 'none'};
        opacity: ${unlocked ? '1' : '0.55'};
        cursor: ${unlocked ? 'pointer' : 'not-allowed'};
        transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        position: relative;
      `;

      if (unlocked) {
        card.onmouseenter = () => {
          card.style.transform = 'translateY(-4px) scale(1.02)';
          card.style.borderColor = '#facc15';
          card.style.boxShadow = '0 12px 30px rgba(227, 176, 75, 0.35)';
        };
        card.onmouseleave = () => {
          card.style.transform = 'none';
          card.style.borderColor = '#E3B04B';
          card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
        };
        card.onclick = () => {
          this.hide();
          this.campaignManager.startLevel(level.id);
          this.callbacks.onLevelSelected?.(level);
        };
      }

      card.innerHTML = `
        <div style="width:100%;">
          ${!unlocked ? `<div style="margin-bottom:4px;color:#cbd5e1;">${iconLock(20)}</div>` : ''}
          <div style="font-size:10px; font-weight:700; color:#E3B04B; text-transform:uppercase; letter-spacing:1px;">Level ${level.id}</div>
          <div style="font-family:'Yatra One',cursive,sans-serif; font-size:16px; color:#fff; margin:2px 0 6px 0;">${level.name}</div>
          <div style="display:inline-block; background:${diff.badgeColor}; color:#000; font-weight:700; font-size:10px; padding:2px 8px; border-radius:999px; margin-bottom:8px; text-transform:uppercase;">${diff.name}</div>
          <div style="font-size:11px; font-weight:700; color:#cbd5e1; margin-bottom:3px; display:flex; align-items:center; justify-content:center; gap:4px;">${iconMap(13)} ${mapName}</div>
          <div style="font-size:11px; font-weight:700; color:#94a3b8; margin-bottom:6px; display:flex; align-items:center; justify-content:center; gap:4px;">${iconSwords(13)} ${level.botCount} Bots</div>
          <div style="font-size:10px; color:#64748b; line-height:1.2; margin-bottom:8px;">${level.description}</div>
        </div>
        <div style="width:100%; border-top:1px solid rgba(255,255,255,0.08); padding-top:8px;">
          <div style="margin-bottom:4px; color:#E3B04B; display:flex; justify-content:center; gap:2px;">${renderStars(stars, 3, 15)}</div>
          <div style="font-size:9px; font-weight:700; color:#E08A2E; text-transform:uppercase;">Goal: Top ${level.completeRank}</div>
        </div>
      `;

      this.cardsContainer.appendChild(card);
    });
  }
}

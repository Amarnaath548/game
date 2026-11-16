const STORAGE_KEY = 'magica_tutorial_matches';

function getMatchCount() {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10); } catch { return 0; }
}

function incMatchCount() {
  try { localStorage.setItem(STORAGE_KEY, String(getMatchCount() + 1)); } catch {}
}

// Strict hint order — a hint must not show until all prior hints have been shown & dismissed.
const HINT_ORDER = ['move', 'cast', 'tapas', 'levelUp', 'dash'];

export class TutorialHints {
  constructor() {
    this.active = false;
    this.skipped = false;
    this.currentHint = null;
    this.timer = null;
    this.dashHintTimer = null;
    this.hasDashed = false;
    this.onDismiss = null;
    this.shown = {};
    this.queue = []; // pending {id, text, onDismiss} entries

    this.container = document.createElement('div');
    this.container.id = 'tutorial-hint-banner';
    this.container.style.cssText = 'position:absolute;top:calc(82px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);display:none;align-items:center;gap:10px;background:rgba(15,23,42,0.92);border:1px solid #38bdf8;border-radius:20px;padding:6px 14px;box-shadow:0 4px 14px rgba(0,0,0,0.6);z-index:35;pointer-events:auto;max-width:92vw;';

    this.textEl = document.createElement('span');
    this.textEl.style.cssText = 'font-size:12px;font-weight:700;color:#f8fafc;white-space:nowrap;';

    this.skipBtn = document.createElement('button');
    this.skipBtn.textContent = 'Skip tips';
    this.skipBtn.style.cssText = 'background:none;border:none;color:#94a3b8;font-size:11px;font-weight:700;cursor:pointer;text-decoration:underline;padding:2px 4px;white-space:nowrap;';
    this.skipBtn.addEventListener('click', (e) => { e.stopPropagation(); this.skipAll(); });

    this.container.appendChild(this.textEl);
    this.container.appendChild(this.skipBtn);
    (document.getElementById('hud') || document.body).appendChild(this.container);
  }

  _isBusy() {
    return this.currentHint === 'move' || this.currentHint === 'cast';
  }

  /** Try to show next queued hint (only when not busy with move/cast). */
  _drainQueue() {
    if (!this.active || this.skipped || this._isBusy() || this.queue.length === 0) return;
    if (this.currentHint) return; // another hint still visible
    const next = this.queue.shift();
    this._showNow(next.id, next.text, next.onDismiss);
  }

  onMatchStart() {
    this.reset();
    if (getMatchCount() >= 2) return;
    incMatchCount();
    this.active = true;
    this.hasDashed = false;
    this._showNow('move', 'Drag the left stick to move', () => {
      this._showNow('cast', 'Drag the right side to aim and release to cast your Mushti');
      if (this.dashHintTimer) clearTimeout(this.dashHintTimer);
      this.dashHintTimer = setTimeout(() => {
        this.dashHintTimer = null;
        if (!this.hasDashed && !this.shown.dash && this.active && !this.skipped) {
          this._enqueue('dash', 'Tap Dash to dodge');
        }
      }, 15000);
    });
  }

  /** Internal: show immediately, no queue check. */
  _showNow(id, text, onDismiss = null) {
    if (!this.active || this.skipped || this.shown[id]) return;
    if (this.timer) clearTimeout(this.timer);
    this.shown[id] = true;
    this.currentHint = id;
    this.onDismiss = onDismiss;
    this.textEl.textContent = text;
    this.container.style.display = 'flex';
    this.timer = setTimeout(() => this.dismiss(id), 6000);
  }

  /** Queue a hint; it waits until move/cast are done. */
  _enqueue(id, text, onDismiss = null) {
    if (!this.active || this.skipped || this.shown[id]) return;
    // Don't double-queue
    if (this.queue.some((q) => q.id === id)) return;
    this.queue.push({ id, text, onDismiss });
    this._drainQueue();
  }

  dismiss(id) {
    if (this.currentHint !== id) return;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.currentHint = null;
    this.container.style.display = 'none';
    const cb = this.onDismiss;
    this.onDismiss = null;
    if (cb) cb();
    this._drainQueue();
  }

  onMove() {
    if (this.currentHint === 'move') this.dismiss('move');
  }

  onCast() {
    if (this.currentHint === 'cast' || this.currentHint === 'tapas') this.dismiss(this.currentHint);
  }

  onTapasReady() {
    if (!this.active || this.skipped || this.shown.tapas) return;
    this._enqueue('tapas', 'Stand still to charge Tapas: your next cast hits harder');
  }

  onLevelUp() {
    if (!this.active || this.skipped || this.shown.levelUp) return;
    this._enqueue('levelUp', 'Pick an element. Combine them to unlock new spells');
  }

  onElementPicked() {
    if (this.currentHint === 'levelUp') this.dismiss('levelUp');
  }

  onDash() {
    this.hasDashed = true;
    if (this.dashHintTimer) { clearTimeout(this.dashHintTimer); this.dashHintTimer = null; }
    if (this.currentHint === 'dash') this.dismiss('dash');
  }

  skipAll() {
    this.skipped = true;
    this.reset();
    try { localStorage.setItem(STORAGE_KEY, '2'); } catch {}
  }

  reset() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.dashHintTimer) { clearTimeout(this.dashHintTimer); this.dashHintTimer = null; }
    this.currentHint = null;
    this.onDismiss = null;
    this.queue.length = 0;
    this.container.style.display = 'none';
  }

  onMatchEnd() {
    this.active = false;
    this.reset();
  }
}

/**
 * Dev mode runtime — enabled by ?dev=1, remembered in localStorage.
 * Tracks cheatsUsed flag to block meta rewards.
 */
export class DevTools {
  constructor() {
    this.enabled = false;
    this.cheatsUsed = false;
    this.godMode = false;
    this.noCooldown = false;
    this.freezeBots = false;
    this.pauseZone = false;
    this.timeScale = 1.0;
    this.showActorCircles = false;
    this._init();
  }

  _init() {
    const params = new URLSearchParams(window.location.search);
    const devParam = params.get('dev');
    try {
      if (devParam === '1') { localStorage.setItem('divyastra_dev', '1'); this.enabled = true; }
      else if (devParam === '0') { localStorage.removeItem('divyastra_dev'); this.enabled = false; }
      else { this.enabled = localStorage.getItem('divyastra_dev') === '1'; }
    } catch { this.enabled = devParam === '1'; }
  }

  markCheat() { this.cheatsUsed = true; }

  resetMatch() { this.cheatsUsed = false; }

  scaleDt(dt) { return dt * this.timeScale; }

  /** God mode: intercept player damage */
  onPlayerDamage(amount) {
    if (this.godMode) { this.markCheat(); return 0; }
    return amount;
  }

  /** No-cooldown: reset spell cooldown after cast */
  onPlayerCast(player) {
    if (this.noCooldown && player.spellSlot) {
      this.markCheat();
      player.spellSlot.cooldownTimer = 0;
      player.shootCooldown = 0;
    }
  }
}

let _instance = null;

export function getDevTools() {
  if (!_instance) _instance = new DevTools();
  return _instance;
}

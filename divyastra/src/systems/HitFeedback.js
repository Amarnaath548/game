export class HitFeedback {
  constructor(deps = {}) {
    this.sceneManager = deps.sceneManager;
    this.player = deps.player;
    this.hitStopTimer = 0;
    this.lastHitStopTime = -999;
  }

  static isShakeEnabled() {
    try {
      const val = localStorage.getItem('divyastra_screen_shake');
      return val === null || val === 'true' || val === '1';
    } catch {
      return true;
    }
  }

  triggerHitStop(isKill = false) {
    const now = performance.now();
    if (now - this.lastHitStopTime < 150) return;
    this.lastHitStopTime = now;
    this.hitStopTimer = isKill ? 0.060 : 0.050; // 60ms on kill, 50ms on 25+ hit
  }

  isHitStopped() {
    return this.hitStopTimer > 0;
  }

  update(dt) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      return true;
    }
    return false;
  }

  apply(target, damage, owner, dirX = null, dirZ = null, cfg = null) {
    if (!target) return;

    const isTargetPlayer = target === this.player || !!target?.isPlayer;
    const isOwnerPlayer = owner === this.player || !!owner?.isPlayer;

    // Mobile safety: Skip visual effects for bots farther than 30 units
    let isWithinRange = true;
    if (!isTargetPlayer && !isOwnerPlayer && this.player) {
      const dx = target.x - this.player.x;
      const dz = target.z - this.player.z;
      if (dx * dx + dz * dz > 900) isWithinRange = false;
    }

    // 1. Material Flash
    if (isWithinRange && !target.isDead) {
      target.hitTimer = 0.08;
      target.setHeroEmissive?.(0xffffff);
      target.triggerHitAnim?.(dirX ?? 0, dirZ ?? 0);
    }

    // 2. Hit-Stop: on any hit the player lands that does 25+ damage (or any kill)
    if (isOwnerPlayer && !isTargetPlayer) {
      if (target.isDead || target.hp <= 0) {
        this.triggerHitStop(true);
      } else if (damage >= 25) {
        this.triggerHitStop(false);
      }
    }

    // 3. Camera Shake: tied to spell tier using existing trauma system
    if (HitFeedback.isShakeEnabled() && this.sceneManager) {
      const playerHurt = isTargetPlayer && damage > 0;
      const playerLandedHit = isOwnerPlayer && damage > 0;
      if (playerHurt || playerLandedHit) {
        const tier = cfg?.tier || 1;
        let trauma = 0.12; // Tier 1: tiny
        if (tier === 2) trauma = 0.28; // Tier 2: small
        else if (tier >= 3) trauma = 0.65; // Tier 3 Astra: strong

        if (playerHurt) trauma = Math.max(trauma, 0.24);
        this.sceneManager.addTrauma?.(trauma);
      }
    }
  }
}

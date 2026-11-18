import { CAMERA_CONFIG } from '../config/constants.js';

export class HitFeedback {
  constructor(deps = {}) {
    this.sceneManager = deps.sceneManager;
    this.player = deps.player;
  }

  static isShakeEnabled() {
    try {
      const val = localStorage.getItem('divyastra_screen_shake');
      return val === null || val === 'true' || val === '1';
    } catch (e) {
      return true;
    }
  }

  apply(target, damage, owner, dirX = null, dirZ = null) {
    if (!target) return;

    const isTargetPlayer = target === this.player || !!target?.isPlayer;
    const isOwnerPlayer = owner === this.player || !!owner?.isPlayer;

    // Mobile safety: Skip visual effects (flash & shake) for bots farther than 30 units from player
    let isWithinRange = true;
    if (!isTargetPlayer && !isOwnerPlayer && this.player) {
      const dx = target.x - this.player.x;
      const dz = target.z - this.player.z;
      if (dx * dx + dz * dz > 900) {
        isWithinRange = false;
      }
    }

    // 1. Material Flash (only touch actor-owned materials, 0.08s duration)
    if (isWithinRange && !target.isDead) {
      target.hitTimer = 0.08;
      target.setHeroEmissive?.(0xffffff);
    }

    // 2. Camera Shake: only when PLAYER takes damage, or lands a hit above threshold
    if (HitFeedback.isShakeEnabled() && this.sceneManager) {
      const shakeThresh = CAMERA_CONFIG.SHAKE_DMG_THRESHOLD || 25;
      const playerHurt = isTargetPlayer && damage > 0;
      const playerHeavyHit = isOwnerPlayer && damage >= shakeThresh;
      if (playerHurt || playerHeavyHit) {
        const amp = CAMERA_CONFIG.SHAKE_AMPLITUDE || 0.12;
        const dur = CAMERA_CONFIG.SHAKE_DURATION || 0.15;
        this.sceneManager.triggerHitShake?.(amp, dur);
      }
    }
  }
}

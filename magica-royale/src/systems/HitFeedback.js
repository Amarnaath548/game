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
      if (target.bodyMat?.emissive) target.bodyMat.emissive.setHex(0xffffff);
      if (target.accentMat?.emissive) target.accentMat.emissive.setHex(0xffffff);
    }

    // 2. Knockback: tiny push 0.15-0.3 units decaying over 0.12s. Skip if dashing.
    if (!target.isDead && (!target.dashTimer || target.dashTimer <= 0) && !target.isInvulnerable) {
      const kx = dirX !== null ? dirX : (target.x - (owner?.x ?? target.x));
      const kz = dirZ !== null ? dirZ : (target.z - (owner?.z ?? target.z));
      const len = Math.hypot(kx, kz) || 1;
      const pushDist = 0.22;
      target.kbDuration = 0.12;
      target.kbTimer = 0.12;
      target.kbVx = (kx / len) * (pushDist / 0.12) * 2;
      target.kbVz = (kz / len) * (pushDist / 0.12) * 2;
    }

    // 3. Camera Shake: only when PLAYER takes damage, or lands a hit above threshold
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

import * as THREE from 'three';
import { HERO_VISUAL_SCALE, PLAYER_BASE } from '../config/constants.js';
import { HERO_FACING_OFFSET } from '../config/assets.js';
import { GEO_CACHE, MAT_OUTLINE_PLAYER, MAT_OUTLINE_ENEMY, MAT_SHIELD } from './HeroMaterials.js';
import { cloneActorMaterials } from './GlbHero.js';

const CROSSFADE_DUR = 0.12;
const DIST_CULL_SQ = 60 * 60;
const DIST_THROTTLE_SQ = 35 * 35;

export function hasSkinnedMesh(root) {
  let found = false;
  root.traverse((c) => { if (c.isSkinnedMesh) found = true; });
  return found;
}

function findClip(animations, name) {
  const target = name.toLowerCase();
  return animations.find((c) => c.name.toLowerCase() === target)
    || animations.find((c) => c.name.toLowerCase().includes(target)) || null;
}

/**
 * Rigged GLB hero animation controller backed by one AnimationMixer per actor.
 */
export class GlbRiggedHero {
  constructor(wrapper, modelRoot, animations, actor) {
    this.isRigged = true;
    this.wrapper = wrapper;
    this.modelRoot = modelRoot;
    this.actor = actor;
    this.mixer = new THREE.AnimationMixer(modelRoot);
    this.actions = {};
    for (const name of ['idle', 'run', 'attack', 'hit', 'death']) {
      const clip = findClip(animations, name);
      const act = clip ? this.mixer.clipAction(clip) : null;
      if (act && (name === 'attack' || name === 'hit' || name === 'death')) {
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = name !== 'hit';
      }
      this.actions[name] = act;
    }

    this.currentState = 'idle';
    this.activeAction = this.actions.idle || null;
    if (this.activeAction) this.activeAction.reset().setEffectiveWeight(1).play();

    this.isCasting = false;
    this.castTier3 = false;
    this.castElapsed = 0;
    this.strikeFired = false;
    this.deathStarted = false;
    this._lastMoving = false;
    this._skipFrame = false;

    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.actions.attack && this.isCasting) {
        this.isCasting = false;
        this.castTier3 = false;
        this.strikeFired = false;
        if (!this.actor.isDead) this._crossfadeTo(this._lastMoving ? 'run' : 'idle');
      }
    });
  }

  _crossfadeTo(stateName) {
    const next = this.actions[stateName] || this.actions.idle;
    if (!next || (this.activeAction === next && next.isRunning())) return;
    next.reset();
    next.enabled = true;
    next.paused = false;
    next.setEffectiveWeight(1);
    if (stateName !== 'run') next.setEffectiveTimeScale(1);
    next.play();
    if (this.activeAction && this.activeAction !== next) {
      this.activeAction.crossFadeTo(next, CROSSFADE_DUR, false);
    }
    this.activeAction = next;
    this.currentState = stateName;
  }

  _getSteppedDt(dt) {
    if (!this.actor.visible || !this.actor.group.visible) return 0;
    const camTarget = this.actor.scene?.userData?.cameraTarget;
    if (!camTarget) return dt;
    const dx = this.actor.x - camTarget.x, dz = this.actor.z - camTarget.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > DIST_CULL_SQ) return 0;
    if (distSq > DIST_THROTTLE_SQ) {
      this._skipFrame = !this._skipFrame;
      return this._skipFrame ? 0 : dt * 2;
    }
    return dt;
  }

  reset() {
    this.isCasting = this.castTier3 = this.strikeFired = this.deathStarted = this._lastMoving = this._skipFrame = false;
    this.castElapsed = 0;
    this.mixer.stopAllAction();
    this.currentState = 'idle';
    this.activeAction = this.actions.idle || null;
    if (this.activeAction) this.activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    this.wrapper.position.set(0, 0, 0);
    this.wrapper.rotation.set(0, 0, 0);
    this.wrapper.scale.set(1, 1, 1);
  }

  _startAttackClip(isTier3, fromWindup) {
    if (!this.actions.attack) return;
    this.isCasting = true;
    this.castTier3 = fromWindup && isTier3;
    this.castElapsed = 0;
    this.strikeFired = !fromWindup;
    this._crossfadeTo('attack');
  }

  startWindup(isTier3 = false) { this._startAttackClip(isTier3, true); }
  triggerAttack(isTier3 = false) { this._startAttackClip(isTier3, false); }

  triggerSnap() {
    this.strikeFired = true;
    const atk = this.actions.attack;
    if (atk) { atk.paused = false; if (atk.time < 0.25) atk.time = 0.25; }
  }

  cancelCast() {
    if (!this.isCasting) return;
    this.isCasting = this.castTier3 = this.strikeFired = false;
    this.castElapsed = 0;
    if (this.actions.attack) this.actions.attack.paused = false;
    if (!this.actor.isDead) this._crossfadeTo(this._lastMoving ? 'run' : 'idle');
  }

  triggerHit() {
    this.actor.hitTimer = Math.max(this.actor.hitTimer || 0, 0.15);
    this.actor.setHeroEmissive?.(0xffffff);
    const hit = this.actions.hit;
    if (!hit || this.actor.isDead) return;
    hit.reset();
    hit.enabled = true; hit.paused = false;
    hit.setEffectiveTimeScale(1); hit.setEffectiveWeight(0.6);
    hit.play();
  }

  triggerDeath() {
    if (this.deathStarted) return;
    this.deathStarted = true;
    this.isCasting = false;
    this.castTier3 = false;
    if (this.actions.hit) this.actions.hit.stop();
    this._crossfadeTo('death');
  }

  updateDeath(dt) {
    if (!this.deathStarted) this.triggerDeath();
    const stepDt = this._getSteppedDt(dt);
    if (stepDt > 0) this.mixer.update(stepDt);
  }

  update(dt, isMoving = false, _moveX = 0, _moveZ = 0, isDashing = false) {
    if (this.actor.isDead) { this.updateDeath(dt); return; }
    const stepDt = this._getSteppedDt(dt);
    if (stepDt <= 0) return;

    const moving = (isMoving && (this.actor.speed || 0) > 0.01) || isDashing;
    this._lastMoving = moving;

    if (!this.isCasting) {
      const nextState = moving ? 'run' : 'idle';
      if (nextState === 'run' && this.actions.run) {
        const base = this.actor.baseSpeed || PLAYER_BASE.MOVE_SPEED;
        const ratio = (this.actor.speed || base) / base;
        this.actions.run.setEffectiveTimeScale(isDashing ? 1.6 : (ratio < 0.6 ? 0.6 : ratio > 1.6 ? 1.6 : ratio));
      }
      if (this.currentState !== nextState) this._crossfadeTo(nextState);
    }

    const atk = this.actions.attack;
    if (this.isCasting && this.castTier3 && !this.strikeFired && atk) {
      const wasPaused = atk.paused;
      this.castElapsed += stepDt;
      this.mixer.update(stepDt);
      if (this.castElapsed >= 0.15 && this.castElapsed < 0.55) {
        atk.paused = true;
        atk.time = 0.15;
      } else if (this.castElapsed >= 0.55 && wasPaused) {
        atk.paused = false;
        atk.time = 0.15 + (this.castElapsed - 0.55);
      }
      return;
    }

    this.mixer.update(stepDt);
  }
}

export function buildGlbRiggedHero(actor, hero, rawModel, animations) {
  rawModel.updateMatrixWorld(true);
  rawModel.traverse((c) => { if (c.isSkinnedMesh && c.skeleton) c.skeleton.update(); });
  const { mats, meshes } = cloneActorMaterials(rawModel);
  const box = new THREE.Box3().expandByObject(rawModel, true);
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);

  const outlineMat = actor.isBot ? MAT_OUTLINE_ENEMY : MAT_OUTLINE_PLAYER;
  actor.outlineMeshes = [];
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    const outline = mesh.isSkinnedMesh
      ? new THREE.SkinnedMesh(mesh.geometry, outlineMat)
      : new THREE.Mesh(mesh.geometry, outlineMat);
    if (mesh.isSkinnedMesh) outline.bind(mesh.skeleton, mesh.bindMatrix);
    outline.scale.setScalar(1.04); outline.renderOrder = -1;
    outline.castShadow = false; outline.receiveShadow = false;
    outline.frustumCulled = mesh.frustumCulled;
    mesh.add(outline);
    actor.outlineMeshes.push(outline);
  }
  actor.outlineMesh = actor.outlineMeshes[0] || null;

  const normScale = size.y > 0.0001 ? (2.4 / HERO_VISUAL_SCALE) / size.y : 1;
  const normGroup = new THREE.Group();
  normGroup.scale.setScalar(normScale);
  normGroup.position.set(-center.x * normScale, -box.min.y * normScale, -center.z * normScale);
  normGroup.add(rawModel);

  const facingGroup = new THREE.Group();
  facingGroup.rotation.y = HERO_FACING_OFFSET[hero.id] ?? 0;
  facingGroup.add(normGroup);

  const animWrapper = new THREE.Group();
  animWrapper.add(facingGroup);
  actor.visualMesh.add(animWrapper);

  actor.shieldMesh = new THREE.Mesh(GEO_CACHE.shield, MAT_SHIELD);
  actor.shieldMesh.position.y = 1.0; actor.shieldMesh.visible = false;
  actor.visualMesh.add(actor.shieldMesh);

  actor.heroMats = mats; actor.visualMats = mats;
  actor.glbHero = new GlbRiggedHero(animWrapper, rawModel, animations, actor);
}

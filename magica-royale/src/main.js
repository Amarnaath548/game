import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { InputManager } from './core/InputManager.js';
import { ObjectPool } from './core/ObjectPool.js';
import { Projectile } from './entities/Projectile.js';
import { Chest, XPGem } from './entities/Prop.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { COLORS, ARENA, PLAYER_BASE, SPELLS } from './config/constants.js';

const sceneManager = new SceneManager();
const input = new InputManager(sceneManager.camera);

// Player Visual Group
const playerGroup = new THREE.Group();
sceneManager.scene.add(playerGroup);

const visualMesh = new THREE.Group();
playerGroup.add(visualMesh);

// Robe
const robeGeo = new THREE.ConeGeometry(0.95, 2.2, 12);
const robeMat = new THREE.MeshLambertMaterial({ color: COLORS.PLAYER_ROBE });
const robe = new THREE.Mesh(robeGeo, robeMat);
robe.position.y = 1.1;
robe.castShadow = true;
visualMesh.add(robe);

// Hat
const hatBrimGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.12, 12);
const hatMat = new THREE.MeshLambertMaterial({ color: COLORS.PLAYER_HAT });
const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
hatBrim.position.y = 2.15;
visualMesh.add(hatBrim);

const hatTopGeo = new THREE.ConeGeometry(0.65, 1.3, 10);
const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
hatTop.position.y = 2.8;
visualMesh.add(hatTop);

// Staff Orb
const staffOrbGeo = new THREE.SphereGeometry(0.28, 8, 8);
const staffOrbMat = new THREE.MeshBasicMaterial({ color: COLORS.AIM_LASER });
const staffOrb = new THREE.Mesh(staffOrbGeo, staffOrbMat);
staffOrb.position.set(0.65, 1.4, 0.75);
visualMesh.add(staffOrb);

// Ground Aim Indicator
const aimLineGeo = new THREE.PlaneGeometry(0.35, 9);
aimLineGeo.translate(0, 4.5, 0);
aimLineGeo.rotateX(-Math.PI / 2);
const aimLineMat = new THREE.MeshBasicMaterial({
  color: COLORS.AIM_LASER,
  transparent: true,
  opacity: 0.45,
  side: THREE.DoubleSide
});
const aimLine = new THREE.Mesh(aimLineGeo, aimLineMat);
aimLine.position.y = 0.06;
playerGroup.add(aimLine);

// ---------------- POOLS ----------------
// Projectile Mesh Pool
const projPool = new ObjectPool(() => {
  const geo = new THREE.SphereGeometry(0.5, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: SPELLS.PYRO.color });
  const mesh = new THREE.Mesh(geo, mat);
  sceneManager.scene.add(mesh);
  return mesh;
}, 25);

// Wrap pool meshes into Projectile entity wrappers
const projectiles = projPool.pool.map((mesh) => new Projectile(mesh, projPool));

// XP Gem Mesh Pool
const gemPool = new ObjectPool(() => {
  const geo = new THREE.OctahedronGeometry(0.35);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
  const mesh = new THREE.Mesh(geo, mat);
  sceneManager.scene.add(mesh);
  return mesh;
}, 40);

const gems = gemPool.pool.map((mesh) => new XPGem(mesh, gemPool));

// ---------------- SPAWN CHESTS ----------------
const chests = [];
const chestPositions = [
  [-12, -8], [12, -8], [-12, 8], [12, 8],
  [-25, -20], [25, -20], [-25, 20], [25, 20],
  [0, 22], [0, -22], [-22, 0], [22, 0]
];

chestPositions.forEach(([x, z]) => {
  chests.push(new Chest(x, z, sceneManager.scene));
});

// Player State
const state = {
  x: 0,
  z: 0,
  dashTimer: 0,
  dashCooldownTimer: 0,
  dashVec: { x: 0, z: 0 },
  walkTime: 0,
  shootCooldown: 0,
  xp: 0,
  level: 1
};

const topBar = document.getElementById('top-bar');

function shootSpell() {
  if (state.shootCooldown > 0) return;
  state.shootCooldown = SPELLS.PYRO.cooldown;

  // Find inactive projectile
  const proj = projectiles.find((p) => !p.active);
  if (proj) {
    proj.pool.acquire();
    proj.spawn(state.x, state.z, input.aimDir.x, input.aimDir.z, SPELLS.PYRO);
  }
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  input.update(playerGroup.position);

  // Timers
  if (state.dashCooldownTimer > 0) state.dashCooldownTimer -= dt;
  if (state.shootCooldown > 0) state.shootCooldown -= dt;

  // Fire on aim release
  if (input.fireReleased) {
    input.fireReleased = false;
    shootSpell();
  }

  // Dash
  if (input.dashRequested) {
    input.dashRequested = false;
    if (state.dashCooldownTimer <= 0 && state.dashTimer <= 0) {
      state.dashTimer = PLAYER_BASE.DASH_DURATION;
      state.dashCooldownTimer = PLAYER_BASE.DASH_COOLDOWN;
      const hasMove = Math.hypot(input.moveDir.x, input.moveDir.z) > 0.1;
      state.dashVec.x = hasMove ? input.moveDir.x : input.aimDir.x;
      state.dashVec.z = hasMove ? input.moveDir.z : input.aimDir.z;
    }
  }

  // Player Movement
  if (state.dashTimer > 0) {
    state.dashTimer -= dt;
    state.x += state.dashVec.x * PLAYER_BASE.DASH_SPEED * dt;
    state.z += state.dashVec.z * PLAYER_BASE.DASH_SPEED * dt;
  } else {
    state.x += input.moveDir.x * PLAYER_BASE.MOVE_SPEED * dt;
    state.z += input.moveDir.z * PLAYER_BASE.MOVE_SPEED * dt;
  }

  // Map Boundary Clamp
  const distFromCenter = Math.hypot(state.x, state.z);
  const maxAllowed = ARENA.RADIUS - PLAYER_BASE.RADIUS;
  if (distFromCenter > maxAllowed) {
    state.x = (state.x / distFromCenter) * maxAllowed;
    state.z = (state.z / distFromCenter) * maxAllowed;
  }

  playerGroup.position.set(state.x, 0, state.z);

  // Orient player and aim laser
  const aimAngle = Math.atan2(input.aimDir.x, input.aimDir.z);
  visualMesh.rotation.y = aimAngle;
  aimLine.rotation.y = aimAngle;
  aimLine.visible = input.isAiming || !input.usingTouch;

  // Walk Wobble
  const speedMag = Math.hypot(input.moveDir.x, input.moveDir.z);
  if (speedMag > 0.05 && state.dashTimer <= 0) {
    state.walkTime += dt * 14;
    visualMesh.position.y = Math.abs(Math.sin(state.walkTime)) * 0.28;
    visualMesh.rotation.z = Math.sin(state.walkTime) * 0.08;
  } else {
    visualMesh.position.y = THREE.MathUtils.lerp(visualMesh.position.y, 0, 0.2);
    visualMesh.rotation.z = THREE.MathUtils.lerp(visualMesh.rotation.z, 0, 0.2);
  }

  // Update Projectiles & Collisions with Chests
  projectiles.forEach((proj) => {
    if (!proj.active) return;
    proj.update(dt);

    // Collision check against active chests
    chests.forEach((chest) => {
      if (chest.isDead) return;
      if (CollisionSystem.checkCircle(proj.x, proj.z, proj.radius, chest.x, chest.z, chest.radius)) {
        const destroyed = chest.takeDamage(proj.damage);
        proj.despawn();

        // Drop 3 XP Gems on break
        if (destroyed) {
          for (let i = 0; i < 3; i++) {
            const gem = gems.find((g) => !g.active);
            if (gem) {
              gem.pool.acquire();
              const offsetX = (Math.random() - 0.5) * 1.5;
              const offsetZ = (Math.random() - 0.5) * 1.5;
              gem.spawn(chest.x + offsetX, chest.z + offsetZ, 25);
            }
          }
        }
      }
    });
  });

  // Update Chests
  chests.forEach((chest) => chest.update(dt));

  // Update Gems & Magnet Pickups
  gems.forEach((gem) => {
    const collected = gem.update(dt, state.x, state.z);
    if (collected) {
      state.xp += gem.xpValue;
      if (state.xp >= 100) {
        state.level += 1;
        state.xp -= 100;
      }
      topBar.textContent = `Level: ${state.level} | XP: ${state.xp}/100 | Aim & Release to Fire`;
    }
  });

  sceneManager.updateCamera(playerGroup.position, input.aimDir);
  sceneManager.render();
}

animate();
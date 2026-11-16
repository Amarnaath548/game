import { ARENA } from '../config/constants.js';

function isSkipped(actor) {
  return actor.dashTimer > 0 || (actor.isInvulnerable && !!actor.spellDash) || actor.kbTimer > 0;
}

function clampActor(actor) {
  const maxR = ARENA.RADIUS - actor.radius;
  const d = Math.hypot(actor.x, actor.z);
  if (d > maxR && d > 0.001) {
    actor.x = (actor.x / d) * maxR;
    actor.z = (actor.z / d) * maxR;
  }
}

export function separateActors(actors) {
  const n = actors.length;
  for (let i = 0; i < n; i++) {
    const a = actors[i];
    if (a.isDead || a.isDying || isSkipped(a)) continue;
    for (let j = i + 1; j < n; j++) {
      const b = actors[j];
      if (b.isDead || b.isDying || isSkipped(b)) continue;
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      if (n > 30 && (Math.abs(dx) > 6 || Math.abs(dz) > 6)) continue;
      const minDist = (a.radius + b.radius) * 1.25;
      const dist = Math.hypot(dx, dz);
      if (dist >= minDist) continue;

      let nx = 0, nz = 0;
      if (dist > 0.001) {
        nx = dx / dist;
        nz = dz / dist;
      } else {
        const angle = ((i * 7 + j * 13) % 100) * 0.06283;
        nx = Math.cos(angle);
        nz = Math.sin(angle);
      }
      const push = Math.min((minDist - dist) * 0.5, 0.35);
      a.x += nx * push;
      a.z += nz * push;
      b.x -= nx * push;
      b.z -= nz * push;
    }
  }

  for (let i = 0; i < n; i++) {
    const a = actors[i];
    if (!a.isDead && !a.isDying) {
      clampActor(a);
      if (a.group) {
        a.group.position.x = a.x;
        a.group.position.z = a.z;
      }
    }
  }
}

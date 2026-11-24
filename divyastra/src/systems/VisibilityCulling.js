/**
 * Visibility Culling System
 *
 * Per-frame pass (called every 3rd frame) in the main loop:
 * - For each bot: set visible = false when > 60 units from camera target
 * - For each map prop group: set visible = false when > 60 units from camera target
 * - Always keep the player and any bot that is currently chasing or attacking the player visible
 */

const CULL_DIST = 60;
const CULL_DIST_SQ = CULL_DIST * CULL_DIST;

export function updateVisibilityCulling(sceneManager, spawnManager, arenaInteractables, player) {
  if (!sceneManager || !player) return;

  const camTarget = sceneManager.cameraTarget;
  const camX = camTarget ? camTarget.x : player.x;
  const camZ = camTarget ? camTarget.z : player.z;

  // Always keep the player visible
  if (player.group) player.group.visible = true;
  player.visible = true;

  // Bots pass
  const isLowQuality = sceneManager.qualityTier === 'LOW';
  if (spawnManager?.bots) {
    for (let i = 0; i < spawnManager.bots.length; i++) {
      const bot = spawnManager.bots[i];
      if (bot.isDead) continue;

      const dx = bot.x - camX;
      const dz = bot.z - camZ;
      const distSq = dx * dx + dz * dz;

      // Skip outlines on LOW quality for bots beyond 30 units (30^2 = 900)
      if (bot.outlineMesh) {
        const showOutline = !(isLowQuality && distSq > 900);
        bot.outlineMesh.visible = showOutline;
        if (bot.headOutlineMesh) bot.headOutlineMesh.visible = showOutline;
      }

      const isChasingOrAttacking = bot.isChasingOrAttacking
        ? bot.isChasingOrAttacking(player)
        : (bot.brain?.chaseTarget === player || bot.brain?.currentTarget === player);

      if (isChasingOrAttacking) {
        bot.visible = true;
        if (bot.group) bot.group.visible = true;
      } else {
        const isFar = distSq > CULL_DIST_SQ;
        const visible = !isFar;
        bot.visible = visible;
        if (bot.group) bot.group.visible = visible;
      }
    }
  }

  // Map prop groups pass
  // 1. Spawner props (chests, crystals, bushes)
  if (spawnManager) {
    cullPropList(spawnManager.chests, camX, camZ);
    cullPropList(spawnManager.crystals, camX, camZ);
    cullPropList(spawnManager.bushes, camX, camZ);
  }

  // 2. Arena interactables (pads, suryas, braziers)
  if (arenaInteractables) {
    cullPropList(arenaInteractables.pads, camX, camZ);
    cullPropList(arenaInteractables.suryas, camX, camZ);
    cullPropList(arenaInteractables.braziers, camX, camZ);
  }

  // 3. Map architectural prop groups (pillars, torana arches, agni platform, stepwell)
  const mapRoot = sceneManager.map?.root;
  if (mapRoot?.children) {
    for (let i = 0; i < mapRoot.children.length; i++) {
      const child = mapRoot.children[i];
      if (child.isGroup) {
        const dx = child.position.x - camX;
        const dz = child.position.z - camZ;
        child.visible = (dx * dx + dz * dz) <= CULL_DIST_SQ;
      }
    }
  }
}

function cullPropList(list, camX, camZ) {
  if (!list) return;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.isDead) continue;
    const grp = item.group;
    if (!grp) continue;
    const posX = item.x !== undefined ? item.x : grp.position.x;
    const posZ = item.z !== undefined ? item.z : grp.position.z;
    const dx = posX - camX;
    const dz = posZ - camZ;
    const visible = (dx * dx + dz * dz) <= CULL_DIST_SQ;
    grp.visible = visible;
    if ('visible' in item) item.visible = visible;
  }
}

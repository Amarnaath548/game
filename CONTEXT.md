# Project Context: Magica Royale

## Code Files
- `magica-royale/src/main.js`: Main match loop, spawning, collisions, loot drops, win/loss checks.
- `magica-royale/src/config/constants.js`: Spells, levels, storm phases, arena radius (120u), colors.
- `magica-royale/src/core/SceneManager.js`: Three.js scene, camera with trauma shake decay, lights, obelisks.
- `magica-royale/src/core/InputManager.js`: Dual-stick / WASD + mouse aim controls & dash trigger.
- `magica-royale/src/core/SoundManager.js`: Procedural Web Audio API sound effects (no external audio).
- `magica-royale/src/core/MetaProgression.js`: LocalStorage trophies, ranks, staff loadout, meta upgrades.
- `magica-royale/src/core/ObjectPool.js`: Generic reusable object pool (projectiles, gems, orbs).
- `magica-royale/src/entities/Actor.js`: Base wizard entity, mesh generation, wobble, DoT/chill statuses.
- `magica-royale/src/entities/Player.js`: Player controller, movement, dash i-frames, XP & level ups.
- `magica-royale/src/entities/Bot.js`: AI state machine (SAFE/COMBAT/LOOT/ROAM), player hunting.
- `magica-royale/src/entities/Projectile.js`: Spell projectile physics, ranges, lifetimes, visual particles.
- `magica-royale/src/entities/Prop.js`: Chests (Wooden/Mythic), Arcane Crystals, Bushes, XP Gems, Health Orbs.
- `magica-royale/src/systems/CollisionSystem.js`: 2D circle-circle collision helper math.
- `magica-royale/src/systems/ParticleSystem.js`: GPU instanced particle pool and burst effects.
- `magica-royale/src/systems/ZoneSystem.js`: Shrinking storm cylinder, perimeter ring, tick damage.
- `magica-royale/src/ui/UIManager.js`: Lobby UI, staff selection, meta upgrades, HUD, level-up perk cards.
- `magica-royale/src/ui/FloatingBarSystem.js`: 2D overhead projected health bars for bots.
- `magica-royale/src/style.css` & `index.html`: UI styling, lobby layout, responsive touch overlay.

## Completed Features
- 2.5D Battle Royale on 120u arena with 11 bots and 4 spells (Pyro, Cryo, Electro, Venom).
- Non-lethal bot-on-bot crossfire (bots cannot kill each other; player must defeat them).
- Bots actively track and hunt the player across tiered spawn rings.
- Dynamic storm zones (4 phases), bushes stealth, destructible chests and explosive barrels.
- Lobby with staff loadout, persistent trophy ranks, meta-bonuses, and level-up perks.

## Next Up
- Modular refactoring of `main.js` (under 250 lines) into dedicated match/spawn managers.
- Additional spell perks, special bot abilities, and mobile touch joysticks polish.


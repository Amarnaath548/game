# Project Context: Magica Royale

## Code Files
- `magica-royale/src/main.js`: Main match loop, spawning, collisions, loot drops, win/loss checks.
- `magica-royale/src/config/constants.js`: Spells, levels, storm phases, arena radius (120u), colors.
- `magica-royale/src/core/SceneManager.js`: Three.js scene, camera with trauma shake decay, lights, obelisks.
- `magica-royale/src/core/InputManager.js`: Dual-stick / WASD + mouse aim controls & dash trigger.
- `magica-royale/src/core/SoundManager.js`: Procedural Web Audio API sound effects (no external audio).
- `magica-royale/src/core/MetaProgression.js`: LocalStorage trophies, ranks, staff loadout, meta upgrades.
- `magica-royale/src/core/ObjectPool.js`: Generic reusable object pool (projectiles, gems, orbs).
- `magica-royale/src/entities/Actor.js`: Base wizard entity, velocity tracking, knockback, DoT/chill statuses.
- `magica-royale/src/entities/Player.js`: Player controller, movement, dash i-frames, XP & level ups.
- `magica-royale/src/entities/Bot.js`: Bot entity controller, level progression, dash execution, personality traits.
- `magica-royale/src/entities/BotBrain.js`: State decision engine (FORAGE/SKIRMISH/EVADE), target leading, dash trigger.
- `magica-royale/src/entities/BotSenses.js`: Spatial perception, projectile ray collision avoidance, target scoring.
- `magica-royale/src/entities/Projectile.js`: Spell projectile physics, ranges, lifetimes, visual particles.
- `magica-royale/src/entities/Prop.js`: Chests (Wooden/Mythic), Arcane Crystals, Bushes, XP Gems, Health Orbs.
- `magica-royale/src/systems/CollisionSystem.js`: 2D circle-circle collision helper math.
- `magica-royale/src/systems/ParticleSystem.js`: GPU instanced particle pool and burst effects.
- `magica-royale/src/systems/ZoneSystem.js`: Shrinking storm cylinder, perimeter ring, tick damage.
- `magica-royale/src/ui/UIManager.js`: Lobby UI, staff selection, meta upgrades, HUD, level-up perk cards.
- `magica-royale/src/ui/FloatingBarSystem.js`: 2D overhead projected health bars for bots.
- `magica-royale/src/ui/DamageNumbers.js`: Pooled 2D floating combat damage numbers over targets.
- `magica-royale/src/ui/KillFeed.js`: Top-right animated match elimination feed.
- `magica-royale/src/style.css` & `index.html`: UI styling, lobby layout, responsive touch overlay.

## Completed Features
- 2.5D Battle Royale on 120u arena with 11 bots and 4 spells (Pyro, Cryo, Electro, Venom).
- **Phase 1 Complete**: Lethal bot-vs-bot combat with full spell passives, loot drops on all kills, 0.15s knockback, damage numbers, and kill feed.
- **Phase 2 Complete**: Modular bot AI architecture (`Bot.js`, `BotBrain.js`, `BotSenses.js`) with LEVEL_TABLE progression, rolled personalities (aggression, caution, skill), level-aware targeting, target leading, projectile dodging, and dash evasion.
- Dynamic storm zones (4 phases), bushes stealth, destructible chests and explosive barrels.
- Lobby with staff loadout, persistent trophy ranks, meta-bonuses, and level-up perks.

## Next Up
- **Phase 3**: Controls, aim assist, 4 new spells (Pierce, Blast, Homing, Shield), storm pacing, mythic chest position.

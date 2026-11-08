Building a **Magica.io-style 2.5D top-down battle royale** using an AI-driven workflow requires a modular architecture where every system is isolated into small, single-responsibility JavaScript files. This keeps your context window clean in editors like Windsurf or Zed and lets the AI write bug-free code without breaking existing systems.

---

## 1. Complete Tech & AI Tooling Stack

| Layer | Technology | Why it works best with AI |
| --- | --- | --- |
| **Core Bundler** | **Vite + Vanilla JS (ES6 Modules)** | Fast HMR, zero framework overhead, pure standard JavaScript. |
| **Rendering** | **Three.js (WebGL)** | AI can procedurally build low-poly meshes, particle shaders, and lighting without external assets at the start. |
| **Physics & Math** | **Custom 2D Math ($X, Z$ Plane)** | Avoids heavy 3D physics libraries. AI writes exact Circle-to-Circle and Circle-to-AABB collision checks in 20 lines of code. |
| **UI & HUD** | **HTML5 / Tailwind CSS Overlay** | Positioned over the `<canvas>`. Much easier for AI to style responsive mobile joysticks and health bars in HTML/CSS than inside WebGL. |
| **Audio** | **Web Audio API / Howler.js** | Simple event-driven sound triggers. |
| **Android Build** | **Capacitor** | Wraps the `dist/` build directly into an Android Studio project. |

---

## 2. Modular File Architecture

Keep every file under 250 lines so an AI assistant can read and rewrite entire files cleanly:

```text
magica-royale/
├── index.html               # Canvas + HUD overlay (Joysticks, HP bar, Match info)
├── package.json
├── capacitor.config.json    # Android app ID, orientation lock
└── src/
    ├── main.js              # Bootstrapper & Master Game Loop (Fixed timestep)
    ├── config/
    │   └── constants.js     # Arena size, player speeds, spell stats, colors
    ├── core/
    │   ├── SceneManager.js  # Three.js Scene, Orthographic/Perspective Camera, Lights
    │   ├── InputManager.js  # Unified WASD/Mouse + Multi-touch Virtual Joysticks
    │   └── ObjectPool.js    # Reusable pools for projectiles, particles, XP gems
    ├── entities/
    │   ├── Actor.js         # Base class for Player and Bots (HP, movement, hitbox)
    │   ├── Player.js        # Reads InputManager, triggers spells & dash
    │   ├── Bot.js           # AI State Machine (Roam, Loot, Attack, Escape Zone)
    │   ├── Projectile.js    # Spell logic, velocity, lifespan, hit detection
    │   └── Prop.js          # Destructible chests, static pillars, bushes
    ├── systems/
    │   ├── CollisionSystem.js # 2D spatial hash / circle collision checks
    │   ├── ZoneSystem.js    # Shrinking storm ring mesh + out-of-bounds tick damage
    │   ├── ParticleSystem.js# GPU instanced meshes for spell trails & explosions
    │   └── LootSystem.js    # Spawns XP gems & elemental upgrades on chest/kill
    └── ui/
        └── UIManager.js     # Updates DOM elements (kill feed, remaining players, level up)

```

---

## 3. Core Technical Specifications (How AI Should Code It)

### A. 2.5D Coordinate Mapping

Even though Three.js renders in 3D ($X, Y, Z$), **all gameplay math runs strictly in 2D ($X, Z$)**:

* $Y$ is locked to `0` for ground entities (or slightly elevated for floating projectiles).
* Hitboxes are simple 2D circles: `{ x, z, radius }`.
* Distance check between projectile $A$ and player $B$:

$$d = \sqrt{(A_x - B_x)^2 + (A_z - B_z)^2} < (R_A + R_B)$$



### B. Twin-Stick Mobile + Desktop Input

* **Left Touch Zone (Left 50% of screen):** Dynamic floating joystick. Touch-down sets the anchor; dragging outputs a normalized movement vector $\{dx, dz\}$.
* **Right Touch Zone (Right 50% of screen):** Aim joystick.
* **Drag > 20% radius:** Shows a glowing ground aiming line/reticle on the arena floor pointing in the aim direction.
* **Quick Tap (< 150ms):** Auto-targets the nearest enemy within range.
* **Release:** Fires the active spell.



### C. Bot AI State Machine

Since *Magica.io* is primarily an offline/simulated multiplayer battle royale (1 real player + 11–15 bots), the bots need a believable, lightweight state machine:

1. **SAFE_CHECK (Highest Priority):** Is the bot outside the `ZoneSystem.currentRadius`? If yes, bias movement vector $70\%$ toward arena center $(0,0)$.
2. **COMBAT:** Is an enemy within `aggroRadius`? Strafe perpendicular to the enemy while firing when cooldown is ready.
3. **LOOT:** Are there XP gems or chests nearby? Move toward the nearest one and shoot the chest.
4. **ROAM:** Pick a random waypoint inside the safe zone and walk toward it.

---

## 4. 5-Phase AI Prompting & Build Roadmap

Follow these phases in order, prompting your AI assistant one module at a time.

### Phase 1: The Playable Arena & Twin-Stick Controller

* **Goal:** A low-poly character sliding smoothly around a circular grid arena with working mobile touch joysticks and desktop controls.
* **AI Prompts to Run:**
1. *"Set up a Vite + Three.js project with a high-angle perspective camera (45-degree tilt) following a target position smoothly using lerp."*
2. *"Create a circular arena floor of radius 60 with a grid shader or checkerboard texture, surrounded by low-poly rocks."*
3. *"Build an `InputManager.js` that handles WASD + Mouse on desktop and dual floating HTML/CSS touch joysticks on mobile, exporting normalized `moveVector` and `aimVector`."*



### Phase 2: Projectiles, Object Pooling & Destructibles

* **Goal:** Shooting spells, Aim indicator on the floor, and breaking loot chests.
* **AI Prompts to Run:**
1. *"Create an `ObjectPool.js` and `Projectile.js` system. When the right joystick is dragged, show a directional arrow mesh on the floor. On release, spawn a glowing sphere projectile from the pool."*
2. *"Add 2D circle-to-circle collision in `CollisionSystem.js`. Spawn 20 wooden chests around the map that break in 2 hits and spawn collectible XP gems."*
3. *"Create a GPU-friendly `ParticleSystem.js` using `THREE.InstancedMesh` to spawn burst cubes when a fireball hits a chest or wall."*



### Phase 3: Leveling, Elemental Spells & Hero Upgrades

* **Goal:** *Magica.io*'s core progression loop during a match.
* **AI Prompts to Run:**
1. *"Add an XP & Level system to `Actor.js`. Collecting gems fills the XP bar. On level up, pause or show 3 quick-select upgrade buttons at the bottom of the screen (e.g., +1 Multi-shot, Fireball Size +25%, Movement Speed +15%)."*
2. *"Implement 3 distinct spell archetypes in `constants.js`: Fireball (AOE splash on hit), Ice Shards (3-way cone spread + slow effect), and Lightning Ball (fast travel + chain hit)."*



### Phase 4: AI Bots & The Shrinking Storm Zone

* **Goal:** Turning the sandbox into a full 2-minute Battle Royale match.
* **AI Prompts to Run:**
1. *"Create `ZoneSystem.js` with a translucent red cylinder or ring shader on the ground. Every 20 seconds, shrink its radius toward a random center point. Deal tick damage every 0.5s to any actor outside the radius."*
2. *"Build `Bot.js` extending `Actor.js`. Spawn 11 bots around the map edge. Give them a state machine that prioritizes staying inside the safe zone, collecting nearby XP gems, and firing at the closest actor."*
3. *"Add floating 2D HTML health bars and level badges above each actor using `Vector3.project(camera)` to convert 3D world positions to 2D screen coordinates."*



### Phase 5: Polish, Meta-Progression & Android APK

* **Goal:** Main menu, currency saving, and Android packaging.
* **AI Prompts to Run:**
1. *"Create a pre-match Lobby screen where the player can spend Gold won from matches to unlock new mage skins or upgrade starting stats, saved in `localStorage`."*
2. *"Configure Capacitor for Android, lock screen orientation to landscape, hide the status bar/navigation bar for immersive full-screen mode, and optimize pixel ratio to `Math.min(window.devicePixelRatio, 2)` for stable 60 FPS on mid-range phones."*



---

## 5. Crucial Performance Rules for Android WebView

When prompting the AI to write Three.js code, include these constraints in your system prompt or project rules file (`.windsurfrules` / `.cursorrules`):

* **Never call `new THREE.Geometry` or `new THREE.Mesh` inside the update loop.** Pre-allocate all projectiles, particles, and gems at startup using `ObjectPool` or `InstancedMesh`.
* **Cap `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))` on mobile.** High-DPI phone screens (like 1080×2400) will bottleneck the GPU if rendered at 3x native resolution.
* **Use unlit or simple materials (`MeshLambertMaterial` or `MeshToonMaterial`)** with a single directional light instead of expensive PBR (`MeshStandardMaterial`) calculations.

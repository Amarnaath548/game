Here is the complete **Game Design Document (GDD)** tailored for a *Magica.io*-style 2.5D top-down battle royale. It is structured so you can feed specific sections directly into your AI coding assistant as you build each feature.

---

## 1. Visual Direction & Camera ("How It Looks")

To ensure 60 FPS on Android WebView while keeping the visual impact high, use a **Stylized Dark-Arcane Low-Poly aesthetic** with high-contrast emissive spells.

* **Camera Setup:**
* **Angle:** Fixed 50° pitch downward, locked on the $Z$-axis (no camera rotation, keeping joystick directions consistent).
* **Follow Logic:** Smooth linear interpolation (`lerp` factor `0.1`) with a slight look-ahead offset in the direction the player is aiming.


* **Color Palette:**
* **Arena Floor:** Muted dark slate/obsidian (`#1a1c29`) with subtle glowing geometric runes or grid lines (`#2a2e42`) so bright projectiles pop cleanly against the background.
* **Characters:** Distinct silhouette robes (Crimson, Royal Blue, Emerald, Gold) with oversized wizard hats or hoods so the player can read character orientation from a high angle.
* **Spells & Loot:** High-saturation neon emissives (Cyan `#00f2ff`, Fiery Orange `#ff5500`, Arcane Purple `#b700ff`, Toxic Green `#39ff14`).


* **Visual Juice (Micro-animations without heavy skeletons):**
* **Movement Wobble:** Procedural sine-wave bobbing and slight tilt on the mesh group when moving (`Math.sin(time * 12)`).
* **Hit Flash:** Swap material emissive color to pure white (`#ffffff`) for 80ms when taking damage.
* **Screen Shake:** Subtle camera offset decay when fireballs explode nearby or when taking heavy damage.



---

## 2. Environment & Arena Design

The map is a circular floating island of **Radius 80 units**, split into three concentric tactical rings:

| Zone | Radius Range | Layout & Features | Tactical Purpose |
| --- | --- | --- | --- |
| **Outer Ring (Spawn Zone)** | `50 – 80` units | 12 equidistant spawn pedestals, sparse wooden chests, small rock pillars. | Safe early looting; prevents instant spawn-kills. |
| **Mid Ring (Elemental Ruins)** | `20 – 50` units | Broken stone walls (L-shaped cover), Mana Bushes (hide inside), Rune Barrels. | Line-of-sight mind games, ambushes, and mid-game skirmishes. |
| **Center Ring (The Sanctum)** | `0 – 20` units | Open marble floor, 4 indestructible obelisks, 1 Mythic Golden Chest in the dead center. | High-risk, high-reward brawl zone; final storm circle destination. |

### Interactive Environment Props

* **Wooden Chests (150 HP):** Drops 3–4 small XP Gems and a 30% chance for a Health Orb (+25% HP).
* **Mythic Chests (400 HP):** Spawns in the center; drops a large XP burst and guarantees an immediate Elemental Evolution.
* **Arcane Crystals (Volatile Barrels - 50 HP):** Explodes in a 6-unit radius when hit by a spell, dealing 120 damage and knocking back anyone nearby.
* **Shadow Bushes:** Translucent dark foliage. Entering one turns the character mesh semi-transparent (`opacity: 0.3`) to you, and completely invisible to enemies outside a 4-unit detection radius.

---

## 3. Elemental Skill & Spell System

Every character starts with a basic **Arcane Bolt**, or picks one of **4 Core Elements** in the lobby. Projectiles act on distinct mechanical behaviors:

### A. Primary Elements (Base Attacks)

1. **Pyromancy (Fireball)**
* **Behavior:** Medium speed, medium range. Explodes on impact (or at max range) into a 3.5-unit AoE splash.
* **Passive Effect:** Leaves a burning ground decal for 2 seconds (10 damage/sec).


2. **Cryomancy (Frost Shards)**
* **Behavior:** Fires 3 fast shards in a 20° cone. Shorter range, lower per-shard damage, high close-range burst if all 3 hit.
* **Passive Effect:** Chills target, reducing movement speed by 30% for 1.5 seconds.


3. **Electromancy (Lightning Orb)**
* **Behavior:** Very fast projectile velocity.
* **Passive Effect:** Chains to up to 2 nearby enemies or chests within 6 units for 50% damage.


4. **Venomancy (Plague Glob)**
* **Behavior:** Lobbed arc projectile (can shoot *over* stone walls!).
* **Passive Effect:** Applies stackable poison (8 damage/sec for 4 seconds) and leaves a small toxic puddle.



### B. Active Mobility Skill (Dedicated Dash Button)

* **Arcane Blink / Dash (4-second cooldown):**
* Launches the player 8 units in their current movement direction over 150ms.
* Grants brief invulnerability frames (i-frames) during the dash so skilled players can dodge incoming fireballs.



---

## 4. In-Match Leveling & Upgrade System (Roguelite Loop)

Matches last **90 to 120 seconds**. Leveling is fast and snappy (capped at **Level 8** per match).

### XP & Scaling Table

| Level | XP Required | Automatic Stat Boost | Upgrade Reward |
| --- | --- | --- | --- |
| **Lv 1** | 0 | Base Stats (300 HP, 50 Dmg) | Starting Element |
| **Lv 2** | 50 XP | +40 Max HP, +5 Dmg | Pick 1 of 3 Minor Passives |
| **Lv 3** | 120 XP | +40 Max HP, +5 Dmg | Pick 1 of 3 Spell Modifiers |
| **Lv 4** | 220 XP | +50 Max HP, +8 Dmg | Pick 1 of 3 Minor Passives |
| **Lv 5** | 350 XP | +60 Max HP, +10 Dmg | **Elemental Mastery (Major Upgrade)** |
| **Lv 6–8** | +200 XP/lv | +80 Max HP, +12 Dmg | Stat Boosters & Cooldown Reduction |

* **How Selection Works Without Stopping Combat:**
Since the storm is shrinking and bots are attacking, the game **does not pause** on level up. Instead, 3 compact glowing cards pop up above the bottom HUD. The player taps one with their thumb (or presses `1`, `2`, `3` on desktop) while still moving.

### Upgrade Card Pool (12 Core Perks)

* **Spell Modifiers (Alter Projectile Math):**
* **Twin Cast:** +1 Projectile per shot in a tight spread (-15% damage per projectile).
* **Echo Cast:** Fires a second projectile 0.15s after the first.
* **Giant Arcana:** Projectile radius and explosion AoE increased by +40%.
* **Sniper Velocity:** Projectile speed and range increased by +35%.
* **Ricochet:** Projectiles bounce once off stone walls instead of breaking.
* **Homing Guidance:** Projectiles gently curve toward the nearest enemy within 4 units.


* **Hero Passives (Alter Actor Stats):**
* **Vampiric Soul:** Heal for 20% of spell damage dealt to enemies.
* **Windwalker:** +20% Movement Speed and -1s Dash Cooldown.
* **Arcane Shield:** Generates a regenerating bubble that absorbs 1 hit every 12 seconds.
* **Executioner:** Deal +35% damage to enemies below 40% HP.



---

## 5. The Storm Circle (Pacing Engine)

A glowing violet/red cylindrical forcefield surrounds the safe zone.

* **0:00 – 0:25 (Loot Phase):** Radius `80` (Full Map). Players break chests and hit Level 2–3.
* **0:25 – 0:50 (First Shrink):** Shrinks from `80` to `45` units. Out-of-bounds damage: **15 HP/sec**.
* **0:50 – 1:15 (Second Shrink):** Shrinks from `45` to `20` units (Mid ring eliminated). Out-of-bounds damage: **35 HP/sec**.
* **1:15 – 1:45 (Final Showdown):** Shrinks from `20` down to `5` units. Out-of-bounds damage: **75 HP/sec**.

---

## 6. Out-of-Match Progression (Meta Loop for Retention)

To make the game addictive on Android, matches feed into a simple `localStorage` progression system:

1. **Trophies & Ranks:**
* Top 1: `+30 Trophies` | Top 3: `+15 Trophies` | Bottom 6: `-10 Trophies`.
* Higher trophy brackets increase the `BotAI` reaction speed and accuracy variables.


2. **Gold & Staff Armory:**
* Gold earned from kills and placement unlocks new wands/staves in the main menu, which change your starting element and passive perks.



---

Would you like me to generate the **`constants.js` configuration file** containing all these exact numbers (spells, levels, upgrades, and arena rings) alongside the **Phase 1 playable prototype**?Here is the complete **Game Design Document (GDD)** tailored for a *Magica.io*-style 2.5D top-down battle royale. It is structured so you can feed specific sections directly into your AI coding assistant as you build each feature.

---

## 1. Visual Direction & Camera ("How It Looks")

To ensure 60 FPS on Android WebView while keeping the visual impact high, use a **Stylized Dark-Arcane Low-Poly aesthetic** with high-contrast emissive spells.

* **Camera Setup:**
* **Angle:** Fixed 50° pitch downward, locked on the $Z$-axis (no camera rotation, keeping joystick directions consistent).
* **Follow Logic:** Smooth linear interpolation (`lerp` factor `0.1`) with a slight look-ahead offset in the direction the player is aiming.


* **Color Palette:**
* **Arena Floor:** Muted dark slate/obsidian (`#1a1c29`) with subtle glowing geometric runes or grid lines (`#2a2e42`) so bright projectiles pop cleanly against the background.
* **Characters:** Distinct silhouette robes (Crimson, Royal Blue, Emerald, Gold) with oversized wizard hats or hoods so the player can read character orientation from a high angle.
* **Spells & Loot:** High-saturation neon emissives (Cyan `#00f2ff`, Fiery Orange `#ff5500`, Arcane Purple `#b700ff`, Toxic Green `#39ff14`).


* **Visual Juice (Micro-animations without heavy skeletons):**
* **Movement Wobble:** Procedural sine-wave bobbing and slight tilt on the mesh group when moving (`Math.sin(time * 12)`).
* **Hit Flash:** Swap material emissive color to pure white (`#ffffff`) for 80ms when taking damage.
* **Screen Shake:** Subtle camera offset decay when fireballs explode nearby or when taking heavy damage.



---

## 2. Environment & Arena Design

The map is a circular floating island of **Radius 80 units**, split into three concentric tactical rings:

| Zone | Radius Range | Layout & Features | Tactical Purpose |
| --- | --- | --- | --- |
| **Outer Ring (Spawn Zone)** | `50 – 80` units | 12 equidistant spawn pedestals, sparse wooden chests, small rock pillars. | Safe early looting; prevents instant spawn-kills. |
| **Mid Ring (Elemental Ruins)** | `20 – 50` units | Broken stone walls (L-shaped cover), Mana Bushes (hide inside), Rune Barrels. | Line-of-sight mind games, ambushes, and mid-game skirmishes. |
| **Center Ring (The Sanctum)** | `0 – 20` units | Open marble floor, 4 indestructible obelisks, 1 Mythic Golden Chest in the dead center. | High-risk, high-reward brawl zone; final storm circle destination. |

### Interactive Environment Props

* **Wooden Chests (150 HP):** Drops 3–4 small XP Gems and a 30% chance for a Health Orb (+25% HP).
* **Mythic Chests (400 HP):** Spawns in the center; drops a large XP burst and guarantees an immediate Elemental Evolution.
* **Arcane Crystals (Volatile Barrels - 50 HP):** Explodes in a 6-unit radius when hit by a spell, dealing 120 damage and knocking back anyone nearby.
* **Shadow Bushes:** Translucent dark foliage. Entering one turns the character mesh semi-transparent (`opacity: 0.3`) to you, and completely invisible to enemies outside a 4-unit detection radius.

---

## 3. Elemental Skill & Spell System

Every character starts with a basic **Arcane Bolt**, or picks one of **4 Core Elements** in the lobby. Projectiles act on distinct mechanical behaviors:

### A. Primary Elements (Base Attacks)

1. **Pyromancy (Fireball)**
* **Behavior:** Medium speed, medium range. Explodes on impact (or at max range) into a 3.5-unit AoE splash.
* **Passive Effect:** Leaves a burning ground decal for 2 seconds (10 damage/sec).


2. **Cryomancy (Frost Shards)**
* **Behavior:** Fires 3 fast shards in a 20° cone. Shorter range, lower per-shard damage, high close-range burst if all 3 hit.
* **Passive Effect:** Chills target, reducing movement speed by 30% for 1.5 seconds.


3. **Electromancy (Lightning Orb)**
* **Behavior:** Very fast projectile velocity.
* **Passive Effect:** Chains to up to 2 nearby enemies or chests within 6 units for 50% damage.


4. **Venomancy (Plague Glob)**
* **Behavior:** Lobbed arc projectile (can shoot *over* stone walls!).
* **Passive Effect:** Applies stackable poison (8 damage/sec for 4 seconds) and leaves a small toxic puddle.



### B. Active Mobility Skill (Dedicated Dash Button)

* **Arcane Blink / Dash (4-second cooldown):**
* Launches the player 8 units in their current movement direction over 150ms.
* Grants brief invulnerability frames (i-frames) during the dash so skilled players can dodge incoming fireballs.



---

## 4. In-Match Leveling & Upgrade System (Roguelite Loop)

Matches last **90 to 120 seconds**. Leveling is fast and snappy (capped at **Level 8** per match).

### XP & Scaling Table

| Level | XP Required | Automatic Stat Boost | Upgrade Reward |
| --- | --- | --- | --- |
| **Lv 1** | 0 | Base Stats (300 HP, 50 Dmg) | Starting Element |
| **Lv 2** | 50 XP | +40 Max HP, +5 Dmg | Pick 1 of 3 Minor Passives |
| **Lv 3** | 120 XP | +40 Max HP, +5 Dmg | Pick 1 of 3 Spell Modifiers |
| **Lv 4** | 220 XP | +50 Max HP, +8 Dmg | Pick 1 of 3 Minor Passives |
| **Lv 5** | 350 XP | +60 Max HP, +10 Dmg | **Elemental Mastery (Major Upgrade)** |
| **Lv 6–8** | +200 XP/lv | +80 Max HP, +12 Dmg | Stat Boosters & Cooldown Reduction |

* **How Selection Works Without Stopping Combat:**
Since the storm is shrinking and bots are attacking, the game **does not pause** on level up. Instead, 3 compact glowing cards pop up above the bottom HUD. The player taps one with their thumb (or presses `1`, `2`, `3` on desktop) while still moving.

### Upgrade Card Pool (12 Core Perks)

* **Spell Modifiers (Alter Projectile Math):**
* **Twin Cast:** +1 Projectile per shot in a tight spread (-15% damage per projectile).
* **Echo Cast:** Fires a second projectile 0.15s after the first.
* **Giant Arcana:** Projectile radius and explosion AoE increased by +40%.
* **Sniper Velocity:** Projectile speed and range increased by +35%.
* **Ricochet:** Projectiles bounce once off stone walls instead of breaking.
* **Homing Guidance:** Projectiles gently curve toward the nearest enemy within 4 units.


* **Hero Passives (Alter Actor Stats):**
* **Vampiric Soul:** Heal for 20% of spell damage dealt to enemies.
* **Windwalker:** +20% Movement Speed and -1s Dash Cooldown.
* **Arcane Shield:** Generates a regenerating bubble that absorbs 1 hit every 12 seconds.
* **Executioner:** Deal +35% damage to enemies below 40% HP.



---

## 5. The Storm Circle (Pacing Engine)

A glowing violet/red cylindrical forcefield surrounds the safe zone.

* **0:00 – 0:25 (Loot Phase):** Radius `80` (Full Map). Players break chests and hit Level 2–3.
* **0:25 – 0:50 (First Shrink):** Shrinks from `80` to `45` units. Out-of-bounds damage: **15 HP/sec**.
* **0:50 – 1:15 (Second Shrink):** Shrinks from `45` to `20` units (Mid ring eliminated). Out-of-bounds damage: **35 HP/sec**.
* **1:15 – 1:45 (Final Showdown):** Shrinks from `20` down to `5` units. Out-of-bounds damage: **75 HP/sec**.

---

## 6. Out-of-Match Progression (Meta Loop for Retention)

To make the game addictive on Android, matches feed into a simple `localStorage` progression system:

1. **Trophies & Ranks:**
* Top 1: `+30 Trophies` | Top 3: `+15 Trophies` | Bottom 6: `-10 Trophies`.
* Higher trophy brackets increase the `BotAI` reaction speed and accuracy variables.


2. **Gold & Staff Armory:**
* Gold earned from kills and placement unlocks new wands/staves in the main menu, which change your starting element and passive perks.


# PDTP – notes on the original codebase

Reference for the rewrite. Source: `/Users/pyditn/Projekte/Pyditn-s-Dice-Thrower-Pro`
(branch `working`, v0.1.25–0.1.27, last commit 2025-12-21, GitHub `pyditn2/Pyditn-s-Dice-Thrower-Pro`).

## What the app is

A desktop dice roller for **DSA 5 (Das Schwarze Auge)** with physically simulated 3D dice.
The UI is entirely German. Four tabs:

| Tab | Component | What it does |
|---|---|---|
| Würfelproben | `DiceCheck.vue` | Eigenschaftsprobe (1W20), Talentprobe (3W20), Kampfprobe (AT 1W20, then damage W6s). Dual wielding ("Beidhändig"). Extra W6 / crit-damage W6 buttons. |
| Freies Würfeln | `FreeDiceRoller.vue` | 1–6 dice of W20 or W6. Optionally map each W20 to an attribute and get pass/fail per die. |
| Manuelle Eingabe | `ManualDiceCheck.vue` | Type in three physical W20 results for a talent; computes the outcome. No 3D. |
| Charakterwerte | `CharacterEditor.vue` + `WeaponsSection.vue` | Edit name/Spezies/Kultur/Profession, 8 attributes, 59 talents, weapons. |

Global bits: character selector bar (create/delete/switch, plus a "Wurf-Einstellungen" popup for throw
angle/distance/strength), a ⋮ options menu (sim speed 1x/2x/3x, mute, dice colours, animated background),
an animated Three.js background running in a Web Worker on an OffscreenCanvas.

## Stack

- Vue 3.3 (`<script setup>`, plain JS, no TS), Pinia 2 + `pinia-plugin-persistedstate`, Vite 5
- three 0.171, `@dimforge/rapier3d-compat` 0.14 (physics, WASM)
- Tauri 2 shell. The Rust side is the untouched template (unused `greet` command, unused shell plugin).
  `csp: null`. Window 800×600.
- No tests, no linter, no TS, README is "TODO".
- CI (`.github/workflows/main.yml`): on push to `main`, bump patch version in `package.json` +
  `tauri.conf.json`, commit, then build & release for macOS (aarch64 only), Ubuntu 22.04, Windows.
  `Cargo.toml` is stuck at 0.1.14.
- Assets: `public/TablePDTP1.glb` (**28 MB** table model, also listed as a Tauri bundle resource),
  `public/sounds/dice-collision.mp3`, `dice-bowl.mp3`, `src/assets/icons/wurfsettings.png`.
- Linux needed special-casing (WebKitGTK WebGL): antialias off, basic shadow maps.

## File map (~9,000 lines)

```
src/
  App.vue                     tabs + global CSS (duplicated rules, see below)
  stores/
    characterStore.js   401   characters, attributes, talent catalog (twice), weapons; persisted
    diceAppearanceStore 119   dice colours per attribute / check type; manual localStorage
    diceRollerStore     103   throwConfig + throw position/velocity maths (rest is dead)
    backgroundStore      25   background mode + colours; manual localStorage
    physicsStore         19   sim speed
  components/
    DiceRoller.vue      427   the 3D engine host: animation loop, rollDice(), one canvas per die
    DiceCheck.vue       510   Würfelproben tab + ALL its rules logic
    CheckResults.vue    377   result rendering for attribute/talent/combat (also used by manual tab)
    FreeDiceRoller.vue  401
    ManualDiceCheck.vue 368   its own copy of the talent rules
    OptionsMenu.vue     578
    CharacterEditor 417, WeaponsSection 359, CharacterSelector 268, ThrowPositionSelector 322
    SearchableDropdown  213   used everywhere
    small: CombatControls, ActionButtons, CheckTypeSelector, AttributeControls, TalentControls,
           ModifierControl, DiceLabels, DiceAttributeSelector, ThreeBackground
  composables/
    useSceneSystem      678   scene, lights, starry skybox, hex bowl (mesh + colliders), table GLB
    usePhysicsSystem    224   fixed-step loop, interpolation, collision → sound, settle check
    useDiceState        185   dice/rigid-body arrays, WebGL renderers, throw spawning
    useAudioSystem      207   Web Audio singleton (on window._audioSystemInstance)
    useAnimationSystem   39   rAF loop
    useCameraState      102   DEAD
  services/
    BaseDice / D6Dice / D20Dice   mesh + numbered face labels (canvas textures) + convex-hull body
    diceManager                   pool of dice "creators", wireframes, face reading
    cameraManager                 per-die camera state machine
    diceService                   DEAD (calls stores that aren't imported / don't exist)
  workers/three.worker.js   377   animated background
  constants/diceTypes.js, checkTypes.js (duplicate, dead)
```

## How a roll works

1. A tab component calls `diceRoller.rollDice(type, count, appearance | appearance[])`
   (exposed via `defineExpose`). All dice in one roll share one type (`'d6'` or `'d20'` only).
2. `rollDice` calls `sceneSystem.cleanupScene()` (rebuilds the whole scene incl. bowl), resets dice,
   spawns `count` dice at positions from `diceRollerStore.throwConfig`, sets velocities.
3. The rAF loop (`DiceRoller.animate`) steps Rapier at a fixed timestep, interpolates meshes,
   drives one camera per die, renders each die's view into its **own WebGLRenderer/canvas** (300×300).
4. A `setInterval(100ms)` polls until every body's linear+angular velocity components are < 0.01,
   then reads each die's value (face normal with the largest dot product against +Y) and resolves
   `number[]`.
5. The tab component turns the numbers into a DSA result object and renders it via `CheckResults`.

The result is whatever the simulated die shows. Nothing is pre-rolled.

## Domain data

**Attributes:** MU, KL, IN, CH, FF, GE, KO, KK (default 8, store clamps to 8–20).

**Talents:** 59 in 5 categories (koerper 14, gesellschaft 9, natur 7, wissen 12, handwerk 17), each
`{ name, value, attributes: [3 attribute keys] }`. The full catalog is **copied into every saved
character** and talents are looked up by display name everywhere. A typo fix ("Menschkenntnis")
already needed a data migration. Remaining typos: "Gewandheit" (Gewandtheit), "Brett-und Glücksspiel".

**Weapon:** `{ id, name, type, at, pa, atBonus, paBonus, tp: { diceCount, diceType, modifier }, notes }`.
`type`, `pa`, `paBonus` are stored but never used (no parry roll). `tp.diceType` is always 6: the UI
hard-codes "W6" and the engine only has d6/d20.

### Persisted data (localStorage, for migration)

| Key | Written by | Shape |
|---|---|---|
| `character` | pinia-plugin-persistedstate | `{ activeCharacterId, characters: { [id]: { characterInfo:{name,spezies,kultur,profession}, stats:{attributes:{MU..KK}}, talents:{[category]:[{name,value,attributes}]}, weapons:[…] } }, characterInfo, stats, talents }`. The top-level `characterInfo/stats/talents` are left over from the old single-character format. |
| `diceAppearances` | diceAppearanceStore | `{ d20: { attribute:{MU:{color,opacity,shininess},…}, talent:{default:{…}}, combat:{default:{…}} }, d6:{ damage, critical, extra } }` |
| `diceAppearancePrefs` | diceAppearanceStore | `{ useTalentColors: boolean }` |
| `currentBackground` | backgroundStore | `'schwarz' \| 'animiert'` |
| `hexagonColor`, `squareColor` | backgroundStore | hex strings |

Not persisted: throw settings, sim speed, mute.
Inside Tauri this lives in the webview storage for identifier `com.pdtp.app`. Keeping that
identifier (and origin) is what lets a rewrite read existing users' data.

## Rules as implemented (they disagree with each other)

The talent check is implemented separately in three places, with different results:

| | `DiceCheck.vue` (Würfelproben) | `ManualDiceCheck.vue` (Manuelle Eingabe) | `diceService.js` (dead) |
|---|---|---|---|
| one 1 | "Kritischer Erfolg!", auto success | that die costs 0 points, nothing else | like DiceCheck |
| two 1s | "Spektakulärer Erfolg!" | nothing special | like DiceCheck |
| three 1s | same as two | "Kritischer Erfolg!", auto success | like DiceCheck |
| one 20 | "Patzer!", auto fail | that die costs ≥1 point | like DiceCheck |
| two 20s | "Spektakulärer Patzer!" | nothing special | like DiceCheck |
| three 20s | same as two | label "Patzer!" but success still computed normally | like DiceCheck |
| QS | 0–3→1, 4–6→2, 7–9→3, 10–12→4, 13–15→5, 16+→6 | `1 + floor(FP/3)`: 0–2→1, 3–5→2, … (off by one at 3, 6, 9, 12, 15) | uncapped above 6 |
| modified attribute | can go ≤ 0 | floored at 1 | — |

Other checks (all in `DiceCheck.vue`):
- **Eigenschaftsprobe:** success if roll = 1 or (roll ≤ attr + mod and roll ≠ 20). QS is computed too.
- **Kampfprobe:** target = `at + atBonus + temp AT bonus`. 1 = "Kritischer Treffer!", 20 = "Patzer!".
  On success, a "Schaden würfeln" button rolls `diceCount`×W6 + `tp.modifier` + temp TP bonus. On a crit,
  an extra 1W6 "Kritischer Schaden" button appears. Dual wielding does two sequential AT rolls with separate damage.
- **Freies Würfeln:** per-die attribute check against the raw attribute (no modifier), same 1/20 rule.
- A positive modifier makes checks easier ("Erleichterung").

## Rules for the rewrite (decided 2026-10-27)

The group plays semi-custom rules, not official DSA5. Principle: where the old app behaved
consistently, that behaviour stays. Where the implementations conflicted, the user decided case by case,
and every case went with the Würfelproben (`DiceCheck.vue`) behaviour. Manuelle Eingabe must use exactly
the same rules. There are no confirmation rolls anywhere.

**Talentprobe** (3W20, one per talent attribute; the modifier is added to each attribute, with no floor,
so a modified attribute can be ≤ 0):
1. Crits are checked first; the first matching rule wins:
   - two or more 1s → "Spektakulärer Erfolg!", success, FP = FW
   - two or more 20s → "Spektakulärer Patzer!", failure
   - exactly one 1 → "Kritischer Erfolg!", success, FP = FW (so a 1 beats a single 20)
   - exactly one 20 → "Patzer!", failure
2. Otherwise: points needed = Σ max(0, roll − modified attribute). Success if points needed ≤ FW;
   FP = FW − points needed.
3. QS on success: 0–3 → 1, 4–6 → 2, 7–9 → 3, 10–12 → 4, 13–15 → 5, 16+ → 6 (max 6). Failure → no QS.

**Eigenschaftsprobe** (already consistent; kept): 1 → "Kritischer Erfolg!" (success), 20 → "Patzer!"
(failure), otherwise success if roll ≤ attribute + modifier. FP = target − roll, same QS table.
Freies Würfeln uses the same rule per die against the raw attribute (it has no modifier input).

**Kampfprobe** (only one implementation; kept): AT = `at + atBonus + temp AT bonus`.
1 → "Kritischer Treffer!" (success), 20 → "Patzer!" (failure), otherwise success if roll ≤ AT.
On success: damage = `diceCount`×W6 + `tp.modifier` + temp TP bonus. On a crit, an optional extra 1W6
"Kritischer Schaden" is rolled and shown separately (not added to the damage). Dual wielding means two
independent AT rolls with separate damage and no penalty. No parry roll exists yet.
*Later decisions (2026-10-27):* the crit-damage W6 is offered for **either** hand when dual wielding (the
old app only offered it for the main hand), and a weapon's damage dice can be W4–W20 (default W6).

## Engine constants worth keeping (the "feel" was hand-tuned)

- Gravity −25, Rapier timestep 1/120, max 3 steps/frame, frame dt clamped to 0.1 s.
- Dice: convex hull from geometry (Icosahedron r=1 / Box 1), restitution 0.3, friction 0.8,
  density 2.0, linear+angular damping 0.5. Settle: every lin/ang velocity component < 0.01.
- Bowl: hexagon, floor radius 10, top radius 11, wall height 4. Floor trimesh restitution 0.1 /
  friction 1.0, walls restitution 0.5 / friction 0.2. Green noise "felt" canvas texture, walls 0.8 opacity.
- Throw (`diceRollerStore`): spawn on a circle at `angle`, `radius` 5–15 (default 10), height 8 + rand(0–2),
  dice spaced 2.5 apart perpendicular to the throw. Velocity toward the centre `velocityMagnitude` 5–30
  (default 15) ± 2 random, y = 8. Angular velocity random ±15 per axis.
  Respawn if a die falls below y = −5.
- Cameras (fov 45, one per die), states: `overview`/`rotating` (orbit r=18, +10 up, lerp 0.02),
  `following` (r=8, +5 up, lerp 0.05), `topdown` (5 above, slerp to straight down, lerp 0.1), held 5 s,
  then `rotating`.
- Table GLB: position (0, −35.8, 0), scale 17, rotation y −π/2.
- Lights: directional (5,10,5) with 2048² shadow map, ambient 0x404040, purple point light 0x9370DB.
  Skybox: canvas-generated star texture on a sphere r=1900.
- D20 face→number layout: `[20,8,14,2,16, 10,12,4,6,18, 19,7,13,1,15, 11,3,17,5,9]` in
  `IcosahedronGeometry` face order. D6: `[6,5,4,3,2,1]` for +Y, +X, +Z, −Z, −X, −Y.
- Audio: volume from relative collision speed (`speed^1.5 / 2`), 100 ms global cooldown, max 3 voices,
  playbackRate 0.7–1.3, separate sample for die↔bowl vs die↔die.
- Background worker: 40 shapes (icosahedra and cubes) on a ring, MeshPhysicalMaterial, user colours.

## Problems found

Checked in the running app:
- Manuelle Eingabe shows the selected talent as raw JSON next to "Ausgewählt:" and in every dropdown
  row. It passes `value-field="item => item"` to `SearchableDropdown`.

From reading the code (not reproduced):
- **Physics leak:** every roll calls `cleanupScene()` → `createHexagonalGround()`, which adds a *new*
  fixed body with floor + 6 wall colliders to the same Rapier world without removing the old ones.
  Colliders pile up over a session.
- **No roll lock:** clicking "Würfeln" during a roll tears down the scene mid-roll, and the earlier promise
  then resolves with the new dice's values.
- **No settle timeout:** a die that never drops under the threshold hangs the roll forever.
- **Sim speed 2x and 3x are identical on 60 Hz displays.** Speed changes the step *interval*
  (`(1/120)/speed`), but `world.timestep` stays 1/120 and steps are capped at 3 per frame, so both top
  out at 1.5x. The accumulator also grows without bound when capped.
- Wall colliders are thickened along world Z instead of each wall's normal, so some walls are thin.
- **Ghost character:** delete every character, then open Charakterwerte. `initializeStore()` (the legacy
  migration) reads the store's own persisted key and recreates a default character with id `1`.
- Attribute inputs allow 0–20, but the store silently clamps to 8–20.
- One WebGL context per visible die (up to 6) plus one for the background. Context-loss handling is a stub.
- Listener/resource leaks: `CharacterSelector` adds a window click listener on every mount and never removes it.
  `ThreeBackground` kills and recreates the worker and canvas on *every* resize event (no debounce) and never
  terminates the worker on unmount. `DiceRoller` registers `audioSystem.resumeAudioContext`, which doesn't exist.
- The table model is a module-level singleton shared across `DiceRoller` instances. A new instance only
  gets it back on its first roll.
- Three different persistence mechanisms (plugin, manual `localStorage`, deep watchers).
- Vue reactivity wraps Three/Rapier objects, so `markRaw` is scattered around to compensate.
- CSS: `App.vue` defines the global button/input/tab rules twice with different values. The `:deep()` dropdown
  overrides copied into three components target class names that `SearchableDropdown` doesn't have.
- 56 `console.log/warn` calls; worker `debug: true`; debug hotkeys in `DiceRoller` (W = wireframes,
  1 = toggle solid green background, 2 = camera far plane).
- `index.html` title is still "Tauri + Vue 3 App".

## Dead code

`services/diceService.js`, `composables/useCameraState.js`, `constants/checkTypes.js`;
`DICE_INITIAL_CONFIG` / `CHECK_CONFIGURATIONS` / most of `DICE_TYPES`; in `diceRollerStore` everything except
`throwConfig`, `getThrowPosition`, `getThrowVelocity`; in `characterStore` the duplicate weapon actions outside
`actions`, `getTalentByName`, and the top-level legacy fields; `useSceneSystem.addDiceWireframe`,
`updateSkyAnimation` (no shader uniforms exist), and the returned `showWireframes` (a fresh unrelated ref);
`D6Dice.updateDiceAppearance`, `DiceManager.updateDiceAppearance`; `WeaponsSection.diceTypes`;
`invoke` import in `App.vue`; Rust `greet` + shell plugin.

## Suggestions for the rewrite

1. **One pure, tested rules module** (attribute/talent/combat checks, QS, crits) implementing
   "Rules for the rewrite" above. Takes rolls in and gives results out. "Manuelle Eingabe" then becomes the same function with typed-in rolls. Unit-test it.
2. **Static catalog with stable IDs** for attributes and talents. Characters store only
   `{ talentId: value }`. Write a one-time importer for the old `character` blob. A JSON export/import
   would also be useful.
3. **Dice engine as a plain TS class, outside Vue:** build the scene and physics world once, and on each
   roll only add/remove dice bodies. Use a single WebGLRenderer drawing several viewports (scissor) instead
   of N contexts. API along the lines of `roll([{ type, appearance }]) → Promise<number[]>`, with a busy lock,
   a timeout or re-throw for cocked dice, and mixed dice types per roll.
4. **One persistence layer** with a schema version, covering every user setting.
5. Tooling: TypeScript, ESLint, Vitest, no stray logs.
6. Load the 28 MB table lazily (or compress it with Draco/meshopt) so it doesn't block the first roll.

## Platform and data decisions (2026-10-27)

- **Ship both:** a Tauri desktop app and a web version the user can host on their own website.
  The frontend builds to static files with no backend. Make the base path configurable (subfolder vs.
  subdomain) and keep all Tauri-specific code behind a small adapter.
- **The rewrite replaces the old code in the same repo** (`pyditn2/Pyditn-s-Dice-Thrower-Pro`), so
  existing users get it from the same Releases page.
- **Old characters must be imported automatically.** Checked on the user's Mac (installed PDTP 0.1.26):
  - Release data lives in `~/Library/WebKit/com.pdtp.app/…/LocalStorage/localstorage.sqlite3`,
    origin `tauri://localhost`. It has keys `character` (current multi-character format: 1 character,
    1 weapon), `squareColor` and `currentBackground`; there is no `diceAppearances`, since colours were
    never changed.
  - So the desktop rewrite must keep the identifier `com.pdtp.app` and Tauri's default custom-protocol
    origin. On Windows, don't change `useHttpsScheme`, because that moves the origin and the old
    localStorage becomes unreachable.
  - On first launch, read the old keys, convert them to the new schema, and leave the old keys in
    place as a backup. Handle the current format plus the legacy single-character shape that
    `initializeStore()` migrated.
  - `dsa-characters` exists only in dev-build data (`~/Library/WebKit/pdtp`) and was never committed,
    so ignore it.
- **Desktop and web storage are separate** (different origins), so neither can read the other's
  characters automatically. Add JSON export/import, which is also the backup path for the web, where
  browsers may evict site storage. Ask for `navigator.storage.persist()`.
- **Versioning:** old releases are tagged up to `v0.1.27`, plus an early `PDTP-v1.0.0` tag (2024-12-06).
  Release the rewrite as **2.0.0**, so it sorts above both and Windows installers treat it as an upgrade.

- **Stack:** stay on Vue 3, now with TypeScript.
- **Fallback:** if automatic import ever fails, characters can still move via export/import. The old
  app has no export button, though, so automatic import is the only path that needs nothing from users.

## Open questions

- Where and how is the user's website hosted (affects base path and whether CI can deploy the web build)?
- Features to add or drop: parry (PA) rolls, other dice (W4–W12, mixed pools), roll history, …?

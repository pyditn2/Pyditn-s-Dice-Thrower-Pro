# PDTP 2.0 – rewrite plan

Built on the decisions in [original-app-notes.md](original-app-notes.md): house rules = old Würfelproben
behaviour, Tauri desktop + static web build, automatic import of old characters, JSON export/import,
release as 2.0.0 replacing the old code in `pyditn2/Pyditn-s-Dice-Thrower-Pro`.

## Stack

Vue 3.5 (`<script setup lang="ts">`, strict TS) · Vite 8 · Pinia 4 · vue-router 5 (hash history, so
deep links work on any static host and inside Tauri) · three r186 · `@dimforge/rapier3d-compat` 0.21 ·
Vitest · ESLint + vue-tsc · Tauri 2.12 (+ dialog/fs plugins for export/import on desktop).

Scaffold with `create-vue` and keep the TypeScript version it picks. TypeScript 7 (the native compiler)
is out, but check that `vue-tsc` supports it before moving to it. Rapier jumps from 0.14 to 0.21, so expect
small API changes, and re-check that the dice still *feel* the same.

## Architecture

The rule is that Vue never owns Three/Rapier objects, and game rules never depend on Vue.

```
src/
  domain/          pure TS, no Vue, fully unit-tested
    catalog.ts       attributes + 59 talents with stable IDs (e.g. 'koerperbeherrschung'),
                     German display names, attribute triples, categories
    types.ts         Character, Weapon, check inputs/results
    rules/           attributeCheck, talentCheck, combatCheck, damage, qualityLevel
  engine/          plain TS classes, no Vue
    DiceEngine.ts    owns ONE scene, ONE physics world, ONE WebGLRenderer.
                     roll(dice: DieSpec[]) → Promise<number[]>, with a busy lock, a settle timeout
                     and a re-throw for cocked dice; mixed die types per roll
    bowl.ts, dice/ (d6, d20 geometry + face labels + face reading), cameras.ts (per-die camera
                     director drawn as scissored viewports), audio.ts, assets.ts (lazy table GLB)
    constants.ts     all tuned numbers from the old app, in one place
  persistence/
    schema.ts        versioned save format (v1)
    storage.ts       localStorage-backed load/save with migrations
    legacyImport.ts  reads old keys (character, diceAppearances, diceAppearancePrefs,
                     currentBackground, hexagonColor, squareColor) → v1; leaves old keys untouched
    exportImport.ts  character/all-data JSON files (also accepts old-format JSON)
  platform/        isTauri(), saveFile(), openFile(), with web and Tauri implementations
  stores/          Pinia setup stores: characters, settings (appearance, throw, speed, audio, background)
  components/      DiceStage.vue (hosts the engine canvas), SearchSelect.vue (accessible
                   combobox), NumberField.vue, ResultCard.vue, …
  views/           ChecksView, FreeRollView, ManualCheckView, CharacterView
  background/      animated background worker (ported, with debounced resize and cleanup)
src-tauri/         fresh Tauri 2 project: identifier com.pdtp.app, productName PDTP, version 2.0.0,
                   default origin/scheme (needed for the import)
```

New character shape (talents by ID instead of copying the catalog into every save):

```ts
interface Character {
  id: string
  info: { name: string; species: string; culture: string; profession: string }
  attributes: Record<AttributeId, number>      // MU KL IN CH FF GE KO KK
  talents: Record<TalentId, number>            // FW per talent
  weapons: Weapon[]
}
interface Weapon {
  id: string; name: string; type: string; notes: string
  at: number; pa: number; atBonus: number; paBonus: number
  damage: { count: number; modifier: number }  // W6, as before
}
```

## Milestones

Each milestone ends in something runnable or testable.

0. **Scaffold.** `git init`, create-vue (TS, Pinia, Router, Vitest, ESLint), Tauri 2 shell with the right
   identifier/version, CI that runs lint, type-check and tests, a README.
1. **Domain and rules.** Catalog plus all checks, with tests written straight from "Rules for the rewrite",
   including the edge cases (1 and 20 together, two 20s and a 1, modifier pushing an attribute ≤ 0,
   QS boundaries 3/4, 6/7 … 15/16).
2. **Persistence and import.** v1 schema, legacy importer, JSON export/import. Tests use a fixture with
   the same shape as the real old data (fake values), plus the legacy single-character shape and the
   "Menschkenntnis" typo.
3. **Dice engine.** Port bowl, dice, cameras and audio with the old constants; one renderer with
   viewports; busy lock and timeout; a small dev page to roll and tune. Compare the feel side by side
   with the old app (`pdtp-original` launch config).
4. **Screens.** Würfelproben (attribute/talent/combat incl. dual wielding, damage, crit/extra W6),
   Freies Würfeln, Manuelle Eingabe (same rules functions), Charakterwerte, options menu,
   throw settings, background. Every user setting is persisted.
5. **Ship-ready.** Web build with a configurable base path, a compressed table model, and a request for
   persistent storage; adapt the release workflow (desktop builds, maybe web deploy once hosting is known);
   check off the parity checklist below.
6. **Replace.** In the old repo: a branch that removes the old code and adds the new, then a PR,
   then release 2.0.0.

### Testing the real import safely

Running the new desktop app on this Mac with identifier `com.pdtp.app` reads *and writes* the same
storage as the installed PDTP 0.1.26. Back up `~/Library/WebKit/com.pdtp.app` before the first test
run. Windows and Linux use the same identifier-based locations but can't be checked here; ideally one
group member on Windows tries a release candidate first.

## Parity checklist (old features that must still exist)

- [x] Character create / switch / delete (with confirm); info fields; 8 attributes (8–20); 59 talents; weapons
- [x] Eigenschaftsprobe with modifier, attribute-coloured die
- [x] Talentprobe with modifier, 3 dice in 3 views, talent or attribute colours (setting)
- [x] Kampfprobe: weapon pick, temp AT/TP bonus, dual wielding, damage roll, crit damage W6, extra W6
- [x] Freies Würfeln: 1–6 × W20/W6, optional attribute per W20, sum
- [x] Manuelle Eingabe: talent + three typed rolls + modifier
- [x] Throw settings (angle, distance, strength), sim speed, mute, dice colours + reset, animated background + colours
- [x] Camera behaviour: follow → top-down on settle → slow orbit; camera reset button
- [x] Collision sounds (die↔die, die↔bowl); table model + starry sky
- [x] Old data imported on first launch (characters, background settings, dice colours)

## Status (2026-10-27)

Milestones 0–4 are done and most of 5. The parity list above is implemented and was checked in the
browser, except the collision sounds (implemented, not listened to).

Verified:
- 52 unit tests, including the rules compared roll-by-roll against the old Würfelproben logic for all
  8,000 three-die combinations in five scenarios, and the legacy importer.
- The importer against the user's real old save (counts, weapons and talent sums match; no unknown talents).
- In the browser: import of an old-format save on first start, all four tabs, dual wielding with
  damage, a 1/20 edge case in Manuelle Eingabe, phone width (375 px).
- `npm run build` (web) and `npm run tauri build` (macOS app, identifier com.pdtp.app, 2.0.0).

Small behaviour changes made during the rewrite (beyond the agreed rules):
- Dual wielding rolls both attack dice at once (two views) instead of one after the other.
- Sim speed 2x/3x now really is 2x/3x (before, both were capped at about 1.5x on 60 Hz screens).
- Dice leaning against a wall get nudged until they lie flat; stuck dice are nudged after 12 s and
  re-thrown after 25 s; dice can no longer pass through the walls.
- Animated background: one reflection environment instead of 40 spotlights (8 → 120 fps here); it
  looks very close to before.
- Table model compressed from 29 MB to 2.6 MB (textures max 2048 px).
- W20 faces show an underline under 6 and 9.
- The character bar is also shown on "Charakterwerte".
- Throw settings are saved; attribute inputs enforce 8–20 like the store always did.
- Messages appear inline instead of browser alert popups.
- Typos fixed: "Gewandtheit", "Brett- und Glücksspiel".

Added after review (user's choices):
- Critical damage can be rolled for both hands when dual wielding.
- New dice W4, W8, W10 and W12 (plus W6/W20) in Freies Würfeln and as weapon damage dice. Not wanted for
  now: Paradeprobe, Würfelverlauf, Intel-Mac build.

Still to do:
- Test the real import with the desktop app on this Mac (back up `~/Library/WebKit/com.pdtp.app` first).
- Have someone test a Windows build before releasing.
- Milestone 6: replace the old code in the repo and release 2.0.0.

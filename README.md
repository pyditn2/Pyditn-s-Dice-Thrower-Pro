# PDTP – Pyditn's Dice Thrower Pro

A dice roller for **DSA 5 (Das Schwarze Auge)** with physically simulated 3D dice. Runs as a
desktop app (Tauri) and in the browser. The UI is German.

- **Würfelproben:** Eigenschaftsprobe, Talentprobe and Kampfprobe (incl. dual wielding and damage)
- **Freies Würfeln:** 1–6 dice from W4 to W20, W20 optionally checked against attributes
- **Manuelle Eingabe:** evaluate a talent check rolled with real dice
- **Charakterwerte:** characters with attributes, 59 talents and weapons; JSON export/import

The check rules are the group's house rules (see
[docs/original-app-notes.md](docs/original-app-notes.md#rules-for-the-rewrite-decided-2026-10-27)),
implemented in [src/domain/rules.ts](src/domain/rules.ts) and tested against the old app's behaviour.

## Development

Requires Node 22.18+ (or 24) with **npm 11** (npm 10 fails to resolve this dependency tree), and Rust for
the desktop app.

```sh
npm install
npm run dev          # browser version on http://localhost:1430
npm run tauri dev    # desktop app
npm test             # unit tests
npm run lint
npm run build        # type-check + production build into dist/
npm run tauri build  # desktop installers
```

## Hosting the web version

`npm run build` produces a static site in `dist/` (relative paths, hash routing), so it works from any
folder on any web host: upload the contents of `dist/`. Every GitHub release also contains it as
`PDTP-web.zip`. Characters are stored in the browser; use export/import to move them between the
desktop app and the website.

## Project layout

```
src/
  domain/       attributes, talent catalog, character model, check rules (pure TS, tested)
  persistence/  versioned save format, import of the old app's data, JSON export/import
  engine/       3D dice: three.js + Rapier physics, cameras, sounds (no Vue)
  stores/       Pinia stores for characters and settings
  components/   UI building blocks; DiceStage shows the engine's views
  views/        the four tabs
  background/   animated background (Web Worker + OffscreenCanvas)
  platform/     file dialogs (Tauri) vs. download/upload (browser)
src-tauri/      desktop shell (identifier com.pdtp.app – keep it, see below)
```

## Data from the old app (≤ 0.1.x)

On first start, the app imports characters and settings from the old version's storage and leaves the
old data in place. This only works because the desktop app keeps the identifier `com.pdtp.app` and
Tauri's default origin; changing either (or `useHttpsScheme` on Windows) would lose access to the old
data. Tauri warns that identifiers ending in `.app` are discouraged on macOS – that is expected here.

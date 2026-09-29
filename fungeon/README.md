# Fungeon 🍄

A cozy, crunchy, mobile-first roguelike deckbuilder. Guide **Pip**, a brave little button mushroom,
through three biomes (Mossy Hollow, Glowcap Caverns, The Blight), build a deck from 68 cards and
beat six bosses.

- **Four interlocking archetypes:** Rot (poison), Garden (plants that grow and bloom), Compost →
  Nutrients (exhaust fuels powerful Bloom-cost cards) and Spore tokens.
- 38 hand-drawn SVG creatures, 33 keepsakes, 13 brews, 14 events, 10 Blight difficulty levels.
- Plays offline as an installable PWA; the run auto-saves after every action.
- Synthesized sound effects and generative music (WebAudio, no audio files).

## Play

```sh
npm install
npm run build        # dist/ (PWA) — `npm run build:single` also writes dist/fungeon.html (one self-contained file)
node scripts/serve.mjs   # http://localhost:4173
```

It is deployed with the rest of the site to GitHub Pages at `/fungeon/` (see `.github/workflows/deploy.yml`).

## Develop

```sh
npm run typecheck
npm test             # engine, content-integrity and view tests
npm run sim -- --runs 200 --jobs 4 [--blight N] [--compare] [--card-test]   # balance simulator
```

| Path | What |
|---|---|
| `DESIGN.md` | Game design document: rules, keywords, economy, style guide, enemy roster |
| `src/engine/` | Pure, deterministic game engine. `act(run, action)` is the only mutator; returns events for animation |
| `src/content/` | Cards, powers, keepsakes, brews, statuses, enemies, encounters, events (data + hooks) |
| `src/art/` | All SVG art (creatures, illustrations, icons) and WebAudio sound/music |
| `src/ui/` | React UI: screens, animation queue, persistence |
| `src/sim/` | Headless heuristic bot + balance report (win rate, death floors, per-encounter HP loss, card/relic stats) |
| `notes/` | Research, per-area design notes and balance findings |
| `scripts/` | Playwright helpers: `play.mjs` (bot through the UI), `fullrun.mjs` (full run with `?dev` cheats), `drive.mjs` (step-by-step), `gallery.mjs` (art gallery) |

### Balance (bot, 200–400 runs per level)

| Blight | Bot win rate |
|---|---|
| 0 | ~45% |
| 5 | ~33% |
| 10 | ~23% |

Tuning follows the Slay the Spire approach: per-floor death histograms, HP lost per encounter and
card/relic performance deltas — see `notes/research.md` and `notes/engine.md`.

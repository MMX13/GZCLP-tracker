# Genre research notes (lead)

Sources: Slay the Spire GDC 2019 "Metrics Driven Design and Balance" (A. Giovannetti, Mega Crit),
Wildfrost / Monster Train mobile ports (touch readability, crisp telegraphing), general genre knowledge.

## Lessons applied
- **Metrics-driven balance.** StS tuned with per-floor death histograms, per-encounter HP loss,
  and card/relic pick-rate vs. win-rate. → Fungeon ships a headless simulator (`npm run sim`) with a
  heuristic bot that reports win rate, death floor histogram, avg HP lost per encounter, and card/relic
  win-rate deltas. Tune outliers, not averages.
- **"Every card should have its place."** No strictly-dominated cards; each common must be a
  reasonable pick in some deck. Rares may break rules.
- **Telegraphing makes difficulty fair.** Exact intents; charge-up turns before spikes; boss gimmicks
  explained in a passive tooltip.
- **Ascension ladders extend life.** Small cumulative modifiers (Blight levels) instead of new content.
- **Mobile:** big readable numbers, tap-to-inspect everything, minimal simultaneous information,
  short runs (Wildfrost's "brisk runs"), auto-save each action.
- **Skipping is a skill.** Card rewards always skippable; removal priced to be attractive.

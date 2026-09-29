# Engine notes (engine engineer)

Files: `src/engine/{rng,registry,cardutil,combat,map,rewards,shop,events,run,views,save,index,autoplay,testutil}.ts`,
`src/content/statuses.ts` (core statuses). Tests: `npx tsx --test src/engine/*.test.ts`.

## Public API (import from `src/engine` = index.ts)
`newRun({seed?, ascension?, now?})`, `act(run, action) -> {run, events, error?}` (input never mutated; invalid action => `error`,
the SAME run object back and `events: []`), `cardView`, `upgradedView`, `intentView`, `statusViews`, `eventView`, `selectableNodes`,
`glossary`, `serialize`/`deserialize` (null when corrupt), plus extras: `restInfo(run)` (heal amount / whether Rest heal is available),
`engineLog` (`{errors: string[], quiet}` - exceptions thrown by content hooks are caught and recorded here), the registry test hooks
(`registerCard`, `clearRegistry`, `resetRegistry`, `allCards`, ...), `src/engine/autoplay.ts#randomAction(run, rnd)` (a dumb legal-action
picker for any screen; reusable by the simulator) and `src/engine/testutil.ts` (fixture content + scenario helpers for tests).
Production engine code reads content ONLY through `src/engine/registry.ts`.

## Determinism
Seeds are hashed per stream (`map, combat, rewards, shop, events, misc`) into uint32 mulberry32 states in `run.rng`.
Same seed + same actions => identical run and identical events (`stats.startedAt` aside: pass `now` to `newRun`).

## Conventions the UI must know
* **Screens** flow: `map -> combat -> reward -> map`; boss: `reward -> (leaveRewards) -> bossRelic -> (pickBossRelic id|null) -> map (next act, heal 75% of missing HP)`;
  act 3 boss => `victory` directly (no rewards). `rest`: `rest{option}`; upgrade opens `cardSelect` (canSkip) and returns to `{kind:'rest', done}`.
  `proceed` leaves rest/shop/(opened) treasure, or `leaveRewards`. Shop removal opens a `cardSelect` (canSkip, nothing is charged if skipped).
  Events: first page id is `start` (or the first key). Combat choices use `{type:'choose', uids}`; so does `cardSelect` (`uids: []` skips when `canSkip`).
* **Combat state after act()** is the final state after the whole action (e.g. after `endTurn` it is already the player's next turn). Animate from `events`.
  Dead enemies stay in `combat.enemies` with `alive:false`. Playing a card auto-targets when exactly one enemy lives.
* **Event order** for a played card: `energy`/`nutrients` (payment), `play`, effect events (`damage`, `block`, `status`, `draw`, `newCard`, ...),
  then the destination: `plant` (slot) / `compost` + `nutrients` / `discard`. Power cards emit nothing after `play` (they vanish, no Nutrient).
  `draw` = cards moved draw->hand (also used for toHand moves), overflow cards (hand full) come as `discard`. `shuffle` is emitted before the
  first `draw` batch that follows it. Block/energy resets at turn start are NOT separate events - a `turn` event marks them.
  `damage.amount` = HP lost, `blocked` = block absorbed, kinds: attack / rot / hp / thorns. Out-of-combat damage/heal (events, rest) uses the same events with target 'player'.
* **Card text**: see the header of `src/engine/views.ts`. Keywords in `keywords` are appended by the view ("Compost.") - do not write them in `text`;
  "Plant (N)." / "Perennial." are appended automatically; `{dmg*}`/`{blk*}` are modified live; unchanged numbers are merged into plain segments.
* `cardView(card, run, target?)`: `playable/reason` are evaluated against the current combat (only meaningful for cards in hand).
* Errors from `act()` are short player-facing strings ("Not enough Spores.", "No free plot in your Garden.", ...).

## Rules decisions (where DESIGN/types left room)
* **Damage**: `floor((base + Might, then relic/status modifyAttack) x Wilted .75 x Soggy 1.5 x blight)`; Block: `floor((base + Sturdy, then modifyBlock) x Brittle .75)`.
  Blight 7 (+10% normal enemy damage) and blight 4 (+10% boss-fight damage) are engine-side multipliers. HP scaling by fight kind (normal L2, elite L3, boss L4).
  Blight 10: act-3 boss gets Growing 2 at 50% HP (engine adds it once, `mem.blight10`).
* **Prickly** is native (thorns hit the attacker after the attack, absorbed by Block, no recursion). **Rot** is native (kind 'rot'). Regrow / Shelled / Growing are hook-based (content/statuses.ts).
* **Status decay ('turn')**: only statuses that existed when the owner's turn-end (enemy: turn-start) sequence began tick down, so a status gained
  by an end-of-turn hook (Doubt's Wilted) survives the next turn. Statuses applied during the owner's own turn DO tick at its end.
  Soggy/Wilted/Brittle on the player tick at player turn end; on enemies at the end of the enemy's own turn. Armored (N) keeps Block for N owner-turn starts.
* **Hooks**: `n` = stacks (statuses) / relic counter / 0 (enemy `hooks`). Order: player relics, player statuses, then each living enemy's statuses + `EnemyDef.hooks`.
  Owner-only hooks: onTurnStart, onTurnEnd, onAttacked, onHpLoss, onAfterDraw(player), onCombatStart/End(player). Broadcast to everyone (api.self = that owner):
  onCardPlayed, onCompost, onPlant, onBloom, onApplyRot, onEnemyDeath (also the dying enemy's own hooks), onShuffle. Nested hook depth is capped at 20.
  `onAttacked` fires even when fully blocked (dealt 0). Turn order on turn 1: energy refill, onTurnStart, garden, draw, onAfterDraw, onCombatStart.
* **Victory check** runs after death hooks (revive/split work). `api.spawnEnemy` works anywhere (max 7 living). `loseHp(uid, 999)` on an enemy = normal death.
* **Plants**: `growPlants(n)`/`growPlant(slot, n)` = n growth ticks (each: +1, `grow` event, `onGrow`, bloom check); perennials tick at most once per call;
  blooms update `counters.bloomsCombat` synchronously; bloomed plants go to discard (or Compost if they have the keyword).
* **Choices**: no candidates => silently skipped (afterChoice not called); `min/max` are clamped to the candidate count and stored clamped in `combat.pending`.
  Only one pending choice at a time (a second `api.choose` while pending is ignored with a console.warn). Choices are ignored outside the player's action window / from enemy code.
* Reward pity: `rareOffset` +1 per non-rare card rolled, reset on a rare (not touched by boss rewards). Potion chance 40 -10/+10, clamped 0..100, none from bosses.
* Rest heal: 30% (25% at blight 5) + sum of relic `restHealBonus` (percentage points); `noHealAtRest` disables the heal button (`restInfo.canHeal`). Shop discount is a fraction.
* Shop: 2 common, 2 uncommon, 1 rare (one random card at 50%), 3 keepsakes (last slot = 'shop' rarity if any exist), 3 brews.
* Unknown card ids never crash (inert unplayable placeholder), so old saves survive content renames.

## Requests / workarounds for types.ts (not edited)
* (Resolved) `RunState.removals?: number` now counts shop removals (the old `#removals=N` seenEvents hack is gone).
* GameEvent has no event for enemy block reset or for "power card vanished"; the UI infers both from state/`turn` events.

## Known gaps
* `Reward` items are marked `taken` when skipped as well; UI should treat `taken` cards as gone.
* No undo / no mid-turn save of `PendingChoice` for potions (potions can't open choices - `sourceCardId` is unset, so no afterChoice).
* Boss relic rarity 'event' relics are only obtainable through events (`randomRelicId('event')` is supported).

## Simulator (src/sim, `npm run sim -- --runs 200 --blight 0 [--compare] [--picks rated|random|none] [--verbose --index N] [--card-test --per 30]`)
Heuristic bot (`bot.ts`): beam search over card sequences with the real engine on a clone whose draw pile is re-shuffled (no peeking), scored by
`evalState`; ratings in `ratings.ts`. Reports to stdout and /tmp/claude-0/sim-report.json (card test: /tmp/claude-0/sim-cardtest.json).

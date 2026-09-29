# UI notes / requests to other modules

## Assumptions the UI makes (please confirm or adjust)
- `act()` events for a combat action are ordered chronologically. The UI plays them one by one; `damage.hpAfter/blockAfter`,
  `status.after`, `energy.after`, `nutrients.after` drive the intermediate display (HP bars etc).
- When the last enemy dies the engine may switch `run.screen` straight to `reward` (or `bossRelic`, `victory`). The UI keeps
  drawing the OLD combat screen until the event queue (incl. `enemyDie`, `victory`) has played. If instead the screen stays
  `combat` with `phase: 'won'|'lost'`, the UI shows a Continue button that sends `{type:'proceed'}`; please make that valid.
- Card select "Skip" sends `{type:'choose', uids: []}` when `canSkip` is true.
- `takeReward` for a card reward is sent with `cardIndex`; `skipReward` for skipping that card reward.
- Rest: `{type:'rest',option:'upgrade'}` should switch to a `cardSelect` (purpose upgrade); UI shows current vs `upgradedView` there.
- Shop: `shopRemove` should switch to a `cardSelect` (purpose remove) and returnTo the shop.
- Combat `pending` choices: UI sends `{type:'choose', uids}` with the picked card uids (for `from:'options'`, the option uids).
- `statusViews(run,'player')` and `statusViews(run,enemyUid)` are used for status icons (numbers overridden by event `after` values while animating).
- `serialize` must produce a string; `deserialize` returns null on garbage. The UI saves after every action and clears on victory/defeat.
- Profile (localStorage `fungeon.profile.v1`): unlocked Blight, stats, seen ids. Save key `fungeon.run.v1`.

## Audio
SfxName is the full union in the original contract (click, card, draw, ...). art/audio.ts currently only exports 'click'; the UI calls all names.

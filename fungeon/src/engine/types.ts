// The shared contract between engine, content and UI. Everything in RunState is plain JSON (saved to localStorage).
// Content definitions (cards, enemies, ...) are code and are looked up by id, never stored in state.

// ---------------------------------------------------------------------------------------------------------------
// Basic ids

/** 'player' or an enemy's uid (e.g. 'e3'). */
export type EntityId = string;
export const PLAYER: EntityId = 'player';

export type StatusId = string; // e.g. 'might', 'rot', 'soggy' - see STATUS ids below and content/statuses.ts
export const S = {
  might: 'might',
  sturdy: 'sturdy',
  prickly: 'prickly',
  regrow: 'regrow',
  soggy: 'soggy',
  wilted: 'wilted',
  brittle: 'brittle',
  rot: 'rot',
  shelled: 'shelled',
  growing: 'growing',
  armored: 'armored',
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Cards

export type CardType = 'attack' | 'skill' | 'power' | 'plant' | 'status' | 'curse';
export type Rarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'token' | 'special';
/** enemy: needs a chosen enemy target. none: no target (self / all / random). */
export type TargetMode = 'enemy' | 'none';
export type Keyword = 'compost' | 'fleeting' | 'keep' | 'innate' | 'unplayable';

/** A card as stored in a deck or pile. */
export interface CardInstance {
  uid: number;
  id: string; // CardDef id
  upgraded: boolean;
  /** Temporary cost override for this combat (e.g. "costs 0 this turn"). Cleared at end of combat. */
  costOverride?: number;
  /** If true the costOverride only lasts until the card is played or the turn ends. */
  costOverrideTurn?: boolean;
}

/** Values of a card after upgrade resolution, e.g. { dmg: 9, hits: 2 }. */
export type Vals = Record<string, number>;

export interface PlantDef {
  /** Growth needed to bloom. null = Perennial (never blooms). */
  grow: number | null;
  /** Called each player turn start after growing +1 (before blooming check). `growth` is the new growth. */
  onGrow?: (api: Api, v: Vals, growth: number) => void;
  /** Called once when growth >= grow. Afterwards the card goes to the discard pile. */
  onBloom?: (api: Api, v: Vals) => void;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  rarity: Rarity;
  /** Spore (energy) cost. -1 = unplayable / no cost shown. 'X' = spends all spores, v.x is set to amount spent. */
  cost: number | 'X';
  /** Upgraded cost (if it changes). */
  upCost?: number;
  /** Nutrient ("Bloom") cost, spent in addition to spores. */
  nutrients?: number;
  upNutrients?: number;
  target: TargetMode;
  /** Base numeric values. Referenced from text as {key}. */
  vals: Vals;
  /** Overrides applied when upgraded (only keys that change). */
  up?: Vals;
  /**
   * Rules text template. {key} is replaced by the value. Special keys:
   *   {dmg*}  any key starting with 'dmg' is shown modified by the player's Might/Wilted and target's Soggy.
   *   {blk*}  any key starting with 'blk' is shown modified by Sturdy/Brittle.
   * Keywords are written in the text as plain words (Compost, Rot, Keep...) - the UI highlights known words.
   * Keep it short: max ~70 characters. Use "\n" sparingly.
   */
  text: string;
  /** Text when upgraded, if the wording (not just numbers) changes. */
  upText?: string;
  keywords?: Keyword[];
  /** Keywords when upgraded (replaces keywords). */
  upKeywords?: Keyword[];
  /** Plant cards only. */
  plant?: PlantDef;
  /** Main effect. target is set when target === 'enemy'. */
  play?: (api: Api, v: Vals, target: EntityId | undefined) => void;
  /** Called after a pending choice started by this card (api.choose) resolves. */
  afterChoice?: (api: Api, v: Vals, chosen: CardInstance[]) => void;
  /** Extra condition to be playable (e.g. "only if you have 5 nutrients"). Return reason text if not playable. */
  canPlay?: (api: Api, v: Vals) => string | null;
  /** Hook while in hand at end of turn (Mold etc). */
  onEndTurnInHand?: (api: Api, v: Vals) => void;
  /** Art key from ART_KEYS. */
  art: ArtKey;
  /** Short flavor line, optional. */
  flavor?: string;
}

// ---------------------------------------------------------------------------------------------------------------
// Statuses, relics (Keepsakes), potions (Brews) share one hook interface.

export interface Hooks {
  /** Player combat start (after opening draw). */
  onCombatStart?: (api: Api, n: number) => void;
  /** Start of owner's turn (player: after energy refill, before garden & draw). */
  onTurnStart?: (api: Api, n: number) => void;
  /** Player only: after the turn-start draw. */
  onAfterDraw?: (api: Api, n: number) => void;
  /** End of owner's turn (before hand discard for player). */
  onTurnEnd?: (api: Api, n: number) => void;
  /** Player played a card (after its effect resolved). */
  onCardPlayed?: (api: Api, n: number, card: CardInstance, def: CardDef) => void;
  /** A card was composted (exhausted) from anywhere. */
  onCompost?: (api: Api, n: number, card: CardInstance) => void;
  /** A plant was planted / bloomed. */
  onPlant?: (api: Api, n: number, card: CardInstance) => void;
  onBloom?: (api: Api, n: number, card: CardInstance) => void;
  /** Owner was hit by an attack (after block). dealt = hp lost. attacker is the source. */
  onAttacked?: (api: Api, n: number, attacker: EntityId, dealt: number) => void;
  /** Owner lost HP from any source (dealt > 0). */
  onHpLoss?: (api: Api, n: number, dealt: number) => void;
  /** Rot was applied by the player to an enemy. */
  onApplyRot?: (api: Api, n: number, target: EntityId, amount: number) => void;
  /** An enemy died. */
  onEnemyDeath?: (api: Api, n: number, enemy: EntityId) => void;
  /** Player won the combat (still in combat state). */
  onCombatEnd?: (api: Api, n: number) => void;
  /** Player's shuffle of discard into draw pile. */
  onShuffle?: (api: Api, n: number) => void;
  /** Modify outgoing attack damage before Wilted/Soggy (player relics/powers only). */
  modifyAttack?: (n: number, base: number, api: Api, target: EntityId) => number;
  /** Modify block gained from cards before Brittle. */
  modifyBlock?: (n: number, base: number) => number;
}

export interface StatusDef extends Hooks {
  id: StatusId;
  name: string;
  kind: 'buff' | 'debuff';
  /** Description for tooltip, n = stacks. */
  desc: (n: number) => string;
  /** 'turn' = decreases by 1 at the end of the owner's turn. 'none' = permanent. Rot/Regrow handle themselves. */
  decay: 'turn' | 'none';
  /** Icon art key. */
  icon: ArtKey;
  /** Whether the number is shown (false for flag statuses). */
  showNumber?: boolean;
}

export type RelicRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'shop' | 'event';
export interface RelicDef extends Hooks {
  id: string;
  name: string;
  rarity: RelicRarity;
  desc: string;
  flavor?: string;
  icon: ArtKey;
  /** One-shot effect when picked up (outside combat) - e.g. +max hp. */
  onPickup?: (run: RunState) => void;
  /** Passive run modifiers the engine reads. */
  passive?: {
    maxEnergy?: number; // +spores per turn
    handSize?: number; // +cards drawn per turn
    gardenPlots?: number; // +plots
    restHealBonus?: number; // +% heal at rest
    shopDiscount?: number; // 0.2 = 20%
    cardRewardChoices?: number; // +choices
    noHealAtRest?: boolean;
    potionSlots?: number;
  };
}

export interface PotionDef {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare';
  desc: string;
  target: TargetMode;
  icon: ArtKey;
  /** Only usable in combat unless outOfCombat is set. */
  use: (api: Api, target: EntityId | undefined) => void;
  outOfCombat?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// Enemies

export type IntentKind = 'attack' | 'block' | 'buff' | 'debuff' | 'summon' | 'sleep' | 'unknown' | 'escape';

export interface EnemyMove {
  name: string;
  /** Shown intent icons. Damage numbers come from dmg/hits. */
  intents: IntentKind[];
  /** Base damage per hit, shown in the intent (modified). */
  dmg?: number;
  hits?: number;
  /** Executes the move. Use api.attack(PLAYER, ...) for the damage so modifiers apply. */
  run: (api: Api, self: EnemyState) => void;
}

export interface EnemyDef {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  tier: 'normal' | 'elite' | 'boss' | 'minion';
  hp: [number, number];
  art: string; // enemy art component key (defaults to id)
  moves: Record<string, EnemyMove>;
  /** Picks the next move id. history = previous move ids (most recent last). */
  ai: (ctx: EnemyAiCtx) => string;
  /** Called when spawned at combat start (apply starting statuses). */
  onSpawn?: (api: Api, self: EnemyState) => void;
  /** Passive hooks for this enemy (e.g. when hit...). n is unused (0). */
  hooks?: Hooks;
  /** Tooltip text for passive abilities. */
  passiveText?: string;
  /** Draw scale (1 = normal ~ 120px tall; bosses ~1.4). */
  scale?: number;
}

export interface EnemyAiCtx {
  self: EnemyState;
  history: string[];
  turn: number; // 1-based enemy turn number
  rng: () => number;
  combat: CombatState;
  /** Helper: pick a move by weights, but never pick one that appears `maxRepeat` times in a row at the end of history. */
  weighted: (weights: Record<string, number>, maxRepeat?: number) => string;
  lastMove: () => string | undefined;
}

export interface EnemyState {
  uid: EntityId;
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Record<StatusId, number>;
  intent: string | null; // move id
  history: string[];
  alive: boolean;
  /** Free-form per-enemy memory for AI (JSON only). */
  mem: Record<string, number>;
}

// ---------------------------------------------------------------------------------------------------------------
// Combat state

export interface PlantState {
  card: CardInstance;
  growth: number;
}

export interface PendingChoice {
  /** Card uid whose afterChoice runs after the choice (or undefined for engine-level choices). */
  sourceCardId?: string;
  sourceUpgraded?: boolean;
  prompt: string;
  from: 'hand' | 'draw' | 'discard' | 'compost' | 'options';
  /** Explicit candidate uids (e.g. when choosing from generated cards). */
  candidates: number[];
  /** For from==='options': generated cards to choose among (not yet in any pile). */
  options?: CardInstance[];
  min: number;
  max: number;
  /** Built-in action applied to chosen cards before afterChoice. */
  action: 'compost' | 'discard' | 'topdeck' | 'upgrade' | 'toHand' | 'none';
}

export interface PlayerCombat {
  hp: number;
  maxHp: number;
  block: number;
  statuses: Record<StatusId, number>;
  energy: number;
  maxEnergy: number;
  nutrients: number;
}

export interface CombatState {
  kind: 'normal' | 'elite' | 'boss';
  encounterId: string;
  turn: number; // player turn number, starts at 1
  phase: 'player' | 'won' | 'lost';
  player: PlayerCombat;
  enemies: EnemyState[];
  draw: CardInstance[]; // index 0 = top
  hand: CardInstance[];
  discard: CardInstance[];
  compost: CardInstance[];
  garden: (PlantState | null)[];
  pending: PendingChoice | null;
  /** Counters for this turn / combat. */
  counters: {
    cardsPlayedTurn: number;
    attacksPlayedTurn: number;
    cardsPlayedCombat: number;
    compostedCombat: number;
    bloomsCombat: number;
    damageTakenCombat: number;
  };
  /** Per-combat memory for relics / powers (JSON only). */
  mem: Record<string, number>;
  nextEnemyUid: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Map & run

export type NodeType = 'fight' | 'elite' | 'rest' | 'shop' | 'event' | 'treasure' | 'boss';

export interface MapNode {
  id: string; // `${floor}-${lane}`
  floor: number; // 1..11 (11 = boss)
  lane: number; // 0..4
  type: NodeType;
  next: string[]; // ids on floor+1
}

export interface MapState {
  act: 1 | 2 | 3;
  nodes: Record<string, MapNode>;
  /** Current node id (null before the first pick in an act). */
  current: string | null;
  visited: string[];
  bossId: string; // enemy id of the act boss (for the preview icon)
}

export type Reward =
  | { kind: 'gold'; amount: number; taken?: boolean }
  | { kind: 'card'; options: CardInstance[]; taken?: boolean }
  | { kind: 'relic'; id: string; taken?: boolean }
  | { kind: 'potion'; id: string; taken?: boolean };

export interface ShopState {
  cards: { card: CardInstance; price: number; sold: boolean }[];
  relics: { id: string; price: number; sold: boolean }[];
  potions: { id: string; price: number; sold: boolean }[];
  removePrice: number;
  removeUsed: boolean;
}

export interface EventState {
  id: string;
  /** Current page id inside the event (events can have multiple pages). */
  page: string;
  /** Free-form memory (JSON). */
  mem: Record<string, number | string>;
}

export type CardSelectPurpose = 'upgrade' | 'remove' | 'transform' | 'duplicate' | 'eventCustom';

export type Screen =
  | { kind: 'map' }
  | { kind: 'combat'; combat: CombatState }
  | { kind: 'reward'; rewards: Reward[]; title: string }
  | { kind: 'rest'; done: boolean }
  | { kind: 'shop'; shop: ShopState }
  | { kind: 'event'; event: EventState }
  | { kind: 'treasure'; opened: boolean; relicId: string }
  | { kind: 'bossRelic'; options: string[] }
  | {
      kind: 'cardSelect';
      purpose: CardSelectPurpose;
      prompt: string;
      count: number;
      /** Uids of candidate deck cards. */
      candidates: number[];
      canSkip: boolean;
      /** Screen to return to after selection. */
      returnTo: Screen;
      /** For eventCustom: event id to call back (EventDef.onCardSelect). */
      eventId?: string;
    }
  | { kind: 'victory' }
  | { kind: 'defeat'; cause: string };

export interface RunStats {
  floorsClimbed: number;
  enemiesKilled: number;
  elitesKilled: number;
  bossesKilled: number;
  damageDealt: number;
  damageTaken: number;
  goldEarned: number;
  cardsPlayed: number;
  maxDamageHit: number;
  startedAt: number;
}

export interface RunState {
  version: 1;
  seed: string;
  /** Independent RNG streams (uint32 state). */
  rng: { map: number; combat: number; rewards: number; shop: number; events: number; misc: number };
  ascension: number; // Blight level 0..10
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInstance[];
  relics: { id: string; counter: number }[];
  potions: (string | null)[];
  act: 1 | 2 | 3;
  floor: number; // floor within act (0 = not started)
  map: MapState;
  screen: Screen;
  stats: RunStats;
  nextUid: number;
  /** Reward rarity pity offset (percent). */
  rareOffset: number;
  potionChance: number; // percent
  /** Which encounters have been used this act (avoid repeats). */
  seenEncounters: string[];
  seenEvents: string[];
  /** Act bosses picked at run start (enemy ids per act). */
  bosses: [string, string, string];
  /** Number of normal fights done in current act (easy pool for first 3). */
  fightsThisAct: number;
  /** Card removals bought in shops this run (raises the removal price). Optional so old saves stay valid. */
  removals?: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Encounters & events

export interface EncounterDef {
  id: string;
  act: 1 | 2 | 3;
  pool: 'easy' | 'hard' | 'elite' | 'boss';
  /** Enemy ids spawned left→right. */
  enemies: string[];
  weight?: number;
}

export interface EventChoice {
  label: string; // e.g. "[Eat it] Heal 20 HP. Gain a Mildew."
  /** Disabled with a reason if not available (e.g. not enough gold). */
  disabled?: (run: RunState) => string | null;
  /**
   * Apply the choice. Mutate `run` via helpers in ctx. Return the next page id, or null to finish the event
   * (engine then goes back to the map). May set run.screen itself (e.g. to a cardSelect or combat) - in that
   * case return 'screen'.
   */
  pick: (ctx: EventCtx) => string | null;
}

export interface EventPage {
  text: string;
  choices: EventChoice[];
}

export interface EventDef {
  id: string;
  name: string;
  /** Acts the event can show up in. */
  acts: (1 | 2 | 3)[];
  art: ArtKey;
  pages: Record<string, EventPage | ((run: RunState, mem: EventState['mem']) => EventPage)>;
  /** Only offer if condition holds. */
  canAppear?: (run: RunState) => boolean;
  onCardSelect?: (ctx: EventCtx, chosen: CardInstance[]) => string | null;
}

/** Helpers for events and out-of-combat effects. Implemented by the engine. */
export interface EventCtx {
  run: RunState;
  mem: EventState['mem'];
  rng: () => number;
  heal: (n: number) => void;
  damage: (n: number) => void; // lose HP (can kill -> defeat)
  gainMaxHp: (n: number) => void;
  loseMaxHp: (n: number) => void;
  gainGold: (n: number) => void;
  loseGold: (n: number) => void;
  addCard: (id: string, upgraded?: boolean) => void;
  addRelic: (id: string) => void;
  randomRelicId: (rarity?: RelicRarity) => string;
  addPotion: (id: string) => boolean;
  randomPotionId: () => string;
  /** Random card id of the given rarity from Pip's pool. */
  randomCardId: (rarity?: Rarity) => string;
  /** Opens a deck card-select screen (upgrade/remove/transform/duplicate/eventCustom). Returns after screen set. */
  selectCards: (purpose: CardSelectPurpose, prompt: string, count: number, filter?: (c: CardInstance) => boolean, canSkip?: boolean) => void;
  /** Start a fight with a given encounter (e.g. events with an ambush). Rewards given as normal/elite. */
  startFight: (encounterId: string, kind: 'normal' | 'elite') => void;
  /** Show a reward screen (after event), then return to map. */
  giveRewards: (rewards: Reward[]) => void;
  upgradeRandom: (count: number) => void;
}

// ---------------------------------------------------------------------------------------------------------------
// The combat API passed to card/relic/status/enemy/potion code. Implemented by the engine.

export interface Api {
  /** The acting entity ('player' for cards, relics, potions, player statuses; the enemy uid for enemy code). */
  readonly self: EntityId;
  readonly combat: CombatState;
  readonly run: RunState;
  rng: () => number;

  // --- queries
  player(): PlayerCombat;
  enemy(uid: EntityId): EnemyState | undefined;
  /** Living enemies, left to right. */
  enemies(): EnemyState[];
  randomEnemy(): EnemyState | undefined;
  status(who: EntityId, s: StatusId): number;
  hasRelic(id: string): boolean;
  plants(): PlantState[];
  /** Number of empty garden plots. */
  freePlots(): number;

  // --- damage & defense
  /**
   * Attack damage from self to target (applies Might, Wilted, Soggy, block, Prickly, hooks).
   * Returns HP actually lost. Safe to call on dead targets (no-op, returns 0).
   */
  attack(target: EntityId, base: number): number;
  /** Attack all living enemies (from player) - or the player (from an enemy). Returns total HP lost. */
  attackAll(base: number): number;
  /** Direct HP loss, ignores block and modifiers (e.g. Rot, "lose 3 HP"). */
  loseHp(target: EntityId, amount: number): number;
  /** Self gains block (from cards: applies Sturdy/Brittle when useModifiers true (default true for player cards)). */
  gainBlock(amount: number, useModifiers?: boolean): number;
  /** Give block to an arbitrary entity without modifiers (enemy shielding an ally). */
  giveBlock(target: EntityId, amount: number): void;
  heal(target: EntityId, amount: number): void;
  /**
   * Set an entity's HP directly (optionally also max HP) and emit a 'damage' (kind 'hp') or 'heal' event so the UI stays in sync.
   * Never kills: hp is clamped to >= 1 (use loseHp for lethal effects). Ignores Block and hooks (no onHpLoss).
   */
  setHp(target: EntityId, hp: number, maxHp?: number): void;

  // --- statuses
  /** Apply (or remove with negative) stacks of a status. Triggers onApplyRot for rot from player. */
  apply(target: EntityId, s: StatusId, amount: number): void;
  applyAll(s: StatusId, amount: number): void; // to all living enemies
  setStatus(target: EntityId, s: StatusId, amount: number): void;

  // --- cards (player only)
  draw(n: number): CardInstance[];
  gainEnergy(n: number): void;
  gainNutrients(n: number): void;
  /** Returns false (and does nothing) if not enough. */
  spendNutrients(n: number): boolean;
  /** Create new card(s) (e.g. Spore tokens). */
  addCard(id: string, where: 'hand' | 'draw' | 'discard' | 'drawTop', count?: number, upgraded?: boolean): CardInstance[];
  /** Move an existing card (by uid) to compost (triggers compost hooks & +1 nutrient). */
  compostCard(uid: number): void;
  discardCard(uid: number): void;
  /** Ask the player to choose cards; engine pauses until resolved, then calls afterChoice on the source card. */
  choose(opts: {
    prompt: string;
    from: PendingChoice['from'];
    min: number;
    max: number;
    action: PendingChoice['action'];
    filter?: (c: CardInstance) => boolean;
    options?: CardInstance[];
  }): void;
  /** Make a card instance (not placed in any pile) - for choose({from:'options'}). */
  makeCard(id: string, upgraded?: boolean): CardInstance;
  cardDef(id: string): CardDef;
  /** Upgrade a card in combat (hand etc.). */
  upgradeCard(uid: number): void;
  setCost(uid: number, cost: number, thisTurnOnly: boolean): void;

  // --- garden
  /** Grow all plants by n (may bloom). */
  growPlants(n: number): void;
  /** Grow one plant (slot index). */
  growPlant(slot: number, n: number): void;

  // --- enemies
  spawnEnemy(id: string, position?: 'left' | 'right'): EnemyState | undefined;
  /** Add a status card (Mold, Slime...) to the player's piles. */
  addCardToPlayer(id: string, where: 'hand' | 'draw' | 'discard', count?: number): void;
  /** Enemy escapes (removed from combat, no rewards from it). */
  escape(uid: EntityId): void;

  // --- misc
  /** Flash a relic in the UI (emits an event). */
  flashRelic(id: string): void;
  /** Floating text over an entity (e.g. "Enraged!"). */
  say(who: EntityId, text: string): void;
  /** Per-combat memory helpers. */
  mem: Record<string, number>;
}

// ---------------------------------------------------------------------------------------------------------------
// Events emitted by the engine for the UI to animate. `after` values allow the UI to show intermediate states.

export type GameEvent =
  | { t: 'turn'; who: 'player' | 'enemy'; turn: number }
  | { t: 'damage'; target: EntityId; source?: EntityId; amount: number; blocked: number; hpAfter: number; blockAfter: number; kind: 'attack' | 'rot' | 'hp' | 'thorns' }
  | { t: 'block'; target: EntityId; amount: number; blockAfter: number }
  | { t: 'heal'; target: EntityId; amount: number; hpAfter: number }
  | { t: 'status'; target: EntityId; status: StatusId; delta: number; after: number }
  | { t: 'energy'; after: number }
  | { t: 'nutrients'; delta: number; after: number }
  | { t: 'play'; uid: number; id: string; target?: EntityId }
  | { t: 'draw'; uids: number[] }
  | { t: 'discard'; uids: number[] }
  | { t: 'compost'; uid: number; id: string }
  | { t: 'shuffle' }
  | { t: 'newCard'; uid: number; id: string; to: 'hand' | 'draw' | 'discard' }
  | { t: 'plant'; uid: number; slot: number }
  | { t: 'grow'; slot: number; growth: number }
  | { t: 'bloom'; slot: number; uid: number; id: string }
  | { t: 'enemyMove'; enemy: EntityId; move: string; name: string }
  | { t: 'intent'; enemy: EntityId; move: string }
  | { t: 'enemyDie'; enemy: EntityId }
  | { t: 'spawn'; enemy: EntityId; id: string }
  | { t: 'escape'; enemy: EntityId }
  | { t: 'relic'; id: string }
  | { t: 'say'; who: EntityId; text: string }
  | { t: 'gold'; delta: number; after: number }
  | { t: 'potion'; id: string }
  | { t: 'victory' }
  | { t: 'defeat' };

// ---------------------------------------------------------------------------------------------------------------
// Player actions - the single entry point `act(run, action)` handles all of them.

export type Action =
  | { type: 'selectNode'; nodeId: string }
  | { type: 'playCard'; uid: number; target?: EntityId }
  | { type: 'endTurn' }
  | { type: 'usePotion'; slot: number; target?: EntityId }
  | { type: 'discardPotion'; slot: number }
  /** Resolve a combat PendingChoice or a cardSelect screen. */
  | { type: 'choose'; uids: number[] }
  | { type: 'takeReward'; index: number; cardIndex?: number }
  | { type: 'skipReward'; index: number } // skip a card reward
  | { type: 'leaveRewards' }
  | { type: 'rest'; option: 'heal' | 'upgrade' }
  | { type: 'shopBuy'; kind: 'card' | 'relic' | 'potion'; index: number }
  | { type: 'shopRemove' }
  | { type: 'eventChoice'; index: number }
  | { type: 'openTreasure' }
  | { type: 'pickBossRelic'; id: string | null }
  | { type: 'proceed' }; // leave rest / shop / treasure / proceed from boss reward etc.

export interface ActResult {
  run: RunState;
  events: GameEvent[];
  /** Set if the action was rejected (state unchanged). */
  error?: string;
}

// ---------------------------------------------------------------------------------------------------------------
// Art keys: illustrations the art module provides for cards, keepsakes, brews, statuses and events.
// (Enemies and the player have their own components keyed by enemy id.)

export const ART_KEYS = [
  // attacks
  'bonk', 'headbutt', 'cap-slam', 'spore-burst', 'spore-cloud', 'root-whip', 'thorn-jab', 'twin-caps',
  'puffball-pop', 'stinkhorn', 'fang', 'mycelium-lash', 'avalanche', 'acorn-toss', 'gill-slice',
  // skills / defense
  'cap-shield', 'mossy-wall', 'dew-drop', 'hide-leaf', 'bark-armor', 'hunker', 'rain', 'shake-off',
  'forage', 'mulch', 'compost-heap', 'decay', 'rot-touch', 'fester', 'toxic-drip', 'glow',
  // plants
  'seedling', 'sprout', 'fern', 'bramble', 'glowcap-plant', 'puffball-plant', 'vine', 'flower', 'root-network', 'tree',
  // powers
  'mycelium-web', 'moon', 'sun', 'fairy-ring', 'spore-heart', 'crown', 'lantern',
  // misc / objects (keepsakes, brews, events)
  'acorn', 'snail-shell', 'feather', 'pebble', 'bell', 'lens', 'key', 'map', 'coin-pouch', 'teacup',
  'pinecone', 'honey', 'bone', 'candle', 'mirror', 'clover', 'button', 'thimble', 'compass', 'beetle-horn',
  'potion-red', 'potion-green', 'potion-blue', 'potion-gold', 'potion-purple', 'potion-teal',
  'well', 'shrine', 'stump', 'pond', 'campfire', 'merchant', 'chest', 'skull', 'question',
  // status icons
  'st-might', 'st-sturdy', 'st-prickly', 'st-regrow', 'st-soggy', 'st-wilted', 'st-brittle', 'st-rot',
  'st-shelled', 'st-growing', 'st-armored', 'st-power',
  // curses / status cards
  'mold', 'slime', 'burr', 'mildew', 'doubt',
] as const;
export type ArtKey = (typeof ART_KEYS)[number];

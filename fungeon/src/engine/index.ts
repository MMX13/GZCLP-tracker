// Public engine facade used by the UI, the simulator and tests. All functions are pure with respect to their input:
// `act` never mutates the RunState it is given (it works on a clone and returns the new state).
import type {
  Action,
  ActResult,
  ArtKey,
  CardInstance,
  CardType,
  EntityId,
  IntentKind,
  Keyword,
  Rarity,
  RunState,
} from './types';

export * from './types';

export interface NewRunOptions {
  seed?: string;
  ascension?: number;
}

/** Create a fresh run (screen = map, act 1, floor 0). */
export function newRun(_opts: NewRunOptions = {}): RunState {
  throw new Error('not implemented');
}

/** Apply a player action. Returns the new state and the events to animate. Invalid actions return `error` and the input state. */
export function act(_run: RunState, _action: Action): ActResult {
  throw new Error('not implemented');
}

/** Everything the UI needs to draw a card. Pass run (and optionally target) to get modified numbers in combat. */
export interface CardView {
  uid: number;
  id: string;
  name: string; // includes "+" when upgraded
  type: CardType;
  rarity: Rarity;
  /** null = unplayable (no gem). 'X' for X-cost. */
  cost: number | 'X' | null;
  /** Cost differs from printed (shown in a different colour). */
  costChanged: boolean;
  nutrients: number;
  /** Rendered rules text, numbers substituted. Segments let the UI colour modified numbers. */
  text: string;
  segments: { text: string; tone?: 'up' | 'down' | 'keyword' }[];
  keywords: Keyword[];
  art: ArtKey;
  upgraded: boolean;
  targeted: boolean;
  /** For plants: growth needed to bloom (null = perennial). */
  grow: number | null | undefined;
  /** In combat: whether it can be played right now and why not. */
  playable: boolean;
  reason?: string;
  flavor?: string;
}

export function cardView(_card: CardInstance, _run?: RunState, _target?: EntityId): CardView {
  throw new Error('not implemented');
}

/** Upgraded preview of a card (for rest / upgrade screens). */
export function upgradedView(_card: CardInstance): CardView {
  throw new Error('not implemented');
}

export interface IntentView {
  name: string;
  intents: IntentKind[];
  /** Modified per-hit damage (after Might/Wilted of enemy and player's Soggy). */
  dmg?: number;
  hits?: number;
}
export function intentView(_run: RunState, _enemy: EntityId): IntentView | null {
  throw new Error('not implemented');
}

export interface StatusView {
  id: string;
  name: string;
  kind: 'buff' | 'debuff';
  n: number;
  desc: string;
  icon: ArtKey;
  showNumber: boolean;
}
/** Visible statuses on an entity (combat only). */
export function statusViews(_run: RunState, _who: EntityId): StatusView[] {
  throw new Error('not implemented');
}

export interface EventView {
  name: string;
  art: ArtKey;
  text: string;
  choices: { label: string; disabled: string | null }[];
}
export function eventView(_run: RunState): EventView | null {
  throw new Error('not implemented');
}

/** Map helpers: node ids the player can pick next. */
export function selectableNodes(_run: RunState): string[] {
  throw new Error('not implemented');
}

/** Keyword glossary for tooltips (keyword/status names -> description). */
export function glossary(): Record<string, string> {
  throw new Error('not implemented');
}

/** Serialise / restore (validated). Returns null for corrupt or incompatible saves. */
export function serialize(_run: RunState): string {
  throw new Error('not implemented');
}
export function deserialize(_json: string): RunState | null {
  throw new Error('not implemented');
}

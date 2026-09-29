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

import { act as actImpl, createRun } from './run';
import type { NewRunOptions } from './run';
import { selectableNodes as selectableNodesImpl } from './map';
import { buildCardView, buildEventView, buildGlossary, buildIntentView, buildStatusViews } from './views';
import { restInfoImpl } from './run';
import { deserialize as deserializeImpl, serialize as serializeImpl } from './save';

export type { NewRunOptions };
export * from './registry-public';
export { engineLog } from './combat';
export { hashString as hashSeedForTests } from './rng';

/** Create a fresh run (screen = map, act 1, floor 0). */
export function newRun(opts: NewRunOptions = {}): RunState {
  return createRun(opts);
}

/** Apply a player action. Returns the new state and the events to animate. Invalid actions return `error` and the input state. */
export function act(run: RunState, action: Action): ActResult {
  return actImpl(run, action);
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

export function cardView(card: CardInstance, run?: RunState, target?: EntityId): CardView {
  return buildCardView(card, run, target);
}

/** Upgraded preview of a card (for rest / upgrade screens). */
export function upgradedView(card: CardInstance): CardView {
  return buildCardView({ ...card, upgraded: true });
}

export interface IntentView {
  name: string;
  intents: IntentKind[];
  /** Modified per-hit damage (after Might/Wilted of enemy and player's Soggy). */
  dmg?: number;
  hits?: number;
}
export function intentView(run: RunState, enemy: EntityId): IntentView | null {
  return buildIntentView(run, enemy);
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
export function statusViews(run: RunState, who: EntityId): StatusView[] {
  return buildStatusViews(run, who);
}

export interface EventView {
  name: string;
  art: ArtKey;
  text: string;
  choices: { label: string; disabled: string | null }[];
}
export function eventView(run: RunState): EventView | null {
  return buildEventView(run);
}

/** Map helpers: node ids the player can pick next. */
export function selectableNodes(run: RunState): string[] {
  return selectableNodesImpl(run);
}

/** Keyword glossary for tooltips (keyword/status names -> description). */
export function glossary(): Record<string, string> {
  return buildGlossary();
}

/** What the rest site offers right now (for enabling / labelling the buttons). */
export interface RestInfo {
  /** Nothing left to do here (already rested). */
  done: boolean;
  canHeal: boolean;
  /** HP the Rest option would restore (already capped by missing HP). */
  healAmount: number;
  healPercent: number;
  canUpgrade: boolean;
}
export function restInfo(run: RunState): RestInfo | null {
  return restInfoImpl(run);
}

/** Serialise / restore (validated). Returns null for corrupt or incompatible saves. */
export function serialize(run: RunState): string {
  return serializeImpl(run);
}
export function deserialize(json: string): RunState | null {
  return deserializeImpl(json);
}

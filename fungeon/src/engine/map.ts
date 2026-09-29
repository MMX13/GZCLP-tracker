// Branching map generation: 5 lanes, floors 1..10 plus the boss on floor 11. Paths never cross.
import type { MapNode, MapState, NodeType, RunState } from './types';
import { pick, shuffle, weightedPick } from './rng';

export const LANES = 5;
export const LAST_FLOOR = 10;
export const BOSS_FLOOR = 11;
export const BOSS_LANE = 2;
const PATHS = 6;

export const nodeId = (floor: number, lane: number): string => `${floor}-${lane}`;

interface Topology {
  /** edges[f] maps lane on floor f -> set of lanes on floor f+1 (f = 1..9). */
  edges: Map<number, Set<number>>[];
  lanes: Set<number>[]; // lanes[f] = lanes present on floor f (f = 1..10)
}

function crosses(edges: Map<number, Set<number>>, from: number, to: number): boolean {
  for (const [a, tos] of edges) {
    for (const b of tos) {
      if ((a < from && b > to) || (a > from && b < to)) return true;
    }
  }
  return false;
}

function buildTopology(rng: () => number): Topology {
  const edges: Map<number, Set<number>>[] = [];
  for (let f = 0; f <= LAST_FLOOR; f++) edges.push(new Map());
  const startCount = rng() < 0.5 ? 3 : 4;
  const startLanes = shuffle(rng, [0, 1, 2, 3, 4]).slice(0, startCount);
  for (let p = 0; p < PATHS; p++) {
    let lane = p < startCount ? startLanes[p] : pick(rng, startLanes);
    for (let f = 1; f < LAST_FLOOR; f++) {
      const options = shuffle(rng, [-1, 0, 1])
        .map((d) => lane + d)
        .filter((l) => l >= 0 && l < LANES);
      let next = lane;
      for (const o of options) {
        if (!crosses(edges[f], lane, o)) {
          next = o;
          break;
        }
      }
      let set = edges[f].get(lane);
      if (!set) edges[f].set(lane, (set = new Set()));
      set.add(next);
      lane = next;
    }
  }
  const lanes: Set<number>[] = [];
  for (let f = 0; f <= LAST_FLOOR; f++) lanes.push(new Set());
  for (const l of startLanes) lanes[1].add(l);
  for (let f = 1; f < LAST_FLOOR; f++) for (const tos of edges[f].values()) for (const t of tos) lanes[f + 1].add(t);
  return { edges, lanes };
}

function acceptable(t: Topology): boolean {
  for (let f = 1; f <= LAST_FLOOR; f++) {
    const n = t.lanes[f].size;
    if (n < 2 || n > 4) return false;
  }
  return true;
}

export function generateMap(rng: () => number, act: 1 | 2 | 3, ascension: number, bossId: string): MapState {
  let topo = buildTopology(rng);
  for (let i = 0; i < 80 && !acceptable(topo); i++) topo = buildTopology(rng);

  const nodes: Record<string, MapNode> = {};
  const parents: Record<string, string[]> = {};
  for (let f = 1; f <= LAST_FLOOR; f++) {
    for (const lane of [...topo.lanes[f]].sort((a, b) => a - b)) {
      const next =
        f < LAST_FLOOR
          ? [...(topo.edges[f].get(lane) ?? [])].sort((a, b) => a - b).map((l) => nodeId(f + 1, l))
          : [nodeId(BOSS_FLOOR, BOSS_LANE)];
      const id = nodeId(f, lane);
      nodes[id] = { id, floor: f, lane, type: 'fight', next };
      for (const n of next) (parents[n] ??= []).push(id);
    }
  }
  const bossNode: MapNode = { id: nodeId(BOSS_FLOOR, BOSS_LANE), floor: BOSS_FLOOR, lane: BOSS_LANE, type: 'boss', next: [] };
  nodes[bossNode.id] = bossNode;

  // node types, floor by floor so parents are known
  const eliteW = 8 + (ascension >= 1 ? 4 : 0);
  for (let f = 1; f <= LAST_FLOOR; f++) {
    const row = Object.values(nodes).filter((n) => n.floor === f).sort((a, b) => a.lane - b.lane);
    for (const n of row) {
      if (f === 1) n.type = 'fight';
      else if (f === 6) n.type = 'treasure';
      else if (f === LAST_FLOOR) n.type = 'rest';
      else {
        const parentTypes = new Set((parents[n.id] ?? []).map((p) => nodes[p].type));
        const cands: [NodeType, number][] = [
          ['fight', 45],
          ['event', 22],
          ['elite', f >= 5 ? eliteW : 0],
          ['rest', f === 9 ? 0 : 12],
          ['shop', 8],
        ];
        const ok = cands.filter(([t]) => !((t === 'rest' || t === 'shop' || t === 'elite') && parentTypes.has(t)));
        n.type = weightedPick(rng, ok.length ? ok : cands, (c) => c[1])?.[0] ?? 'fight';
      }
    }
  }
  return { act, nodes, current: null, visited: [], bossId };
}

/** Node ids the player can pick next (empty unless the map screen is showing). */
export function selectableNodes(run: RunState): string[] {
  if (run.screen.kind !== 'map') return [];
  const m = run.map;
  if (m.current === null) {
    return Object.values(m.nodes)
      .filter((n) => n.floor === 1)
      .sort((a, b) => a.lane - b.lane)
      .map((n) => n.id);
  }
  return m.nodes[m.current]?.next.slice() ?? [];
}

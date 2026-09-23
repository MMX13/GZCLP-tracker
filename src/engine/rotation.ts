import type { Day, Slot, Track, Variant } from './types';

export const VARIANTS: Variant[] = ['A1', 'B1', 'A2', 'B2'];

export function variantAt(index: number): Variant {
  return VARIANTS[((index % 4) + 4) % 4];
}

export function variantDay(v: Variant): Day {
  return v[0] as Day;
}

export function variantNumber(v: Variant): 1 | 2 {
  return v[1] === '1' ? 1 : 2;
}

export function otherTrack(t: 'heavy' | 'volume'): 'heavy' | 'volume' {
  return t === 'heavy' ? 'volume' : 'heavy';
}

/** The track a slot runs in a given variant. T2 and T3 slots have no track. */
export function trackFor(slot: Slot, variant: Variant): Track {
  if (slot.tier !== 1) return 'none';
  const v1 = slot.variant1Track ?? 'heavy';
  return variantNumber(variant) === 1 ? v1 : otherTrack(v1);
}

/** The variant in which a T1 slot runs a given track. */
export function variantForTrack(slot: Slot, track: 'heavy' | 'volume'): Variant {
  const v1 = slot.variant1Track ?? 'heavy';
  return `${slot.day}${v1 === track ? 1 : 2}` as Variant;
}

/** Slots for a day in workout order - T1, then T2, then T3, each by their saved order. */
export function slotsForDay(slots: Slot[], day: Day): Slot[] {
  return slots.filter((s) => s.day === day).sort((a, b) => a.tier - b.tier || a.order - b.order);
}

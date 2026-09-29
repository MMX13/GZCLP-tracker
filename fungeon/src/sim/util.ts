import type { CardInstance } from '../engine/types';
import { getCard } from '../engine/registry';
import { canUpgrade } from '../engine/cardutil';

export const canUpgradeCard = (c: CardInstance): boolean => canUpgrade(c, getCard(c.id));

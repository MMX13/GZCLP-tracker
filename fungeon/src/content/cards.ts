import type { CardDef } from '../engine/types';
import { BASE_CARDS } from './cards-base';
import { COMMON_CARDS } from './cards-common';
import { UNCOMMON_CARDS } from './cards-uncommon';
import { RARE_CARDS } from './cards-rare';

export const CARD_LIST: CardDef[] = [...BASE_CARDS, ...COMMON_CARDS, ...UNCOMMON_CARDS, ...RARE_CARDS];

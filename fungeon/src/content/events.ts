import type { CardInstance, EventChoice, EventCtx, EventDef, EventPage, RunState } from '../engine/types';

// ---- helpers -------------------------------------------------------------------------------------------------
const needGold = (n: number) => (run: RunState) => (run.gold < n ? `Need ${n} Acorns` : null);
const needHp = (n: number) => (run: RunState) => (run.hp <= n ? 'Too risky at this HP' : null);
const has = (run: RunState, id: string) => run.relics.some((r) => r.id === id);

/** Set the event's current page (used before opening a card-select screen so we return to the right page). */
function setPage(ctx: EventCtx, page: string): void {
  const s = ctx.run.screen;
  if (s.kind === 'event') s.event.page = page;
}
function mk(ctx: EventCtx, id: string): CardInstance {
  return { uid: ctx.run.nextUid++, id, upgraded: false };
}
function removeFromDeck(ctx: EventCtx, uid: number): void {
  ctx.run.deck = ctx.run.deck.filter((c) => c.uid !== uid);
}
const page = (text: string, choices: EventChoice[]): EventPage => ({ text, choices });
const leave = (label = '[Leave] Continue on your way.'): EventChoice => ({ label, pick: () => null });
const done = (text: string): EventPage => page(text, [leave('[Continue] Back to the trail.')]);
const ELITE_BY_ACT: Record<number, string> = { 1: 'a1_stag', 2: 'a2_crab', 3: 'a3_morel' };

export const EVENT_LIST: EventDef[] = [
  // 1 ------------------------------------------------------------------------------------------------------------
  {
    id: 'wishing_well', name: 'The Wishing Well', acts: [1, 2, 3], art: 'well',
    pages: {
      start: page(
        'A mossy well hums a little tune. A sign reads: "Wishes: 50 Acorns. Small wishes: 1 Acorn. Refunds: lol."',
        [
          {
            label: '[Big Wish] Pay 50 Acorns. 65%: a Keepsake. 35%: Mildew.',
            disabled: needGold(50),
            pick: (ctx) => {
              ctx.loseGold(50);
              if (ctx.rng() < 0.65) {
                ctx.addRelic(ctx.randomRelicId('common'));
                return 'win';
              }
              ctx.addCard('mildew');
              return 'lose';
            },
          },
          {
            label: '[Small Wish] Pay 1 Acorn. 50%: heal 8 HP.',
            disabled: needGold(1),
            pick: (ctx) => {
              ctx.loseGold(1);
              if (ctx.rng() < 0.5) { ctx.heal(8); return 'small_win'; }
              return 'small_lose';
            },
          },
          leave('[Leave] Wish for nothing. Very zen.'),
        ],
      ),
      win: done('The well burbles, coughs, and spits out a Keepsake with a soggy little "ta-da!".'),
      lose: done('The well gurgles. Something damp and disappointed lands in your satchel. It smells like Tuesday.'),
      small_win: done('A warm ripple. You feel a bit better. The well seems proud of itself.'),
      small_lose: done('Plip. Nothing happens. The well whispers: "Bold of you to assume a whole Acorn buys a whole wish."'),
    },
  },
  // 2 ------------------------------------------------------------------------------------------------------------
  {
    id: 'snail_postman', name: 'Snail Postman', acts: [1, 2], art: 'merchant',
    pages: {
      start: page(
        'A snail in a tiny cap trundles up. "Package for a P. Mushroom. It has been en route for... a while. Postage due!"',
        [
          {
            label: '[Pay postage] Pay 30 Acorns. Gain a Brew and a card.',
            disabled: needGold(30),
            pick: (ctx) => {
              ctx.loseGold(30);
              ctx.addPotion(ctx.randomPotionId());
              ctx.addCard(ctx.randomCardId('common'));
              return 'paid';
            },
          },
          {
            label: '[Read his letter] Gain 35 Acorns. Lose 6 HP (paper cut).',
            disabled: needHp(6),
            pick: (ctx) => { ctx.gainGold(35); ctx.damage(6); return 'letter'; },
          },
          leave('[Wave] "Sorry, wrong mushroom."'),
        ],
      ),
      paid: done('Inside: a Brew, a card, and a note: "Sorry for the delay. -Mom." You feel loved and mildly overcharged.'),
      letter: page(
        'The letter is a coupon book, a birthday invitation, and 35 loose Acorns. The envelope sliced your thumb. The snail wants a reply.',
        [
          {
            label: '[Write back] Upgrade a random card.',
            pick: (ctx) => { ctx.upgradeRandom(1); return 'replied'; },
          },
          leave('[Stamp on it] Mail is just paper anyway.'),
        ],
      ),
      replied: done('Your reply is so warm the snail blushes. He also grants you a "priority stamp" that somehow sharpens a card.'),
    },
  },
  // 3 ------------------------------------------------------------------------------------------------------------
  {
    id: 'ring_fairy', name: 'Mushroom Ring Dance', acts: [1, 2, 3], art: 'fairy-ring',
    pages: {
      start: page(
        'A perfect ring of toadstools glows in the dusk. Tiny voices giggle: "Danceeee with us, Pip!"',
        [
          {
            label: '[Dance] Upgrade 2 random cards. Lose 5 max HP.',
            pick: (ctx) => { ctx.upgradeRandom(2); ctx.loseMaxHp(5); return 'danced'; },
          },
          {
            label: '[Sway politely] Heal 12 HP.',
            pick: (ctx) => { ctx.heal(12); return 'sway'; },
          },
          leave('[Decline] You have two left feet.'),
        ],
      ),
      danced: done('You dance until dawn. Two of your cards sparkle, and your knees file a formal complaint.'),
      sway: done('You sway, they sway, everyone sways. The fairies pat your cap and hum you a lullaby.'),
    },
  },
  // 4 ------------------------------------------------------------------------------------------------------------
  {
    id: 'compost_heap', name: 'Compost Heap', acts: [1, 2], art: 'stump',
    pages: {
      start: page(
        'A magnificent heap of leaves, peels, and mystery. It steams gently. Something in there feels... valuable? Or just warm.',
        [
          {
            label: '[Rummage] Remove a card. Lose 5 HP (the smell).',
            disabled: needHp(5),
            pick: (ctx) => {
              ctx.damage(5);
              setPage(ctx, 'rummaged');
              ctx.selectCards('remove', 'Toss a card into the heap.', 1, undefined, false);
              return 'screen';
            },
          },
          {
            label: '[Dig for Acorns] Gain 45 Acorns. Gain a Mildew.',
            pick: (ctx) => { ctx.gainGold(45); ctx.addCard('mildew'); return 'dug'; },
          },
          leave('[Leave] Some things are best left steaming.'),
        ],
      ),
      rummaged: done('Your unwanted card sinks into the heap and is composted with dignity. It will become a very nice tomato.'),
      dug: done('You unearth a pouch of Acorns, plus a fuzzy grey souvenir that will not stop sticking to you.'),
    },
  },
  // 5 ------------------------------------------------------------------------------------------------------------
  {
    id: 'old_map', name: 'The Old Map', acts: [1, 2], art: 'map',
    canAppear: (run) => !has(run, 'old_map'),
    pages: {
      start: page(
        'Pinned to a twig: a very old, very confident map. The label says "SHORTCUTS (probably)". A coffee ring marks the treasure.',
        [
          {
            label: '[Take the map] Gain Old Map. Gain a Doubt.',
            pick: (ctx) => { ctx.addRelic('old_map'); ctx.addCard('doubt'); return 'took'; },
          },
          {
            label: '[Trace a copy] Gain 30 Acorns.',
            pick: (ctx) => { ctx.gainGold(30); return 'copy'; },
          },
          leave('[Leave] Real explorers ask for directions.'),
        ],
      ),
      took: done('You fold up the map. Was that a left turn or a right turn? Doubt creeps in and sits on your cap.'),
      copy: done('A quick sketch, sold to a passing beetle cartographer. He gasps, pays, and does not check the scale.'),
    },
  },
  // 6 ------------------------------------------------------------------------------------------------------------
  {
    id: 'golden_spore', name: 'The Golden Spore', acts: [1, 2, 3], art: 'potion-gold',
    canAppear: (run) => !has(run, 'golden_spore'),
    pages: {
      start: page(
        'A single golden spore floats above a thorn bush, glittering like it knows it is the main character.',
        [
          {
            label: '[Grab it] Gain Golden Spore. Lose 10 HP (thorns).',
            disabled: needHp(10),
            pick: (ctx) => { ctx.damage(10); ctx.addRelic('golden_spore'); return 'grab'; },
          },
          {
            label: '[Buy a ladder] Pay 40 Acorns. Gain Golden Spore.',
            disabled: needGold(40),
            pick: (ctx) => { ctx.loseGold(40); ctx.addRelic('golden_spore'); return 'ladder'; },
          },
          leave('[Leave] It is probably a trap. Or a spore.'),
        ],
      ),
      grab: done('Ouch, ouch, ouch. The spore drops into your palm, glowing smugly. You bleed for glory.'),
      ladder: done('A nearby squirrel rents you a ladder at a horrifying markup. The spore is yours. The squirrel is richer.'),
    },
  },
  // 7 ------------------------------------------------------------------------------------------------------------
  {
    id: 'beetle_bazaar', name: 'Beetle Bazaar', acts: [1, 2], art: 'merchant',
    pages: {
      start: page(
        'A dozen beetles have set up a bazaar on a fallen log. "Trade! Barter! Absolutely no refunds!"',
        [
          {
            label: '[Trade a card] Remove a card. Gain a Keepsake.',
            pick: (ctx) => {
              setPage(ctx, 'start');
              ctx.selectCards('eventCustom', 'Pick a card to trade away.', 1, undefined, true);
              return 'screen';
            },
          },
          {
            label: '[Buy bug juice] Pay 35 Acorns. Gain a random Brew.',
            disabled: needGold(35),
            pick: (ctx) => { ctx.loseGold(35); ctx.addPotion(ctx.randomPotionId()); return 'juice'; },
          },
          {
            label: '[Sell your Brews] Gain 25 Acorns per Brew.',
            disabled: (run) => (run.potions.some((p) => p) ? null : 'You have no Brews'),
            pick: (ctx) => {
              const n = ctx.run.potions.filter((p) => p).length;
              ctx.run.potions = ctx.run.potions.map(() => null);
              ctx.gainGold(25 * n);
              return 'sold';
            },
          },
          leave('[Leave] Window shopping only.'),
        ],
      ),
      traded: done('The beetles inspect your card, gasp, whisper, and hand you something shiny. You suspect you were fleeced, but shinily.'),
      juice: done('It fizzes. It is green. It is probably a Brew. The label is in Beetle.'),
      sold: done('The beetles buy your Brews with visible glee. "Pleasure doing business with a mushroom!"'),
    },
    onCardSelect: (ctx, chosen) => {
      if (chosen.length === 0) return 'start';
      for (const c of chosen) removeFromDeck(ctx, c.uid);
      ctx.addRelic(ctx.randomRelicId('common'));
      return 'traded';
    },
  },
  // 8 ------------------------------------------------------------------------------------------------------------
  {
    id: 'glowing_pond', name: 'Glowing Pond', acts: [1, 2, 3], art: 'pond',
    pages: {
      start: page(
        'A pond glows a soft, suspicious teal. Tiny fish inside seem to be waving at you. Or warning you.',
        [
          {
            label: '[Dip a card] Transform a card into a random one.',
            pick: (ctx) => {
              setPage(ctx, 'dipped');
              ctx.selectCards('transform', 'Dip which card into the pond?', 1, undefined, true);
              return 'screen';
            },
          },
          {
            label: '[Drink] Heal 18 HP. Gain a Mildew.',
            pick: (ctx) => { ctx.heal(18); ctx.addCard('mildew'); return 'drank'; },
          },
          {
            label: '[Bottle some] Gain a random Brew. Lose 4 HP.',
            disabled: needHp(4),
            pick: (ctx) => { ctx.damage(4); ctx.addPotion(ctx.randomPotionId()); return 'bottled'; },
          },
          leave('[Leave] Do not disturb the fish.'),
        ],
      ),
      dipped: done('SPLOOSH. The card surfaces as something else entirely, looking refreshed and slightly confused.'),
      drank: done('Delicious! You feel great! A soggy scrap of Mildew has hitched a ride in your satchel, though.'),
      bottled: done('A fish bites your finger for the bottle. Fair trade, in the fish\'s opinion.'),
    },
  },
  // 9 ------------------------------------------------------------------------------------------------------------
  {
    id: 'sleeping_bear', name: 'Sleeping Bear', acts: [1, 2, 3], art: 'honey',
    pages: {
      start: page(
        'A very large bear naps on a very large pot of honey. Each snore rustles the leaves. The honey is RIGHT THERE.',
        [
          {
            label: '[Sneak past] 65%: find 25 Acorns. 35%: lose 8 HP.',
            pick: (ctx) => {
              if (ctx.rng() < 0.65) { ctx.gainGold(25); return 'sneaked'; }
              ctx.damage(8);
              return 'woke';
            },
          },
          {
            label: '[Take the honey] +8 max HP, heal 15. Fight an elite!',
            pick: (ctx) => {
              ctx.gainMaxHp(8);
              ctx.heal(15);
              ctx.startFight(ELITE_BY_ACT[ctx.run.act] ?? 'a1_stag', 'elite');
              return 'screen';
            },
          },
          leave('[Tiptoe away] Let sleeping bears lie.'),
        ],
      ),
      sneaked: done('You tiptoe by. A coin pouch rests near his paw. You remove it with the grace of a very small ballet.'),
      woke: done('A floorboard-sized twig snaps. The bear grumbles, swats a paw in his sleep, and rolls over. Lucky, kinda.'),
    },
  },
  // 10 -----------------------------------------------------------------------------------------------------------
  {
    id: 'spore_library', name: 'Spore Library', acts: [1, 2, 3], art: 'question',
    pages: {
      start: page(
        'A hollow log stacked with tiny books. A moth librarian in glasses whispers: "Shhh. Late fees are cumulative."',
        [
          {
            label: '[Borrow a book] Pay 35 Acorns. Choose 1 of 3 cards.',
            disabled: needGold(35),
            pick: (ctx) => {
              ctx.loseGold(35);
              ctx.giveRewards([{ kind: 'card', options: [mk(ctx, ctx.randomCardId('uncommon')), mk(ctx, ctx.randomCardId('uncommon')), mk(ctx, ctx.randomCardId('rare'))] }]);
              return 'screen';
            },
          },
          {
            label: '[Forbidden tome] Lose 8 HP. Choose 1 of 3 rare cards.',
            disabled: needHp(8),
            pick: (ctx) => {
              ctx.damage(8);
              ctx.giveRewards([{ kind: 'card', options: [mk(ctx, ctx.randomCardId('rare')), mk(ctx, ctx.randomCardId('rare')), mk(ctx, ctx.randomCardId('rare'))] }]);
              return 'screen';
            },
          },
          {
            label: '[Read a pamphlet] Upgrade a card of your choice.',
            pick: (ctx) => {
              setPage(ctx, 'read');
              ctx.selectCards('upgrade', 'Which card learns something?', 1, (c) => !c.upgraded, true);
              return 'screen';
            },
          },
          leave('[Leave] Shhh.'),
        ],
      ),
      read: done('"Ten Tips For Sturdier Caps". Tip 4 will shock you. One of your cards is now smarter.'),
    },
  },
  // 11 -----------------------------------------------------------------------------------------------------------
  {
    id: 'cordyceps_whisper', name: 'Cordyceps Whisper', acts: [3], art: 'skull',
    pages: {
      start: page(
        'A thin, pleasant voice drifts from a fungus-choked skull: "Pip... you are so small. I could make you... BIGGER. Just a taste."',
        [
          {
            label: '[Accept] Gain a rare Keepsake. Lose 12 max HP.',
            pick: (ctx) => { ctx.loseMaxHp(12); ctx.addRelic(ctx.randomRelicId('rare')); return 'accept'; },
          },
          {
            label: '[A taste] Upgrade 3 random cards. Gain 2 Mildew.',
            pick: (ctx) => { ctx.upgradeRandom(3); ctx.addCard('mildew'); ctx.addCard('mildew'); return 'taste'; },
          },
          leave('[Cover your ears] La la la, not listening!'),
        ],
      ),
      accept: done('Tendrils curl round your heart, and something shiny drops in your palm. You feel powerful. And a bit less... you.'),
      taste: done('Three of your cards crackle with cordyceps-power. The rest of your deck smells faintly of wet cardboard.'),
    },
  },
  // 12 -----------------------------------------------------------------------------------------------------------
  {
    id: 'friendly_frog', name: 'Friendly Frog', acts: [1, 2], art: 'clover',
    pages: {
      start: page(
        'A frog on a lily pad ribbits hello. He is holding a very small umbrella. "Ribbit. Do you need... a hug?"',
        [
          {
            label: '[Hug] Heal 14 HP.',
            pick: (ctx) => { ctx.heal(14); return 'hug'; },
          },
          {
            label: '[Share snacks] Pay 20 Acorns. Heal 25 HP, gain a Brew.',
            disabled: needGold(20),
            pick: (ctx) => { ctx.loseGold(20); ctx.heal(25); ctx.addPotion(ctx.randomPotionId()); return 'snacks'; },
          },
          {
            label: '[Tell a joke] 50%: gain 30 Acorns. 50%: lose 4 HP.',
            disabled: needHp(4),
            pick: (ctx) => {
              if (ctx.rng() < 0.5) { ctx.gainGold(30); return 'laugh'; }
              ctx.damage(4);
              return 'groan';
            },
          },
        ],
      ),
      hug: done('Warm, damp, and slightly slimy. Best hug of the week. Your worries hop away.'),
      snacks: done('The frog eats three flies and gives you a soup. You both agree it is the friendship you needed.'),
      laugh: done('The frog laughs so hard he drops his wallet. You did not steal it. You caught it.'),
      groan: done('"Ribbit." The frog flicks his tongue at your nose. Tough crowd.'),
    },
  },
  // 13 -----------------------------------------------------------------------------------------------------------
  {
    id: 'rain_storm', name: 'Rain Storm', acts: [1, 2, 3], art: 'rain',
    pages: {
      start: page(
        'The sky opens. Fat drops go PLONK on your cap. A puddle the size of a bathtub forms in seconds. Mushrooms LOVE this.',
        [
          {
            label: '[Splash around] Heal 10 HP. Gain 4 max HP. Lose 20 Acorns.',
            disabled: needGold(20),
            pick: (ctx) => { ctx.loseGold(20); ctx.heal(10); ctx.gainMaxHp(4); return 'splash'; },
          },
          {
            label: '[Shelter] Heal 12 HP.',
            pick: (ctx) => { ctx.heal(12); return 'shelter'; },
          },
          {
            label: '[Run through] Lose 8 HP. Gain a random Brew.',
            disabled: needHp(8),
            pick: (ctx) => { ctx.damage(8); ctx.addPotion(ctx.randomPotionId()); return 'run'; },
          },
        ],
      ),
      splash: done('You jump in every puddle. Your purse floats away in one of them. Worth it. Cap feels plumper already.'),
      shelter: done('You wait under a big leaf, listening to the rain hum. Your cap dries off and your spirits lift.'),
      run: done('You slip, slide, and skid, but a Brew floats by like a tiny raft. You scoop it up.'),
    },
  },
  // 14 -----------------------------------------------------------------------------------------------------------
  {
    id: 'tea_party', name: 'Toadstool Tea Party', acts: [1, 2, 3], art: 'teacup',
    pages: {
      start: page(
        'Three snails in top hats sit at a tiny table. "Pip! Just in time! Sit, sit! Tea? Or are you a scone person?"',
        [
          {
            label: '[Sip tea] Heal 15 HP.',
            pick: (ctx) => { ctx.heal(15); return 'more'; },
          },
          {
            label: '[Pocket a teaspoon] Gain 20 Acorns.',
            pick: (ctx) => { ctx.gainGold(20); return 'caught'; },
          },
          leave('[Leave] Too fancy for you.'),
        ],
      ),
      more: page(
        'The tea is lovely: lavender, dew, and something that makes your cap tingle. The snails are already pouring another cup.',
        [
          {
            label: '[Another cup] Heal 10 HP. Gain a Doubt (the jitters).',
            pick: (ctx) => { ctx.heal(10); ctx.addCard('doubt'); return 'jitters'; },
          },
          {
            label: '[Compliment the scones] Gain a random Brew.',
            pick: (ctx) => { ctx.addPotion(ctx.randomPotionId()); return 'scones'; },
          },
          leave('[Excuse yourself] "Lovely, but I must dash."'),
        ],
      ),
      caught: done('A snail clears his throat. "That is a very small spoon to be missing." You leave quickly, jingling slightly.'),
      jitters: done('You vibrate. Your teeth chatter in a rhythm. You are absolutely ready to do... something. What was it?'),
      scones: done('The snails wrap a Brew in a napkin. "For the road, dear." You are now emotionally adopted.'),
    },
  },
];

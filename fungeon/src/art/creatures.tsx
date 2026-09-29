import type { ReactElement } from 'react';
import * as A1 from './act1';
import * as A2 from './act2';
import * as A3 from './act3';
import { Pip } from './player';
import { P } from './kit';
import { Eye, Smile, Hl, Shadow } from './kit';

export function Fallback() {
  return (<><Shadow rx={30} />
    <path d="M18 90 C10 50 30 30 52 30 C78 30 92 56 84 90Z" fill={P.lpurple} />
    <Hl x={40} y={42} rx={8} ry={4} r={-20} /><Eye x={38} y={62} r={6} /><Eye x={58} y={62} r={6} /><Smile x={48} y={76} w={6} h={3} /></>);
}

export const CREATURES: Record<string, () => ReactElement> = {
  pip: Pip,
  slug: A1.Slug, gnat: A1.Gnat, bark_beetle: A1.BarkBeetle, snail: A1.Snail, worker_ant: A1.WorkerAnt, toadlet: A1.Toadlet,
  stag_beetle: A1.StagBeetle, mole: A1.Mole, soldier_ant: A1.SoldierAnt, gloopius: A1.Gloopius, toad_king: A1.ToadKing,
  zombie_snail: A1.ZombieSnail,
  moth: A2.Moth, cave_cricket: A2.CaveCricket, slime_mold: A2.SlimeMold, glow_worm: A2.GlowWorm, bat: A2.Bat, centipede: A2.Centipede,
  spider: A2.Spider, crystal_crab: A2.CrystalCrab, echo_bat: A2.EchoBat, mothmother: A2.Mothmother, slime_colossus: A2.SlimeColossus,
  mold_puff: A3.MoldPuff, rot_rat: A3.RotRat, blighted_sprout: A3.BlightedSprout, carrion_fly: A3.CarrionFly, cultist_cap: A3.CultistCap,
  cordyceps_knight: A3.CordycepsKnight, morel: A3.Morel, mold_hydra: A3.MoldHydra, hydra_head: A3.HydraHeadArt, amanita_queen: A3.AmanitaQueen,
  blight_heart: A3.BlightHeart, slimelet: A3.Slimelet, mothling: A3.Mothling, sporeling: A3.Sporeling, mold_bud: A3.MoldBud,
};

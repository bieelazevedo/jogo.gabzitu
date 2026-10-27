import type {CharacterName} from './night-assets';
import type {CatKind, EnemyKind} from './types';

/**
 * How each tower defense unit is dressed with the CC0 KayKit characters. Cats reuse the adventurer rigs with
 * ears and a tail; reformed allies keep their skeleton bodies. `items` are the weapons already inside the
 * character file; `hold` attaches props from the item packs ([prop, bone]).
 */
export type CatLook={model:CharacterName;items?:string[];hold?:[string,string][];tint?:number;fur?:number;attack:string;scale?:number;glow?:number};
const melee='1H_Melee_Attack_Slice_Diagonal',cast='Spellcast_Shoot',raise='Spellcast_Raise',shoot='2H_Ranged_Shoot';
export const CAT_LOOKS:Record<CatKind,CatLook>={
 archer:{model:'Rogue_Hooded',items:['2H_Crossbow'],fur:0xc38b43,attack:shoot},
 ice:{model:'Mage',items:['2H_Staff'],tint:0xbfe6ff,fur:0xe9eef4,attack:cast,glow:0x8fe3ff},
 bomber:{model:'Rogue',items:['Throwable'],tint:0xffd2b0,fur:0xda865c,attack:'Throw'},
 commander:{model:'Knight',items:['1H_Sword','Badge_Shield'],tint:0xf2f0d0,fur:0xb2b879,attack:'Cheer'},
 knight:{model:'Knight',items:['1H_Sword','Round_Shield'],fur:0xa5adb8,attack:melee},
 witch:{model:'Mage',items:['1H_Wand','Spellbook_open'],tint:0xd6b8ff,fur:0x4b4560,attack:cast,glow:0xc58cff},
 bard:{model:'Mage',items:['Spellbook_open'],tint:0xffe2a8,fur:0xaf9569,attack:raise,glow:0xffd77a},
 monk:{model:'Rogue_Hooded',items:[],tint:0xffd0a0,fur:0xcb9257,attack:'1H_Melee_Attack_Stab',glow:0xffa860},
 engineer:{model:'Rogue',items:['1H_Crossbow'],tint:0xb8f0f0,fur:0x79adb1,attack:'1H_Ranged_Shoot',glow:0x7fe7ff},
 uia:{model:'Mage',items:['2H_Staff','Spellbook_open'],tint:0xffe7a0,fur:0xe1c58b,attack:'Spellcast_Summon',scale:1.18,glow:0xffe08a},
 pirate:{model:'Barbarian',items:['2H_Axe'],tint:0xffd8a8,fur:0xd89b55,attack:'2H_Melee_Attack_Chop'},
 samurai:{model:'Knight',items:['2H_Sword'],tint:0xbff2e6,fur:0x70c3b2,attack:'2H_Melee_Attack_Slice'},
 alchemist:{model:'Mage',items:['1H_Wand','Spellbook'],tint:0xd8ffb0,fur:0xb5d97c,attack:'Throw',glow:0xb6ff70},
 astronomer:{model:'Mage',items:['2H_Staff'],tint:0xc9c4ff,fur:0x6d6aa8,attack:'Spellcast_Long',glow:0xb3a8ff},
 gardener:{model:'Rogue',items:['Knife'],tint:0xc8f0b8,fur:0x80b678,attack:raise,glow:0x9ff07f},
 chef:{model:'Barbarian',items:['Mug'],tint:0xffe0c0,fur:0xefab74,attack:'1H_Melee_Attack_Chop'},
 boxer:{model:'Barbarian',items:[],tint:0xffc0c0,fur:0xe38989,attack:'1H_Melee_Attack_Stab'},
 guardian:{model:'Knight',items:['1H_Sword','Spike_Shield'],tint:0xc8f4ff,fur:0x79c8d4,attack:'Block',glow:0x8ff0ff},
 adminMage:{model:'Mage',items:['2H_Staff','Spellbook_open'],tint:0xb0fff6,fur:0x3e4f5c,attack:'Spellcast_Long',glow:0x7ce8e3},
 allyLegollas:{model:'Skeleton_Mage',hold:[['Skeleton_Staff','handslot.r']],tint:0xffb8c8,attack:cast,glow:0xff5a86},
 allyRatazao:{model:'Skeleton_Warrior',hold:[['Skeleton_Axe','handslot.r']],tint:0xe8c8a8,attack:'2H_Melee_Attack_Chop'},
 allyVacuum:{model:'Skeleton_Minion',hold:[['Skeleton_Blade','handslot.r'],['Skeleton_Blade','handslot.l']],tint:0xc8eef0,attack:'2H_Melee_Attack_Spin',glow:0x9ddbd4},
 allyKing:{model:'Skeleton_Warrior',hold:[['Skeleton_Axe','handslot.r'],['Skeleton_Shield_Large_A','handslot.l']],tint:0xffe08a,attack:'2H_Melee_Attack_Chop'},
 allyAdmiral:{model:'Skeleton_Rogue',hold:[['Skeleton_Crossbow','handslot.r']],tint:0xb8e2f0,attack:shoot},
 allyDuchess:{model:'Skeleton_Mage',hold:[['Skeleton_Staff','handslot.r']],tint:0xe2c4ff,attack:cast,glow:0xc69ee8},
 allyHydra:{model:'Skeleton_Minion',hold:[['Skeleton_Blade','handslot.r']],tint:0xc8f0b0,attack:cast,glow:0xa3d69b},
 allyKraken:{model:'Skeleton_Warrior',hold:[['Skeleton_Blade','handslot.r']],tint:0xffc8cc,attack:'2H_Melee_Attack_Spin',glow:0xd69297},
 allyMagistrate:{model:'Skeleton_Mage',hold:[['Skeleton_Staff','handslot.r']],tint:0xf0e4c8,attack:'1H_Melee_Attack_Chop'},
 allyPhoenix:{model:'Skeleton_Mage',hold:[['Skeleton_Staff','handslot.r']],tint:0xffc898,attack:cast,glow:0xffa050},
 allyArchivist:{model:'Skeleton_Mage',hold:[['Skeleton_Staff','handslot.r']],tint:0xc0f0ee,attack:cast,glow:0x9bd6d2},
};

/** Enemies: skeletons of the Nightreign host, plus the Quaternius dog (model 'Dog'). */
export type EnemyLook={model:CharacterName|'Dog';hold?:[string,string][];tint?:number;scale:number;run?:boolean;ghost?:boolean;crate?:boolean;attack?:string};
const blade:[string,string]=['Skeleton_Blade','handslot.r'],axe:[string,string]=['Skeleton_Axe','handslot.r'],staff:[string,string]=['Skeleton_Staff','handslot.r'],bow:[string,string]=['Skeleton_Crossbow','handslot.r'],shield:[string,string]=['Skeleton_Shield_Large_A','handslot.l'],buckler:[string,string]=['Skeleton_Shield_Small_A','handslot.l'];
export const ENEMY_LOOKS:Record<EnemyKind,EnemyLook>={
 rat:{model:'Skeleton_Minion',hold:[blade],scale:1.21},
 runner:{model:'Skeleton_Rogue',hold:[blade],scale:1.17,run:true},
 dog:{model:'Dog',scale:1.34},
 armored:{model:'Skeleton_Warrior',hold:[axe,shield],tint:0xc8d4e0,scale:1.36},
 swarm:{model:'Skeleton_Minion',scale:0.88,run:true},
 elite:{model:'Skeleton_Warrior',hold:[blade,buckler],tint:0xe2c4e8,scale:1.46,run:true},
 thief:{model:'Skeleton_Rogue',hold:[bow],tint:0xffe8a0,scale:1.17,run:true},
 shaman:{model:'Skeleton_Mage',hold:[staff],tint:0xb8d8ff,scale:1.31},
 scarab:{model:'Skeleton_Warrior',hold:[shield],tint:0xb8e8a8,scale:1.36},
 wisp:{model:'Skeleton_Mage',tint:0xa8e0ff,scale:1.21,ghost:true},
 drummer:{model:'Skeleton_Warrior',hold:[axe],tint:0xffb8a0,scale:1.36},
 mimic:{model:'Skeleton_Minion',scale:1.26,crate:true},
 legollas:{model:'Skeleton_Mage',hold:[staff],tint:0xff9cb4,scale:1.58},
 ratazao:{model:'Skeleton_Warrior',hold:[axe,shield],tint:0xe0b898,scale:1.58},
 vacuum:{model:'Skeleton_Minion',hold:[blade,['Skeleton_Blade','handslot.l']],tint:0xbfe0e4,scale:1.58,attack:'2H_Melee_Attack_Spin'},
 king:{model:'Skeleton_Warrior',hold:[axe,shield],tint:0xffdc78,scale:1.74},
 admiral:{model:'Skeleton_Rogue',hold:[bow],tint:0xa8d4ff,scale:1.52},
 duchess:{model:'Skeleton_Mage',hold:[staff],tint:0xd8b0ff,scale:1.52},
 hydra:{model:'Skeleton_Minion',hold:[blade],tint:0xa8f09c,scale:1.58},
 kraken:{model:'Skeleton_Warrior',hold:[blade,shield],tint:0x9ce8e0,scale:1.58},
 magistrate:{model:'Skeleton_Mage',hold:[staff],tint:0xe8e0c8,scale:1.52},
 phoenix:{model:'Skeleton_Mage',hold:[staff],tint:0xffb070,scale:1.52},
 archivist:{model:'Skeleton_Mage',hold:[staff],tint:0x9ce0dc,scale:1.67},
};

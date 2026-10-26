import {CATS,COMMON,ENEMIES,LEVELS} from './data';
import {RECRUIT_CATS,isUnique} from './expansion';
import {completed} from './persistence';
import type {CatKind,Save} from './types';
export const TEAM_LIMIT=8;
export function rememberedTeam(save:Save,coop=false){const list=coop?save.formation?.coopTeam:save.formation?.team;const unlocked=completed(save);return [...new Set(list||(['archer','ice'] as CatKind[]))].filter(k=>COMMON.includes(k)&&(coop&&!RECRUIT_CATS.includes(k)&&k!=='adminMage'||CATS[k].unlock<=unlocked)).slice(0,TEAM_LIMIT);}
export function suggestTeam(save:Save,id:number,chaos=false){
 const level=LEVELS[id-1],kinds=new Set(level.waves.flatMap(w=>w.groups.map(g=>g.kind))),armor=[...kinds].some(k=>ENEMIES[k].armor>=30),resist=[...kinds].some(k=>(ENEMIES[k].magicResist||0)>=.5),swarm=kinds.has('swarm'),routes=level.paths.length;
 const available=COMMON.filter(k=>CATS[k].unlock<=completed(save)),picked:CatKind[]=[];
 const add=(...choices:CatKind[])=>{const k=choices.find(k=>available.includes(k)&&!picked.includes(k));if(k&&picked.length<TEAM_LIMIT)picked.push(k);};
 add('archer');add('ice','gardener');
 if(swarm||routes>1)add('bomber','engineer','chef');
 if(armor)add('alchemist','witch','knight','adminMage');
 if(resist)add('pirate','samurai','knight');
 add('commander','bard');
 if(chaos||id>10)add('adminMage','astronomer','monk');
 if(routes>2)add('gardener','guardian','engineer');
 for(const k of ['witch','knight','monk','chef','astronomer','allyLegollas',...available] as CatKind[]){if(isUnique(k)&&picked.filter(isUnique).length>=2)continue;add(k);}
 const reasons=[armor?'Magia e quebra de armadura para os blindados.':'Dano acessível para a primeira onda.',resist?'Ataques físicos para inimigos resistentes à magia.':'Controlo para dar tempo aos atacantes.',routes>1?`${routes} rotas: distribui a equipa pelos flancos.`:'Uma rota: aproveita curvas e alcance.',chaos?'Caos: mantém moedas para reforços.':'Sugestão de partida, sem garantia de vitória.'];
 return {team:picked,reasons};
}
export function rosterGroup(k:CatKind){return RECRUIT_CATS.includes(k)?'bosses':['commander','bard','guardian'].includes(k)?'support':CATS[k].magic?'magic':'physical';}

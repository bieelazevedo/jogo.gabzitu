import {ENEMIES,LEVELS,waveFor} from './data';
import type {EnemyKind,State} from './types';
export function scoutWave(s:State){
 const level=LEVELS[s.levelId-1];
 if(s.mode!=='endless'&&s.wave>=level.waves.length)return null;
 const wave=waveFor(level,s.wave,s.mode==='chaos',s.mode==='endless');
 const totals=new Map<EnemyKind,{count:number;paths:Set<number>}>();
 for(const g of wave.groups){const row=totals.get(g.kind)||{count:0,paths:new Set<number>()};row.count+=g.count;row.paths.add(g.path+1);totals.set(g.kind,row);}
 const rows=[...totals].map(([kind,{count,paths}])=>({kind,count,paths:[...paths],name:ENEMIES[kind].boss?'Presença desconhecida':ENEMIES[kind].name,
  tip:ENEMIES[kind].boss?'Guarda uma habilidade e distribui o dano.':kind==='armored'?'Magia e perfuração vencem a armadura.':kind==='elite'?'Resiste à magia: combina dano físico e gelo.':kind==='runner'?'Abranda-os antes de chegarem à saída.':kind==='swarm'?'Explosões e ataques em área rendem mais.':kind==='dog'?'Dano constante; prioridade «Mais forte».':ENEMIES[kind].description}));
 return {number:s.wave+1,reward:wave.reward,rows,paths:[...new Set(wave.groups.map(g=>g.path+1))]};
}
export const COMBOS=[
 {name:'Choque térmico',recipe:'Gelo / Água + Fogo',tip:'+18 de dano mágico quando um alvo está a arder e abrandado.'},
 {name:'Lata marinada',recipe:'Armadura quebrada + Veneno',tip:'+12 de dano mágico. Cavaleiro Fende-latas ou Terra + Bruxo.'}
];

import type {NightState,NightPlayer} from './night-simulation';
import {nightXpThreshold} from './night-simulation';
import {NIGHT_HOMESTEADS} from './night-expedition';

export const NIGHT_NPCS=[
 {id:'mara',name:'Mara',title:'Guardiã dos Trilhos',x:39,z:25,classId:'guardian',quest:'trails',line:'Os trilhos voltam a ser nossos quando os acampamentos caírem.'},
 {id:'lio',name:'Lio',title:'Cartógrafo das Clareiras',x:-43,z:34,classId:'ranger',quest:'homesteads',line:'Há gente a viver para lá das árvores. Descobre as suas quintas e traz-me notícias.'},
 {id:'astra',name:'Mestra Astra',title:'Mentora da Ordem',x:-4,z:29,classId:'astral',quest:'first-moon',line:'Sobreviver é o princípio. Domina a primeira lua e eu ensino-te a ir mais longe.'},
] as const;
export const NIGHT_MISSIONS=[
 {id:'trails',npc:'mara',title:'Os trilhos perdidos',description:'Limpa dois acampamentos depois de aceitar a missão.',kind:'camps',goal:2,gold:160,xp:120,points:1},
 {id:'homesteads',npc:'lio',title:'Luzes entre as árvores',description:'Visita duas quintas diferentes na floresta. Aproxima-te da casa para registar a visita.',kind:'visit',goal:2,gold:130,xp:100,points:1},
 {id:'first-moon',npc:'astra',title:'Prova do luar',description:'Derrota um guardião de lua e regressa à Mestra Astra.',kind:'boss',goal:1,gold:220,xp:180,points:2},
] as const;
export type MissionRecord={baseline:number;visited:number[];claimed:boolean;stage?:number;progress?:number};
export const NIGHT_TALENTS=[
 {id:'veteran',name:'Disciplina da Ordem',description:'+5% de dano físico e mágico por grau.',minLevel:3,cost:160,max:3},
 {id:'survivor',name:'Nona vida',description:'+15 de vida máxima e cura imediata de 15 por grau.',minLevel:3,cost:130,max:3},
 {id:'scholar',name:'Memória arcana',description:'−4% de recarga nas habilidades por grau.',minLevel:4,cost:150,max:3},
] as const;
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export const nearbyNpc=(p:NightPlayer)=>NIGHT_NPCS.find(n=>distance(n,p)<4.5);
export function canTrain(s:NightState,p:NightPlayer){return s.phase==='sanctuary'||p.hp>0&&s.phase==='explore'&&distance(p,NIGHT_NPCS[2])<5;}
export function missionProgress(s:NightState,p:NightPlayer,id:string){
 const mission=NIGHT_MISSIONS.find(m=>m.id===id),record=p.missions?.[id];if(!mission||!record)return 0;
 if(mission.kind==='visit')return record.visited.length;
 if(mission.kind==='camps')return Math.min(mission.goal,Math.max(record.progress||0,(s.cleared?.length||0)-record.baseline));
 return s.stage>record.baseline||s.stage===record.baseline&&(s.phase==='sanctuary'||s.phase==='won')?1:0;
}
export function acceptMission(s:NightState,index:number,id:string){
 const p=s.players[index],m=NIGHT_MISSIONS.find(m=>m.id===id),npc=NIGHT_NPCS.find(n=>n.quest===id);
 if(!p||!m||!npc||p.hp<=0||!['explore','sanctuary'].includes(s.phase)||distance(p,npc)>=4.5||p.missions?.[id])return false;
 p.missions??={};p.missions[id]={baseline:m.kind==='boss'?s.stage:m.kind==='camps'?s.cleared?.length||0:0,visited:[],claimed:false,stage:s.stage,progress:0};return true;
}
export function claimMission(s:NightState,index:number,id:string){
 const p=s.players[index],m=NIGHT_MISSIONS.find(m=>m.id===id),npc=NIGHT_NPCS.find(n=>n.quest===id),record=p?.missions?.[id];
 if(!p||!m||!npc||!record||record.claimed||p.hp<=0||!['explore','sanctuary'].includes(s.phase)||distance(p,npc)>=4.5||missionProgress(s,p,id)<m.goal)return false;
 record.claimed=true;p.gold+=m.gold;p.xp=Math.min(nightXpThreshold(15),p.xp+m.xp);p.points=Math.min(28,p.points+m.points);
 while(p.level<15&&p.xp>=nightXpThreshold(p.level+1)){p.level++;p.points=Math.min(28,p.points+2);}return true;
}
export function updateCampaign(s:NightState){for(const p of s.players){const camps=p.missions?.trails;if(camps&&!camps.claimed){if(camps.stage!==undefined&&camps.stage!==s.stage)camps.baseline=-(camps.progress||0);camps.stage=s.stage;camps.progress=Math.min(2,Math.max(camps.progress||0,(s.cleared?.length||0)-camps.baseline));}const record=p.missions?.homesteads;if(s.phase!=='explore'||!record||record.claimed||p.hp<=0)continue;NIGHT_HOMESTEADS.forEach((h,i)=>{if(distance(p,h)<8&&!record.visited.includes(i))record.visited.push(i);});}}
export function buyTalent(s:NightState,index:number,id:string){
 const p=s.players[index],t=NIGHT_TALENTS.find(t=>t.id===id);if(!p||!t||!canTrain(s,p))return false;
 const rank=p.talents?.[id]||0,cost=t.cost+rank*65;if(rank>=t.max||p.level<t.minLevel+rank*2||p.gold<cost)return false;
 p.gold-=cost;p.talents??={};p.talents[id]=rank+1;if(id==='survivor'){p.maxHp+=15;p.hp=Math.min(p.maxHp,p.hp+15);}return true;
}
export function validCampaign(p:NightPlayer){
 return (!p.missions||typeof p.missions==='object'&&!Array.isArray(p.missions)&&Object.keys(p.missions).length<=3&&Object.entries(p.missions).every(([id,r])=>NIGHT_MISSIONS.some(m=>m.id===id)&&r&&Number.isInteger(r.baseline)&&r.baseline>=-2&&r.baseline<=13&&(r.stage===undefined||Number.isInteger(r.stage)&&r.stage>=1&&r.stage<=3)&&(r.progress===undefined||Number.isInteger(r.progress)&&r.progress>=0&&r.progress<=2)&&typeof r.claimed==='boolean'&&Array.isArray(r.visited)&&r.visited.length<=3&&new Set(r.visited).size===r.visited.length&&r.visited.every(i=>Number.isInteger(i)&&i>=0&&i<3)))&&(!p.talents||typeof p.talents==='object'&&!Array.isArray(p.talents)&&Object.keys(p.talents).length<=3&&Object.entries(p.talents).every(([id,rank])=>NIGHT_TALENTS.some(t=>t.id===id)&&Number.isInteger(rank)&&rank>=0&&rank<=3));
}

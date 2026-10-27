import {CATS,ENEMIES,LEVELS} from './data';
import type {State} from './types';
import {saveScope,progressIsVolatile} from './persistence';
/** Map layout generation: checkpoints from older maps (different routes and spots) are not resumed. */
export const MAP_LAYOUT=2;
export interface Checkpoint{version:1;layout?:number;savedAt:string;state:State}
const key=()=>`mb-checkpoint-v1${saveScope()}`;
const number=(v:unknown,min=0,max=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function validateCheckpoint(raw:unknown):Checkpoint{
 if(!raw||typeof raw!=='object')throw Error('Ponto de recuperação inválido.');const cp=raw as Checkpoint,s=cp.state;
 if(cp.version!==1||cp.layout!==MAP_LAYOUT||!number(Date.parse(cp.savedAt),0,Date.now()+86400000)||!s||s.version!==1||!Number.isInteger(s.levelId)||!LEVELS[s.levelId-1]||!['campaign','chaos','endless'].includes(s.mode)||s.status!=='playing')throw Error('Ponto de recuperação incompatível.');
 const l=LEVELS[s.levelId-1];
 if(!number(s.hp,1,100)||s.maxHp!==100||!number(s.time)||!number(s.tick)||!number(s.nextId,1)||![1,2,3,4,5].includes(s.speed)||!Number.isInteger(s.wave)||!number(s.wave,0,100000)||!number(s.completed,0,s.wave)||!Array.isArray(s.players)||s.players.length!==1||!number(s.players[0].coins)||!Array.isArray(s.players[0].team)||s.players[0].team.length>9||s.players[0].team.some(k=>!Object.hasOwn(CATS,k)))throw Error('Estado de recuperação inválido.');
 if(!Array.isArray(s.towers)||s.towers.length>l.spots.length||new Set(s.towers.map(t=>t.spot)).size!==s.towers.length||s.towers.some(t=>!Object.hasOwn(CATS,t.kind)||t.owner!==0||!Number.isInteger(t.spot)||!l.spots[t.spot]||![1,2,3].includes(t.level)||!['','a','b'].includes(t.branch)||!number(t.invested)||!number(t.casts)))throw Error('Defesas de recuperação inválidas.');
 if(!Array.isArray(s.enemies)||s.enemies.length>180||s.enemies.some(e=>!Object.hasOwn(ENEMIES,e.kind)||!l.paths[e.path]||!number(e.progress,0,1)||!number(e.maxHp,1)||!number(e.hp,0,e.maxHp)))throw Error('Inimigos de recuperação inválidos.');
 if(!Array.isArray(s.active)||s.active.length>2||!Array.isArray(s.projectiles)||s.projectiles.length>512||!Array.isArray(s.effects)||s.effects.length>100||!Array.isArray(s.traps)||s.traps.length>12)throw Error('Objetos de recuperação inválidos.');
 const player=s.players[0];
 if(!player.cds||['yarn','war','heal','box','sardine','uia'].some(k=>!number(player.cds[k as keyof typeof player.cds],0,100000))||!Array.isArray(player.skills)||player.skills.length!==2||player.skills.some(k=>!['yarn','war','heal','box','sardine'].includes(k))||!number(player.heals,0,2))throw Error('Habilidades de recuperação inválidas.');
 if(s.projectiles.some(p=>!Object.hasOwn(CATS,p.kind)||!p.pos||!number(p.pos.x,-1000,2000)||!number(p.pos.y,-1000,1600)||!number(p.speed,1,10000)||!number(p.damage,0,100000))||s.active.some(w=>!Number.isInteger(w.index)||!number(w.index,0,100000)||!number(w.elapsed)||!Array.isArray(w.spawned)||w.spawned.some(n=>!number(n,0,10000))))throw Error('Ataques de recuperação inválidos.');
 const serialized=JSON.stringify(cp);if(serialized.length>500000)throw Error('Recuperação demasiado grande.');
 function finite(value:unknown,depth=0):boolean{if(depth>12)return false;if(typeof value==='number')return Number.isFinite(value);if(Array.isArray(value))return value.length<=512&&value.every(v=>finite(v,depth+1));if(value&&typeof value==='object')return Object.entries(value).every(([k,v])=>!['__proto__','constructor','prototype'].includes(k)&&finite(v,depth+1));return value===null||typeof value==='boolean'||typeof value==='string'&&value.length<=2000;}
 if(!finite(cp))throw Error('A recuperação contém valores inválidos.');return structuredClone(cp);
}
export function writeCheckpoint(state:State):Checkpoint|null{if(progressIsVolatile())return null;if(!['campaign','chaos','endless'].includes(state.mode)||state.players.length!==1||state.status!=='playing')return null;const cp:Checkpoint={version:1,layout:MAP_LAYOUT,savedAt:new Date().toISOString(),state:structuredClone(state)};try{localStorage.setItem(key(),JSON.stringify(cp));return cp;}catch{return null;}}
export function readCheckpoint():Checkpoint|null{if(progressIsVolatile())return null;try{const raw=localStorage.getItem(key());return raw?validateCheckpoint(JSON.parse(raw)):null;}catch{return null;}}
export function storeCheckpoint(cp:Checkpoint|null){if(progressIsVolatile())return;try{if(cp)localStorage.setItem(key(),JSON.stringify(validateCheckpoint(cp)));else localStorage.removeItem(key());}catch{}}
export const clearCheckpoint=()=>storeCheckpoint(null);

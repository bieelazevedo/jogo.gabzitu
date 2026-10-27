import {NIGHT_MONUMENTS} from './night-expedition';
import type {NightState,NightEnemy,NightPlayer} from './night-simulation';
import {nightXpThreshold} from './night-simulation';

export type SurvivalTrial={monument:string;elapsed:number;duration:number;wave:number;nextWave:number;participants:string[];reserved:NightEnemy[];status:'active'|'won'|'failed';winners:string[];endedAt:number};
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export const trialActive=(s:NightState)=>s.trial?.status==='active';
export const trialMember=(s:NightState,p:{id:string})=>!!trialActive(s)&&s.trial!.participants.includes(p.id);
export const nearbyMonument=(p:{x:number;z:number})=>NIGHT_MONUMENTS.find(m=>distance(m,p)<4);
export function activateTrial(s:NightState,index:number,id:string){
 const p=s.players[index],m=NIGHT_MONUMENTS.find(m=>m.id===id);if(!p||!m||p.hp<=0||s.phase!=='explore'||trialActive(s)||s.completedTrials?.includes(id)||distance(m,p)>=4)return false;
 const participants=s.players.filter(p=>p.hp>0&&distance(p,m)<m.r-.7).map(p=>p.id);if(!participants.includes(p.id))return false;
 // Park only distant, dormant enemies while reserving space for ritual waves. The wire state stays bounded.
 const far=s.enemies.filter(e=>e.hp<=0||s.players.every(p=>p.hp<=0||distance(p,e)>24)).sort((a,b)=>distance(b,m)-distance(a,m));
 const reserved=far.slice(0,Math.max(0,s.enemies.length-24)),ids=new Set(reserved.map(e=>e.id));s.enemies=s.enemies.filter(e=>!ids.has(e.id));
 s.trial={monument:id,elapsed:0,duration:m.duration,wave:0,nextWave:3,participants,reserved,status:'active',winners:[],endedAt:0};s.hostile=[];s.hazards=[];s.projectiles=[];constrainTrial(s);return true;
}
export function trialHitAllowed(s:NightState,p:NightPlayer,target:object){return !trialActive(s)||trialMember(s,p)===('trial' in target&&target.trial===s.trial!.monument);}
export function trialPlayersFor(s:NightState,enemy:NightEnemy){return s.players.filter(p=>p.hp>0&&(!trialActive(s)||trialMember(s,p)===(enemy.trial===s.trial!.monument)));}
export function trialProjectileAllowed(s:NightState,p:NightPlayer,source:{trial?:string}){return !trialActive(s)||trialMember(s,p)===(source.trial===s.trial!.monument);}
/** Continuous cylindrical boundary: also corrects jumps, knockback and blink, in both directions. */
export function constrainTrial(s:NightState){
 if(!trialActive(s))return;const t=s.trial!,m=NIGHT_MONUMENTS.find(m=>m.id===t.monument)!;
 const project=(p:{x:number;z:number},inside:boolean,margin:number)=>{const dx=p.x-m.x,dz=p.z-m.z,d=Math.hypot(dx,dz),r=inside?m.r-margin:m.r+margin;if(inside?d<=r:d>=r)return;const a=d>1e-6?Math.atan2(dx,dz):0;p.x=m.x+Math.sin(a)*r;p.z=m.z+Math.cos(a)*r;};
 s.players.forEach(p=>project(p,t.participants.includes(p.id),.6));s.enemies.forEach(e=>project(e,e.trial===t.monument,.85));
}
function finish(s:NightState,won:boolean){
 const t=s.trial!,m=NIGHT_MONUMENTS.find(m=>m.id===t.monument)!;t.status=won?'won':'failed';t.endedAt=s.time;t.winners=won?s.players.filter(p=>p.hp>0&&t.participants.includes(p.id)).map(p=>p.id):[];
 s.enemies=[...s.enemies.filter(e=>!e.trial),...t.reserved];t.reserved=[];s.hostile=s.hostile.filter(p=>!p.trial);s.hazards=s.hazards.filter(p=>!p.trial);s.projectiles=[];
 if(won){s.completedTrials??=[];s.completedTrials.push(m.id);for(const p of s.players){if(!t.winners.includes(p.id))continue;p.gold+=m.gold;p.xp=Math.min(nightXpThreshold(15),p.xp+m.xp);p.points=Math.min(28,p.points+1);while(p.level<15&&p.xp>=nightXpThreshold(p.level+1)){p.level++;p.points=Math.min(28,p.points+2);}}}
}
export function stepTrial(s:NightState,dt:number){
 if(!trialActive(s))return;const t=s.trial!,m=NIGHT_MONUMENTS.find(m=>m.id===t.monument)!;
 if(!s.players.some(p=>p.hp>0&&t.participants.includes(p.id))){finish(s,false);return;}
 t.elapsed=Math.min(t.duration,t.elapsed+dt);if(t.elapsed>=t.duration){finish(s,true);return;}
 // Fallen ritual monsters never respawn or yield ordinary camp rewards; the prize is survival.
 s.enemies=s.enemies.filter(e=>!e.trial||e.hp>0||e.dead>53.4);
 if(t.elapsed<t.nextWave)return;t.nextWave+=9;t.wave++;
 const living=s.enemies.filter(e=>e.trial&&e.hp>0).length,count=Math.max(0,Math.min(5,2+Math.floor(t.participants.length/2),14-living,40-s.enemies.length));
 for(let k=0;k<count;k++){const id=100+(t.wave-1)*5+k,a=t.wave*1.71+k*2.399,r=m.r-2,x=m.x+Math.sin(a)*r,z=m.z+Math.cos(a)*r,hp=Math.round((55+s.stage*15)*(1+(t.participants.length-1)*.3)*s.difficulty);
  s.enemies.push({id,x,z,homeX:x,homeZ:z,hp,max:hp,kind:t.wave>3&&k===0?3:k%3,timer:1,wind:0,tx:x,tz:z,hit:0,dead:0,facing:a,slow:0,weaken:0,moving:0,recovery:0,aggro:10,evade:0,evadeCd:0,evadeX:0,evadeZ:0,trial:m.id});
 }
}
export function validTrials(s:NightState){
 if(s.completedTrials&&(!Array.isArray(s.completedTrials)||s.completedTrials.length>3||new Set(s.completedTrials).size!==s.completedTrials.length||!s.completedTrials.every(id=>NIGHT_MONUMENTS.some(m=>m.id===id))))return false;
 const t=s.trial;if(!t)return true;const m=NIGHT_MONUMENTS.find(m=>m.id===t.monument);return !!m&&['active','won','failed'].includes(t.status)&&Number.isFinite(t.elapsed)&&t.elapsed>=0&&t.elapsed<=m.duration&&t.duration===m.duration&&Number.isInteger(t.wave)&&t.wave>=0&&t.wave<=20&&Number.isFinite(t.nextWave)&&Number.isFinite(t.endedAt)&&Array.isArray(t.participants)&&t.participants.length>0&&t.participants.length<=5&&new Set(t.participants).size===t.participants.length&&t.participants.every(id=>s.players.some(p=>p.id===id))&&Array.isArray(t.winners)&&t.winners.length<=5&&t.winners.every(id=>t.participants.includes(id))&&Array.isArray(t.reserved)&&t.reserved.length<=40&&t.reserved.every(e=>e&&!e.trial&&[e.id,e.x,e.z,e.hp,e.max].every(Number.isFinite))&&(t.status!=='active'||s.phase==='explore');
}

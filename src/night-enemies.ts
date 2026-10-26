import {NIGHT_OBSTACLES} from './night-data';
import type {NightState,NightPlayer,NightEnemy} from './night-simulation';
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export function nightSight(a:{x:number;z:number},b:{x:number;z:number}){const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;if(len<.01)return true;return !NIGHT_OBSTACLES.some(o=>{const t=Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/len));return Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z)<o.r;});}
/** Local steering avoids solid scenery and separates pack members; bounded to thirty actors. */
export function enemySteer(e:NightEnemy,tx:number,tz:number,speed:number,dt:number,pack:NightEnemy[],move:(p:NightEnemy,x:number,z:number,b:boolean)=>void){let dx=tx-e.x,dz=tz-e.z;const len=Math.hypot(dx,dz);if(len<.2){e.moving=0;return;}dx/=len;dz/=len;for(const o of NIGHT_OBSTACLES){const ahead={x:e.x+dx*2,z:e.z+dz*2};if(distance(ahead,o)<o.r+.9){const side=(o.x-e.x)*dz-(o.z-e.z)*dx>=0?1:-1;const old=dx;dx=-dz*side;dz=old*side;break;}}for(const other of pack){if(other===e||other.hp<=0)continue;const d=distance(e,other);if(d>0&&d<1.7){dx+=(e.x-other.x)/d*(1.7-d);dz+=(e.z-other.z)/d*(1.7-d);}}const n=Math.max(1,Math.hypot(dx,dz)),oldX=e.x,oldZ=e.z;move(e,dx/n*speed*dt,dz/n*speed*dt,false);e.moving=Math.min(1,Math.hypot(e.x-oldX,e.z-oldZ)/Math.max(.001,speed*dt));if(e.moving>.1)e.facing=Math.atan2(dx,dz);}
export function stepNightEnemies(s:NightState,dt:number,hurt:(s:NightState,p:NightPlayer,n:number)=>void,move:(p:NightEnemy,x:number,z:number,b:boolean)=>void,impact:(x:number,z:number,value:number)=>void){
 const alive=s.players.filter(p=>p.hp>0);if(!alive.length)return;
 for(const e of s.enemies){e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.weaken=Math.max(0,e.weaken-dt);e.recovery=Math.max(0,e.recovery-dt);e.moving=0;e.timer-=dt;e.evadeCd=Math.max(0,e.evadeCd-dt);if(e.evade>0){e.evade=Math.max(0,e.evade-dt);enemySteer(e,e.x+e.evadeX*4,e.z+e.evadeZ*4,7,dt,s.enemies,move);continue;}
  if(e.hp<=0){e.dead-=dt;if(e.dead<=0&&!alive.some(p=>distance(p,e)<14)){e.hp=e.max;e.x=e.homeX;e.z=e.homeZ;e.aggro=0;e.wind=0;e.timer=1.5;}continue;}
  const nearest=alive.reduce((a,b)=>distance(a,e)<distance(b,e)?a:b);if(e.hit>0||distance(nearest,e)<11&&nightSight(e,nearest))e.aggro=8;else e.aggro=Math.max(0,e.aggro-dt);
  if(!e.aggro&&s.enemies.some(a=>a!==e&&a.hp>0&&a.aggro>6&&Math.floor((a.id-1)/4)===Math.floor((e.id-1)/4)))e.aggro=6;
  if(distance(e,{x:e.homeX,z:e.homeZ})>23)e.aggro=0;
  if(!e.aggro){e.wind=0;enemySteer(e,e.homeX,e.homeZ,3,dt,s.enemies,move);continue;}
  const taunt=alive.find(p=>p.taunt>0&&distance(p,e)<12),ranked=[...alive].sort((a,b)=>distance(a,e)-distance(b,e));const target=taunt||(ranked.length>1&&distance(ranked[1],e)<distance(ranked[0],e)+3&&e.id%3===0?ranked[1]:ranked[0]),d=distance(e,target),elite=e.kind===3,range=e.kind===1?10:e.kind===2?12:elite?3.5:2.6;
  const amount=(e.kind===1?18:e.kind===2?20:elite?32:20)+(s.stage-1)*5;const damage=amount*(e.homeZ<-20?1.3:e.homeZ<0?1.15:1)*s.difficulty*(1+(s.players.length-1)*.06)*(e.weaken>0?.7:1);
  if(e.wind>0){e.wind-=dt;e.facing=Math.atan2(e.tx-e.x,e.tz-e.z);if(e.wind<=0){e.recovery=.4;e.timer=(elite?2.1:e.kind===2?2.6:1.8)/(1+(s.stage-1)*.12);
    if(e.kind===1){const a=Math.atan2(e.tx-e.x,e.tz-e.z);if(s.hostile.length<36)s.hostile.push({id:s.nextId++,x:e.x,z:e.z,vx:Math.sin(a)*13,vz:Math.cos(a)*13,life:1.7,damage});}
    else if(e.kind===2){if(s.hazards.length<12)s.hazards.push({id:s.nextId++,x:e.tx,z:e.tz,r:2.8,life:2.4,pulse:0,damage:damage*.55});impact(e.tx,e.tz,2);}
    else {for(const p of alive){const v=Math.atan2(p.x-e.x,p.z-e.z),arc=Math.abs(Math.atan2(Math.sin(v-e.facing),Math.cos(v-e.facing)));if(distance(p,e)<range+.35&&(elite||arc<1.15))hurt(s,p,damage);}impact(e.x,e.z,elite?5:1);
     const follow=alive.find(p=>distance(p,e)<range+1.2);// Common enemies learn combos from the second moon; elites always chain.
     if(follow&&(e.combo||0)<(elite?2:s.stage>=2?1:0)){e.combo=(e.combo||0)+1;e.recovery=.15;e.timer=0;e.wind=.45;e.tx=follow.x;e.tz=follow.z;}else e.combo=0;}
   }continue;}
  const incoming=s.projectiles.find(p=>distance(p,e)<3.5&&p.target===e.id);if((e.kind===1||elite)&&e.evadeCd===0&&e.timer<.2&&incoming&&Math.floor(s.time*2+e.id)%3===0){const a=Math.atan2(e.x-target.x,e.z-target.z)+(e.id%2?1:-1)*Math.PI/2;enemySteer(e,e.x+Math.sin(a)*4,e.z+Math.cos(a)*4,8,dt,s.enemies,move);e.evade=.3;e.evadeCd=5;e.evadeX=Math.sin(a);e.evadeZ=Math.cos(a);e.recovery=.35;e.timer=1.2;continue;}
  if(e.recovery>0)continue;const visible=nightSight(e,target),busy=s.enemies.filter(o=>o!==e&&o.hp>0&&o.wind>0&&o.kind!==1&&o.kind!==2&&Math.hypot(o.tx-target.x,o.tz-target.z)<2.5).length;
  if(d<range&&visible&&e.timer<=0&&(busy<2||e.kind===1||e.kind===2)){const punish=target.action>0&&target.action!==4;e.wind=(e.kind===2?1.05:elite?1:.7)*(punish?.8:1);
   // Archers lead a moving target.
   const lead=e.kind===1?Math.min(1.2,d/13)*target.moving*2.2:0;e.tx=target.x+Math.sin(target.facing)*lead;e.tz=target.z+Math.cos(target.facing)*lead;continue;}
  if(d<range+1.5&&busy>=2&&e.kind!==1&&e.kind!==2){const angle=Math.atan2(e.x-target.x,e.z-target.z)+.9*dt*(e.id%2?1:-1);enemySteer(e,target.x+Math.sin(angle)*3.6,target.z+Math.cos(angle)*3.6,2.6,dt,s.enemies,move);continue;}
  const speed=(elite?4.1:3.7)*(e.slow>0?.5:1);let tx=target.x,tz=target.z;
  if(e.kind===1||e.kind===2){if(d<6){tx=e.x+(e.x-target.x)/(d||1)*4;tz=e.z+(e.z-target.z)/(d||1)*4;}else if(d<range&&visible){const angle=Math.atan2(e.x-target.x,e.z-target.z)+(e.id%2?1:-1)*.3;tx=target.x+Math.sin(angle)*8;tz=target.z+Math.cos(angle)*8;}}
  else if(d>4){const angle=Math.atan2(e.x-target.x,e.z-target.z)+(e.id%3-1)*.7;tx=target.x+Math.sin(angle)*2;tz=target.z+Math.cos(angle)*2;}
  enemySteer(e,tx,tz,speed,dt,s.enemies,move);
 }
 for(const shot of s.hostile){const old={x:shot.x,z:shot.z};shot.life-=dt;shot.x+=shot.vx*dt;shot.z+=shot.vz*dt;if(!nightSight(old,shot)){shot.life=0;continue;}for(const p of alive)if(distance(p,shot)<.9){hurt(s,p,shot.damage);shot.life=0;impact(p.x,p.z,1);break;}}
 s.hostile=s.hostile.filter(p=>p.life>0);for(const h of s.hazards){h.life-=dt;h.pulse-=dt;if(h.pulse<=0){h.pulse=.8;for(const p of alive)if(distance(h,p)<h.r)hurt(s,p,h.damage);}}s.hazards=s.hazards.filter(h=>h.life>0);
}

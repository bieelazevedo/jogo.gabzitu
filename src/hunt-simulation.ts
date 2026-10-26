/** Host-authoritative action combat. Distances use arena units. */
export type HuntInput={x:number;z:number;attack:boolean;dodge:boolean;power:boolean;ultimate:boolean};
export type Hunter={x:number;z:number;hp:number;stamina:number;energy:number;facing:number;moving:number;dash:number;dx:number;dz:number;dodgeCd:number;powerCd:number;attackCd:number;revive:number;hit:number;shield:number;combo:number;chain:number;action:number;actionTime:number;duration:number;strike:number;queued:number;queueTimer:number;casts:number;damage:number};
export type HuntBoss={x:number;z:number;hp:number;max:number;timer:number;total:number;attack:number;tx:number;tz:number;angle:number;phase:number;stage:number;cycle:number;stagger:number;hit:number;impacts:number};
export type HuntProjectile={id:number;owner:number;x:number;z:number;vx:number;vz:number;life:number;damage:number;charged:boolean};
export type HuntEvent={id:number;kind:'hit'|'hurt'|'slash'|'cast'|'dodge'|'heal'|'impact'|'stagger'|'ultimate'|'phase';x:number;z:number;value:number;owner:number;time:number};
export type HuntState={version:2;arenaId:number;tick:number;time:number;players:Hunter[];boss:HuntBoss;projectiles:HuntProjectile[];events:HuntEvent[];nextId:number;status:'playing'|'won'|'lost'};
export const BOSS_HP=4800,ARENA_RADIUS=12;
export const HUNT_ARENAS=[
 {id:1,name:'Claustro da Lua',boss:'O Devorador de Sachês',hp:4800,sky:0x101c2b,floor:0xa4bdc0,fur:0x65506d,cloth:0x8f3b55,description:'Aprende a ler as garras, saltos e marés do guardião.'},
 {id:2,name:'Pátio das Cinzas',boss:'Barão da Lata Queimada',hp:5400,sky:0x28191f,floor:0xb89978,fur:0x79503c,cloth:0xa5532f,description:'Mais investidas e saltos: desvia para os lados e aproveita a recuperação.'},
 {id:3,name:'Santuário do Eclipse',boss:'Vigia do Sachê Proibido',hp:6000,sky:0x17152c,floor:0x8b85b3,fur:0x51467b,cloth:0x493b86,description:'Marés e explosões alternam zonas seguras. Guarda vigor para mudar de distância.'}
] as const;
export const huntArena=(id:number)=>HUNT_ARENAS.find(a=>a.id===id)||HUNT_ARENAS[0];

export const idleInput=():HuntInput=>({x:0,z:0,attack:false,dodge:false,power:false,ultimate:false});
export function newHunt(arenaId=1):HuntState{const arena=huntArena(arenaId);return {version:2,arenaId:arena.id,tick:0,time:0,players:[-2.2,2.2].map(x=>({x,z:5,hp:100,stamina:100,energy:0,facing:Math.PI,moving:0,dash:0,dx:0,dz:0,dodgeCd:0,powerCd:0,attackCd:0,revive:0,hit:0,shield:0,combo:0,chain:0,action:0,actionTime:0,duration:0,strike:0,queued:0,queueTimer:0,casts:0,damage:0})),boss:{x:0,z:-2,hp:arena.hp,max:arena.hp,timer:3,total:3,attack:0,tx:0,tz:0,angle:0,phase:1,stage:0,cycle:0,stagger:0,hit:0,impacts:0},projectiles:[],events:[],nextId:1,status:'playing'};}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export function validHuntInput(v:unknown):v is HuntInput{const a=v as HuntInput;return !!a&&finite(a.x)&&finite(a.z)&&Math.abs(a.x)<=1&&Math.abs(a.z)<=1&&['attack','dodge','power','ultimate'].every(k=>typeof a[k as keyof HuntInput]==='boolean');}
export function validHunt(v:unknown):v is HuntState{
 const a=v as HuntState;if(!a||a.version!==2||![1,2,3].includes(a.arenaId)||!Number.isInteger(a.tick)||a.tick<0||!finite(a.time)||!['playing','won','lost'].includes(a.status)||!Array.isArray(a.players)||a.players.length!==2||!a.boss)return false;
 const sample=newHunt();return a.players.every(p=>p&&Object.keys(sample.players[0]).every(k=>finite(p[k as keyof Hunter]))&&Math.hypot(p.x,p.z)<=ARENA_RADIUS+.1&&p.hp>=0&&p.hp<=100&&p.stamina>=0&&p.stamina<=100&&p.energy>=0&&p.energy<=100&&p.action>=0&&p.action<=4)&&Object.keys(sample.boss).every(k=>finite(a.boss[k as keyof HuntBoss]))&&Math.hypot(a.boss.x,a.boss.z)<=9&&a.boss.max===huntArena(a.arenaId).hp&&a.boss.hp>=0&&a.boss.hp<=a.boss.max&&[0,1,2,3,4,5].includes(a.boss.attack)&&[0,1,2,3,4].includes(a.boss.stage)&&Array.isArray(a.projectiles)&&a.projectiles.length<=24&&a.projectiles.every(p=>p&&['id','owner','x','z','vx','vz','life','damage'].every(k=>finite(p[k as keyof HuntProjectile]))&&[0,1].includes(p.owner)&&typeof p.charged==='boolean')&&Array.isArray(a.events)&&a.events.length<=48&&a.events.every(e=>e&&['id','x','z','value','owner','time'].every(k=>finite(e[k as keyof HuntEvent]))&&['hit','hurt','slash','cast','dodge','heal','impact','stagger','ultimate','phase'].includes(e.kind));
}
function event(s:HuntState,kind:HuntEvent['kind'],x:number,z:number,value=0,owner=-1){s.events.push({id:s.nextId++,kind,x,z,value,owner,time:s.time});if(s.events.length>48)s.events.shift();}
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
function bound(p:{x:number;z:number},r:number){const d=Math.hypot(p.x,p.z);if(d>r){p.x*=r/d;p.z*=r/d;}}
function damageBoss(s:HuntState,owner:number,amount:number,stagger:number){const b=s.boss;if(b.hp<=0)return;const dealt=Math.min(b.hp,Math.round(amount*(b.stage===4?1.4:1)));b.hp-=dealt;b.hit=.16;const p=s.players[owner];p.energy=Math.min(100,p.energy+dealt/6);p.damage+=dealt;if(b.stage!==4)b.stagger=Math.min(100,b.stagger+stagger);event(s,'hit',b.x,b.z,dealt,owner);if(b.stagger>=100&&b.stage!==4){b.stage=4;b.attack=0;b.timer=3.4;b.total=3.4;b.stagger=0;event(s,'stagger',b.x,b.z);}}
function hurt(s:HuntState,p:Hunter,amount:number){if(p.hp<=0||p.dash>0)return;const value=p.shield>0?Math.ceil(amount*.45):amount;p.hp=Math.max(0,p.hp-value);p.hit=.35;p.chain=0;if(p.hp===0){p.action=0;p.strike=0;p.queued=0;}event(s,'hurt',p.x,p.z,value,s.players.indexOf(p));}
function shoot(s:HuntState,p:Hunter,owner:number,damage:number,charged=false){if(s.projectiles.length>=24)return;const angle=Math.atan2(s.boss.x-p.x,s.boss.z-p.z);s.projectiles.push({id:s.nextId++,owner,x:p.x+Math.sin(angle)*.6,z:p.z+Math.cos(angle)*.6,vx:Math.sin(angle)*17,vz:Math.cos(angle)*17,life:1.5,damage,charged});}
function startAction(p:Hunter,action:number,duration:number,strike:number){p.action=action;p.actionTime=0;p.duration=duration;p.strike=strike;p.casts++;}
export function attackHits(b:HuntBoss,p:Hunter):boolean{const d=distance(b,p);if(b.attack===1)return d<5.6;if(b.attack===2)return Math.hypot(p.x-b.tx,p.z-b.tz)<3.5;if(b.attack===3)return d>4.7;if(b.attack===4){const vx=b.tx-b.x,vz=b.tz-b.z,len=Math.hypot(vx,vz)||1,along=((p.x-b.x)*vx+(p.z-b.z)*vz)/(len*len),cross=Math.abs((p.x-b.x)*vz-(p.z-b.z)*vx)/len;return along>-.1&&along<1.2&&cross<2.25;}return b.attack===5&&d<7.2;}
function resolveAction(s:HuntState,p:Hunter,i:number){const b=s.boss,d=distance(p,b);if(p.action===1){if(i===0){if(d<=4.15)damageBoss(s,i,p.combo===3?74:34,p.combo===3?16:7);}else shoot(s,p,i,p.combo===3?48:26,p.combo===3);}if(p.action===2){if(i===0){if(d<5.2)damageBoss(s,i,150,32);event(s,'impact',p.x,p.z,1,i);}else {shoot(s,p,i,80,true);for(const ally of s.players)if(ally.hp>0&&distance(ally,p)<6.5){const heal=Math.min(100-ally.hp,30);ally.hp+=heal;ally.shield=4;event(s,'heal',ally.x,ally.z,heal,i);}}}if(p.action===3){if(d<10)damageBoss(s,i,i===0?290:220,45);for(const ally of s.players)if(ally.hp>0&&distance(ally,p)<9){ally.shield=3;if(i===1){ally.hp=Math.min(100,ally.hp+40);event(s,'heal',ally.x,ally.z,40,i);}}event(s,'ultimate',p.x,p.z,i,i);}}
export function huntStep(s:HuntState,inputs:HuntInput[],delta:number){
 if(s.status!=='playing'||!finite(delta)||delta<=0)return;const dt=Math.min(delta,.05),b=s.boss;s.tick++;s.time+=dt;b.hit=Math.max(0,b.hit-dt);s.events=s.events.filter(e=>s.time-e.time<2);
 s.players.forEach((p,i)=>{
  for(const k of ['dash','dodgeCd','powerCd','attackCd','hit','shield','chain','queueTimer'] as const)p[k]=Math.max(0,p[k]-dt);
  if(p.hp<=0){p.moving=0;return;}p.stamina=Math.min(100,p.stamina+dt*(p.dodgeCd>0?4:20));
  const input=validHuntInput(inputs[i])?inputs[i]:idleInput();if(input.power&&p.powerCd===0){p.queued=2;p.queueTimer=.6;}if(input.ultimate&&p.energy>=100){p.queued=3;p.queueTimer=.6;}if(p.queueTimer===0)p.queued=0;const len=Math.max(1,Math.hypot(input.x,input.z));let vx=input.x/len,vz=input.z/len;
  if(input.dodge&&p.dodgeCd===0&&p.stamina>=28){p.stamina-=28;p.dash=.32;p.dodgeCd=.7;const n=Math.hypot(vx,vz);p.dx=n>.1?vx:(p.x-b.x)/(distance(p,b)||1);p.dz=n>.1?vz:(p.z-b.z)/(distance(p,b)||1);startAction(p,4,.42,0);event(s,'dodge',p.x,p.z,0,i);}
  if(p.dash>0){vx=p.dx*3.3;vz=p.dz*3.3;}const speed=p.action>0&&p.action<4?.5:1;p.x+=vx*5.2*speed*dt;p.z+=vz*5.2*speed*dt;bound(p,ARENA_RADIUS);
  const bd=distance(p,b);if(bd<2.65){const a=bd>.01?Math.atan2(p.x-b.x,p.z-b.z):i*Math.PI;p.x=b.x+Math.sin(a)*2.65;p.z=b.z+Math.cos(a)*2.65;bound(p,ARENA_RADIUS);}
  p.moving=Math.min(1,Math.hypot(vx,vz));p.facing=p.action>0||Math.hypot(vx,vz)<.1?Math.atan2(b.x-p.x,b.z-p.z):Math.atan2(vx,vz);
  if(p.action>0){p.actionTime+=dt;if(p.strike>0&&p.actionTime>=p.strike){p.strike=0;resolveAction(s,p,i);}if(p.actionTime>=p.duration){p.action=0;p.actionTime=0;}}
  if(p.action===0&&p.dash===0){if(p.queued===3&&p.energy>=100){p.queued=0;p.energy=0;p.attackCd=1.1;startAction(p,3,1.1,.42);event(s,'cast',p.x,p.z,3,i);}else if(p.queued===2&&p.powerCd===0){p.queued=0;p.powerCd=i===0?10:15;p.attackCd=.8;startAction(p,2,.85,.3);event(s,'cast',p.x,p.z,2,i);}else if(input.attack&&p.attackCd===0){p.combo=p.chain>0?p.combo%3+1:1;p.chain=1.3;p.attackCd=p.combo===3?.63:.38;startAction(p,1,p.combo===3?.62:.37,i===0?.14:.17);event(s,i===0?'slash':'cast',p.x,p.z,p.combo,i);}}
 });
 for(const projectile of s.projectiles){projectile.x+=projectile.vx*dt;projectile.z+=projectile.vz*dt;projectile.life-=dt;if(projectile.life>0&&distance(projectile,b)<2.6){damageBoss(s,projectile.owner,projectile.damage,projectile.charged?12:5);projectile.life=0;}}
 s.projectiles=s.projectiles.filter(p=>p.life>0);
 for(const p of s.players)if(p.hp<=0){const ally=s.players.find(a=>a.hp>0&&distance(a,p)<2.4&&a.hit===0);p.revive=ally?p.revive+dt:Math.max(0,p.revive-dt);if(p.revive>=3){p.hp=45;p.revive=0;p.shield=3;event(s,'heal',p.x,p.z,45,s.players.indexOf(p));}}
 if(b.hp===0){s.status='won';return;}if(s.players.every(p=>p.hp<=0)||s.time>480){s.status='lost';return;}
 if(b.hp<b.max*.5&&b.phase===1){b.phase=2;b.stage=1;b.attack=5;b.timer=2.2;b.total=2.2;event(s,'phase',b.x,b.z);}
 b.timer-=dt;if(b.stage===0){const nearest=s.players.filter(p=>p.hp>0).sort((a,c)=>distance(a,b)-distance(c,b))[0];if(nearest&&distance(nearest,b)>4.6){const d=distance(nearest,b);b.x+=(nearest.x-b.x)/d*dt*.85;b.z+=(nearest.z-b.z)/d*dt*.85;bound(b,6.7);}if(nearest)b.angle=Math.atan2(nearest.x-b.x,nearest.z-b.z);}
 if(b.timer<=0){if(b.stage===0){const alive=s.players.filter(p=>p.hp>0),target=alive[b.cycle%alive.length];b.cycle++;const patterns=s.arenaId===2?(b.phase===1?[4,2,1,4,3]:[4,2,4,5,3]):s.arenaId===3?(b.phase===1?[3,2,5,4]:[3,5,2,3,4,5]):b.phase===1?[1,2,4,3]:[2,4,1,3,2,5];b.attack=patterns[(b.cycle-1)%patterns.length];b.tx=target.x;b.tz=target.z;b.angle=Math.atan2(b.tx-b.x,b.tz-b.z);b.stage=1;b.total=b.attack===4?1.4:b.attack===3?1.8:1.35;b.timer=b.total*(b.phase===2?.85:1)*(s.arenaId===1?1:.94);b.total=b.timer;}else if(b.stage===1){for(const p of s.players)if(attackHits(b,p))hurt(s,p,b.phase===2?32:25);b.impacts++;event(s,'impact',b.attack===2?b.tx:b.x,b.attack===2?b.tz:b.z,b.attack);if(b.attack===2||b.attack===4){b.x=b.tx;b.z=b.tz;bound(b,6.7);}b.stage=2;b.timer=.3;b.total=.3;}else if(b.stage===2){b.stage=3;b.timer=b.phase===2?.85:1.2;b.total=b.timer;}else{b.stage=0;b.attack=0;b.timer=b.phase===2?.8:1.2;b.total=b.timer;}}
}

/** Companion reads the same telegraphs as a player, with no free damage or invulnerability. */
export function huntAiInput(s:HuntState,index=1):HuntInput{
 const p=s.players[index],ally=s.players[1-index],b=s.boss;let a=Math.atan2(p.x-b.x,p.z-b.z),r=index===0?3.4:6;
 if(b.stage===1){if(b.attack===3)r=3.5;else if(b.attack===1)r=7.4;else if(b.attack===5)r=9;else if(b.attack===4)a=b.angle+(index===0?1.2:-1.2);}
 let target={x:b.x+Math.sin(a)*r,z:b.z+Math.cos(a)*r};
 if(b.stage===1&&b.attack===2&&Math.hypot(p.x-b.tx,p.z-b.tz)<4.2){const away=Math.atan2(p.x-b.tx,p.z-b.tz);target={x:b.tx+Math.sin(away)*5,z:b.tz+Math.cos(away)*5};}
 if(ally.hp<=0)target=ally;const dx=target.x-p.x,dz=target.z-p.z,n=Math.hypot(dx,dz);const hitSoon=b.stage===1&&b.timer<.2&&attackHits(b,p);
 return {x:n>.2?dx/Math.max(1,n):0,z:n>.2?dz/Math.max(1,n):0,attack:ally.hp>0&&(b.stage!==1||b.timer>.65),dodge:hitSoon,power:index===0?distance(p,b)<4.5&&b.stage!==1:ally.hp<75||p.hp<75,ultimate:p.energy>=100&&distance(p,b)<9};
}

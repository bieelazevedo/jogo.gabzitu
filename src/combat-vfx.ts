import {CATS,ENEMIES,LEVELS,W,H} from './data';
import {position} from './simulation';
import type {Point,Save,State} from './types';

type FloatText = Point & {
 text:string;
 color:string;
 stroke?:string;
 born:number;
 large:boolean;
 vx:number;
 vy:number;
 kind:'dmg'|'crit'|'coin'|'level'|'combo';
};

type Spark = {
 x:number;
 y:number;
 vx:number;
 vy:number;
 size:number;
 color:string;
 born:number;
 life:number;
};

/** Cosmetic only: bounded local effects never alter simulation or network state. */
export class CombatVfx {
 private health=new Map<number,{hp:number;next:number;pos:Point;reward:number;boss:boolean}>();
 private towers=new Map<number,{level:number;born:number;casts:number}>();
 private floats:FloatText[]=[];
 private sparks:Spark[]=[];
 private lastTime=-1;
 private wave=0;
 private waveBorn=-10;
 private bossLagHp=new Map<number,number>();
 private shake=0;
 private lastEffectId=0;
 private streak=0;
 private streakUntil=0;

 private addSparks(x:number,y:number,color:string,count:number,speed:number,now:number){
  for(let i=0;i<count;i++){
   const a=Math.random()*Math.PI*2,sp=speed*(.35+Math.random()*.85);
   this.sparks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-18,size:2+Math.floor(Math.random()*3),color,born:now,life:.28+Math.random()*.28});
  }
 }

 getShakeOffset(reduced:boolean):Point{
  if(reduced||this.shake<=.2)return {x:0,y:0};
  return {x:(Math.random()-.5)*this.shake*2,y:(Math.random()-.5)*this.shake*2};
 }

 draw(c:CanvasRenderingContext2D,s:State,settings:Save['settings']){
  if(s.time<this.lastTime){
   this.health.clear();this.towers.clear();this.floats=[];this.sparks=[];
   this.wave=0;this.bossLagHp.clear();this.shake=0;this.lastEffectId=0;this.streak=0;
  }
  const dt=Math.max(0,Math.min(.1,this.lastTime<0?.016:s.time-this.lastTime));
  this.lastTime=s.time;
  this.shake=Math.max(0,this.shake-dt*22);

  if(this.wave!==s.wave){
   this.wave=s.wave;this.waveBorn=s.time;
   if(s.wave>0&&!settings.reduced)this.shake=Math.max(this.shake,2.5);
  }

  for(const ef of s.effects){
   if(ef.id>this.lastEffectId){
    this.lastEffectId=ef.id;
    if(!settings.reduced){
     if(ef.type==='yarn'||ef.type==='uia'){
      this.shake=Math.max(this.shake,6);
      this.addSparks(ef.x,ef.y,'#ffd875',settings.quality==='low'?6:14,95,s.time);
     }else if(ef.type==='burst'&&ef.size>=50){
      this.shake=Math.max(this.shake,3.2);
      this.addSparks(ef.x,ef.y,ef.color||'#ff9d5c',settings.quality==='low'?4:9,75,s.time);
     }
    }
   }
  }

  const level=LEVELS[s.levelId-1],live=new Set<number>();
  for(const e of s.enemies){
   live.add(e.id);
   const prev=this.health.get(e.id),p=position(level.paths[e.path],e.progress),def=ENEMIES[e.kind];
   if(prev&&prev.hp-e.hp>=5&&s.time>=prev.next&&!settings.reduced){
    const dmg=Math.round(prev.hp-e.hp),crit=dmg>=48||e.marked>0;
    const col=crit?'#ffe566':e.burnTime>0?'#ff9e5e':e.slowTime>0?'#8cefff':e.poisonTime>0?'#b5ff6e':'#fff8e6';
    this.floats.push({
     x:p.x+(Math.random()-.5)*14,
     y:p.y-12,
     text:(crit?'✦ ':'')+dmg,
     color:col,
     stroke:crit?'#4a2800':'#18242c',
     born:s.time,
     large:crit,
     vx:(Math.random()-.5)*24,
     vy:crit?-52:-38,
     kind:crit?'crit':'dmg'
    });
    if(settings.quality!=='low')this.addSparks(p.x,p.y-6,col,crit?5:2,crit?65:40,s.time);
    prev.next=s.time+.24;
   }
   this.health.set(e.id,{hp:e.hp,next:prev?.next||0,pos:p,reward:def.reward,boss:!!def.boss});
   const tags=[e.slowTime>0?'❄':'',e.burnTime>0?'🔥':'',e.poisonTime>0?'☠':'',e.broken>0?'🛡️':''].filter(Boolean);
   if(tags.length){
    c.save();
    c.font='bold 11px monospace';c.textAlign='center';
    const w=tags.length*14+8;
    c.fillStyle='#0d1b22d8';c.beginPath();c.roundRect(p.x-w/2,p.y+15,w,16,4);c.fill();
    c.strokeStyle='#5a8a9688';c.lineWidth=1;c.stroke();
    c.fillStyle='#e2f8ff';c.fillText(tags.join(''),p.x,p.y+27);
    c.restore();
   }
  }

  for(const [id,info] of this.health.entries()){
   if(!live.has(id)){
    this.health.delete(id);
    if(info.hp<=60&&!settings.reduced){
     this.floats.push({
      x:info.pos.x,y:info.pos.y-18,
      text:`+${info.reward} ◉`,
      color:'#ffd86b',stroke:'#2c1f04',
      born:s.time,large:info.boss,
      vx:0,vy:-44,kind:'coin'
     });
     this.addSparks(info.pos.x,info.pos.y,'#ffd86b',info.boss?14:5,info.boss?95:55,s.time);
     if(info.boss)this.shake=Math.max(this.shake,7.5);
     if(s.time<=this.streakUntil)this.streak++;else this.streak=1;
     this.streakUntil=s.time+2.2;
     if(this.streak>=4&&this.streak%3===1){
      this.floats.push({
       x:info.pos.x,y:info.pos.y-36,
       text:`COMBO ×${this.streak}!`,
       color:'#ff94d6',stroke:'#2d0922',
       born:s.time,large:true,vx:0,vy:-30,kind:'combo'
      });
     }
    }
   }
  }

  const towerIds=new Set<number>();
  for(const t of s.towers){
   towerIds.add(t.id);
   let v=this.towers.get(t.id);
   const p=level.spots[t.spot];
   if(!v||v.level!==t.level){
    const upgraded=v&&t.level>v.level;
    v={level:t.level,born:s.time,casts:t.casts||0};
    this.towers.set(t.id,v);
    if(!settings.reduced){
     if(upgraded){
      this.floats.push({x:p.x,y:p.y-24,text:t.level===3?'★ ESPECIALIZADO ★':'▲ NÍVEL '+t.level,color:'#ffe580',stroke:'#2b1e00',born:s.time,large:true,vx:0,vy:-36,kind:'level'});
      this.addSparks(p.x,p.y,'#ffe580',10,70,s.time);
      this.shake=Math.max(this.shake,2);
     }else{
      this.addSparks(p.x,p.y+8,'#c8f4d0',6,48,s.time);
     }
    }
   }
   const age=s.time-v.born;
   if(age<.7&&!settings.reduced){
    c.save();
    const k=age/.7;
    c.globalAlpha=(1-k)*.85;
    c.strokeStyle=t.level===3?'#ffcf5c':'#fff3b8';
    c.lineWidth=3*(1-k)+1;
    c.beginPath();c.ellipse(p.x,p.y+15,20+k*58,8+k*22,0,0,Math.PI*2);c.stroke();
    c.restore();
   }
  }
  for(const id of this.towers.keys())if(!towerIds.has(id))this.towers.delete(id);

  this.sparks=this.sparks.filter(sp=>s.time-sp.born<sp.life).slice(-(settings.quality==='low'?20:65));
  if(!settings.reduced){
   for(const sp of this.sparks){
    const age=s.time-sp.born,k=1-age/sp.life;
    const sx=sp.x+sp.vx*age,sy=sp.y+sp.vy*age+45*age*age;
    c.save();
    c.globalAlpha=k;
    c.fillStyle=sp.color;
    const sz=Math.max(1.5,sp.size*k);
    c.fillRect(Math.round(sx-sz/2),Math.round(sy-sz/2),Math.ceil(sz),Math.ceil(sz));
    c.restore();
   }
  }

  this.floats=this.floats.filter(f=>s.time-f.born<.9).slice(-(settings.quality==='low'?12:34));
  if(!settings.reduced){
   for(const f of this.floats){
    const age=s.time-f.born,progress=age/.9;
    const pop=age<.12?0.7+age/.12*0.65:age<.24?1.35-(age-.12)/.12*0.35:1;
    const fx=f.x+f.vx*age,fy=f.y+f.vy*age;
    c.save();
    c.translate(fx,fy);
    c.scale(pop,pop);
    c.globalAlpha=Math.min(1,(1-progress)*2.6);
    c.font=`900 ${f.large?16:13}px "Trebuchet MS", monospace, sans-serif`;
    c.textAlign='center';
    c.lineWidth=4;
    c.lineJoin='round';
    c.strokeStyle=f.stroke||'#1b262e';
    c.strokeText(f.text,0,0);
    c.fillStyle=f.color;
    c.fillText(f.text,0,0);
    c.restore();
   }
  }

  const boss=s.enemies.find(e=>ENEMIES[e.kind].boss);
  if(boss){
   const width=340,x=(W-width)/2,ratio=Math.max(0,boss.hp/boss.maxHp);
   const prevLag=this.bossLagHp.get(boss.id)??ratio;
   const lag=prevLag+(ratio-prevLag)*Math.min(1,dt*4.5);
   this.bossLagHp.set(boss.id,lag);
   c.save();
   c.fillStyle='#0e1921f2';
   c.beginPath();c.roundRect(x-16,8,width+32,48,10);c.fill();
   c.strokeStyle='#e0b865';c.lineWidth=2;c.stroke();
   c.fillStyle='#ffe8a3';c.font='bold 13px Georgia, serif';c.textAlign='center';
   c.fillText('♛ '+ENEMIES[boss.kind].name.toUpperCase()+' ♛',W/2,26);
   c.fillStyle='#2a1721';c.beginPath();c.roundRect(x,34,width,12,5);c.fill();
   if(lag>ratio){
    c.fillStyle='#fff2c2';c.beginPath();c.roundRect(x,34,width*lag,12,5);c.fill();
   }
   const grad=c.createLinearGradient(x,34,x+width,34);
   grad.addColorStop(0,'#e0485c');grad.addColorStop(1,'#ff8a5b');
   c.fillStyle=grad;c.beginPath();c.roundRect(x,34,width*ratio,12,5);c.fill();
   c.fillStyle='#ffffffcc';c.font='bold 9px monospace';
   c.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`,W/2,43);
   c.restore();
  }else if(s.wave>0&&s.time-this.waveBorn<1.8&&!settings.reduced){
   const age=s.time-this.waveBorn;
   const scale=age<.18?.8+age/.18*.3:1.1-Math.min(.1,(age-.18)*.4);
   c.save();
   c.translate(W/2,32);c.scale(scale,scale);
   c.globalAlpha=Math.min(1,age*6,(1.8-age)*3);
   c.fillStyle='#10262cf2';
   c.beginPath();c.roundRect(-125,-19,250,38,9);c.fill();
   c.strokeStyle='#f0c869';c.lineWidth=2;c.stroke();
   c.fillStyle='#ffe79e';c.textAlign='center';c.font='bold 15px Georgia, serif';
   c.fillText(`⚔ ONDA ${s.wave} · ÀS ARMAS! ⚔`,0,5);
   c.restore();
  }

  if(s.hp<=35){
   c.save();
   c.strokeStyle='#e64c4c';
   c.globalAlpha=settings.reduced?.5:.3+Math.sin(s.time*4.5)*.18;
   c.lineWidth=10;
   c.strokeRect(5,5,W-10,H-10);
   c.restore();
  }
 }
}

export function drawRouteHints(c:CanvasRenderingContext2D,s:State,reduced:boolean){
 const level=LEVELS[s.levelId-1];if(s.active.length)return;
 level.paths.forEach((path,index)=>{
  if(level.bridgeAt&&index>0&&s.wave<level.bridgeAt-1)return;
  for(let n=0;n<7;n++){
   const progress=(n/7+(reduced?0:s.time*.032))%1,p=position(path,progress),next=position(path,Math.min(1,progress+.006));
   c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(next.y-p.y,next.x-p.x));
   c.globalAlpha=.55;
   const col=['#ffe89e','#8ceeff','#f3b0ff','#b8f28d'][index%4];
   c.strokeStyle=col;c.lineWidth=3;
   c.beginPath();c.moveTo(-6,-6);c.lineTo(2,0);c.lineTo(-6,6);c.stroke();
   c.restore();
  }
 });
}

export function drawAura(c:CanvasRenderingContext2D,kind:keyof typeof CATS,x:number,y:number,time:number,attack:number,casts:number){
 const support=kind==='commander'||kind==='bard',elemental=kind==='monk';
 if(!support&&!elemental&&kind!=='ice'&&kind!=='witch'&&kind!=='engineer'&&!['adminMage','astronomer','alchemist','gardener','guardian','allyLegollas','allyDuchess','allyHydra'].includes(kind))return;
 c.save();c.translate(x,y);
 c.strokeStyle=CATS[kind].color;c.lineWidth=2;c.globalAlpha=support?.42:.28;
 c.setLineDash([6,4]);
 c.beginPath();c.ellipse(0,16,33+(support?Math.sin(time*2.5)*3.5:0),12,0,0,Math.PI*2);c.stroke();
 c.setLineDash([]);
 const colors=['#7cebff','#e6c875','#9ef09e','#ff8b4d','#ffe566'];
 const count=elemental?5:kind==='adminMage'?4:support?3:2;
 for(let i=0;i<count;i++){
  const a=time*(support?.85:1.35)+i*Math.PI*2/count,px=Math.cos(a)*30,py=Math.sin(a)*11-19;
  c.globalAlpha=elemental&&i===Math.max(0,casts-1)%5?1:.65;
  c.fillStyle=elemental?colors[i]:CATS[kind].color;
  if(kind==='bard'){
   c.font='bold 16px Georgia';c.fillText('♪',px,py-attack*13);
  }else{
   c.fillRect(Math.round(px-3),Math.round(py-3),6,6);
   c.fillStyle='#ffffffaa';
   c.fillRect(Math.round(px-1),Math.round(py-1),2,2);
  }
 }
 c.restore();
}

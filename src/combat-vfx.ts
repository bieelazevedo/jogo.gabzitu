import {CATS,ENEMIES,LEVELS,W,H} from './data';
import {position} from './simulation';
import type {Point,Save,State} from './types';
type Float = Point & {text:string;color:string;born:number;large:boolean};
/** Cosmetic only: bounded local effects never alter simulation or network state. */
export class CombatVfx {
 private health=new Map<number,{hp:number;next:number}>();
 private towers=new Map<number,{level:number;born:number}>();
 private floats:Float[]=[];private lastTime=-1;private wave=0;private waveBorn=-10;
 draw(c:CanvasRenderingContext2D,s:State,settings:Save['settings']){
  if(s.time<this.lastTime){this.health.clear();this.towers.clear();this.floats=[];this.wave=0;}
  this.lastTime=s.time;
  if(this.wave!==s.wave){this.wave=s.wave;this.waveBorn=s.time;}
  const level=LEVELS[s.levelId-1],live=new Set<number>();
  for(const e of s.enemies){
   live.add(e.id);const prev=this.health.get(e.id),p=position(level.paths[e.path],e.progress);
   if(prev&&prev.hp-e.hp>=6&&s.time>=prev.next&&!settings.reduced){
    this.floats.push({...p,text:Math.round(prev.hp-e.hp).toString(),color:e.marked>0?'#ffe393':'#fff7dd',born:s.time,large:prev.hp-e.hp>=65});
    prev.next=s.time+.32;
   }
   this.health.set(e.id,{hp:e.hp,next:prev?.next||0});
   const tags=[e.slowTime>0?'❄':'',e.burnTime>0?'♨':'',e.poisonTime>0?'●':'',e.broken>0?'◇':''].filter(Boolean);
   if(tags.length){c.font='bold 13px sans-serif';c.textAlign='center';c.fillStyle='#172b32';c.fillRect(p.x-tags.length*7-3,p.y+17,tags.length*14+6,17);c.fillStyle='#d0eef1';c.fillText(tags.join(' '),p.x,p.y+30);}
  }
  for(const id of this.health.keys())if(!live.has(id))this.health.delete(id);
  const towerIds=new Set<number>();
  for(const t of s.towers){
   towerIds.add(t.id);let v=this.towers.get(t.id);const p=level.spots[t.spot];
   if(!v||v.level!==t.level){v={level:t.level,born:s.time};this.towers.set(t.id,v);if(t.level>1&&!settings.reduced)this.floats.push({...p,text:'NÍVEL '+t.level,color:'#ffe29a',born:s.time,large:true});}
   const age=s.time-v.born;
   if(age<.65&&!settings.reduced){c.save();c.globalAlpha=(1-age/.65)*.7;c.strokeStyle='#fff0ab';c.lineWidth=3;c.beginPath();c.ellipse(p.x,p.y+15,24+age*55,9+age*20,0,0,Math.PI*2);c.stroke();c.restore();}
  }
  for(const id of this.towers.keys())if(!towerIds.has(id))this.towers.delete(id);
  this.floats=this.floats.filter(f=>s.time-f.born<.8).slice(-(settings.quality==='low'?10:28));
  if(!settings.reduced)for(const f of this.floats){const age=s.time-f.born;c.save();c.globalAlpha=Math.min(1,(.8-age)*3);c.font=`bold ${f.large?16:13}px sans-serif`;c.textAlign='center';c.lineWidth=3;c.strokeStyle='#26323b';c.strokeText(f.text,f.x,f.y-35-age*36);c.fillStyle=f.color;c.fillText(f.text,f.x,f.y-35-age*36);c.restore();}
  const boss=s.enemies.find(e=>ENEMIES[e.kind].boss);
  if(boss){const width=300,x=(W-width)/2;c.save();c.fillStyle='#18282deb';c.beginPath();c.roundRect(x-12,10,width+24,44,8);c.fill();c.fillStyle='#eee0bc';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText(ENEMIES[boss.kind].name,W/2,27);c.fillStyle='#51333c';c.fillRect(x,35,width,9);c.fillStyle='#d96e72';c.fillRect(x,35,width*Math.max(0,boss.hp/boss.maxHp),9);c.restore();}
  else if(s.wave>0&&s.time-this.waveBorn<1.6&&!settings.reduced){const age=s.time-this.waveBorn;c.save();c.globalAlpha=Math.min(1,age*5,(1.6-age)*3);c.fillStyle='#17382ce8';c.beginPath();c.roundRect(W/2-90,14,180,34,7);c.fill();c.fillStyle='#f6df9a';c.textAlign='center';c.font='bold 15px Georgia';c.fillText('ONDA '+s.wave+' · ÀS PATAS!',W/2,37);c.restore();}
  if(s.hp<=30){c.save();c.strokeStyle='#d07565';c.globalAlpha=settings.reduced?.55:.35+Math.sin(s.time*3)*.12;c.lineWidth=8;c.strokeRect(4,4,W-8,H-8);c.restore();}
 }
}

export function drawRouteHints(c:CanvasRenderingContext2D,s:State,reduced:boolean){
 const level=LEVELS[s.levelId-1];if(s.active.length)return;
 level.paths.forEach((path,index)=>{if(level.bridgeAt&&index>0&&s.wave<level.bridgeAt-1)return;
  for(let n=0;n<6;n++){const progress=(n/6+(reduced?0:s.time*.025))%1,p=position(path,progress),next=position(path,Math.min(1,progress+.005));c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(next.y-p.y,next.x-p.x));c.globalAlpha=.42;c.strokeStyle=['#fff0bb','#9ae4e9','#e7bae5','#c7e7a0'][index%4];c.lineWidth=3;c.beginPath();c.moveTo(-5,-5);c.lineTo(1,0);c.lineTo(-5,5);c.stroke();c.restore();}
 });
}

export function drawAura(c:CanvasRenderingContext2D,kind:keyof typeof CATS,x:number,y:number,time:number,attack:number,casts:number){
 const support=kind==='commander'||kind==='bard',elemental=kind==='monk';
 if(!support&&!elemental&&kind!=='ice'&&kind!=='witch'&&kind!=='engineer'&&!['adminMage','astronomer','alchemist','gardener','guardian','allyLegollas','allyDuchess','allyHydra'].includes(kind))return;
 c.save();c.translate(x,y);c.strokeStyle=CATS[kind].color;c.lineWidth=1.5;c.globalAlpha=support?.32:.2;
 c.beginPath();c.ellipse(0,16,32+(support?Math.sin(time*2)*3:0),11,0,0,Math.PI*2);c.stroke();
 const colors=['#95e1f0','#dcc893','#d5eecc','#ffad69','#ffe091'];
 const count=elemental?5:kind==='adminMage'?4:support?3:2;
 for(let i=0;i<count;i++){const a=time*(support?.65:1.1)+i*Math.PI*2/count,px=Math.cos(a)*29,py=Math.sin(a)*10-19;c.globalAlpha=elemental&&i===Math.max(0,casts-1)%5?.95:.5;c.fillStyle=elemental?colors[i]:CATS[kind].color;
  if(kind==='bard'){c.font='15px Georgia';c.fillText('♪',px,py-attack*12);}else{c.beginPath();c.moveTo(px,py-4);c.lineTo(px+3,py);c.lineTo(px,py+4);c.lineTo(px-3,py);c.closePath();c.fill();}
 }
 c.restore();
}

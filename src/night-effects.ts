import * as T from 'three';
import {fxTexture} from './night-assets';
import {nightBeamForks,type NightState} from './night-simulation';
type Fx={mesh:T.Mesh|T.Sprite;age:number;life:number;kind:string;radius:number;from:T.Vector3;to:T.Vector3;spin:number};
/** Ground-plane kinds lie flat; the rest are camera-facing sprites. Each kind maps to a CC0 Kenney particle texture. */
const FLAT:Record<string,string>={field:'rune',halo:'twirl',ring:'ring',scorch:'scorch',sigil:'magic'};
const SPRITE:Record<string,string>={spark:'spark',fall:'fire',flare:'flare',glow:'glow',star:'star',smoke:'smoke',dust:'smoke',slashfx:'slash',pillar:'glow',ember:'fire',shield:'ring',arrowfall:'trace'};
/** Signature colour of each class, used to tint its spells. */
const CLASS_COLOR:Record<string,number>={blade:0xffd38a,astral:0x86edc1,guardian:0x99c7ff,reaver:0xff5a7a,witch:0xc89aff,ranger:0xb8e27a,chaos:0xff2a4a};
/** Bounded, shared geometry effects; actual skill release events drive the impact. */
export class NightEffects{
 readonly root=new T.Group();private hostile=new Map<number,T.Object3D>();private hazards=new Map<number,T.Mesh>();private shots=new Map<number,T.Object3D>();private arrow=new T.ConeGeometry(.13,.85,5);private effects:Fx[]=[];private seen=0;private trailTick=-1;
 private plane=new T.PlaneGeometry(2,2);private tube=new T.CylinderGeometry(1,1,1,8,1,true);private beams=new Map<number,{group:T.Group;parts:T.Mesh[];end:T.Sprite}>();
 private realm?:{group:T.Group;floor:T.Mesh;runes:T.Mesh;dome:T.Mesh;orbit:T.Sprite[]};
 /** Carmesim's rewritten reality: rotating rune floors, a crimson dome and conjured runes orbiting inside. */
 private drawRealm(s:NightState,dt:number){
  const r=s.realm;if(!r){if(this.realm)this.realm.group.visible=false;return;}
  if(!this.realm){const group=new T.Group();const mat=(map:string,color:number,opacity:number)=>new T.MeshBasicMaterial({...this.additive(map,color,opacity),side:T.DoubleSide});
   const floor=new T.Mesh(this.plane,mat('magic',0xff1f45,.75));floor.rotation.x=-Math.PI/2;floor.position.y=.06;
   const runes=new T.Mesh(this.plane,mat('rune',0xff6b84,.85));runes.rotation.x=-Math.PI/2;runes.position.y=.08;
   const dome=new T.Mesh(new T.CylinderGeometry(1,1,1,40,1,true),new T.MeshBasicMaterial({color:0xff2448,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}));
   const orbit:T.Sprite[]=[];for(let i=0;i<18;i++){const sp=new T.Sprite(new T.SpriteMaterial({...this.additive(i%3?'rune':'magic',i%2?0xff3355:0xff9aaa),rotation:i}));orbit.push(sp);group.add(sp);}
   group.add(floor,runes,dome);this.root.add(group);this.realm={group,floor,runes,dome,orbit};}
  const v=this.realm,age=r.total-r.life,grow=Math.min(1,age/.5),fade=Math.min(1,r.life/.6),radius=r.r*(.2+.8*(1-(1-grow)**3));
  v.group.visible=true;v.group.position.set(r.x,0,r.z);v.floor.scale.setScalar(radius);v.runes.scale.setScalar(radius*.75);v.floor.rotation.z+=dt*.35;v.runes.rotation.z-=dt*.6;
  v.dome.scale.set(radius,6,radius);v.dome.position.y=3;(v.dome.material as T.MeshBasicMaterial).opacity=(.12+Math.sin(s.time*4)*.04)*fade;
  (v.floor.material as T.MeshBasicMaterial).opacity=.75*fade;(v.runes.material as T.MeshBasicMaterial).opacity=.85*fade;
  v.orbit.forEach((sp,i)=>{const a=s.time*(i%2?.7:-.5)+i/v.orbit.length*Math.PI*2,rr=radius*(.45+(i%3)*.2);sp.position.set(Math.sin(a)*rr,1+(i%5)*.9+Math.sin(s.time*2+i)*.3,Math.cos(a)*rr);sp.scale.setScalar((i%3?1.1:1.6)*grow);(sp.material as T.SpriteMaterial).opacity=.85*fade;(sp.material as T.SpriteMaterial).rotation+=dt*(i%2?1:-1);});
 }
 /** Chaos beam: glowing crimson tubes from the caster's hands to the target and each fork. */
 private beam(index:number,from:T.Vector3,targets:T.Vector3[],time:number){
  let b=this.beams.get(index);if(!b){const group=new T.Group();const end=this.glow(0xff2a4a,1.6);group.add(end);b={group,parts:[],end};this.beams.set(index,b);this.root.add(group);}
  while(b.parts.length<targets.length*2){const outer=new T.Mesh(this.tube,new T.MeshBasicMaterial({color:0xff1f45,transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending}));const inner=new T.Mesh(this.tube,new T.MeshBasicMaterial({color:0xffd0d8,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending}));b.parts.push(outer,inner);b.group.add(outer,inner);}
  b.group.visible=true;const up=new T.Vector3(0,1,0);let start=from;
  b.parts.forEach((m,i)=>{const k=Math.floor(i/2),end=targets[k];m.visible=!!end;if(!end)return;const origin=k===0?start:targets[0],dir=end.clone().sub(origin),len=dir.length();const r=(i%2?.05:.17)*(k?0.6:1)*(1+Math.sin(time*30+i)*.25);m.position.copy(origin).addScaledVector(dir,.5);m.scale.set(r,len,r);m.quaternion.setFromUnitVectors(up,dir.normalize());});
  b.end.position.copy(targets[0]);b.end.scale.setScalar(1.3+Math.sin(time*25)*.3);
 }
 private additive(map:string,color:number,opacity=.9){return {map:fxTexture(map),color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending};}
 private glow(color:number,size:number){const s=new T.Sprite(new T.SpriteMaterial(this.additive('glow',color)));s.scale.setScalar(size);return s;}
 private create(kind:string,x:number,y:number,z:number,color:number,radius:number,life:number,to?:T.Vector3){
  if(this.effects.length>=170){const old=this.effects.shift()!;old.mesh.removeFromParent();(old.mesh.material as T.Material).dispose();}
  let mesh:T.Mesh|T.Sprite;
  if(kind==='bolt'){mesh=new T.Mesh(this.tube,new T.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false,blending:T.AdditiveBlending}));const dir=(to||new T.Vector3(x,y,z)).clone().sub(new T.Vector3(x,y,z)),len=dir.length();mesh.position.set(x,y,z).addScaledVector(dir,.5);mesh.scale.set(radius,len,radius);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());this.root.add(mesh);this.effects.push({mesh,age:0,life,kind,radius,from:mesh.position.clone(),to:mesh.position.clone(),spin:0});return;}
  if(FLAT[kind]){mesh=new T.Mesh(this.plane,new T.MeshBasicMaterial({...this.additive(FLAT[kind],color),side:T.DoubleSide}));mesh.rotation.x=-Math.PI/2;}
  else{mesh=new T.Sprite(new T.SpriteMaterial({...this.additive(SPRITE[kind]||'spark',color),rotation:Math.random()*Math.PI*2}));}
  mesh.position.set(x,y,z);this.root.add(mesh);this.effects.push({mesh,age:0,life,kind,radius,from:mesh.position.clone(),to:to||mesh.position.clone(),spin:(Math.random()-.5)*4});
 }
 update(s:NightState,dt:number){
 const trails=Math.floor(s.time*12);if(trails!==this.trailTick){this.trailTick=trails;for(const shot of s.projectiles.slice(0,12))this.create('spark',shot.x,1.4,shot.z,shot.magic?0xc5aaff:0xffdc94,shot.magic?.2:.12,.35);}
 const hostileIds=new Set(s.hostile.map(p=>p.id)),hazardIds=new Set(s.hazards.map(h=>h.id));for(const [map,ids]of [[this.hostile,hostileIds],[this.hazards,hazardIds]] as const)for(const [id,m]of map)if(!ids.has(id)){m.removeFromParent();m.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Sprite)(o.material as T.Material).dispose();});map.delete(id);}
 for(const p of s.hostile){let m=this.hostile.get(p.id);if(!m){m=new T.Group();const head=new T.Mesh(this.arrow,new T.MeshBasicMaterial({color:0xffae72}));head.name='head';m.add(head,this.glow(0xff7a3c,1.1));this.hostile.set(p.id,m);this.root.add(m);}m.position.set(p.x,1.2,p.z);m.getObjectByName('head')!.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(p.vx,0,p.vz).normalize());}
 for(const h of s.hazards){let m=this.hazards.get(h.id);if(!m){m=new T.Mesh(this.plane,new T.MeshBasicMaterial({...this.additive('magic',0xb179eb,.7),side:T.DoubleSide}));m.rotation.x=-Math.PI/2;this.hazards.set(h.id,m);this.root.add(m);}m.position.set(h.x,.05,h.z);m.scale.setScalar(h.r);m.rotation.z=s.time*.8;(m.material as T.MeshBasicMaterial).opacity=.55+Math.sin(s.time*8)*.15;}
 const active=new Set(s.projectiles.map(p=>p.id));for(const [id,mesh] of this.shots)if(!active.has(id)){mesh.removeFromParent();mesh.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Sprite)(o.material as T.Material).dispose();});this.shots.delete(id);}
 for(const p of s.projectiles){let mesh=this.shots.get(p.id);
  if(!mesh){mesh=new T.Group();if(p.magic){mesh.add(this.glow(0xa99cff,1.3));const core=this.glow(0xffffff,.45);mesh.add(core);}else{const head=new T.Mesh(this.arrow,new T.MeshBasicMaterial({color:0xf4d99f}));head.name='head';mesh.add(head,this.glow(0xffd889,.8));}mesh.position.set(p.x,1.4,p.z);this.root.add(mesh);this.shots.set(p.id,mesh);}
  const target=p.target===0?s.boss:s.enemies.find(e=>e.id===p.target);mesh.position.lerp(new T.Vector3(p.x,1.4,p.z),1-Math.exp(-25*dt));
  const head=mesh.getObjectByName('head');if(head&&target)head.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(target.x-p.x,0,target.z-p.z).normalize());if(p.magic)mesh.children[0].scale.setScalar(1.2+Math.sin(s.time*20)*.15);}
 const beaming=new Set<number>();s.players.forEach((p,i)=>{if(p.classId!=='chaos'||p.beam<0||p.hp<=0)return;const target=p.beam===0?(s.phase==='boss'?s.boss:undefined):s.enemies.find(e=>e.id===p.beam&&e.hp>0);if(!target)return;beaming.add(i);const hand=new T.Vector3(p.x+Math.sin(p.facing)*.55,1.45+p.y,p.z+Math.cos(p.facing)*.55);this.beam(i,hand,[new T.Vector3(target.x,target===s.boss?2.6:1.25,target.z),...nightBeamForks(s,p,target).map(f=>new T.Vector3(f.x,1.25,f.z))],s.time);});
 for(const [i,b] of this.beams)if(!beaming.has(i))b.group.visible=false;
 this.drawRealm(s,dt);
 for(const e of s.events){if(e.id<=this.seen)continue;this.seen=e.id;this.event(s,e);}
 this.effects=this.effects.filter(f=>{f.age+=dt;const t=Math.min(1,f.age/f.life);if(t>=1){f.mesh.removeFromParent();(f.mesh.material as T.Material).dispose();return false;}const m=f.mesh.material as T.MeshBasicMaterial|T.SpriteMaterial;m.opacity=(f.kind==='scorch'?.7:.9)*(1-t*t);
  if(f.kind==='bolt'){m.opacity=Math.random()>.3?.95*(1-t):.2;f.mesh.scale.x=f.mesh.scale.z=f.radius*(.6+Math.random()*.8);return true;}
  if(f.kind==='slashfx'){f.mesh.scale.setScalar(f.radius*(1+t*.5));m.opacity=.95*(1-t);return true;}
  if(f.kind==='pillar'){f.mesh.scale.set(f.radius*(1-t*.5),f.radius*5*(.6+t*.6),1);f.mesh.position.y=f.from.y+f.radius*2*(.6+t*.6);return true;}
  if(f.kind==='shield'){f.mesh.scale.setScalar(f.radius*(1+Math.sin(t*Math.PI*3)*.06));m.opacity=.7*(1-t*t);return true;}
  if(f.kind==='ember'||f.kind==='arrowfall'||f.kind==='dust'){f.mesh.position.lerpVectors(f.from,f.to,f.kind==='arrowfall'?t*t:t);f.mesh.scale.setScalar(f.radius*(f.kind==='dust'?1+t*2.5:f.kind==='ember'?1.4*(1-t*.5):1.6));return true;}
  if(f.kind==='fall'||f.kind==='glow'){f.mesh.position.lerpVectors(f.from,f.to,t*t);f.mesh.scale.setScalar(f.radius*2.6);}
  else if(f.kind==='spark'||f.kind==='star'||f.kind==='smoke'){f.mesh.position.lerpVectors(f.from,f.to,t);f.mesh.scale.setScalar(f.radius*(f.kind==='smoke'?2+t*2:5*(1-t*.6)));}
  else if(f.kind==='flare'){f.mesh.scale.setScalar(f.radius*(1+t*1.5));}
  else if(f.kind==='ring'){f.mesh.scale.setScalar(f.radius*(.6+t*2.4));}
  else if(f.kind==='sigil'){f.mesh.scale.setScalar(f.radius*(.3+.7*Math.min(1,t*4)));f.mesh.rotation.z+=dt*1.2;}
  else{f.mesh.scale.setScalar(f.radius*(f.kind==='field'?.92+.08*Math.sin(t*Math.PI):f.kind==='scorch'?1:.5+t*.7));f.mesh.rotation.z+=dt*(f.kind==='field'?.6:2)*Math.sign(f.spin||1);}
  if(f.mesh instanceof T.Sprite)(f.mesh.material as T.SpriteMaterial).rotation+=f.spin*dt;
  return true;});}
 private lastBolt={x:0,z:0,owner:-1,time:-1};
 private burst(kind:string,x:number,z:number,color:number,count:number,r:number,y=.2,up=1.2,size=.22,life=.7){for(let i=0;i<count;i++){const a=i/count*Math.PI*2+Math.random()*.4;this.create(kind,x+Math.sin(a)*r*.3,y,z+Math.cos(a)*r*.3,color,size,life,new T.Vector3(x+Math.sin(a)*r,y+up*(.5+Math.random()),z+Math.cos(a)*r));}}
 private implode(x:number,z:number,color:number,count:number,r:number){for(let i=0;i<count;i++){const a=i/count*Math.PI*2;this.create('spark',x+Math.sin(a)*r,.6,z+Math.cos(a)*r,color,.24,.6,new T.Vector3(x,1,z));}}
 /** One visual recipe per gameplay event: every class skill, enemy blow and boss attack reads differently. */
 private event(s:NightState,e:NightState['events'][number]){
  const caster=s.players[e.owner],cls=caster?.classId||'blade',tint=CLASS_COLOR[cls]||0xffc88c,v=e.value,x=e.x,z=e.z;
  if(e.kind==='slash'&&caster){if(cls==='ranger')return;const f=caster.facing,fx=x+Math.sin(f)*1.1,fz=z+Math.cos(f)*1.1;this.create('slashfx',fx,1.2,fz,tint,v===3?2.4:1.6,.22);if(v===3)this.burst('spark',fx,fz,tint,5,1.6,1,.6,.18,.35);return;}
  if(e.kind==='hit'){this.create('flare',x,1.1,z,0xffe3a0,.9,.22);this.burst('spark',x,z,0xffd98c,4,1,1,.6,.14,.3);return;}
  if(e.kind==='dodge'){if(v===2){this.create('flare',x,1,z,0xd8f4ff,1.4,.3);this.create('ring',x,.06,z,0xbfe8ff,.8,.4);this.burst('star',x,z,0xe6f8ff,6,2,.4,1,.2,.45);}else{this.create('smoke',x,.4,z,0x9fb7c9,.55,.45,new T.Vector3(x,.9,z));this.create('ring',x,.06,z,0xa3dcea,.4,.3);}return;}
  if(e.kind==='stagger'){this.create('flare',x,2.5,z,0xffd27a,3,.5);this.burst('star',x,z,0xffe2a0,14,6,1.5,2,.3,.8);this.create('ring',x,.08,z,0xffc45a,2.5,.6);return;}
  if(e.kind==='ultimate'){this.create('pillar',x,0,z,tint,2.2,1.1);this.create('ring',x,.08,z,tint,3,.8);return;}
  if(e.kind==='phase'){this.create('pillar',x,0,z,0xbfe8ff,1.6,.9);this.burst('star',x,z,0xd8f4ff,10,3,.3,2.5,.22,.9);return;}
  if(e.kind==='impact'){
   if(s.phase==='boss'){// Boss blows: 1 sweep, 2 leap slam, 3 tide roar, 4 charge, 5 eclipse spin.
    if(v===2){this.create('scorch',x,.04,z,0x3a2a24,3.8,3);this.create('ring',x,.08,z,0xffb070,3,.6);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;this.create('dust',x+Math.sin(a)*2,.3,z+Math.cos(a)*2,0x8a7a6a,.8,.9,new T.Vector3(x+Math.sin(a)*5,1.2,z+Math.cos(a)*5));}this.burst('spark',x,z,0xffa060,12,5,.2,2.5,.25,.6);}
    else if(v===3){this.create('halo',x,.2,z,0x9677ff,6,1);this.create('ring',x,.1,z,0xb79bff,8,1);this.burst('star',x,z,0xc9b5ff,16,20,.5,1,.3,1);}
    else if(v===4){this.create('dust',x,.4,z,0x8a7a6a,1.6,.8,new T.Vector3(x,1.6,z));this.create('ring',x,.08,z,0xff8050,2.2,.5);}
    else if(v===5){this.create('sigil',x,.06,z,0xc06bff,7,.9);this.create('ring',x,.1,z,0xd8a0ff,6,.8);this.burst('spark',x,z,0xd8a0ff,16,8,.6,1,.28,.7);}
    else{this.create('slashfx',x,1.8,z,0xff7a5a,4,.3);this.create('ring',x,.08,z,0xff8a6a,2.8,.5);this.burst('dust',x,z,0x8a7a6a,6,4,.3,.6,.7,.7);}
    return;}
   // Camp enemies: 1 blade swing, 5 elite cleave, 2 mage blast.
   if(v===2){this.create('sigil',x,.06,z,0xb179eb,2.8,.6);this.create('flare',x,.8,z,0xc9a0ff,1.6,.3);this.burst('spark',x,z,0xc9a0ff,8,3,.3,1.5,.2,.5);}
   else if(v===5){this.create('slashfx',x,1.6,z,0xffb55f,3.2,.3);this.create('ring',x,.08,z,0xffb55f,2,.45);this.burst('dust',x,z,0x8a7a6a,5,3,.3,.5,.6,.6);}
   else{this.create('slashfx',x,1.2,z,0xff8b78,1.8,.22);}
   return;}
  if(e.kind!=='cast')return;
  if(v===103){this.create('fall',x+2,8,z-2,0xffb66d,.8,.55,new T.Vector3(x,.2,z));this.create('glow',x+2,8,z-2,0xff8a3c,1.2,.55,new T.Vector3(x,.6,z));this.create('sigil',x,.05,z,0xffb66d,4,.55);return;}
  if(v<200)return;
  switch(v){
   case 201:this.create('field',x,.08,z,0x86edc1,8,1.2);this.create('pillar',x,0,z,0x9cffd0,1.4,1);for(let i=0;i<14;i++){const a=i*2.4,r=1+i%5*1.4;this.create('star',x+Math.sin(a)*r,.2,z+Math.cos(a)*r,0xb4ffd8,.22,1,new T.Vector3(x+Math.sin(a)*r,2.4+i%3*.5,z+Math.cos(a)*r));}for(const p of s.players)if(p.hp>0&&Math.hypot(p.x-x,p.z-z)<8)this.create('glow',p.x,1.2,p.z,0x86edc1,.9,.8,new T.Vector3(p.x,2,p.z));break;
   case 202:this.create('sigil',x,.08,z,0x99c7ff,8,1);for(const p of s.players)if(p.hp>0&&Math.hypot(p.x-x,p.z-z)<8)this.create('shield',p.x,1.2,p.z,0xa9d4ff,1.8,1.4);break;
   case 203:this.create('ring',x,.1,z,0xffb066,4,.7);this.create('scorch',x,.04,z,0x40281a,3,2.5);this.burst('ember',x,z,0xff8a3c,10,5,.3,2,.4,.8);this.burst('dust',x,z,0x6a5a4a,8,5,.3,1,.8,.9);break;
   case 204:if(cls==='astral'){this.create('halo',x,.1,z,0x86edc1,6,1.2);this.implode(x,z,0xb4ffd8,12,7);}else if(cls==='witch'){this.create('sigil',x,.08,z,0xc89aff,9,1.1);for(let i=0;i<14;i++){const a=i*2.3,r=1+i%6*1.6;this.create('star',x+Math.sin(a)*r,4,z+Math.cos(a)*r,0xe0d0ff,.22,1,new T.Vector3(x+Math.sin(a)*r,.2,z+Math.cos(a)*r));}}else if(cls==='ranger'){this.create('ring',x,.08,z,0xb8e27a,4,.6);this.create('halo',x,.15,z,0xd4f0a0,5,.9);}else if(cls==='guardian'){this.create('ring',x,.08,z,0xffd27a,5,.6);this.create('flare',x,1.6,z,0xffe2a0,2,.4);}else{this.create('slashfx',x,1.3,z,tint,3,.3);this.create('ring',x,.08,z,tint,4,.5);}break;
   case 205:if(cls==='blade'&&caster){const f=caster.facing;for(let k=0;k<3;k++)this.create('slashfx',x+Math.sin(f)*(1.2+k*.8),1.3,z+Math.cos(f)*(1.2+k*.8),0xffe0a2,2.6+k*.6,.3+k*.06);this.burst('spark',x+Math.sin(f)*2,z+Math.cos(f)*2,0xffe0a2,8,3,1,.8,.2,.4);}
    else if(cls==='ranger'){const t=caster?{x,z}:{x,z};for(let i=0;i<14;i++){const a=i*2.4,r=i%5*1.1,px=t.x+Math.sin(a)*r,pz=t.z+Math.cos(a)*r;this.create('arrowfall',px,7+i%3,pz,0xffe8b0,.6,.5+i%4*.06,new T.Vector3(px,.2,pz));}this.create('ring',x,.08,z,0xb8e27a,5,.7);}
    else if(cls==='guardian'){this.create('shield',x,1.4,z,0x99c7ff,3.2,1.1);this.create('sigil',x,.08,z,0x99c7ff,5,.9);}
    else{this.create('field',x,.08,z,tint,5,1);this.create('flare',x,1,z,tint,1.4,.35);this.burst('spark',x,z,tint,10,5,.2,1,.22,.7);}break;
   case 206:if(caster){const f=caster.facing;for(const side of [-1,1])this.create('slashfx',x+Math.sin(f+side*.3)*1.6,1.3,z+Math.cos(f+side*.3)*1.6,0xff5a7a,2.6,.3);}this.burst('ember',x,z,0xff3a5a,8,3,.4,1.6,.35,.6);break;
   case 208:this.create('pillar',x,0,z,tint,3,1.2);this.create('halo',x,.15,z,tint,10,1.2);this.create('ring',x,.1,z,tint,8,.9);this.burst('star',x,z,tint,18,12,.3,2,.3,1);break;
   case 209:this.create('halo',x,.6,z,0xbfe8ff,2.2,.7);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;this.create('smoke',x+Math.sin(a)*1.4,.3,z+Math.cos(a)*1.4,0xcfe8f0,.5,.7,new T.Vector3(x+Math.sin(a+1.4)*1.6,1.8,z+Math.cos(a+1.4)*1.6));}break;
   case 210:for(let i=0;i<10;i++){const a=i/10*Math.PI*2;this.create('ember',x+Math.sin(a)*.8,.2,z+Math.cos(a)*.8,0xff3a4a,.4,.9,new T.Vector3(x+Math.sin(a)*.5,2.6,z+Math.cos(a)*.5));}this.create('glow',x,1.2,z,0xff2a3a,1.6,.8,new T.Vector3(x,1.4,z));break;
   case 211:{const from=this.lastBolt.owner===e.owner&&s.time-this.lastBolt.time<.1?this.lastBolt:caster||{x,z};this.create('bolt',from.x,1.3,from.z,0xbfe6ff,.09,.3,new T.Vector3(x,1.2,z));this.create('bolt',from.x,1.3,from.z,0x6fb6ff,.22,.25,new T.Vector3(x,1.2,z));this.create('flare',x,1.2,z,0xd8f0ff,1.2,.3);this.lastBolt={x,z,owner:e.owner,time:s.time};break;}
   case 212:this.create('sigil',x,.08,z,0xaee8ff,7,.8);this.create('ring',x,.1,z,0xd8f6ff,3,.6);this.burst('star',x,z,0xe0f8ff,16,7,.4,.4,.28,.7);this.create('dust',x,.4,z,0xe8f8ff,2,.8,new T.Vector3(x,1,z));break;
   case 213:this.create('smoke',x,.6,z,0x9a7ac9,.9,.6,new T.Vector3(x,1.6,z));this.create('glow',x,1,z,0xc9a0ff,1.4,.35,new T.Vector3(x,1,z));this.burst('spark',x,z,0xd8b8ff,6,2,.6,1,.18,.4);break;
   case 214:this.create('sigil',x,.06,z,0xff4d6d,2.4,.9);this.create('ring',x,.08,z,0xff6b84,1.2,.6);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;this.create('spark',x+Math.sin(a)*.9,.2,z+Math.cos(a)*.9,0xff6b84,.2,.8,new T.Vector3(x+Math.sin(a)*.4,2.8,z+Math.cos(a)*.4));}break;
   case 215:this.create('field',x,.08,z,0xff2d55,7,1.3);this.create('sigil',x,.1,z,0xff5a7a,4,1.1);this.implode(x,z,0xff6b84,16,7);this.create('pillar',x,0,z,0xff2d55,1.2,.8);break;
   case 216:this.create('sigil',x,.08,z,0xff2244,5,.7);this.create('ring',x,.1,z,0xff4466,3,.6);this.create('flare',x,1,z,0xff5a7a,2.2,.35);this.burst('spark',x,z,0xff6b84,14,6,.4,1,.26,.6);break;
   case 217:this.create('flare',x,1.5,z,0xff9aaa,4,.6);this.create('pillar',x,0,z,0xff2a4a,3.4,1.2);break;
   case 218:this.create('flare',x,1.4,z,0xffe0e6,2,.35);this.burst('star',x,z,0xffc2cc,10,3,1,1.2,.24,.5);break;
   default:this.create('field',x,.08,z,tint,5,1);this.burst('spark',x,z,tint,8,5,.2,1,.22,.7);
  }
 }
 dispose(){for(const map of [this.hostile,this.hazards,this.shots]){for(const m of map.values())m.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Sprite)(o.material as T.Material).dispose();});map.clear();}this.arrow.dispose();for(const b of this.beams.values())b.group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Sprite)(o.material as T.Material).dispose();});this.beams.clear();this.tube.dispose();if(this.realm){this.realm.group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Sprite)(o.material as T.Material).dispose();});this.realm.dome.geometry.dispose();}for(const f of this.effects)(f.mesh.material as T.Material).dispose();this.effects=[];this.plane.dispose();this.root.removeFromParent();}
}

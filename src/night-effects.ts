import * as T from 'three';
import {fxTexture} from './night-assets';
import type {NightState} from './night-simulation';
type Fx={mesh:T.Mesh|T.Sprite;age:number;life:number;kind:string;radius:number;from:T.Vector3;to:T.Vector3;spin:number};
/** Ground-plane kinds lie flat; the rest are camera-facing sprites. Each kind maps to a CC0 Kenney particle texture. */
const FLAT:Record<string,string>={field:'rune',halo:'twirl',ring:'ring',scorch:'scorch'};
const SPRITE:Record<string,string>={spark:'spark',fall:'fire',flare:'flare',glow:'glow',star:'star',smoke:'smoke'};
/** Bounded, shared geometry effects; actual skill release events drive the impact. */
export class NightEffects{
 readonly root=new T.Group();private hostile=new Map<number,T.Object3D>();private hazards=new Map<number,T.Mesh>();private shots=new Map<number,T.Object3D>();private arrow=new T.ConeGeometry(.13,.85,5);private effects:Fx[]=[];private seen=0;private trailTick=-1;
 private plane=new T.PlaneGeometry(2,2);
 private additive(map:string,color:number,opacity=.9){return {map:fxTexture(map),color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending};}
 private glow(color:number,size:number){const s=new T.Sprite(new T.SpriteMaterial(this.additive('glow',color)));s.scale.setScalar(size);return s;}
 private create(kind:string,x:number,y:number,z:number,color:number,radius:number,life:number,to?:T.Vector3){
  if(this.effects.length>=110){const old=this.effects.shift()!;old.mesh.removeFromParent();(old.mesh.material as T.Material).dispose();}
  let mesh:T.Mesh|T.Sprite;
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
 for(const e of s.events){if(e.id<=this.seen)continue;this.seen=e.id;if(e.kind==='cast'&&e.value>=200){const colors:Record<number,number>={201:0x86edc1,202:0x99c7ff,203:0xffb669,204:0xc89aff,205:0xffe0a2,206:0xff759a,207:0xaacaf3,208:0xe2c0ff,209:0x99c7ff,210:0xff759a};const color=colors[e.value]||0xffc88c,r=e.value===209?1.4:e.value===210?2.5:e.value===203?4:e.value===201||e.value===202?8:e.value===204?13:e.value===208?12:5;
  this.create('field',e.x,.08,e.z,color,r,1.1);this.create('ring',e.x,.1,e.z,color,r*.4,.7,new T.Vector3(e.x,.1,e.z));this.create('halo',e.x,1.2,e.z,color,Math.min(3,r*.4),.8);this.create('flare',e.x,.5,e.z,color,.8,.3);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;this.create(i%2?'star':'spark',e.x+Math.sin(a)*r*.65,.1,e.z+Math.cos(a)*r*.65,color,.22,.8,new T.Vector3(e.x+Math.sin(a)*r,.8+i%3*.4,e.z+Math.cos(a)*r));}
 }if(e.kind==='cast'&&e.value===103){this.create('fall',e.x+2,8,e.z-2,0xffb66d,.8,.55,new T.Vector3(e.x,.2,e.z));this.create('glow',e.x+2,8,e.z-2,0xff8a3c,1.2,.55,new T.Vector3(e.x,.6,e.z));this.create('field',e.x,.05,e.z,0xffb66d,4,.55);this.create('scorch',e.x,.04,e.z,0x40281a,2.6,2.5);}
 if(e.kind==='hit'){this.create('flare',e.x,1.1,e.z,0xffe3a0,.9,.22);for(let i=0;i<4;i++)this.create('spark',e.x,1,e.z,0xffd98c,.14,.3,new T.Vector3(e.x+Math.sin(i*1.6)*.9,1.6,e.z+Math.cos(i*1.6)*.9));}
 if(e.kind==='dodge'){this.create('smoke',e.x,.4,e.z,0x9fb7c9,.55,.45,new T.Vector3(e.x,.9,e.z));this.create('ring',e.x,.06,e.z,0xa3dcea,.4,.3,new T.Vector3(e.x,.06,e.z));}
 }
 this.effects=this.effects.filter(f=>{f.age+=dt;const t=Math.min(1,f.age/f.life);if(t>=1){f.mesh.removeFromParent();(f.mesh.material as T.Material).dispose();return false;}const m=f.mesh.material as T.MeshBasicMaterial|T.SpriteMaterial;m.opacity=(f.kind==='scorch'?.7:.9)*(1-t*t);
  if(f.kind==='fall'||f.kind==='glow'){f.mesh.position.lerpVectors(f.from,f.to,t*t);f.mesh.scale.setScalar(f.radius*2.6);}
  else if(f.kind==='spark'||f.kind==='star'||f.kind==='smoke'){f.mesh.position.lerpVectors(f.from,f.to,t);f.mesh.scale.setScalar(f.radius*(f.kind==='smoke'?2+t*2:5*(1-t*.6)));}
  else if(f.kind==='flare'){f.mesh.scale.setScalar(f.radius*(1+t*1.5));}
  else if(f.kind==='ring'){f.mesh.scale.setScalar(f.radius*(.6+t*2.4));}
  else{f.mesh.scale.setScalar(f.radius*(f.kind==='field'?.92+.08*Math.sin(t*Math.PI):f.kind==='scorch'?1:.5+t*.7));f.mesh.rotation.z+=dt*(f.kind==='field'?.6:2)*Math.sign(f.spin||1);}
  if(f.mesh instanceof T.Sprite)(f.mesh.material as T.SpriteMaterial).rotation+=f.spin*dt;
  return true;});}
 dispose(){for(const map of [this.hostile,this.hazards,this.shots]){for(const m of map.values())m.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Sprite)(o.material as T.Material).dispose();});map.clear();}this.arrow.dispose();for(const f of this.effects)(f.mesh.material as T.Material).dispose();this.effects=[];this.plane.dispose();this.root.removeFromParent();}
}

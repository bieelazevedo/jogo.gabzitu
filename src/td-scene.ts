import * as T from 'three';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {Actor,fxTexture,loadExtraPack,loadModel,loadNightAssets,prop,type NightAssets} from './night-assets';
import {catFeatures} from './night-actors';
import {CATS,ENEMIES,LEVELS} from './data';
import {position,stats} from './simulation';
import {movementRadius} from './mobility';
import {CombatVfx,drawAura,drawRouteHints} from './combat-vfx';
import {hexMap,simToWorld,TD_PITCH,TD_SCALE,type HexCell,type HexMap} from './td-hex';
import {CAT_LOOKS,ENEMY_LOOKS,type EnemyLook} from './td-looks';
import type {Selection} from './render';
import type {CatKind,Enemy,Level,Point,Save,State,Tower} from './types';

const TAU=Math.PI*2,COS=Math.cos(TD_PITCH);
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const ease=(a:number,b:number,k:number)=>a+(b-a)*Math.min(1,k);
const turn=(a:number,b:number,k:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*Math.min(1,k);
/** Simulation heading (atan2 in screen space) as a rotation about Y in the world. */
const heading=(dx:number,dy:number)=>Math.atan2(dx,dy/Math.sin(TD_PITCH));
const world=(p:Point)=>simToWorld(p);

/** Road tiles of the KayKit hexagon pack and the hex edges each one joins (E=0, counter-clockwise). */
const ROAD_TILES:[string,number[]][]=[['hex_road_A',[0,3]],['hex_road_B',[3,1]],['hex_road_C',[3,2]],['hex_road_D',[3,1,5]],['hex_road_E',[3,0,1]],['hex_road_F',[3,0,5]],['hex_road_G',[3,2,4]],['hex_road_M',[3]]];
function roadTile(mask:number){for(const [name,edges] of ROAD_TILES)for(let rot=0;rot<6;rot++)if(edges.reduce((m,e)=>m|1<<(e+rot)%6,0)===mask)return {name,rot};return {name:'hex_road_L',rot:0};}

type Theme={grass:number;road:number;sky:number;hemi:[number,number,number];sun:[number,number];near:string[];far:string[];field:string[];buildings:string[];night:boolean};
const THEMES:Record<'garden'|'town'|'night',Theme>={
 garden:{grass:0xcfe8b8,road:0xffffff,sky:0x9fc9d9,hemi:[0xdff2ff,0x5b6b3c,1.25],sun:[0xfff1d6,2.4],near:['rock_single_A','rock_single_C','rock_single_E','tree_single_A'],far:['trees_A_large','trees_B_large','trees_A_medium','trees_B_medium','hills_A_trees','hills_B_trees','mountain_A_grass_trees','mountain_B_grass_trees'],field:['trees_A_small','trees_B_small','tree_single_B','trees_A_medium','rock_single_B','hill_single_A'],buildings:['building_windmill_blue','building_home_A_blue','building_well_blue','building_lumbermill_blue','building_home_B_blue','building_market_blue'],night:false},
 town:{grass:0xd8e2c0,road:0xfff3e0,sky:0xbfd2d8,hemi:[0xfff2e0,0x6b5b44,1.2],sun:[0xffe4c0,2.3],near:['barrel','crate_A_big','sack','rock_single_D'],far:['building_church_blue','building_tavern_blue','building_home_A_blue','building_home_B_blue','building_blacksmith_blue','building_market_blue','trees_B_large','hills_C_trees'],field:['building_home_A_blue','building_home_B_blue','building_well_blue','tree_single_A','trees_B_small','building_tavern_blue'],buildings:['building_barracks_blue','building_archeryrange_blue','building_church_blue','building_watermill_blue'],night:false},
 night:{grass:0x8d9ab8,road:0xa8acc0,sky:0x1c2840,hemi:[0x9fb8ff,0x2a2238,1.15],sun:[0xb9ccff,1.6],near:['gravestone','grave_A','pumpkin_orange_jackolantern','bone_A','rock_single_A'],far:['tree_dead_large','tree_pine_orange_medium','tree_pine_yellow_large','mountain_C_grass_trees','hills_C_trees','tree_dead_medium','trees_A_large'],field:['tree_dead_medium','tree_dead_small','grave_B','gravemarker_A','lantern_standing','tree_pine_orange_medium'],buildings:['crypt','building_destroyed','building_tower_B_red'],night:true},
};
/** Kenney Nature Kit undergrowth (CC0) scattered along the roads. */
const SMALL=['plant_bushDetailed','plant_bushLarge','flower_purpleA','flower_redA','flower_yellowA','mushroom_redGroup','grass_leafsLarge','stump_roundDetailed'];
const themeOf=(l:Level)=>THEMES[l.theme==='town'||l.theme==='archive'?'town':l.theme==='night'?'night':'garden'];
/** Halloween Bits are modelled at character scale; the hexagon pack is about 5× smaller. */
const BIT=.5;

/** Collects static props and turns each prop part into one InstancedMesh. */
class Batch{
 private items=new Map<string,{m:T.Matrix4;c?:T.Color}[]>();private q=new T.Quaternion();private up=new T.Vector3(0,1,0);
 add(name:string,x:number,y:number,z:number,rot=0,scale=1,color?:number){const m=new T.Matrix4().compose(new T.Vector3(x,y,z),this.q.setFromAxisAngle(this.up,rot).clone(),new T.Vector3(scale,scale,scale));let list=this.items.get(name);if(!list){list=[];this.items.set(name,list);}list.push({m,c:color===undefined?undefined:new T.Color(color)});}
 build(assets:NightAssets,root:T.Object3D){const meshes:T.InstancedMesh[]=[];
  for(const [name,list] of this.items){for(const part of assets.parts(name)){const mesh=new T.InstancedMesh(part.geometry,part.material,list.length);list.forEach((it,i)=>{mesh.setMatrixAt(i,it.m.clone().multiply(part.matrix));if(it.c)mesh.setColorAt(i,it.c);});mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh);}}
  return meshes;}
}

let shadowTexture:T.Texture|null=null;
/** Soft contact shadow (radial gradient) under every unit. */
function blobShadow(size:number){if(!shadowTexture){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d')!,r=g.createRadialGradient(32,32,2,32,32,31);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,64,64);shadowTexture=new T.CanvasTexture(c);}
 const m=new T.Mesh(new T.PlaneGeometry(size,size),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.03;m.renderOrder=1;return m;}

const additive=(map:string,color:number|string,opacity=1)=>new T.SpriteMaterial({map:fxTexture(map),color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending});

/** A cat standing guard on its tower. */
class CatUnit{
 readonly root=new T.Group();readonly actor:Actor;private base:T.Object3D;private top:number;private casts=0;private busyUntil=0;private aura?:T.Sprite;private ring:T.Mesh;private level=0;private stars:T.Sprite[]=[];
 constructor(assets:NightAssets,private t:Tower,parent:T.Object3D,at:{x:number;y:number;z:number}){
  const look=CAT_LOOKS[t.kind],skeleton=look.model.startsWith('Skeleton');
  this.base=prop(assets,'building_tower_base_blue');const box=new T.Box3().setFromObject(this.base);const k=Math.min(.62,.8/Math.max(.01,box.max.y-box.min.y));this.base.scale.setScalar(k);this.top=box.max.y*k;
  this.root.position.set(at.x,at.y,at.z);this.root.add(this.base);
  this.actor=new Actor(assets,look.model,{items:look.items??[],tint:look.tint,scale:1.02*(look.scale||1)});
  for(const [item,bone] of look.hold||[])this.actor.hold(item,bone);
  // Ears only: from this camera height the tail reads as a hook.
  if(!skeleton)catFeatures(this.actor,look.fur??0xc8a070).tail.forEach(t=>t.visible=false);
  this.actor.root.position.y=this.top;this.root.add(this.actor.root);this.actor.play('Idle',{speed:.8+hash(t.id)*.4});
  if(look.glow){this.aura=new T.Sprite(additive('glow',look.glow,.55));this.aura.scale.setScalar(1.1);this.aura.position.y=this.top+.65;this.root.add(this.aura);}
  this.ring=new T.Mesh(new T.RingGeometry(.72,.86,40),new T.MeshBasicMaterial({color:t.owner===1?0x79bed2:0xf3d48a,transparent:true,opacity:.0,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.ring.position.y=this.top+.04;this.root.add(this.ring);
  this.casts=t.casts||0;parent.add(this.root);
 }
 update(t:Tower,s:State,dt:number,time:number,selected:boolean){
  this.t=t;const look=CAT_LOOKS[t.kind],a=this.actor;
  // Fighters leave the tower to meet enemies; their position is the simulation offset.
  const off=t.offset||{x:0,y:0},away=Math.hypot(off.x,off.y)>3,target=away?{x:off.x/TD_SCALE,z:off.y/(TD_SCALE*Math.sin(TD_PITCH))}:{x:0,z:0};
  const r=a.root;const px=r.position.x,pz=r.position.z;r.position.x=ease(px,target.x,dt*10);r.position.z=ease(pz,target.z,dt*10);r.position.y=ease(r.position.y,away?-this.root.position.y:this.top,dt*12);
  const moving=Math.hypot(r.position.x-px,r.position.z-pz)/Math.max(dt,.001);
  r.rotation.y=turn(r.rotation.y,heading(Math.cos(t.angle),Math.sin(t.angle)),dt*8);
  if((t.casts||0)!==this.casts){this.casts=t.casts||0;a.play(look.attack,{loop:false,restart:true,fade:.06,speed:Math.max(1,a.duration(look.attack)/Math.max(.35,stats(t,s).interval*.9))});this.busyUntil=time+Math.min(a.duration(look.attack)*.8,.9);}
  else if(time>this.busyUntil){if(moving>.6)a.play('Running_A',{fade:.12});else a.play(s.enemies.length?'Idle_Combat':'Idle',{fade:.3});}
  if(this.level!==t.level){this.level=t.level;this.stars.forEach(sp=>{sp.removeFromParent();sp.material.dispose();});this.stars=[];for(let i=1;i<t.level;i++){const sp=new T.Sprite(additive('star',t.branch==='b'?0x9fe8ff:0xffd77a,.95));sp.scale.setScalar(.36);sp.position.set((i-(t.level)/2)*.32,this.top+.25,.95);this.root.add(sp);this.stars.push(sp);}a.root.scale.setScalar(1+(t.level-1)*.08);}
  if(this.aura){const k=t.shot>0?1.6:1;this.aura.material.opacity=.32+Math.sin(time*3+t.id)*.1+(t.shot>0?.35:0);this.aura.scale.setScalar(1.1*k);}
  (this.ring.material as T.MeshBasicMaterial).opacity=selected?.85:t.owner===1?.6:0;
  a.update(dt);
 }
 dispose(){this.stars.forEach(sp=>sp.material.dispose());this.aura?.material.dispose();this.ring.geometry.dispose();(this.ring.material as T.Material).dispose();this.actor.dispose();this.root.removeFromParent();}
}

type DogTemplate={scene:T.Object3D;animations:T.AnimationClip[]};
/** A skeleton (or hound) walking the road. */
class EnemyUnit{
 readonly root=new T.Group();private actor?:Actor;private mixer?:T.AnimationMixer;private dogActions=new Map<string,T.AnimationAction>();private dogCurrent?:T.AnimationAction;
 private materials:T.MeshStandardMaterial[]=[];private last=new T.Vector3();dying=0;height:number;private shadow:T.Mesh;private look:EnemyLook;private hitUntil=0;private lastHit=0;
 constructor(assets:NightAssets,dog:DogTemplate|null,readonly e:Enemy,parent:T.Object3D,at:{x:number;z:number}){
  this.look=ENEMY_LOOKS[e.kind]||ENEMY_LOOKS.rat;const look=this.look;
  if(look.model==='Dog'&&dog){const model=cloneSkinned(dog.scene);const box=new T.Box3().setFromObject(dog.scene),len=Math.max(box.max.x-box.min.x,box.max.z-box.min.z);model.scale.setScalar(1.5*look.scale/Math.max(.01,len)*1.6);
   model.traverse(o=>{if(o instanceof T.Mesh){const m=(o.material as T.MeshStandardMaterial).clone();m.color.multiply(new T.Color(0x9a8f9a));o.material=m;this.materials.push(m);}});this.root.add(model);this.mixer=new T.AnimationMixer(model);
   const clip=(n:string)=>dog.animations.find(a=>a.name===n);for(const n of ['Walk','Gallop','Death','Idle'])if(clip(n))this.dogActions.set(n,this.mixer.clipAction(clip(n)!));this.dogPlay('Walk');this.height=1.1;}
  else{const model=look.model==='Dog'?'Skeleton_Minion':look.model;this.actor=new Actor(assets,model,{tint:look.tint,scale:look.scale});for(const [item,bone] of look.hold||[])this.actor.hold(item,bone);
   if(look.crate){const crate=prop(assets,'crate_A_big');crate.scale.setScalar(2.2);crate.position.set(0,-.2,0);this.actor.bone('head')?.add(crate);}
   if(look.ghost)for(const m of this.actor.materials){m.transparent=true;m.opacity=.62;m.emissive.setHex(0x3a7cff);m.emissiveIntensity=.55;}
   this.materials=this.actor.materials;this.root.add(this.actor.root);this.actor.play(look.run?'Running_C':'Walking_D_Skeletons',{speed:.9+hash(e.id)*.2});this.height=2.4*look.scale;}
  this.shadow=blobShadow(1.4*Math.max(.6,look.scale*1.6));this.root.add(this.shadow);
  this.root.position.set(at.x,0,at.z);this.last.copy(this.root.position);parent.add(this.root);
  if(look.ghost)this.shadow.visible=false;
 }
 private dogPlay(name:string,loop=true){const a=this.dogActions.get(name);if(!a||a===this.dogCurrent)return;a.reset();a.setLoop(loop?T.LoopRepeat:T.LoopOnce,Infinity);a.clampWhenFinished=!loop;a.play();if(this.dogCurrent)a.crossFadeFrom(this.dogCurrent,.15,false);this.dogCurrent=a;}
 update(e:Enemy,at:{x:number;z:number},dt:number,time:number){
  const r=this.root;this.last.copy(r.position);r.position.x=ease(r.position.x,at.x,dt*14);r.position.z=ease(r.position.z,at.z,dt*14);
  const dx=r.position.x-this.last.x,dz=r.position.z-this.last.z,speed=Math.hypot(dx,dz)/Math.max(dt,.001);if(speed>.05)r.rotation.y=turn(r.rotation.y,Math.atan2(dx,dz),dt*10);
  if(this.look.ghost)r.position.y=.35+Math.sin(time*3+e.id)*.12;
  if(e.hit>0&&this.lastHit<=0)this.hitUntil=time+.18;this.lastHit=e.hit;
  const slow=e.slowTime>0,anim=(slow?.55:1)*Math.min(1.8,.6+speed*.45);
  if(this.actor){if(time<this.hitUntil&&!ENEMIES[e.kind].boss)this.actor.play('Hit_A',{loop:false,fade:.05,speed:1.6});else this.actor.play(this.look.run?'Running_C':'Walking_D_Skeletons',{fade:.15,speed:anim});}
  else{this.dogPlay(speed>1.6?'Gallop':'Walk');this.dogCurrent&&(this.dogCurrent.timeScale=anim);}
  const flash=e.hit>0?[0xffd0a0,.7]:e.burnTime>0?[0xff6a20,.35]:e.poisonTime>0?[0x55d040,.3]:slow?[0x3a78ff,.35]:e.marked>0?[0xffd860,.25]:this.look.ghost?[0x3a7cff,.55]:[0,0];
  for(const m of this.materials){m.emissive.setHex(flash[0]);m.emissiveIntensity=flash[1];}
  this.actor?.update(dt);this.mixer?.update(dt);
 }
 /** Death: the last pose plays, then the body sinks into the ground. */
 die(dt:number){this.dying+=dt;if(this.dying<dt*1.5){if(this.actor)this.actor.play('Death_A',{loop:false,fade:.08,restart:true,speed:1.3});else this.dogPlay('Death',false);}
  if(this.dying>.9)this.root.position.y-=dt*.9;this.shadow.visible=false;this.actor?.update(dt);this.mixer?.update(dt);return this.dying>1.6;}
 dispose(){this.mixer?.stopAllAction();this.actor?.dispose();if(!this.actor)this.materials.forEach(m=>m.dispose());this.shadow.geometry.dispose();(this.shadow.material as T.Material).dispose();this.root.removeFromParent();}
}

type Projectile3D={obj:T.Object3D;kind:string;trail?:T.Sprite;y:number};
type Effect3D={objs:(T.Sprite|T.Mesh)[]};

/**
 * Three.js battlefield for the tower defense, with the same interface as the 2D Renderer.
 * The simulation never changes: this class reads State and draws it on the KayKit hex map.
 * A transparent 2D overlay (same simulation coordinates) carries health bars, numbers and hints.
 */
export class TdRenderer{
 readonly overlay:HTMLCanvasElement;private gl:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera(-1,1,1,-1,.1,200);
 private assets:NightAssets|null=null;private dog:DogTemplate|null=null;private failed=false;private levelId=0;private map:HexMap|null=null;private world=new T.Group();private dynamic=new T.Group();
 private statics:T.InstancedMesh[]=[];private owned:{dispose:()=>void}[]=[];private cats=new Map<number,CatUnit>();private enemies=new Map<number,EnemyUnit>();private dying:EnemyUnit[]=[];
 private projectiles=new Map<number,Projectile3D>();private effects=new Map<number,Effect3D>();private traps=new Map<number,T.Object3D>();private plots:T.Object3D[]=[];private plotRings:T.Mesh[]=[];
 private range:T.Mesh;private rangeEdge:T.Mesh;private aim:T.Mesh;private c2:CanvasRenderingContext2D;private vfx=new CombatVfx();private scale=1;private ox=0;private oy=0;private dpr=1;private last=performance.now();private clock=0;
 readonly ready:Promise<void>;
 private sun:T.DirectionalLight;private hemi:T.HemisphereLight;private flickers:{light:T.PointLight;base:number;seed:number}[]=[];
 constructor(readonly canvas:HTMLCanvasElement,private onFail:()=>void){
  this.gl=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.gl.outputColorSpace=T.SRGBColorSpace;this.gl.toneMapping=T.ACESFilmicToneMapping;this.gl.toneMappingExposure=1.05;
  this.overlay=document.createElement('canvas');this.overlay.className='battle-overlay';this.overlay.setAttribute('aria-hidden','true');Object.assign(this.overlay.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});canvas.after(this.overlay);this.c2=this.overlay.getContext('2d')!;
  this.hemi=new T.HemisphereLight(0xdff2ff,0x5b6b3c,1.2);this.sun=new T.DirectionalLight(0xfff1d6,2.4);this.sun.position.set(-12,24,14);this.scene.add(this.hemi,this.sun,this.world,this.dynamic);
  const disc=(inner:number,outer:number,color:number,opacity:number)=>{const m=new T.Mesh(inner>0?new T.RingGeometry(inner,outer,72):new T.CircleGeometry(outer,72),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false}));m.rotation.x=-Math.PI/2;m.renderOrder=5;m.visible=false;this.scene.add(m);return m;};
  this.range=disc(0,1,0xf6eebd,.13);this.rangeEdge=disc(.985,1,0xfff3c4,.85);this.aim=disc(0,1,0xffcf7a,.22);
  this.ready=Promise.all([loadNightAssets(),loadExtraPack('hex'),loadModel('Dog').catch(()=>null)]).then(([assets,,dog])=>{this.assets=assets;this.dog=dog;});
  this.gestures();
  this.ready.catch(e=>{console.warn('Campo 3D indisponível; a usar 2D.',e);this.failed=true;this.onFail();});
 }
 /** True while models are still downloading (the overlay shows a loading line). */
 get loading(){return !this.assets&&!this.failed;}
 resize(quality:Save['settings']['quality']){
  const r=this.canvas.getBoundingClientRect();this.dpr=Math.min(window.devicePixelRatio||1,quality==='low'?1:quality==='medium'?1.5:2);
  const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));this.gl.setPixelRatio(this.dpr);const size=this.gl.getSize(new T.Vector2());if(size.x!==w||size.y!==h)this.gl.setSize(w,h,false);
  if(this.overlay.width!==Math.round(w*this.dpr)||this.overlay.height!==Math.round(h*this.dpr)){this.overlay.width=Math.round(w*this.dpr);this.overlay.height=Math.round(h*this.dpr);}
  // Fit the level's playable box (roads and spots), then apply the player's pinch zoom and pan.
  const b=this.box,base=Math.min(w/(b.x1-b.x0),h/(b.y1-b.y0));this.scale=base*this.zoom;
  const hwS=w/2/this.scale,hhS=h/2/this.scale,mx=(b.x0+b.x1)/2,my=(b.y0+b.y1)/2;
  this.cx=hwS*2>=b.x1-b.x0?mx:Math.max(b.x0+hwS,Math.min(b.x1-hwS,this.cx));this.cy=hhS*2>=b.y1-b.y0?my:Math.max(b.y0+hhS,Math.min(b.y1-hhS,this.cy));
  this.ox=w/2-this.cx*this.scale;this.oy=h/2-this.cy*this.scale;
  const ppw=this.scale*TD_SCALE,hw=w/2/ppw,hh=h/2/ppw,focus=simToWorld({x:this.cx,y:this.cy});
  const cam=this.camera;cam.left=-hw;cam.right=hw;cam.top=hh;cam.bottom=-hh;cam.position.set(focus.x,60*Math.sin(TD_PITCH),focus.z+60*COS);cam.lookAt(focus.x,0,focus.z);cam.near=1;cam.far=160;cam.updateProjectionMatrix();
 }
 point(clientX:number,clientY:number):Point{const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.ox)/this.scale,y:(clientY-r.top-this.oy)/this.scale};}
 /** Simulation point to client coordinates (for popovers anchored to towers). */
 screen(p:Point){const r=this.canvas.getBoundingClientRect();return {x:r.left+this.ox+p.x*this.scale,y:r.top+this.oy+p.y*this.scale};}
 pixelsPerUnit(){return this.scale;}
 private box={x0:-30,x1:1030,y0:-20,y1:620};private zoom=1;private cx=500;private cy=300;
 /** True when the last touch on the map panned or zoomed it (so lifting the finger is not a tap). */
 dragged=false;onView?:()=>void;
 private fitLevel(level:Level){const pts=[...level.spots,...level.paths.flat().map(p=>({x:Math.max(0,Math.min(1000,p.x)),y:p.y}))];
  this.box={x0:Math.min(...pts.map(p=>p.x))-55,x1:Math.max(...pts.map(p=>p.x))+55,y0:Math.min(...pts.map(p=>p.y))-75,y1:Math.max(...pts.map(p=>p.y))+40};this.zoom=1;this.cx=500;this.cy=300;}
 private gestures(){
  const c=this.canvas;let last:{x:number;y:number;d:number}|null=null,start={x:0,y:0};
  const read=(e:TouchEvent)=>{const t=Array.from(e.touches);const x=t.reduce((a,v)=>a+v.clientX,0)/t.length,y=t.reduce((a,v)=>a+v.clientY,0)/t.length;return {x,y,d:t.length>1?Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY):0};};
  // Keeps the map point that was under the fingers (before they moved by dx,dy) under them after zooming.
  const apply=(dx:number,dy:number,factor:number,fx:number,fy:number)=>{const r=this.canvas.getBoundingClientRect(),before=this.point(fx-dx,fy-dy),old=this.zoom;this.zoom=Math.max(1,Math.min(2.6,this.zoom*factor));
   const scale=this.scale*this.zoom/old;this.cx=before.x-(fx-r.left-r.width/2)/scale;this.cy=before.y-(fy-r.top-r.height/2)/scale;this.onView?.();};
  const touchStart=(e:TouchEvent)=>{if(e.cancelable)e.preventDefault();last=read(e);if(e.touches.length===1){start={x:last.x,y:last.y};this.dragged=false;}else this.dragged=true;};
  const touchMove=(e:TouchEvent)=>{if(e.cancelable)e.preventDefault();if(!last)return;const now=read(e);if(Math.hypot(now.x-start.x,now.y-start.y)>9)this.dragged=true;
   if(this.dragged&&this.zoom>1||now.d)apply(now.x-last.x,now.y-last.y,now.d&&last.d?now.d/last.d:1,now.x,now.y);last=now;};
  const touchEnd=(e:TouchEvent)=>{last=e.touches.length?read(e):null;};
  const wheel=(e:WheelEvent)=>{e.preventDefault();apply(0,0,Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);};
  let mouse:{x:number;y:number}|null=null;
  const down=(e:PointerEvent)=>{if(e.pointerType!=='mouse')return;mouse={x:e.clientX,y:e.clientY};start=mouse;this.dragged=false;};
  const move=(e:PointerEvent)=>{if(!mouse||e.pointerType!=='mouse')return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)this.dragged=true;if(this.dragged&&this.zoom>1)apply(e.clientX-mouse.x,e.clientY-mouse.y,1,e.clientX,e.clientY);mouse={x:e.clientX,y:e.clientY};};
  const up=()=>{mouse=null;};
  c.addEventListener('touchstart',touchStart,{passive:false});c.addEventListener('touchmove',touchMove,{passive:false});c.addEventListener('touchend',touchEnd);c.addEventListener('touchcancel',touchEnd);c.addEventListener('wheel',wheel,{passive:false});
  c.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
  this.owned.push({dispose:()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);}});
 }

 private build(level:Level){
  const assets=this.assets!;this.clearLevel();this.levelId=level.id;const map=hexMap(level);this.map=map;const theme=themeOf(level);
  this.scene.background=new T.Color(theme.sky);this.hemi.color.setHex(theme.hemi[0]);this.hemi.groundColor.setHex(theme.hemi[1]);this.hemi.intensity=theme.hemi[2];this.sun.color.setHex(theme.sun[0]);this.sun.intensity=theme.sun[1];
  const batch=new Batch(),cells=[...map.cells.values()],field=(c:HexCell)=>Math.abs(c.x)<20.5&&Math.abs(c.z)<15,spotCells=new Set(map.spots);
  const nearSpot=(c:HexCell)=>map.spots.some(s=>Math.abs(s.q-c.q)+Math.abs(s.r-c.r)+Math.abs(s.q+s.r-c.q-c.r)<=2);
  const ends=new Set<HexCell>();for(const route of map.routes){ends.add(route[0]);ends.add(route[route.length-1]);}
  const nearEnd=(c:HexCell)=>[...ends].some(e=>Math.hypot(e.x-c.x,e.z-c.z)<4.5);
  // Ponds: a few open tiles in the middle of the field become water.
  const ponds=new Set(cells.filter(c=>!c.road&&c.near>=3&&field(c)&&!spotCells.has(c)&&!nearSpot(c)&&hash(c.q*31+c.r*17+level.id)<.12).slice(0,4));
  for(const c of cells){const h=hash(c.q*92821+c.r*68917),tint=new T.Color(theme.grass).multiplyScalar(.93+h*.12).getHex();
   if(c.road){const {name,rot}=roadTile(c.edges);batch.add(name,c.x,0,c.z,rot*Math.PI/3,1,theme.road);continue;}
   const y=c.high?.55:0;batch.add('hex_grass',c.x,y,c.z,Math.floor(h*6)*Math.PI/3,1,tint);if(c.high)batch.add('hex_grass_bottom',c.x,-.45,c.z,0,1,tint);
   if(spotCells.has(c)||nearEnd(c))continue;
   const pick=(list:string[],k:number)=>list[Math.floor(hash(k)*list.length)];const rot=hash(c.q*7+c.r*13)*TAU;
   if(!field(c)){// Outer frame: dense woods and mountains that make the battlefield a valley.
    const edge=Math.max(Math.abs(c.x)-20.5,Math.abs(c.z)-15);if(c.near<=1)continue;
    if(h<.9)batch.add(edge>6&&h<.4?pick(['mountain_A_grass_trees','mountain_B_grass_trees','mountain_C_grass_trees'],h*91):pick(theme.far,h*53),c.x,0,c.z,Math.floor(rot/(Math.PI/3))*Math.PI/3,1);
    else if(h<.915&&edge<5)batch.add(pick(theme.buildings,h*17),c.x,0,c.z,Math.floor(rot/(Math.PI/3))*Math.PI/3,1);
    continue;}
   if(c.near===1){if(h<.22)batch.add(pick(theme.near,h*31),c.x+(hash(h)-.5)*.8,0,c.z+(hash(h*3)-.5)*.6,rot,theme.night&&h<.1?BIT*.8:1);
    else if(h<.5&&!theme.night)for(let k=0;k<2;k++)batch.add(pick(SMALL,h*97+k),c.x+(hash(h*5+k)-.5)*1.3,0,c.z+(hash(h*7+k)-.5)*1.1,rot+k,1.5);continue;}
   if(ponds.has(c)){batch.add('hex_water',c.x,0,c.z,0,1);batch.add(h<.5?'waterlily_A':'waterlily_B',c.x+.3,0,c.z-.2,rot,1);continue;}
   if(nearSpot(c)&&c.near<4){if(h<.35&&!theme.night)batch.add(pick(SMALL,h*41),c.x+(hash(h*9)-.5)*.9,0,c.z+(hash(h*11)-.5)*.8,rot,1.4);continue;}
   if(h<(c.near>=3?.55:.32)){const name=pick(theme.field,h*71);batch.add(name,c.x,0,c.z,Math.floor(rot/(Math.PI/3))*Math.PI/3,theme.night&&!name.startsWith('building')&&!name.startsWith('tree_single')&&!name.startsWith('trees')&&!name.startsWith('rock')&&!name.startsWith('hill')?BIT:1);}
  }
  // Skeleton gates at the entries; the Ordem's castle guards the refuge.
  for(const route of map.routes){const a=route[0],b=route[1]||a,ang=Math.atan2(b.x-a.x,b.z-a.z);batch.add('building_destroyed',a.x-Math.sin(ang)*1.6,0,a.z-Math.cos(ang)*1.6,ang,1.2);batch.add('gravestone',a.x+Math.cos(ang)*1.3,0,a.z-Math.sin(ang)*1.3,ang,BIT);batch.add('grave_A',a.x-Math.cos(ang)*1.3,0,a.z+Math.sin(ang)*1.3,ang+.4,BIT);batch.add('lantern_standing',a.x+Math.cos(ang)*1.1+.4,0,a.z-Math.sin(ang)*1.1+.6,0,BIT);
   this.light(0x9f7bff,a.x,1.6,a.z,6);}
  const exits=[...new Set(map.routes.map(r=>r[r.length-1]))];
  for(const e of exits){batch.add('building_castle_blue',e.x+1.4,0,e.z,-Math.PI/2,1.25);batch.add('flag_blue',e.x-.6,0,e.z-1.3,0,1.4);batch.add('flag_blue',e.x-.6,0,e.z+1.3,0,1.4);this.light(0xffc070,e.x,2,e.z,7);}
  this.statics=batch.build(assets,this.world);
  // Build plots: tilled earth with a soft ring; towers replace them visually.
  for(const [i,c] of map.spots.entries()){const plot=prop(assets,'building_dirt');plot.scale.setScalar(.82);plot.position.set(c.x,(c.high?.55:0)+.01,c.z);this.world.add(plot);this.plots[i]=plot;
   const ring=new T.Mesh(new T.RingGeometry(.62,.78,36),new T.MeshBasicMaterial({color:0xf3e2a6,transparent:true,opacity:.55,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(c.x,(c.high?.55:0)+.08,c.z);ring.renderOrder=2;this.world.add(ring);this.plotRings[i]=ring;
   if(c.high){const flag=prop(assets,'flag_blue');flag.position.set(c.x+.7,c.high?.55:0,c.z-.45);flag.scale.setScalar(.9);this.world.add(flag);}}
  // Fireflies by day, embers by night: a few additive sprites drifting over the field.
  for(let i=0;i<24;i++){const s=new T.Sprite(additive('glow',theme.night?0xffc070:0xfff2b0,.5));s.scale.setScalar(.25);s.userData.seed=i;s.position.set((hash(i)-.5)*40,1+hash(i*3)*2,(hash(i*7)-.5)*28);this.world.add(s);this.ambient.push(s);}
 }
 private ambient:T.Sprite[]=[];
 private light(color:number,x:number,y:number,z:number,distance:number){if(this.flickers.length>=4)return;const l=new T.PointLight(color,8,distance,1.6);l.position.set(x,y,z);this.world.add(l);this.flickers.push({light:l,base:8,seed:this.flickers.length});}
 private clearLevel(){
  for(const m of this.statics){m.dispose();m.removeFromParent();}this.statics=[];
  this.cats.forEach(c=>c.dispose());this.cats.clear();this.enemies.forEach(e=>e.dispose());this.enemies.clear();this.dying.forEach(e=>e.dispose());this.dying=[];
  for(const o of [...this.world.children]){o.removeFromParent();o.traverse(x=>{if(x instanceof T.Mesh&&x.geometry.type.includes('Ring'))x.geometry.dispose();if((x as T.Sprite).isSprite)(x as T.Sprite).material.dispose();});}
  this.plots=[];this.plotRings=[];this.ambient=[];this.flickers.forEach(f=>f.light.dispose());this.flickers=[];
  this.projectiles.forEach(p=>this.dropProjectile(p));this.projectiles.clear();this.effects.forEach(e=>this.dropEffect(e));this.effects.clear();this.traps.forEach(t=>t.removeFromParent());this.traps.clear();
 }
 private ground(spot:number){const c=this.map?.spots[spot];return c?.high?.55:0;}

 draw(s:State,selected:Selection,settings:Save['settings'],_remote=false){
  this.resize(settings.quality);const now=performance.now(),dt=Math.min(.1,(now-this.last)/1000);this.last=now;this.clock+=dt;const time=this.clock;
  const c=this.c2;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.overlay.width,this.overlay.height);
  if(!this.assets){this.gl.setClearColor(0x1b2b33);this.gl.clear();if(!this.failed){const r=this.canvas.getBoundingClientRect();c.fillStyle='#f0e2b6';c.font='600 15px Georgia';c.textAlign='center';c.fillText('A preparar o campo de batalha…',r.width/2,r.height/2);}return;}
  const level=LEVELS[s.levelId-1];if(level.id!==this.levelId){this.build(level);this.fitLevel(level);this.resize(settings.quality);}
  this.syncTowers(s,selected,dt,time);this.syncEnemies(s,level,dt,time);this.syncProjectiles(s,level,settings);this.syncEffects(s,settings,time);this.syncTraps(s);
  this.overlays(s,selected,level);
  for(const f of this.flickers)f.light.intensity=f.base*(.85+Math.sin(time*7+f.seed*3)*.08+Math.sin(time*13+f.seed)*.06);
  if(!settings.reduced)for(const sp of this.ambient){const k=sp.userData.seed as number;sp.position.x+=Math.sin(time*.4+k)*dt*.6;sp.position.y=1.2+Math.sin(time*1.3+k*2)*.5+hash(k)*1.5;sp.material.opacity=.25+Math.sin(time*2+k)*.2;}
  this.gl.render(this.scene,this.camera);
  this.drawOverlay(s,selected,level,settings);
 }

 private syncTowers(s:State,selected:Selection,dt:number,time:number){
  const live=new Set<number>();
  for(const t of s.towers){live.add(t.id);let unit=this.cats.get(t.id);const cell=this.map!.spots[t.spot];
   if(!unit){unit=new CatUnit(this.assets!,t,this.dynamic,{x:cell.x,y:this.ground(t.spot),z:cell.z});this.cats.set(t.id,unit);this.burst(cell.x,this.ground(t.spot)+.4,cell.z,0xffe8a8,2.6);}
   unit.update(t,s,dt,time,selected.spot===t.spot);}
  for(const [id,u] of this.cats)if(!live.has(id)){u.dispose();this.cats.delete(id);}
  const occupied=new Set(s.towers.map(t=>t.spot));
  this.plots.forEach((p,i)=>{p.visible=!occupied.has(i);const ring=this.plotRings[i];ring.visible=!occupied.has(i);const m=ring.material as T.MeshBasicMaterial;const chosen=selected.spot===i;m.color.setHex(chosen?0xffe08a:0xf3e2a6);m.opacity=chosen?.95:.35+Math.sin(time*2.4+i)*.12;ring.scale.setScalar(chosen?1.12+Math.sin(time*6)*.04:1);});
 }
 private syncEnemies(s:State,level:Level,dt:number,time:number){
  const live=new Set<number>();
  for(const e of s.enemies){live.add(e.id);const w=world(position(level.paths[e.path],e.progress));let unit=this.enemies.get(e.id);
   if(!unit){unit=new EnemyUnit(this.assets!,this.dog,e,this.dynamic,w);this.enemies.set(e.id,unit);if(e.progress>.02)this.burst(w.x,.6,w.z,0xb48cff,1.4);}
   unit.update(e,w,dt,time);}
  for(const [id,u] of this.enemies)if(!live.has(id)){this.enemies.delete(id);if(u.e.progress<.985){this.dying.push(u);}else u.dispose();}
  this.dying=this.dying.filter(u=>{if(u.die(dt)){u.dispose();return false;}return true;});
 }
 private makeProjectile(kind:CatKind|string):Projectile3D{
  const arrow=['archer','allyAdmiral','allyMagistrate','engineer'].includes(kind),bomb=['bomber','pirate','allyKing','chef','alchemist'].includes(kind);
  if(arrow){const o=prop(this.assets!,'Skeleton_Arrow');o.scale.setScalar(1.3);const g=new T.Group();o.rotation.x=Math.PI/2;g.add(o);this.dynamic.add(g);return {obj:g,kind,y:0};}
  if(bomb){const o=prop(this.assets!,kind==='alchemist'?'bottle_A_green':'smokebomb');o.scale.setScalar(kind==='alchemist'?.9:1.6);const g=new T.Group();g.add(o);const spark=new T.Sprite(additive('spark',0xffc060,.9));spark.scale.setScalar(.45);spark.position.y=.25;g.add(spark);this.dynamic.add(g);return {obj:g,kind,y:0};}
  const color=CATS[kind as CatKind]?.color||'#ffffff';const core=new T.Sprite(additive(kind==='ice'?'star':kind==='witch'||kind==='allyLegollas'?'magic':'flare',color,1));core.scale.setScalar(kind==='uia'?1.1:.7);this.dynamic.add(core);
  const trail=new T.Sprite(additive('trace',color,.6));trail.scale.set(.5,.5,1);this.dynamic.add(trail);return {obj:core,kind,trail,y:0};
 }
 private dropProjectile(p:Projectile3D){p.obj.removeFromParent();p.obj.traverse(o=>{if((o as T.Sprite).isSprite)(o as T.Sprite).material.dispose();});if(p.trail){p.trail.removeFromParent();p.trail.material.dispose();}}
 private syncProjectiles(s:State,level:Level,settings:Save['settings']){
  const live=new Set<number>();
  for(const p of s.projectiles){live.add(p.id);let v=this.projectiles.get(p.id);if(!v){v=this.makeProjectile(p.kind);this.projectiles.set(p.id,v);}
   const target=s.enemies.find(e=>e.id===p.target),dest=target?position(level.paths[target.path],target.progress):p.pos;
   const done=Math.hypot(p.pos.x-p.from.x,p.pos.y-p.from.y),left=Math.hypot(dest.x-p.pos.x,dest.y-p.pos.y),f=done/Math.max(1,done+left);
   const w=world(p.pos),bomb=v.obj.children.length>1,y=1.9*(1-f)+.7*f+(bomb?Math.sin(f*Math.PI)*2.2:Math.sin(f*Math.PI)*.4);
   v.obj.position.set(w.x,y,w.z);const d=world(dest),dir=Math.atan2(d.x-w.x,d.z-w.z);v.obj.rotation.y=dir;if(bomb)v.obj.rotation.x+=.25;
   if(v.trail){const back=.35;v.trail.position.set(w.x-Math.sin(dir)*back,y,w.z-Math.cos(dir)*back);v.trail.visible=!settings.reduced;}}
  for(const [id,p] of this.projectiles)if(!live.has(id)){this.dropProjectile(p);this.projectiles.delete(id);}
 }
 /** Short-lived effect not tied to the simulation (build puff, spawn swirl). */
 private burst(x:number,y:number,z:number,color:number,size:number){const s=new T.Sprite(additive('flare',color,.9));s.position.set(x,y,z);s.scale.setScalar(.2);this.dynamic.add(s);this.flashes.push({s,life:.45,max:.45,size});}
 private flashes:{s:T.Sprite;life:number;max:number;size:number}[]=[];
 private dropEffect(e:Effect3D){for(const o of e.objs){o.removeFromParent();if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}else o.material.dispose();}}
 private syncEffects(s:State,settings:Save['settings'],time:number){
  const live=new Set<number>(),list=s.effects.slice(-(settings.reduced?15:settings.quality==='low'?30:80));
  for(const e of list){live.add(e.id);let v=this.effects.get(e.id);const w=world(e),f=1-e.life/e.maxLife;
   if(!v){v={objs:[]};const flat=(map:string,size:number,opacity=.9)=>{const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:fxTexture(map),color:e.color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending}));m.rotation.x=-Math.PI/2;m.position.set(w.x,.12,w.z);m.userData.size=size;m.renderOrder=3;this.dynamic.add(m);v!.objs.push(m);};
    const sprite=(map:string,size:number,y=.8)=>{const sp=new T.Sprite(additive(map,e.color,1));sp.position.set(w.x,y,w.z);sp.userData.size=size;this.dynamic.add(sp);v!.objs.push(sp);};
    const radius=e.size/TD_SCALE;
    if(e.type==='hit')sprite('spark',.9);
    else if(e.type==='death'){sprite('smoke',1.6,.5);sprite('spark',1.1,.9);}
    else if(e.type==='heal'){flat('ring',radius*2);sprite('star',1.2,1.2);}
    else if(e.type==='yarn'){flat('ring',radius*2,1);flat('scorch',radius*1.6,.7);sprite('flare',2.4,.6);}
    else if(e.type==='uia'){flat('rune',radius*2,1);flat('ring',radius*2.2,1);sprite('flare',3,1);}
    else{flat('ring',radius*2);sprite(e.type==='reaction'?'star':'flare',Math.max(1.2,radius*1.2),.7);}
    this.effects.set(e.id,v);}
   for(const o of v.objs){const size=o.userData.size as number,mat=o.material as T.SpriteMaterial|T.MeshBasicMaterial;
    if(o instanceof T.Mesh){const k=size*(.35+f*.75);o.scale.set(k,k,1);o.rotation.z=time*.8;mat.opacity=(1-f)*.95;}
    else{o.scale.setScalar(size*(e.type==='hit'?.6+f*.6:.5+f*.8));mat.opacity=1-f;if(e.type==='death'||e.type==='heal')o.position.y+=.012;}}}
  for(const [id,e] of this.effects)if(!live.has(id)){this.dropEffect(e);this.effects.delete(id);}
  this.flashes=this.flashes.filter(fl=>{fl.life-=1/60;const k=1-fl.life/fl.max;fl.s.scale.setScalar(fl.size*(.3+k));fl.s.material.opacity=1-k;if(fl.life<=0){fl.s.removeFromParent();fl.s.material.dispose();return false;}return true;});
 }
 private syncTraps(s:State){
  const live=new Set<number>();
  for(const t of s.traps){live.add(t.id);if(!this.traps.has(t.id)){const w=world(t),o=prop(this.assets!,t.kind==='box'?'crate_A_big':'barrel');o.scale.setScalar(t.kind==='box'?2.4:2.2);o.position.set(w.x,0,w.z);this.dynamic.add(o);this.traps.set(t.id,o);this.burst(w.x,.5,w.z,0xffe0a0,2);}}
  for(const [id,o] of this.traps)if(!live.has(id)){o.removeFromParent();this.traps.delete(id);}
 }
 /** Range and aim discs lie on the ground; ellipses in the world read as circles on screen. */
 private overlays(s:State,selected:Selection,level:Level){
  const chosen=s.towers.find(t=>t.spot===selected.spot),spot=selected.spot===null?null:level.spots[selected.spot];
  const show=!!spot&&(!!chosen||!!selected.preview);this.range.visible=this.rangeEdge.visible=show;
  if(show&&spot){const r=chosen?stats(chosen,s).range+movementRadius(chosen.kind):CATS[selected.preview!].range+movementRadius(selected.preview!),w=world(spot),y=this.ground(selected.spot!)+.1;
   for(const m of [this.range,this.rangeEdge]){m.position.set(w.x,y,w.z);m.scale.set(r/TD_SCALE,r/(TD_SCALE*Math.sin(TD_PITCH)),1);}}
  this.aim.visible=!!selected.aim;if(selected.aim){const w=world(selected.aim),r=selected.aimRadius||110;this.aim.position.set(w.x,.12,w.z);this.aim.scale.set(r/TD_SCALE,r/(TD_SCALE*Math.sin(TD_PITCH)),1);}
 }
 private drawOverlay(s:State,selected:Selection,level:Level,settings:Save['settings']){
  const c=this.c2;c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.dpr*this.ox,this.dpr*this.oy);
  drawRouteHints(c,s,settings.reduced);
  const chosen=s.towers.find(t=>t.spot===selected.spot);
  if(chosen&&['commander','bard','guardian'].includes(chosen.kind)){const center=level.spots[chosen.spot],range=stats(chosen,s).range;c.save();c.globalAlpha=.6;c.strokeStyle='#aee6d5';c.lineWidth=2;c.setLineDash([6,5]);for(const ally of s.towers){if(ally.id===chosen.id)continue;const to=level.spots[ally.spot];if(Math.hypot(to.x-center.x,to.y-center.y)<=range){c.beginPath();c.moveTo(center.x,center.y-30);c.lineTo(to.x,to.y-30);c.stroke();}}c.restore();}
  if(!settings.reduced)for(const t of s.towers){const p=level.spots[t.spot];drawAura(c,t.kind,p.x,p.y-(this.ground(t.spot)+1.2)*COS*TD_SCALE,s.time,t.shot,t.casts);}
  // Health bars float above each enemy's head.
  for(const e of s.enemies){const d=ENEMIES[e.kind];if(e.hp>=e.maxHp&&!d.boss)continue;const p=position(level.paths[e.path],e.progress),u=this.enemies.get(e.id),lift=((u?.height||1.2)+.35)*COS*TD_SCALE,width=d.boss?54:Math.max(22,d.size*1.6);
   c.fillStyle='#14232bcc';c.beginPath();c.roundRect(p.x-width/2-1.5,p.y-lift-1.5,width+3,7,3);c.fill();c.fillStyle=d.boss?'#e0806a':e.slowTime>0?'#8fd3ef':'#9ccf86';c.beginPath();c.roundRect(p.x-width/2,p.y-lift,width*Math.max(0,e.hp/e.maxHp),4,2);c.fill();
   if(e.armor>0&&e.broken<=0){c.fillStyle='#c9d4dc';c.fillRect(p.x-width/2,p.y-lift+5,Math.min(width,e.armor/40*width),1.5);}}
  for(const e of s.effects)if(e.label){const f=1-e.life/e.maxLife;c.save();c.globalAlpha=Math.min(1,e.life*3);c.font='bold 13px sans-serif';c.textAlign='center';c.strokeStyle='#173038';c.lineWidth=3;c.strokeText(e.label,e.x,e.y-48-f*16);c.fillStyle=e.color;c.fillText(e.label,e.x,e.y-48-f*16);c.restore();}
  this.vfx.draw(c,s,settings);
  if(s.war>0){c.strokeStyle='#e8be6d';c.lineWidth=4;c.strokeRect(3,3,994,594);}
 }
 dispose(){this.clearLevel();for(const m of [this.range,this.rangeEdge,this.aim]){m.geometry.dispose();(m.material as T.Material).dispose();}this.gl.dispose();this.overlay.remove();this.owned.forEach(o=>o.dispose());}
}

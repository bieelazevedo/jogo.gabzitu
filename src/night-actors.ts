import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Actor,fxTexture,type CharacterName,type NightAssets} from './night-assets';
import type {NightClass} from './night-data';
import type {HuntBoss} from './hunt-simulation';
import type {NightEnemy,NightPlayer} from './night-simulation';
import {adventurerRegalia} from './night-regalia';
import {vfxTexture} from './night-vfx-textures';
import {HeroPose} from './night-poses';

const ease=(a:number,b:number,t:number)=>a+(b-a)*Math.min(1,t);
const turn=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*Math.min(1,t);
/** Speed that makes a clip reach `at` (fraction of its length) after `seconds`. */
const fit=(actor:Actor,clip:string,seconds:number,at=1)=>Math.min(3.2,Math.max(.6,actor.duration(clip)*at/Math.max(.05,seconds)));

type HeroLook={model:CharacterName;items:string[];hide?:string[];tint?:number;fur:number;attack:string[];power:string;ultimate:string;utility:string;hex:string};
/** Simulation action ids: 1 attack, 2 power, 3 ultimate, 4 dodge, 5 utility, 6 hex, 7 extra spell. */
const HEROES:Record<NightClass,HeroLook>={
 blade:{model:'Knight',items:['1H_Sword'],fur:0xd99b52,attack:['1H_Melee_Attack_Slice_Diagonal','1H_Melee_Attack_Slice_Horizontal','1H_Melee_Attack_Chop'],power:'2H_Melee_Attack_Spin',ultimate:'1H_Melee_Attack_Jump_Chop',utility:'Block',hex:'1H_Melee_Attack_Stab'},
 astral:{model:'Mage',items:['2H_Staff'],tint:0xd2f7ef,fur:0xe8e4f0,attack:['Spellcast_Shoot'],power:'Spellcast_Long',ultimate:'Spellcast_Summon',utility:'Spellcast_Raise',hex:'Spellcast_Shoot'},
 guardian:{model:'Barbarian',items:['1H_Axe','Barbarian_Round_Shield'],fur:0x9aa3ad,attack:['1H_Melee_Attack_Chop','1H_Melee_Attack_Slice_Horizontal','2H_Melee_Attack_Chop'],power:'1H_Melee_Attack_Jump_Chop',ultimate:'2H_Melee_Attack_Spin',utility:'Blocking',hex:'Taunt'},
 reaver:{model:'Barbarian',items:['1H_Axe','1H_Axe_Offhand'],tint:0xffb0b0,fur:0x8c5f6c,attack:['Dualwield_Melee_Attack_Slice','Dualwield_Melee_Attack_Chop','Dualwield_Melee_Attack_Stab'],power:'Dualwield_Melee_Attack_Chop',ultimate:'2H_Melee_Attack_Spin',utility:'Taunt',hex:'Dualwield_Melee_Attack_Stab'},
 witch:{model:'Mage',items:['1H_Wand','Spellbook_open'],tint:0xbca8ff,fur:0x4b4560,attack:['Spellcast_Shoot'],power:'Spellcast_Long',ultimate:'Spellcast_Summon',utility:'Spellcast_Raise',hex:'Spellcast_Shoot'},
 chaos:{model:'Rogue_Crimson',items:[],fur:0x6b1a24,attack:['Spellcast_Shoot'],power:'Spellcast_Long',ultimate:'Spellcast_Summon',utility:'Spellcast_Raise',hex:'Spellcast_Summon'},
 ranger:{model:'Rogue_Hooded',items:['2H_Crossbow'],tint:0xdaf2c8,fur:0xc49a6c,attack:['2H_Ranged_Shoot'],power:'2H_Ranged_Shoot',ultimate:'Spellcast_Raise',utility:'Dodge_Backward',hex:'Throw'},
};

/** Cat ears and tail keep the Ordem do Novelo identity on top of the human adventurer models. */
export function catFeatures(actor:Actor,fur:number){
 const furMat=new T.MeshStandardMaterial({color:fur,roughness:.8}),inner=new T.MeshStandardMaterial({color:0xd98c96,roughness:.9});actor.materials.push(furMat,inner);
 const ear=new T.ConeGeometry(.2,.42,4),earInner=new T.ConeGeometry(.11,.26,4);
 const head=actor.bone('head');
 for(const side of [-1,1]){const e=new T.Mesh(ear,furMat);e.position.set(side*.33,1.12,-.02);e.rotation.set(-.1,0,-side*.32);const i=new T.Mesh(earInner,inner);i.position.set(0,-.04,.07);e.add(i);head?.add(e);}
 // A compact muzzle and whiskers give the rig a feline profile, including through helmets and hoods.
 const muzzle=new T.MeshStandardMaterial({color:new T.Color(fur).lerp(new T.Color(0xffead1),.68),roughness:.95});
 const ink=new T.MeshStandardMaterial({color:0x25252f,roughness:.7});actor.materials.push(muzzle,ink);
 const detail=new T.Group(),round=new T.SphereGeometry(1,8,6),whisker=new T.CylinderGeometry(.009,.009,.23,4);
 const shapes:T.BufferGeometry[]=[ear,earInner];
 const face=(mat:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{const o=new T.Mesh(round,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);detail.add(o);return o;};
 for(const side of [-1,1]){face(furMat,side*.24,.58,.33,.19,.19,.14);face(muzzle,side*.09,.52,.48,.13,.09,.08);
  for(const angle of [-.2,.16]){const w=new T.Mesh(whisker,muzzle);w.position.set(side*.27,.54+angle*.18,.5);w.rotation.z=side*(Math.PI/2+angle);detail.add(w);}}
 face(ink,0,.57,.56,.055,.036,.025);face(ink,0,.475,.535,.035,.012,.015);
 // Merge rigid face details by material so whiskers do not add one draw call each.
 for(const mat of [furMat,muzzle,ink]){const pieces:T.BufferGeometry[]=[];detail.traverse(o=>{if(o instanceof T.Mesh&&o.material===mat){o.updateMatrix();pieces.push(o.geometry.clone().applyMatrix4(o.matrix));}});const g=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());if(g){head?.add(new T.Mesh(g,mat));shapes.push(g);}}
 round.dispose();whisker.dispose();
 // A single curved tube reads as a tail; it hangs from the actor root because hip bone axes differ per rig.
 const curve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(0,.08,-.3),new T.Vector3(0,.4,-.5),new T.Vector3(0,.75,-.42),new T.Vector3(0,.92,-.2)]);
 const tube=new T.TubeGeometry(curve,14,.085,6,false),tip=new T.SphereGeometry(.1,8,6);
 const base=new T.Group();base.position.set(0,.88,-.3);actor.root.add(base);const tailMesh=new T.Mesh(tube,furMat);const end=new T.Mesh(tip,furMat);end.position.set(0,.92,-.2);base.add(tailMesh,end);
 const tail=[base];
 return {tail,geometries:[...shapes,tube,tip]};
}

export class HeroActor{
 readonly actor:Actor;readonly look:HeroLook;private tail:T.Object3D[];private geometries:T.BufferGeometry[];
 private lastAction=0;private lastCombo=0;private lastTime=0;private hitUntil=0;private lastHit=0;
 private pose:HeroPose;
 constructor(assets:NightAssets,classId:NightClass,parent:T.Object3D){
  this.look=HEROES[classId];const outfit=classId==='chaos'?'ScarletSorceress':classId==='guardian'?'ForgottenKnight':classId==='witch'?'Female_Peasant':classId==='astral'?'Male_Peasant':classId==='ranger'?'Female_Ranger':'Male_Ranger';
  this.actor=new Actor(assets,this.look.model,{items:this.look.items,hide:this.look.hide,tint:this.look.tint,modern:outfit,scale:assets.modern?1.55:1});
  this.pose=new HeroPose(this.actor,classId);
  ({tail:this.tail,geometries:this.geometries}=this.actor.modern&&!['guardian','chaos'].includes(classId)?adventurerRegalia(this.actor,assets,classId):{tail:[],geometries:[]});
  if(this.actor.modern&&classId!=='guardian')for(const item of this.look.items){const left=/Offhand|Shield|Spellbook/.test(item);const name=({'1H_Sword':'weapon-Sword_Bronze','1H_Axe':'weapon-Axe_Bronze','1H_Axe_Offhand':'weapon-Axe_Bronze','Barbarian_Round_Shield':'weapon-Shield_Wooden','2H_Staff':'weapon-PriestessStaff','1H_Wand':'weapon-SkullStaff','Spellbook_open':'spellbook_open','2H_Crossbow':'weapon-RecurveBow'} as Record<string,string>)[item]||item;this.actor.hold(name,left?'handslot.l':'handslot.r',o=>{const authored=/Priestess|Skull|Recurve/.test(name);o.scale.setScalar(authored?1:.65);o.rotation.set(authored?0:Math.PI/2,0,left?Math.PI:0);});}
  if(classId==='chaos')this.chaosLook();parent.add(this.actor.root);this.actor.play('Idle');
 }
 get root(){return this.actor.root;}
 /** Carmesim: hands that burn with chaos light (Kenney CC0 glow texture). */
 private chaosLook(){
  for(const slot of ['handslot.l','handslot.r']){const group=new T.Group();this.root.add(group);this.handAnchors.push({group,slot});
   for(let i=0;i<10;i++){const smoke=i>=6,core=i===1;const glow=new T.Sprite(new T.SpriteMaterial({map:vfxTexture(smoke?'smoke':i>1?'spark':'glow'),color:smoke?0x851028:core?0xffb3aa:0xff1538,transparent:true,opacity:smoke?.35:.85,depthWrite:false,blending:smoke?T.NormalBlending:T.AdditiveBlending,toneMapped:false}));glow.userData.layer=i;group.add(glow);this.hands.push(glow);}}
 }
 private hands:T.Sprite[]=[];
 private handAnchors:{group:T.Group;slot:string}[]=[];
 handPosition(side:'l'|'r',out=new T.Vector3()){this.root.updateMatrixWorld(true);const bone=this.actor.bone('handslot.'+side);return bone?bone.getWorldPosition(out):out.copy(this.root.position).add(new T.Vector3(0,1.45,0));}
 private clipFor(p:NightPlayer){const l=this.look;switch(p.action){case 1:return l.attack[Math.max(0,p.combo-1)%l.attack.length];case 2:return l.power;case 3:return l.ultimate;case 4:return 'Dodge_Forward';case 5:return l.utility;case 6:return l.hex;case 7:return 'Spellcast_Long';default:return '';}}
 update(p:NightPlayer,dt:number,time:number,y:number){
  this.pose.clear();
  const r=this.actor.root;r.position.x=ease(r.position.x,p.x,dt*20);r.position.z=ease(r.position.z,p.z,dt*20);r.position.y=ease(r.position.y,y,dt*18);r.rotation.y=turn(r.rotation.y,p.facing,dt*15);
  const restarted=p.action!==this.lastAction||p.combo!==this.lastCombo||p.actionTime<this.lastTime;
  if(p.hit>0&&this.lastHit<=0&&p.action===0)this.hitUntil=time+.35;this.lastHit=p.hit;
  if(p.hp<=0)this.actor.play('Death_A',{loop:false,fade:.2});
  else if(p.action>0){const clip=this.clipFor(p),hold=p.action===5&&/Block/.test(clip);this.actor.play(clip,{loop:hold,fade:.08,restart:restarted,speed:hold?1:fit(this.actor,clip,p.duration||.5,p.action===4?.9:.8)});}
  else if(time<this.hitUntil)this.actor.play('Hit_A',{loop:false,fade:.06});
  else if(y>.2)this.actor.play('Jump_Idle',{fade:.1});
  else if(p.moving>.1){const running=p.running>0||p.moving>.6;this.actor.play(running?'Running_A':'Walking_A',{fade:.18,speed:running?(p.running?1.25:1)*Math.max(.7,p.moving):.6+p.moving});}
  else this.actor.play('Idle',{fade:.25});
  this.lastAction=p.action;this.lastCombo=p.combo;this.lastTime=p.actionTime;
  const tail=this.tail[0];if(tail){tail.rotation.y=Math.sin(time*3.2)*.35*(1+p.moving*.6);tail.rotation.x=-.1+Math.sin(time*2.1)*.06-p.moving*.25;}
  // A brief red pulse on the first frames of a hit only; a lingering tint reads as a pink character.
  const flash=p.hit>.18;this.actor.flash(flash?0xff3b30:p.shield>0?0x1d6c70:0,flash?.18:p.shield>0?.18:0);
  this.actor.update(dt);
  this.pose.update(p.hp>0&&p.action===0&&p.moving<.1&&y<.2&&time>=this.hitUntil,dt,time);
  if(this.handAnchors.length){this.root.updateMatrixWorld(true);for(const {group,slot} of this.handAnchors){const bone=this.actor.bone(slot);if(bone){const v=bone.getWorldPosition(new T.Vector3());group.position.copy(this.root.worldToLocal(v));}group.visible=p.hp>0;}
   this.hands.forEach((h,i)=>{const layer=h.userData.layer as number,channel=p.action>0?1.5:.65,a=time*(layer>=6?.8:2.4)+i*2.4,r=layer<2?0:layer>=6?.18:.12;h.position.set(Math.sin(a)*r,Math.cos(a*1.3)*r+(layer>=6?.12:0),Math.cos(a)*r);h.scale.setScalar((layer===0?.65:layer===1?.15:layer>=6?.6:.075)*channel*(1+Math.sin(time*7+i)*.15));h.material.opacity=(layer>=6?.22:.8)*(p.action>0?1:.6);h.material.rotation=a*.3;});}
 }
 dispose(){this.hands.forEach(h=>h.material.dispose());this.actor.dispose();this.geometries.forEach(g=>g.dispose());}
}

const BOSS_FORMS:{model:CharacterName;scale:number;tint:number;right:string;left?:string;eyes:number}[]=[
 {model:'Skeleton_Warrior',scale:2.1,tint:0xd8c8e0,right:'Skeleton_Axe',left:'Skeleton_Shield_Large_A',eyes:0xff8a3d},
 {model:'Skeleton_Minion',scale:2.25,tint:0xe2b49a,right:'Skeleton_Blade',left:'Skeleton_Blade',eyes:0xff5a2a},
 {model:'Skeleton_Mage',scale:2.4,tint:0xa99ae6,right:'Skeleton_Staff',eyes:0xb27bff},
];
const BOSS_ATTACK:Record<number,string>={1:'2H_Melee_Attack_Slice',2:'1H_Melee_Attack_Jump_Chop',3:'Spellcast_Summon',4:'Taunt',5:'2H_Melee_Attack_Spin'};
export class BossActor{
 readonly actor:Actor;private lastStage=-1;private lastAttack=0;private previous=new T.Vector3();private glow:T.PointLight;
 constructor(assets:NightAssets,stage:number,parent:T.Object3D){
  const form=BOSS_FORMS[Math.max(0,Math.min(2,stage-1))];this.actor=new Actor(assets,form.model,{tint:form.tint,scale:form.scale});
  this.actor.hold(form.right,'handslot.r');if(form.left)this.actor.hold(form.left,'handslot.l');
  this.glow=new T.PointLight(form.eyes,6,9,1.6);this.glow.position.set(0,5.2,1);this.actor.root.add(this.glow);
  parent.add(this.actor.root);this.actor.play('Idle_Combat');
 }
 get root(){return this.actor.root;}
 update(b:HuntBoss,dt:number,time:number,status:string){
  const r=this.actor.root;this.previous.copy(r.position);r.position.x=ease(r.position.x,b.x,dt*(b.attack===4?12:7));r.position.z=ease(r.position.z,b.z,dt*8);r.rotation.y=turn(r.rotation.y,b.angle,dt*5);
  const speed=this.previous.distanceTo(r.position)/Math.max(dt,.001);const restart=b.stage!==this.lastStage&&b.stage===1||b.attack!==this.lastAttack&&b.stage===1;
  if(status==='won')this.actor.play('Death_A',{loop:false,fade:.3});
  else if(b.stage===4)this.actor.play('Hit_B',{speed:.35,fade:.15});
  else if(b.stage===1){const clip=BOSS_ATTACK[b.attack]||'2H_Melee_Attack_Chop';this.actor.play(clip,{loop:false,fade:.12,restart,speed:fit(this.actor,clip,b.total,.55)});}
  else if(b.stage===2&&b.attack===4)this.actor.play('Running_C',{fade:.05,speed:1.6});
  else if(b.stage===2){}
  else if(speed>.6)this.actor.play('Walking_D_Skeletons',{fade:.2,speed:Math.min(1.8,.5+speed*.25)});
  else this.actor.play('Idle_Combat',{fade:.3});
  this.lastStage=b.stage;this.lastAttack=b.attack;
  this.glow.intensity=5+Math.sin(time*3)*1.5+(b.stage===1?6:0);
  this.actor.flash(b.hit>0?0xffc890:b.phase===2?0x5a1030:0,b.hit>0?.6:b.phase===2?.25:0);
  this.actor.update(dt);
 }
 dispose(){this.glow.dispose();this.actor.dispose();}
}

const ENEMIES:{model:CharacterName;right:string;left?:string;scale:number;attack:string;wind:number}[]=[
 {model:'Skeleton_Minion',right:'Skeleton_Blade',scale:1,attack:'1H_Melee_Attack_Chop',wind:.7},
 {model:'Skeleton_Rogue',right:'Skeleton_Crossbow',scale:1,attack:'2H_Ranged_Shoot',wind:.7},
 {model:'Skeleton_Mage',right:'Skeleton_Staff',scale:1,attack:'Spellcast_Shoot',wind:1.05},
 {model:'Skeleton_Warrior',right:'Skeleton_Axe',left:'Skeleton_Shield_Large_A',scale:1.35,attack:'2H_Melee_Attack_Chop',wind:1},
];
export class EnemyActor{
 readonly actor:Actor;private kind:typeof ENEMIES[number];private lastWind=0;private lastHit=0;private hitUntil=0;private charge:T.Sprite;
 constructor(assets:NightAssets,e:NightEnemy,parent:T.Object3D){
  this.kind=ENEMIES[e.kind]||ENEMIES[0];this.actor=new Actor(assets,this.kind.model,{scale:this.kind.scale});this.actor.hold(this.kind.right,'handslot.r');if(this.kind.left)this.actor.hold(this.kind.left,'handslot.l');
  this.actor.root.position.set(e.x,0,e.z);parent.add(this.actor.root);this.actor.play('Idle');
  // Wind-up glow in the weapon hand: the attack is readable before it lands.
  this.charge=new T.Sprite(new T.SpriteMaterial({map:fxTexture('glow'),color:[0xff6a50,0xffb070,0xc38aff,0xffb55f][e.kind]??0xff6a50,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.charge.visible=false;this.actor.bone('handslot.r')?.add(this.charge);
 }
 get root(){return this.actor.root;}
 update(e:NightEnemy,dt:number,time:number){
  const r=this.actor.root;r.position.x=ease(r.position.x,e.x,dt*18);r.position.z=ease(r.position.z,e.z,dt*18);r.rotation.y=turn(r.rotation.y,e.facing,dt*12);
  if(e.hit>0&&this.lastHit<=0)this.hitUntil=time+.3;this.lastHit=e.hit;
  if(e.hp<=0)this.actor.play('Death_A',{loop:false,fade:.12});
  else if(e.wind>0)this.actor.play(this.kind.attack,{loop:false,fade:.1,restart:this.lastWind<=0,speed:fit(this.actor,this.kind.attack,this.kind.wind,.55)});
  else if(e.recovery>0){}
  else if(e.evade>0)this.actor.play(e.id%2?'Dodge_Right':'Dodge_Left',{loop:false,fade:.06,speed:1.6});
  else if(time<this.hitUntil)this.actor.play('Hit_A',{loop:false,fade:.05});
  else if(e.moving>.1)this.actor.play(e.aggro>0?'Running_C':'Walking_D_Skeletons',{fade:.2,speed:(e.slow>0?.55:1)*Math.max(.6,e.moving)});
  else this.actor.play(e.aggro>0?'Idle_Combat':'Idle',{fade:.3});
  this.lastWind=e.wind;this.charge.visible=e.hp>0&&e.wind>0;if(this.charge.visible){const k=1-e.wind/this.kind.wind;this.charge.scale.setScalar((.4+k*1.3)*(1+Math.sin(time*30)*.08));}
  this.actor.flash(e.hit>0?0xffb08a:e.slow>0?0x2d4f9c:0,e.hit>0?.45:e.slow>0?.3:0);
  this.actor.update(dt);
 }
 dispose(){this.charge.material.dispose();this.actor.dispose();}
}

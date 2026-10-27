import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {NIGHT_ZONES,NIGHT_PORTALS,NIGHT_SPRINGS,NIGHT_OBSTACLES,NIGHT_CAMPS} from './night-data';
import type {NightAssets} from './night-assets';
import {EnemyActor} from './night-actors';
import {fxTexture,prop} from './night-assets';
import {NIGHT_RELICS} from './night-data';
import {dressNightWorld} from './night-layout';
import type {NightState,NightEnemy} from './night-simulation';
/** Baked architecture + instanced foliage. No per-frame terrain generation. */
export class NightWorld{
 readonly root=new T.Group();private geometries:T.BufferGeometry[]=[];private materials:T.Material[]=[];private textures:T.Texture[]=[];private enemies=new Map<number,T.Group>();private actors=new Map<number,EnemyActor>();private instanced:T.InstancedMesh[]=[];private dress?:ReturnType<typeof dressNightWorld>;private relics:T.Group[]=[];private barBack=new T.SpriteMaterial({color:0x10141c,transparent:true,opacity:.75,depthWrite:false});private barFill=new T.SpriteMaterial({color:0xe2546a,depthWrite:false});private telegraphs=new Map<number,T.Mesh>();private portalRings:T.Mesh[]=[];private springRings:T.Mesh[]=[];private markers:T.Group[]=[];private motes:T.Points;private flames:T.Mesh[]=[];private banners:T.Mesh[]=[];private orrery=new T.Group();
 private box=new T.BoxGeometry(1,1,1);private sphere=new T.SphereGeometry(1,10,7);private cone=new T.ConeGeometry(1,1,7);
 private stone=this.mat(0x526476);private edge=this.mat(0x263648);private roof=this.mat(0x30324b);private gold=this.mat(0xc5ab71,.3);private cyan=this.mat(0x6de5dd,.2,0x358e9d);private bark=this.mat(0x2e3542);private leaves=this.mat(0x284f53);private bone=this.mat(0xc3bec0);private dark=this.mat(0x25283d);private red=this.mat(0xa55b78,.2,0x51203d);
 constructor(private assets:NightAssets|null=null){this.geometries.push(this.box,this.sphere,this.cone);const architecture=new T.Group();this.root.add(architecture);if(!assets){this.terrain();const moonMaterial=new T.MeshBasicMaterial({color:0xc6e2dd});this.materials.push(moonMaterial);this.mesh(new T.SphereGeometry(4,24,16),moonMaterial,this.root,-15,26,-62);}

  // The sanctuary's floating crystal stays in both modes: it is the gathering beacon.
  if(!assets){const fountain=this.mesh(new T.TorusGeometry(1.5,.25,8,32),this.gold,architecture,0,.5,27);fountain.rotation.x=Math.PI/2;this.mesh(new T.OctahedronGeometry(.8),this.cyan,architecture,0,1.8,27);}
  if(assets){this.dress=dressNightWorld(assets,this.root);this.instanced=this.dress.meshes;}else this.legacyArchitecture(architecture);
  for(const p of NIGHT_PORTALS){const ring=assets?this.mesh(new T.PlaneGeometry(3,3),this.vortex(),this.root,p.x,1.7,p.z):this.mesh(new T.TorusGeometry(1.3,.12,6,40),this.cyan,this.root,p.x,1.5,p.z);ring.rotation.y=Math.atan2(-p.x,-p.z);this.portalRings.push(ring);if(!assets)for(const side of [-1,1])this.block(architecture,this.stone,p.x+side*1.7,1.4,p.z,.5,2.8,.5);}
  // Healing springs: with models, a glowing pool (Kenney 'magic' texture) inside the ring of rocks.
  for(const p of NIGHT_SPRINGS){if(assets){const water=this.mesh(new T.PlaneGeometry(4,4),this.pool(),this.root,p.x,.12,p.z);water.rotation.x=-Math.PI/2;this.springRings.push(water);continue;}this.mesh(new T.CylinderGeometry(1.6,1.8,.6,20),this.stone,architecture,p.x,.15,p.z);const water=this.mesh(new T.CircleGeometry(1.45,24),this.cyan,this.root,p.x,.48,p.z);water.rotation.x=-Math.PI/2;this.springRings.push(water);}
  if(!assets)this.dressWorld(architecture,false);
  // Quest relics: a candle shrine (KayKit Halloween) under a golden shaft of light, one per moon that has a relic quest.
  if(assets)this.relics=NIGHT_RELICS.map(r=>{const g=new T.Group();g.position.set(r.x,0,r.z);const shrine=prop(assets,'shrine_candles');shrine.scale.setScalar(1.5);g.add(shrine);const beam=new T.Sprite(new T.SpriteMaterial({map:fxTexture('glow'),color:0xffd27a,transparent:true,opacity:.75,depthWrite:false,blending:T.AdditiveBlending}));beam.scale.set(2.2,12,1);beam.position.y=6;beam.name='beam';this.materials.push(beam.material);g.add(beam);g.visible=false;this.root.add(g);return g;});this.bake(architecture);
  const g=new T.BufferGeometry(),points=new Float32Array(210*3);for(let i=0;i<210;i++){points[i*3]=Math.sin(i*9.35)*48;points[i*3+1]=.5+(i%9)*.45;points[i*3+2]=Math.cos(i*14.7)*48;}g.setAttribute('position',new T.BufferAttribute(points,3));this.geometries.push(g);const m=new T.PointsMaterial({size:.09,color:0x96e4cc,transparent:true,opacity:.65,depthWrite:false});this.materials.push(m);this.motes=new T.Points(g,m);this.root.add(this.motes);
 }
 /** Original primitive architecture, used when the model files cannot be loaded. */
 private pool(){const m=new T.MeshBasicMaterial({map:fxTexture('magic'),color:0x6fe8d8,transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});this.materials.push(m);return m;}
 private vortex(){const m=new T.MeshBasicMaterial({map:fxTexture('twirl'),color:0x7fe9ff,transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});this.materials.push(m);return m;}
 private legacyArchitecture(architecture:T.Group){
  // Sanctuary: concentric steps, protected fire and feline arches.
  for(let j=0;j<3;j++)this.mesh(new T.CylinderGeometry(6-j*.65,6.2-j*.65,.22,48),this.stone,architecture,0,-.04+j*.15,27);
  for(const x of [-6,6]){this.block(architecture,this.stone,x,2.6,25,1,5.2,1);this.mesh(new T.ConeGeometry(.8,1.5,4),this.gold,architecture,x,5.7,25);}this.mesh(new T.TorusGeometry(6,.4,6,24,Math.PI),this.stone,architecture,0,2.6,25);
  // Ruined village has readable silhouettes, lanes and open courtyards.
  for(const [x,z,w]of [[21,4,5],[34,13,5],[30,-3,4]]){this.block(architecture,this.stone,x,1.6,z,w,3.2,w);const r=this.mesh(new T.ConeGeometry(w*.9,3,4),this.roof,architecture,x,4.5,z);r.rotation.y=Math.PI/4;this.block(architecture,this.edge,x,.9,z+w/2+.03,1.2,1.8,.08);for(const sign of [-1,1])this.block(architecture,this.gold,x+sign*1.3,2,z+w/2+.05,.65,.75,.07);this.block(architecture,this.edge,x+w/2,3,z,.5,6,.7);}
  // Crypt ribs, tombs and a broken cat-shaped gate.
  for(let i=0;i<5;i++){const z=-36+i*4;for(const x of [-31,-17]){this.block(architecture,this.stone,x,2,z,.8,4,.8);this.mesh(new T.ConeGeometry(.65,1.1,4),this.edge,architecture,x,4.4,z);}if(i%2===0){const arch=this.mesh(new T.TorusGeometry(7,.3,5,18,Math.PI),this.stone,architecture,-24,2,z);arch.scale.y=.65;}}
  for(let i=0;i<9;i++){const x=-36+(i%3)*5,z=-37+Math.floor(i/3)*5;this.block(architecture,this.edge,x,.3,z,1.5,.6,2.7);this.block(architecture,this.stone,x,1,z-1.3,1,.9,.3);}
  // Crown district: smashed colonnade and gold astronomical machinery.
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,x=25+Math.sin(a)*10,z=-29+Math.cos(a)*10;this.mesh(new T.CylinderGeometry(.5,.7,3+i%3,7),this.stone,architecture,x,(3+i%3)/2,z);this.block(architecture,this.gold,x,3+i%3,z,1.5,.25,1.5);}const crown=this.mesh(new T.TorusGeometry(4,.16,6,48),this.gold,architecture,25,5,-29);crown.rotation.x=.65;this.mesh(new T.OctahedronGeometry(1.7),this.cyan,architecture,25,3,-29);
  for(const o of NIGHT_OBSTACLES.filter(o=>Math.abs(o.x)>40||o.x<0&&o.z>0)){this.mesh(new T.CylinderGeometry(.35,.65,4,7),this.bark,architecture,o.x,2,o.z);for(let j=0;j<3;j++)this.mesh(this.cone,this.leaves,architecture,o.x,4+j*1.3,o.z,2.5-j*.5,3,2.5-j*.5);}
  // Grass and forest perimeter share only a handful of draw calls.
  const pine=new T.InstancedMesh(this.cone,this.leaves,180),trunks=new T.InstancedMesh(this.box,this.bark,180),dummy=new T.Object3D();let n=0;
  for(let i=0;i<260&&n<180;i++){const x=Math.sin(i*18.731)*53,z=Math.cos(i*7.347)*53;if(Math.abs(x)<47&&Math.abs(z)<46)continue;dummy.position.set(x,3.5+i%3,z);dummy.scale.set(2+i%2,6+i%4,2+i%2);dummy.rotation.y=i;dummy.updateMatrix();pine.setMatrixAt(n,dummy.matrix);dummy.position.y=1.5;dummy.scale.set(.6,3,.6);dummy.updateMatrix();trunks.setMatrixAt(n,dummy.matrix);n++;}pine.count=trunks.count=n;this.root.add(pine,trunks);
  const blades=new T.InstancedMesh(new T.ConeGeometry(.12,.6,3),this.leaves,700);this.geometries.push(blades.geometry);for(let i=0;i<700;i++){const x=Math.sin(i*13.79)*47,z=Math.cos(i*6.13)*47;dummy.position.set(x,.1,z);dummy.scale.setScalar(.6+(i%4)*.2);dummy.rotation.set(0,i,0);dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix);}this.root.add(blades);
 }
 /** Environmental storytelling stays outside combat lanes; static props bake by material. */
 private dressWorld(a:T.Group,models=false){
  const moss=this.mat(0x52705b),pale=this.mat(0x7d8991),warm=this.mat(0xd4a45e,.1,0x8a4b16),cloth=this.mat(0x436e79),violet=this.mat(0x775b93,.1,0x261d4a);
  // Layered mountains and a distant ruined citadel give the horizon depth.
  if(!models)for(let i=0;i<36;i++){const angle=i/36*Math.PI*2,r=67+i%3*5,h=9+(i*7%17);const rock=this.mesh(new T.ConeGeometry(7+i%4,h,5),i%2?this.edge:this.dark,a,Math.sin(angle)*r,h/2-3,Math.cos(angle)*r);rock.rotation.y=i*.7;}
  if(!models)for(let i=-2;i<=2;i++){const x=i*7;this.block(a,this.edge,x,7,-64,4,14+Math.abs(i)*2,5);this.mesh(new T.ConeGeometry(3,5,5),this.roof,a,x,16+Math.abs(i),-64);for(let j=0;j<3;j++)this.block(a,warm,x-.7+j*.7,8,-61.45,.25,1.2,.04);}
  // District emblems on the ground retain open, navigable combat areas.
  for(const zone of NIGHT_ZONES){const tint=new T.MeshBasicMaterial({color:zone.color,transparent:true,opacity:.25,depthWrite:false});this.materials.push(tint);const seal=this.mesh(new T.RingGeometry(7.6,8,48),tint,a,zone.x,-.1,zone.z);seal.rotation.x=-Math.PI/2;}
  // Surface mosaics and broken paving: no raised collision surfaces.
  const tile=new T.BoxGeometry(.8,.06,.65);this.geometries.push(tile);const paving=new T.InstancedMesh(tile,pale,460),d=new T.Object3D();let count=0;
  const paths=[[0,27,-29,14],[-29,14,-24,-25],[-24,-25,25,-27],[25,-27,28,8],[28,8,0,27],[0,27,-24,-25]];
  for(const [x,z,tx,tz]of paths){const length=Math.hypot(tx-x,tz-z),nx=-(tz-z)/length,nz=(tx-x)/length;for(let j=0;j<Math.floor(length);j++)for(let k=-1;k<=1;k++){if((j*7+k+9)%5===0||count===460)continue;const t=j/length;d.position.set(x+(tx-x)*t+nx*k*.85,-.09,z+(tz-z)*t+nz*k*.85);d.rotation.set(0,Math.atan2(tx-x,tz-z)+Math.sin(j)*.08,0);d.scale.set(1,.6,1);d.updateMatrix();paving.setMatrixAt(count++,d.matrix);}}
  paving.count=count;this.root.add(paving);
  // Sanctuary mosaic, hanging pennants and warm lanterns on existing columns.
  if(!models)for(let i=0;i<20;i++){const t=i/20*Math.PI*2;const rune=this.block(a,this.gold,Math.sin(t)*4.5,.28,27+Math.cos(t)*4.5,.12,.035,.55);rune.rotation.y=t;}
  for(const x of [-6,6]){this.block(a,this.gold,x,4.4,25,2,.12,.12);const flag=this.mesh(new T.PlaneGeometry(1.1,1.8,1,5),cloth,this.root,x,3.4,25.2);(cloth as T.MeshStandardMaterial).side=T.DoubleSide;this.banners.push(flag);this.lantern(a,x,2,26,warm);}
  // Architectural trim and shutters follow the existing solid houses.
  if(!models)for(const [x,z,w]of [[21,4,5],[34,13,5],[30,-3,4]]){
   for(const side of [-1,1]){this.block(a,this.bark,x+side*(w/2-.15),1.6,z+w/2+.05,.18,3.2,.16);this.block(a,this.bark,x+side*1.3,2,z+w/2+.1,.9,.1,.12);for(let j=0;j<3;j++)this.block(a,this.bark,x+side*1.3+(j-1)*.2,2,z+w/2+.12,.04,.8,.08);}
   this.block(a,this.bark,x,2.95,z+w/2+.06,w,.18,.15);for(let j=0;j<4;j++){const beam=this.block(a,this.bark,x,3.4+j*.4,z+w/2-j*.4,w-j*.8,.1,.1);beam.rotation.z=.015;}
   this.lantern(a,x-1,1.8,z+w/2+.25,warm);
   for(let j=0;j<8;j++){const ivy=this.mesh(this.sphere,moss,a,x-w/2-.04,1+j*.28,z+(j%3)*.24,.23,.28,.13);ivy.rotation.y=j;}
  }
  // Forest roots and mushrooms are attached to existing obstacle footprints.
  for(const o of NIGHT_OBSTACLES.filter(o=>o.x<0&&o.z>0)){
   if(!models)for(let j=0;j<5;j++){const t=j*1.256;const root=this.block(a,this.bark,o.x+Math.sin(t)*.6,.12,o.z+Math.cos(t)*.6,.2,.22,1.3);root.rotation.y=t;}
   for(let j=0;j<4;j++){const x=o.x+Math.sin(j*2)*1.2,z=o.z+Math.cos(j*2)*1.2;this.block(a,this.bone,x,.18,z,.07,.36,.07);this.mesh(this.sphere,j%2?this.red:violet,a,x,.38,z,.24,.11,.24);}
  }
  // Crypt inscriptions and clustered candles on tombs, never in the routes.
  if(!models)for(let i=0;i<9;i++){const x=-36+(i%3)*5,z=-37+Math.floor(i/3)*5;for(let k=0;k<3;k++)this.block(a,this.gold,x,1.12-k*.17,z-1.12,.4-k*.07,.035,.02);this.lantern(a,x+.4,.65,z,this.cyan);}
  // Rotating astronomical rings frame the northern landmark, above combat height.
  this.orrery.position.set(25,6,-29);this.root.add(this.orrery);for(let i=0;i<3;i++){const ring=this.mesh(new T.TorusGeometry(3.2+i*.55,.07,5,48),i===1?this.cyan:this.gold,this.orrery);ring.rotation.set(.6+i*.65,i*.8,0);}
  for(let i=0;i<7;i++){const t=i/7*Math.PI*2;this.mesh(new T.ConeGeometry(.35,1.5,4),this.gold,a,25+Math.sin(t)*4,7.5,-29+Math.cos(t)*4);}
  // Healing pools: stone lips and a translucent surface rather than a solid disc.
  for(const p of NIGHT_SPRINGS){for(let i=0;i<12;i++){const t=i/12*Math.PI*2;const b=this.block(a,pale,p.x+Math.sin(t)*1.6,.4,p.z+Math.cos(t)*1.6,.65,.22,.32);b.rotation.y=t;}for(let i=0;i<3;i++){const ring=this.mesh(new T.TorusGeometry(.4+i*.35,.018,4,28),this.cyan,this.root,p.x,.5+i*.002,p.z);ring.rotation.x=-Math.PI/2;}}
 }
 private lantern(parent:T.Group,x:number,y:number,z:number,material:T.Material){
  this.block(parent,this.edge,x,y,z,.32,.5,.32);const flame=this.mesh(this.sphere,material,this.root,x,y+.18,z,.13,.22,.13);this.flames.push(flame);this.mesh(new T.ConeGeometry(.27,.18,4),this.gold,parent,x,y+.48,z);
 }
 private mat(color:number,metalness=0,emissive=0){const m=new T.MeshStandardMaterial({color,roughness:.85,metalness,emissive,emissiveIntensity:.5});this.materials.push(m);return m;}
 private mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){if(!this.geometries.includes(g))this.geometries.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
 private block(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){return this.mesh(this.box,m,parent,x,y,z,w,h,d);}
 private bake(group:T.Group){group.updateMatrixWorld(true);const parts=new Map<T.Material,T.BufferGeometry[]>();group.traverse(o=>{if(o instanceof T.Mesh){const m=o.material as T.Material,list=parts.get(m)||[];list.push((o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld));parts.set(m,list);}});for(const [m,list]of parts){const g=mergeGeometries(list);list.forEach(g=>g.dispose());if(g)this.mesh(g,m,this.root);}group.removeFromParent();}
 private terrain(){const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d')!;ctx.fillStyle='#263f4a';ctx.fillRect(0,0,1024,1024);for(const z of NIGHT_ZONES){const x=(z.x+52)/104*1024,y=(z.z+52)/104*1024,r=z.r/104*1024,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#'+z.color.toString(16).padStart(6,'0'));g.addColorStop(1,'#263f4a00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}ctx.lineCap='round';for(const path of [[0,27,-29,14,-24,-25,25,-27,28,8,0,27],[0,27,28,8],[0,27,-24,-25]]){for(const [width,color]of [[50,'#222d3c'],[36,'#657078'],[29,'#74797b']] as const){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();for(let i=0;i<path.length;i+=2){const x=(path[i]+52)/104*1024,y=(path[i+1]+52)/104*1024;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}}for(let i=0;i<14000;i++){const x=(Math.sin(i*17.57)+1)*512,y=(Math.cos(i*3.991)+1)*512;ctx.fillStyle=i%3?'#102f3840':'#c3c7ab28';ctx.fillRect(x,y,1+i%3,1+i%2);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;this.textures.push(t);const m=this.mat(0xffffff);m.map=t;const plane=this.mesh(new T.PlaneGeometry(104,104),m,this.root,0,-.17);plane.rotation.x=-Math.PI/2;}
 private creature(e:NightEnemy){if(this.assets)return this.skeleton(e,this.assets);const root=new T.Group(),body=new T.Group();root.add(body);root.position.set(e.x,0,e.z);body.name='body';const fur=e.kind===0?this.dark:e.kind===1?this.bone:e.kind===3?this.stone:this.red;
 this.mesh(this.sphere,fur,body,0,.85,0,.48,.65,.35);this.mesh(new T.CylinderGeometry(.32,.58,.7,7),e.kind===1?this.leaves:this.roof,body,0,.65,0);const head=this.mesh(this.sphere,fur,body,0,1.52,.14,.4,.4,.37);head.name='head';this.mesh(this.sphere,this.bone,body,0,1.35,.45,.25,.16,.22);
 for(const x of [-.3,.3]){this.mesh(this.cone,fur,body,x,1.93,.1,.19,.5,.18);this.mesh(this.sphere,this.cyan,body,x*.55,1.58,.48,.06);const leg=new T.Group();leg.position.set(x,.55,0);this.mesh(this.box,fur,leg,0,-.2,0,.19,.6,.21);this.mesh(this.sphere,this.dark,leg,0,-.43,.1,.17,.13,.24);body.add(leg);leg.name=x<0?'left':'right';const arm=new T.Group();arm.position.set(x*1.75,1.3,0);this.mesh(this.box,fur,arm,0,-.25,0,.17,.55,.18);this.mesh(this.sphere,this.bone,arm,0,-.55,0,.13);body.add(arm);arm.name=x<0?'armL':'armR';}
 const weapon=body.getObjectByName('armR')!;if(e.kind===2){this.mesh(this.cone,this.roof,body,0,2.02,.1,.62,.8,.62);this.block(weapon,this.gold,0,-.15,.1,.07,1.7,.07);this.mesh(new T.OctahedronGeometry(.22),this.red,weapon,0,.8,.1);}
 else if(e.kind===1){const bow=this.mesh(new T.TorusGeometry(.47,.04,5,18,Math.PI),this.gold,body.getObjectByName('armL')!,0,-.4,.1);bow.rotation.z=-Math.PI/2;}
 else{this.block(weapon,this.gold,0,-.5,.15,.1,.9,.1);this.block(weapon,this.bone,0,-.95,.15,e.kind===3?.75:.3,.4,.17);}
 if(e.kind===3){body.scale.setScalar(1.4);for(const x of [-.6,.6])this.mesh(this.sphere,this.gold,body,x,1.4,0,.32,.18,.28);this.mesh(new T.ConeGeometry(.5,.45,5),this.gold,body,0,1.97,.1);}
 this.root.add(root);this.enemies.set(e.id,root);this.decorate(e,root);return root;}
 /** KayKit skeleton with the same health bar and attack telegraph as the primitive creature. */
 private skeleton(e:NightEnemy,assets:NightAssets){const actor=new EnemyActor(assets,e,this.root);this.actors.set(e.id,actor);this.enemies.set(e.id,actor.root);this.decorate(e,actor.root);return actor.root;}
 private decorate(e:NightEnemy,root:T.Group){
 // Camera-facing health bar: dark backing plus a left-anchored fill.
 const health=new T.Group();health.name='health';health.position.y=e.kind===3?3.7:2.8;root.add(health);
 const back=new T.Sprite(this.barBack);back.scale.set(.95,.11,1);const fill=new T.Sprite(this.barFill);fill.name='fill';fill.center.set(0,.5);fill.position.x=-.45;fill.scale.set(.9,.065,1);fill.renderOrder=1;health.add(back,fill);
 const material=new T.MeshBasicMaterial({color:e.kind===2?0xc38aff:e.kind===3?0xffb55f:0xff7862,map:fxTexture(e.kind===1?'trace':'magic'),transparent:true,opacity:.2,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});this.materials.push(material);const geometry=e.kind===1?new T.PlaneGeometry(1,10):new T.RingGeometry(.02,e.kind===2?2.8:e.kind===3?3.85:2.95,40,1,e.kind===0?-Math.PI/2-1.15:0,e.kind===0?2.3:Math.PI*2);const warning=this.mesh(geometry,material,this.root);warning.rotation.x=-Math.PI/2;this.telegraphs.set(e.id,warning);return root;}

 update(s:NightState,dt:number,focus?:T.Vector3){this.root.visible=s.phase!=='boss'&&s.phase!=='won';if(!this.root.visible)return;this.orrery.rotation.y=s.time*.13;this.flames.forEach((f,i)=>{f.scale.y=.22+Math.sin(s.time*7+i*2)*.035;});this.banners.forEach((b,i)=>{b.rotation.y=Math.sin(s.time*1.8+i)*.12;const pos=b.geometry.getAttribute('position');for(let j=0;j<pos.count;j++){const y=pos.getY(j);pos.setZ(j,Math.sin(s.time*2+y*2+i)*.12*(.9-y)/1.8);}pos.needsUpdate=true;});this.motes.rotation.y=Math.sin(s.time*.03)*.03;this.portalRings.forEach((r,i)=>{r.rotation.z+=dt*(this.assets&&s.portals[i]?1.6:.3);if(this.assets)(r.material as T.MeshBasicMaterial).opacity=s.portals[i]?.9:.3;r.scale.setScalar(s.portals[i]?1+.04*Math.sin(s.time*2):.65);});this.springRings.forEach((r,i)=>{r.visible=s.springs[i]>0;if(this.assets)r.rotation.z=s.time*.4;});this.dress?.update(s.time);const relic=s.quests?.find(q=>q.kind==='relic');this.relics.forEach((g,i)=>{g.visible=i===s.stage-1&&!!relic&&!relic.done;if(g.visible){const b=g.getObjectByName('beam') as T.Sprite;b.material.opacity=.55+Math.sin(s.time*2.4)*.2;}});for(const e of s.enemies){const g=this.enemies.get(e.id)||this.creature(e),warning=this.telegraphs.get(e.id)!,actor=this.actors.get(e.id);
 // Skeletons play their death animation before vanishing; far-away actors skip skinning entirely.
 const near=!focus||Math.hypot(e.x-focus.x,e.z-focus.z)<36;g.visible=near&&s.phase==='explore'&&(e.hp>0||!!actor&&e.dead>53.4);warning.visible=g.visible&&e.hp>0&&e.wind>0;if(!g.visible)continue;
 const wind=e.wind>0?1-e.wind/(e.kind===2?1.05:e.kind===3?1:.7):0;
 if(actor)actor.update(e,dt,s.time);
 if(!actor){g.position.lerp(new T.Vector3(e.x,0,e.z),1-Math.exp(-18*dt));g.rotation.y+=Math.atan2(Math.sin(e.facing-g.rotation.y),Math.cos(e.facing-g.rotation.y))*(1-Math.exp(-12*dt));const body=g.getObjectByName('body')!,stride=Math.sin(s.time*(e.slow>0?5:9)+e.id)*e.moving,swing=e.recovery/.4;
 body.position.y=Math.abs(stride)*.07;body.rotation.x=e.wind>0?-.2*wind:e.recovery>0?.35*swing:e.moving*.08;body.rotation.z=e.evade>0?(e.id%2?1:-1)*.4:e.hit>0?Math.sin(s.time*40)*.1:0;g.getObjectByName('left')!.rotation.x=stride*.6;g.getObjectByName('right')!.rotation.x=-stride*.6;g.getObjectByName('armL')!.rotation.x=e.kind===1&&e.wind>0?-1.2:stride*.3;g.getObjectByName('armR')!.rotation.x=e.wind>0?-1.9*wind:e.recovery>0?1.3*swing:-stride*.3;}
 if(e.kind===2)warning.position.set(e.tx,.035,e.tz);else if(e.kind===1){const a=Math.atan2(e.tx-e.x,e.tz-e.z);warning.position.set(e.x+Math.sin(a)*5,.035,e.z+Math.cos(a)*5);warning.rotation.z=a;}else{warning.position.set(e.x,.035,e.z);warning.rotation.z=e.facing;}(warning.material as T.MeshBasicMaterial).opacity=.25+wind*.55+(wind>.8?Math.sin(s.time*40)*.15:0);if(e.kind!==1)warning.scale.setScalar(.35+.65*Math.min(1,wind*1.4));
 const health=g.getObjectByName('health')!;health.visible=e.hp>0&&(e.hp<e.max||e.aggro>0);health.getObjectByName('fill')!.scale.x=Math.max(.01,e.hp/e.max)*.9;}}

 /** Moving or temporary objects (enemies, telegraphs, motes) that must not appear in the map photograph. */
 transient(){return [...this.enemies.values(),...this.telegraphs.values(),this.motes].filter(o=>o.visible);}
 dispose(){this.dress?.dispose();this.barBack.dispose();this.barFill.dispose();this.actors.forEach(a=>a.dispose());this.instanced.forEach(m=>m.dispose());this.root.removeFromParent();new Set(this.geometries).forEach(g=>g.dispose());new Set(this.materials).forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());}
}

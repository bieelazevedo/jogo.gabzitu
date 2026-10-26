import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {huntArena,type Hunter,type HuntBoss,type HuntState,type HuntEvent} from './hunt-simulation';

type Rig={root:T.Group;body:T.Group;head:T.Group;arms:T.Group[];legs:T.Group[];tail:T.Group[];cape:T.Mesh;weapon:T.Group;materials:T.MeshStandardMaterial[];aura:T.Mesh;slash:T.Mesh;shadow:T.Mesh};
const ease=(a:number,b:number,t:number)=>a+(b-a)*Math.min(1,t);
function angle(a:number,b:number,t:number){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*Math.min(1,t);}
export class HuntScene {
 readonly renderer:T.WebGLRenderer;
 readonly scene=new T.Scene();readonly camera=new T.PerspectiveCamera(43,1,.1,160);
 private materials:T.Material[]=[];private geometries:T.BufferGeometry[]=[];private textures:T.Texture[]=[];
 private heroes:Rig[]=[];private boss!:Rig;private warning!:T.Mesh;private boundary!:T.Mesh;
 private projectileMeshes=new Map<number,T.Group>();private effects:{mesh:T.Object3D;age:number;life:number;kind:string;velocity:T.Vector3}[]=[];
 private labels:{element:HTMLElement;x:number;z:number;age:number;life:number}[]=[];
 private eventId=0;private shake=0;private clock=0;private hudTime=0;private aspect=2;private target=new T.Vector3();private marker!:T.Mesh;
 private gold!:T.MeshStandardMaterial;private cyan!:T.MeshStandardMaterial;private ember!:T.MeshStandardMaterial;
 private sphere=new T.SphereGeometry(1,12,8);private box=new T.BoxGeometry(1,1,1);private capsule=new T.CapsuleGeometry(.12,.45,3,6);
 constructor(private canvas:HTMLCanvasElement,private labelRoot:HTMLElement,private local:number,private sound:(kind:string)=>void,private arenaId=1){
  this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.renderer.setClearColor(huntArena(arenaId).sky);this.scene.fog=new T.FogExp2(huntArena(arenaId).sky,.018);
  this.geometries.push(this.sphere,this.box,this.capsule);
  this.scene.add(new T.HemisphereLight(0xb9ddff,0x28263a,2.6));const key=new T.DirectionalLight(0xffddb2,3.5);key.position.set(-6,12,9);this.scene.add(key);const rim=new T.DirectionalLight(0x5cb6db,2);rim.position.set(4,6,-12);this.scene.add(rim);
  this.gold=this.material(0xe7bc70,.55);this.cyan=this.material(0x8aefff,.2,0x3cb3e7,.7);this.ember=this.material(0xff9871,.1,0xff4e38,.65);
  this.environment();this.heroes=[this.cat(false),this.cat(true)];this.boss=this.monster();
  this.warning=this.add(new T.RingGeometry(.01,5.6,64),new T.MeshBasicMaterial({color:0xff7658,transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false}),this.scene,0,.04,0);this.warning.rotation.x=-Math.PI/2;
  this.marker=this.add(new T.RingGeometry(2.5,2.58,48),new T.MeshBasicMaterial({color:0xf3cd8a,transparent:true,opacity:.5,side:T.DoubleSide}),this.scene);this.marker.rotation.x=-Math.PI/2;
  this.camera.position.set(0,16,19);this.camera.lookAt(0,.6,0);this.resize();
 }
 private material(color:number,metalness=0,emissive=0,intensity=0){const m=new T.MeshStandardMaterial({color,roughness:.7,metalness,emissive,emissiveIntensity:intensity,flatShading:true});this.materials.push(m);return m;}
 private add(g:T.BufferGeometry,m:T.Material,parent:T.Object3D,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){if(!this.geometries.includes(g))this.geometries.push(g);if(!this.materials.includes(m))this.materials.push(m);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
 private ball(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){return this.add(this.sphere,m,parent,x,y,z,sx,sy,sz);}
 private block(parent:T.Object3D,m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){return this.add(this.box,m,parent,x,y,z,sx,sy,sz);}
 private pivot(parent:T.Object3D,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
 private ring(parent:T.Object3D,m:T.Material,r:number,t=.04,x=0,y=0,z=0){return this.add(new T.TorusGeometry(r,t,5,48),m,parent,x,y,z);}
 /** Bake architecture by material: scenery stays rich without hundreds of draw calls. */
 private bake(group:T.Group){group.updateMatrixWorld(true);const parts=new Map<T.Material,T.BufferGeometry[]>();group.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)){const a=parts.get(o.material)||[];a.push((o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld));parts.set(o.material,a);}});for(const [m,gs]of parts){const g=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(g)this.add(g,m,this.scene);}group.removeFromParent();}
 private compact(group:T.Group,skip?:T.Object3D){const parts=new Map<T.Material,T.BufferGeometry[]>();for(const o of [...group.children])if(o instanceof T.Mesh&&o!==skip&&!Array.isArray(o.material)){o.updateMatrix();const a=parts.get(o.material)||[];a.push((o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix));parts.set(o.material,a);group.remove(o);}for(const [m,gs]of parts){const g=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(g)this.add(g,m,group);}}
 private environment(){
  const staticGroup=this.pivot(this.scene),stone=this.material(0x42566b),edge=this.material(0x223449),pale=this.material(0x778994),broken=this.material(0x536273),banner=this.material(0x6e3553),dark=this.material(0x142536);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d')!;c.fillStyle='#627177';c.fillRect(0,0,1024,1024);
  for(let row=0;row<18;row++)for(let col=0;col<18;col++){const x=col*62+(row%2)*31,y=row*58;const n=(row*23+col*11)%28;c.fillStyle=`rgb(${83+n},${101+n},${108+n})`;c.fillRect(x+2,y+2,57,53);c.strokeStyle='#8d9998';c.strokeRect(x+4,y+3,53,1);}
  c.strokeStyle='#c3aa74';c.lineWidth=6;c.beginPath();c.arc(512,512,395,0,Math.PI*2);c.stroke();c.lineWidth=2;c.beginPath();c.arc(512,512,362,0,Math.PI*2);c.stroke();
  for(let i=0;i<12;i++){const a=i*Math.PI/6;c.save();c.translate(512+Math.cos(a)*375,512+Math.sin(a)*375);c.rotate(a);c.fillStyle='#d0b980';c.fillRect(-7,-7,14,14);c.restore();}
  c.globalAlpha=.25;c.fillStyle='#0a2639';c.beginPath();c.arc(512,512,150,0,Math.PI*2);c.fill();c.globalAlpha=1;c.strokeStyle='#c0b994';c.lineWidth=5;c.beginPath();c.moveTo(440,550);c.lineTo(420,420);c.lineTo(485,464);c.quadraticCurveTo(512,445,539,464);c.lineTo(604,420);c.lineTo(584,550);c.quadraticCurveTo(512,610,440,550);c.stroke();
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());this.textures.push(texture);const floor=this.material(huntArena(this.arenaId).floor);floor.map=texture;
  this.add(new T.CylinderGeometry(12.8,13.5,.8,64),edge,staticGroup,0,-.48);const ground=this.add(new T.CircleGeometry(12.8,64),floor,staticGroup,0,-.065);ground.rotation.x=-Math.PI/2;
  for(const r of [12.3,12.65]){const ring=this.ring(staticGroup,this.gold,r,.07,0,-.015);ring.rotation.x=-Math.PI/2;}
  this.boundary=this.ring(this.scene,this.cyan,12.85,.035,0,.12);this.boundary.rotation.x=-Math.PI/2;
  for(let i=0;i<14;i++){const a=i*Math.PI*2/14,x=Math.cos(a)*14.5,z=Math.sin(a)*14.5,h=3.2+(i%3)*1.2;const p=this.pivot(staticGroup,x,0,z);this.block(p,edge,0,.1,0,1.8,.35,1.8);this.add(new T.CylinderGeometry(.45,.6,h,8),stone,p,0,h/2,0);this.block(p,pale,0,h,0,1.3,.3,1.3);if(i%3!==1){this.add(new T.ConeGeometry(.6,1.1,4),dark,p,0,h+.65,0);this.ball(p,i%2?this.cyan:this.ember,0,h+1.3,0,.17);}if(i%3===0){this.block(p,banner,0,h-1.1,.62,.8,1.6,.06);this.ball(p,this.gold,0,h-1,.68,.15,.22,.06);}}
  // Ruined sanctuary beyond the combat floor, with a moon framed by broken arches.
  for(const x of [-7,7]){this.block(staticGroup,edge,x,3.2,-17,2.5,6.5,2);this.block(staticGroup,stone,x,6.8,-17,3,.6,2.3);for(let j=0;j<3;j++)this.block(staticGroup,pale,x+(j-1)*.7,7.4,-17,.5,.7,1.4);}
  const arch=this.add(new T.TorusGeometry(7,.65,5,24,Math.PI),stone,staticGroup,0,3,-17);arch.rotation.z=0;
  this.add(new T.SphereGeometry(2.1,24,16),new T.MeshBasicMaterial({color:0xb6e4eb}),staticGroup,1,11,-29);this.add(new T.SphereGeometry(1.95,24,16),new T.MeshBasicMaterial({color:0x101c2b}),staticGroup,1.9,11.6,-28.4);
  for(let i=0;i<22;i++){const a=i*2.4,r=20+(i%5)*3,x=Math.cos(a)*r,z=-29-Math.abs(Math.sin(a)*r*.4);this.add(new T.ConeGeometry(2+(i%3),9+(i%5)*3,5),dark,staticGroup,x,2,z);}
  for(let i=0;i<30;i++){const a=i*2.399,r=13.5+(i%6)*.7;const b=this.block(staticGroup,broken,Math.cos(a)*r,.1,Math.sin(a)*r,.5+(i%3)*.3,.3+(i%4)*.17,.6);b.rotation.set(i*.15,i,.1);}
  this.bake(staticGroup);
  // Bounded ambient fireflies use one draw call.
  const points=new Float32Array(120*3);for(let i=0;i<120;i++){points[i*3]=Math.sin(i*17.3)*22;points[i*3+1]=1+(i%11)*.7;points[i*3+2]=Math.cos(i*7.1)*22;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(points,3));this.geometries.push(g);const m=new T.PointsMaterial({color:0x86dce8,size:.07,transparent:true,opacity:.6,depthWrite:false});this.materials.push(m);this.scene.add(new T.Points(g,m));
 }
 private baseRig():Rig{const root=this.pivot(this.scene),body=this.pivot(root);const shadow=this.add(new T.CircleGeometry(.8,24),new T.MeshBasicMaterial({color:0x071222,transparent:true,opacity:.4,depthWrite:false}),this.scene);shadow.rotation.x=-Math.PI/2;const aura=this.ring(root,this.cyan,.7,.035,0,.06);aura.rotation.x=-Math.PI/2;const slash=this.add(new T.RingGeometry(1.6,1.95,24,1,0,Math.PI*1.2),new T.MeshBasicMaterial({color:0xffe7ac,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending}),root,0,1,0);slash.rotation.x=-Math.PI/2;slash.visible=false;return {root,body,head:this.pivot(body,0,1.75),arms:[],legs:[],tail:[],cape:null!,weapon:null!,materials:[],aura,slash,shadow};}
 private cat(mage:boolean):Rig{
  const rig=this.baseRig(),{body,head}=rig;const fur=this.material(mage?0xb9c0d7:0xd99b52),light=this.material(mage?0xe6e2ee:0xffd5a3),cloth=this.material(mage?0x4d407d:0x1b5b65),clothLight=this.material(mage?0x8663a7:0x398b8e),armor=this.material(mage?0x80749e:0x7f9daa,.5),dark=this.material(0x192535),eye=this.material(0xb4f6e8,.1,0x43b4ab,.2);rig.materials=[fur,light,cloth,armor];
  this.ball(body,fur,0,1.02,0,.5,.66,.36);this.add(new T.CylinderGeometry(.4,.62,.8,8),cloth,body,0,.75,0);this.block(body,dark,0,.9,.36,.85,.14,.09);this.block(body,this.gold,0,.9,.43,.2,.18,.06);
  this.ball(head,fur,0,0,0,.55,.47,.45);for(const x of [-.36,.36]){const ear=this.add(new T.ConeGeometry(.26,.6,3),fur,head,x,.45,-.02);ear.rotation.z=-x*.6;this.add(new T.ConeGeometry(.15,.36,3),this.material(0xbb7b83),head,x,.48,.12);this.ball(head,light,x*.4,-.13,.4,.23,.16,.11);this.ball(head,light,x*.65,.06,.395,.13,.16,.06);this.ball(head,eye,x*.65,.065,.45,.085,.12,.025);this.ball(head,dark,x*.65,.075,.475,.025,.085,.013);const brow=this.block(head,dark,x*.64,.25,.39,.23,.035,.045);brow.rotation.z=x>0?.12:-.12;for(let j=0;j<2;j++){const w=this.block(head,light,x*1.2,-.11-j*.08,.4,.32,.017,.018);w.rotation.z=(x>0?1:-1)*(.08+j*.12);}}
  this.ball(head,this.material(0x9e656b),0,-.08,.51,.075,.05,.04);this.block(head,dark,0,-.19,.49,.018,.1,.015);
  for(const x of [-.27,.27]){const leg=this.pivot(body,x,.56);this.add(this.capsule,fur,leg,0,-.14,0,1.25,1,1.25);this.ball(leg,dark,0,-.37,.1,.22,.19,.3);this.block(leg,this.gold,0,-.27,.2,.27,.07,.1);rig.legs.push(leg);const arm=this.pivot(body,x*2,1.42);this.add(this.capsule,clothLight,arm,0,-.24,0,1.2,1,1.2);this.ball(arm,fur,0,-.55,.03,.17);this.ball(arm,armor,0,.02,0,.25,.18,.24);rig.arms.push(arm);}
  rig.cape=this.add(new T.ConeGeometry(.65,1.15,5,1,true),cloth,body,0,1,-.26);rig.cape.scale.z=.55;rig.cape.rotation.x=-.13;this.ring(body,this.gold,.42,.035,0,1.5).rotation.x=Math.PI/2;
  let tail=this.pivot(body,0,.7,-.35);for(let i=0;i<3;i++){const t=this.pivot(tail,0,0,-(i? .35:0));this.ball(t,fur,0,0,-.17,.13,.13,.3);rig.tail.push(t);tail=t;}
  rig.weapon=this.pivot(rig.arms[1],0,-.5,.03);
  if(mage){this.add(new T.ConeGeometry(.6,.65,7,1,true),clothLight,head,0,.25,-.12);this.ring(head,this.gold,.43,.025,0,.15).rotation.x=Math.PI/2;this.add(new T.CylinderGeometry(.055,.075,2.4,7),this.gold,rig.weapon,0,.65,0);this.ring(rig.weapon,this.gold,.29,.065,0,1.9);this.add(new T.OctahedronGeometry(.23),this.cyan,rig.weapon,0,1.9,.02);this.ball(rig.weapon,this.cyan,0,1.9,0,.12);}
  else{this.block(rig.weapon,dark,0,-.05,0,.12,.5,.12);this.block(rig.weapon,this.gold,0,.21,0,.6,.12,.18);const shape=new T.Shape();shape.moveTo(-.13,.2);shape.lineTo(-.21,1.3);shape.lineTo(0,1.85);shape.lineTo(.21,1.3);shape.lineTo(.13,.2);shape.closePath();this.add(new T.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false}),armor,rig.weapon);this.block(rig.weapon,this.cyan,0,.95,.085,.045,1.2,.015);this.block(body,this.gold,-.36,1.42,.04,.46,.1,.6).rotation.z=-.3;}
  this.compact(head);this.compact(rig.weapon);this.compact(body,rig.cape);rig.root.scale.setScalar(1.2);return rig;
 }
 private monster():Rig{
  const r=this.baseRig(),fur=this.material(huntArena(this.arenaId).fur),light=this.material(0x9f849b),dark=this.material(0x25263c),armor=this.material(0x424257,.55),cloth=this.material(huntArena(this.arenaId).cloth),bone=this.material(0xf1d7ad),eye=this.material(0xffa45b,.1,0xff621f,1.4);r.materials=[fur,light,cloth,armor];
  this.ball(r.body,fur,0,2.1,0,1.75,1.95,1.3);this.ball(r.body,cloth,0,1.9,1.05,1.25,1.45,.28);this.block(r.body,this.gold,0,2.1,1.37,1.15,.13,.1);this.add(new T.OctahedronGeometry(.4),bone,r.body,0,1.9,1.4);
  r.head.position.set(0,4.1,.25);this.ball(r.head,fur,0,0,0,1.25,.95,.95);this.ball(r.head,light,0,-.25,.85,.8,.5,.65);this.ball(r.head,dark,0,-.08,1.4,.37,.23,.19);for(const x of [-1,1]){this.ball(r.head,fur,x,.55,-.08,.65,.75,.24);this.ball(r.head,cloth,x,.55,.12,.42,.48,.09);this.ball(r.head,bone,x*.51,.2,.79,.29,.2,.1);this.ball(r.head,eye,x*.51,.17,.88,.14,.17,.06);this.block(r.head,dark,x*.5,.43,.8,.55,.14,.15).rotation.z=x*.22;const tooth=this.add(new T.ConeGeometry(.17,.5,4),bone,r.head,x*.25,-.7,1.1);tooth.rotation.z=Math.PI;const horn=this.add(new T.ConeGeometry(.3,1.25,5),this.gold,r.head,x*.64,.99,-.05);horn.rotation.z=-x*.2;}
  this.ring(r.head,this.gold,.92,.12,0,.66).rotation.x=Math.PI/2;
  for(const x of [-1,1]){const arm=this.pivot(r.body,x*1.65,3.15);this.ball(arm,fur,0,-.55,0,.52,.95,.52);this.ball(arm,armor,0,.1,0,.8,.5,.75);for(let j=0;j<3;j++){this.add(new T.ConeGeometry(.14,.6,4),bone,arm,(j-1)*.28,.53,.12);}this.ball(arm,dark,0,-1.35,.05,.57,.45,.54);for(let j=0;j<3;j++)this.add(new T.ConeGeometry(.12,.42,4),bone,arm,(j-1)*.26,-1.7,.23).rotation.x=Math.PI;r.arms.push(arm);const leg=this.pivot(r.body,x*.8,.85);this.ball(leg,fur,0,-.1,0,.59,.72,.6);this.ball(leg,armor,0,-.65,.35,.7,.35,.9);r.legs.push(leg);}
  r.weapon=this.pivot(r.arms[1],0,-1.25,0);this.add(new T.CylinderGeometry(.14,.17,2.6,7),bone,r.weapon,0,-.1,.1);this.block(r.weapon,armor,0,1.4,.1,2.2,1.2,1.2);for(const x of [-.9,.9])this.block(r.weapon,this.gold,x,1.4,.1,.17,1.35,1.35);this.ball(r.weapon,this.ember,0,1.4,.73,.3,.3,.05);
  let tail=this.pivot(r.body,0,1.1,-1);for(let i=0;i<5;i++){const p=this.pivot(tail,0,0,i?-.65:0);this.ball(p,light,0,0,-.35,.23-i*.026,.2-i*.02,.52);r.tail.push(p);tail=p;}
  r.cape=this.add(new T.ConeGeometry(1.6,2.8,6,1,true),cloth,r.body,0,2.1,-.6);r.cape.scale.z=.55;r.shadow.scale.setScalar(2.7);r.aura.visible=false;r.slash.visible=false;this.compact(r.head);this.compact(r.weapon);this.compact(r.body,r.cape);return r;
 }
 resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);this.aspect=w/h;this.camera.aspect=this.aspect;this.camera.updateProjectionMatrix();}
 private animateHero(r:Rig,p:Hunter,dt:number,time:number){
  r.root.position.x=ease(r.root.position.x,p.x,dt*20);r.root.position.z=ease(r.root.position.z,p.z,dt*20);r.root.rotation.y=angle(r.root.rotation.y,p.facing,dt*15);
  const run=Math.sin(time*13)*p.moving,progress=p.actionTime/(p.duration||1),swing=Math.sin(Math.min(1,progress)*Math.PI);
  r.root.rotation.z=ease(r.root.rotation.z,p.hp<=0?1.45:0,dt*12);r.root.position.y=p.hp<=0?-.35:p.dash>0?.1:Math.abs(run)*.11;
  r.body.rotation.x=p.dash>0?-progress*Math.PI*2:p.action===2?-.22*swing:0;r.body.rotation.y=p.action===1?Math.sin(progress*Math.PI*2)*.28*(p.combo%2?-1:1):0;
  r.head.rotation.x=Math.sin(time*2)*.025;r.legs[0].rotation.x=run*.65;r.legs[1].rotation.x=-run*.65;
  r.arms[0].rotation.x=-run*.35;r.arms[1].rotation.x=run*.3;
  r.arms[1].rotation.z=p.action===1?(p.combo%2?1:-1)*Math.sin(progress*Math.PI)*1.7:p.action===2?-.6*swing:0;
  if(p.action===1||p.action===2||p.action===3)r.arms[1].rotation.x=-1.4*swing;
  r.arms[0].rotation.z=p.action===3?.9*swing:0;r.cape.rotation.x=-.15-p.moving*.2+Math.sin(time*6)*.08;r.tail.forEach((t,i)=>{t.rotation.y=Math.sin(time*4-i*.6)*.24;t.rotation.x=-.08;});
  r.aura.material=this.materials.includes(r.aura.material as T.Material)?r.aura.material:this.cyan;r.aura.visible=p.hp>0;r.aura.scale.setScalar(p.shield>0?1.3:1);r.aura.rotation.z=time*.4;
  r.slash.visible=p.action===1&&p.actionTime>.08&&progress<.85&&this.heroes.indexOf(r)===0;r.slash.rotation.z=-progress*Math.PI*2;r.slash.scale.setScalar(p.combo===3?1.4:1);
  r.shadow.position.set(r.root.position.x,.005,r.root.position.z);r.shadow.scale.setScalar(p.dash>0?.8:1);
  for(const m of r.materials){m.emissive.setHex(p.hit>0?0xff6b67:p.shield>0?0x154647:0);m.emissiveIntensity=p.hit>0?.7:.5;}
 }
 private animateBoss(b:HuntBoss,dt:number,time:number,status:string){
  const r=this.boss;r.root.position.x=ease(r.root.position.x,b.x,dt*(b.attack===4?12:7));r.root.position.z=ease(r.root.position.z,b.z,dt*8);r.root.rotation.y=angle(r.root.rotation.y,b.angle,dt*5);const wind=b.stage===1?1-b.timer/b.total:0,recover=b.stage===2?b.timer/b.total:0;
  r.root.position.y=b.attack===2&&b.stage===1?Math.sin(wind*Math.PI)*3:0;
  r.body.rotation.x=ease(r.body.rotation.x,status==='won'?1.25:b.stage===4?.3:wind*-.22+recover*.35,dt*8);r.body.rotation.z=b.stage===4?Math.sin(time*10)*.06:0;
  r.head.rotation.x=wind*-.25+Math.sin(time*2)*.04;r.head.rotation.z=b.stage===4?.2:0;
  r.arms[1].rotation.x=ease(r.arms[1].rotation.x,b.stage===1?-2.1*wind:b.stage===2?.8:0,dt*12);r.arms[0].rotation.z=Math.sin(time*2)*.05+(b.stage===1?wind*.8:0);r.arms[1].rotation.z=b.attack===1?Math.sin(wind*Math.PI)*1.2:0;
  r.legs.forEach((l,i)=>l.rotation.x=b.stage===0?Math.sin(time*4+i*Math.PI)*.13:0);r.tail.forEach((t,i)=>t.rotation.y=Math.sin(time*2-i*.4)*.18);r.cape.rotation.x=-.12+Math.sin(time*3)*.05;
  for(const m of r.materials){m.emissive.setHex(b.hit>0?0xffd5a0:b.phase===2?0x7c172e:0);m.emissiveIntensity=b.hit>0?.75:b.phase===2?.18:0;}
  r.shadow.position.set(r.root.position.x,.004,r.root.position.z);this.marker.position.set(b.x,.03,b.z);this.marker.rotation.z=time*.15;
 }
 private telegraph(b:HuntBoss,time:number){
  this.warning.visible=b.stage===1;if(!this.warning.visible)return;const key=b.attack;if(this.warning.userData.key!==key){this.warning.geometry.dispose();let g:T.BufferGeometry;if(key===4)g=new T.PlaneGeometry(4.5,Math.hypot(b.tx-b.x,b.tz-b.z)+2);else g=new T.RingGeometry(key===3?4.7:.01,key===3?22:key===2?3.5:key===5?7.2:5.6,64);this.warning.geometry=g;this.geometries.push(g);this.warning.userData.key=key;}
  this.warning.position.set(b.attack===2?b.tx:b.x,.04,b.attack===2?b.tz:b.z);this.warning.rotation.set(-Math.PI/2,0,0);
  if(b.attack===4){this.warning.position.set((b.x+b.tx)/2,.04,(b.z+b.tz)/2);this.warning.rotation.z=-Math.atan2(b.tx-b.x,b.tz-b.z);}
  const m=this.warning.material as T.MeshBasicMaterial;m.opacity=.13+(1-b.timer/b.total)*.26+Math.sin(time*17)*.035;m.color.setHex(b.attack===3?0x9677ff:0xff6650);
 }
 private spawn(e:HuntEvent){
  if(e.kind==='hit'||e.kind==='hurt'||e.kind==='heal'){const el=document.createElement('span');el.className='hunt-number '+e.kind;el.textContent=(e.kind==='heal'?'+':'')+Math.round(e.value);this.labelRoot.append(el);this.labels.push({element:el,x:e.x+(e.owner===0?-.9:.9)+(e.id%3-1)*.25,z:e.z,age:0,life:.85});if(this.labels.length>24)this.labels.shift()!.element.remove();}
  if(['hit','hurt','impact','ultimate','stagger','phase'].includes(e.kind)){
   const big=['impact','ultimate','phase'].includes(e.kind),color=e.kind==='heal'?0x88ffcc:e.kind==='hurt'?0xff7668:e.owner===1?0x82e9ff:0xffd795;
   const material=new T.MeshBasicMaterial({color,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});this.materials.push(material);
   const ring=this.add(new T.RingGeometry(big?.7:.2,big?1:.45,32),material,this.scene,e.x,.1,e.z);ring.rotation.x=-Math.PI/2;this.effects.push({mesh:ring,age:0,life:big?.7:.3,kind:'ring',velocity:new T.Vector3()});
   const count=big?14:5;for(let i=0;i<count;i++){const spark=this.add(this.sphere,material,this.scene,e.x,big?.4:2,e.z,.07);const a=i/count*Math.PI*2;this.effects.push({mesh:spark,age:0,life:.45+(i%3)*.1,kind:'spark',velocity:new T.Vector3(Math.sin(a)*(big?8:3),2+(i%4),Math.cos(a)*(big?8:3))});}
   if(e.kind==='hurt'&&e.owner===this.local)this.shake=.18;else if(big)this.shake=.12;
  }
  this.sound(e.kind==='slash'?'slash':e.kind==='cast'?'cast':e.kind==='hit'?'hit':e.kind==='hurt'?'hurt':e.kind==='dodge'?'dodge':e.kind==='heal'?'heal':e.kind==='phase'?'roar':e.kind==='impact'?'slam':e.kind==='ultimate'?'ultimate':e.kind==='stagger'?'break':'');
 }
 update(s:HuntState,dt:number){
  this.clock+=dt;const time=this.clock;if(this.clock-this.hudTime>2){this.hudTime=this.clock;this.sound('ambience');}for(const e of s.events)if(e.id>this.eventId){this.eventId=e.id;this.spawn(e);}this.heroes.forEach((r,i)=>this.animateHero(r,s.players[i],dt,time));this.animateBoss(s.boss,dt,time,s.status);this.telegraph(s.boss,time);
  const local=s.players[this.local],b=s.boss;const centre=new T.Vector3((local.x+b.x)*.3,0,(local.z+b.z)*.3);this.target.lerp(centre,Math.min(1,dt*3));const portrait=this.aspect<1;const spread=Math.hypot(local.x-b.x,local.z-b.z);const distance=portrait?32:19+Math.max(0,spread-7)*.4;
  const destination=new T.Vector3(this.target.x,distance*.8,this.target.z+distance);this.camera.position.lerp(destination,Math.min(1,dt*3));this.shake=Math.max(0,this.shake-dt);if(this.shake>0){this.camera.position.x+=Math.sin(time*110)*this.shake;this.camera.position.y+=Math.cos(time*90)*this.shake;}
  this.camera.lookAt(this.target.x,.6,this.target.z);this.boundary.material=this.cyan;this.cyan.emissiveIntensity=.65+Math.sin(time*2)*.12;
  const active=new Set(s.projectiles.map(p=>p.id));for(const [id,g]of this.projectileMeshes)if(!active.has(id)){g.removeFromParent();this.projectileMeshes.delete(id);}
  for(const p of s.projectiles){let g=this.projectileMeshes.get(p.id);if(!g){g=this.pivot(this.scene);this.ball(g,this.cyan,0,1,0,p.charged?.32:.18);const ring=this.ring(g,this.gold,p.charged?.4:.25,.025,0,1);ring.rotation.x=Math.PI/2;this.projectileMeshes.set(p.id,g);}g.position.set(p.x,0,p.z);g.rotation.y=time*10;}
  const retiredMaterials=new Set<T.Material>();const retire=(e:typeof this.effects[number])=>{e.mesh.removeFromParent();if(e.mesh instanceof T.Mesh){if(e.kind==='ring'){e.mesh.geometry.dispose();const i=this.geometries.indexOf(e.mesh.geometry);if(i>=0)this.geometries.splice(i,1);}retiredMaterials.add(e.mesh.material as T.Material);}};this.effects=this.effects.filter(e=>{e.age+=dt;const t=e.age/e.life;if(t>=1){retire(e);return false;}if(e.kind==='ring'){e.mesh.scale.setScalar(1+t*7);(e.mesh as T.Mesh).material instanceof T.MeshBasicMaterial&&((e.mesh as T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>).material.opacity=(1-t)*.6);}else{e.mesh.position.addScaledVector(e.velocity,dt);e.velocity.y-=dt*12;e.mesh.scale.setScalar(.07*(1-t));}return true;});
  if(this.effects.length>220){for(const e of this.effects.splice(0,this.effects.length-220))retire(e);}
  const liveMaterials=new Set(this.effects.map(e=>(e.mesh as T.Mesh).material));for(const m of retiredMaterials)if(!liveMaterials.has(m)){m.dispose();const i=this.materials.indexOf(m);if(i>=0)this.materials.splice(i,1);}
  for(const label of this.labels){label.age+=dt;const p=new T.Vector3(label.x,3+label.age*2,label.z).project(this.camera);label.element.style.transform=`translate(${(p.x*.5+.5)*this.canvas.clientWidth}px,${(-p.y*.5+.5)*this.canvas.clientHeight}px)`;label.element.style.opacity=String(1-label.age/label.life);}this.labels=this.labels.filter(l=>{if(l.age>=l.life){l.element.remove();return false;}return true;});
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.labels.forEach(l=>l.element.remove());new Set(this.geometries).forEach(g=>g.dispose());new Set(this.materials).forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.renderer.dispose();}
}

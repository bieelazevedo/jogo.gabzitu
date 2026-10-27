// Authored characters, CC BY 4.0; only compression, rig cleanup and CC0 clip retargeting are performed here.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,weld,meshopt,textureCompress,resample} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const CACHE='node_modules/.cache/modern-heroes/',OUT='public/models/characters/modern/';
const CAST=[
 {name:'LunarKnight',id:'4f1c320f2cec49dc9bf38c6aad2d8ea9',author:'DJMaesen',title:'Paladin',path:'000-150',rig:'custom'},
 {name:'ReaverKnight',id:'1df49f839f674e3fb7a3d3481caf0855',author:'Angy97',title:'Berserk Armor',path:'000-056',rig:'spanish'},
 {name:'AstralMage',id:'0015c579cfa440a7a2bd0a3f14395f05',author:'rSquare',title:'Mage',path:'000-037',rig:'mixamo'},
 {name:'ForestArcher',id:'47c311cb422a47d4a825b6832297607b',author:'outcast945',title:'Hawley the Archer',path:'000-080',rig:'biped'},
];
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);await mkdir(OUT,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
async function rig(bytes){const b=Buffer.from(bytes),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),bin=b.subarray(28+b.readUInt32LE(12));delete j.images;delete j.textures;delete j.materials;for(const mesh of j.meshes||[])for(const p of mesh.primitives)delete p.material;
 const json=Buffer.from(JSON.stringify(j)),jb=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),out=Buffer.alloc(28+jb.length+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jb.length,12);out.writeUInt32LE(0x4e4f534a,16);jb.copy(out,20);out.writeUInt32LE(bin.length,20+jb.length);out.writeUInt32LE(0x004e4942,24+jb.length);bin.copy(out,28+jb.length);
 return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}
function canonical(original,kind){const n=original.replace(/_\d+$/,'');
 if(kind==='mixamo'){
  const c=n.replace(/^mixamorig:?/,'');const spine={Hips:'pelvis',Spine:'spine_01',Spine1:'spine_02',Spine2:'spine_03',Neck:'neck_01',Head:'Head'};if(spine[c])return spine[c];
  const m=c.match(/^(Left|Right)(Shoulder|Arm|ForeArm|Hand|UpLeg|Leg|Foot|ToeBase)$/);if(m)return ({Shoulder:'clavicle',Arm:'upperarm',ForeArm:'lowerarm',Hand:'hand',UpLeg:'thigh',Leg:'calf',Foot:'foot',ToeBase:'ball'})[m[2]]+'_'+(m[1]==='Left'?'l':'r');
 }
 if(kind==='custom'){
  const spine={hips:'pelvis',spine:'spine_01',chest:'spine_03',neck:'neck_01',head:'Head'};if(spine[n])return spine[n];const m=n.match(/^([LR])_(shoulder|arm|elbow|wrist|leg|knee|ankle|toes)$/);if(m)return ({shoulder:'clavicle',arm:'upperarm',elbow:'lowerarm',wrist:'hand',leg:'thigh',knee:'calf',ankle:'foot',toes:'ball'})[m[2]]+'_'+m[1].toLowerCase();
 }
 if(kind==='spanish'){
  const c=n.replaceAll('.','');const spine={Cadera:'pelvis',Abdomen:'spine_01',Torso:'spine_03',Cuello:'neck_01',Cabeza:'Head'};if(spine[c])return spine[c];const m=c.match(/^(Brazo|Codo|Mano|Pierna|Rodilla|Pie|Pie2)([LR])$/);if(m)return ({Brazo:'upperarm',Codo:'lowerarm',Mano:'hand',Pierna:'thigh',Rodilla:'calf',Pie:'foot',Pie2:'ball'})[m[1]]+'_'+m[2].toLowerCase();
 }
 if(kind==='biped'){
  const c=n.replace(/^Bip001[_\s]*/,'');const spine={Pelvis:'pelvis',Spine:'spine_01',Spine1:'spine_03',Neck:'neck_01',Head:'Head'};if(spine[c])return spine[c];const m=c.match(/^([LR])[_\s]+(Clavicle|UpperArm|Forearm|Hand|Thigh|Calf|Foot|Toe0)$/);if(m)return ({Clavicle:'clavicle',UpperArm:'upperarm',Forearm:'lowerarm',Hand:'hand',Thigh:'thigh',Calf:'calf',Foot:'foot',Toe0:'ball'})[m[2]]+'_'+m[1].toLowerCase();
 }
 if(kind==='rigify'){
  const c=n.replaceAll('.','');const spine={'DEF-spine':'pelvis','DEF-spine001':'spine_01','DEF-spine002':'spine_02','DEF-spine003':'spine_03','DEF-spine004':'neck_01','DEF-spine005':'neck_01','DEF-spine006':'Head'};if(spine[c])return spine[c];const m=c.match(/^DEF-(shoulder|upper_arm|forearm|hand|thigh|shin|foot|toe)([LR])$/);if(m)return ({shoulder:'clavicle',upper_arm:'upperarm',forearm:'lowerarm',hand:'hand',thigh:'thigh',shin:'calf',foot:'foot',toe:'ball'})[m[1]]+'_'+m[2].toLowerCase();
 }
}
/** Discard unused rig controls from the skin palette, retaining original deformation weights. */
function compactSkins(doc){for(const skin of doc.getRoot().listSkins()){
 const primitives=doc.getRoot().listNodes().filter(n=>n.getSkin()===skin&&n.getMesh()).flatMap(n=>n.getMesh().listPrimitives()),used=new Set();
 for(const p of primitives){const j=p.getAttribute('JOINTS_0'),w=p.getAttribute('WEIGHTS_0');if(!j||!w)continue;for(let i=0;i<j.getCount();i++){const js=j.getElement(i,[]),ws=w.getElement(i,[]);for(let k=0;k<4;k++)if(ws[k]>.00001)used.add(js[k]);}}
 const indices=[...used].sort((a,b)=>a-b);if(!indices.length)continue;const map=new Map(indices.map((v,i)=>[v,i])),seen=new Set();
 for(const p of primitives){const j=p.getAttribute('JOINTS_0');if(!j||seen.has(j))continue;seen.add(j);const array=j.getArray().slice();for(let i=0;i<array.length;i++)array[i]=map.get(array[i])??0;j.setArray(array);}
 const joints=skin.listJoints(),inverse=skin.getInverseBindMatrices(),values=inverse.getArray(),trimmed=new Float32Array(indices.length*16);indices.forEach((v,i)=>trimmed.set(values.subarray(v*16,v*16+16),i*16));for(const joint of joints)skin.removeJoint(joint);indices.forEach(i=>skin.addJoint(joints[i]));inverse.setArray(trimmed);
 console.log('Skin palette:',joints.length,'→',indices.length);
}}
const source=await rig(await readFile(OUT+'Male_Ranger.glb')),clips=[...(await rig(await readFile(OUT+'gaits.glb'))).animations,...(await rig(await readFile(OUT+'animations.glb'))).animations];
source.scene.updateMatrixWorld(true);const sourceBones=new Map();source.scene.traverse(n=>{if(n.isBone)sourceBones.set(n.name,n);});
const sourceRest=new Map([...sourceBones].map(([name,n])=>[name,n.getWorldQuaternion(new T.Quaternion()).invert()]));
for(const item of CAST){
 if(process.argv[2]&&process.argv[2]!==item.name)continue;
 const path=CACHE+item.id+'.glb';let bytes;try{bytes=await readFile(path);}catch{const r=await fetch(`https://huggingface.co/datasets/allenai/objaverse/resolve/main/glbs/${item.path}/${item.id}.glb`);if(!r.ok)throw Error(r.status+' '+item.name);bytes=Buffer.from(await r.arrayBuffer());await writeFile(path,bytes);}
 const doc=await io.readBinary(bytes);for(const a of doc.getRoot().listAnimations())a.dispose();if(item.removeStatic)for(const n of doc.getRoot().listNodes())if(n.getMesh()&&!n.getSkin())n.setMesh(null);
 compactSkins(doc);await doc.transform(prune({keepLeaves:false}),dedup());
 const target=await rig(await io.writeBinary(doc));target.scene.updateMatrixWorld(true);const bones=[];target.scene.traverse(n=>{if(n.isBone)bones.push(n);});
 const names=new Map(bones.map(n=>[n,canonical(n.name,item.rig)])),rest=new Map(bones.map(n=>[n,{world:n.getWorldQuaternion(new T.Quaternion()),local:n.quaternion.clone()}]));
 for(const n of bones){const sb=sourceBones.get(names.get(n)),child=n.children.find(c=>sourceBones.has(names.get(c)));if(!sb||!child)continue;const sc=sourceBones.get(names.get(child)),a=child.getWorldPosition(new T.Vector3()).sub(n.getWorldPosition(new T.Vector3())).normalize(),b=sc.getWorldPosition(new T.Vector3()).sub(sb.getWorldPosition(new T.Vector3())).normalize();if(a.length()&&b.length())rest.get(n).world.premultiply(new T.Quaternion().setFromUnitVectors(a,b));}
 const mapped=bones.filter(n=>sourceBones.has(names.get(n))),nodes=new Map(doc.getRoot().listNodes().map(n=>[T.PropertyBinding.sanitizeNodeName(n.getName()),n]));
 if(mapped.length<16)throw Error(item.name+': insufficient mapped joints '+mapped.length);console.log(item.name,'mapped',mapped.length,'of',bones.length);
 for(const clip of clips){const mixer=new T.AnimationMixer(source.scene);mixer.clipAction(clip).play();const count=Math.ceil(clip.duration*24)+1,times=new Float32Array(count),values=new Map(mapped.map(n=>[n,new Float32Array(count*4)]));
  for(let i=0;i<count;i++){const t=Math.max(0,Math.min(clip.duration-.00001,i/24));times[i]=t;mixer.setTime(t);source.scene.updateMatrixWorld(true);
   for(const n of bones){const sb=sourceBones.get(names.get(n));if(sb){const desired=sb.getWorldQuaternion(new T.Quaternion()).multiply(sourceRest.get(names.get(n))).multiply(rest.get(n).world),parent=n.parent.getWorldQuaternion(new T.Quaternion()).invert();n.quaternion.copy(parent.multiply(desired));values.get(n).set(n.quaternion.toArray(),i*4);}else n.quaternion.copy(rest.get(n).local);n.updateMatrixWorld(true);}}
  const a=doc.createAnimation(clip.name),time=doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(doc.getRoot().listBuffers()[0]);for(const n of mapped){const value=doc.createAccessor().setType('VEC4').setArray(values.get(n)).setBuffer(doc.getRoot().listBuffers()[0]),sampler=doc.createAnimationSampler().setInput(time).setOutput(value).setInterpolation('LINEAR');a.addSampler(sampler);a.addChannel(doc.createAnimationChannel().setSampler(sampler).setTargetNode(nodes.get(n.name)).setTargetPath('rotation'));}mixer.stopAllAction();
 }
 // Canonical attachment points make weapons and class poses portable across authored rigs.
 const assigned=new Set();for(const n of mapped){const name=names.get(n);if(assigned.has(name))continue;assigned.add(name);nodes.get(n.name).setName(name);}
 await doc.transform(prune(),dedup(),weld(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:86}),resample(),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write(OUT+item.name+'.glb',doc);
 await writeFile('public/models/LICENSE-'+item.name.toLowerCase()+'.txt',`${item.title} — ${item.author}\nhttps://sketchfab.com/3d-models/${item.id}\nCC BY 4.0 — https://creativecommons.org/licenses/by/4.0/\nMirror: allenai/objaverse. Changes: rig cleanup, compressed textures/geometry, canonical bone names, original clips removed and replaced with retargeted Quaternius CC0 animations.\n`);
}

// The Forgotten Knight by dark_igorek, CC BY 4.0, Sketchfab d14eb14d83bd4e7ba7cbe443d76a10fd.
// Downloaded from the TexVerse CC-licensed mirror. Original geometry/textures, no generated armour.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,weld,meshopt,textureCompress,resample} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const cache='node_modules/.cache/modern-heroes/';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
async function rig(file){const b=await readFile(file),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),bin=b.subarray(28+b.readUInt32LE(12));delete j.images;delete j.textures;delete j.materials;for(const m of j.meshes||[])for(const p of m.primitives)delete p.material;
 const json=Buffer.from(JSON.stringify(j)),padding=(4-json.length%4)%4,jb=Buffer.concat([json,Buffer.alloc(padding,32)]),out=Buffer.alloc(28+jb.length+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jb.length,12);out.writeUInt32LE(0x4e4f534a,16);jb.copy(out,20);out.writeUInt32LE(bin.length,20+jb.length);out.writeUInt32LE(0x004e4942,24+jb.length);bin.copy(out,28+jb.length);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);return loader.parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');}
const target=await rig(cache+'scarlet.glb'),source=await rig('public/models/characters/modern/Male_Ranger.glb');
const anims=[...(await rig('public/models/characters/modern/gaits.glb')).animations,...(await rig('public/models/characters/modern/animations.glb')).animations];
target.scene.updateMatrixWorld(true);source.scene.updateMatrixWorld(true);
const targetBones=[],sourceBones=new Map();target.scene.traverse(n=>{if(n.isBone)targetBones.push(n);});source.scene.traverse(n=>{if(n.isBone)sourceBones.set(n.name,n);});
console.log('Target bones:',targetBones.map(n=>n.name).join(','));
function sourceName(n){const clean=n.replace(/_\d+$/,'').replaceAll('.','');
 const mix=n.match(/^mixamorig(Hips|Spine[12]?|Neck|Head|LeftShoulder|RightShoulder|LeftArm|RightArm|LeftForeArm|RightForeArm|LeftHand|RightHand|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftFoot|RightFoot|LeftToeBase|RightToeBase)_0\d*$/);if(mix){const key=mix[1],fixedMix={Hips:'pelvis',Spine:'spine_01',Spine1:'spine_02',Spine2:'spine_03',Neck:'neck_01',Head:'Head'};if(fixedMix[key])return fixedMix[key];const side=key.startsWith('Left')?'l':'r',part=key.replace(/^(Left|Right)/,'');return ({Shoulder:'clavicle',Arm:'upperarm',ForeArm:'lowerarm',Hand:'hand',UpLeg:'thigh',Leg:'calf',Foot:'foot',ToeBase:'ball'})[part]+'_'+side;}
 const fixed={rootx:'pelvis',spine_01x:'spine_03',neckx:'neck_01',headx:'Head'};if(fixed[clean])return fixed[clean];
 const m=clean.match(/^(shoulder|arm_stretch|forearm_stretch|hand|thigh_stretch|leg_stretch|foot|toes)([lr])$/);if(m)return ({shoulder:'clavicle',arm_stretch:'upperarm',forearm_stretch:'lowerarm',hand:'hand',thigh_stretch:'thigh',leg_stretch:'calf',foot:'foot',toes:'ball'})[m[1]]+'_'+m[2];
 return undefined;}
const rest=new Map(targetBones.map(n=>[n,{q:n.getWorldQuaternion(new T.Quaternion()),local:n.quaternion.clone()}])),srest=new Map([...sourceBones].map(([name,n])=>[name,n.getWorldQuaternion(new T.Quaternion()).invert()]));
// Calibrate the differing A/T bind poses by each bone's anatomical direction.
for(const n of targetBones){const sourceBone=sourceBones.get(sourceName(n.name)),child=n.children.find(c=>sourceBones.has(sourceName(c.name)));if(!sourceBone||!child)continue;const sourceChild=sourceBones.get(sourceName(child.name)),from=child.getWorldPosition(new T.Vector3()).sub(n.getWorldPosition(new T.Vector3())).normalize(),to=sourceChild.getWorldPosition(new T.Vector3()).sub(sourceBone.getWorldPosition(new T.Vector3())).normalize();if(from.length()&&to.length())rest.get(n).q.premultiply(new T.Quaternion().setFromUnitVectors(from,to));}
const doc=await io.read(cache+'scarlet.glb');for(const a of doc.getRoot().listAnimations())a.dispose();const nodes=new Map(doc.getRoot().listNodes().map(n=>[T.PropertyBinding.sanitizeNodeName(n.getName()),n]));
const mapped=targetBones.filter(n=>sourceBones.has(sourceName(n.name)));console.log('Mapped:',mapped.map(n=>n.name+'='+sourceName(n.name)).join(','));
for(const clip of anims){const mixer=new T.AnimationMixer(source.scene);mixer.clipAction(clip).play();const count=Math.ceil(clip.duration*24)+1,times=new Float32Array(count),values=new Map(mapped.map(n=>[n,new Float32Array(count*4)]));
 for(let i=0;i<count;i++){
  const t=Math.min(clip.duration-.00001,i/24);times[i]=Math.max(0,t);mixer.setTime(t);source.scene.updateMatrixWorld(true);
  for(const n of targetBones){const name=sourceName(n.name);if(name&&sourceBones.has(name)){const desired=sourceBones.get(name).getWorldQuaternion(new T.Quaternion()).multiply(srest.get(name)).multiply(rest.get(n).q),parent=n.parent.getWorldQuaternion(new T.Quaternion()).invert();n.quaternion.copy(parent.multiply(desired));values.get(n).set(n.quaternion.toArray(),i*4);}else n.quaternion.copy(rest.get(n).local);n.updateMatrixWorld(true);}
 }
 const animation=doc.createAnimation(clip.name),time=doc.createAccessor().setType('SCALAR').setArray(times).setBuffer(doc.getRoot().listBuffers()[0]);
 for(const n of mapped){const value=doc.createAccessor().setType('VEC4').setArray(values.get(n)).setBuffer(doc.getRoot().listBuffers()[0]),sampler=doc.createAnimationSampler().setInput(time).setOutput(value).setInterpolation('LINEAR');animation.addSampler(sampler);animation.addChannel(doc.createAnimationChannel().setSampler(sampler).setTargetNode(nodes.get(n.name)).setTargetPath('rotation'));}
 mixer.stopAllAction();
}
await doc.transform(prune(),dedup(),weld(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:86}),resample(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
await io.write('public/models/characters/modern/ScarletSorceress.glb',doc);
await writeFile('public/models/LICENSE-scarlet-sorceress.txt','Scarlet Witch — 3D Share\nhttps://sketchfab.com/3d-models/863cca848e2448e6b504a862cce80ae2\nCC BY 4.0 https://creativecommons.org/licenses/by/4.0/\nMirror: allenai/objaverse. Changes: compression, normalized scale, retargeted CC0 Quaternius animations.\n');

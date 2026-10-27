// Authored characters, CC BY 4.0; only compression, rig cleanup and CC0 clip retargeting are performed here.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,weld,meshopt,textureCompress,resample} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';

await MeshoptDecoder.ready;
async function rig(bytes){const b=Buffer.from(bytes),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),bin=b.subarray(28+b.readUInt32LE(12));delete j.images;delete j.textures;delete j.materials;for(const mesh of j.meshes||[])for(const p of mesh.primitives)delete p.material;
 const json=Buffer.from(JSON.stringify(j)),jb=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),out=Buffer.alloc(28+jb.length+bin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jb.length,12);out.writeUInt32LE(0x4e4f534a,16);jb.copy(out,20);out.writeUInt32LE(bin.length,20+jb.length);out.writeUInt32LE(0x004e4942,24+jb.length);bin.copy(out,28+jb.length);
 return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}

for(const name of ['LunarKnight','AstralMage','ForestArcher','ReaverKnight']){const g=await rig(await readFile('public/models/characters/modern/'+name+'.glb'));g.scene.updateMatrixWorld(true);const box=()=>{g.scene.traverse(n=>{if(n.isSkinnedMesh){n.skeleton.update();n.computeBoundingBox();}});return new T.Box3().setFromObject(g.scene).getSize(new T.Vector3());};const rest=box(),mix=new T.AnimationMixer(g.scene);let max=0,bad=0;for(const clip of g.animations){mix.stopAllAction();mix.clipAction(clip).play();for(const t of [0,clip.duration*.3,clip.duration*.7]){mix.setTime(t);g.scene.updateMatrixWorld(true);const size=box();if(!Number.isFinite(size.length()))bad++;max=Math.max(max,size.length()/rest.length());}}if(bad||max>2||g.animations.length<20||rest.y>400||!g.scene.getObjectByName('Head'))throw Error('Invalid authored rig: '+name);console.log(name,JSON.stringify({clips:g.animations.length,rest:rest.toArray(),maxPoseRatio:max,bad}));}

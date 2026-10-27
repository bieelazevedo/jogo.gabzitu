// Quaternius CC0 outfits and Universal Animation Library. Reproducible, pinned source.
import {NodeIO,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,weld,meshopt,textureCompress,resample} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {dirname,join,normalize} from 'node:path';
const REV='61053682b12462d5a0d847a0a819980222aabcce';
const BASE=`https://raw.githubusercontent.com/OpenAgentsInc/openagents/${REV}/assets/verse/characters/quaternius/`;
const CACHE='node_modules/.cache/modern-heroes',OUT='public/models/characters/modern';
async function download(name){const path=join(CACHE,name);try{await access(path);return path;}catch{}const r=await fetch(BASE+name);if(!r.ok)throw Error(r.status+' '+name);await mkdir(dirname(path),{recursive:true});await writeFile(path,Buffer.from(await r.arrayBuffer()));return path;}
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
await mkdir(OUT,{recursive:true});
async function readSource(name){const file=await download(name),json=JSON.parse(await readFile(file,'utf8'));await Promise.all([...(json.buffers||[]),...(json.images||[])].filter(x=>x.uri&&!x.uri.startsWith('data:')).map(x=>download(normalize(dirname(name)+'/'+x.uri).replaceAll('\\','/'))));return io.read(file);}
for(const name of ['Superhero_Male_FullBody','Superhero_Female_FullBody','Hair_SimpleParted','Hair_Long','Hair_Buzzed','Hair_Beard']){
 const doc=await readSource((name.startsWith('Hair')?'hair/':'base/')+name+'.gltf');
 if(!name.startsWith('Hair'))for(const node of doc.getRoot().listNodes()){
  const skin=node.getSkin(),mesh=node.getMesh();if(!skin||!mesh)continue;
  const ids=new Set(skin.listJoints().map((j,i)=>/^(Head|neck_01)$/.test(j.getName())?i:-1).filter(i=>i>=0));
  for(const p of mesh.listPrimitives()){
   const joints=p.getAttribute('JOINTS_0'),weights=p.getAttribute('WEIGHTS_0'),indices=p.getIndices();if(!joints||!weights||!indices)continue;
   const keep=v=>{const js=joints.getElement(v,[]),ws=weights.getElement(v,[]);return js.reduce((n,j,k)=>n+(ids.has(j)?ws[k]:0),0)>.75;};
   const out=[];for(let i=0;i<indices.getCount();i+=3){const t=[indices.getScalar(i),indices.getScalar(i+1),indices.getScalar(i+2)];if(t.every(keep))out.push(...t);}
   if(out.length)p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(out)).setBuffer(indices.getBuffer()));else mesh.removePrimitive(p);
  }
 }
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())p.setAttribute('COLOR_0',null);
 await doc.transform(prune(),dedup(),weld(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:86}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 await io.write(join(OUT,name+'.glb'),doc);console.log('Head/hair:',name);
}
for(const name of ['Male_Ranger','Female_Ranger','Male_Peasant','Female_Peasant']){
 const file=await download('outfits/'+name+'.gltf'),json=JSON.parse(await readFile(file,'utf8'));
 await Promise.all([...(json.buffers||[]),...(json.images||[])].filter(x=>x.uri&&!x.uri.startsWith('data:')).map(x=>download(normalize('outfits/'+x.uri).replaceAll('\\','/'))));
 const doc=await io.read(file);
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())p.setAttribute('COLOR_0',null);
 // Hood is removed to accommodate a genuinely feline head and its ears.
 for(const n of doc.getRoot().listNodes())if(/Head_Hood/.test(n.getName()))n.setMesh(null);
 await doc.transform(dedup(),prune(),weld(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:85}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 console.log(name,getBounds(doc.getRoot().getDefaultScene()));await io.write(join(OUT,name+'.glb'),doc);
}
for(const file of ['gaits.glb','animations.glb']){
 const doc=await io.read(await download(file));
 const needed=new Set(['Idle_Loop','Sword_Idle','Walk_Loop','Jog_Fwd_Loop','Death01','Hit_Chest','Jump_Loop','Roll','Pistol_Shoot','Spell_Simple_Shoot','Spell_Simple_Enter','Spell_Simple_Idle_Loop','Sword_Regular_A','Sword_Regular_B','Sword_Regular_C','Sword_Heavy_Combo','Sword_Dash','Sword_Block','Idle_Shield_Loop','Idle_FoldArms_Loop','OverhandThrow']);
 for(const a of doc.getRoot().listAnimations())if(!needed.has(a.getName()))a.dispose();
 for(const n of doc.getRoot().listNodes())n.setMesh(null);
 await doc.transform(prune({keepAttributes:false,keepLeaves:true}),resample(),dedup(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 await io.write(join(OUT,file),doc);
}
let license=`Quaternius — Modular Character Outfits / Universal Animation Library\nCC0. https://quaternius.com/packs/modularcharacteroutfitsfantasy.html\nMirror: OpenAgentsInc/openagents, revision ${REV}\nFeline heads are original procedural geometry in src/night-feline.ts.\n\n`;
for(const file of ['base-license.txt','outfits-license.txt','animations-license.txt'])license+=await readFile(await download(file),'utf8')+'\n';
await writeFile('public/models/LICENSE-quaternius-heroes.txt',license);

// CC0 Quaternius Medieval Village MegaKit, free standard subset, pinned mirror revision.
import {NodeIO,Document,getBounds} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,dedup,prune,weld,meshopt,textureCompress,unpartition} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {dirname,join} from 'node:path';
const REV='21104b4045261c28fc312360841ed1a7b0ac8782';
const BASE=`https://raw.githubusercontent.com/J-Ponzo/gltf-medieval-village-megakit/${REV}/`;
const CACHE='node_modules/.cache/medieval',OUT='public/models/env/medieval.glb';
const names=['Wall_Plaster_Straight','Wall_Plaster_Window_Wide_Flat','Wall_Plaster_Door_Round','Wall_UnevenBrick_Straight','Wall_Plaster_WoodGrid','Roof_RoundTiles_4x6','Roof_RoundTiles_6x8','Roof_Front_Brick4','Roof_Front_Brick6','Roof_Dormer_RoundTile','Prop_Chimney','Prop_Crate','Prop_Wagon','Prop_Vine1','Prop_Vine4','DoorFrame_Round_WoodDark','Door_2_Round','WindowShutters_Wide_Flat_Open','Window_Wide_Flat1','Floor_WoodDark','Floor_UnevenBrick','Balcony_Cross_Straight','Stairs_Exterior_Straight','Corner_Exterior_Wood','Prop_WoodenFence_Single'];
const pending=new Map();
const download=name=>{if(pending.has(name))return pending.get(name);const p=(async()=>{const file=join(CACHE,name);try{await access(file);return file;}catch{}const r=await fetch(BASE+name);if(!r.ok)throw Error(r.status+' '+name);await mkdir(dirname(file),{recursive:true});await writeFile(file,Buffer.from(await r.arrayBuffer()));return file;})();pending.set(name,p);return p;};
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder});
const doc=new Document(),scene=doc.createScene('Quaternius Medieval Village');doc.getRoot().setDefaultScene(scene);const bounds={};
for(const name of names){const file=await download('glTF/'+name+'.gltf'),json=JSON.parse(await readFile(file,'utf8'));
 await Promise.all([...(json.buffers||[]),...(json.images||[])].filter(x=>x.uri&&!x.uri.startsWith('data:')).map(x=>download('glTF/'+x.uri)));
 const source=await io.read(file),map=mergeDocuments(doc,source),copy=map.get(source.getRoot().getDefaultScene());
 const holder=doc.createNode('medieval-'+name);for(const child of copy.listChildren())holder.addChild(child);scene.addChild(holder);copy.dispose();bounds[name]=getBounds(holder);
}
await doc.transform(unpartition(),dedup(),prune(),weld(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:83}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
await mkdir(dirname(OUT),{recursive:true});await io.write(OUT,doc);
await writeFile(join(CACHE,'bounds.json'),JSON.stringify(bounds,null,2));
await download('LICENSE');await writeFile('public/models/LICENSE-quaternius-medieval.txt',await readFile(join(CACHE,'LICENSE')));
console.log('Medieval: '+names.length+' módulos. Dimensões em '+join(CACHE,'bounds.json'));

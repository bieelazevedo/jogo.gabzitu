import {NodeIO,Document} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,prune,dedup,weld,meshopt,textureCompress,unpartition} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {dirname,join} from 'node:path';
const REV='db3df04d1e4714298a09510b26fb6de6645138a2',BASE=`https://raw.githubusercontent.com/agentkaerf/FreeModels/${REV}/Fantasy%20Props%20MegaKit%5BStandard%5D/Exports/glTF/`,CACHE='node_modules/.cache/epic-weapons';
async function get(name){const file=join(CACHE,name);try{await access(file);return file;}catch{}const r=await fetch(BASE+name);if(!r.ok)throw Error(r.status+' '+name);await mkdir(dirname(file),{recursive:true});await writeFile(file,Buffer.from(await r.arrayBuffer()));return file;}
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder,'meshopt.encoder':MeshoptEncoder}),doc=new Document(),scene=doc.createScene('PBR weapons');
for(const name of ['Sword_Bronze','Axe_Bronze','Shield_Wooden']){const file=await get(name+'.gltf'),json=JSON.parse(await readFile(file,'utf8'));await Promise.all([...(json.buffers||[]),...(json.images||[])].filter(x=>x.uri).map(x=>get(x.uri)));const source=await io.read(file),map=mergeDocuments(doc,source),copy=map.get(source.getRoot().getDefaultScene()),holder=doc.createNode('weapon-'+name);for(const n of copy.listChildren())holder.addChild(n);scene.addChild(holder);copy.dispose();}
await doc.transform(unpartition(),prune(),dedup(),weld(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024],quality:87}),meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write('public/models/env/weapons.glb',doc);
await writeFile('public/models/LICENSE-quaternius-weapons.txt',`Quaternius — Fantasy Props MegaKit, Standard\nhttps://quaternius.com/packs/fantasypropsmegakit.html\nCC0 1.0. Mirror agentkaerf/FreeModels revision ${REV}.\nChanges: texture and geometry compression.\n`);

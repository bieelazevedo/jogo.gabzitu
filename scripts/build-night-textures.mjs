// Optional, reproducible asset preparation. Runtime loads only these local WebP files.
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const out='public/textures/night';await mkdir(out,{recursive:true});
for(const [asset,prefix] of [['forest_ground_04','forest'],['stone_wall','stone'],['leafy_grass','grass']]){
 if(process.argv[2]&&process.argv[2]!==prefix)continue;
 const response=await fetch('https://api.polyhaven.com/files/'+asset);if(!response.ok)throw Error(response.status+' '+asset);
 const files=await response.json();
 for(const [key,suffix] of [['Diffuse','color'],['nor_gl','normal']]){
  if(prefix==='grass'&&key!=='Diffuse')continue;
  const source=files[key]['1k'].jpg,url=source.url;
  const r=await fetch(url);if(!r.ok)throw Error(r.status+' '+url);
  const data=await sharp(Buffer.from(await r.arrayBuffer())).webp({quality:key==='nor_gl'?90:82}).toBuffer();
  await writeFile(`${out}/${prefix}-${suffix}.webp`,data);console.log(prefix+'-'+suffix,Math.round(data.length/1024)+' KB');
 }
}

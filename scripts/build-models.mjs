// Downloads the CC0 KayKit packs used by Gato Nightreign and bakes compact GLBs into public/models.
// Run: node scripts/build-models.mjs   (dev only; the generated files are committed)
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,meshopt,resample,textureCompress,unpartition,mergeDocuments,weld} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import AdmZip from 'adm-zip';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {dirname,join} from 'node:path';

const CDN='https://cdn.jsdelivr.net/gh/KayKit-Game-Assets/';
const CACHE='node_modules/.cache/kaykit';
const OUT='public/models';
// Optional pack name: rebuild only that environment pack (e.g. node scripts/build-models.mjs hex).
const ONLY=process.argv[2];
const ADV='KayKit-Character-Pack-Adventures-1.0@main/addons/kaykit_character_pack_adventures/';
const SKEL='KayKit-Character-Pack-Skeletons-1.0@main/addons/kaykit_character_pack_skeletons/';
const CHARACTERS={
 Knight:ADV+'Characters/gltf/Knight.glb',Barbarian:ADV+'Characters/gltf/Barbarian.glb',Mage:ADV+'Characters/gltf/Mage.glb',Rogue:ADV+'Characters/gltf/Rogue.glb',Rogue_Hooded:ADV+'Characters/gltf/Rogue_Hooded.glb',
 Skeleton_Warrior:SKEL+'Characters/gltf/Skeleton_Warrior.glb',Skeleton_Minion:SKEL+'Characters/gltf/Skeleton_Minion.glb',Skeleton_Rogue:SKEL+'Characters/gltf/Skeleton_Rogue.glb',Skeleton_Mage:SKEL+'Characters/gltf/Skeleton_Mage.glb',
};
// Skeleton weapons are separate assets; they are merged into the props pack.
const SKELETON_ITEMS='Skeleton_Axe Skeleton_Blade Skeleton_Crossbow Skeleton_Staff Skeleton_Shield_Large_A Skeleton_Shield_Small_A Skeleton_Arrow';
// Every character shares the same KayKit rig, so one clip library drives all of them.
const CLIPS='Idle Idle_Combat 2H_Melee_Idle Walking_A Walking_D_Skeletons Running_A Running_B Running_C 1H_Melee_Attack_Slice_Diagonal 1H_Melee_Attack_Slice_Horizontal 1H_Melee_Attack_Chop 1H_Melee_Attack_Stab 1H_Melee_Attack_Jump_Chop 2H_Melee_Attack_Chop 2H_Melee_Attack_Slice 2H_Melee_Attack_Spin 2H_Melee_Attack_Stab Dualwield_Melee_Attack_Chop Dualwield_Melee_Attack_Slice Dualwield_Melee_Attack_Stab 1H_Ranged_Shoot 2H_Ranged_Shoot 2H_Ranged_Aiming Spellcast_Shoot Spellcast_Raise Spellcast_Long Spellcast_Summon Block Blocking Block_Hit Dodge_Forward Dodge_Backward Dodge_Left Dodge_Right Hit_A Hit_B Death_A Death_A_Pose Death_B Jump_Full_Short Jump_Idle Cheer Taunt Spawn_Ground_Skeletons Throw Use_Item PickUp'.split(' ');
const PACKS={
 halloween:{base:'KayKit-Halloween-Bits-1.0@main/addons/kaykit_halloween_bits/Assets/gltf/',ext:'gltf',items:'floor_dirt floor_dirt_small floor_dirt_grave path_A path_B path_C path_D arch arch_gate crypt grave_A grave_B gravestone gravemarker_A gravemarker_B fence fence_broken fence_pillar lantern_standing post_lantern pillar shrine_candles skull_candle candle_triple tree_dead_large tree_dead_medium tree_dead_small tree_pine_yellow_large tree_pine_orange_medium pumpkin_orange_jackolantern coffin_decorated bone_A ribcage bench_decorated plaque_candles'},
 village:{base:'KayKit-Medieval-Hexagon-Pack-1.0@main/addons/kaykit_medieval_hexagon_pack/Assets/gltf/',ext:'gltf',items:'tiles/base/hex_grass buildings/red/building_home_A_red buildings/red/building_home_B_red buildings/red/building_tavern_red buildings/red/building_church_red buildings/red/building_tower_A_red buildings/red/building_well_red buildings/red/building_blacksmith_red buildings/neutral/building_destroyed buildings/neutral/wall_straight buildings/neutral/fence_wood_straight decoration/nature/trees_A_large decoration/nature/trees_A_medium decoration/nature/trees_B_large decoration/nature/trees_B_medium decoration/nature/tree_single_A decoration/nature/tree_single_B decoration/nature/rock_single_A decoration/nature/rock_single_B decoration/nature/rock_single_C decoration/nature/rock_single_D decoration/nature/rock_single_E decoration/nature/mountain_A_grass_trees decoration/nature/mountain_B_grass_trees decoration/nature/mountain_C decoration/nature/hills_A_trees decoration/nature/hills_B_trees decoration/props/barrel decoration/props/crate_A_big decoration/props/sack decoration/props/tent decoration/props/weaponrack decoration/props/wheelbarrow decoration/props/flag_red decoration/props/resource_lumber'},
 // Tower defense battlefields: the full KayKit Medieval Hexagon tile set (roads, rivers, coast) plus buildings for the refuge.
 hex:{base:'KayKit-Medieval-Hexagon-Pack-1.0@main/addons/kaykit_medieval_hexagon_pack/Assets/gltf/',ext:'gltf',items:'tiles/base/hex_grass tiles/base/hex_grass_bottom tiles/base/hex_water tiles/base/hex_grass_sloped_high tiles/base/hex_grass_sloped_low tiles/roads/hex_road_A tiles/roads/hex_road_B tiles/roads/hex_road_C tiles/roads/hex_road_D tiles/roads/hex_road_E tiles/roads/hex_road_F tiles/roads/hex_road_G tiles/roads/hex_road_H tiles/roads/hex_road_I tiles/roads/hex_road_J tiles/roads/hex_road_K tiles/roads/hex_road_L tiles/roads/hex_road_M tiles/roads/hex_road_A_sloped_high tiles/roads/hex_road_A_sloped_low tiles/rivers/hex_river_A tiles/rivers/hex_river_A_curvy tiles/rivers/hex_river_B tiles/rivers/hex_river_C tiles/rivers/hex_river_crossing_A tiles/rivers/hex_river_crossing_B tiles/rivers/hex_river_D tiles/rivers/hex_river_E tiles/rivers/hex_river_F tiles/rivers/hex_river_G tiles/rivers/hex_river_H tiles/rivers/hex_river_I tiles/rivers/hex_river_J tiles/rivers/hex_river_K tiles/rivers/hex_river_L tiles/coast/hex_coast_A tiles/coast/hex_coast_B tiles/coast/hex_coast_C tiles/coast/hex_coast_D tiles/coast/hex_coast_E buildings/blue/building_castle_blue buildings/blue/building_tower_A_blue buildings/blue/building_tower_B_blue buildings/blue/building_tower_base_blue buildings/blue/building_tower_catapult_blue buildings/blue/building_archeryrange_blue buildings/blue/building_barracks_blue buildings/blue/building_windmill_blue buildings/blue/building_watermill_blue buildings/blue/building_market_blue buildings/blue/building_home_A_blue buildings/blue/building_home_B_blue buildings/blue/building_church_blue buildings/blue/building_well_blue buildings/blue/building_lumbermill_blue buildings/blue/building_mine_blue buildings/blue/building_blacksmith_blue buildings/blue/building_tavern_blue buildings/red/building_castle_red buildings/red/building_tower_A_red buildings/red/building_tower_B_red buildings/red/building_barracks_red buildings/neutral/building_dirt buildings/neutral/building_stage_A buildings/neutral/building_bridge_A buildings/neutral/building_bridge_B buildings/neutral/building_destroyed buildings/neutral/building_scaffolding buildings/neutral/building_grain buildings/neutral/wall_straight buildings/neutral/wall_straight_gate buildings/neutral/wall_corner_A_outside buildings/neutral/wall_corner_A_inside buildings/neutral/fence_stone_straight buildings/neutral/fence_stone_straight_gate buildings/neutral/fence_wood_straight decoration/nature/hills_A decoration/nature/hills_B decoration/nature/hills_C decoration/nature/hills_A_trees decoration/nature/hills_B_trees decoration/nature/hills_C_trees decoration/nature/hill_single_A decoration/nature/hill_single_B decoration/nature/hill_single_C decoration/nature/mountain_A_grass_trees decoration/nature/mountain_B_grass_trees decoration/nature/mountain_C_grass_trees decoration/nature/mountain_A decoration/nature/mountain_B decoration/nature/trees_A_small decoration/nature/trees_A_medium decoration/nature/trees_A_large decoration/nature/trees_B_small decoration/nature/trees_B_medium decoration/nature/trees_B_large decoration/nature/tree_single_A decoration/nature/tree_single_B decoration/nature/trees_A_cut decoration/nature/rock_single_A decoration/nature/rock_single_B decoration/nature/rock_single_C decoration/nature/rock_single_D decoration/nature/rock_single_E decoration/nature/waterlily_A decoration/nature/waterlily_B decoration/nature/waterplant_A decoration/nature/waterplant_B decoration/nature/cloud_big decoration/nature/cloud_small decoration/props/flag_blue decoration/props/flag_red decoration/props/tent decoration/props/crate_A_big decoration/props/crate_B_small decoration/props/barrel decoration/props/target decoration/props/bucket_arrows decoration/props/weaponrack decoration/props/sack decoration/props/resource_stone decoration/props/resource_lumber decoration/props/wheelbarrow decoration/props/ladder decoration/props/pallet'},
 dungeon:{base:'KayKit-Dungeon-Remastered-1.0@main/addons/kaykit_dungeon_remastered/Assets/gltf/',ext:'gltf.glb',items:'column coin_stack_large coin_stack_small torch_lit torch_mounted banner_patternA_red banner_patternB_blue banner_thin_red barrel_large crates_stacked floor_tile_large floor_tile_large_rocks wall_arched wall_pillar pillar pillar_decorated sword_shield candle_triple bottle_A_green bottle_B_brown keg_decorated'},
 items:{base:ADV+'Assets/gltf/',ext:'gltf',items:'sword_1handed sword_2handed axe_1handed shield_round shield_badge_color dagger crossbow_2handed staff wand spellbook_open quiver arrow_bundle smokebomb mug_full'},
 skeleton_items:{base:SKEL+'Assets/gltf/',ext:'gltf',items:SKELETON_ITEMS},
};
const LICENSES={adventurers:ADV+'LICENSE.txt',skeletons:SKEL+'LICENSE.txt'};

const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
/** Disposing an Animation leaves its samplers alive, which keeps their accessors from being pruned. Accessors may be shared between clips, so prune() removes them. */
const dropAnimation=a=>{a.listSamplers().forEach(s=>s.dispose());a.listChannels().forEach(c=>c.dispose());a.dispose();};
const exists=p=>access(p).then(()=>true,()=>false);
async function fetchTo(path,dst){if(await exists(dst))return;const r=await fetch(CDN+path);if(!r.ok)throw Error(`${r.status} ${path}`);await mkdir(dirname(dst),{recursive:true});await writeFile(dst,Buffer.from(await r.arrayBuffer()));}
async function fetchGltf(base,item,ext,dir){
 const dst=join(dir,item.split('/').pop()+'.'+ext);await fetchTo(base+item+'.'+ext,dst);
 if(ext==='gltf'){const json=JSON.parse(await readFile(dst,'utf8')),folder=item.includes('/')?item.slice(0,item.lastIndexOf('/')+1):'';for(const x of [...(json.buffers||[]),...(json.images||[])])if(x.uri&&!x.uri.startsWith('data:'))await fetchTo(base+folder+x.uri,join(dir,x.uri));}
 return dst;
}
async function finish(doc,file,texture=512){
 await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[texture,texture]}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
 await mkdir(dirname(file),{recursive:true});await io.write(file,doc);
 console.log(file,Math.round((await readFile(file)).length/1024)+' KB');
}

await mkdir(CACHE,{recursive:true});
await fetchTo(CHARACTERS.Rogue,join(CACHE,'Rogue.glb'));
/** Recolours the green/teal cloth swatches of a KayKit palette texture, leaving skin, hair and leather untouched. */
async function recolor(doc,hue){
 for(const t of doc.getRoot().listTextures()){const {data,info}=await sharp(Buffer.from(t.getImage())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let i=0;i<data.length;i+=4){const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;if(d<.08)continue;
   let h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h*=60;if(h<0)h+=360;if(h<120||h>200)continue;
   const sat=Math.min(1,d/(1-Math.abs(2*l-1))*1.15),light=Math.max(.12,l*.9),c=(1-Math.abs(2*light-1))*sat,x=c*(1-Math.abs((hue/60)%2-1)),m=light-c/2;
   const [rr,gg,bb]=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];data[i]=(rr+m)*255;data[i+1]=(gg+m)*255;data[i+2]=(bb+m)*255;}
  t.setImage(await sharp(data,{raw:info}).png().toBuffer()).setMimeType('image/png');}
}
// Carmesim: the female Rogue adventurer with her cloth recoloured to crimson.
if(!ONLY){const doc=await io.read(join(CACHE,'Rogue.glb'));doc.getRoot().listAnimations().forEach(dropAnimation);await recolor(doc,350);await finish(doc,join(OUT,'characters','Rogue_Crimson.glb'));}
if(!ONLY)for(const [name,path] of Object.entries(CHARACTERS)){
 const src=join(CACHE,name+'.glb');await fetchTo(path,src);const doc=await io.read(src);
 doc.getRoot().listAnimations().forEach(dropAnimation);
 await finish(doc,join(OUT,'characters',name+'.glb'));
}
if(!ONLY){const doc=await io.read(join(CACHE,'Skeleton_Warrior.glb')),root=doc.getRoot();
 for(const a of root.listAnimations())if(!CLIPS.includes(a.getName()))dropAnimation(a);
 for(const n of root.listNodes())if(n.getMesh()){n.getMesh().dispose();n.dispose();}
 root.listSkins().forEach(s=>s.dispose());root.listTextures().forEach(t=>t.dispose());root.listMaterials().forEach(m=>m.dispose());
 await doc.transform(resample());await finish(doc,join(OUT,'characters','anims.glb'));}
for(const [pack,{base,ext,items}] of Object.entries(PACKS)){if(ONLY&&ONLY!==pack)continue;
 const target=new (await import('@gltf-transform/core')).Document(),scene=target.createScene(pack);target.getRoot().setDefaultScene(scene);
 for(const item of items.split(' ')){
  const src=await io.read(await fetchGltf(base,item,ext,join(CACHE,pack)));
  const map=mergeDocuments(target,src),copy=map.get(src.getRoot().getDefaultScene()||src.getRoot().listScenes()[0]);
  const holder=target.createNode(item.split('/').pop());for(const child of copy.listChildren())holder.addChild(child);scene.addChild(holder);copy.dispose();
 }
 await target.transform(unpartition(),weld());await finish(target,join(OUT,'env',pack+'.glb'));
}
// Kenney Nature Kit (CC0): detailed trees, bushes, mushrooms, flowers and rocks for the forest.
const KENNEY_NATURE='https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip';
const NATURE='tree_pineTallA_detailed tree_pineTallC_detailed tree_detailed_dark tree_oak_dark tree_fat_darkh tree_pineRoundE tree_pineDefaultA tree_default_fall tree_detailed_fall plant_bushDetailed plant_bushLarge plant_bushTriangle mushroom_redGroup mushroom_red mushroom_tanTall flower_purpleA flower_redA flower_yellowA grass_leafsLarge grass rock_largeA rock_tallB stone_tallA stone_largeB stump_oldTall stump_roundDetailed log_large log_stackLarge campfire_stones hanging_moss statue_ring statue_head'.split(' ');
if(!ONLY||ONLY==='nature'){const zipPath=join(CACHE,'kenney_nature-kit.zip');if(!await exists(zipPath)){const r=await fetch(KENNEY_NATURE);if(!r.ok)throw Error(r.status+' nature kit');await writeFile(zipPath,Buffer.from(await r.arrayBuffer()));}
 const zip=new AdmZip(zipPath),target=new (await import('@gltf-transform/core')).Document(),scene=target.createScene('nature');target.getRoot().setDefaultScene(scene);
 for(const item of NATURE){const entry=zip.getEntry(`Models/GLTF format/${item}.glb`);if(!entry)throw Error('Em falta: '+item);const src=await io.readBinary(new Uint8Array(entry.getData()));
  // Unlit flat colours look pasted-on under the moon; lit materials blend with the rest of the world.
  for(const m of src.getRoot().listMaterials()){for(const ext of m.listExtensions())ext.dispose?.();m.setExtension('KHR_materials_unlit',null);m.setRoughnessFactor(.85).setMetallicFactor(0);}
  const map=mergeDocuments(target,src),copy=map.get(src.getRoot().getDefaultScene()||src.getRoot().listScenes()[0]);const holder=target.createNode(item);for(const child of copy.listChildren())holder.addChild(child);scene.addChild(holder);copy.dispose();}
 target.getRoot().listExtensionsUsed().filter(e=>e.extensionName==='KHR_materials_unlit').forEach(e=>e.dispose());
 await target.transform(unpartition(),weld());await finish(target,join(OUT,'env','nature.glb'));
 await writeFile(join(OUT,'LICENSE-kenney-nature-kit.txt'),zip.getEntry('License.txt').getData());}
// Kenney Tower Defense Kit (CC0): modular stone towers, build foundations, spawn pad and siege ammo.
const KENNEY_TD='https://kenney.nl/media/pages/assets/tower-defense-kit/a402493eaa-1726471567/kenney_tower-defense-kit.zip';
const TDKIT='tower-round-base tower-round-bottom-a tower-round-bottom-b tower-round-bottom-c tower-round-middle-a tower-round-middle-b tower-round-middle-c tower-round-top-a tower-round-top-b tower-round-top-c tower-round-crystals spawn-round selection-a weapon-ballista weapon-cannon weapon-catapult weapon-ammo-arrow weapon-ammo-boulder weapon-ammo-cannonball detail-tree detail-tree-large detail-rocks detail-rocks-large detail-crystal detail-crystal-large wood-structure'.split(' ');
if(!ONLY||ONLY==='tdkit'){const zipPath=join(CACHE,'kenney_tower-defense-kit.zip');if(!await exists(zipPath)){const r=await fetch(KENNEY_TD);if(!r.ok)throw Error(r.status+' td kit');await writeFile(zipPath,Buffer.from(await r.arrayBuffer()));}
 const zip=new AdmZip(zipPath),target=new (await import('@gltf-transform/core')).Document(),scene=target.createScene('tdkit');target.getRoot().setDefaultScene(scene);
 const dir=join(CACHE,'tdkit');zip.extractEntryTo('Models/GLB format/',dir,false,true);
 for(const item of TDKIT){if(!await exists(join(dir,item+'.glb')))throw Error('Em falta: '+item);const src=await io.read(join(dir,item+'.glb'));
  for(const m of src.getRoot().listMaterials())m.setRoughnessFactor(.8).setMetallicFactor(0);
  const map=mergeDocuments(target,src),copy=map.get(src.getRoot().getDefaultScene()||src.getRoot().listScenes()[0]);const holder=target.createNode(item);for(const child of copy.listChildren())holder.addChild(child);scene.addChild(holder);copy.dispose();}
 await target.transform(unpartition(),weld());await finish(target,join(OUT,'env','tdkit.glb'));
 await writeFile(join(OUT,'LICENSE-kenney-tower-defense-kit.txt'),zip.getEntry('License.txt').getData());}
for(const [name,path] of Object.entries(LICENSES))await fetchTo(path,join(OUT,`LICENSE-kaykit-${name}.txt`));

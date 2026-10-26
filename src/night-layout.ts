import * as T from 'three';
import {NIGHT_CAMPS,NIGHT_OBSTACLES,NIGHT_PORTALS,NIGHT_SPRINGS} from './night-data';
import type {NightAssets} from './night-assets';

/** [x, z, rotationY, scale, y] */
type Place=[number,number,number?,number?,number?];
const VILLAGE=5.5; // the hexagon pack is modelled at roughly 1/5.5 of the character scale
const hash=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const facing=(x:number,z:number,tx=0,tz=0)=>Math.atan2(tx-x,tz-z);

/**
 * Dresses the expedition map with CC0 KayKit models. Every repeated prop is one InstancedMesh per part,
 * so the whole world costs a few dozen draw calls. Solid props sit on NIGHT_OBSTACLES so the
 * visuals match the host simulation's collisions; everything else stays clear of camps, paths and portals.
 */
export function dressNightWorld(assets:NightAssets,root:T.Object3D){
 const meshes:T.InstancedMesh[]=[],m=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);
 const scatter=(name:string,places:Place[],scale=1)=>{
  const parts=assets.parts(name);if(!parts.length||!places.length)return;
  for(const part of parts){const mesh=new T.InstancedMesh(part.geometry,part.material,places.length);
   places.forEach(([x,z,r=0,s=1,y=0],i)=>{q.setFromAxisAngle(up,r);m.compose(new T.Vector3(x,y,z),q,new T.Vector3().setScalar(s*scale));mesh.setMatrixAt(i,m.multiply(part.matrix));});
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.computeBoundingBox();root.add(mesh);meshes.push(mesh);}
 };
 const obstacle=(x:number,z:number)=>NIGHT_OBSTACLES.find(o=>Math.hypot(o.x-x,o.z-z)<.5)!;

 // Sanctuary: tiled court, decorated pillars, an entrance arch and candle-lit benches.
 const tiles:Place[]=[];for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)tiles.push([i*4,27+j*4,0,1,-.06]);
 scatter('floor_tile_large',tiles);
 scatter('pillar_decorated',[[-6,25,0,.9],[6,25,Math.PI,.9],[-6,31,0,.75],[6,31,Math.PI,.75]]);
 scatter('arch',[[0,20.4,0,1.15]]);
 scatter('column',[[0,27,0,1.15]]);
 scatter('bench_decorated',[[-3.6,31.8,Math.PI],[3.6,31.8,Math.PI]]);
 scatter('candle_triple',[[-5.2,22.6],[5.2,22.6],[-1.8,32.6],[1.8,32.6],[-5.5,29],[5.5,29]]);
 scatter('lantern_standing',[[-2.6,21.3],[2.6,21.3]]);
 scatter('plaque_candles',[[0,33.2,Math.PI]]);
 scatter('banner_patternA_red',[[-6,25.8,0,.9,1.4],[6,25.8,0,.9,1.4]]);

 // Forest of whispers: autumn pines on the solid trunks, dead trees and jack-o'-lanterns along the edges.
 const forestTrunks=NIGHT_OBSTACLES.filter(o=>o.x<0&&o.z>0&&Math.abs(o.x)<40||(o.x===-40&&o.z===7));
 scatter('tree_pine_yellow_large',forestTrunks.map((o,i)=>[o.x,o.z,i*1.7,1.1] as Place));
 scatter('tree_pine_orange_medium',[[-44,30,.4,1.2],[-27,33,2,1],[-12,22,1,.9],[-46,15,3,1.1],[-26,26,.8,.8],[-41,-4,2.2,1]]);
 scatter('tree_pine_yellow_large',[[-34,31,1,.9],[-19,30,2.5,1],[-48,24,.3,1.1]]);
 scatter('tree_dead_large',[[-25,18,.5],[-44,-8,2]]);
 scatter('tree_dead_medium',[[-12,4,1.2],[-30,-2,3]]);
 scatter('pumpkin_orange_jackolantern',[[-21,21,.6,.7],[-31,9,2.4,.6],[-42,12,1,.7],[-16,13,4,.55]]);
 scatter('trees_A_medium',[[-36,26,0],[-23,11,2],[-45,0,4]],VILLAGE*.8);

 // Village without tomorrow: houses on the three solid footprints, a well and work yards.
 scatter('building_tavern_red',[[21,4,facing(21,4,8,16)]],VILLAGE);
 scatter('building_home_B_red',[[34,13,facing(34,13,20,22)]],VILLAGE);
 scatter('building_blacksmith_red',[[30,-3,facing(30,-3,20,-20)]],VILLAGE*.95);
 scatter('building_destroyed',[[15,-3,2.2]],VILLAGE*.9);
 scatter('building_tower_A_red',[[41,-9,.6]],VILLAGE);
 scatter('building_well_red',[[26.5,12.6,0]],VILLAGE*.9);
 scatter('building_home_A_red',[[41,20,3.6]],VILLAGE);
 scatter('barrel',[[18.2,7.2,0],[18.9,7.8,1],[24.4,1.4,0],[36.7,9.6,2],[33.4,-.2,1],[26.6,-5.6,3]],VILLAGE);
 scatter('crate_A_big',[[23.9,7.6,.3],[37.4,15.8,1.1],[33.6,-6,0],[17.7,1.2,.6]],VILLAGE);
 scatter('wheelbarrow',[[31.5,16.7,1.2],[15.4,6.2,2]],VILLAGE);
 scatter('sack',[[19.2,8.5,0],[37,10,1],[27.5,-6.4,2]],VILLAGE);
 scatter('weaponrack',[[33.7,-6.7,Math.PI]],VILLAGE);
 scatter('fence_wood_straight',[[44,5,0],[44,11,0],[44,-1,0],[17,21,Math.PI/2],[23,21,Math.PI/2]],VILLAGE);
 scatter('flag_red',[[21,7.8,0,1,3.2],[30,1.8,Math.PI,1,3]],VILLAGE);

 // Velvet crypts: a mausoleum on the solid footprint, graves, fences and a guarded gate.
 scatter('crypt',[[-19,-33,facing(-19,-33,-24,-25),.55]]);
 scatter('tree_dead_large',[[-34,-23,1.1,1.25]]);
 const graves:Place[]=[];for(let i=0;i<9;i++){const x=-36+(i%3)*5,z=-37+Math.floor(i/3)*5;graves.push([x,z,(hash(i)-.5)*.3]);}
 scatter('grave_A',graves.filter((_,i)=>i%3===0));scatter('grave_B',graves.filter((_,i)=>i%3===1));scatter('gravestone',graves.filter((_,i)=>i%3===2).map(([x,z,r])=>[x,z-.8,r] as Place));
 scatter('gravemarker_A',[[-28,-20,.3],[-14,-31,1],[-40,-26,2],[-22,-38,.4]]);scatter('gravemarker_B',[[-31,-19,.6],[-17,-38,2.2],[-41,-33,1.4]]);
 const fence:Place[]=[];for(let i=0;i<5;i++)fence.push([-40+i*4,-42,0]);for(let i=0;i<5;i++)fence.push([-43,-38+i*4,Math.PI/2]);
 scatter('fence',fence.filter((_,i)=>i%3!==1));scatter('fence_broken',fence.filter((_,i)=>i%3===1));
 scatter('arch_gate',[[-24.5,-17.5,facing(-24.5,-17.5,-24,-25)]]);
 scatter('post_lantern',[[-27.6,-17.2,0],[-21.4,-17.2,Math.PI],[-31,-29,1.6],[-15,-27,4.7]]);
 scatter('skull_candle',[[-33,-37.6],[-28,-32.6],[-23,-37.6]]);
 scatter('coffin_decorated',[[-38,-21,.5]]);
 scatter('ribcage',[[-27,-29,1],[-17,-29,2]]);scatter('bone_A',[[-26,-28,.4],[-18,-30,1.5],[-33,-26,2.7]]);
 scatter('shrine_candles',[[-19,-28.6,facing(-19,-28.6,-24,-25)]]);

 // Broken crown: a colonnade around the orrery, a sealed pillar, war trophies and treasure.
 const columns:Place[]=[];for(let i=0;i<10;i++){const a=i/10*Math.PI*2;columns.push([25+Math.sin(a)*10,-29+Math.cos(a)*10,a,.85]);}
 scatter('pillar',columns.filter((_,i)=>i%3!==0));scatter('column',columns.filter((_,i)=>i%3===0).map(([x,z,r])=>[x,z,r,1.4] as Place));
 const sealed=obstacle(19,-23);scatter('pillar_decorated',[[sealed.x,sealed.z,.4,.9]]);
 scatter('banner_thin_red',[[25,-18.4,Math.PI,.9,1.8],[25,-39.6,0,.9,1.8]]);
 scatter('sword_shield',[[31,-22,1.2,.9,.4],[18,-31,4,.9,.4]]);
 scatter('coin_stack_large',[[25,-26,0,.8]]);scatter('coin_stack_small',[[23.4,-31.2,1],[27,-31.6,2]]);
 scatter('candle_triple',[[22.4,-27,0],[27.6,-27,0],[25,-32,0]]);
 scatter('crates_stacked',[[40,-35,.5,.9]]);scatter('keg_decorated',[[10,-40,2,.8]]);

 // Portals sit inside arches turned towards the centre of the map.
 scatter('arch',NIGHT_PORTALS.map(p=>[p.x,p.z,facing(p.x,p.z),.95] as Place));
 // Healing springs are ringed with rocks.
 const rocks:Place[]=[];NIGHT_SPRINGS.forEach((p,i)=>{for(let k=0;k<5;k++){const a=k/5*Math.PI*2+i;rocks.push([p.x+Math.sin(a)*2.5,p.z+Math.cos(a)*2.5,a,.9+hash(i*5+k)*.5]);}});
 scatter('rock_single_C',rocks.filter((_,i)=>i%2===0),VILLAGE);scatter('rock_single_E',rocks.filter((_,i)=>i%2===1),VILLAGE);

 // Enemy camps: a fire pit and a tent on the side facing away from the centre, never on the fighting spot.
 const tents:Place[]=[],logs:Place[]=[],racks:Place[]=[];
 NIGHT_CAMPS.forEach((c,i)=>{const a=Math.atan2(c.x,c.z)+(hash(i)-.5);tents.push([c.x+Math.sin(a)*4.5,c.z+Math.cos(a)*4.5,a+Math.PI]);logs.push([c.x,c.z,i]);if(i%2)racks.push([c.x-Math.sin(a)*3.6,c.z-Math.cos(a)*3.6,a]);});
 scatter('tent',tents,VILLAGE*.75);scatter('resource_lumber',logs,VILLAGE*.45);scatter('weaponrack',racks,VILLAGE);

 // The forest wall on the east/west borders matches the obstacle ring; a denser forest and mountains lie beyond.
 scatter('tree_single_A',NIGHT_OBSTACLES.filter(o=>Math.abs(o.x)>40&&!(o.x===-40&&o.z===7)).map((o,i)=>[o.x,o.z,i,1.1+hash(i)*.3] as Place),VILLAGE);
 const outer:Place[]=[],clumps:Place[]=[];
 for(let i=0;i<120;i++){const x=Math.sin(i*18.731)*55,z=Math.cos(i*7.347)*55;if(Math.abs(x)<48&&Math.abs(z)<47)continue;(i%3?outer:clumps).push([x,z,i,1+hash(i)*.5]);}
 for(let i=0;i<26;i++){const a=i/26*Math.PI*2,r=50+hash(i)*4;clumps.push([Math.sin(a)*r,Math.cos(a)*r,i,1.2]);}
 scatter('tree_single_B',outer,VILLAGE*1.1);scatter('trees_B_large',clumps.filter((_,i)=>i%2===0),VILLAGE);scatter('trees_A_large',clumps.filter((_,i)=>i%2===1),VILLAGE);
 const mountains:Place[]=[];for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=68+hash(i)*8;mountains.push([Math.sin(a)*r,Math.cos(a)*r,a,1+hash(i+9)*.6,-1]);}
 scatter('mountain_A_grass_trees',mountains.filter((_,i)=>i%3===0),VILLAGE*2.2);scatter('mountain_B_grass_trees',mountains.filter((_,i)=>i%3===1),VILLAGE*2.2);scatter('mountain_C',mountains.filter((_,i)=>i%3===2),VILLAGE*2.4);
 return meshes;
}

/** Boss arena dressing: pillars with braziers and banners around the ring, arched walls behind. */
export function dressNightArena(assets:NightAssets,root:T.Object3D){
 const group=new T.Group();root.add(group);
 const add=(name:string,x:number,z:number,r=0,s=1,y=0)=>{for(const part of assets.parts(name)){const mesh=new T.Mesh(part.geometry,part.material);mesh.applyMatrix4(part.matrix);const holder=new T.Group();holder.position.set(x,y,z);holder.rotation.y=r;holder.scale.setScalar(s);holder.add(mesh);group.add(holder);}};
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=Math.sin(a)*15,z=Math.cos(a)*15;add(i%2?'pillar':'pillar_decorated',x,z,a+Math.PI,1);if(i%2===0)add('banner_patternB_blue',x*.93,z*.93,a+Math.PI,.8,1.4);else add('torch_lit',x*.92,z*.92,a+Math.PI,1.4,2.4);}
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2+.2;add(i%4===0?'wall_pillar':'wall_arched',Math.sin(a)*20,Math.cos(a)*20,a+Math.PI,1.3);}
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.4;add(i%2?'grave_B':'gravestone',Math.sin(a)*17.4,Math.cos(a)*17.4,a+Math.PI,.9);}
 return group;
}

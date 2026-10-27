import * as T from 'three';
import {NIGHT_CAMPS,NIGHT_OBSTACLES,NIGHT_PORTALS,NIGHT_SPRINGS} from './night-data';
import {fxTexture,type NightAssets} from './night-assets';

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
export const NIGHT_PATHS=[[0,27,-29,14],[-29,14,-24,-25],[-24,-25,25,-27],[25,-27,28,8],[28,8,0,27],[0,27,-24,-25]];
export function dressNightWorld(assets:NightAssets,root:T.Object3D):{meshes:T.InstancedMesh[];update:(time:number)=>void;dispose:()=>void}{
 const meshes:T.InstancedMesh[]=[],m=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);
 const moonlit=new Map<T.Material,T.Material>();
 // Quaternius foliage is self-lit for daylight scenes; under the moon it keeps only a faint glow.
 const nightMaterial=(m:T.Material)=>{let v=moonlit.get(m);if(!v){v=m.clone();const sm=v as T.MeshStandardMaterial;if(sm.emissive)sm.emissive.multiplyScalar(.3);moonlit.set(m,v);}return v;};
 const scatter=(name:string,places:Place[],scale=1)=>{
  const parts=assets.parts(name);if(!parts.length||!places.length)return;
  for(const part of parts){const mesh=new T.InstancedMesh(part.geometry,name.startsWith('meadow-')?nightMaterial(part.material):part.material,places.length);
   places.forEach(([x,z,r=0,s=1,y=0],i)=>{q.setFromAxisAngle(up,r);m.compose(new T.Vector3(x,y,z),q,new T.Vector3().setScalar(s*scale));mesh.setMatrixAt(i,m.multiply(part.matrix));});
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.computeBoundingBox();root.add(mesh);meshes.push(mesh);}
 };
 const obstacle=(x:number,z:number)=>NIGHT_OBSTACLES.find(o=>Math.hypot(o.x-x,o.z-z)<.5)!;
 const owned:T.Material[]=[],sprites:{sprite:T.Sprite|T.Mesh;update:(t:number)=>void}[]=[];
 const glowSprite=(map:string,color:number,x:number,y:number,z:number,size:number,opacity=.9)=>{const m=new T.SpriteMaterial({map:fxTexture(map),color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending});owned.push(m);const sp=new T.Sprite(m);sp.position.set(x,y,z);sp.scale.setScalar(size);root.add(sp);return sp;};
 const decalPlane=(map:string,color:number,x:number,y:number,z:number,size:number,vertical=false)=>{const m=new T.MeshBasicMaterial({map:fxTexture(map),color,transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});owned.push(m);const mesh=new T.Mesh(new T.PlaneGeometry(size,size),m);mesh.position.set(x,y,z);if(!vertical)mesh.rotation.x=-Math.PI/2;root.add(mesh);return mesh;};

 // Ground: KayKit hexagon grass tiles over the whole map, tinted per district through instance colours.
 {const parts=assets.parts('hex_grass'),S=3.2,W=2*S,R=1.15*S,places:{x:number;z:number;c:T.Color}[]=[];
  const tint=(x:number,z:number)=>{if(Math.hypot(x,z-27)<11)return 0xb4bca8;if(Math.hypot(x+24,z+27)<20)return 0x8c8aa2;if(Math.hypot(x-25,z+29)<18)return 0xaaa486;if(Math.hypot(x-28,z-9)<19)return 0xa6a888;if(x<-8&&z>-6)return 0x6e8c62;return 0x8fa27c;};
  for(let row=0;row*1.5*R<120;row++)for(let col=0;col*W<124;col++){const x=-62+col*W+(row%2)*S,z=-60+row*1.5*R;places.push({x,z,c:new T.Color(tint(x,z)).multiplyScalar(.92+hash(row*31+col)*.16)});}
  for(const part of parts){const mesh=new T.InstancedMesh(part.geometry,part.material,places.length);places.forEach((p,i)=>{m.compose(new T.Vector3(p.x,0,p.z),q.identity(),new T.Vector3(S,S,S));mesh.setMatrixAt(i,m.multiply(part.matrix));mesh.setColorAt(i,p.c);});mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh);}}
 // Velvet crypts stand on bare earth (Halloween Bits dirt tiles).
 {const dirt:Place[]=[];for(let x=-42;x<=-14;x+=4.6)for(let z=-43;z<=-17;z+=4.6)if(Math.hypot(x+27,z+30)<15)dirt.push([x,z,Math.floor(hash(x*z)*4)*Math.PI/2,1.15,.01]);scatter('floor_dirt',dirt);}
 // Stone paths (Halloween Bits) follow the routes between districts.
 {const variants:Record<string,Place[]>={path_A:[],path_B:[],path_C:[],path_D:[]},keys=Object.keys(variants);let n=0;
  for(const [x,z,tx,tz] of NIGHT_PATHS){const len=Math.hypot(tx-x,tz-z),nx=-(tz-z)/len,nz=(tx-x)/len;for(let d=0;d<len;d+=1.9)for(const side of [-1,1]){const t=d/len;variants[keys[Math.floor(hash(n++)*4)]].push([x+(tx-x)*t+nx*side*.95,z+(tz-z)*t+nz*side*.95,Math.floor(hash(n*7)*4)*Math.PI/2,1.05,.005]);}}
  for(const [k,v] of Object.entries(variants))scatter(k,v);}
 // Sanctuary beacon: a pulsing light above the central column instead of a polygon crystal.
 const beacon=glowSprite('glow',0x7fe9ff,0,3.4,27,3.2),flare=glowSprite('flare',0xbff6ff,0,3.4,27,2.4),halo=glowSprite('light',0x5fd0e8,0,3.4,27,6,.35);
 sprites.push({sprite:beacon,update:t=>{beacon.scale.setScalar(3+Math.sin(t*2)*.3);(flare.material as T.SpriteMaterial).rotation=t*.6;halo.scale.setScalar(6+Math.sin(t*1.3)*.6);}});
 // Broken crown landmark: turning rune discs and a golden core above the colonnade.
 const crown=new T.Group();crown.position.set(25,6,-29);root.add(crown);const discs=[0,1,2].map(i=>{const d=decalPlane(i===1?'rune':'magic',i===1?0x7fe9ff:0xf3cd8a,0,0,0,6+i*1.2,true);d.removeFromParent();crown.add(d);d.rotation.set(.6+i*.65,i*.8,0);return d;});const core=glowSprite('glow',0xffd08a,25,6,-29,3);
 sprites.push({sprite:core,update:t=>{crown.rotation.y=t*.13;discs.forEach((d,i)=>{d.rotation.z=t*(.2+i*.1)*(i%2?-1:1);});core.scale.setScalar(2.8+Math.sin(t*1.7)*.3);}});
 // Moon: NASA LRO colour map (public domain) on a sphere, with a soft halo.
 {const m=new T.MeshBasicMaterial({map:fxTexture('moon'),color:0xdde8ff});owned.push(m);const moon=new T.Mesh(new T.SphereGeometry(4,32,20),m);moon.position.set(-15,26,-62);moon.rotation.y=2.2;root.add(moon);glowSprite('glow',0x9fc4ff,-15,26,-62.5,22,.35);}
 

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

 // Forest of whispers: Kenney Nature Kit trees on the solid trunks, a dense canopy around the clearings,
 // and undergrowth (bushes, mushrooms, flowers, stumps) kept off the paths and fighting spots.
 const NATURE=5.2,MEADOW=1.25;
 const forestTrunks=NIGHT_OBSTACLES.filter(o=>o.x<0&&o.z>0&&Math.abs(o.x)<40||(o.x===-40&&o.z===7));
 // Quaternius Stylized Nature trees on the trunks (moonlit: their self-light is dimmed below).
 for(const [k,name] of ['CommonTree_3','CommonTree_4','CommonTree_5'].entries())scatter('meadow-'+name,forestTrunks.filter((_,i)=>i%3===k).map((o,i)=>[o.x,o.z,i*1.7+k,1.05+hash(i+k)*.25] as Place),MEADOW);
 scatter('tree_pineTallA_detailed',[[-44,30,.4,1.1],[-27,33,2,1],[-12,22,1,.9],[-46,15,3,1.1],[-34,31,1,1],[-48,24,.3,1.2]],NATURE);
 scatter('tree_pineTallC_detailed',[[-19,30,2.5,1],[-41,-4,2.2,1.1],[-26,26,.8,.9]],NATURE);
 scatter('meadow-CommonTree_4',[[-36,26,0,1.1],[-23,11,2,1],[-45,0,4,1.2]],MEADOW);
 scatter('tree_dead_large',[[-25,18,.5],[-44,-8,2]]);
 scatter('pumpkin_orange_jackolantern',[[-21,21,.6,.7],[-31,9,2.4,.6],[-42,12,1,.7],[-16,13,4,.55]]);
 scatter('stump_oldTall',[[-14,16,1],[-33,4,2],[-40,25,3]],3.4);
 scatter('statue_head',[[-31,17,2.4,1.1]],NATURE);scatter('statue_ring',[[-22,27,.6]],NATURE);
 // Undergrowth everywhere outside paths, camps, portals and springs.
 const PATHS=NIGHT_PATHS;
 const segment=(x:number,z:number,[ax,az,bx,bz]:number[])=>{const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-ax-t*dx,z-az-t*dz);};
 const open=(x:number,z:number)=>PATHS.every(p=>segment(x,z,p)>3)&&NIGHT_CAMPS.every(c=>Math.hypot(c.x-x,c.z-z)>5)&&[...NIGHT_PORTALS,...NIGHT_SPRINGS].every(p=>Math.hypot(p.x-x,p.z-z)>3.5)&&NIGHT_OBSTACLES.every(o=>Math.hypot(o.x-x,o.z-z)>o.r+1)&&Math.hypot(x,z-27)>9;
 const cover:Record<string,Place[]>={'meadow-Bush_Large':[],'meadow-Bush_Long_1':[],'meadow-Bush_Common_Flowers':[],'meadow-Flower_3_Group':[],'meadow-Fern_1':[],'meadow-Mushroom_RedCap':[],'meadow-Grass_Common_Tall':[]};
 const kinds=Object.keys(cover);for(let i=0;i<320;i++){const x=(hash(i*3.1)-.5)*92,z=(hash(i*7.7+1)-.5)*92;if(!open(x,z))continue;const forest=x<-8&&z>-6,kind=kinds[Math.floor(hash(i*13.3)*kinds.length)];if(!forest&&/mushroom/.test(kind))continue;cover[kind].push([x,z,hash(i)*6.3,.8+hash(i*5)*.6]);}
 // Ground cover reads at roughly knee height; bushes a little taller.
 const coverScale:Record<string,number>={'meadow-Bush_Large':.8,'meadow-Bush_Long_1':.85,'meadow-Bush_Common_Flowers':.85,'meadow-Flower_3_Group':1.2,'meadow-Fern_1':1.1,'meadow-Mushroom_RedCap':1.6,'meadow-Grass_Common_Tall':1.2,plant_bushDetailed:2.6,plant_bushLarge:2.8,grass:2.2,rock_largeA:2.2};
 for(const [kind,places] of Object.entries(cover))scatter(kind,places,coverScale[kind]);

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
 scatter('tree_pineDefaultA',NIGHT_OBSTACLES.filter(o=>Math.abs(o.x)>40&&!(o.x===-40&&o.z===7)).map((o,i)=>[o.x,o.z,i,1.1+hash(i)*.3] as Place),NATURE);
 const outer:Place[]=[],clumps:Place[]=[];
 for(let i=0;i<120;i+=2){const x=Math.sin(i*18.731)*55,z=Math.cos(i*7.347)*55;if(Math.abs(x)<48&&Math.abs(z)<47)continue;(i%3?outer:clumps).push([x,z,i,1+hash(i)*.5]);}
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=50+hash(i)*4;clumps.push([Math.sin(a)*r,Math.cos(a)*r,i,1.2]);}
 scatter('tree_pineTallA_detailed',outer,NATURE*1.2);scatter('tree_pineRoundE',clumps.filter((_,i)=>i%2===0),NATURE*1.4);scatter('tree_fat_darkh',clumps.filter((_,i)=>i%2===1),NATURE*1.5);
 const mountains:Place[]=[];for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=68+hash(i)*8;mountains.push([Math.sin(a)*r,Math.cos(a)*r,a,1+hash(i+9)*.6,-1]);}
 scatter('mountain_A_grass_trees',mountains.filter((_,i)=>i%3===0),VILLAGE*2.2);scatter('mountain_B_grass_trees',mountains.filter((_,i)=>i%3===1),VILLAGE*2.2);scatter('mountain_C',mountains.filter((_,i)=>i%3===2),VILLAGE*2.4);
 return {meshes,update:t=>sprites.forEach(s=>s.update(t)),dispose:()=>{owned.forEach(m=>m.dispose());moonlit.forEach(m=>m.dispose());root.traverse(o=>{if(o instanceof T.Mesh&&(o.geometry.type==='PlaneGeometry'||o.geometry.type==='SphereGeometry'))o.geometry.dispose();});}};
}

export type NightArena={group:T.Group;update:(time:number,dt:number)=>void;fog:number;sky:number;dispose:()=>void};
/**
 * Boss arenas, one per moon, built from KayKit/Kenney models. The fighting floor is a 15 m disc (the
 * simulation clamps everyone to 14 m); scenery stands outside it so nothing blocks the fight.
 */
export function dressNightArena(assets:NightAssets,root:T.Object3D,stage=1):NightArena{
 const group=new T.Group();root.add(group);const owned:T.Material[]=[];
 const add=(name:string,x:number,z:number,r=0,s=1,y=0)=>{const holder=new T.Group();holder.position.set(x,y,z);holder.rotation.y=r;holder.scale.setScalar(s);for(const part of assets.parts(name)){const mesh=new T.Mesh(part.geometry,part.material);mesh.applyMatrix4(part.matrix);holder.add(mesh);}group.add(holder);return holder;};
 const ring=(count:number,radius:number,fn:(x:number,z:number,a:number,i:number)=>void,offset=0)=>{for(let i=0;i<count;i++){const a=i/count*Math.PI*2+offset;fn(Math.sin(a)*radius,Math.cos(a)*radius,a,i);}};
 const inward=(a:number)=>a+Math.PI;
 const decal=(map:string,color:number,size:number,opacity:number,additive=true,y=.03)=>{const m=new T.MeshBasicMaterial({map:fxTexture(map),color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,blending:additive?T.AdditiveBlending:T.NormalBlending});owned.push(m);const mesh=new T.Mesh(new T.PlaneGeometry(size,size),m);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;group.add(mesh);return mesh;};
 // Floor: 4 m dungeon tiles covering the fighting disc, rubble tiles for the ruined courtyard.
 const tile='floor_tile_large',floorTint=new T.Color([0x8f96a3,0x8a7a70,0x8780a6][stage-1]);const tiles:[number,number][]=[];for(let x=-16;x<=16;x+=4)for(let z=-16;z<=16;z+=4)if(Math.hypot(x,z)<17)tiles.push([x,z]);
 for(const part of assets.parts(tile)){const mesh=new T.InstancedMesh(part.geometry,part.material,tiles.length),m=new T.Matrix4();tiles.forEach(([x,z],i)=>{m.makeTranslation(x,-.06,z);mesh.setMatrixAt(i,m.multiply(part.matrix));mesh.setColorAt(i,floorTint.clone().multiplyScalar(.9+hash(x*7+z)*.2));});mesh.computeBoundingSphere();group.add(mesh);}
 // The edge of the fight is a glowing ring so players read the limit without walls in the way.
 decal('ring',stage===3?0xb98cff:0xf3cd8a,30,.5);
 const animated:{update:(t:number,dt:number)=>void}[]=[];let lights=0;
 const flames=(x:number,y:number,z:number,color=0xff8a3c,size=1.1)=>{const m=new T.SpriteMaterial({map:fxTexture('fire'),color,transparent:true,depthWrite:false,blending:T.AdditiveBlending});owned.push(m);const f=new T.Sprite(m);f.position.set(x,y,z);f.scale.setScalar(size);group.add(f);// Only a few flames cast real light: point lights are expensive on phones.
  const light=lights++<3?new T.PointLight(color,4,9,1.8):null;if(light){light.position.set(x,y+.3,z);group.add(light);}const seed=Math.random()*10;animated.push({update:t=>{f.scale.set(size*(.9+Math.sin(t*9+seed)*.1),size*(1.1+Math.sin(t*13+seed)*.15),1);if(light)light.intensity=3.5+Math.sin(t*11+seed)*.8;}});};
 if(stage===1){// Claustro da Lua: gothic cloister of arches, graves and candles under the moon.
  ring(10,16.5,(x,z,a,i)=>{add(i%2?'arch':'pillar',x,z,inward(a),i%2?1.05:1);});
  ring(10,18.5,(x,z,a,i)=>{add(['grave_A','gravestone','grave_B','gravemarker_A'][i%4],x,z,inward(a),1);},.31);
  ring(6,15.4,(x,z,a)=>{add('candle_triple',x,z,a,1.2);flames(x,1.1,z,0xffc070,.5);},.52);
  add('crypt',0,-25,0,1);add('shrine_candles',-5,-19,.3);add('shrine_candles',5,-19,-.3);
  ring(8,24,(x,z,a,i)=>add(i%2?'tree_dead_large':'tree_dead_medium',x,z,a*3,1.4));
  ring(4,16,(x,z,a)=>{add('post_lantern',x,z,inward(a),1.1);},Math.PI/4);
  decal('magic',0x9fd8ff,10,.18);
 }else if(stage===2){// Pátio das Cinzas: a burnt courtyard with collapsed houses, braziers and drifting embers.
  ring(7,27,(x,z,a,i)=>add(i%2?'building_destroyed':'building_home_B_red',x,z,inward(a),VILLAGE*1.2));
  ring(12,21.5,(x,z,a,i)=>{if(i%3===1)return;add('wall_straight',x,z,inward(a)+Math.PI/2,VILLAGE*.8);});
  ring(6,15.2,(x,z,a)=>{add('barrel_large',x,z,a,.55);flames(x,1.6,z);});
  for(let i=0;i<7;i++){const a=i*2.1,r=3+i%3*3.5;decal('scorch',0x1a1410,3+i%3,.75,false,.035+i*.002).position.set(Math.sin(a)*r,.035+i*.002,Math.cos(a)*r);}
  add('crates_stacked',-17,9,.6,.9);add('keg_decorated',16,-10,2,.8);add('sword_shield',12,13,2.2,.9,.4);add('sword_shield',-13,-12,5,.9,.4);
  // Embers rise forever from the ruins.
  const count=90,pos=new Float32Array(count*3),geo=new T.BufferGeometry();for(let i=0;i<count;i++){pos[i*3]=(hash(i)-.5)*40;pos[i*3+1]=hash(i+50)*8;pos[i*3+2]=(hash(i+99)-.5)*40;}geo.setAttribute('position',new T.BufferAttribute(pos,3));
  const em=new T.PointsMaterial({map:fxTexture('spark'),color:0xff8a3c,size:.45,transparent:true,depthWrite:false,blending:T.AdditiveBlending});owned.push(em);const embers=new T.Points(geo,em);group.add(embers);
  animated.push({update:(t,dt)=>{for(let i=0;i<count;i++){let y=pos[i*3+1]+dt*(.8+hash(i)*1.2);if(y>9)y=0;pos[i*3+1]=y;pos[i*3]+=Math.sin(t+i)*dt*.3;}geo.attributes.position.needsUpdate=true;}});
 }else{// Santuário do Eclipse: ornate colonnade, banners and a vast rune circle turning under the eclipse.
  ring(12,16.2,(x,z,a,i)=>{add(i%2?'pillar_decorated':'column',x,z,inward(a),i%2?1.05:2.2);if(i%2)add(i%4===1?'banner_patternB_blue':'banner_thin_red',x*.94,z*.94,inward(a),.85,1.6);});
  ring(16,21,(x,z,a,i)=>add(i%4===0?'wall_pillar':'wall_arched',x,z,inward(a),1.35));
  ring(6,15,(x,z,a)=>{add('torch_lit',x,z,inward(a),1.4,1.8);flames(x,3,z,0xc49bff,.8);},.26);
  const big=decal('magic',0xb98cff,26,.55),runes=decal('rune',0xe0c8ff,14,.6);
  const floating:T.Sprite[]=[];for(let i=0;i<14;i++){const m=new T.SpriteMaterial({map:fxTexture(i%2?'rune':'magic'),color:0xc9a8ff,transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending});owned.push(m);const sp=new T.Sprite(m);sp.scale.setScalar(1.4);group.add(sp);floating.push(sp);}
  animated.push({update:t=>{big.rotation.z=t*.08;runes.rotation.z=-t*.15;floating.forEach((sp,i)=>{const a=t*.25+i/14*Math.PI*2;sp.position.set(Math.sin(a)*18.5,4+Math.sin(t*.8+i)*1.2,Math.cos(a)*18.5);});}});
 }
 return {group,fog:[0x101c2b,0x241a28,0x141329][stage-1],sky:[0x101c2b,0x241a28,0x141329][stage-1],update:(t,dt)=>{if(group.visible)animated.forEach(a=>a.update(t,dt));},dispose:()=>{group.removeFromParent();group.traverse(o=>{if(o instanceof T.Mesh&&o.geometry.type==='PlaneGeometry')o.geometry.dispose();if(o instanceof T.Points)o.geometry.dispose();if(o instanceof T.PointLight)o.dispose();});owned.forEach(m=>m.dispose());}};
}

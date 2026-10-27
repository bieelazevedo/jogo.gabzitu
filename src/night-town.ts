import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {NightAssets,PropPart} from './night-assets';

/** Builds complete houses from the free Quaternius modules, then batches each house by material. */
export function medievalTown(assets:NightAssets){
 const cache=new Map<string,PropPart[]>(),owned:T.BufferGeometry[]=[];
 const get=(style:string):PropPart[]|undefined=>{
  if(!style.startsWith('town_')||!assets.props.has('medieval-Wall_Plaster_Straight'))return;
  const old=cache.get(style);if(old)return old;
  const bins=new Map<T.Material,T.BufferGeometry[]>(),matrix=new T.Matrix4(),rotation=new T.Quaternion(),up=new T.Vector3(0,1,0);
  const add=(name:string,x:number,y:number,z:number,r=0,s=1)=>{
   rotation.setFromAxisAngle(up,r);matrix.compose(new T.Vector3(x,y,z),rotation,new T.Vector3(s,s,s));
   for(const p of assets.parts('medieval-'+name)){const g=(p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone()).applyMatrix4(matrix.clone().multiply(p.matrix));const list=bins.get(p.material)||[];list.push(g);bins.set(p.material,list);}
  };
  const smith=style==='town_smith',levels=style==='town_farm'?1:2;
  const wall=(x:number,z:number,r:number,floor:number,kind='window')=>{
   const y=floor*3,base=smith&&floor===0?'Wall_UnevenBrick_Straight':kind==='door'?'Wall_Plaster_Door_Round':kind==='window'?'Wall_Plaster_Window_Wide_Flat':'Wall_Plaster_Straight';
   add(base,x,y,z,r);
   if(kind==='window'&&!(smith&&floor===0)){add('Window_Wide_Flat1',x,y,z,r);add('WindowShutters_Wide_Flat_Open',x,y,z,r);}
   if(kind==='door'){add('DoorFrame_Round_WoodDark',x,y,z,r);add('Door_2_Round',x-.5*Math.cos(r),y,z+.5*Math.sin(r),r);}
  };
  for(let f=0;f<levels;f++){
   for(const x of [-1,1]){wall(x,3,Math.PI,f,f===0&&x===-1?'door':'window');wall(x,-3,0,f);}
   for(const z of [-2,0,2]){wall(-2,z,-Math.PI/2,f,z===0?'window':'plain');wall(2,z,Math.PI/2,f,z===0?'window':'plain');}
   for(const x of [-1,1])for(const z of [-2,0,2])add('Floor_WoodDark',x,f*3,z);
  }
  add('Roof_RoundTiles_4x6',0,levels*3,0);add('Roof_Front_Brick4',0,levels*3,3,Math.PI);add('Roof_Front_Brick4',0,levels*3,-3);
  add('Prop_Chimney',1.15,levels*3+1.3,-1.2);
  add('Prop_Vine1',-2.03,.2,.3,-Math.PI/2);add('Prop_Vine4',1,3,3.08,Math.PI);
  if(style==='town_tavern'){add('Roof_Dormer_RoundTile',0,levels*3+1,1.8);add('Balcony_Cross_Straight',0,3,3.5,Math.PI);}
  const parts:PropPart[]=[];for(const [material,list] of bins){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(geometry){owned.push(geometry);parts.push({geometry,material,matrix:new T.Matrix4()});}}
  cache.set(style,parts);return parts;
 };
 return {get,dispose:()=>owned.forEach(g=>g.dispose())};
}

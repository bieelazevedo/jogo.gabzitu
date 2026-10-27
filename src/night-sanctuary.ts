import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {PropPart} from './night-assets';

/** Original bevelled masonry. Geometry is built once, then instanced at existing prop footprints. */
export function sanctuaryArchitecture(){
 const stone=new T.MeshStandardMaterial({color:0xb1b4b8,roughness:.95});
 const trim=new T.MeshStandardMaterial({color:0x9d8557,roughness:.66,metalness:.32});
 const cache=new Map<string,PropPart[]>(),geometries:T.BufferGeometry[]=[];
 const bevel=(w:number,h:number,d:number,r=.05)=>{
  r=Math.min(r,w*.2,h*.2,d*.2);const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const g=new T.ExtrudeGeometry(s,{depth:d-r*2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r,bevelThickness:r,curveSegments:3});g.translate(0,0,-d/2+r);return g;
 };
 const get=(name:string):PropPart[]|undefined=>{
  if(!['arch','pillar_decorated','column','floor_tile_large'].includes(name))return;
  const old=cache.get(name);if(old)return old;
  const buckets=new Map<T.Material,T.BufferGeometry[]>();
  const put=(g:T.BufferGeometry,x=0,y=0,z=0,material:T.Material=stone,angle=0)=>{if(g.index){const original=g;g=g.toNonIndexed();original.dispose();}g.rotateY(angle);g.translate(x,y,z);const list=buckets.get(material)||[];list.push(g);buckets.set(material,list);};
  if(name==='arch'){
   for(const side of [-1,1]){put(bevel(.92,.22,.95),side*1.72,.11);for(let j=0;j<4;j++)put(bevel(.63,.49,.68,.035),side*1.72,.48+j*.51);put(bevel(.92,.18,.88),side*1.72,2.35);}
   // Eighteen individual voussoirs, rounded edges and a slightly proud keystone.
   for(let i=0;i<18;i++){const a=i/18*Math.PI+.012,b=(i+1)/18*Math.PI-.012,inner=1.4,outer=i===8||i===9?2.04:1.99,s=new T.Shape();s.absarc(0,2.35,outer,a,b,false);s.lineTo(Math.cos(b)*inner,2.35+Math.sin(b)*inner);s.absarc(0,2.35,inner,b,a,true);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.62,bevelEnabled:true,bevelSegments:2,bevelThickness:.025,bevelSize:.025,curveSegments:6,steps:1});g.translate(0,0,-.31);put(g);}
  }else if(name==='pillar_decorated'){
   put(bevel(1.55,.22,1.55),0,.11);put(bevel(1.2,.18,1.2),0,.31);
   put(new T.CylinderGeometry(.4,.48,2.8,28),0,1.85);
   for(const y of [.49,.64,3.17,3.33])put(new T.TorusGeometry(.45,.055,6,28).rotateX(Math.PI/2),0,y);
   put(new T.CylinderGeometry(.65,.43,.25,28),0,3.48);put(bevel(1.38,.22,1.38),0,3.7);put(bevel(1.1,.15,1.1),0,3.89);
   for(let i=0;i<4;i++){const a=i*Math.PI/2;put(bevel(.12,1.9,.045,.015),Math.sin(a)*.419,1.9,Math.cos(a)*.419,trim,a);}
  }else if(name==='column'){
   put(bevel(.92,.18,.92),0,.09);put(new T.CylinderGeometry(.31,.4,.95,24),0,.65);put(new T.CylinderGeometry(.48,.33,.18,24),0,1.2);put(bevel(1,.15,1),0,1.36);
  }else{
   for(let x=0;x<4;x++)for(let z=0;z<4;z++)put(bevel(.985,.1,.985,.018),x-1.5,-.02,z-1.5);
  }
  const parts:PropPart[]=[];for(const [material,list] of buckets){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(geometry){geometries.push(geometry);parts.push({geometry,material,matrix:new T.Matrix4()});}}
  cache.set(name,parts);return parts;
 };
 return {get,dispose(){geometries.forEach(g=>g.dispose());stone.dispose();trim.dispose();}};
}

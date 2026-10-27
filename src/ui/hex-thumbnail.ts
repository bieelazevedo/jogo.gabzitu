import {hexMap} from '../td-hex';
import type {Level} from '../types';

const PALETTE:Record<string,{grass:[string,string];road:string;edge:string}>={
 garden:{grass:['#7fae4f','#93bf5d'],road:'#e2c58d',edge:'#57773a'},
 town:{grass:['#86a95a','#98b768'],road:'#e8d2a2',edge:'#5d7442'},
 night:{grass:['#3f5a52','#4a675d'],road:'#9aa3b8',edge:'#2b3f3a'},
 coast:{grass:['#a8c26a','#b9cf78'],road:'#ecd7a4',edge:'#7a8f4b'},
 archive:{grass:['#7f9d68','#90ad76'],road:'#ddd0b0',edge:'#566b48'},
};
const cache=new Map<string,string>();

/**
 * A painted overview of a level's hex battlefield (roads, water, build spots, entries and the castle),
 * drawn from the same layout the game uses. Cached per level as a WebP data URL for menu cards.
 */
export function hexThumbnail(level:Level,width=360,height=216){
 const key=level.id+':'+width,hit=cache.get(key);if(hit)return hit;
 const map=hexMap(level),pal=PALETTE[level.theme]||PALETTE.garden,c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d')!;
 const x0=-21,x1=21,z0=-15.5,z1=15.5,sx=width/(x1-x0),sz=height/(z1-z0),R=1.155,tilt=.92;
 const px=(x:number)=>(x-x0)*sx,pz=(z:number)=>(z-z0)*sz;
 const hex=(x:number,z:number,scale=1)=>{g.beginPath();for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;g.lineTo(px(x+Math.cos(a)*R*scale),pz(z+Math.sin(a)*R*scale*tilt));}g.closePath();};
 g.fillStyle=pal.edge;g.fillRect(0,0,width,height);
 for(const cell of map.cells.values()){if(cell.x<x0-2||cell.x>x1+2||cell.z<z0-2||cell.z>z1+2)continue;
  const n=(Math.sin(cell.q*12.9+cell.r*78.2)*43758.5)%1;hex(cell.x,cell.z,.98);
  g.fillStyle=cell.water?'#3f8fb4':cell.river?'#4aa3c4':cell.road?pal.road:pal.grass[Math.abs(n)<.5?0:1];g.fill();
  if(cell.high){hex(cell.x,cell.z,.7);g.fillStyle='rgba(255,255,255,.18)';g.fill();}}
 // Roads drawn as a soft line through tile centres reads better than tiles alone at this size.
 g.lineCap='round';g.lineJoin='round';
 for(const route of map.routes){g.beginPath();route.forEach((cell,i)=>i?g.lineTo(px(cell.x),pz(cell.z)):g.moveTo(px(cell.x),pz(cell.z)));g.strokeStyle='rgba(90,60,30,.35)';g.lineWidth=sx*1.1;g.stroke();g.strokeStyle=pal.road;g.lineWidth=sx*.8;g.stroke();}
 for(const s of map.spots){g.beginPath();g.arc(px(s.x),pz(s.z),sx*.42,0,Math.PI*2);g.fillStyle=s.high?'#ffe08a':'#f6ecd0';g.fill();g.lineWidth=1.2;g.strokeStyle='#2f4a3a';g.stroke();}
 const entries=new Set(map.routes.map(r=>r.find(c=>Math.abs(c.x)<20&&Math.abs(c.z)<14.5)||r[0])),exits=new Set(map.routes.map(r=>r[r.length-1]));
 for(const e of entries){g.beginPath();g.arc(px(Math.max(x0+1,Math.min(x1-1,e.x))),pz(Math.max(z0+1,Math.min(z1-1,e.z))),sx*.7,0,Math.PI*2);g.fillStyle='#8c3df0';g.fill();g.strokeStyle='#f0e0ff';g.lineWidth=1.5;g.stroke();}
 for(const e of exits){const x=px(Math.min(x1-1.2,e.x)),z=pz(e.z);g.fillStyle='#2f6fd0';g.strokeStyle='#e8f0ff';g.lineWidth=1.5;g.beginPath();g.rect(x-sx*.8,z-sx*.7,sx*1.6,sx*1.3);g.fill();g.stroke();g.beginPath();g.moveTo(x-sx*.95,z-sx*.65);g.lineTo(x,z-sx*1.5);g.lineTo(x+sx*.95,z-sx*.65);g.closePath();g.fill();g.stroke();}
 const vignette=g.createRadialGradient(width/2,height/2,height*.35,width/2,height/2,width*.62);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(8,20,24,.45)');g.fillStyle=vignette;g.fillRect(0,0,width,height);
 const url=c.toDataURL('image/webp',.85);cache.set(key,url);return url;
}

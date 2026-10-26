import {FARM_WALLS} from './farm-data';
/** One baked terrain texture: detail costs no extra per-frame draw calls. */
export function farmTerrain(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const c=canvas.getContext('2d')!,scaleX=1024/90,scaleZ=1024/80;
 const point=(x:number,z:number)=>[(x+45)*scaleX,(z+40)*scaleZ] as const;
 let seed=621;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const gradient=c.createLinearGradient(0,0,900,1024);gradient.addColorStop(0,'#71835c');gradient.addColorStop(.5,'#829465');gradient.addColorStop(1,'#98a271');c.fillStyle=gradient;c.fillRect(0,0,1024,1024);
 function patch(x:number,z:number,rx:number,rz:number,color:string){const p=point(x,z);c.save();c.translate(p[0],p[1]);c.scale(rx*scaleX,rz*scaleZ);const g=c.createRadialGradient(0,0,.1,0,0,1);g.addColorStop(0,color);g.addColorStop(.7,color);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();}
 patch(-9,23,6,5,'#816c51');patch(-27,21,9,7,'#a99968');patch(-16,-12,11,9,'#9a895c');patch(10,-23,7,7,'#7e7150');patch(26,21,9,7,'#b8b183');patch(0,-1,7,6,'#a99c77');
 const routes=[[-1,-1,-16,-6],[-1,-1,-27,20],[-1,-1,25,18],[-1,-1,20,-18],[-16,-6,-27,-28],[-16,-6,-30,5],[-1,-1,8,-22],[0,18,0,-28]];
 c.lineCap='round';c.lineJoin='round';
 for(const [ax,az,bx,bz]of routes){const a=point(ax,az),b=point(bx,bz),mx=(a[0]+b[0])/2+15,mz=(a[1]+b[1])/2-10;for(const [width,color]of [[57,'#69734c44'],[48,'#aa956d'],[37,'#c2ac82'],[24,'#c6b58e']] as const){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...a);c.quadraticCurveTo(mx,mz,...b);c.stroke();}
  for(let i=0;i<90;i++){const t=random(),u=1-t,x=u*u*a[0]+2*u*t*mx+t*t*b[0]+(random()-.5)*38,y=u*u*a[1]+2*u*t*mz+t*t*b[1]+(random()-.5)*38;c.fillStyle=i%2?'#e8d5b367':'#8d7a5840';c.beginPath();c.ellipse(x,y,1+random()*2,.7+random(),random()*3,0,Math.PI*2);c.fill();}}
 // Soil grain and fine grass blend the painted paths into the pasture.
 for(let i=0;i<13000;i++){const x=random()*1024,y=random()*1024;c.fillStyle=i%3===0?'#eddfb81c':i%3===1?'#324b2e19':'#c6d19525';c.fillRect(x,y,1+random()*4,.5+random()*2);}
 for(let i=0;i<600;i++){const x=random()*1024,y=random()*1024;c.strokeStyle='#596f4340';c.lineWidth=.7;c.beginPath();c.moveTo(x,y);c.lineTo(x-1,y-3-random()*3);c.moveTo(x,y);c.lineTo(x+2,y-2);c.stroke();}
 // Baked contact shadows anchor buildings, crates, hay and trees without shadow passes.
 for(const wall of FARM_WALLS){if(wall.kind==='fence')continue;const p=point(wall.x+.25,wall.z+.2);c.save();c.translate(...p);c.scale(Math.max(.7,wall.w*.65)*scaleX,Math.max(.7,wall.d*.65)*scaleZ);const g=c.createRadialGradient(0,0,.15,0,0,1);g.addColorStop(0,'#26382250');g.addColorStop(.6,'#26382230');g.addColorStop(1,'#26382200');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();}
 return canvas;
}

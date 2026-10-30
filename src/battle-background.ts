import {art} from './art';
import type {Level} from './types';

const cache=new Map<string,HTMLCanvasElement>();

/** Redraw ground and paving in viewport proportions with a crisp 16-bit Pixel Art tile pass, cached for 60+ FPS. */
export function battleBackground(level:Level,ratio:number){
 const height=Math.max(360,Math.round(1000/Math.max(.5,Math.min(2.5,ratio||1.6667))));
 const key=level.id+':'+height;
 const old=cache.get(key);
 if(old)return old;

 const canvas=document.createElement('canvas');
 canvas.width=1000;canvas.height=height;
 const c=canvas.getContext('2d')!,dark=['night','archive'].includes(level.theme);
 const img=level.theme==='archive'?art.archive:level.theme==='coast'?art.coast:level.theme==='night'?art.night:level.theme==='town'?art.town:art.terrain;

 c.fillStyle=dark?'#263842':level.theme==='coast'?'#8ab892':'#6c9c5c';
 c.fillRect(0,0,1000,height);

 // Pixelate the background terrain art for authentic retro cohesion
 if(img.naturalWidth){
  const pw=250,ph=Math.round(height/4);
  const pxCanvas=document.createElement('canvas');
  pxCanvas.width=pw;pxCanvas.height=ph;
  const pc=pxCanvas.getContext('2d')!;
  const srcH=img.naturalWidth/(1000/height);
  pc.filter='saturate(1.18) contrast(1.06) hue-rotate('+((level.id%4-1.5)*4)+'deg)';
  pc.drawImage(img,0,Math.max(0,(img.naturalHeight-srcH)/2),img.naturalWidth,Math.min(srcH,img.naturalHeight),0,0,pw,ph);
  c.imageSmoothingEnabled=false;
  c.drawImage(pxCanvas,0,0,1000,height);
 }

 let seed=level.id*71;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};

 // Pixel grass tufts & flowers
 for(let i=0;i<90;i++){
  const gx=Math.floor(rand()*248)*4,gy=Math.floor(rand()*(height/4))*4;
  c.fillStyle=dark?(i%3===0?'#4d6b7a88':'#1d2c3688'):(i%4===0?'#ffe580aa':'#47753e66');
  c.fillRect(gx,gy,4,4);
  if(i%4===0)c.fillRect(gx+4,gy,4,4);
 }

 // Draw Pixel-Art Cobblestone Roads
 for(const [route,path] of level.paths.entries()){
  const pts=path.map(p=>({x:p.x,y:p.y*height/600}));
  const stroke=(width:number,color:string)=>{
   c.beginPath();
   pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
   c.lineWidth=width;c.strokeStyle=color;c.lineJoin='round';c.lineCap='round';c.stroke();
  };
  stroke(42,'#0d1c2277');
  stroke(36,dark?'#283a47':'#6e593c');
  stroke(30,dark?'#5f727d':'#b8a37a');

  for(let j=1;j<pts.length;j++){
   const a=pts[j-1],b=pts[j],len=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x);
   for(let d=8;d<len;d+=16){
    c.save();
    c.translate(a.x+Math.cos(angle)*d,a.y+Math.sin(angle)*d);
    c.rotate(angle);
    for(let row=0;row<2;row++){
     const col=(dark?['#6e828f','#7a909c','#859aa6']:['#c9b692','#d4c29f','#bda984'])[Math.floor(rand()*3)];
     const rx=-6+(row?2:0),ry=row?1:-12;
     c.fillStyle='#24201855';
     c.fillRect(rx+1,ry+1,12,10);
     c.fillStyle=col;
     c.fillRect(rx,ry,12,10);
     c.fillStyle='#ffffff33';
     c.fillRect(rx,ry,12,2);
    }
    c.restore();
   }
  }

  // Entry & Refuge Pixel Badges
  const a=pts[0],b=pts[1],end=pts.at(-1)!;
  const routeCol=['#ffd86b','#7ceeff','#eb9eff','#a8f078'][route%4];
  c.save();
  c.translate(Math.max(14,Math.min(986,a.x)),Math.max(14,Math.min(height-14,a.y)));
  c.rotate(Math.atan2(b.y-a.y,b.x-a.x));
  c.fillStyle=routeCol;
  c.beginPath();c.moveTo(-6,-8);c.lineTo(8,0);c.lineTo(-6,8);c.closePath();c.fill();
  c.restore();

  const bx=Math.max(18,Math.min(980,a.x+24)),by=Math.max(18,Math.min(height-18,a.y-22));
  c.fillStyle='#102229ee';
  c.beginPath();c.arc(bx,by,12,0,Math.PI*2);c.fill();
  c.strokeStyle=routeCol;c.lineWidth=2;c.stroke();
  c.fillStyle=routeCol;c.font='bold 12px monospace';c.textAlign='center';
  c.fillText(String(route+1),bx,by+4);

  const rx=Math.max(0,Math.min(918,end.x-74)),ry=Math.max(4,Math.min(height-24,end.y-30));
  c.fillStyle='#132e35f0';
  c.beginPath();c.roundRect(rx,ry,72,20,5);c.fill();
  c.strokeStyle='#e8c468';c.lineWidth=1.5;c.stroke();
  c.fillStyle='#ffe89e';c.font='bold 9px monospace';c.textAlign='center';
  c.fillText('♜ SANTUÁRIO',rx+36,ry+13);
 }

 if(cache.size>6)cache.clear();
 cache.set(key,canvas);
 return canvas;
}

import type {Level} from './types';

const cache=new Map<string,HTMLCanvasElement>();

function drawPixelTree(c:CanvasRenderingContext2D,x:number,y:number,theme:string,scale=1){
 const P=Math.max(2,Math.round(4*scale));
 const night=theme==='night',archive=theme==='archive',coast=theme==='coast';
 const leafDark=night?'#192a3d':archive?'#3a2d4c':coast?'#2d6e5e':'#235736';
 const leafMid=night?'#284660':archive?'#5a4478':coast?'#42997c':'#38804c';
 const leafLight=night?'#467396':archive?'#8668ad':coast?'#6fd1a8':'#5eb568';
 // Shadow
 c.fillStyle='rgba(10,16,22,0.38)';
 c.fillRect(x-4*P,y+2*P,8*P,3*P);
 // Trunk
 c.fillStyle='#4a3020';
 c.fillRect(x-P,y-2*P,2*P,4*P);
 c.fillStyle='#6e4930';
 c.fillRect(x-P,y-2*P,P,4*P);
 // Pixel canopy layers with dark 1px pixel outline
 const blocks=[
  [-4,-6,8,4,leafDark],
  [-3,-8,6,5,leafMid],
  [-2,-9,4,3,leafLight],
  [-1,-10,2,1,'#b8f29d'],
 ] as const;
 c.fillStyle='#10161f';
 c.fillRect(x-4*P-2,y-6*P-2,8*P+4,4*P+4);
 c.fillRect(x-3*P-2,y-9*P-2,6*P+4,4*P+4);
 for(const [bx,by,bw,bh,col] of blocks){
  c.fillStyle=col;
  c.fillRect(x+bx*P,y+by*P,bw*P,bh*P);
 }
}

function drawPixelCitadel(c:CanvasRenderingContext2D,x:number,y:number,dark:boolean){
 const P=3;
 // Shadow
 c.fillStyle='rgba(8,12,18,0.45)';
 c.fillRect(x-8*P,y+3*P,16*P,4*P);
 // Outline
 c.fillStyle='#10151f';
 c.fillRect(x-7*P-2,y-8*P-2,14*P+4,12*P+4);
 // Stone walls
 c.fillStyle=dark?'#3d495e':'#8c8275';
 c.fillRect(x-7*P,y-5*P,14*P,9*P);
 c.fillStyle=dark?'#52627a':'#b5aa99';
 c.fillRect(x-6*P,y-5*P,12*P,8*P);
 // Roof
 c.fillStyle=dark?'#3d2963':'#a8383b';
 c.fillRect(x-8*P,y-8*P,16*P,3*P);
 c.fillStyle=dark?'#5c3d94':'#cf5154';
 c.fillRect(x-7*P,y-9*P,14*P,2*P);
 // Battlements & Gold Banner
 c.fillStyle='#f0c954';
 c.fillRect(x-2*P,y-4*P,4*P,3*P);
 // Glowing arched gate
 c.fillStyle='#18202c';
 c.fillRect(x-2*P,y,4*P,4*P);
 c.fillStyle='#ffd86b';
 c.fillRect(x-P,y+P,2*P,2*P);
}

/**
 * Generates a full 16-bit Pixel Art RPG Tilemap battlefield for Tower Defense,
 * replacing the legacy illustrated terrain image with crisp pixel tiles, rivers, bridges, and pixel props.
 */
export function battleBackground(level:Level,ratio:number){
 const height=Math.max(360,Math.round(1000/Math.max(.5,Math.min(2.5,ratio||1.6667))));
 const key='px-v3:'+level.id+':'+height;
 const old=cache.get(key);
 if(old)return old;

 const canvas=document.createElement('canvas');
 canvas.width=1000;canvas.height=height;
 const c=canvas.getContext('2d')!;
 c.imageSmoothingEnabled=false;

 const night=level.theme==='night',archive=level.theme==='archive',coast=level.theme==='coast',town=level.theme==='town';
 const dark=night||archive;

 let seed=level.id*1337+19;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

 // 1. 16-bit Pixel Art Checkerboard Tile Grid (16x16 tiles)
 const TILE=16;
 const pal=night
  ?['#1b2838','#1f2e40','#162230','#25374c']
  :archive
  ?['#261e36','#2c2340','#20182e','#352a4d']
  :coast
  ?['#56946e','#5ea077','#4e8965','#6ab084']
  :town
  ?['#5c7a52','#64855a','#537049','#6f9164']
  :['#467d43','#4e8a4b','#3f713c','#599955'];

 for(let ty=0;ty<height;ty+=TILE){
  for(let tx=0;tx<1000;tx+=TILE){
   const checker=((tx/TILE)+(ty/TILE))&1;
   const r=rand();
   c.fillStyle=r<0.15?pal[2]:r<0.3?pal[3]:pal[checker];
   c.fillRect(tx,ty,TILE,TILE);
   // Subtle pixel blade detail inside tile
   if(r>0.72){
    c.fillStyle=dark?'#ffffff12':'#ffffff1c';
    c.fillRect(tx+4,ty+4,4,4);
    c.fillRect(tx+8,ty+8,4,4);
   }
  }
 }

 // 2. Scenic Pixel Stream / Arcane Canal across background
 const riverX=180+(level.id*117)%580;
 for(let ry=0;ry<height;ry+=8){
  const wx=riverX+Math.round(Math.sin(ry*0.015+level.id)*36/4)*4;
  c.fillStyle=dark?'#111c2d':'#28597a';
  c.fillRect(wx-24,ry,48,8);
  c.fillStyle=dark?'#203b5c':'#3b82a6';
  c.fillRect(wx-18,ry,36,8);
  if((ry/8)%2===0){
   c.fillStyle='#9be8ff66';
   c.fillRect(wx-8,ry+2,12,4);
  }
 }

 // 3. Pixel Wildflowers, Mushrooms & Pebbles
 for(let i=0;i<110;i++){
  const gx=Math.floor(rand()*248)*4,gy=Math.floor(rand()*(height/4))*4;
  c.fillStyle=dark?(i%3===0?'#7ceeff99':'#b48eff77'):(i%3===0?'#ffe066':i%2===0?'#ff758f':'#d8f3dc');
  c.fillRect(gx,gy,4,4);
  c.fillStyle='#141b2488';
  c.fillRect(gx,gy+4,4,2);
 }

 // 4. Pixel-Art Cobblestone Roads & Wooden Bridges
 for(const [route,path] of level.paths.entries()){
  const pts=path.map(p=>({x:p.x,y:p.y*height/600}));
  const stroke=(width:number,color:string)=>{
   c.beginPath();
   pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));
   c.lineWidth=width;c.strokeStyle=color;c.lineJoin='round';c.lineCap='round';c.stroke();
  };
  // Dark pixel border -> dirt curb -> stone road
  stroke(46,'#0d131a');
  stroke(40,dark?'#2b3344':'#594431');
  stroke(32,dark?'#49566e':'#9e8c6c');

  for(let j=1;j<pts.length;j++){
   const a=pts[j-1],b=pts[j],len=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x);
   for(let d=6;d<len;d+=14){
    c.save();
    c.translate(a.x+Math.cos(angle)*d,a.y+Math.sin(angle)*d);
    c.rotate(angle);
    for(let row=0;row<2;row++){
     const col=(dark?['#5b6b85','#687a96','#7589a8']:['#b8a684','#c9b795','#a69472'])[Math.floor(rand()*3)];
     const rx=-6+(row?2:0),ry=row?1:-12;
     c.fillStyle='#14182088';
     c.fillRect(rx+1,ry+1,11,10);
     c.fillStyle=col;
     c.fillRect(rx,ry,11,10);
     c.fillStyle='#ffffff38';
     c.fillRect(rx,ry,11,2);
    }
    c.restore();
   }
  }

  // Entry Portal & Sanctuary PixelCitadel
  const a=pts[0],b=pts[1],end=pts.at(-1)!;
  const routeCol=['#ffd86b','#7ceeff','#eb9eff','#a8f078'][route%4];
  c.save();
  c.translate(Math.max(16,Math.min(984,a.x)),Math.max(16,Math.min(height-16,a.y)));
  c.rotate(Math.atan2(b.y-a.y,b.x-a.x));
  c.fillStyle='#10161f';
  c.fillRect(-10,-10,20,20);
  c.fillStyle=routeCol;
  c.beginPath();c.moveTo(-6,-8);c.lineTo(8,0);c.lineTo(-6,8);c.closePath();c.fill();
  c.restore();

  const bx=Math.max(20,Math.min(980,a.x+24)),by=Math.max(20,Math.min(height-20,a.y-22));
  c.fillStyle='#101822';
  c.fillRect(bx-11,by-11,22,22);
  c.strokeStyle=routeCol;c.lineWidth=2;c.strokeRect(bx-11,by-11,22,22);
  c.fillStyle=routeCol;c.font='bold 12px monospace';c.textAlign='center';
  c.fillText(String(route+1),bx,by+4);

  const cx=Math.max(36,Math.min(960,end.x-42)),cy=Math.max(36,Math.min(height-28,end.y-10));
  drawPixelCitadel(c,cx,cy,dark);

  const rx=Math.max(4,Math.min(918,cx-38)),ry=Math.max(4,Math.min(height-24,cy-46));
  c.fillStyle='#101a24f2';
  c.fillRect(rx,ry,76,18);
  c.strokeStyle='#ffd86b';c.lineWidth=2;c.strokeRect(rx,ry,76,18);
  c.fillStyle='#ffe89e';c.font='bold 9px monospace';c.textAlign='center';
  c.fillText('♜ SANTUÁRIO',rx+38,ry+12);
 }

 // 5. Pixel Trees around map margins & safe clearings
 for(let i=0;i<28;i++){
  const tx=Math.round((24+rand()*952)/4)*4;
  const ty=Math.round((28+rand()*(height-52))/4)*4;
  const scaleY=height/600;
  const nearPath=level.paths.some(path=>path.some(p=>Math.hypot(p.x-tx,p.y*scaleY-ty)<68));
  const nearSpot=level.spots.some(p=>Math.hypot(p.x-tx,p.y*scaleY-ty)<56);
  if(nearPath||nearSpot)continue;
  drawPixelTree(c,tx,ty,level.theme,0.85+rand()*0.3);
 }

 if(cache.size>8)cache.clear();
 cache.set(key,canvas);
 return canvas;
}

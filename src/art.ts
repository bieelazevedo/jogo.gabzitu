import type {CatKind,EnemyKind} from './types';

export const art={
 coast:new Image(),archive:new Image(),laterBosses:new Image(),roster:new Image(),
 villains:new Image(),adminSpells:new Image(),cats:new Image(),evolved:new Image(),
 extra:new Image(),enemies:new Image(),terrain:new Image(),town:new Image(),
 night:new Image(),uia:new Image(),legollas:new Image(),elemental:new Image()
};

const names={
 coast:'/terrain-coast-v2.webp',archive:'/terrain-archive-v2.webp',laterBosses:'/bosses-worlds-v2.webp',
 roster:'/roster-v2.webp',villains:'/villains-v2.webp',adminSpells:'/admin-spells-v2.webp',
 cats:'/cats-atlas.webp',evolved:'/cats-evolved-v2.webp',extra:'/extra-cats.webp',
 enemies:'/enemies-atlas.webp',terrain:'/terrain.webp',town:'/terrain-town-v2.webp',
 night:'/terrain-night-v2.webp',uia:'/uia-spin.webp',legollas:'/legollas-animation.webp',
 elemental:'/elemental-animation.webp'
};

export const artReady=Promise.all(
 Object.entries(art).map(([key,img])=>new Promise<void>(resolve=>{
  img.onload=()=>resolve();
  img.onerror=()=>resolve();
  img.src=names[key as keyof typeof names];
 }))
);

export const catFrame:Partial<Record<CatKind,number>>={
 archer:0,ice:1,bomber:2,knight:3,witch:4,commander:5,bard:0,monk:3,engineer:2,uia:6
};

export const enemyFrame:Partial<Record<EnemyKind,number>>={
 rat:0,runner:1,dog:2,armored:3,swarm:4,elite:5,ratazao:6,vacuum:7,king:8
};

const pixelCache=new Map<string,HTMLCanvasElement>();

/**
 * Converts a sprite frame from a high-res atlas into an authentic 16-bit Pixel Art sprite
 * with quantized color vibrancy and a crisp 1px dark pixel contour, cached for 60+ FPS blitting.
 */
function getPixelFrame(img:HTMLImageElement,cols:number,rows:number,frame:number):HTMLCanvasElement|null{
 if(!img.complete||!img.naturalWidth)return null;
 const key=`${img.src}:${cols}x${rows}:${frame}`;
 const cached=pixelCache.get(key);
 if(cached)return cached;

 const sw=img.naturalWidth/cols,sh=img.naturalHeight/rows;
 const sx=(frame%cols)*sw,sy=Math.floor(frame/cols)*sh;
 const PX=68; // 68x68 pixel art resolution per character sprite
 const work=document.createElement('canvas');
 work.width=PX;work.height=PX;
 const wc=work.getContext('2d',{willReadFrequently:true});
 if(!wc)return null;

 wc.imageSmoothingEnabled=true;
 wc.imageSmoothingQuality='medium';
 wc.drawImage(img,sx,sy,sw,sh,2,2,PX-4,PX-4);

 try{
  const imgData=wc.getImageData(0,0,PX,PX),d=imgData.data;
  const alpha=new Uint8Array(PX*PX);
  // Step 1: Crisp alpha threshold & 16-bit color quantization (RGB565-style vibrancy)
  for(let i=0;i<d.length;i+=4){
   const a=d[i+3];
   if(a<72){
    d[i+3]=0;
    alpha[i>>2]=0;
   }else{
    d[i+3]=255;
    alpha[i>>2]=1;
    // Slight contrast & saturation boost before quantizing to 24 steps per channel
    let r=d[i],g=d[i+1],b=d[i+2];
    const avg=(r+g+b)/3;
    r=Math.min(255,Math.max(0,avg+(r-avg)*1.18));
    g=Math.min(255,Math.max(0,avg+(g-avg)*1.18));
    b=Math.min(255,Math.max(0,avg+(b-avg)*1.18));
    d[i]=Math.round(r/11)*11;
    d[i+1]=Math.round(g/11)*11;
    d[i+2]=Math.round(b/11)*11;
   }
  }
  // Step 2: Add crisp 1px dark retro outline around opaque pixels
  for(let y=1;y<PX-1;y++){
   for(let x=1;x<PX-1;x++){
    const idx=y*PX+x;
    if(alpha[idx])continue;
    if(alpha[idx-1]||alpha[idx+1]||alpha[idx-PX]||alpha[idx+PX]){
     const p=idx*4;
     d[p]=20;d[p+1]=26;d[p+2]=36;d[p+3]=235;
    }
   }
  }
  wc.putImageData(imgData,0,0);
 }catch{
  // Fallback if canvas is tainted
 }

 pixelCache.set(key,work);
 return work;
}

export function atlas(
 c:CanvasRenderingContext2D,img:HTMLImageElement,cols:number,rows:number,
 frame:number,x:number,y:number,width:number,height:number
){
 const px=getPixelFrame(img,cols,rows,frame);
 const prevSmooth=c.imageSmoothingEnabled;
 c.imageSmoothingEnabled=false;
 if(px){
  c.drawImage(px,Math.round(x),Math.round(y),Math.round(width),Math.round(height));
 }else{
  const w=img.naturalWidth/cols,h=img.naturalHeight/rows;
  c.drawImage(img,(frame%cols)*w,Math.floor(frame/cols)*h,w,h,Math.round(x),Math.round(y),Math.round(width),Math.round(height));
 }
 c.imageSmoothingEnabled=prevSmooth;
}

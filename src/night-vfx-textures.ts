import * as T from 'three';
import {fxTexture} from './night-assets';
const cache=new Map<string,T.Texture>();
/** Soft, antialiased particle masks. Generated once; no visible polygon edges. */
export function vfxTexture(name:string){
 if(!['glow','spark','flare','fire','smoke','slash','trace','ring','star'].includes(name))return fxTexture(name);
 let texture=cache.get(name);if(texture)return texture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!,n=256;c.translate(n/2,n/2);
 function glow(x:number,y:number,r:number,alpha=1){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,255,255,${alpha})`);g.addColorStop(.18,`rgba(255,255,255,${alpha*.7})`);g.addColorStop(.55,`rgba(255,255,255,${alpha*.15})`);g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
 if(name==='slash'){
  for(let i=0;i<6;i++){c.strokeStyle=`rgba(255,255,255,${.06+i*.06})`;c.lineWidth=24-i*4;c.lineCap='round';c.shadowColor='white';c.shadowBlur=9;c.beginPath();c.ellipse(0,15,100,73,-.25,-2.8,.2);c.stroke();}
 }else if(name==='ring'){
  const g=c.createRadialGradient(0,0,0,0,0,124);for(const [at,a] of [[0,0],[.69,0],[.76,.12],[.80,.85],[.83,.16],[.92,0],[1,0]])g.addColorStop(at,`rgba(255,255,255,${a})`);c.fillStyle=g;c.fillRect(-128,-128,256,256);
 }else if(name==='smoke'){
  for(let i=0;i<10;i++){const a=i*2.399;glow(Math.sin(a)*36,Math.cos(a)*32,65+(i%3)*8,.12);}
 }else if(name==='trace'){
  c.scale(.23,1);glow(0,-12,115,.6);c.scale(1/.23,1);glow(0,-43,20,.9);
 }else{glow(0,0,name==='fire'?108:120,.85);if(name==='spark'||name==='flare'||name==='star'){c.save();c.scale(.08,.85);glow(0,0,120,.65);c.restore();c.save();c.scale(.85,.08);glow(0,0,120,.65);c.restore();}}
 texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;cache.set(name,texture);return texture;
}

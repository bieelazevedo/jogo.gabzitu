import * as T from 'three';
import {loadNightAssets} from './night-assets';
import {HeroActor} from './night-actors';
import type {NightClass} from './night-data';
import type {NightPlayer} from './night-simulation';

/** Lobby showcase: the selected hero, animated, on a small turntable. One WebGL context, disposed before the run starts. */
export class ClassPreview{
 readonly canvas=document.createElement('canvas');private renderer?:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.PerspectiveCamera(30,.8,.1,50);
 private hero?:HeroActor;private classId?:NightClass;private raf=0;private last=0;private time=0;private cheer=0;private disposed=false;
 constructor(){this.canvas.className='night-class-preview';try{this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:true});}catch{return;}
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;
  this.scene.add(new T.HemisphereLight(0xc9dcff,0x2a2238,1.8));const key=new T.DirectionalLight(0xfff0dd,2.6);key.position.set(2,4,5);this.scene.add(key);const rim=new T.DirectionalLight(0xffa56b,1.4);rim.position.set(-3,3,-4);this.scene.add(rim);
  this.camera.position.set(0,1.9,6.4);this.camera.lookAt(0,1.15,0);this.raf=requestAnimationFrame(t=>this.frame(t));}
 async show(classId:NightClass){if(this.classId===classId||!this.renderer)return;this.classId=classId;const assets=await loadNightAssets().catch(()=>null);if(!assets||this.disposed||this.classId!==classId)return;this.hero?.dispose();this.hero=new HeroActor(assets,classId,this.scene);this.cheer=1.6;}
 private frame(now:number){if(this.disposed)return;const dt=Math.min(.05,(now-(this.last||now))/1000);this.last=now;this.time+=dt;
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(w&&h&&this.renderer&&(this.canvas.width!==Math.round(w*this.renderer.getPixelRatio())||this.canvas.height!==Math.round(h*this.renderer.getPixelRatio()))){this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  if(this.hero){this.cheer=Math.max(0,this.cheer-dt);const p={x:0,z:0,y:0,facing:Math.sin(this.time*.6)*.5,hp:100,action:0,combo:1,actionTime:0,duration:1,moving:0,running:0,hit:0,shield:0} as unknown as NightPlayer;this.hero.update(p,dt,this.time,0);if(this.cheer>0)this.hero.actor.play('Cheer',{loop:false,fade:.15});this.hero.root.rotation.y=Math.sin(this.time*.6)*.5;}
  this.renderer?.render(this.scene,this.camera);this.raf=requestAnimationFrame(t=>this.frame(t));}
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.hero?.dispose();this.renderer?.dispose();this.renderer?.forceContextLoss();this.canvas.remove();}
}

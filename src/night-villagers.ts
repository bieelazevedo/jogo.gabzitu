import * as T from 'three';
import type {NightAssets} from './night-assets';
import {HeroActor} from './night-actors';
import {NIGHT_NPCS} from './night-campaign';
import type {NightState,NightPlayer} from './night-simulation';

/** Named, animated villagers use the same cached rigs as the party. */
export function nightVillagers(assets:NightAssets,parent:T.Object3D){
 const textures:T.Texture[]=[],materials:T.Material[]=[];
 const villagers=NIGHT_NPCS.map(n=>{
  const actor=new HeroActor(assets,n.classId,parent);actor.root.position.set(n.x,0,n.z);actor.root.rotation.y=.5;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const c=canvas.getContext('2d')!;
  c.fillStyle='#0c1b23dd';c.beginPath();c.roundRect(4,16,248,76,16);c.fill();c.strokeStyle='#bcaa76';c.lineWidth=2;c.stroke();c.fillStyle='#ead4a0';c.font='bold 32px Georgia';c.textAlign='center';c.fillText('!  '+n.name,128,64);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);
  const material=new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false});materials.push(material);const label=new T.Sprite(material);label.scale.set(2.3,.86,1);label.position.set(0,3.15,0);actor.root.add(label);
  return {actor,n,label};
 });
 return {
  update(s:NightState,dt:number,focus?:T.Vector3){for(const {actor,n,label} of villagers){actor.root.visible=!focus||Math.hypot(n.x-focus.x,n.z-focus.z)<42;if(!actor.root.visible)continue;const p={x:n.x,z:n.z,facing:.5,hp:100,action:0,combo:1,actionTime:0,duration:1,moving:0,running:0,hit:0,shield:0} as NightPlayer;actor.update(p,dt,s.time,0);label.position.y=3.15+Math.sin(s.time*1.8)*.08;}},
  dispose(){villagers.forEach(v=>v.actor.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
 };
}

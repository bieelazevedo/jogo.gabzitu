import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HeroActor} from './night-actors';
import {fxTexture,type NightAssets} from './night-assets';
import {NIGHT_MONUMENTS} from './night-expedition';
import {weatheredStone} from './night-art-direction';
import type {NightState} from './night-simulation';

/** Original monument assembled from the project's CC0 adventurer; one static baked statue shared three times. */
export function nightMonuments(assets:NightAssets,parent:T.Object3D){
 const root=new T.Group();parent.add(root);const scratch=new T.Group(),hero=new HeroActor(assets,'blade',scratch);hero.actor.play('Idle');hero.actor.update(.25);scratch.updateMatrixWorld(true);
 const chunks:T.BufferGeometry[]=[];hero.root.traverse(o=>{if(!(o instanceof T.Mesh)||!o.visible)return;if(o instanceof T.SkinnedMesh)o.skeleton.update();const source=o.geometry.getAttribute('position'),positions=new Float32Array(source.count*3),v=new T.Vector3();
  for(let i=0;i<source.count;i++){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld);v.toArray(positions,i*3);}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));if(o.geometry.index)g.setIndex(o.geometry.index.clone());g.computeVertexNormals();const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();chunks.push(flat);
 });
 const statueGeometry=mergeGeometries(chunks,false)!;chunks.forEach(g=>g.dispose());hero.dispose();
 const statueMaterial=new T.MeshStandardMaterial({color:0x82918e,roughness:.94,metalness:.08});
 const plinthMaterial=weatheredStone(new T.MeshStandardMaterial({color:0xb5b5af,roughness:.96}));
 const pedestalGeometry=new T.CylinderGeometry(1.5,1.8,.5,32),topGeometry=new T.CylinderGeometry(1.05,1.3,1.6,32),labelGeometry=new T.BoxGeometry(.82,.36,.08);
 const gold=new T.MeshStandardMaterial({color:0xc6ad75,roughness:.5,metalness:.45});
 const ringGeometry=new T.RingGeometry(1.9,2.05,80),circleGeometry=new T.RingGeometry(.985,1,128),wallGeometry=new T.CylinderGeometry(1,1,5,128,1,true);
 const wallMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time;void main(){float threads=pow(max(0.0,sin(vUv.x*150.0+time*1.5)),12.0);float pulse=.5+.5*sin(vUv.y*65.0-time*4.0);float edge=pow(abs(vUv.y-.5)*2.0,4.0);float a=.045+threads*.18+pulse*.035+edge*.18;gl_FragColor=vec4(.28,.75,1.0,a);}' });
 const circles=NIGHT_MONUMENTS.map((m,i)=>{
  const g=new T.Group();g.position.set(m.x,0,m.z);root.add(g);
  const base=new T.Mesh(pedestalGeometry,plinthMaterial);base.position.y=.25;base.receiveShadow=base.castShadow=true;g.add(base);
  const pillar=new T.Mesh(topGeometry,plinthMaterial);pillar.position.y=1.25;pillar.castShadow=pillar.receiveShadow=true;g.add(pillar);
  const statue=new T.Mesh(statueGeometry,statueMaterial);statue.scale.setScalar(2.1);statue.position.y=2.05;statue.rotation.y=i*.8+.3;statue.castShadow=statue.receiveShadow=true;g.add(statue);
  const plaque=new T.Mesh(labelGeometry,gold);plaque.position.set(0,1.3,1.15);g.add(plaque);
  const runeMaterial=new T.MeshBasicMaterial({map:fxTexture('rune'),color:0xe2be78,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
  const rune=new T.Mesh(new T.PlaneGeometry(4.7,4.7),runeMaterial);rune.rotation.x=-Math.PI/2;rune.position.y=.06;g.add(rune);
  const rim=new T.Mesh(ringGeometry,gold);rim.rotation.x=-Math.PI/2;rim.position.y=.035;g.add(rim);
  const borderMaterial=new T.MeshBasicMaterial({color:0x7edcfa,transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
  const circle=new T.Mesh(circleGeometry,borderMaterial);circle.scale.setScalar(m.r);circle.rotation.x=-Math.PI/2;circle.position.y=.07;g.add(circle);
  const wall=new T.Mesh(wallGeometry,wallMaterial);wall.scale.set(m.r,1,m.r);wall.position.y=2.5;wall.visible=circle.visible=false;g.add(wall);
  return {m,g,rune,runeMaterial,circle,borderMaterial,wall};
 });
 return {
  update(s:NightState){wallMaterial.uniforms.time.value=s.time;for(const item of circles){const active=s.trial?.status==='active'&&s.trial.monument===item.m.id,done=s.completedTrials?.includes(item.m.id);item.wall.visible=item.circle.visible=active;item.runeMaterial.color.setHex(done?0x607c74:active?0x82dfff:0xe2be78);item.runeMaterial.opacity=done?.25:.55+Math.sin(s.time*1.7)*.12;item.rune.rotation.z=s.time*(active?.18:.035);}},
  dispose(){root.removeFromParent();[statueGeometry,pedestalGeometry,topGeometry,labelGeometry,ringGeometry,circleGeometry,wallGeometry].forEach(g=>g.dispose());[statueMaterial,plinthMaterial,gold,wallMaterial].forEach(m=>m.dispose());circles.forEach(c=>{c.rune.geometry.dispose();c.runeMaterial.dispose();c.borderMaterial.dispose();});},
 };
}

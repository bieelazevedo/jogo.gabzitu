import * as T from 'three';
import {NIGHT_HOMESTEADS,NIGHT_TOWN_HOUSES} from './night-expedition';

const loader=new T.TextureLoader();
let stoneColor:T.Texture|undefined,stoneNormal:T.Texture|undefined;
function stoneTextures(){
 if(!stoneColor){stoneColor=loader.load(import.meta.env.BASE_URL+'textures/night/stone-color.webp');stoneColor.colorSpace=T.SRGBColorSpace;stoneColor.wrapS=stoneColor.wrapT=T.RepeatWrapping;}
 if(!stoneNormal){stoneNormal=loader.load(import.meta.env.BASE_URL+'textures/night/stone-normal.webp');stoneNormal.wrapS=stoneNormal.wrapT=T.RepeatWrapping;}
 return {stoneColor,stoneNormal};
}

/** World-space stone grain keeps the original atlas colours, with no new texture download. */
export function weatheredStone(source:T.Material){
 if(!(source instanceof T.MeshStandardMaterial))return source.clone();
 const {stoneColor,stoneNormal}=stoneTextures();
 const material=source.clone();material.roughness=.96;material.metalness=0;
 material.onBeforeCompile=shader=>{
  shader.uniforms.nightStoneColor={value:stoneColor};
  shader.uniforms.nightStoneNormal={value:stoneNormal};
  shader.vertexShader='varying vec3 vStonePosition;\nvarying vec3 vStoneNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vec4 stonePosition=vec4(transformed,1.0);
   #ifdef USE_INSTANCING
    stonePosition=instanceMatrix*stonePosition;
   #endif
   vStonePosition=(modelMatrix*stonePosition).xyz;
   vec3 stoneNormal=objectNormal;
   #ifdef USE_INSTANCING
    stoneNormal=mat3(instanceMatrix)*stoneNormal;
   #endif
   vStoneNormal=normalize(mat3(modelMatrix)*stoneNormal);`);
  shader.fragmentShader='uniform sampler2D nightStoneColor;\nuniform sampler2D nightStoneNormal;\nvarying vec3 vStonePosition;\nvarying vec3 vStoneNormal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 weights=pow(abs(normalize(vStoneNormal)),vec3(4.0));weights/=max(.001,weights.x+weights.y+weights.z);
   vec3 projected=texture2D(nightStoneColor,vStonePosition.zy*.5).rgb*weights.x+texture2D(nightStoneColor,vStonePosition.xz*.5).rgb*weights.y+texture2D(nightStoneColor,vStonePosition.xy*.5).rgb*weights.z;
   diffuseColor.rgb=mix(diffuseColor.rgb,projected*vec3(.85,.91,1.0),.8);
   vec3 stoneCell=floor(vStonePosition*38.0);
   float grain=fract(sin(dot(stoneCell,vec3(12.9898,78.233,37.719)))*43758.5453);
   float course=floor(vStonePosition.y*1.6);
   vec2 stoneUV=vec2(abs(vStoneNormal.x)>.65?vStonePosition.z:vStonePosition.x,vStonePosition.y)*vec2(1.15,1.6);
   stoneUV.x+=mod(course,2.0)*.5;
   vec2 joints=min(fract(stoneUV),1.0-fract(stoneUV));
   float mortar=(1.0-smoothstep(.008,.025,min(joints.x,joints.y)))*(1.0-smoothstep(.5,.8,abs(vStoneNormal.y)));
   float damp=1.0-smoothstep(0.0,1.2,vStonePosition.y);
   diffuseColor.rgb*=.89+grain*.17;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.52,mortar*.65);
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.68,.83,.72),damp*.4);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 stoneBase=normalize(vStoneNormal);
   vec3 detailX=texture2D(nightStoneNormal,vStonePosition.zy*.5).xyz*2.0-1.0;
   vec3 detailY=texture2D(nightStoneNormal,vStonePosition.xz*.5).xyz*2.0-1.0;
   vec3 detailZ=texture2D(nightStoneNormal,vStonePosition.xy*.5).xyz*2.0-1.0;
   vec3 stoneDetail=vec3(detailX.z*sign(stoneBase.x),detailX.y,detailX.x)*weights.x+vec3(detailY.x,detailY.z*sign(stoneBase.y),detailY.y)*weights.y+vec3(detailZ.x,detailZ.y,detailZ.z*sign(stoneBase.z))*weights.z;
   normal=normalize(mat3(viewMatrix)*normalize(mix(stoneBase,stoneDetail,.45)));`);
 };
 material.customProgramCacheKey=()=> 'night-weathered-stone-v1';return material;
}

/** Photo-based ground replaces the flat hex atlas; normal mapping supplies small-scale relief. */
export function forestGround(root:T.Object3D,paths:number[][]){
 const color=loader.load(import.meta.env.BASE_URL+'textures/night/forest-color.webp'),normal=loader.load(import.meta.env.BASE_URL+'textures/night/forest-normal.webp');
 color.colorSpace=T.SRGBColorSpace;for(const t of [color,normal]){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(36,36);t.anisotropy=4;}
 const geometry=new T.PlaneGeometry(192,192,64,64);geometry.rotateX(-Math.PI/2);
 const positions=geometry.getAttribute('position'),colors=new Float32Array(positions.count*3),blend=new Float32Array(positions.count),tint=new T.Color();
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),forest=x<-8&&z>-6;
  tint.setHex(forest?0x9aada0:Math.hypot(x+24,z+27)<20?0x89838e:0xb4b19a);tint.toArray(colors,i*3);
  let distance=100;for(const [ax,az,bx,bz] of paths){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));distance=Math.min(distance,Math.hypot(x-ax-dx*t,z-az-dz*t));}
  const courtyard=Math.hypot(x,z-27)<9||NIGHT_TOWN_HOUSES.some(h=>Math.hypot(x-h.x,z-h.z)<6)||NIGHT_HOMESTEADS.some(h=>Math.hypot(x-h.x,z-h.z)<11);
  blend[i]=courtyard?0:Math.min(1,Math.max(0,(distance-2)/3))*(Math.hypot(x+24,z+27)<17?.3:1);
 }
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 geometry.setAttribute('vegetationBlend',new T.BufferAttribute(blend,1));
 const moss=loader.load(import.meta.env.BASE_URL+'textures/night/grass-color.webp');moss.colorSpace=T.SRGBColorSpace;moss.wrapS=moss.wrapT=T.RepeatWrapping;moss.anisotropy=4;
 const material=new T.MeshStandardMaterial({map:color,normalMap:normal,normalScale:new T.Vector2(.7,.7),roughness:.98,vertexColors:true});
 material.onBeforeCompile=shader=>{shader.uniforms.nightMoss={value:moss};shader.vertexShader='attribute float vegetationBlend;\nvarying float vVegetationBlend;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvVegetationBlend=vegetationBlend;');shader.fragmentShader='uniform sampler2D nightMoss;\nvarying float vVegetationBlend;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(nightMoss,vMapUv).rgb*vColor,vVegetationBlend);`);};
 const mesh=new T.Mesh(geometry,material);mesh.position.y=-.08;mesh.receiveShadow=true;root.add(mesh);
 return ()=>{mesh.removeFromParent();geometry.dispose();material.dispose();color.dispose();normal.dispose();moss.dispose();};
}

/** Soft contact shading, baked once into a tiny texture. No shadow maps or extra lights. */
export function contactShadows(root:T.Object3D){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const c=canvas.getContext('2d')!,g=c.createRadialGradient(32,32,2,32,32,32);
 g.addColorStop(0,'rgba(8,15,24,.65)');g.addColorStop(.35,'rgba(8,15,24,.42)');g.addColorStop(1,'rgba(8,15,24,0)');
 c.fillStyle=g;c.fillRect(0,0,64,64);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
 const geometry=new T.PlaneGeometry(1,1),placements:{x:number;z:number;w:number;d:number}[]=[];
 const meshes:T.InstancedMesh[]=[];
 return {
  add(x:number,z:number,w:number,d:number){placements.push({x,z,w,d});},
  bake(){if(!placements.length)return;const mesh=new T.InstancedMesh(geometry,material,placements.length),dummy=new T.Object3D();
   placements.forEach((p,i)=>{dummy.position.set(p.x,.035,p.z);dummy.rotation.x=-Math.PI/2;dummy.scale.set(p.w,p.d,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
   mesh.computeBoundingSphere();mesh.renderOrder=1;root.add(mesh);meshes.push(mesh);
  },
  dispose(){meshes.forEach(m=>{m.removeFromParent();m.dispose();});geometry.dispose();material.dispose();texture.dispose();},
 };
}

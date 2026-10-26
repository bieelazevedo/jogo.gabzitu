import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** CC0 KayKit models (Kay Lousberg), baked by scripts/build-models.mjs. */
export const CHARACTER_NAMES=['Knight','Barbarian','Mage','Rogue','Rogue_Hooded','Skeleton_Warrior','Skeleton_Minion','Skeleton_Rogue','Skeleton_Mage'] as const;
export type CharacterName=typeof CHARACTER_NAMES[number];
const PACKS=['halloween','village','dungeon','items','skeleton_items'] as const;
export type PropPart={geometry:T.BufferGeometry;material:T.Material;matrix:T.Matrix4};
export type NightAssets={characters:Record<CharacterName,T.Object3D>;clips:Map<string,T.AnimationClip>;props:Map<string,T.Object3D>;parts:(name:string)=>PropPart[]};

let pending:Promise<NightAssets>|null=null,ready:NightAssets|null=null,failed=false;
export const nightAssets=()=>ready;
export const nightAssetsFailed=()=>failed;

/** Skinned body parts share one skeleton and material; merging them keeps each character to a few draw calls. */
function mergeSkinned(template:T.Object3D){
 const groups=new Map<string,T.SkinnedMesh[]>();
 template.traverse(o=>{if(o instanceof T.SkinnedMesh&&!Array.isArray(o.material)){// GLTFLoader gives every part its own Skeleton object over the same bones, so group by bones.
  const key=o.skeleton.bones.map(b=>b.uuid).join()+':'+o.material.uuid;groups.set(key,[...(groups.get(key)||[]),o]);}});
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;const first=meshes[0];
  if(meshes.some(m=>!m.bindMatrix.equals(first.bindMatrix)||m.parent!==first.parent||!m.matrix.equals(first.matrix)))continue;
  const geometry=mergeGeometries(meshes.map(m=>m.geometry),false);if(!geometry)continue;
  const merged=new T.SkinnedMesh(geometry,first.material);merged.name=first.name;merged.position.copy(first.position);merged.quaternion.copy(first.quaternion);merged.scale.copy(first.scale);
  first.parent!.add(merged);merged.bind(first.skeleton,first.bindMatrix);meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});
 }
}

export function loadNightAssets():Promise<NightAssets>{
 if(pending)return pending;
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const base=import.meta.env.BASE_URL+'models/';
 pending=(async()=>{
  const [characters,anims,packs]=await Promise.all([
   Promise.all(CHARACTER_NAMES.map(n=>loader.loadAsync(base+'characters/'+n+'.glb'))),
   loader.loadAsync(base+'characters/anims.glb'),
   Promise.all(PACKS.map(n=>loader.loadAsync(base+'env/'+n+'.glb'))),
  ]);
  const record={} as Record<CharacterName,T.Object3D>;
  CHARACTER_NAMES.forEach((n,i)=>{const scene=characters[i].scene;mergeSkinned(scene);scene.traverse(o=>{if(o instanceof T.Mesh)o.frustumCulled=false;});record[n]=scene;});
  const clips=new Map(anims.animations.map(c=>[c.name,c]));
  const props=new Map<string,T.Object3D>();for(const g of packs)for(const child of g.scene.children)props.set(child.name,child);
  const partCache=new Map<string,PropPart[]>();
  const parts=(name:string)=>{let list=partCache.get(name);if(list)return list;const node=props.get(name);list=[];if(node){const root=new T.Group();const copy=node.clone();copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.scale.set(1,1,1);root.add(copy);root.updateMatrixWorld(true);copy.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material))list!.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone()});});}partCache.set(name,list);return list;};
  ready={characters:record,clips,props,parts};return ready;
 })();
 pending.catch(e=>{failed=true;console.warn('Modelos 3D indisponíveis; a usar geometria simples.',e);});
 return pending;
}

const fxCache=new Map<string,T.Texture>();
/** CC0 Kenney particle textures in public/fx (glow, flare, spark, star, slash, magic, rune, ring, smoke, scorch, trace, twirl, fire). */
export function fxTexture(name:string){let t=fxCache.get(name);if(!t){t=new T.TextureLoader().load(import.meta.env.BASE_URL+'fx/'+name+'.webp');t.colorSpace=T.SRGBColorSpace;fxCache.set(name,t);}return t;}

/** Static copy of a prop (unique pieces only; repeated props should use instancing). */
export function prop(assets:NightAssets,name:string){const node=assets.props.get(name);const copy=node?node.clone():new T.Group();copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.scale.set(1,1,1);return copy;}

type PlayOptions={loop?:boolean;fade?:number;speed?:number;restart?:boolean};
/** Animated KayKit character: shared clips, per-actor materials for hit flashes and tints. */
export class Actor{
 readonly root=new T.Group();readonly model:T.Object3D;readonly mixer:T.AnimationMixer;readonly materials:T.MeshStandardMaterial[]=[];
 private actions=new Map<string,T.AnimationAction>();private current?:T.AnimationAction;active='';
 constructor(private assets:NightAssets,name:CharacterName,options:{items?:string[];hide?:string[];tint?:number;scale?:number}={}){
  this.model=cloneSkinned(assets.characters[name]);this.root.add(this.model);this.model.scale.setScalar(options.scale??1);
  const materials=new Map<T.Material,T.MeshStandardMaterial>();
  this.model.traverse(o=>{
   if(!(o instanceof T.Mesh))return;
   const slot=o.parent?.name||'';if(options.items&&/handslot/.test(slot)&&!options.items.includes(o.name)||options.hide?.includes(o.name)){o.visible=false;return;}
   const source=o.material as T.MeshStandardMaterial;let m=materials.get(source);if(!m){m=source.clone();if(options.tint!==undefined)m.color.multiply(new T.Color(options.tint));materials.set(source,m);this.materials.push(m);}o.material=m;
  });
  this.mixer=new T.AnimationMixer(this.model);
 }
 bone(name:string){return this.model.getObjectByName(name)!;}
 /** Attaches a prop from the item packs to a bone (e.g. 'handslot.r'). */
 hold(item:string,bone:string,transform?:(o:T.Object3D)=>void){const o=prop(this.assets,item);o.traverse(c=>{if(c instanceof T.Mesh){const m=(c.material as T.MeshStandardMaterial).clone();this.materials.push(m);c.material=m;}});transform?.(o);this.bone(bone)?.add(o);return o;}
 has(clip:string){return this.assets.clips.has(clip);}
 duration(clip:string){return this.assets.clips.get(clip)?.duration||1;}
 play(clip:string,{loop=true,fade=.15,speed=1,restart=false}:PlayOptions={}){
  const c=this.assets.clips.get(clip);if(!c)return;let action=this.actions.get(clip);if(!action){action=this.mixer.clipAction(c);this.actions.set(clip,action);}
  action.timeScale=speed;
  if(this.current===action&&!restart)return;
  action.reset();action.setLoop(loop?T.LoopRepeat:T.LoopOnce,Infinity);action.clampWhenFinished=!loop;action.enabled=true;action.setEffectiveWeight(1);
  if(this.current&&this.current!==action)action.crossFadeFrom(this.current,fade,false);action.play();this.current=action;this.active=clip;
 }
 flash(color:number,intensity:number){for(const m of this.materials){m.emissive.setHex(color);m.emissiveIntensity=intensity;}}
 update(dt:number){this.mixer.update(dt);}
 dispose(){this.mixer.stopAllAction();this.root.removeFromParent();this.materials.forEach(m=>m.dispose());}
}

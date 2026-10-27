import * as T from 'three';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {gameGLTFLoader} from './game-gltf';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** CC0 KayKit models (Kay Lousberg), baked by scripts/build-models.mjs. */
export const CHARACTER_NAMES=['Knight','Barbarian','Mage','Rogue','Rogue_Hooded','Rogue_Crimson','Skeleton_Warrior','Skeleton_Minion','Skeleton_Rogue','Skeleton_Mage'] as const;
export type CharacterName=typeof CHARACTER_NAMES[number];
const PACKS=['halloween','village','dungeon','items','skeleton_items','nature','meadow','medieval','weapons','authored-weapons'] as const;
export type PropPart={geometry:T.BufferGeometry;material:T.Material;matrix:T.Matrix4};
export type NightAssets={characters:Record<CharacterName,T.Object3D>;clips:Map<string,T.AnimationClip>;modern?:{models:Map<string,T.Object3D>;heads:Map<string,T.Object3D>;clips:Map<string,T.AnimationClip>;variants:Map<string,Map<string,T.AnimationClip>>};props:Map<string,T.Object3D>;parts:(name:string)=>PropPart[]};

const gltfCache=new Map<string,Promise<GLTF>>();
function loadAsset(url:string){let task=gltfCache.get(url);if(!task){task=gameGLTFLoader().loadAsync(url);gltfCache.set(url,task);task.catch(()=>gltfCache.delete(url));}return task;}
const mergedTemplates=new WeakSet<T.Object3D>();
let tdPending:Promise<NightAssets>|null=null;
let pending:Promise<NightAssets>|null=null,ready:NightAssets|null=null,failed=false;
export const nightAssets=()=>ready;
export const nightAssetsFailed=()=>failed;

/** Skinned body parts share one skeleton and material; merging them keeps each character to a few draw calls. */
function mergeSkinned(template:T.Object3D){
 if(mergedTemplates.has(template))return;mergedTemplates.add(template);
 const groups=new Map<string,T.SkinnedMesh[]>();
 // Headgear stays a separate mesh so a look can hide it (a merged mesh takes the name of its first part).
 template.traverse(o=>{if(o instanceof T.SkinnedMesh&&!Array.isArray(o.material)&&!/Hat|Helmet/.test(o.name)){// GLTFLoader gives every part its own Skeleton object over the same bones, so group by bones.
  // Parts can only share a draw call when they also share the bind pose (inverse bind matrices).
  const pose=o.skeleton.boneInverses.map(m=>m.elements.map(v=>v.toFixed(4)).join(',')).join(';');
  const key=o.skeleton.bones.map(b=>b.uuid).join()+'|'+pose+':'+o.material.uuid;groups.set(key,[...(groups.get(key)||[]),o]);}});
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;const first=meshes[0];
  if(meshes.some(m=>!m.bindMatrix.equals(first.bindMatrix)||m.parent!==first.parent||!m.matrix.equals(first.matrix)))continue;
  const geometry=mergeGeometries(meshes.map(m=>m.geometry),false);if(!geometry)continue;
  const merged=new T.SkinnedMesh(geometry,first.material);merged.name=first.name;merged.position.copy(first.position);merged.quaternion.copy(first.quaternion);merged.scale.copy(first.scale);
  first.parent!.add(merged);merged.bind(first.skeleton,first.bindMatrix);meshes.forEach(m=>{m.removeFromParent();m.geometry.dispose();});
 }
}

export function loadNightAssets(profile:'night'|'td'='night'):Promise<NightAssets>{
 const cached=profile==='td'?tdPending:pending;if(cached)return cached;

 const base=import.meta.env.BASE_URL+'models/';
 const request=(async()=>{
  const packNames=profile==='td'?PACKS.filter(n=>!['nature','medieval','weapons','authored-weapons'].includes(n)):PACKS;
  const authoredNames=['ForgottenKnight','ScarletSorceress'];
  const headNames=['Superhero_Male_FullBody','Superhero_Female_FullBody','Hair_SimpleParted','Hair_Long','Hair_Buzzed','Hair_Beard'];
  const [characters,anims,packs,modernModels,modernAnims,modernHeads]=await Promise.all([
   Promise.all(CHARACTER_NAMES.map(n=>loadAsset(base+'characters/'+n+'.glb'))),
   loadAsset(base+'characters/anims.glb'),
   Promise.all(packNames.map(n=>loadAsset(base+'env/'+n+'.glb'))),
   Promise.all((profile==='td'?[]:['Male_Ranger','Female_Ranger','Male_Peasant','Female_Peasant',...authoredNames]).map(n=>loadAsset(base+'characters/modern/'+n+'.glb'))),
   Promise.all((profile==='td'?[]:['gaits','animations']).map(n=>loadAsset(base+'characters/modern/'+n+'.glb'))),
   Promise.all((profile==='td'?[]:headNames).map(n=>loadAsset(base+'characters/modern/'+n+'.glb'))),
  ]);
  const record={} as Record<CharacterName,T.Object3D>;
  CHARACTER_NAMES.forEach((n,i)=>{const scene=characters[i].scene;mergeSkinned(scene);scene.traverse(o=>{if(o instanceof T.Mesh)o.frustumCulled=false;});record[n]=scene;});
  const clips=new Map(anims.animations.map(c=>[c.name,c]));
  const props=new Map<string,T.Object3D>();packs.forEach((g,i)=>{if(packNames[i]==='meadow')brightenFoliage(g.scene);for(const child of g.scene.children)props.set(child.name,child);});
  const partCache=new Map<string,PropPart[]>();
  const parts=(name:string)=>{let list=partCache.get(name);if(list)return list;const node=props.get(name);list=[];if(node){const root=new T.Group();const copy=node.clone();copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.scale.set(1,1,1);root.add(copy);root.updateMatrixWorld(true);copy.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material))list!.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone()});});}partCache.set(name,list);return list;};
  const authored=(profile==='td'?[]:authoredNames).map((name,i)=>{const model=modernModels[i+4].scene;model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),height=box.getSize(new T.Vector3()).y;if(!Number.isFinite(height)||height<=0)throw new Error('Escala inválida: '+name);const scale=1.95/height,wrapper=new T.Group();wrapper.add(model);model.scale.multiplyScalar(scale);model.position.set(-(box.min.x+box.max.x)*.5*scale,-box.min.y*scale,-(box.min.z+box.max.z)*.5*scale);return [name,wrapper] as [string,T.Object3D];});
  const modern=profile==='td'?undefined:{models:new Map<string,T.Object3D>([...['Male_Ranger','Female_Ranger','Male_Peasant','Female_Peasant'].map((n,i)=>[n,modernModels[i].scene] as [string,T.Object3D]),...authored]),heads:new Map(headNames.map((n,i)=>[n,modernHeads[i].scene])),clips:new Map(modernAnims.flatMap(g=>g.animations.map(c=>[c.name,c] as const))),variants:new Map(authoredNames.map((name,i)=>[name,new Map(modernModels[i+4].animations.map(c=>[c.name,c]))]))};
  const assets={characters:record,clips,modern,props,parts};if(profile==='night')ready=assets;return assets;
 })();
 if(profile==='td')tdPending=request;else pending=request;
 request.catch(e=>{if(profile==='night')failed=true;console.warn('Modelos 3D indisponíveis; a usar geometria simples.',e);});
 return request;
}

/**
 * Quaternius foliage is built from alpha-cut leaf cards shaded for a stylised engine: drawn from both sides and
 * lifted with a little self-light, it reads as lush green instead of near-black under a top-down sun.
 */
export function brightenFoliage(root:T.Object3D){const seen=new Set<T.Material>();root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(seen.has(m)||!(m instanceof T.MeshStandardMaterial))continue;seen.add(m);
 const leaf=/Leaf|Leaves|Grass|Flower|Bush|Clover|Fern|Plant/i.test(m.name+' '+(m.map?.name||''));// Their vertex colours are wind and occlusion masks for Quaternius's own shader, not albedo.
 m.vertexColors=false;m.side=T.DoubleSide;if(leaf){m.alphaTest=Math.max(m.alphaTest,.45);m.transparent=false;}
 // Grass ships as a white mask (tinted by the original shader); autumn-red twisted leaves are recoloured to spring green.
 // Leaf-card normals point every way, so the sun alone leaves canopies dark: most of their light is self-lit.
 if(m.name==='Grass')m.color.setHex(0x93c95a);else if(m.name==='Leaves_TwistedTree')m.color.setRGB(.3,2.2,.5);else if(leaf)m.color.setScalar(.6);
 if(leaf){m.emissive.copy(m.color).multiplyScalar(m.name==='Grass'?.35:1.15);m.emissiveMap=m.name==='Grass'?null:m.map;}else m.emissive.setHex(0x101010);m.emissiveMap=m.map;m.roughness=.85;m.metalness=0;}});}
let kit:Promise<NightAssets>|null=null;
/** Just one adventurer plus the shared clip library (no props): enough to animate a single KayKit character elsewhere. */
export function loadCharacterKit(name:CharacterName){
 if(kit)return kit;const base=import.meta.env.BASE_URL+'models/characters/';
 kit=Promise.all([loadAsset(base+name+'.glb'),loadAsset(base+'anims.glb')]).then(([character,anims])=>{const scene=character.scene;mergeSkinned(scene);scene.traverse(o=>{if(o instanceof T.Mesh)o.frustumCulled=false;});
  return {characters:{[name]:scene} as unknown as Record<CharacterName,T.Object3D>,clips:new Map(anims.animations.map(c=>[c.name,c])),props:new Map(),parts:()=>[]};});
 kit.catch(()=>{kit=null;});return kit;
}
const extraPacks=new Map<string,Promise<void>>();
/** Loads another environment pack (e.g. the hex battlefield tiles) into the shared prop library. */
export function loadExtraPack(name:string,profile:'night'|'td'='night'){
 const key=profile+':'+name;let p=extraPacks.get(key);if(p)return p;
 p=loadNightAssets(profile).then(async assets=>{const g=await loadAsset(import.meta.env.BASE_URL+'models/env/'+name+'.glb');for(const child of [...g.scene.children])assets.props.set(child.name,child);});
 extraPacks.set(key,p);p.catch(()=>extraPacks.delete(key));return p;
}
const models=new Map<string,Promise<{scene:T.Object3D;animations:T.AnimationClip[]}>>();
/** A standalone animated model from public/models/characters (own rig and clips, e.g. the Quaternius dog). */
export function loadModel(name:string){let p=models.get(name);if(!p){p=loadAsset(import.meta.env.BASE_URL+'models/characters/'+name+'.glb').then(g=>{g.scene.traverse(o=>{if(o instanceof T.Mesh)o.frustumCulled=false;});return {scene:g.scene,animations:g.animations};});models.set(name,p);}return p;}

const fxCache=new Map<string,T.Texture>();
/** CC0 Kenney particle textures in public/fx (glow, flare, spark, star, slash, magic, rune, ring, smoke, scorch, trace, twirl, fire). */
export function fxTexture(name:string){let t=fxCache.get(name);if(!t){t=new T.TextureLoader().load(import.meta.env.BASE_URL+'fx/'+name+'.webp');t.colorSpace=T.SRGBColorSpace;fxCache.set(name,t);}return t;}

/** Static copy of a prop (unique pieces only; repeated props should use instancing). */
export function prop(assets:NightAssets,name:string){const node=assets.props.get(name);const copy=node?node.clone():new T.Group();copy.position.set(0,0,0);copy.rotation.set(0,0,0);copy.scale.set(1,1,1);return copy;}

type PlayOptions={loop?:boolean;fade?:number;speed?:number;restart?:boolean};
const MODERN_CLIPS:Record<string,string>={Idle:'Idle_Loop',Idle_Combat:'Sword_Idle',Walking_A:'Walk_Loop',Running_A:'Jog_Fwd_Loop',Death_A:'Death01',Hit_A:'Hit_Chest',Jump_Idle:'Jump_Loop',Block:'Sword_Block',Blocking:'Idle_Shield_Loop',Taunt:'Idle_FoldArms_Loop',Throw:'OverhandThrow','2H_Ranged_Shoot':'Pistol_Shoot','1H_Melee_Attack_Slice_Diagonal':'Sword_Regular_A','1H_Melee_Attack_Slice_Horizontal':'Sword_Regular_B','1H_Melee_Attack_Chop':'Sword_Regular_C','2H_Melee_Attack_Spin':'Sword_Heavy_Combo','1H_Melee_Attack_Jump_Chop':'Sword_Dash',Spellcast_Long:'Spell_Simple_Enter',Spellcast_Summon:'Spell_Simple_Idle_Loop',Spellcast_Raise:'Spell_Simple_Enter'};
/** Animated KayKit character: shared clips, per-actor materials for hit flashes and tints. */
export class Actor{
 readonly root=new T.Group();readonly model:T.Object3D;readonly mixer:T.AnimationMixer;readonly materials:T.MeshStandardMaterial[]=[];
 private actions=new Map<string,T.AnimationAction>();private current?:T.AnimationAction;active='';
 readonly modern:boolean;private clips:Map<string,T.AnimationClip>;
 constructor(private assets:NightAssets,name:CharacterName,options:{items?:string[];hide?:string[];tint?:number;scale?:number;modern?:string}={}){
  const modern=options.modern&&assets.modern?.models.get(options.modern);this.modern=!!modern;this.clips=modern?(assets.modern!.variants.get(options.modern!)||assets.modern!.clips):assets.clips;
  this.model=cloneSkinned(modern||assets.characters[name]);this.root.add(this.model);this.model.scale.setScalar(options.scale??1);
  const materials=new Map<T.Material,T.MeshStandardMaterial>();
  this.model.traverse(o=>{
   if(!(o instanceof T.Mesh))return;
   const slot=o.parent?.name||'';if(options.items&&/handslot/.test(slot)&&!options.items.includes(o.name)||options.hide?.includes(o.name)){o.visible=false;return;}
   const source=o.material as T.MeshStandardMaterial;let m=materials.get(source);if(!m){m=source.clone();if(options.tint!==undefined)m.color.multiply(new T.Color(options.tint));materials.set(source,m);this.materials.push(m);}o.material=m;
  });
  this.mixer=new T.AnimationMixer(this.model);
 }
 /** GLTFLoader sanitises node names ("handslot.r" becomes "handslotr"), so look up both spellings. */
 bone(name:string){if(this.modern){const scarlet=!!this.model.getObjectByName('mixamorigHead_05'),knight=!!this.model.getObjectByName('headx_5');name=(scarlet?{'head':'mixamorigHead_05','handslot.r':'mixamorigRightHand_034','handslot.l':'mixamorigLeftHand_010'}:knight?{'head':'headx_5','handslot.r':'handr_53','handslot.l':'handl_28'}:{'head':'Head','handslot.r':'hand_r','handslot.l':'hand_l'} as Record<string,string>)[name]||name;}return this.model.getObjectByName(name)??this.model.getObjectByName(T.PropertyBinding.sanitizeNodeName(name))!;}
 /** Attaches a prop from the item packs to a bone (e.g. 'handslot.r'). */
 hold(item:string,bone:string,transform?:(o:T.Object3D)=>void){const o=prop(this.assets,item);o.traverse(c=>{if(c instanceof T.Mesh){const m=(c.material as T.MeshStandardMaterial).clone();this.materials.push(m);c.material=m;}});transform?.(o);this.bone(bone)?.add(o);return o;}
 private mapped(clip:string){if(!this.modern)return clip;return MODERN_CLIPS[clip]||(/Spellcast/.test(clip)?'Spell_Simple_Shoot':/Attack/.test(clip)?'Sword_Regular_A':/Dodge/.test(clip)?'Roll':/Running/.test(clip)?'Jog_Fwd_Loop':'Idle_Loop');}
 has(clip:string){return this.clips.has(this.mapped(clip));}
 duration(clip:string){return this.clips.get(this.mapped(clip))?.duration||1;}
 play(clip:string,{loop=true,fade=.15,speed=1,restart=false}:PlayOptions={}){
  const c=this.clips.get(this.mapped(clip));if(!c)return;let action=this.actions.get(clip);if(!action){action=this.mixer.clipAction(c);this.actions.set(clip,action);}
  action.timeScale=speed;
  if(this.current===action&&!restart)return;
  action.reset();action.setLoop(loop?T.LoopRepeat:T.LoopOnce,Infinity);action.clampWhenFinished=!loop;action.enabled=true;action.setEffectiveWeight(1);
  if(this.current&&this.current!==action)action.crossFadeFrom(this.current,fade,false);action.play();this.current=action;this.active=clip;
 }
 flash(color:number,intensity:number){for(const m of this.materials){m.emissive.setHex(color);m.emissiveIntensity=intensity;}}
 update(dt:number){this.mixer.update(dt);}
 dispose(){this.mixer.stopAllAction();this.root.removeFromParent();this.materials.forEach(m=>m.dispose());}
}

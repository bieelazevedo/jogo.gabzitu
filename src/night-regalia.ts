import * as T from 'three';
import type {Actor,NightAssets} from './night-assets';
import type {NightClass} from './night-data';

const baked=new WeakMap<T.Object3D,T.Group>();
/** Bake the head/hair bind pose once, relative to Head; the outfit rig then drives it. */
function headTemplate(source:T.Object3D){
 let result=baked.get(source);if(result)return result;result=new T.Group();source.updateMatrixWorld(true);
 const head=source.getObjectByName('Head')!,inverse=head.matrixWorld.clone().invert();
 source.traverse(o=>{if(!(o instanceof T.Mesh))return;if(o instanceof T.SkinnedMesh)o.skeleton.update();const g=o.geometry.clone(),position=g.getAttribute('position'),v=new T.Vector3();
  for(let i=0;i<position.count;i++){o.getVertexPosition(i,v);v.applyMatrix4(o.matrixWorld).applyMatrix4(inverse);position.setXYZ(i,v.x,v.y,v.z);}g.deleteAttribute('skinIndex');g.deleteAttribute('skinWeight');g.computeVertexNormals();const mesh=new T.Mesh(g,o.material);mesh.castShadow=true;result!.add(mesh);
 });baked.set(source,result);return result;
}
export function adventurerRegalia(actor:Actor,assets:NightAssets,id:NightClass){
 const geometries:T.BufferGeometry[]=[],female=['witch','ranger','chaos'].includes(id),head=actor.bone('head');
 for(const name of [female?'Superhero_Female_FullBody':'Superhero_Male_FullBody',id==='guardian'?'Hair_Buzzed':female?'Hair_Long':'Hair_SimpleParted',...(id==='guardian'?['Hair_Beard']:[])]){
  const source=assets.modern?.heads.get(name);if(!source)continue;const group=headTemplate(source).clone();group.traverse(o=>{if(o instanceof T.Mesh){const m=(o.material as T.MeshStandardMaterial).clone();actor.materials.push(m);o.material=m;}});head?.add(group);
 }
 // Equipment comes from authored model assets; no procedural clothing overlays.
 return {tail:[] as T.Object3D[],geometries};
}

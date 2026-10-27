import {it,expect} from 'vitest';
import * as T from 'three';
import {HeroPose} from '../src/night-poses';


it('restaura a animação original entre frames sem acumular a pose',()=>{
 const model=new T.Group(),bone=new T.Bone();bone.name='upperarm_r';bone.rotation.set(.2,.3,-.1);model.add(bone);const original=bone.quaternion.clone(),pose=new HeroPose({model,modern:true},'blade');
 for(let frame=0;frame<300;frame++){pose.update(true,1/60,frame/60);expect(bone.quaternion.angleTo(original)).toBeGreaterThan(.01);pose.clear();expect(bone.quaternion.angleTo(original)).toBeLessThan(.000001);}
});
it('retira a pose durante o combate e suporta ossos ausentes',()=>{
 const model=new T.Group(),bone=new T.Bone();bone.name='mixamorigLeftArm_08';model.add(bone);const pose=new HeroPose({model,modern:true},'chaos');
 for(let i=0;i<60;i++){pose.clear();pose.update(true,1/60,i/60);}expect(bone.quaternion.angleTo(new T.Quaternion())).toBeGreaterThan(.4);
 for(let i=0;i<120;i++){pose.clear();pose.update(false,1/60,i/60);}expect(bone.quaternion.angleTo(new T.Quaternion())).toBeLessThan(.001);
});

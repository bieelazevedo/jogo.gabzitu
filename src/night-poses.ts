import * as T from 'three';
import type {Actor} from './night-assets';
import type {NightClass} from './night-data';
type Joint='spine_03'|'Head'|'upperarm_l'|'upperarm_r'|'lowerarm_l'|'lowerarm_r'|'hand_l'|'hand_r';
/** Small additive offsets over the idle animation; locomotion and combat retain their authored clips. */
const POSES:Record<NightClass,Partial<Record<Joint,[number,number,number]>>>={
 blade:{spine_03:[0,-.16,0],Head:[0,.12,0],upperarm_r:[-.25,0,-.18],lowerarm_r:[-.55,.12,0],upperarm_l:[0,0,.14]},
 guardian:{spine_03:[-.06,0,0],upperarm_l:[-.3,0,.2],lowerarm_l:[-.75,0,0],upperarm_r:[.14,0,-.12],Head:[.06,0,0]},
 reaver:{spine_03:[.13,.12,.05],Head:[-.09,-.12,0],upperarm_l:[-.18,-.12,.32],upperarm_r:[-.26,.15,-.4],lowerarm_l:[-.4,0,0],lowerarm_r:[-.48,0,0]},
 astral:{spine_03:[-.04,0,0],upperarm_l:[-.28,0,.42],lowerarm_l:[-1.0,0,-.12],hand_l:[0,0,.28],upperarm_r:[-.15,0,-.16],Head:[.07,-.1,0]},
 witch:{spine_03:[0,.18,0],Head:[.04,-.2,-.06],upperarm_l:[-.4,0,.18],lowerarm_l:[-1.15,.1,0],upperarm_r:[-.2,0,-.35],lowerarm_r:[-.65,0,0]},
 ranger:{spine_03:[.06,-.23,0],Head:[0,.21,0],upperarm_l:[-.2,0,.2],lowerarm_l:[-.4,0,0],upperarm_r:[-.12,0,-.12],lowerarm_r:[-.6,0,0]},
 chaos:{spine_03:[-.07,0,0],Head:[.08,0,0],upperarm_l:[-.32,-.2,.65],upperarm_r:[-.32,.2,-.65],lowerarm_l:[-.65,-.2,.12],lowerarm_r:[-.65,.2,-.12],hand_l:[.12,0,.3],hand_r:[.12,0,-.3]},
};
const KNIGHT:Partial<Record<Joint,string>>={spine_03:'spine_01x_57',Head:'headx_5',upperarm_l:'arm_stretchl_30',upperarm_r:'arm_stretchr_55',lowerarm_l:'forearm_stretchl_29',lowerarm_r:'forearm_stretchr_54',hand_l:'handl_28',hand_r:'handr_53'};
const SCARLET:Record<Joint,string>={spine_03:'mixamorigSpine2_03',Head:'mixamorigHead_05',upperarm_l:'mixamorigLeftArm_08',upperarm_r:'mixamorigRightArm_032',lowerarm_l:'mixamorigLeftForeArm_09',lowerarm_r:'mixamorigRightForeArm_033',hand_l:'mixamorigLeftHand_010',hand_r:'mixamorigRightHand_034'};
export class HeroPose{
 private applied:{bone:T.Object3D;inverse:T.Quaternion}[]=[];private weight=0;
 constructor(private actor:Pick<Actor,'model'|'modern'>,private id:NightClass){}
 /** Remove last frame before the mixer samples: offsets never accumulate or pollute attacks. */
 clear(){for(const {bone,inverse} of this.applied)bone.quaternion.multiply(inverse);this.applied=[];}
 update(idle:boolean,dt:number,time:number){this.weight=T.MathUtils.damp(this.weight,idle?1:0,12,dt);if(this.weight<.001||!this.actor.modern)return;
  for(const [joint,angles] of Object.entries(POSES[this.id]) as [Joint,[number,number,number]][]){const name=this.id==='chaos'?SCARLET[joint]:this.id==='guardian'?KNIGHT[joint]||joint:joint,bone=this.actor.model.getObjectByName(name);if(!bone)continue;const breath=joint==='spine_03'?Math.sin(time*1.6)*.012:0,q=new T.Quaternion().setFromEuler(new T.Euler(angles[0]+breath,angles[1],angles[2]));q.copy(new T.Quaternion().slerp(q,this.weight));bone.quaternion.multiply(q);this.applied.push({bone,inverse:q.clone().invert()});}
 }
}

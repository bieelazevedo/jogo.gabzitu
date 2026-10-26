import {CATS} from './data';
import type {CatKind,Point,Tower} from './types';
export function movementRadius(kind:CatKind){return ['knight','monk','samurai','boxer','allyRatazao','allyVacuum','allyKraken'].includes(kind)?32:CATS[kind].magic&&!['uia','commander','bard','guardian','engineer'].includes(kind)?16:0;}
export function approach(t:Tower,base:Point,target:Point|null,range:number,dt:number){const leash=movementRadius(t.kind);if(!leash)return base;const current=t.offset||{x:0,y:0};let desired={x:0,y:0};if(target){const dx=target.x-base.x,dy=target.y-base.y,length=Math.hypot(dx,dy);if(length>0){const distance=Math.min(leash,Math.max(leash*.35,length-range*.85));desired={x:dx/length*distance,y:dy/length*distance};}}
 const dx=desired.x-current.x,dy=desired.y-current.y,d=Math.hypot(dx,dy),fraction=d?Math.min(1,dt*62/d):0;t.offset={x:current.x+dx*fraction,y:current.y+dy*fraction};return {x:base.x+t.offset.x,y:base.y+t.offset.y};}

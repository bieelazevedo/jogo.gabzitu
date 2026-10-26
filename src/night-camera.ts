export const nightZoom=(value:number)=>Math.max(.7,Math.min(1.55,value));
/** Retain the heading at the start of a movement gesture: automatic follow must not steer it. */
export function nightMovement(x:number,z:number,heading:number){const n=Math.max(1,Math.hypot(x,z));return {x:(x*Math.cos(heading)+z*Math.sin(heading))/n,z:(z*Math.cos(heading)-x*Math.sin(heading))/n};}
export function nightFollow(current:number,facing:number,moving:number,action:number,dt:number){if(moving<.12||action>0)return current;const target=facing+Math.PI,delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));if(Math.abs(delta)>2.15||Math.abs(delta)<.12)return current;const step=delta*(1-Math.exp(-1.3*Math.min(.1,Math.max(0,dt))));return current+Math.max(-dt*.8,Math.min(dt*.8,step));}
export function nightCombatFollow(current:number,p:{x:number;z:number},target:{x:number;z:number},dt:number){if(Math.hypot(p.x-target.x,p.z-target.z)>18)return current;const wanted=Math.atan2(p.x-target.x,p.z-target.z),delta=Math.atan2(Math.sin(wanted-current),Math.cos(wanted-current));if(Math.abs(delta)>1.3||Math.abs(delta)<.08)return current;return current+Math.max(-dt*.45,Math.min(dt*.45,delta*(1-Math.exp(-dt*1.4))));}

export function nightBoom(x:number,z:number,yaw:number,distance:number,obstacles:readonly {x:number;z:number;r:number}[]){for(let d=1;d<distance;d+=.3){const cx=x+Math.sin(yaw)*d,cz=z+Math.cos(yaw)*d;if(obstacles.some(o=>Math.hypot(cx-o.x,cz-o.z)<o.r+.4))return Math.max(2,d-.5);}return distance;}

/** Screen-relative drag: unrestricted yaw, bounded elevation above the ground. */
export function nightLook(yaw:number,pitch:number,dx:number,dy:number,width:number,height:number){return {yaw:yaw-dx/Math.max(320,width)*Math.PI*1.5,pitch:Math.max(.12,Math.min(.95,pitch+dy/Math.max(320,height)*1.5))};}

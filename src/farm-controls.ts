/** Camera-relative movement is recalculated while either thumb remains held. */
export function farmMovement(side:number,forward:number,yaw:number){
 const n=Math.max(1,Math.hypot(side,forward));side/=n;forward/=n;
 return {x:Math.sin(yaw)*forward+Math.cos(yaw)*side,z:Math.cos(yaw)*forward-Math.sin(yaw)*side};
}
export function farmOrbitStep(yaw:number,target:number,dt:number){
 const delta=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));
 return yaw+delta*(1-Math.exp(-Math.max(0,Math.min(.15,dt))*24));
}
export function farmLookTurn(dx:number,width:number){return dx*Math.PI*2/Math.max(500,Math.min(1400,width*1.5));}
/** Forward motion can centre the camera; strafing/backing up never spins it around. */
export function farmFollowYaw(current:number,heading:number,dt:number,side:number,forward:number,manual:boolean,target?:number){
 if(manual||target===undefined&&(forward<.25||Math.abs(side)>.55))return current;
 const angle=Math.atan2(Math.sin((target??heading)-current),Math.cos((target??heading)-current));
 if(target===undefined&&Math.abs(angle)>1.4||Math.abs(angle)<.035)return current;
 const max=Math.max(0,Math.min(.1,dt))*(target===undefined?.8:1.2);
 return current+Math.max(-max,Math.min(max,angle*(1-Math.exp(-dt*(target===undefined?1.5:2.5)))));
}

export function farmStick(side:number,forward:number){const n=Math.hypot(side,forward);if(n<=.1)return {side:0,forward:0};const strength=Math.min(1,(n-.1)/.9);return {side:side/n*strength,forward:forward/n*strength};}

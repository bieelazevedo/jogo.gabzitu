/** Shared authored layout for rendering, movement bounds and collision validation. */
export const NIGHT_WORLD_LIMIT=80;
export const NIGHT_MAP_EXTENT=86;
export const NIGHT_MONUMENTS=[
 {id:'oath',name:'Juramento do Guardião',x:6,z:4,r:18,duration:75,gold:200,xp:140},
 {id:'veil',name:'Vigília de Veludo',x:-8,z:-34,r:18,duration:75,gold:220,xp:160},
 {id:'crown',name:'Prova da Coroa',x:28,z:43,r:20,duration:90,gold:260,xp:190},
] as const;
export const NIGHT_HOMESTEADS=[{x:-55,z:44,rotation:.2},{x:-66,z:-42,rotation:1.3},{x:6,z:58,rotation:Math.PI}];
export const NIGHT_OPTIONAL_CAMPS=[{x:-62,z:22},{x:-60,z:-27},{x:56,z:49}];
export const NIGHT_TOWN_HOUSES=[
 {x:47,z:15,rotation:0,kind:'town_home'},
 {x:56,z:15,rotation:0,kind:'town_tavern'},
 {x:66,z:16,rotation:0,kind:'town_home'},
 {x:45,z:35,rotation:Math.PI,kind:'town_smith'},
 {x:55,z:36,rotation:Math.PI,kind:'town_home'},
 {x:66,z:36,rotation:Math.PI,kind:'town_home'},
 {x:48,z:48,rotation:Math.PI/2,kind:'town_home'},
 {x:65,z:49,rotation:-Math.PI/2,kind:'town_smith'},
] as const;
const AUTHORED_TREES=[
 [-51,5],[-56,8],[-64,5],[-70,10],[-74,17],[-69,29],[-62,34],[-53,33],
 [-73,-4],[-67,-9],[-54,-7],[-49,-13],[-71,-20],[-66,-35],[-55,-37],[-49,-31],
 [-71,40],[-61,44],[-50,43],[-40,48],[-28,49],[-19,43],[-10,52],[3,51],
] as const;

const treePaths=[[0,27,-29,14],[-29,14,-24,-25],[-24,-25,25,-27],[25,-27,28,8],[28,8,0,27],[0,27,-24,-25],[0,27,35,24],[28,8,35,24],[35,24,70,24],[56,24,56,54],[-29,14,-62,22],[-62,22,-60,-28],[-60,-28,-24,-25],[-62,22,-55,44],[-60,-28,-66,-42],[0,27,6,58]];
const fromPath=(x:number,z:number,[ax,az,bx,bz]:number[])=>{const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-ax-dx*t,z-az-dz*t);};
const forestTrees:[number,number][]=[];
for(let x=-75;x<=75;x+=7.5)for(let z=-68;z<=68;z+=7.5){
 const wooded=x<-44&&z<64||z>48&&x<28||z<-46||x>48&&z<-6;
 if(!wooded)continue;const tx=x+Math.sin(x*7.1+z*3.7)*1.8,tz=z+Math.cos(x*2.9-z*5.1)*1.8;
 if(treePaths.some(p=>fromPath(tx,tz,p)<4.5)||NIGHT_MONUMENTS.some(h=>Math.hypot(h.x-tx,h.z-tz)<h.r+1)||NIGHT_HOMESTEADS.some(h=>Math.hypot(h.x-tx,h.z-tz)<12)||NIGHT_OPTIONAL_CAMPS.some(h=>Math.hypot(h.x-tx,h.z-tz)<7)||NIGHT_TOWN_HOUSES.some(h=>Math.hypot(h.x-tx,h.z-tz)<7)||AUTHORED_TREES.some(([a,b])=>Math.hypot(a-tx,b-tz)<4.8))continue;
 forestTrees.push([tx,tz]);
}
export const NIGHT_WOODLAND_TREES:readonly(readonly[number,number])[]=[...AUTHORED_TREES,...forestTrees].filter(([x,z])=>(Math.abs(x)>48||Math.abs(z)>48)&&!NIGHT_HOMESTEADS.some(h=>Math.hypot(h.x-x,h.z-z)<12));

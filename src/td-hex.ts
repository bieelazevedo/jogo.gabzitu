import type {Level, Point} from './types';

/**
 * Hexagonal battlefields for the tower defense. The simulation keeps working in its 1000×600 screen space;
 * this module lays a KayKit hex grid (pointy-top tiles, 2 units across the flats) under it, snaps every
 * route to road tiles and every build spot to a free tile, so the 3D view and the simulation agree exactly.
 *
 * The camera is orthographic and tilted by TD_PITCH, which makes the projection of the ground uniform:
 * sim.x = 500 + X·TD_SCALE and sim.y = 300 + Z·TD_SCALE·sin(pitch). Screen distances are simulation distances.
 */
export const TD_SCALE=26,TD_PITCH=48*Math.PI/180,TD_SIN=Math.sin(TD_PITCH);
const ROOT3=Math.sqrt(3);
export const simToWorld=(p:Point)=>({x:(p.x-500)/TD_SCALE,z:(p.y-300)/(TD_SCALE*TD_SIN)});
export const worldToSim=(x:number,z:number):Point=>({x:500+x*TD_SCALE,y:300+z*TD_SCALE*TD_SIN});
export const hexCenter=(q:number,r:number)=>({x:2*q+r,z:ROOT3*r});
/** Edge directions, counter-clockwise from +X as seen from above (screen up is −Z): E, NE, NW, W, SW, SE. */
export const HEX_DIRS:[number,number][]=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
export const hexKey=(q:number,r:number)=>q+','+r;
export function hexAt(x:number,z:number){
 const r=z/ROOT3,q=(x-r)/2;let rq=Math.round(q),rr=Math.round(r);const rs=Math.round(-q-r);
 const dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs-(-q-r));
 if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;
 return {q:rq,r:rr};
}
export const hexDistance=(a:{q:number;r:number},b:{q:number;r:number})=>(Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;

export type HexCell={q:number;r:number;x:number;z:number;edges:number;road:boolean;spot:number;high:boolean;near:number};
export type HexMap={cells:Map<string,HexCell>;routes:HexCell[][];spots:HexCell[];bounds:{x0:number;x1:number;z0:number;z1:number}};

/** Hex tiles from a polyline: corners snap to tile centres (corners on the same screen row stay on the same
 * tile row, so horizontal roads are straight), then each leg is a hex line between snapped corners. */
function rasterize(path:Point[]){
 const out:{q:number;r:number}[]=[];
 const snap=(p:Point)=>{const w=simToWorld(p),r=Math.round(w.z/ROOT3);return {q:Math.round((w.x-r)/2),r};};
 const corners=path.map(snap);
 const push=(h:{q:number;r:number})=>{const last=out[out.length-1];if(last&&last.q===h.q&&last.r===h.r)return;const before=out[out.length-2];if(before&&before.q===h.q&&before.r===h.r){out.pop();return;}out.push(h);};
 for(let i=1;i<corners.length;i++){const a=corners[i-1],b=corners[i],n=hexDistance(a,b);
  for(let k=0;k<=n;k++){const t=n?k/n:0,q=a.q+(b.q-a.q)*t+1e-6,r=a.r+(b.r-a.r)*t+2e-6,s=-a.q-a.r+((-b.q-b.r)-(-a.q-a.r))*t-3e-6;
   let rq=Math.round(q),rr=Math.round(r);const rs=Math.round(s),dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs-s);if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;
   push({q:rq,r:rr});}}
 return out;
}

const maps=new Map<number,HexMap>();
export const hexMap=(level:Level)=>maps.get(level.id)??applyHexLayout(level);

/**
 * Rebuilds a level on the hex grid: routes follow tile centres (so enemies walk the road tiles), and each
 * original build spot moves to the nearest free tile. Spot order and count are kept, so saved games and
 * cooperative sessions stay compatible. Spots two tiles away from every road stand on raised ground.
 */
export function applyHexLayout(level:Level):HexMap{
 const cells=new Map<string,HexCell>(),cell=(q:number,r:number)=>{const k=hexKey(q,r);let c=cells.get(k);if(!c){const p=hexCenter(q,r);c={q,r,x:p.x,z:p.z,edges:0,road:false,spot:-1,high:false,near:99};cells.set(k,c);}return c;};
 const routes=level.paths.map(path=>rasterize(path).map(h=>cell(h.q,h.r)));
 for(const route of routes)route.forEach((c,i)=>{c.road=true;
  for(const other of [route[i-1],route[i+1]]){if(!other)continue;const d=HEX_DIRS.findIndex(([dq,dr])=>other.q-c.q===dq&&other.r-c.r===dr);if(d>=0)c.edges|=1<<d;}});
 const roads=[...cells.values()].filter(c=>c.road);
 // Field tiles plus a margin of scenery that fills wide phone screens.
 const x0=-44,x1=44,z0=-27,z1=27;
 for(let r=Math.floor(z0/ROOT3)-1;r<=Math.ceil(z1/ROOT3)+1;r++)for(let q=Math.floor((x0-r)/2)-1;q<=Math.ceil((x1-r)/2)+1;q++){const p=hexCenter(q,r);if(p.x>=x0-1&&p.x<=x1+1&&p.z>=z0-1&&p.z<=z1+1)cell(q,r);}
 for(const c of cells.values())if(!c.road)c.near=Math.min(...roads.map(o=>hexDistance(c,o)));else c.near=0;
 const spots=level.spots.map((p,i)=>{const w=simToWorld(p);let best:HexCell|undefined,score=Infinity;
  for(const c of cells.values()){if(c.road||c.spot>=0)continue;const d=Math.hypot(c.x-w.x,c.z-w.z)+(c.near>2?1.5:0);if(d<score){score=d;best=c;}}
  best!.spot=i;best!.high=best!.near===2;return best!;});
 level.paths=routes.map(route=>route.map(c=>worldToSim(c.x,c.z)));
 level.spots=spots.map(c=>worldToSim(c.x,c.z));
 level.high=spots.flatMap((c,i)=>c.high?[i]:[]);
 const map={cells,routes,spots,bounds:{x0,x1,z0,z1}};maps.set(level.id,map);return map;
}

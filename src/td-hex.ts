import type {Level, Point} from './types';
import {TD_MAPS,type MapSpec} from './td-maps';

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

export type HexCell={q:number;r:number;x:number;z:number;edges:number;road:boolean;spot:number;high:boolean;near:number;river:number;water:boolean;dock:boolean;score:number};
export type HexMap={cells:Map<string,HexCell>;routes:HexCell[][];spots:HexCell[];bounds:{x0:number;x1:number;z0:number;z1:number};spec?:MapSpec};

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

/** Straight hex line between two tiles (inclusive), as axial coordinates. */
function hexLine(a:{q:number;r:number},b:{q:number;r:number}){const out:{q:number;r:number}[]=[],n=hexDistance(a,b);
 for(let k=0;k<=n;k++){const t=n?k/n:0,q=a.q+(b.q-a.q)*t+1e-6,r=a.r+(b.r-a.r)*t+2e-6,s=-a.q-a.r+((-b.q-b.r)-(-a.q-a.r))*t-3e-6;
  let rq=Math.round(q),rr=Math.round(r);const rs=Math.round(s),dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs-s);if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;out.push({q:rq,r:rr});}
 return out;}
/** [column,row] in odd-row offset coordinates to axial. */
const axial=([col,row]:number[])=>({q:col-(row-(row&1))/2,r:row});
function trace(points:number[][]){const out:{q:number;r:number}[]=[];for(let i=1;i<points.length;i++)for(const h of hexLine(axial(points[i-1]),axial(points[i]))){const last=out[out.length-1];if(!last||last.q!==h.q||last.r!==h.r)out.push(h);}return out;}

const maps=new Map<number,HexMap>();
export const hexMap=(level:Level)=>maps.get(level.id)??applyHexLayout(level);
const link=(c:HexCell,other:HexCell|undefined,key:'edges'|'river')=>{if(!other)return;const d=HEX_DIRS.findIndex(([dq,dr])=>other.q-c.q===dq&&other.r-c.r===dr);if(d>=0)c[key]|=1<<d;};

/**
 * Lays a level on the hex grid. Levels with a hand-made map (td-maps.ts) get its routes, water and strategic
 * build spots; others snap their original polylines to the grid. Routes follow tile centres, so enemies walk
 * the road tiles exactly.
 */
export function applyHexLayout(level:Level):HexMap{
 const spec=TD_MAPS[level.id];
 const cells=new Map<string,HexCell>(),cell=(q:number,r:number)=>{const k=hexKey(q,r);let c=cells.get(k);if(!c){const p=hexCenter(q,r);c={q,r,x:p.x,z:p.z,edges:0,road:false,spot:-1,high:false,near:99,river:0,water:false,dock:false,score:0};cells.set(k,c);}return c;};
 const routes=(spec?spec.routes.map(trace):level.paths.map(rasterize)).map(route=>route.map(h=>cell(h.q,h.r)));
 for(const route of routes)route.forEach((c,i)=>{c.road=true;link(c,route[i-1],'edges');link(c,route[i+1],'edges');});
 const roads=[...cells.values()].filter(c=>c.road);
 // Field tiles plus a margin of scenery that fills wide phone screens.
 const x0=-44,x1=44,z0=-27,z1=27;
 for(let r=Math.floor(z0/ROOT3)-1;r<=Math.ceil(z1/ROOT3)+1;r++)for(let q=Math.floor((x0-r)/2)-1;q<=Math.ceil((x1-r)/2)+1;q++){const p=hexCenter(q,r);if(p.x>=x0-1&&p.x<=x1+1&&p.z>=z0-1&&p.z<=z1+1)cell(q,r);}
 for(const c of cells.values())c.near=c.road?0:Math.min(...roads.map(o=>hexDistance(c,o)));
 if(spec){
  if(spec.river){const river=trace(spec.river).map(h=>cell(h.q,h.r));river.forEach((c,i)=>{link(c,river[i-1],'river');link(c,river[i+1],'river');});}
  for(const [col,row,radius] of spec.lakes||[]){const centre=axial([col,row]);for(const c of cells.values())if(!c.road&&hexDistance(c,centre)<=radius)c.water=true;}
  if(spec.sea!==undefined)for(const c of cells.values())if(!c.road&&c.r>=spec.sea)c.water=true;
  for(const d of spec.docks||[]){const a=axial(d),c=cells.get(hexKey(a.q,a.r));if(c)c.dock=true;}
 }
 const spots=spec?pickSpots(level,cells,routes,spec):level.spots.map((p,i)=>{const w=simToWorld(p);let best:HexCell|undefined,score=Infinity;
  for(const c of cells.values()){if(c.road||c.spot>=0)continue;const d=Math.hypot(c.x-w.x,c.z-w.z)+(c.near>2?1.5:0);if(d<score){score=d;best=c;}}
  best!.spot=i;best!.high=best!.near===2;return best!;});
 level.paths=routes.map(route=>route.map(c=>worldToSim(c.x,c.z)));
 level.spots=spots.map(c=>worldToSim(c.x,c.z));
 level.high=spots.flatMap((c,i)=>c.high?[i]:[]);
 const map={cells,routes,spots,bounds:{x0,x1,z0,z1},spec};maps.set(level.id,map);return map;
}

/**
 * Strategic build spots: tiles one or two steps from a road, scored by how much road they cover within a
 * typical range (three tiles), with extra weight for tiles that watch several routes or a bend. Picks are
 * greedy with diminishing returns on road already covered, and kept two tiles apart. The best few spots two
 * tiles from the road become raised ground.
 */
function pickSpots(level:Level,cells:Map<string,HexCell>,routes:HexCell[][],spec:MapSpec){
 const count=Math.max(16,Math.min(20,level.spots.length));
 const field=(c:HexCell)=>Math.abs(c.x)<=18.6&&Math.abs(c.z)<=13.6;
 const weight=new Map<HexCell,number>();const routeOf=new Map<HexCell,Set<number>>();
 routes.forEach((route,i)=>route.forEach((c,k)=>{if(!field(c))return;const bend=k>0&&k<route.length-1&&(route[k-1].q-c.q!==c.q-route[k+1].q||route[k-1].r-c.r!==c.r-route[k+1].r);weight.set(c,Math.max(weight.get(c)||0,bend?1.4:1));let set=routeOf.get(c);if(!set){set=new Set();routeOf.set(c,set);}set.add(i);}));
 const candidates=[...cells.values()].filter(c=>!c.road&&!c.water&&!c.river&&!c.dock&&c.near>=1&&c.near<=2&&field(c));
 const near=new Map(candidates.map(c=>[c,[...weight.keys()].filter(r=>hexDistance(c,r)<=3)]));
 const picked:HexCell[]=[];
 while(picked.length<count){let best:HexCell|undefined,score=-1;
  for(const c of candidates){if(c.spot>=0||picked.some(p=>hexDistance(p,c)<2))continue;const roads=near.get(c)!;const lanes=new Set(roads.flatMap(r=>[...routeOf.get(r)!])).size;
   const v=roads.reduce((a,r)=>a+weight.get(r)!,0)*(1+(lanes-1)*.25)-(c.near===2?.6:0)+hash2(c.q,c.r)*.3;if(v>score){score=v;best=c;}}
  if(!best)break;best.spot=picked.length;best.score=score;picked.push(best);for(const r of near.get(best)!)weight.set(r,weight.get(r)!*.62);}
 [...picked].filter(c=>c.near===2).sort((a,b)=>b.score-a.score).slice(0,spec.hills??3).forEach(c=>c.high=true);
 return picked;
}
const hash2=(q:number,r:number)=>{const v=Math.sin(q*127.1+r*311.7)*43758.5453;return v-Math.floor(v);};

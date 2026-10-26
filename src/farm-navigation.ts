import {blocked} from './farm-data';
/** Tiny fixed grid, used at most once per second by the hunter bot. */
export function farmPath(start:{x:number;z:number},goal:{x:number;z:number}){
 const width=39,height=35,step=2,toPoint=(id:number)=>({x:id%width*step-38,z:Math.floor(id/width)*step-34});
 const free=new Uint8Array(width*height);for(let i=0;i<free.length;i++){const p=toPoint(i);free[i]=Number(!blocked(p.x,p.z,.45));}
 const closest=(p:{x:number;z:number})=>{let id=0,best=Infinity;for(let i=0;i<free.length;i++)if(free[i]){const q=toPoint(i),d=(p.x-q.x)**2+(p.z-q.z)**2;if(d<best){best=d;id=i;}}return id;};
 const first=closest(start),last=closest(goal),previous=new Int16Array(free.length).fill(-1),queue=new Int16Array(free.length);let head=0,tail=1;queue[0]=first;previous[first]=first;
 while(head<tail){const id=queue[head++];if(id===last)break;const x=id%width,z=Math.floor(id/width);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,next=nz*width+nx;if(nx<0||nx>=width||nz<0||nz>=height||!free[next]||previous[next]!==-1)continue;const a=toPoint(id),b=toPoint(next);if(blocked((a.x+b.x)/2,(a.z+b.z)/2,.45))continue;previous[next]=id;queue[tail++]=next;}}
 if(previous[last]===-1)return [];const path:{x:number;z:number}[]=[];let current=last;while(current!==first){path.push(toPoint(current));current=previous[current];}return path.reverse();
}

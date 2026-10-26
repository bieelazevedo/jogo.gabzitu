import {expect,it} from 'vitest';
import {newFarm,farmStep,farmIdle,farmView,validFarmView,farmCanCapture,mergeFarmInput,type FarmMember} from '../src/farm-simulation';
import {farmActionPose} from '../src/farm-actions';
import {farmFollowYaw} from '../src/farm-controls';
import {FarmAudio} from '../src/farm-audio';
const members:FarmMember[]=Array.from({length:4},(_,i)=>({id:'p'+i,name:'Pessoa '+i,species:(['cat','cow','duck','goose'] as const)[i],voice:'natural-cat',bot:false,preference:i===0?'hunter':'animal'}));
function setup(){const s=newFarm(members);s.hide=0;s.time=20;const h=s.actors.find(a=>a.species==='hunter')!;h.x=14;h.z=0;for(const a of s.actors)if(a!==h){a.x=-30;a.z=30;}return {s,h};}
function capture(s:ReturnType<typeof newFarm>,h:ReturnType<typeof newFarm>['actors'][number],id:number){const p=s.players.find(p=>p.entity===h.id)!;p.shotCd=0;p.stun=0;farmStep(s,{[p.id]:{...farmIdle(),fire:true,target:id,yaw:Math.PI}},.05);}
it('guarantees a valid selected capture regardless of aim direction, consuming exactly one net',()=>{
 const {s,h}=setup(),a=s.actors.find(a=>a.owner==='p1')!;s.recruited=2;a.x=17;a.z=8;
 expect(farmCanCapture(h,a)).toBe(true);capture(s,h,a.id);expect(a.captured).toBe(true);expect(s.players[0].ammo).toBe(4);expect(s.players[0].captures).toBe(1);
});
it('does not spend a net when the selected animal has escaped the logical capture range',()=>{
 const {s,h}=setup(),a=s.actors.find(a=>a.owner==='p1')!;a.x=14;a.z=13;
 expect(farmCanCapture(h,a)).toBe(false);capture(s,h,a.id);expect(s.players[0].ammo).toBe(5);expect(s.events.some(e=>e.type==='shot')).toBe(false);
});
it('honours a recent valid selection if a running target crosses the range edge during network transit',()=>{
 const {s,h}=setup(),a=s.actors.find(a=>a.owner==='p1')!;s.recruited=2;a.x=14;a.z=11.8;
 farmStep(s,{p0:{...farmIdle(),mark:a.id}},.05);const tick=farmView(s,'p0').tick;
 a.z=12.6;farmStep(s,{p0:{...farmIdle(),fire:true,target:a.id,captureTick:tick}},.05);
 expect(a.captured).toBe(true);expect(s.players[0].ammo).toBe(4);expect(h.species).toBe('hunter');
});
it('never uses an expired selection to capture an escaped animal',()=>{
 const {s}=setup(),a=s.actors.find(a=>a.owner==='p1')!;s.recruited=2;a.x=14;a.z=11.8;
 farmStep(s,{},.05);const tick=farmView(s,'p0').tick;for(let i=0;i<9;i++)farmStep(s,{},.05);
 a.z=12.6;farmStep(s,{p0:{...farmIdle(),fire:true,target:a.id,captureTick:tick}},.05);
 expect(a.captured).toBe(false);expect(s.players[0].ammo).toBe(5);
});
it('converts only the first two captures, including NPC and human, into hunters',()=>{
 const {s,h}=setup(),npc=s.actors.find(a=>!a.owner)!,human=s.actors.find(a=>a.owner==='p1')!,third=s.actors.find(a=>a.owner==='p2')!;
 npc.x=14;npc.z=7;capture(s,h,npc.id);expect(npc.species).toBe('hunter');expect(s.players.find(p=>p.entity===npc.id)?.bot).toBe(true);
 human.x=16;human.z=8;capture(s,h,human.id);expect(human.species).toBe('hunter');expect(s.players.find(p=>p.id==='p1')?.role).toBe('hunter');expect(s.players.find(p=>p.id==='p1')?.ammo).toBe(5);
 third.x=14;third.z=9;capture(s,h,third.id);expect(third.captured).toBe(true);expect(s.players.filter(p=>p.role==='hunter')).toHaveLength(3);expect(s.recruited).toBe(2);expect(validFarmView(farmView(s,'p0'))).toBe(true);
});
it('warns only the marked animal player and keeps owner identity out of shared views',()=>{
 const {s,h}=setup(),a=s.actors.find(a=>a.owner==='p1')!;a.x=14;a.z=16;
 farmStep(s,{p0:{...farmIdle(),mark:a.id}},.05);expect(farmView(s,'p1').selfMarked).toBe(true);expect(farmView(s,'p2').selfMarked).toBe(false);
 expect(farmView(s,'p1').players.every(p=>!('marked'in p)&&!('entity'in p))).toBe(true);
 farmStep(s,{p0:farmIdle()},.05);expect(farmView(s,'p1').selfMarked).toBe(false);expect(h.species).toBe('hunter');
});
it('does not overwrite a queued capture with a later movement packet',()=>{
 const pending={...farmIdle(),fire:true,target:123,yaw:1.4},next={...farmIdle(),x:1,yaw:0};const merged=mergeFarmInput(pending,next);
 expect(merged.fire).toBe(true);expect(merged.target).toBe(123);expect(merged.yaw).toBe(1.4);expect(merged.x).toBe(1);
});
it('runs nine different bounded poses and cancels them on movement',()=>{
 const poses=Array.from({length:9},(_,i)=>farmActionPose('duck',i+1,.7));expect(new Set(poses.map(p=>JSON.stringify(p))).size).toBe(9);expect(poses.every(p=>Object.values(p).every(Number.isFinite)&&p.y>=0&&Math.abs(p.rz)<.5)).toBe(true);
 const {s}=setup();farmStep(s,{p1:{...farmIdle(),natural:true,emote:5}},.05);const a=s.actors.find(a=>a.owner==='p1')!;expect(a.action).toBe(5);farmStep(s,{p1:{...farmIdle(),x:1}},.05);expect(a.action).toBe(0);
});
it('tracks a selected target smoothly but always yields to manual camera control',()=>{
 expect(farmFollowYaw(0,0,.05,0,0,false,1)).toBeGreaterThan(0);expect(farmFollowYaw(0,0,.05,0,0,true,1)).toBe(0);expect(farmFollowYaw(0,Math.PI,.05,1,0,false)).toBe(0);
});
it('provides actual non-silent buffers for the net and distinct outcome notices',async()=>{
 const audio=new FarmAudio();audio.ctx={sampleRate:12000,createBuffer:(_channels:number,count:number,rate:number)=>{const data=new Float32Array(count);return {duration:count/rate,getChannelData:()=>data};}} as unknown as AudioContext;
 const buffers=await Promise.all(['net-throw','capture-ok','capture-npc','marked'].map(id=>audio.buffer(id)));
 for(const buffer of buffers){expect(buffer).not.toBeNull();const data=buffer!.getChannelData(0);expect(data.some(x=>Math.abs(x)>.01)).toBe(true);expect(data.every(Number.isFinite)).toBe(true);}
 expect(new Set(buffers).size).toBe(4);
});

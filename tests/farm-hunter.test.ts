import {expect,it} from 'vitest';
import {farmAim,farmIdle,farmStep,newFarm,validFarmInput,type FarmMember} from '../src/farm-simulation';
import {SUPPLY} from '../src/farm-data';
const members:FarmMember[]=[{id:'h',name:'Caçador',species:'cat',voice:'natural-cat',bot:true,preference:'hunter'},{id:'a',name:'Animal',species:'cow',voice:'clip-test',bot:false,preference:'animal'}];
function setup(){const s=newFarm(members);s.hide=0;s.recruited=2;s.time=50;const hunter=s.actors.find(a=>a.species==='hunter')!,target=s.actors.find(a=>a.owner==='a')!;hunter.x=14;hunter.z=0;target.x=14;target.z=8;for(const a of s.actors)if(!a.owner){a.x=-30;a.z=30;}return {s,hunter,target};}
it('assists equally for public animals and rejects walls, range and hidden bushes',()=>{
 const {s,hunter,target}=setup();expect(farmAim([target],hunter,.15)?.id).toBe(target.id);
 const copy={...target,owner:''};expect(farmAim([copy],hunter,.15)?.id).toBe(target.id);
 target.z=30;expect(farmAim([target],hunter,0)).toBeUndefined();
 hunter.x=-16;hunter.z=-23;target.x=-16;target.z=-14;expect(farmAim([target],hunter,0)).toBeUndefined();
 expect(s.players[0].ammo).toBe(5);
});
it('AI investigates an audible fart and actually captures its visible source',()=>{
 const {s,hunter,target}=setup();s.events.push({id:s.nextId++,type:'sound',source:target.id,x:target.x,z:target.z,value:'sfx-gas',time:s.time});
 for(let i=0;i<20&&s.status==='playing';i++)farmStep(s,{a:farmIdle()},.05);
 expect(target.captured).toBe(true);expect(s.players[0].captures).toBe(1);expect(s.players[0].ammo).toBe(4);
 expect(Math.hypot(hunter.x-target.x,hunter.z-target.z)).toBeLessThan(8);
});
it('AI navigates back for ammunition instead of remaining empty',()=>{
 const {s,hunter}=setup();s.players[0].ammo=0;hunter.x=SUPPLY.x+5;hunter.z=SUPPLY.z;
 for(let i=0;i<240&&s.players[0].ammo===0;i++)farmStep(s,{},.05);
 expect(s.players[0].ammo).toBeGreaterThan(0);expect(s.players[0].ammo).toBeLessThanOrEqual(5);
});
it('keeps a selected running animal in a tolerant cone when the host receives a delayed shot',()=>{
 const {s,hunter,target}=setup();s.players[0].bot=false;
 // Seen straight ahead by the guest, then runs sideways before the host receives the input.
 target.x=17;target.z=10;
 expect(farmAim(s.actors,hunter,0)).toBeUndefined();
 expect(farmAim(s.actors,hunter,0,target.id)?.id).toBe(target.id);
 farmStep(s,{h:{...farmIdle(),fire:true,yaw:0,target:target.id}},.05);
 expect(target.captured).toBe(true);expect(s.players[0].ammo).toBe(4);
});
it('does not let a selected target bypass walls, range or an implausible change in direction',()=>{
 const {s,hunter,target}=setup();s.players[0].bot=false;
 target.x=28;target.z=0;
 expect(farmAim([target],hunter,0,target.id)).toBeUndefined();
 target.x=14;target.z=29;
 expect(farmAim([target],hunter,0,target.id)).toBeUndefined();
 hunter.x=-16;hunter.z=-23;target.x=-16;target.z=-14;
 farmStep(s,{h:{...farmIdle(),fire:true,yaw:0,target:target.id}},.05);
 expect(target.captured).toBe(false);expect(s.players[0].captures).toBe(0);
 expect(validFarmInput({...farmIdle(),target:NaN})).toBe(false);
 expect(validFarmInput({...farmIdle(),target:-1})).toBe(false);
});

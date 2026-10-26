import {describe,it,expect} from 'vitest';
import {createNight,nightIdle,nightStep,nightCampSize,validNightState} from '../src/night-simulation';
const solo=(classId:'blade'|'chaos'='blade')=>createNight([{id:'p',name:'P',classId,bot:false}]);
const run=(s:ReturnType<typeof solo>,steps:number,input=nightIdle())=>{for(let i=0;i<steps;i++)nightStep(s,[input],.05);};
const duel=(kind:number,stage=1)=>{const s=solo();s.stage=stage;const e={...s.enemies[0],kind,x:0,z:1.5,homeX:0,homeZ:1.5,timer:0,hp:9999,max:9999};s.enemies=[e];const p=s.players[0];p.x=0;p.z=0;p.maxHp=p.hp=5000;return {s,e,p};};
describe('Souls-like pressure',()=>{
 it('camps grow with each moon and stay within network bounds',()=>{expect(nightCampSize(1,0)).toBe(3);expect(nightCampSize(2,0)).toBe(4);expect(nightCampSize(2,1)).toBe(3);expect(nightCampSize(3,1)).toBe(4);const s=solo();s.stage=3;(s as any).phase='sanctuary';s.phaseTime=0;s.stage=2;run(s,1);expect(s.stage).toBe(3);expect(s.enemies.length).toBe(40);expect(new Set(s.enemies.map(e=>e.id)).size).toBe(40);expect(validNightState(s)).toBe(true);});
 it('common enemies only chain swings from the second moon; elites always do',()=>{
  const first=duel(0,1);run(first.s,40);const firstHits=first.s.events.filter(e=>e.kind==='hurt').length;
  const later=duel(0,2);run(later.s,40);const laterHits=later.s.events.filter(e=>e.kind==='hurt').length;
  expect(laterHits).toBeGreaterThan(firstHits);
  const elite=duel(3,1);let combo=0;for(let i=0;i<60;i++){run(elite.s,1);combo=Math.max(combo,elite.e.combo||0);}expect(combo).toBe(2);
 });
 it('a dodge timed through a hit grants energy and stamina',()=>{const {s,p,e}=duel(0,1);run(s,1);e.wind=.04;e.tx=p.x;e.tz=p.z;p.stamina=60;const energy=p.energy;run(s,1,{...nightIdle(),dodge:true});run(s,2);expect(p.hp).toBe(p.maxHp);expect(p.energy).toBeGreaterThan(energy);expect(s.events.some(v=>v.kind==='dodge'&&v.value===2)).toBe(true);});
 it('no more than two melee enemies wind up on the same hero at once',()=>{const s=solo();const p=s.players[0];p.x=0;p.z=0;p.maxHp=p.hp=99999;s.enemies=s.enemies.slice(0,5).map((e,i)=>({...e,id:i+1,kind:0,x:Math.sin(i)*2,z:Math.cos(i)*2,homeX:0,homeZ:0,timer:0,hp:999,max:999}));let worst=0;for(let i=0;i<200;i++){run(s,1);worst=Math.max(worst,s.enemies.filter(e=>e.wind>0).length);}expect(worst).toBeLessThanOrEqual(2);});
});

import {describe,it,expect} from 'vitest';
import {createNight,nightIdle,nightStep,nightBuy,startNightBoss,validNightInput,validNightState,NIGHT_REALM,nightBeamForks} from '../src/night-simulation';
import {EXTRA_SPELLS} from '../src/night-data';
const solo=()=>{const s=createNight([{id:'c',name:'Carmesim',classId:'chaos',bot:false}]);s.enemies=s.enemies.slice(0,3);s.enemies.forEach((e,i)=>{e.x=e.homeX=4+i;e.z=e.homeZ=29;e.timer=99;});return s;};
const run=(s:ReturnType<typeof solo>,seconds:number,input=nightIdle())=>{for(let i=0;i<seconds*20;i++)nightStep(s,[input],.05);};
describe('Carmesim, chaos witch',()=>{
 it('is a valid class and her beam drains, ramps up and stops when released',()=>{
  const s=solo(),p=s.players[0];expect(validNightState(s)).toBe(true);p.hp=60;p.facing=Math.PI/2;
  const e=s.enemies[0],start=e.hp;run(s,1,{...nightIdle(),attack:true,target:e.id});
  expect(p.beam).toBe(e.id);expect(e.hp).toBeLessThan(start);expect(p.hp).toBeGreaterThan(60);
  const early=start-e.hp;e.hp=start;run(s,1,{...nightIdle(),attack:true,target:e.id});expect(start-e.hp).toBeGreaterThan(early);
  run(s,.3);expect(p.beam).toBe(-1);expect(p.beamTime).toBe(0);
 });
 it('beam forks to more enemies as she levels',()=>{const s=solo(),p=s.players[0];const t=s.enemies[0];expect(nightBeamForks(s,p,t)).toHaveLength(0);p.level=5;expect(nightBeamForks(s,p,t)).toHaveLength(1);p.level=10;expect(nightBeamForks(s,p,t)).toHaveLength(2);});
 it('rewritten reality damages foes over time and makes allies inside invulnerable',()=>{
  const s=solo(),p=s.players[0];p.energy=100;run(s,1.2,{...nightIdle(),ultimate:true});
  expect(s.realm).toBeTruthy();expect(s.realm!.r).toBe(NIGHT_REALM.radius);
  const hp=p.hp;s.enemies.forEach(e=>{e.timer=0;});startNightBoss(s);expect(s.realm).toBeNull();
  const t=solo(),q=t.players[0];q.energy=100;run(t,1.2,{...nightIdle(),ultimate:true});const foe=t.enemies[0],before=foe.hp;run(t,2);expect(foe.hp).toBeLessThan(before);
  q.hp=50;t.hostile.push({id:999,x:q.x,z:q.z,vx:0,vz:0,life:1,damage:40});run(t,.2);expect(q.hp).toBeGreaterThanOrEqual(50);
  run(t,NIGHT_REALM.duration);expect(t.realm).toBeNull();expect(hp).toBeGreaterThan(0);
 });
 it('every shop spell is a valid extra with its own cooldown',()=>{const s=solo(),p=s.players[0];s.phase='sanctuary';p.gold=5000;for(const id of EXTRA_SPELLS){expect(validNightInput({...nightIdle(),extra:id})).toBe(true);expect(nightBuy(s,0,id)).toBe(true);}s.phase='explore';
  run(s,.1,{...nightIdle(),extra:'chain'});expect(p.action).toBe(7);expect(p.extraCds.chain).toBeGreaterThan(13.8);run(s,1);const hurt=s.enemies.filter(e=>e.hp<e.max).length;expect(hurt).toBeGreaterThanOrEqual(2);
  const x=p.x;p.facing=0;run(s,.1,{...nightIdle(),extra:'blink'});run(s,1);expect(Math.abs(p.z-29)+Math.abs(p.x-x)).toBeGreaterThan(3);expect(p.extraCds.blink).toBeGreaterThan(0);
 });
});

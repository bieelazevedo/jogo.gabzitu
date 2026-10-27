import {describe,it,expect} from 'vitest';
import {createNight,nightIdle,nightStep,validNightState} from '../src/night-simulation';
import {NIGHT_PORTALS,NIGHT_RELICS,NIGHT_QUESTS} from '../src/night-data';
const solo=()=>createNight([{id:'p',name:'P',classId:'blade',bot:false}]);
const step=(s:ReturnType<typeof solo>,input=nightIdle(),n=1)=>{for(let i=0;i<n;i++)nightStep(s,[input],.05);};
describe('Exploration quests',()=>{
 it('each moon starts with its own three quests and stays valid',()=>{const s=solo();expect(s.quests!.map(q=>q.kind)).toEqual(NIGHT_QUESTS[0].map(q=>q.kind));expect(validNightState(s)).toBe(true);
  s.phase='sanctuary';s.phaseTime=0;step(s);expect(s.stage).toBe(2);expect(s.quests!.map(q=>q.kind)).toEqual(NIGHT_QUESTS[1].map(q=>q.kind));expect(s.quests!.every(q=>q.progress===0&&!q.done)).toBe(true);});
 it('clearing whole camps advances the camp quest and pays the team once',()=>{const s=solo(),p=s.players[0];const gold=p.gold;for(const camp of [0,1]){for(const e of s.enemies.filter(e=>Math.floor((e.id-1)/4)===camp)){e.hp=1;e.x=p.x;e.z=p.z+1.5;}}
  for(let i=0;i<200&&!s.quests![0].done;i++){for(const e of s.enemies.filter(e=>e.hp>0&&Math.floor((e.id-1)/4)<2)){e.x=p.x;e.z=p.z+1.5;e.timer=99;}step(s,{...nightIdle(),attack:true});}
  expect(s.quests![0].done).toBe(true);expect(s.quests![0].progress).toBe(2);expect(p.gold).toBeGreaterThanOrEqual(gold+NIGHT_QUESTS[0][0].gold);const after=p.gold;step(s,nightIdle(),5);expect(p.gold).toBe(after);});
 it('portals and the relic complete through interaction',()=>{const s=solo(),p=s.players[0];for(const v of NIGHT_PORTALS.slice(0,3)){p.x=v.x;p.z=v.z;step(s,{...nightIdle(),interact:true});}expect(s.quests![1].done).toBe(true);
  const relic=NIGHT_RELICS[0];p.x=relic.x;p.z=relic.z;const points=p.points;step(s,{...nightIdle(),interact:true});expect(s.quests![2].done).toBe(true);expect(p.points).toBe(points+1);});
});

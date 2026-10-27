import {describe,it,expect} from 'vitest';
import {createNight,nightStep,nightIdle,startNightBoss,validNightState} from '../src/night-simulation';
import {activateTrial,constrainTrial,stepTrial,trialHitAllowed} from '../src/night-trials';
import {NIGHT_MONUMENTS} from '../src/night-expedition';
const setup=()=>{const s=createNight([{id:'inside',name:'Dentro',classId:'blade',bot:false},{id:'outside',name:'Fora',classId:'astral',bot:false}]);const m=NIGHT_MONUMENTS[0];Object.assign(s.players[0],{x:m.x+2,z:m.z});Object.assign(s.players[1],{x:m.x+m.r+3,z:m.z});return {s,m};};
describe('monumentos de sobrevivência',()=>{
 it('fixa os participantes e bloqueia a travessia em ambos os sentidos, inclusive deslocações instantâneas',()=>{
  const {s,m}=setup();expect(activateTrial(s,0,m.id)).toBe(true);expect(s.trial!.participants).toEqual(['inside']);
  s.players[0].x=m.x+30;s.players[1].x=m.x;s.players[1].z=m.z;constrainTrial(s);
  expect(Math.hypot(s.players[0].x-m.x,s.players[0].z-m.z)).toBeLessThan(m.r);expect(Math.hypot(s.players[1].x-m.x,s.players[1].z-m.z)).toBeGreaterThan(m.r);
 });
 it('suspende o cronómetro do boss, impede a transição e cria vagas dentro do orçamento',()=>{
  const {s,m}=setup();s.players[0].hp=s.players[0].maxHp=10000;activateTrial(s,0,m.id);const before=s.phaseTime;
  for(let i=0;i<100;i++)nightStep(s,s.players.map(()=>nightIdle()),.05);
  expect(s.phaseTime).toBe(before);expect(s.trial!.wave).toBeGreaterThan(0);expect(s.enemies.some(e=>e.trial===m.id)).toBe(true);expect(s.enemies.length).toBeLessThanOrEqual(40);expect(validNightState(s)).toBe(true);
  startNightBoss(s);expect(s.phase).toBe('explore');
 });
 it('isola os alvos do círculo e só recompensa os participantes sobreviventes, uma vez',()=>{
  const {s,m}=setup();activateTrial(s,0,m.id);stepTrial(s,3);const enemy=s.enemies.find(e=>e.trial)!;
  expect(trialHitAllowed(s,s.players[0],enemy)).toBe(true);expect(trialHitAllowed(s,s.players[1],enemy)).toBe(false);
  const gold=s.players.map(p=>p.gold);s.trial!.elapsed=m.duration-.01;stepTrial(s,.02);
  expect(s.trial!.status).toBe('won');expect(s.players[0].gold).toBe(gold[0]+m.gold);expect(s.players[1].gold).toBe(gold[1]);expect(s.enemies.some(e=>e.trial)).toBe(false);expect(activateTrial(s,0,m.id)).toBe(false);stepTrial(s,1);expect(s.players[0].gold).toBe(gold[0]+m.gold);expect(validNightState(s)).toBe(true);
 });
 it('liberta o círculo sem recompensa quando todos os participantes caem',()=>{
  const {s,m}=setup();activateTrial(s,0,m.id);const gold=s.players[0].gold;s.players[0].hp=0;stepTrial(s,.05);
  expect(s.trial!.status).toBe('failed');expect(s.players[0].gold).toBe(gold);expect(s.completedTrials||[]).not.toContain(m.id);const before=s.phaseTime;nightStep(s,s.players.map(()=>nightIdle()),.05);expect(s.phaseTime).toBeLessThan(before);
 });
 it('recusa ativações à distância e snapshots com participantes inválidos',()=>{
  const {s,m}=setup();expect(activateTrial(s,1,m.id)).toBe(false);activateTrial(s,0,m.id);s.trial!.participants.push('intruso');expect(validNightState(s)).toBe(false);
 });
});

import {describe,it,expect} from 'vitest';
import {createNight,nightStep,nightIdle,validNightState,nightDamageBoost} from '../src/night-simulation';
import {NIGHT_NPCS,acceptMission,claimMission,buyTalent,updateCampaign} from '../src/night-campaign';
import {NIGHT_HOMESTEADS,NIGHT_OPTIONAL_CAMPS,NIGHT_WORLD_LIMIT} from '../src/night-expedition';

const fresh=()=>createNight([{id:'hero',name:'Teste',classId:'blade',bot:false}]);
describe('campanha com habitantes',()=>{
 it('exige presença, só recompensa objetivos cumpridos e impede entregas repetidas',()=>{
  const s=fresh(),p=s.players[0];expect(acceptMission(s,0,'trails')).toBe(false);
  Object.assign(p,{x:NIGHT_NPCS[0].x,z:NIGHT_NPCS[0].z});expect(acceptMission(s,0,'trails')).toBe(true);
  expect(claimMission(s,0,'trails')).toBe(false);s.cleared=[0,1];const gold=p.gold,xp=p.xp;
  expect(claimMission(s,0,'trails')).toBe(true);expect(p.gold).toBe(gold+160);expect(p.xp).toBe(xp+120);
  expect(claimMission(s,0,'trails')).toBe(false);expect(p.gold).toBe(gold+160);expect(validNightState(s)).toBe(true);
 });
 it('conta visitas diferentes às quintas e preserva a missão entre luas',()=>{
  const s=fresh(),p=s.players[0];Object.assign(p,NIGHT_NPCS[1]);expect(acceptMission(s,0,'homesteads')).toBe(true);
  for(let i=0;i<2;i++){Object.assign(p,{x:NIGHT_HOMESTEADS[i].x,z:NIGHT_HOMESTEADS[i].z});updateCampaign(s);updateCampaign(s);}
  expect(p.missions!.homesteads.visited).toEqual([0,1]);s.stage=2;Object.assign(p,NIGHT_NPCS[1]);expect(claimMission(s,0,'homesteads')).toBe(true);
 });
 it('valida nível, dinheiro, presença e limite antes de aplicar talentos',()=>{
  const s=fresh(),p=s.players[0];p.gold=1000;Object.assign(p,{x:NIGHT_NPCS[2].x,z:NIGHT_NPCS[2].z});
  expect(buyTalent(s,0,'veteran')).toBe(false);p.level=3;const before=nightDamageBoost(p,false);
  expect(buyTalent(s,0,'veteran')).toBe(true);expect(nightDamageBoost(p,false)).toBeCloseTo(before+.05);expect(p.gold).toBe(840);
  expect(buyTalent(s,0,'veteran')).toBe(false);p.x=70;expect(buyTalent(s,0,'survivor')).toBe(false);
  p.talents!.veteran=99;expect(validNightState(s)).toBe(false);
 });
});
describe('território ampliado',()=>{
 it('aceita posições no novo território e continua a impor os limites',()=>{
  const s=fresh(),p=s.players[0];p.x=NIGHT_WORLD_LIMIT-.05;p.z=0;
  nightStep(s,[{...nightIdle(),x:1}],.05);expect(p.x).toBeLessThanOrEqual(NIGHT_WORLD_LIMIT);expect(p.x).toBeGreaterThan(79);expect(validNightState(s)).toBe(true);
  p.x=NIGHT_WORLD_LIMIT+3;expect(validNightState(s)).toBe(false);
 });
 it('descobre acampamentos pela proximidade sem duplicar inimigos',()=>{
  const s=fresh(),p=s.players[0];expect(s.enemies.some(e=>e.id>=41)).toBe(false);
  Object.assign(p,NIGHT_OPTIONAL_CAMPS[0]);nightStep(s,[nightIdle()],.05);const count=s.enemies.length;
  expect(s.enemies.some(e=>e.id>=41)).toBe(true);nightStep(s,[nightIdle()],.05);expect(s.enemies).toHaveLength(count);expect(count).toBeLessThanOrEqual(40);
 });
 it('não ultrapassa o orçamento de inimigos quando todos os lugares estão ocupados',()=>{
  const s=fresh(),p=s.players[0],e=s.enemies[0];s.enemies=Array.from({length:40},(_,i)=>({...e,id:i+1,hp:100}));Object.assign(p,NIGHT_OPTIONAL_CAMPS[0]);nightStep(s,[nightIdle()],.05);expect(s.enemies).toHaveLength(40);expect(s.enemies.some(e=>e.id>=41)).toBe(false);
 });
});

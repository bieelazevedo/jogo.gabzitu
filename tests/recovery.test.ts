import {describe,it,expect} from 'vitest';
import {adultFromDate,mergeProgress} from '../src/account';
import {validateCheckpoint,MAP_LAYOUT} from '../src/checkpoint';
import {createState,command} from '../src/simulation';
import {fresh} from '../src/persistence';

describe('conta e recuperação',()=>{
 it('calcula a maioridade no aniversário e rejeita datas impossíveis',()=>{
  const today=new Date(2026,9,25);
  expect(adultFromDate('2008-10-25',today)).toBe(true);
  expect(adultFromDate('2008-10-26',today)).toBe(false);
  expect(adultFromDate('2000-02-31',today)).toBe(false);
  expect(adultFromDate('2030-01-01',today)).toBe(false);
 });
 it('preserva os melhores resultados ao unir dispositivos',()=>{
  const a=fresh(),b=fresh();a.stars['1']=3;b.stars['1']=1;b.stars['2']=2;
  const merged=mergeProgress(a,b);expect(merged.stars['1']).toBe(3);expect(merged.stars['2']).toBe(2);expect(b.stars['1']).toBe(1);
 });
 it('recupera defesas e dinheiro sem partilhar referências',()=>{
  const s=createState();command(s,0,{type:'build',kind:'archer',spot:0});
  const cp=validateCheckpoint({version:1,layout:MAP_LAYOUT,savedAt:new Date().toISOString(),state:s});
  expect(cp.state.towers).toHaveLength(1);expect(cp.state.players[0].coins).toBe(s.players[0].coins);
  cp.state.players[0].coins=0;expect(s.players[0].coins).toBeGreaterThan(0);
 });
 it('recusa estados corrompidos, posições repetidas e partidas cooperativas',()=>{
  const s=createState();command(s,0,{type:'build',kind:'archer',spot:0});
  const cp={version:1,savedAt:new Date().toISOString(),state:s};
  s.towers.push({...s.towers[0]});expect(()=>validateCheckpoint(cp)).toThrow();s.towers.pop();
  s.players.push(structuredClone(s.players[0]));expect(()=>validateCheckpoint(cp)).toThrow();s.players.pop();
  s.time=NaN;expect(()=>validateCheckpoint(cp)).toThrow();
 });
});

import {describe,it,expect} from 'vitest';
import {fresh,validateSave} from '../src/persistence';
import {mergeProgress} from '../src/account';
import {rememberedTeam,suggestTeam} from '../src/formation';
import {createState,command,advance} from '../src/simulation';
import {validateCheckpoint,MAP_LAYOUT} from '../src/checkpoint';
import {CATS} from '../src/data';
describe('velocidade e formações',()=>{
 it('alterna 1× a 5× e executa cinco vezes os passos sem saltar a simulação',()=>{const s=createState();for(const n of [2,3,4,5]){command(s,0,{type:'speed'});expect(s.speed).toBe(n);}advance(s,1);expect(s.tick).toBe(150);command(s,0,{type:'speed'});expect(s.speed).toBe(1);});
 it('no cooperativo precisa do acordo dos dois em cada velocidade',()=>{const s=createState(1,'coop',[['archer'],['ice']]);command(s,0,{type:'speed'});expect(s.speed).toBe(1);command(s,1,{type:'speed'});expect(s.speed).toBe(2);});
 it('migra gravações antigas e conserva a formação mais recente num conflito',()=>{const older=fresh(),newer=fresh();newer.formation={team:['ice','archer','bomber'],coopTeam:['knight'],updatedAt:10};expect(mergeProgress(newer,older).formation).toEqual(newer.formation);const migrated=validateSave({version:2,stars:{},chaos:{},records:{}});expect(migrated.formation?.team).toEqual(['archer','ice']);});
 it('limpa desconhecidos, duplicados e preserva oito aliados',()=>{const s=fresh();for(let i=1;i<=31;i++)s.stars[i]=3;s.formation={team:['archer','ice','bomber','knight','witch','commander','monk','adminMage'],coopTeam:[],updatedAt:1};expect(rememberedTeam(validateSave(s))).toHaveLength(8);expect(validateSave({...s,formation:{team:['archer','archer','invalid'],coopTeam:[],updatedAt:1}}).formation?.team).toEqual(['archer']);});
 it('sugere só desbloqueados e oferece dano físico para a resistência mágica',()=>{const s=fresh();for(let i=1;i<=10;i++)s.stars[i]=3;const r=suggestTeam(s,11,true);expect(r.team).toHaveLength(8);expect(r.team.includes('pirate')||r.team.includes('samurai')).toBe(true);expect(r.team.every(k=>CATS[k].unlock<=10)).toBe(true);expect(suggestTeam(fresh(),1).team).toEqual(['archer','ice']);});
 it('retoma um checkpoint com nove espaços e velocidade 5×',()=>{const s=createState(11,'campaign',[['archer','ice','bomber','knight','witch','commander','monk','adminMage','uia']]);s.speed=5;expect(validateCheckpoint({version:1,layout:MAP_LAYOUT,savedAt:new Date().toISOString(),state:s}).state.speed).toBe(5);});
});

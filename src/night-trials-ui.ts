import {NIGHT_MONUMENTS} from './night-expedition';
import type {NightState,NightPlayer} from './night-simulation';
import {trialActive} from './night-trials';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function trialBrief(s:NightState,p:NightPlayer,id:string){
 const m=NIGHT_MONUMENTS.find(m=>m.id===id)||NIGHT_MONUMENTS[0],done=s.completedTrials?.includes(m.id),near=Math.hypot(p.x-m.x,p.z-m.z)<4;
 const team=s.players.filter(p=>p.hp>0&&Math.hypot(p.x-m.x,p.z-m.z)<m.r-.7);
 return `<div class="night-campaign"><small>MONUMENTO DE SOBREVIVÊNCIA</small><h2>${m.name}</h2><p>O guardião ergue uma barreira e convoca vagas de criaturas. Sobrevive durante <b>${m.duration} segundos</b>.</p><article class="night-mission-card"><h3>${done?'Prova concluída':'O círculo fecha na ativação'}</h3><p>Quem estiver dentro participa e fica fechado até ao fim. Quem estiver fora não pode entrar. A contagem para o boss fica suspensa durante toda a prova.</p><p>Dentro do círculo agora: <b>${team.map(p=>esc(p.name)).join(', ')||'ninguém'}</b>.</p><div class="night-rewards"><span><b>${m.gold}</b> moedas</span><span><b>${m.xp}</b> XP</span><span><b>+1</b> atributo</span></div><small>A recompensa é entregue uma vez aos participantes que estiverem vivos no fim.</small><button class="primary" data-night="trial-start:${m.id}" ${done||trialActive(s)||!near||s.phase!=='explore'?'disabled':''}>${done?'Recompensa já recebida':trialActive(s)?'Há uma prova em curso':'Ativar monumento'}</button></article></div>`;
}
export function trialBanner(s:NightState,p:NightPlayer){
 const t=s.trial;if(!t)return '';const m=NIGHT_MONUMENTS.find(m=>m.id===t.monument)!;
 if(t.status==='active')return `<small>${t.participants.includes(p.id)?'SOBREVIVE DENTRO DO CÍRCULO':'PROVA EM CURSO · ESTÁS FORA'}</small><strong>${m.name} · ${Math.ceil(t.duration-t.elapsed)} s</strong><span>Vaga ${t.wave} · ${t.participants.length} participantes · contagem do boss suspensa</span><div class="night-mission-progress"><i style="width:${(1-t.elapsed/t.duration)*100}%"></i></div>`;
 if(s.time-t.endedAt>8)return '';
 return `<small>${t.status==='won'?'PROVA VENCIDA':'PROVA TERMINADA'}</small><strong>${t.status==='won'?'O guardião reconhece a tua coragem':'Todos os participantes caíram'}</strong><span>${t.winners.includes(p.id)?'+'+m.gold+' moedas · +'+m.xp+' XP · +1 atributo':'A barreira foi levantada. A contagem do boss continua.'}</span>`;
}

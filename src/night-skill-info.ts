import {CLASS_SKILLS,EXTRA_INFO,classFor,type ExtraSpell,type NightClass} from './night-data';
import {nightDamageBoost,nightHealBoost,NIGHT_REALM,type NightPlayer} from './night-simulation';

export type SkillSlot='attack'|'power'|'defense'|'control'|'ultimate'|ExtraSpell;
type Effect={kind:'damage'|'heal'|'shield';base:number;magic?:boolean;suffix?:string};
type Info={name:string;text:string;cooldown?:number;effects:Effect[]};

/** Numbers mirror resolve() in night-simulation.ts. */
const POWER:Partial<Record<NightClass,Info>>={
 astral:{name:'Jardim astral',text:'Cura aliados num raio de 8 m e dá escudo.',effects:[{kind:'heal',base:35}]},
 guardian:{name:'Égide da Ordem',text:'Escudo de 6 s para aliados num raio de 8 m (metade do dano recebido).',effects:[{kind:'shield',base:6,suffix:' s'}]},
 witch:{name:'Eclipse drenante',text:'Explosão em área à volta; rouba vida com dano mágico.',effects:[{kind:'damage',base:80,magic:true,suffix:' em área'}]},
 ranger:{name:'Chuva de flechas',text:'Flechas caem sobre os inimigos num raio de 13 m.',effects:[{kind:'damage',base:80,suffix:' em área'}]},
 chaos:{name:'Onda do caos',text:'Explosão de 5 m no alvo que empurra e abranda os inimigos.',effects:[{kind:'damage',base:85,magic:true,suffix:' em área'}]},
};
const ULTIMATE:Partial<Record<NightClass,Info>>={
 chaos:{name:'Realidade reescrita',text:`Zona de ${NIGHT_REALM.radius} m durante ${NIGHT_REALM.duration} s: aliados lá dentro ficam invulneráveis e recuperam vida; inimigos levam dano contínuo e ficam abrandados.`,effects:[{kind:'damage',base:60,magic:true,suffix:' ao abrir'},{kind:'damage',base:NIGHT_REALM.damage*2,magic:true,suffix:'/s na zona'},{kind:'heal',base:NIGHT_REALM.heal*2,suffix:'/s na zona'}]},
};
const DEFENSE:Record<NightClass,string>={blade:'Escudo de 4 s e +35 de vigor.',astral:'Cura 20 e escudo de 4 s a aliados num raio de 8 m.',guardian:'Escudo de 6 s a aliados num raio de 8 m.',reaver:'Fúria de 6 s (+25% de dano, mais vampirismo) e escudo de 4 s.',witch:'Escudo pessoal de 4 s.',ranger:'Escudo de 4 s e +35 de vigor.',chaos:'Escudo de 4 s, levita, +35 de vigor e cura 10.'};
const CONTROL:Record<NightClass,string>={blade:'Fere e enfraquece inimigos num raio de 7 m.',astral:'Prende (abranda) inimigos num raio de 13 m.',guardian:'Provoca e enfraquece inimigos num raio de 7 m.',reaver:'Fere e enfraquece inimigos num raio de 7 m.',witch:'Abranda e enfraquece inimigos num raio de 13 m.',ranger:'Abranda inimigos num raio de 13 m.',chaos:'Puxa inimigos num raio de 7 m para o alvo, abranda-os e enfraquece-os.'};
const EXTRA:Record<ExtraSpell,Info>={
 meteor:{name:'Estrela cadente',text:'Meteoro no alvo, área de 4 m.',effects:[{kind:'damage',base:105,magic:true,suffix:' em área'}]},
 garden:{name:'Jardim astral',text:'Cura aliados num raio de 8 m.',effects:[{kind:'heal',base:35}]},
 ward:{name:'Manto protetor',text:'Escudo de 6 s a aliados num raio de 8 m.',effects:[{kind:'shield',base:6,suffix:' s'}]},
 chain:{name:'Relâmpago em cadeia',text:'Salta entre até 4 inimigos.',effects:[{kind:'damage',base:70,magic:true,suffix:' por salto'}]},
 nova:{name:'Nova gélida',text:'Explosão de gelo de 7 m que abranda tudo à volta.',effects:[{kind:'damage',base:60,magic:true,suffix:' em área'}]},
 blink:{name:'Passo sombrio',text:'Teletransporte de 7 m em frente com escudo; fere quem estiver à chegada.',effects:[{kind:'damage',base:40,magic:true,suffix:' à chegada'}]},
};

const haste=(p:NightPlayer)=>1-(p.upgrades.haste||0)*.08;
/** Card content for a held skill button: what it does, base and current numbers, cooldown. */
export function nightSkillInfo(p:NightPlayer,slot:SkillSlot):{name:string;text:string;cooldown?:number;lines:{label:string;base:string;now:string}[]}{
 const cls=classFor(p.classId),magic=cls.magic;let info:Info;
 if(slot==='attack')info=p.classId==='chaos'?{name:'Feixe do caos',text:'Segura para canalizar: drena vida e fica mais forte no mesmo alvo.',effects:[{kind:'damage',base:9*4.5,magic:true,suffix:'/s (até ×1,8)'}]}:{name:'Ataque',text:'Sequência de três golpes; o terceiro é mais forte.',effects:[{kind:'damage',base:24,magic},{kind:'damage',base:48,magic,suffix:' (3.º golpe)'}]};
 else if(slot==='power')info={...(POWER[p.classId]??{name:cls.power,text:'Golpe poderoso no alvo.',effects:[{kind:'damage',base:80,magic}]}),cooldown:12*haste(p)};
 else if(slot==='ultimate')info=ULTIMATE[p.classId]??{name:'Especial',text:'Área de 12 m: grande dano a inimigos, cura e escudo a aliados. Carrega ao causar dano.',effects:[{kind:'damage',base:170,magic,suffix:' em área'},{kind:'heal',base:45}]};
 else if(slot==='defense')info={name:CLASS_SKILLS[p.classId].defense,text:DEFENSE[p.classId],cooldown:18*haste(p),effects:p.classId==='astral'?[{kind:'heal',base:20}]:[]};
 else if(slot==='control')info={name:CLASS_SKILLS[p.classId].control,text:CONTROL[p.classId],cooldown:16*haste(p),effects:[{kind:'damage',base:p.classId==='chaos'?34:28,magic,suffix:' em área'}]};
 else info={...EXTRA[slot],cooldown:EXTRA_INFO[slot].cooldown};
 const lines=info.effects.map(e=>{const mult=e.kind==='damage'?nightDamageBoost(p,!!e.magic):e.kind==='heal'?nightHealBoost(p):1,round=(v:number)=>v>=10?Math.round(v):Math.round(v*10)/10;
  return {label:e.kind==='damage'?'Dano':e.kind==='heal'?'Cura':'Escudo',base:round(e.base)+(e.suffix||''),now:round(e.base*mult)+(e.suffix||'')};});
 return {name:info.name,text:info.text,cooldown:info.cooldown,lines};
}

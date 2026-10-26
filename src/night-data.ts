export const NIGHT_CLASSES=[
 {id:'blade',name:'Garra Lunar',role:'Duelista',color:0xd7aa62,magic:false,power:'Corte crescente',passive:'Esquiva perfeita restaura 8 de vida (8 s).'},
 {id:'astral',name:'Astral',role:'Curandeiro',color:0x83dccd,magic:true,power:'Jardim astral',passive:'Regenera 1,5 de vida/s após 6 s sem sofrer dano.'},
 {id:'guardian',name:'Bastião',role:'Guardião',color:0x91adcd,magic:false,power:'Égide da Ordem',passive:'Recebe menos 15% de dano. Protege o grupo próximo.'},
 {id:'reaver',name:'Rubro',role:'Duelista vampírico',color:0xdb7893,magic:false,power:'Garras rubras',passive:'Rouba 8% do dano físico efetivamente causado.'},
 {id:'witch',name:'Umbra',role:'Mago drenador',color:0xb79fe8,magic:true,power:'Eclipse drenante',passive:'Rouba 7% do dano mágico; eficácia reduzida em área.'},
 {id:'ranger',name:'Íris',role:'Arqueira',color:0xa9c878,magic:false,power:'Chuva de flechas',passive:'Flechas perseguidoras. Alcance de 17 metros.'},
 {id:'chaos',name:'Carmesim',role:'Feiticeira do caos',color:0xe0314f,magic:true,power:'Onda do caos',passive:'Caos instável: cada 4.º feitiço sai 40% mais forte.'},
] as const;
export type NightClass=typeof NIGHT_CLASSES[number]['id'];
export const classFor=(id:NightClass)=>NIGHT_CLASSES.find(c=>c.id===id)||NIGHT_CLASSES[0];
export const NIGHT_ZONES=[
 {name:'Santuário do Novelo',x:0,z:27,r:10,color:0x829379},
 {name:'Bosque dos Sussurros',x:-30,z:12,r:20,color:0x3c6350},
 {name:'Vila Sem Amanhã',x:28,z:9,r:19,color:0x8b7461},
 {name:'Criptas de Veludo',x:-24,z:-27,r:19,color:0x5c547c},
 {name:'Coroa Partida',x:25,z:-29,r:18,color:0x7d725c}
] as const;
export const NIGHT_PORTALS=[{x:0,z:25},{x:-29,z:14},{x:28,z:8},{x:-24,z:-25},{x:25,z:-27}];
export const NIGHT_SPRINGS=[{x:-37,z:4},{x:35,z:16},{x:-29,z:-34},{x:31,z:-35}];
export const NIGHT_CAMPS=[{x:-18,z:8},{x:-37,z:21},{x:-34,z:-12},{x:17,z:15},{x:37,z:1},{x:23,z:-10},{x:-13,z:-24},{x:-35,z:-32},{x:14,z:-34},{x:35,z:-28}];
export const NIGHT_OBSTACLES=[
 ...[-1,1].flatMap(sign=>Array.from({length:9},(_,i)=>({x:sign*(44+(i%2)*2),z:-36+i*9,r:1.5}))),
 {x:21,z:4,r:3},{x:34,z:13,r:3},{x:30,z:-3,r:2.8},{x:-19,z:-33,r:2.6},{x:-34,z:-23,r:2.4},
 {x:-17,z:19,r:1.7},{x:-40,z:7,r:1.6},{x:-23,z:1,r:1.8},{x:19,z:-23,r:1.7}
];
export const NIGHT_SHOP=[
 {id:'edge',name:'Lâmina do luar',description:'+8% de dano por nível',cost:65,max:4},
 {id:'heart',name:'Coração de nove vidas',description:'+20 de vida máxima por nível',cost:60,max:3},
 {id:'blood',name:'Pacto rubro',description:'+4% de vampirismo físico por nível',cost:80,max:3},
 {id:'siphon',name:'Selo drenante',description:'+4% de vampirismo mágico por nível',cost:80,max:3},
 {id:'bloom',name:'Semente astral',description:'+20% de cura e +1 vida/s fora de combate',cost:70,max:3},
 {id:'haste',name:'Relógio lunar',description:'−8% de recarga por nível',cost:75,max:3},
 {id:'flask',name:'Frasco da Ordem',description:'Recupera uma carga de poção (máx. 3)',cost:25,max:99},
 {id:'meteor',name:'Magia: estrela cadente',description:'Habilidade extra: meteoro numa área de 4 m',cost:100,max:1},
 {id:'garden',name:'Magia: jardim astral',description:'Habilidade extra: cura aliados numa área de 8 m',cost:90,max:1},
 {id:'ward',name:'Magia: manto protetor',description:'Habilidade extra: escudos para aliados próximos',cost:90,max:1},
 {id:'chain',name:'Magia: relâmpago em cadeia',description:'Habilidade extra: salta entre até 4 inimigos',cost:95,max:1},
 {id:'nova',name:'Magia: nova gélida',description:'Habilidade extra: explosão de gelo que abranda tudo à volta',cost:85,max:1},
 {id:'blink',name:'Magia: passo sombrio',description:'Habilidade extra: teletransporte curto com escudo e impacto',cost:80,max:1}
] as const;
export type ShopId=typeof NIGHT_SHOP[number]['id'];
export type NightOrder='follow'|'attack'|'defend'|'help'|'regroup'|'explore';
export const ORDER_NAMES:Record<NightOrder,string>={follow:'Seguir-me',attack:'Atacar alvo',defend:'Defender aqui',help:'Preciso de ajuda',regroup:'Reagrupar',explore:'Explorar por perto'};
export const NIGHT_STORY=[
 ['A última luz','O sino tocou sem mãos. Nas ruínas, a fome ganhou uma coroa. Reúne a Ordem antes de a lua fechar os olhos.'],
 ['A coroa rachou','“Pensaram que eu guardava o sachê? Eu guardava o que estava lá dentro.” O guardião regressa coberto de cinzas.'],
 ['A noite tem garras','O santuário treme. A última forma já não procura comida: procura o amanhecer. Esta é a última caçada.'],
 ['Um amanhecer improvável','A coroa caiu. O sachê era sabor salmão. Depois de tudo aquilo, ninguém teve coragem de reclamar.']
];

export const rangedClass=(id:NightClass)=>id==='ranger'||classFor(id).magic;
export const CLASS_SKILLS:Record<NightClass,{defense:string;control:string;description:string}>={
 blade:{defense:'Passo lunar',control:'Corte debilitante',description:'Proteção e vigor; corte que reduz o dano dos inimigos.'},
 astral:{defense:'Abraço celeste',control:'Raízes de luz',description:'Cura e proteção de grupo; prende o avanço dos inimigos.'},
 guardian:{defense:'Muralha viva',control:'Desafio real',description:'Escudos de grupo; provoca inimigos próximos e reduz o dano deles.'},
 reaver:{defense:'Pacto de sangue',control:'Marca rubra',description:'Fúria que aumenta dano e vampirismo; enfraquece inimigos.'},
 witch:{defense:'Véu arcano',control:'Inverno roxo',description:'Escudo pessoal; lentidão e enfraquecimento em área.'},
 ranger:{defense:'Vento favorável',control:'Flecha enredante',description:'Recupera vigor e protege; abranda alvos para manter distância.'},
 chaos:{defense:'Levitação carmesim',control:'Prisão de runas',description:'Levita protegida; puxa inimigos para uma prisão de runas e enfraquece-os.'}
};
/** Spells bought in the sanctuary; each gets its own action button and cooldown. */
export const EXTRA_SPELLS=['meteor','garden','ward','chain','nova','blink'] as const;
export type ExtraSpell=typeof EXTRA_SPELLS[number];
export const EXTRA_INFO:Record<ExtraSpell,{label:string;icon:string;cooldown:number;color:number}>={
 meteor:{label:'Meteoro',icon:'meteor',cooldown:20,color:0xffb669},
 garden:{label:'Jardim',icon:'garden',cooldown:20,color:0x86edc1},
 ward:{label:'Manto',icon:'ward',cooldown:20,color:0x99c7ff},
 chain:{label:'Relâmpago',icon:'chain',cooldown:14,color:0x9fd8ff},
 nova:{label:'Nova',icon:'nova',cooldown:16,color:0xaee8ff},
 blink:{label:'Passo',icon:'blink',cooldown:9,color:0xc9a0ff},
};

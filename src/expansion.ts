import type {CatDef,CatKind,EnemyDef,EnemyKind} from './types';
export const NEW_CATS={
 pirate:{name:'Capitão Atum',short:'Pirata',role:'Canhão físico · área 36 · perfura 30% da armadura',color:'#d89b55',cost:180,damage:48,range:180,interval:2.2,area:36,a:'Bombordo · área 72',b:'Bala de prata · +55% dano, −15% cadência',unlock:2},
 samurai:{name:'Ronin Ronrom',short:'Samurai',role:'Cortes rápidos · terceiro golpe duplo',color:'#70c3b2',cost:180,damage:22,range:108,interval:.72,a:'Lua crescente · corta 3 alvos',b:'Duelo · golpe terceiro ×3',unlock:4},
 alchemist:{name:'Dra. Miaustura',short:'Alquimista',role:'Ácido em área · quebra armadura por 2 s',color:'#b5d97c',cost:185,damage:13,range:158,interval:1.7,magic:true,area:38,a:'Frasco família · área 70',b:'Fórmula suspeita · veneno 9/s por 4 s',unlock:5},
 astronomer:{name:'Madame Eclipse',short:'Astrónoma',role:'Magia de longo alcance · marca alvo (+25% dano)',color:'#a6a4ef',cost:220,damage:35,range:235,interval:2.1,magic:true,a:'Órbita · +55 alcance',b:'Supernova · área 55, +25% dano',unlock:7},
 gardener:{name:'Dona Catnipa',short:'Jardineira',role:'Espinhos · abranda 45% · veneno 4/s',color:'#80b678',cost:155,damage:10,range:145,interval:1.35,magic:true,a:'Horta comunitária · área 55',b:'Raiz teimosa · lentidão 60% / 3 s',unlock:8},
 chef:{name:'Chef Sachê',short:'Chef',role:'Frigideira · fogo 8/s · área 42',color:'#efab74',cost:190,damage:22,range:135,interval:1.65,area:42,a:'Wok sem limites · área 80',b:'Malagueta do caos · fogo 15/s / 4 s',unlock:9},
 boxer:{name:'Miauhammad Ali',short:'Pugilista',role:'Físico · quarta pancada empurra o alvo',color:'#e38989',cost:145,damage:23,range:92,interval:.65,a:'Gancho · ignora 60% armadura',b:'Combo · +35% cadência',unlock:11},
 guardian:{name:'Santa Patada',short:'Guardiã',role:'Escudo mágico · abranda em cone de 3 alvos',color:'#79c8d4',cost:205,damage:21,range:120,interval:1.75,magic:true,a:'Muralha viva · alcance +45',b:'Sino da paz · marca os alvos por 2 s',unlock:13},
 adminMage:{name:'Gabriel, o Admin',short:'Admin',role:'Mago único · 4 feitiços automáticos em ciclo',color:'#7ce8e3',cost:420,damage:40,range:192,interval:1.65,magic:true,a:'Arcanista · alcance +40, rajada atinge 3',b:'Grimório do caos · +30% dano, meteoro área 70',unlock:10}
} satisfies Partial<Record<CatKind,CatDef>>;
export const NEW_ENEMIES={
 kraken:{name:'Kraken da Cantina',hp:5400,speed:17,reward:360,leak:50,armor:18,color:'#cd8e8a',size:36,boss:true,description:'Anuncia uma onda de três corredores na rota oposta a cada 16 s, três vezes. Magia e controlo nos flancos.'},
 magistrate:{name:'Juiz Pombo, o Indeferidor',hp:6200,speed:18,reward:390,leak:55,armor:22,color:'#c3b99a',size:35,boss:true,description:'Avisa antes de silenciar ataques num raio de 130 por 2 s. Distribui defesas ao longo do caminho.'},
 phoenix:{name:'Fénix do Secador',hp:5400,speed:23,reward:400,leak:55,armor:8,magicResist:.2,color:'#efad78',size:35,boss:true,description:'Recupera 25% da vida uma vez ao cair abaixo de 8%; não duplica moedas. Guarda uma habilidade para o regresso.'},
 archivist:{name:'Arquivista do Último Miau',hp:8500,speed:17,reward:500,leak:65,armor:20,color:'#91bfc1',size:39,boss:true,description:'A 65% e 30% de vida chama fantasmas ou blindados nas quatro rotas. Não protejas só uma.'},
 thief:{name:'Carteirista de Queijos',hp:75,speed:80,reward:15,leak:4,armor:0,color:'#b7a080',size:14,description:'Muito veloz. Ao entrar no refúgio rouba 15 moedas por pessoa. Usa lentidão.'},
 shaman:{name:'Xamã do Wi-Fi',hp:190,speed:30,reward:27,leak:5,armor:4,color:'#ac97cf',size:19,description:'A cada 5 s cura até 4 aliados próximos em 5% (máximo 70). Não cura chefes. Prioriza-o.'},
 scarab:{name:'Escaravelho de Panela',hp:280,speed:25,reward:28,leak:6,armor:60,color:'#b89a65',size:21,description:'Couraça pesada. Magia, ácido e perfuração anulam a vantagem.'},
 wisp:{name:'Fantasma do Recibo',hp:165,speed:44,reward:24,leak:5,armor:0,magicResist:.65,color:'#b2dbe2',size:18,description:'Resiste a 65% da magia. Arqueiros, piratas e samurais funcionam melhor.'},
 drummer:{name:'Tambor do Grupo da Família',hp:230,speed:31,reward:29,leak:6,armor:10,color:'#cb927b',size:20,description:'Acelera aliados num raio de 100 em 22%. Auras não acumulam e não afetam chefes.'},
 mimic:{name:'Entrega Suspeita',hp:340,speed:28,reward:32,leak:8,armor:18,color:'#ac925c',size:23,description:'Abaixo de metade da vida abre a caixa e corre 65% mais depressa. Reserva controlo.'},
 admiral:{name:'Almirante Bacalhau',hp:3100,speed:18,reward:230,leak:40,armor:18,color:'#6cabb9',size:33,boss:true,description:'Anuncia reforços nas outras entradas. Três chamadas, sem moedas dos invocados.'},
 duchess:{name:'Duquesa do Algoritmo',hp:3900,speed:19,reward:290,leak:45,armor:10,color:'#b58cc7',size:34,boss:true,description:'Alterna proteção física e mágica a cada 8 s; aura avisa 2 s antes. Mistura tipos de dano.'},
 hydra:{name:'Hidra dos Três Áudios',hp:4300,speed:17,reward:310,leak:50,armor:16,color:'#88b78b',size:36,boss:true,description:'A 65% e 30% de vida chama dois corredores na terceira rota. Guarda dano em área.'}
} satisfies Partial<Record<EnemyKind,EnemyDef>>;
export const expansionCatFrames:Partial<Record<CatKind,number>>={pirate:0,samurai:1,alchemist:2,astronomer:3,gardener:4,chef:5,boxer:6,guardian:7,adminMage:8};
export const expansionEnemyFrames:Partial<Record<EnemyKind,number>>={thief:0,shaman:1,scarab:2,wisp:3,drummer:4,mimic:5,admiral:6,duchess:7,hydra:8};

export const RECRUITS={
 allyKraken:{enemy:'kraken',unlock:19,name:'Kraken de Avental',short:'Kraken',cost:450,damage:32,range:145,interval:1.8,magic:true,color:'#d69297',role:'Tentáculos · três alvos · lentidão 35%',a:'Massa al dente · +45 alcance',b:'Receita do mar · +35% dano'},
 allyMagistrate:{enemy:'magistrate',unlock:23,name:'Juiz Pombo em Recurso',short:'Juiz Pombo',cost:420,damage:45,range:185,interval:2,color:'#d1bd95',role:'Carimbo físico · marca e perfura 40%',a:'Recurso aceite · +45 alcance',b:'Indeferido · +35% dano'},
 allyPhoenix:{enemy:'phoenix',unlock:27,name:'Fénix de Salão',short:'Fénix',cost:470,damage:38,range:170,interval:1.9,magic:true,area:45,color:'#efaa71',role:'Sopro mágico · queimadura 12/s por 3 s',a:'Brushing épico · área 85',b:'Temperatura máxima · fogo 18/s'},
 allyArchivist:{enemy:'archivist',unlock:31,name:'Arquivista da Ordem',short:'Arquivista',cost:580,damage:50,range:210,interval:2.3,magic:true,area:40,color:'#9bd6d2',role:'Páginas mágicas · área e quebra de armadura',a:'Edição completa · área 80',b:'Nota de rodapé · +35% dano'},
 allyLegollas:{enemy:'legollas',unlock:3,name:'Legollas, Aliado do Mau Menu',short:'Legollas',cost:340,damage:29,range:175,interval:1.6,color:'#dc7493',magic:true,area:35,role:'Feitiços carmesim · maldição abranda 30%',a:'Olho rubi · marca alvos',b:'Reclamação formal · área 65'},
 allyRatazao:{enemy:'ratazao',unlock:5,name:'Ratazão, o Convertido',short:'Ratazão',cost:310,damage:51,range:105,interval:1.7,color:'#c6a085',role:'Colher colossal · golpeia até 3 alvos',a:'Talher de jardim · alcance +45',b:'Banquete · +40% dano'},
 allyAdmiral:{enemy:'admiral',unlock:8,name:'Almirante da Ordem',short:'Almirante',cost:370,damage:49,range:205,interval:2.1,color:'#7fbfd2',area:40,role:'Salva naval · perfura 35% da armadura',a:'Broadside · área 75',b:'Frota ligeira · +30% cadência'},
 allyVacuum:{enemy:'vacuum',unlock:10,name:'Aspirador Domesticado',short:'Aspirador',cost:350,damage:19,range:115,interval:1.3,color:'#9ddbd4',magic:true,role:'Vórtice · abranda até 3 alvos em 40%',a:'Modo turbo · +35% cadência',b:'Filtro HEPA · alcance +45'},
 allyDuchess:{enemy:'duchess',unlock:12,name:'Duquesa Desconectada',short:'Duquesa',cost:410,damage:38,range:185,interval:1.7,color:'#c69ee8',magic:true,role:'Alterna projétil físico e mágico; marca alvos',a:'Banir o algoritmo · +40 alcance',b:'Feed infinito · +30% dano'},
 allyHydra:{enemy:'hydra',unlock:14,name:'Hidra em Modo Silêncio',short:'Hidra',cost:440,damage:25,range:150,interval:1.8,color:'#a3d69b',magic:true,role:'Três cabeças · três alvos envenenados',a:'Áudio de 2 minutos · veneno 10/s',b:'Responder a todos · +40 alcance'},
 allyKing:{enemy:'king',unlock:15,name:'Rei Roedor Reformado',short:'Rei Roedor',cost:520,damage:60,range:185,interval:2.4,color:'#d9b967',area:50,role:'Máquina de cerco · quebra armadura',a:'Demolição · área 90',b:'Coroa emprestada · +35% dano'}
} satisfies Partial<Record<CatKind,CatDef&{enemy:EnemyKind}>>;
export const RECRUIT_CATS:CatKind[]=Object.keys(RECRUITS) as CatKind[];
export const isUnique=(k:CatKind)=>k==='uia'||k==='adminMage'||RECRUIT_CATS.includes(k);

export const BOSS_AT:Record<number,EnemyKind>={3:'legollas',5:'ratazao',8:'admiral',10:'vacuum',12:'duchess',14:'hydra',15:'king',19:'kraken',23:'magistrate',27:'phoenix',31:'archivist'};
export const laterBossFrames:Partial<Record<EnemyKind,number>>={kraken:0,magistrate:1,phoenix:2,archivist:3};

import {NEW_CATS,NEW_ENEMIES,RECRUITS,BOSS_AT} from './expansion';
import type { CatDef, CatKind, EnemyDef, EnemyKind, Group, Level, Point, Wave } from './types';
import {applyHexLayout} from './td-hex';
export const W = 1000, H = 600, STEP = 1 / 30;
export const CATS: Record<CatKind, CatDef> = {
    ...NEW_CATS,...RECRUITS,
    archer: { name: 'Gato Arqueiro', short: 'Arqueiro', role: 'Dano físico · versátil', color: '#c38b43', cost: 85, damage: 19, range: 168, interval: .85, a: 'Rajada · +65% cadência', b: 'Olho de lince · +60% alcance, +85% dano, mais lento', unlock: 0 },
    ice: { name: 'Mago de Gelo', short: 'Gelo', role: 'Magia · abranda 35% / 2 s', color: '#70c6cb', cost: 110, damage: 8, range: 155, interval: 1.15, magic: true, a: 'Nevão · lentidão em área de 65', b: 'Inverno · abranda 65% durante 3 s', unlock: 0 },
    bomber: { name: 'Gato Bombardeiro', short: 'Bombardeiro', role: 'Dano físico · área de 55', color: '#da865c', cost: 145, damage: 37, range: 166, interval: 2.15, area: 55, a: 'Barril grande · área de 95', b: 'Pavio aceso · queimadura de 12/s durante 4 s', unlock: 1 },
    commander: { name: 'Gato Comandante', short: 'Comandante', role: 'Suporte · +22% cadência', color: '#b2b879', cost: 125, damage: 0, range: 135, interval: 1, a: 'Estandarte · alcance de suporte +70', b: 'Inspirar · acrescenta +18% dano', unlock: 2 },
    knight: { name: 'Gato Cavaleiro', short: 'Cavaleiro', role: 'Corpo a corpo · ignora 70% armadura', color: '#a5adb8', cost: 135, damage: 35, range: 105, interval: 1.05, a: 'Fende-latas · reduz armadura 65% / 4 s', b: 'Arco de aço · atinge até 4 alvos', unlock: 3 },
    witch: { name: 'Gato Bruxo', short: 'Bruxo', role: 'Magia · veneno de 8/s / 3 s', color: '#bc8ec6', cost: 160, damage: 12, range: 155, interval: 1.5, magic: true, a: 'Receita antiga · veneno 13/s durante 7 s', b: 'Contágio · veneno em área de 80', unlock: 4 },
    bard:{name:'Gato Fadista',short:'Fadista',role:'Magia · aliados próximos recebem +12% dano',color:'#af9569',cost:165,damage:14,range:145,interval:1.4,magic:true,a:'Casa de fados · +70 alcance de apoio',b:'Encore · apoio passa a +25% dano',unlock:5},
    monk:{name:'Mestra dos Sachês',short:'Elemental',role:'5 elementos: água, terra, ar, fogo e sachê',color:'#cb9257',cost:155,damage:30,range:112,interval:1.25,magic:true,a:'Conselho dos 5 · atinge 4 alvos',b:'Sachê divino · 5.º golpe causa dano duplo',unlock:6},
    engineer:{name:'Gata Engenhocas',short:'Engenhocas',role:'Descarga mágica · área de 45',color:'#79adb1',cost:175,damage:20,range:165,interval:1.55,magic:true,area:45,a:'Bobina grande · área de 75 e +35 alcance',b:'Sobrecarga · +65% dano, −20% cadência',unlock:8},
    uia: { name: 'Supremo Uia', short: 'Supremo Uia', role: 'Lendário · pulsos mágicos em área', color: '#e1c58b', cost: 650, damage: 23, range: 132, interval: 1.4, magic: true, area: 132, a: 'A física apresentou queixa.', b: 'Deixar acontecer · 8 s, recarga 65 s', unlock: 3 }
};
export const COMMON: CatKind[] = (['archer','ice','bomber','commander','knight','witch','bard','monk','engineer',...Object.keys(NEW_CATS),...Object.keys(RECRUITS)] as CatKind[]);
export const ENEMIES: Record<EnemyKind, EnemyDef> = {
    ...NEW_ENEMIES,
    rat: { name: 'Rato comum', hp: 55, speed: 39, reward: 9, leak: 2, armor: 0, color: '#8e8884', size: 15, description: 'Fraco, numeroso e convencido de que isto é um buffet.' },
    runner: { name: 'Rato corredor', hp: 40, speed: 70, reward: 10, leak: 3, armor: 0, color: '#b89978', size: 13, description: 'Rápido e frágil. O gelo ajuda a travá-lo.' },
    dog: { name: 'Cão robusto', hp: 230, speed: 27, reward: 22, leak: 7, armor: 6, color: '#a67d58', size: 23, description: 'Lento e resistente. Tem dúvidas sobre este emprego.' },
    armored: { name: 'Rato blindado', hp: 160, speed: 33, reward: 19, leak: 5, armor: 40, color: '#7c91a0', size: 18, description: 'Armadura 40: reduz 62% do dano físico. Magia ignora-a; cavaleiros atravessam 70%.' },
    swarm: { name: 'Enxame', hp: 25, speed: 51, reward: 4, leak: 1, armor: 0, color: '#b5a18d', size: 10, description: 'Pequenos e muitos. Explosões resolvem reuniões.' },
    elite: { name: 'Elite', hp: 300, speed: 48, reward: 30, leak: 7, armor: 12, magicResist:.25, color: '#a4809a', size: 20, description: 'Veloz. Resistência mágica: 25%. Combina dano físico e controlo.' },
    legollas: { name: 'Legollas, o Bruxo do Mau Menu', hp: 2600, speed: 19, reward: 180, leak: 35, armor: 12, color: '#a63d52', size: 37, boss: true, description: 'O bruxo detesta carne de panela, legumes e peixe. Invoca 3 ajudantes e transforma-se. Resistência ao controlo: 60%.' },
    ratazao: { name: 'Ratazão, o Devorador', hp: 3600, speed: 18, reward: 180, leak: 35, armor: 15, color: '#8b7065', size: 36, boss: true, description: 'Só sofre 40% da lentidão. Chama três reforços, até três vezes.' },
    vacuum: { name: 'Aspirador Autónomo', hp: 4800, speed: 21, reward: 240, leak: 45, armor: 24, color: '#819da2', size: 35, boss: true, description: 'Luz âmbar anuncia avanço por impulso. Resistência ao controlo: 60%.' },
    king: { name: 'Rei Roedor', hp: 7600, speed: 19, reward: 350, leak: 60, armor: 28, color: '#8b758c', size: 38, boss: true, description: 'A máquina acelera abaixo de 65% e 30% de vida. Resistência ao controlo: 60%.' }
};
const p = (a: number[][]): Point[] => a.map(([x, y]) => ({ x, y }));
const layouts = [
    { paths: [p([[-40, 175], [235, 175], [235, 430], [530, 430], [530, 210], [810, 210], [810, 390], [1040, 390]])], spots: p([[135, 100], [320, 110], [150, 290], [320, 290], [135, 490], [365, 505], [445, 350], [620, 490], [620, 315], [620, 130], [745, 120], [735, 300], [900, 295], [900, 465]]) },
    { paths: [p([[-30, 150], [220, 150], [220, 300], [740, 300], [740, 465], [1030, 465]]), p([[-30, 470], [400, 470], [400, 300], [740, 300], [740, 150], [1030, 150]])], spots: p([[100, 80], [305, 145], [130, 250], [300, 385], [100, 395], [475, 395], [480, 215], [610, 215], [655, 385], [830, 300], [835, 95], [910, 220], [840, 520], [925, 390]]) },
    { paths: [p([[-30, 290], [160, 290], [160, 130], [435, 130], [435, 450], [710, 450], [710, 200], [1030, 200]])], spots: p([[80, 205], [80, 385], [255, 225], [270, 65], [360, 340], [350, 510], [530, 350], [540, 510], [610, 135], [625, 285], [800, 110], [810, 290], [865, 430], [915, 125]]) },
    { paths: [p([[-30, 120], [290, 120], [290, 300], [590, 300], [590, 480], [1030, 480]]), p([[-30, 480], [150, 480], [150, 300], [590, 300], [590, 120], [1030, 120]])], spots: p([[120, 200], [220, 390], [380, 205], [480, 385], [680, 210], [680, 400], [810, 200], [810, 395], [95, 65], [385, 70], [490, 520], [920, 520], [920, 75], [75, 385], [490, 210], [690, 525]]) },
    { paths: [p([[-30, 320], [180, 320], [180, 150], [390, 150], [390, 450], [620, 450], [620, 150], [840, 150], [840, 350], [1030, 350]])], spots: p([[90, 220], [90, 415], [265, 230], [285, 65], [300, 365], [480, 230], [480, 520], [535, 365], [715, 230], [725, 65], [710, 380], [920, 240], [920, 440], [550, 80], [280, 525], [795, 525]]) }
];
const names = ['O Quintal dos Começos', 'Rua das Sardinhas', 'Mercado dos Bigodes', 'A Ponte do Atum', 'O Banquete do Ratazão', 'Telhados em Alvoroço', 'O Cano Tem Bigodes', 'Estação Patinha', 'Fábrica de Ração', 'O Silêncio do Aspirador', 'Laboratório Circular', 'Dois Depósitos, Um Destino', 'Avenida dos Estandartes', 'Portões da Profecia', 'Porto dos Ecos', 'O Último Novelo'];
const subtitles = ['Uma pequena pata. Uma grande resistência.', 'Duas entradas. O mesmo mau cheiro.', 'O primeiro confronto com um apetite desmedido.', 'A ponte abre na onda 6. Prepara a margem sul.', 'O jantar acabou. Alguém tem de lhe dizer.', 'A cidade também se defende lá em cima.', 'As elites descobriram os atalhos.', 'Os ratos nunca validam o bilhete.', 'A ração não se embala sozinha. Infelizmente.', 'Uma luz acende-se. ELE GIRA.', 'A física apresentou uma reclamação.', 'Dois armazéns, uma vida partilhada.', 'Um exército precisa de alguém que miaue ordens.', 'O universo está prestes a rodar.', 'O porto tem três entradas e zero paciência.', 'O Rei trouxe uma máquina. Nós trouxemos gatos.'];
const stories = ['Capitã Sarda: «Este é o último saco de ração. Não vamos negociar com quem o chama entrada.»', 'Fubá: «Eles vêm de dois lados!» Sarda: «Ótimo. Assim não se empurram.»', 'Ratazão: «Vim só provar uma coisinha.» Fubá: «Ele trouxe talheres de jardim.»', 'Sarda: «A ponte abre na sexta onda. Avisem a equipa. E o peixeiro.»', 'Ratazão: «Não posso lutar de barriga vazia.» Sarda: «Tens três barris na barriga.»', 'Fubá: «Lá em cima, uma marca circular.» Sarda: «Talvez seja uma chávena.»', 'O esgoto ecoa: «Ele… gira.» Os ratos fingem não ter ouvido.', 'Um cartaz diz ELE GIRA. Por baixo: PROIBIDO COLAR CARTAZES.', 'Bruxa Amora: «O veneno é artesanal. Receita da minha avó.»', 'O aspirador desliga-se. Um gato de expressão impassível abre os olhos. «Uia.»', 'Amora: «As equações deram todas gato.»', 'Sarda: «Os dois depósitos partilham os mantimentos. Não podemos perder nenhum sem sentir.»', 'O Comandante ergue o estandarte. Alguém pendurou lá meias.', 'Um silêncio circular atravessa o bairro. Os ratos começam a rever escolhas de vida.', 'Gabriel: «Não é um erro. São três problemas ao mesmo tempo.»', 'Rei Roedor: «A minha máquina é imbatível!» Uia lambe a pata.'];
function makeWaves(id: number, paths: number): Wave[] {
    const count = id < 4 ? 10 : id <= 11 || id === 15 ? 12 : 14;
    return Array.from({ length: count }, (_, i) => {
        const n = i + 1, groups: Group[] = [];
        const add = (kind: EnemyKind, amount: number, interval: number, path = 0, delay = 0) => groups.push({ kind, count: amount, interval, path, delay });
        const second = paths > 1 && (id !== 4 || n >= 6) ? 1 : 0;
        add(n % 3 === 0 ? 'runner' : 'rat', 6 + Math.floor(i * 1.6) + Math.floor(id * .7), n < 3 ? 1.5 : 1.1, n % 2 === 0 ? second : 0);
        if (n >= 3)
            add(id >= 7 && n % 3 === 1 ? 'elite' : n % 2 === 0 ? 'armored' : 'dog', 2 + Math.floor(i / 3), 2.8, second, 7);
        if (n >= 5)
            add('swarm', 12 + Math.floor(i * .8), .38, 0, 12);
        if (id > 5 && n > 6)
            add('runner', 7 + Math.floor(id / 2), .7, second, 20);
        if(id>=6&&n>=4&&n%3===1)add('armored',3+Math.floor(id/5),1.7,0,13);
        if(id>=11&&n>=5&&n%3===2)add('elite',3+Math.floor(n/4),1.4,second,6);
        if(id>=6 && n>=3 && n%3===0)add('thief',2+Math.floor(n/4),1.4,second,5);
        if(id>=7 && n>=4 && n%4===0)add('shaman',1+Number(id>=12),4,0,9);
        if(id>=9 && n>=3 && n%3===1)add('scarab',2+Math.floor(n/5),2.5,second,10);
        if(id>=10 && n>=3 && n%3===2)add('wisp',3+Math.floor(n/4),1.8,0,7);
        if(id>=11 && n>=4 && n%4===1)add('drummer',1+Number(id>=15),3.5,second,8);
        if(id>=13 && n>=3 && n%4===2)add('mimic',2+Math.floor(n/5),2.8,0,12);
        if(paths>=3&&n>=5)add(n%2?'thief':'wisp',3+Math.floor(n/3),1.5,2,18);
        const boss = n === count && !!BOSS_AT[id];
        if (boss)
            add(BOSS_AT[id], 1, 1, 0, 15);
        return { groups, reward: 35 + n * 5 + id * 2, boss, title: boss ? 'Um convidado pouco discreto' : n === 1 ? 'Lá vêm os primeiros' : n % 3 === 0 ? 'Patas apressadas' : n % 2 === 0 ? 'Metal e más intenções' : 'A reunião dos roedores' };
    });
}
export const LEVELS: Level[] = names.map((name, i) => {
    const id = i + 1, layout = layouts[(i + (i >= 5 ? 1 : 0)) % layouts.length];
    return { id, name, chapter: Math.floor(i / 8) + 1, subtitle: subtitles[i], story: stories[i], novelty: id === 1 ? 'Constrói junto às curvas. O alcance faz a diferença.' : id === 2 ? 'Entradas alternadas. As setas mostram os dois percursos.' : id === 3 ? 'Ratazão chega na última onda; resiste a lentidão.' : id === 4 ? 'A segunda entrada abre na onda 6.' : id === 10 ? 'Chefe por impulsos. Vencer desperta o Supremo Uia.' : id === 12 ? 'Vida partilhada pelos dois depósitos.' : id >= 6 ? 'Combina magia, armadura e controlo dos dois percursos.' : 'Cavaleiro e Bruxo entram na Ordem durante este capítulo.', theme: id <= 5 ? 'garden' : id <= 10 ? 'town' : 'night', paths: layout.paths.map(a => a.map(v => ({ ...v }))), spots: layout.spots.map(v => ({ ...v })), waves: makeWaves(id, layout.paths.length), coins: 320 + id * 12, bridgeAt: id === 4 ? 6 : undefined, dual: id === 12 };
});
// A ponte tem dois percursos desde a definição; o segundo só recebe grupos após o aviso.
LEVELS[3].paths = layouts[3].paths;
LEVELS[3].spots = layouts[3].spots;
LEVELS[3].waves = makeWaves(4, 2);
LEVELS[11].paths = layouts[1].paths;
LEVELS[11].spots = layouts[1].spots;
LEVELS[11].waves = makeWaves(12, 2);
LEVELS[2].subtitle = 'O mercado tem um cliente particularmente difícil.';
LEVELS[2].story = 'Sarda: «O mercado está demasiado calmo.» Fubá: «Talvez tenham gostado do menu de hoje.» Ao longe, ouve-se uma reclamação muito indignada.';
LEVELS[2].novelty = 'Uma presença desconhecida aproxima-se na última onda. Atenção às runas que anunciam os feitiços. Ajudantes invocados não dão moedas.';
// Os capítulos seguintes têm percursos próprios, definidos separadamente dos cenários.
const advancedPaths: number[][][][] = [
    [[[-30, 115], [210, 115], [210, 390], [490, 390], [490, 145], [780, 145], [780, 455], [1030, 455]]],
    [[[-30, 150], [270, 150], [270, 440], [660, 440], [660, 265], [1030, 265]], [[-30, 475], [140, 475], [140, 290], [460, 290], [460, 110], [850, 110], [850, 265], [1030, 265]]],
    [[[-30, 310], [180, 310], [180, 120], [430, 120], [430, 480], [680, 480], [680, 210], [1030, 210]]],
    [[[-30, 120], [330, 120], [330, 300], [570, 300], [570, 470], [850, 470], [850, 310], [1030, 310]], [[-30, 470], [180, 470], [180, 300], [570, 300], [570, 130], [850, 130], [850, 310], [1030, 310]]],
    [[[-30, 145], [160, 145], [160, 445], [385, 445], [385, 150], [610, 150], [610, 445], [850, 445], [850, 285], [1030, 285]]],
    [[[-30, 270], [180, 270], [180, 465], [420, 465], [420, 135], [720, 135], [720, 360], [1030, 360]]],
    [[[-30, 135], [260, 135], [260, 330], [520, 330], [520, 475], [1030, 475]], [[-30, 475], [130, 475], [130, 330], [690, 330], [690, 135], [1030, 135]]],
    [[[-30, 200], [240, 200], [240, 450], [520, 450], [520, 175], [800, 175], [800, 400], [1030, 400]], [[-30, 450], [90, 450], [90, 70], [520, 70], [520, 175], [800, 175], [800, 400], [1030, 400]]],
    [[[-30, 155], [320, 155], [320, 450], [640, 450], [640, 155], [1030, 155]], [[-30, 460], [170, 460], [170, 305], [790, 305], [790, 155], [1030, 155]]],
    [[[-30, 300], [155, 300], [155, 130], [400, 130], [400, 460], [655, 460], [655, 130], [880, 130], [880, 340], [1030, 340]], [[-30, 490], [270, 490], [270, 300], [400, 300], [400, 460], [655, 460], [655, 130], [880, 130], [880, 340], [1030, 340]]]
];
function distanceToPaths(point: Point, paths: Point[][]) { let best = Infinity; for (const path of paths)
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
        best = Math.min(best, Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy));
    } return best; }
advancedPaths.forEach((paths, i) => { const level = LEVELS[i + 5]; level.paths = paths.map(p); const candidates: Point[] = []; for (let y = 65; y <= 535; y += 94)
    for (let x = 80; x <= 920; x += 105) {
        const pos = { x, y }, d = distanceToPaths(pos, level.paths);
        if (d >= 49 && d <= 145)
            candidates.push(pos);
    } level.spots = candidates.filter((_, j) => j % 2 === 0).slice(0, 18); if (level.spots.length < 12)
    level.spots = candidates.slice(0, 16); level.waves = makeWaves(level.id, level.paths.length); });
export function waveFor(level: Level, index: number, chaos = false, endless = false): Wave {
    const base = structuredClone(level.waves[index % level.waves.length]);
    if (endless) {
        const cycle = Math.floor(index / level.waves.length);
        base.groups.forEach(g => { g.count = Math.min(36, g.count + cycle * 3); g.interval = Math.max(.3, g.interval - cycle * .08); if (cycle > 1 && g.kind === 'rat')
            g.kind = 'elite'; });
        base.boss = index % 5 === 4;
        if (base.boss)
            base.groups.push({ kind: ['ratazao', 'vacuum', 'king'][Math.floor(index / 5) % 3] as EnemyKind, count: 1, interval: 1, path: 0, delay: 12 });
    }
    if (chaos) {
        base.groups.push({ kind: index % 2 ? 'runner' : 'armored', count: 4 + Math.floor(index / 2), interval: .8, path: level.bridgeAt&&index+1<level.bridgeAt?0:level.paths.length - 1, delay: 4 });
        if (index > 3)
            base.groups.push({ kind: 'elite', count: 2, interval: 3, path: 0, delay: 18 });
    }
    return base;
}
// Mundo II abre rotas de flanco: os percursos e a antecipação mostram todas as entradas.
for(const id of [12,14,15,16]){
 const l=LEVELS[id-1];
 if(id===16){l.paths=[p([[-30,120],[220,120],[220,300],[570,300],[570,480],[1030,480]]),p([[-30,480],[370,480],[370,300],[760,300],[760,120],[1030,120]])];}
 l.paths.push(p([[500,-30],[500,75],[900,75],[900,540],[1030,540]]));
 // Preserve existing spot indices for older checkpoints; select fresh spots only for the new finale.
 if(id===16){l.spots=[];for(let y=170;y<=450;y+=100)for(let x=100;x<=850;x+=120){const q={x,y},d=distanceToPaths(q,l.paths);if(d>=48&&d<=145)l.spots.push(q);}l.spots=l.spots.slice(0,20);}
 l.waves=makeWaves(id,l.paths.length);
}
LEVELS[7].novelty='O Almirante anuncia reforços por entradas secundárias. Guarda moedas para cobrir os flancos.';
LEVELS[9].novelty='O Aspirador acelera após luz âmbar. Vencer desbloqueia Gabriel, o Admin, para compra nas próximas partidas.';
LEVELS[11].novelty='Três entradas. A Duquesa alterna proteção física e mágica: precisas dos dois tipos de dano.';
LEVELS[13].novelty='Três entradas. A Hidra chama corredores nos limiares de vida: observa os avisos.';
LEVELS[15].novelty='Final de três rotas: 14 ondas, tipos de resistência diferentes e a máquina do Rei.';
LEVELS[15].theme='night';LEVELS[15].coins=560;
// Keep the original fifteen IDs, then append two worlds of eight.
LEVELS.pop();LEVELS[14].name='O Último Novelo';LEVELS[14].waves=makeWaves(15,LEVELS[14].paths.length);
const newNames=['Porto das Patas','Salinas do Ronrom','Docas sem Dono','A Cantina Submersa','Farol das Sardinhas','Maré de Emboscadas','Canal das Sete Vidas','Tribunal dos Pombos','Biblioteca Suspensa','Escadas Impossíveis','Oficina do Tempo','O Salão em Chamas','Jardim das Equações','Quatro Ventos','Arquivo das Meias Perdidas','O Último Miau'];
for(let j=0;j<16;j++){
 const id=j+16,a=150+(j%3)*45,b=570+(j%2)*70;
 const paths=[p([[-30,130],[a,130],[a,430],[b,430],[b,230],[1030,230]])];
 if(j!==1)paths.push(p([[-30,480],[a+130,480],[a+130,290],[b+180,290],[b+180,100],[1030,100]]));
 if([4,5,7,9,11,12,13,14,15].includes(j))paths.push(p([[450,-30],[450,65],[900,65],[900,530],[1030,530]]));
 if(j===13||j===15)paths.push(p([[100,630],[100,550],[690,550],[690,350],[1030,350]]));
 const candidates:Point[]=[];for(let y=65;y<=535;y+=85)for(let x=70;x<=910;x+=100){const q={x,y},d=distanceToPaths(q,paths);if(d>=45&&d<=145)candidates.push(q);}
 const spots=candidates.filter((_,i)=>i%2===0).slice(0,20);if(spots.length<14)spots.push(...candidates.filter(q=>!spots.includes(q)).slice(0,14-spots.length));
 LEVELS.push({id,name:newNames[j],chapter:j<8?3:4,theme:j<8?'coast':'archive',subtitle:j<8?'A maré trouxe reforços. E uma reclamação.':'O conhecimento é poder. O sachê também.',story:j<8?'Sarda: «O mar está calmo.» Fubá: «Então por que está a usar um chapéu de chefe?»':'Gabriel: «Está tudo sob controlo.» Legollas: «Isso inclui o menu?»',novelty:paths.length+' rotas. Espia a onda, combina tipos de dano e reserva moedas para os flancos.',paths,spots,waves:makeWaves(id,paths.length),coins:560+(id-16)*12});
 const l=LEVELS.at(-1)!;if(paths.length===4)for(let w=6;w<l.waves.length;w++)l.waves[w].groups.push({kind:w%2?'runner':'armored',count:4+Math.floor(w/3),interval:2,path:3,delay:25});
}
export const WORLD_ENDS=[8,15,23,31];
export const CHAPTERS = ['A Revolta da Ração','O Império do Mau Menu','Marés do Caos','O Reino do Último Miau'];
for(const l of LEVELS)l.chapter=WORLD_ENDS.findIndex(end=>l.id<=end)+1;

// Append close-range bases without changing indices used by saved games.
for(const level of LEVELS){const target=Math.min(24,level.spots.length+4);const candidates:Point[]=[];for(let y=75;y<=525;y+=60)for(let x=65;x<=935;x+=60){const point={x,y},d=distanceToPaths(point,level.paths);if(d>=44&&d<=72)candidates.push(point);}for(const point of candidates.sort((a,b)=>distanceToPaths(a,level.paths)-distanceToPaths(b,level.paths))){if(level.spots.length>=target)break;if(level.spots.every(p=>Math.hypot(p.x-point.x,p.y-point.y)>=74))level.spots.push(point);}}
// Levels are laid on the KayKit hex grid: roads follow tile centres and spots sit on whole tiles (see td-hex.ts).
for(const level of LEVELS){const before=level.paths.length;applyHexLayout(level);if(level.paths.length!==before)level.waves=makeWaves(level.id,level.paths.length);}
CATS.knight.range=132;CATS.monk.range=138;CATS.samurai.range=132;CATS.boxer.range=120;
CATS.commander.range=190;CATS.bard.range=185;CATS.guardian.range=165;
CATS.allyRatazao.range=138;CATS.allyVacuum.range=155;CATS.allyKraken.range=175;
CATS.guardian.role='Apoio: aliados a 165 recebem +10% alcance; abranda 3 alvos';

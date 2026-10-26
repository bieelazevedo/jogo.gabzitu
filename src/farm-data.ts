export type Species='cat'|'dog'|'cow'|'chicken'|'pig'|'sheep'|'duck'|'goat'|'horse'|'goose';
export const SPECIES:Record<Species,{name:string;plural:string;speed:number;size:number;color:number;ability:string;description:string;cooldown:number;home:[number,number]}>={
 cat:{name:'Gato',plural:'gatos',speed:3.4,size:.65,color:0xdca15c,ability:'Sete vidas, zero boletos',description:'Arrancada curta, com recarga.',cooldown:20,home:[9,17]},
 dog:{name:'Cão',plural:'cães',speed:3.5,size:.8,color:0xa8794c,ability:'Foi o carteiro!',description:'Latido que faz os animais próximos correrem.',cooldown:25,home:[18,-8]},
 cow:{name:'Vaca',plural:'vacas',speed:2.8,size:1.35,color:0xeee8d9,ability:'Reunião de condomínio',description:'O rebanho próximo segue-te por alguns segundos.',cooldown:28,home:[-25,-27]},
 chicken:{name:'Galinha',plural:'galinhas',speed:3.2,size:.5,color:0xf2d5a0,ability:'O forninho caiu!',description:'Corrida de pânico com asas abertas.',cooldown:22,home:[-27,21]},
 pig:{name:'Porco',plural:'porcos',speed:3,size:.85,color:0xdca0a0,ability:'Banho de barraco',description:'Nuvem de lama que atrapalha a visão.',cooldown:26,home:[-9,23]},
 sheep:{name:'Ovelha',plural:'ovelhas',speed:3.1,size:.9,color:0xe8e0c9,ability:'Maria vai com as outras',description:'Chama as ovelhas próximas para uma caminhada coletiva.',cooldown:24,home:[-10,-29]},
 duck:{name:'Pato',plural:'patos',speed:3.1,size:.55,color:0xe1d8b3,ability:'Não me comprometo',description:'Arrancada e acesso ao lago.',cooldown:20,home:[25,21]},
 goat:{name:'Cabra',plural:'cabras',speed:3.4,size:.85,color:0xb7a68b,ability:'Subi no salto',description:'Salto curto que atravessa cercas baixas.',cooldown:24,home:[3,-27]},
 horse:{name:'Cavalo',plural:'cavalos',speed:3.7,size:1.4,color:0x9f6545,ability:'Taca-lhe trote!',description:'Galope potente, mas bastante chamativo.',cooldown:26,home:[-30,4]},
 goose:{name:'Ganso',plural:'gansos',speed:3.2,size:.7,color:0xf0eadb,ability:'Eu tenho advogado!',description:'Grito que provoca uma reação coletiva.',cooldown:27,home:[27,13]},
};
export const SPECIES_KEYS=Object.keys(SPECIES) as Species[];
export type Rect={x:number;z:number;w:number;d:number;h:number;kind:'wall'|'fence'|'crate'|'hay'|'tree'|'house'|'coop';};
export const FARM_WALLS:Rect[]=[
 {x:-25,z:-12,w:.5,d:14,h:4,kind:'wall'},{x:-7,z:-12,w:.5,d:14,h:4,kind:'wall'},{x:-16,z:-19,w:18,d:.5,h:4,kind:'wall'},
 {x:-22,z:-5,w:6,d:.5,h:4,kind:'wall'},{x:-10,z:-5,w:6,d:.5,h:4,kind:'wall'},
 {x:22,z:-21,w:10,d:9,h:5,kind:'house'},{x:-28,z:23,w:6,d:5,h:2.5,kind:'coop'},
 {x:30,z:-6,w:9,d:7,h:5,kind:'house'},
 {x:-14,z:24,w:.3,d:14,h:1.05,kind:'fence'},{x:-5,z:30,w:18,d:.3,h:1.05,kind:'fence'},
 {x:-28,z:-24,w:15,d:.3,h:1.1,kind:'fence'},{x:-32,z:-31,w:.3,d:13,h:1.1,kind:'fence'},
 {x:1,z:8,w:12,d:.3,h:1.1,kind:'fence'},{x:8,z:11,w:.3,d:6,h:1.1,kind:'fence'},
 ...[[-19,-13],[-11,-16],[-20,-9],[6,17],[12,20],[1,-8],[20,0],[-20,7],[3,28]].map(([x,z],i)=>({x,z,w:i%2?2.2:3,d:2,h:1.1+(i%3)*.4,kind:i%2?'crate' as const:'hay' as const})),
 ...[[-34,-13],[-34,12],[-23,32],[0,33],[15,31],[34,5],[32,-29],[4,-32],[16,-32],[-34,-34]].map(([x,z])=>({x,z,w:1,d:1,h:5,kind:'tree' as const})),
];
export const ZONES=[{name:'Celeiro do Barraco',x:-16,z:-12},{name:'Galinheiro',x:-27,z:19},{name:'Pasto das Respeitáveis',x:-25,z:-29},{name:'Chiqueiro',x:-7,z:23},{name:'República dos Gatos',x:10,z:19},{name:'Lago do Deboche',x:26,z:21},{name:'Horta do Pix',x:8,z:-20},{name:'Casa do Agricultor',x:22,z:-21},{name:'Armazém de Reposição',x:-2,z:-2}];
export const SUPPLY={x:-2,z:-2};
export const BUSHES=[[-26,-2],[-19,3],[-8,5],[4,13],[14,21],[20,13],[30,8],[10,-27],[-4,-23],[-27,13],[0,25],[27,-7]].map(([x,z])=>({x,z,r:2.1}));
export const inBush=(x:number,z:number)=>BUSHES.some(b=>Math.hypot(x-b.x,z-b.z)<b.r);
export const AMMO_SPOTS=[[-30,-4],[-22,14],[-7,13],[10,-9],[30,-7],[17,28],[-10,-28],[7,28],[30,3],[3,-29]];
export function insideBarn(x:number,z:number){return x>-25&&x<-7&&z>-19&&z<-5;}
export function segmentRect(ax:number,az:number,bx:number,bz:number,r:Rect,pad=0):number|null{
 let lo=0,hi=1;for(const [a,d,min,max]of [[ax,bx-ax,r.x-r.w/2-pad,r.x+r.w/2+pad],[az,bz-az,r.z-r.d/2-pad,r.z+r.d/2+pad]]){if(Math.abs(d)<1e-8){if(a<min||a>max)return null;}else{let t1=(min-a)/d,t2=(max-a)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}}return lo;
}
export function occlusion(ax:number,az:number,bx:number,bz:number){let walls=0;for(const r of FARM_WALLS)if(r.kind!=='tree'&&segmentRect(ax,az,bx,bz,r)!==null)walls+=r.kind==='wall'||r.kind==='house'||r.kind==='coop'?1:.25;return Math.min(3,walls);}
export function blocked(x:number,z:number,r=.4,jump=false,species?:Species){if(Math.abs(x)>38-r||Math.abs(z)>34-r)return true;if(species!=='duck'&&species!=='goose'&&((x-26)**2/64+(z-21)**2/36<1))return true;return FARM_WALLS.some(b=>!(jump&&b.h<1.3)&&Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}

export type FarmMeme={id:string;name:string;category:'Quinta'|'Novela original'|'Internet raiz'|'Redes e gritos'|'Natural';text?:string;file?:string;idea?:boolean;};
const originals=[['advogado','Eu tenho advogado!','EU TENHO ADVOGADO!'],['impostos','Eu pago impostos!','EU PAGO IMPOSTOS!'],['milho','Quem roubou meu milho?','QUEM ROUBOU MEU MILHO?'],['naograva','Não me grava!','NÃO ME GRAVA!'],['respeitavel','Vaca respeitável','EU SOU UMA VACA RESPEITÁVEL!'],['foigato','Foi o gato!','FOI O GATO!'],['celeiro','Este celeiro é um absurdo!','ESTE CELEIRO É UM ABSURDO!'],['pasto','Não divido pasto','EU NÃO DIVIDO PASTO!'],['dono','Chama o dono!','CHAMA O DONO DA QUINTA!'],['envolve','Não me envolve!','NÃO ME ENVOLVE NISSO!'],['camera','Tira essa câmera!','TIRA ESSA CÂMERA DAQUI!'],['trabalho','Estou trabalhando!','ESTOU TRABALHANDO!'],['intimidade','Sem intimidade','NÃO TENHO INTIMIDADE COM ESSA GALINHA!'],['para','Para, criatura!','PARA! PARA, CRIATURA!'],['egua','Égua do céu!','ÉGUA DO CÉU!'],['policia','Chama a polícia do milho!','CHAMA A POLÍCIA DO MILHO!']];
const novels=[['elegante','Condomínio do pasto','Meu bem, não temos intimidade para dividir este pasto!'],['racao','Ração deselegante','Essa ração é de uma deselegância assustadora!'],['cacarejar','Etiqueta de jantar','Não é de bom tom cacarejar durante o jantar!'],['lastro','Sem lastro','Eu não tenho lastro para tamanha humilhação!'],['apogeu','Apogeu do mau gosto','Este celeiro é o apogeu do mau gosto!'],['drama','Vilã da horta','Você me paga, galinha! Em milho e com juros!']];
export const FARM_MEMES:FarmMeme[]=[...originals.map(([id,name,text])=>({id,name,text,category:'Quinta' as const,file:'/farm-audio/'+id+'.wav'})),...novels.map(([id,name,text])=>({id,name,text,category:'Novela original' as const,file:'/farm-audio/'+id+'.wav'})),...SPECIES_KEYS.map(k=>({id:'natural-'+k,name:SPECIES[k].name,category:'Natural' as const})),...['Pedro, Cadê Meu Chip?','Eita, Geovanna, o Forninho Caiu!','Para Nossa Alegria','Já Acabou, Jéssica?','Taca-le Pau','Sanduíche-iche','Luiza Está no Canadá','Caneta Azul','Numa árvore qualquer / Nos Galhos Secos','Não Sou Capaz de Opinar','Que Isso, Meu Filho?!','É Verdade Esse Bilhete','Eu Tô Passada','Socorro!','Eu Não Aguento Mais!'].map((name,i)=>({id:'raiz-'+i,name,category:'Internet raiz' as const,idea:true})),...['Odete Roitman · Agressão dessa monta','Odete Roitman · Meu bem, não é de bom tom','Carminha · Avenida Brasil','Nazaré Tedesco · Senhora do Destino','Félix · Amor à Vida','Bebel · Paraíso Tropical','Quem Ama Cuida · Égua / Carmita','Maya Massafera · PARAAAA!','CHAMA A POLÍCIA!','TUDO BOM, JOCA?!','DERRICK, MEU DEUS! E AGORA?!','ÉGUAAAA!','CARMITAAAA!'].map((name,i)=>({id:'referencia-'+i,name,category:'Redes e gritos' as const,idea:true}))];
export const availableMeme=(id:string)=>FARM_MEMES.find(m=>m.id===id&&!m.idea);

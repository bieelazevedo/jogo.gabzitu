import type {Ability} from './types';
export const SKILLS:Record<Ability,{name:string;icon:string;description:string;cooldown:number;radius:number;stars:number}>={
 yarn:{name:'Chuva de Novelos',icon:'✺',description:'145 de dano mágico num raio de 110. Recarga: 38 s.',cooldown:38,radius:110,stars:0},
 war:{name:'Miau de Guerra',icon:'⚑',description:'Uma reunião de condomínio: +40% de cadência durante 8 s. Recarga: 48 s.',cooldown:48,radius:0,stars:0},
 heal:{name:'Entrega de Emergência',icon:'♥',description:'O estafeta trouxe ração. Recupera 15 de vida, até 2 utilizações. Recarga: 55 s.',cooldown:55,radius:0,stars:6},
 box:{name:'Caixa de Cartão',icon:'▣',description:'Embosca até 8 inimigos: 60 de dano mágico e lentidão de 65% por 2,5 s. A caixa dura 10 s, raio de 60. Recarga: 42 s.',cooldown:42,radius:60,stars:3},
 sardine:{name:'Banquete Falso',icon:'♧',description:'Uma isca de atum durante 6 s. Inimigos na área recebem +25% de dano e abrandam 25%. Raio de 100, recarga de 50 s.',cooldown:50,radius:100,stars:9},
 uia:{name:'Deixar acontecer',icon:'◎',description:'Ascensão U I I I A: gira e dispara pulsos mais depressa durante 8 s. Menos eficaz contra chefes. Recarga: 65 s.',cooldown:65,radius:132,stars:0}
};

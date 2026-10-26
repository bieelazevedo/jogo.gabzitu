import type {Species} from './farm-data';
export const FARM_ACTIONS=[
 {id:1,icon:'♧',name:'Hora da ração'},
 {id:2,icon:'↗',name:'Espreguiçar'},
 {id:3,icon:'♨',name:'Coçar a fofoca'},
 {id:4,icon:'≈',name:'Sacudir o barraco'},
 {id:5,icon:'♫',name:'Passinho do milho'},
 {id:6,icon:'↶',name:'Ré do boleto'},
 {id:7,icon:'✦',name:'Rebolado suspeito'},
 {id:8,icon:'♡',name:'Drama da quinta'},
 {id:9,icon:'♛',name:'Reverência fina'},
] as const;
export function farmActionPose(species:Species,action:number,time:number){
 const bird=['chicken','duck','goose'].includes(species),beat=Math.sin(time*9),slow=Math.sin(time*3),pulse=Math.sin(time*Math.PI/4)**2;
 const p={x:0,y:0,z:0,rx:0,ry:0,rz:0,head:0,feet:0,wings:0,sy:1};
 if(action===1){p.head=.35+Math.sin(time*(bird?10:4))*.12;p.rx=bird?.12:.04;}
 if(action===2){p.rx=-.18*pulse;p.sy=1+.12*pulse;p.head=-.2*pulse;}
 if(action===3){p.rz=Math.sin(time*15)*.08;p.head=.2;p.feet=Math.sin(time*15)*.5;}
 if(action===4){p.ry=Math.sin(time*22)*.17;p.rz=Math.sin(time*22+1)*.09;}
 if(action===5){p.x=Math.sin(time*4.5)*.16;p.y=Math.abs(beat)*.09;p.ry=slow*.55;p.rz=beat*.1;p.feet=beat*.7;p.wings=beat*.5;}
 if(action===6){p.z=Math.sin(time*3)*.2;p.ry=-.4;p.rx=-.12;p.feet=beat*.7;}
 if(action===7){p.ry=Math.sin(time*7)*.65;p.rz=Math.sin(time*7+1)*.14;p.y=Math.abs(beat)*.05;p.wings=.35;}
 if(action===8){p.rx=-.18;p.head=-.3;p.y=Math.abs(Math.sin(time*5))*.12;p.wings=bird?.7+beat*.4:0;p.rz=slow*.12;}
 if(action===9){p.rx=Math.sin(Math.min(time,2.4)/2.4*Math.PI)*.3;p.head=.35;p.feet=0;}
 return p;
}

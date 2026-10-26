import {ENEMIES} from './data';
import type { CatKind, Save, State } from './types';
/** Áudio original sintetizado localmente: cordas, ambiente, miados e efeitos por arma. */
export class AudioManager {
 private output?:DynamicsCompressorNode;private comedyAfter=0;private previousKills=0;private previousHp=100;private seenBoss=0;
 private ctx?:AudioContext;private noise?:AudioBuffer;private nextBeat=0;private beat=0;private nextBird=0;private lastShot=0;private observedTime=-1;private bossPhase=-1;private casts=new Map<number,number>();
 constructor(private settings:()=>Save['settings']){}
 unlock(){try{if(!this.ctx){this.ctx=new AudioContext();this.output=this.ctx.createDynamicsCompressor();this.output.threshold.value=-16;this.output.ratio.value=8;this.output.attack.value=.005;this.output.release.value=.15;this.output.connect(this.ctx.destination);const n=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate),a=n.getChannelData(0);let smooth=0;for(let i=0;i<a.length;i++){smooth=.8*smooth+.2*(Math.random()*2-1);a[i]=smooth;}this.noise=n;}void this.ctx.resume().catch(()=>{});}catch{}}
 private note(freq:number,duration:number,volume:number,type:OscillatorType='sine',delay=0,end?:number,music=false){
  const c=this.ctx;if(!c||c.state!=='running')return;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(freq,t);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration*.85);
  const v=volume*(music?this.settings().music:this.settings().effects*1.6);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,v),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.output||c.destination);o.start(t);o.stop(t+duration+.02);
 }
 private rustle(duration:number,volume:number,frequency:number){const c=this.ctx;if(!c||c.state!=='running'||!this.noise)return;const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.setValueAtTime(volume*this.settings().effects,c.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);source.connect(filter);filter.connect(gain);gain.connect(c.destination);source.start();source.stop(c.currentTime+duration);}
 private meow(happy=true){this.note(happy?480:320,.19,.07,'triangle',0,happy?740:190);this.note(happy?700:230,.19,.04,'sine',.14,happy?420:150);}
 comedy(kind:'boom'|'bonk'|'scratch'|'fail'|'party'){
  const v=this.settings().comedy??.65;if(v<=0)return;
  if(kind==='boom'){this.note(145,.8,.28*v,'sine',0,34);this.note(58,.6,.14*v,'triangle');this.rustle(.3,.1*v,700);}
  if(kind==='bonk'){this.note(760,.16,.18*v,'triangle',0,145);this.note(1240,.08,.1*v,'sine');}
  if(kind==='scratch'){[820,160,670,120].forEach((f,i)=>this.note(f,.12,.11*v,'sawtooth',i*.09,i%2?780:95));}
  if(kind==='fail'){[294,277,262,196].forEach((f,i)=>this.note(f,i===3?.75:.28,.13*v,'sawtooth',i*.3,i===3?145:f*.97));}
  if(kind==='party'){[523,659,784,1047].forEach((f,i)=>this.note(f,.18,.13*v,'square',i*.1));this.note(1047,.5,.1*v,'triangle',.4,1319);}
 }
 play(kind:'buy'|'upgrade'|'hit'|'ability'|'win'|'lose'){
  if(kind==='buy'){this.rustle(.06,.09,1800);this.note(620,.1,.08,'triangle');this.meow();}
  if(kind==='upgrade'){[440,554,660,880].forEach((f,i)=>this.note(f,.2,.08,'triangle',i*.07));}
  if(kind==='hit')this.note(740,.075,.025,'triangle',0,370);
  if(kind==='ability'){this.rustle(.4,.08,2400);[330,440,660,880].forEach((f,i)=>this.note(f,.3,.07,'sine',i*.04));}
  if(kind==='win'){this.comedy('party');[392,494,587,784,659,784].forEach((f,i)=>this.note(f,.35,.09,'triangle',i*.13));setTimeout(()=>this.meow(),800);}
  if(kind==='lose'){this.comedy('fail');}
 }
 private huntAfter=new Map<string,number>();
 hunt(kind:string){
  const now=this.ctx?.currentTime??0;if(!kind||now<(this.huntAfter.get(kind)||0))return;
  this.huntAfter.set(kind,now+(['hit','slash','cast'].includes(kind)?.12:kind==='ambience'?2:.25));
  if(kind==='win'||kind==='lose'){this.play(kind);return;}
  if(kind==='slash'){this.rustle(.12,.055,3400);this.note(420,.1,.035,'triangle',0,130);}
  if(kind==='cast'){this.note(660,.18,.045,'sine',0,1320);this.note(990,.22,.025,'triangle',.04,1480);}
  if(kind==='hit'){this.rustle(.055,.045,1400);this.note(155,.1,.06,'triangle',0,65);this.note(940,.07,.025,'sine');}
  if(kind==='hurt'){this.note(105,.25,.1,'triangle',0,43);this.rustle(.18,.07,800);}
  if(kind==='dodge'){this.rustle(.18,.035,4200);this.note(330,.14,.025,'sine',0,95);}
  if(kind==='heal'){[523,659,784].forEach((f,i)=>this.note(f,.4,.035,'sine',i*.045));}
  if(kind==='slam'){this.rustle(.45,.11,650);this.note(80,.55,.13,'sine',0,27);this.note(145,.12,.06,'triangle',0,48);}
  if(kind==='roar'){this.note(55,.8,.07,'sawtooth',0,95);this.note(82,.7,.04,'triangle',.1,35);this.rustle(.6,.06,500);}
  if(kind==='break'){this.note(1568,.35,.045,'sine',0,784);this.note(1175,.4,.04,'triangle',.05,392);this.rustle(.2,.06,2200);}
  if(kind==='ultimate'){[196,294,392,587,784].forEach((f,i)=>this.note(f,.55,.055,'triangle',i*.055));this.note(65,.7,.1,'sine',0,33);}
  if(kind==='ambience'){this.note(73.4,1.8,.05,'sine',0,undefined,true);this.note(146.8,1.6,.018,'triangle',0,undefined,true);this.note(220,1.4,.012,'sine',.2,undefined,true);}
 }
 private attack(kind:CatKind){
  if(kind==='archer'){this.note(340,.07,.025,'triangle',0,140);this.rustle(.035,.015,2200);}
  if(kind==='ice'){this.note(1175,.18,.027,'sine');this.note(1760,.12,.018,'sine',.04);}
  if(kind==='bomber'){this.rustle(.21,.07,600);this.note(95,.2,.045,'sine',0,38);}
  if(kind==='witch'){this.note(180,.22,.023,'sine',0,410);this.note(270,.12,.015,'triangle',.06,140);}
  if(kind==='knight'){this.rustle(.06,.03,3600);this.note(830,.07,.018,'triangle',0,480);}
  if(kind==='uia'){this.note(220,.14,.05,'triangle',0,440);this.note(330,.1,.03,'sine',.1,660);}
  if(kind==='bard'){this.note(392,.3,.035,'triangle');this.note(587,.18,.02,'sine',.035);}
  if(kind==='engineer'){this.note(140,.12,.025,'sawtooth',0,720);this.rustle(.06,.02,3200);}
  if(['adminMage','astronomer','allyDuchess'].includes(kind)){this.note(660,.2,.045,'sine',0,990);this.note(330,.25,.025,'triangle',.06);}
  if(['pirate','allyAdmiral','allyKing'].includes(kind)){this.rustle(.2,.05,900);this.note(110,.2,.04,'triangle',0,40);}
  if(['samurai','boxer','guardian','allyRatazao'].includes(kind))this.note(390,.09,.03,'triangle',0,120);
  if(['alchemist','gardener','chef','allyHydra','allyLegollas','allyVacuum'].includes(kind))this.note(520,.14,.035,'sine',0,260);
  if(kind==='monk'){this.note(440,.17,.035,'sine',0,880);this.rustle(.12,.02,1400);}
 }
 observe(s:State){
  if(s.time<this.observedTime){this.lastShot=0;this.bossPhase=-1;this.casts.clear();this.comedyAfter=0;this.previousKills=0;this.previousHp=100;this.seenBoss=0;}this.observedTime=s.time;if(s.paused||s.status!=='playing')return;
  const big=s.enemies.find(e=>ENEMIES[e.kind].boss);
  if(big&&big.id!==this.seenBoss){this.seenBoss=big.id;this.comedy('boom');this.comedyAfter=s.time+3;}
  else if(s.time>this.comedyAfter){if(s.hp<this.previousHp){this.comedy(s.hp<=30?'scratch':'bonk');this.comedyAfter=s.time+4;}else if(Math.floor(s.kills/12)>Math.floor(this.previousKills/12)){this.comedy('party');this.comedyAfter=s.time+7;}}
  this.previousKills=s.kills;this.previousHp=s.hp;
  let count=0;for(const p of s.projectiles)if(p.id>this.lastShot){if(count++<3)this.attack(p.kind);this.lastShot=Math.max(this.lastShot,p.id);}
  for(const t of s.towers)if(['uia','monk','knight'].includes(t.kind)){if(t.casts>(this.casts.get(t.id)||0))this.attack(t.kind);this.casts.set(t.id,t.casts);}
  const boss=s.enemies.find(e=>e.kind==='legollas');if(boss&&boss.phase!==this.bossPhase){this.bossPhase=boss.phase;if(boss.phase===2||boss.phase===4){this.rustle(.6,.08,650);[147,196,233].forEach((f,i)=>this.note(f,.7,.045,'triangle',i*.06));}}
 }
 update(active:boolean){
  const c=this.ctx;if(!active||!c||c.state!=='running')return;
  if(c.currentTime>this.nextBird){this.nextBird=c.currentTime+8+Math.random()*8;this.note(1500,.12,.018,'sine',0,2100,true);this.note(1900,.15,.012,'sine',.17,1350,true);}
  if(c.currentTime<this.nextBeat)return;this.nextBeat=c.currentTime+.33;
  const chords=[[196,247,294],[175,220,262],[165,196,247],[147,196,247]],chord=chords[Math.floor(this.beat/16)%4],index=this.beat%16;
  if(index%2===0)this.note(chord[(index/2)%3]*2,.44,.11,'triangle',0,undefined,true);
  if(index%8===0)this.note(chord[0]/2,.75,.11,'sine',0,undefined,true);
  if(index===6||index===14)this.note(chord[2]*4,.3,.045,'sine',0,undefined,true);this.beat++;
 }
}

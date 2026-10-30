import {ENEMIES} from './data';
import type { CatKind, Save, State } from './types';

/** Áudio original sintetizado localmente: chiptune sinfónico, ambiente, miados e efeitos táteis ("juicy") por arma. */
export class AudioManager {
 private output?:DynamicsCompressorNode;
 private comedyAfter=0;
 private previousKills=0;
 private previousHp=100;
 private previousWave=0;
 private seenBoss=0;
 private ctx?:AudioContext;
 private noise?:AudioBuffer;
 private nextBeat=0;
 private beat=0;
 private nextBird=0;
 private lastShot=0;
 private observedTime=-1;
 private bossPhase=-1;
 private casts=new Map<number,number>();

 constructor(private settings:()=>Save['settings']){}

 unlock(){
  try{
   if(!this.ctx){
    this.ctx=new AudioContext();
    this.output=this.ctx.createDynamicsCompressor();
    this.output.threshold.value=-15;
    this.output.ratio.value=8;
    this.output.attack.value=.004;
    this.output.release.value=.14;
    this.output.connect(this.ctx.destination);
    const n=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate),a=n.getChannelData(0);
    let smooth=0;
    for(let i=0;i<a.length;i++){
     smooth=.78*smooth+.22*(Math.random()*2-1);
     a[i]=smooth;
    }
    this.noise=n;
   }
   void this.ctx.resume().catch(()=>{});
  }catch{}
 }

 private note(freq:number,duration:number,volume:number,type:OscillatorType='sine',delay=0,end?:number,music=false){
  const c=this.ctx;if(!c||c.state!=='running')return;
  const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
  o.type=type;
  o.frequency.setValueAtTime(freq,t);
  if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration*.85);
  const v=volume*(music?this.settings().music:this.settings().effects*1.65);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0001,v),t+.007);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);
  g.connect(this.output||c.destination);
  o.start(t);
  o.stop(t+duration+.02);
 }

 private rustle(duration:number,volume:number,frequency:number){
  const c=this.ctx;if(!c||c.state!=='running'||!this.noise)return;
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
  source.buffer=this.noise;
  filter.type='lowpass';
  filter.frequency.value=frequency;
  gain.gain.setValueAtTime(volume*this.settings().effects,c.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(this.output||c.destination);
  source.start();
  source.stop(c.currentTime+duration);
 }

 private meow(happy=true){
  this.note(happy?510:320,.18,.075,'triangle',0,happy?780:185);
  this.note(happy?740:230,.18,.045,'sine',.13,happy?450:145);
 }

 private coinChime(){
  this.note(987.77,.07,.038,'square',0);
  this.note(1318.51,.14,.042,'triangle',.055);
 }

 private waveHorn(){
  [196,246.94,293.66,392].forEach((f,i)=>this.note(f,.32,.065,'sawtooth',i*.065));
  this.note(98,.5,.08,'triangle',0);
 }

 comedy(kind:'boom'|'bonk'|'scratch'|'fail'|'party'){
  const v=this.settings().comedy??.65;if(v<=0)return;
  if(kind==='boom'){this.note(150,.85,.3*v,'sine',0,32);this.note(62,.65,.16*v,'triangle');this.rustle(.35,.12*v,750);}
  if(kind==='bonk'){this.note(780,.15,.19*v,'triangle',0,150);this.note(1280,.08,.11*v,'sine');}
  if(kind==='scratch'){[840,165,690,125].forEach((f,i)=>this.note(f,.12,.11*v,'sawtooth',i*.085,i%2?790:95));}
  if(kind==='fail'){[294,277,262,196].forEach((f,i)=>this.note(f,i===3?.8:.28,.14*v,'sawtooth',i*.28,i===3?140:f*.97));}
  if(kind==='party'){[523,659,784,1047].forEach((f,i)=>this.note(f,.18,.14*v,'square',i*.09));this.note(1047,.5,.11*v,'triangle',.38,1319);}
 }

 play(kind:'buy'|'upgrade'|'hit'|'ability'|'win'|'lose'){
  if(kind==='buy'){this.rustle(.06,.09,1900);this.note(587,.09,.08,'triangle');this.note(880,.12,.07,'sine',.05);this.meow();}
  if(kind==='upgrade'){[440,554,659,880,1175].forEach((f,i)=>this.note(f,.22,.085,'triangle',i*.06));}
  if(kind==='hit'){this.note(760,.07,.03,'triangle',0,340);this.rustle(.03,.02,1600);}
  if(kind==='ability'){this.rustle(.42,.09,2600);[330,440,659,880,1318].forEach((f,i)=>this.note(f,.32,.075,'sine',i*.038));}
  if(kind==='win'){this.comedy('party');[392,494,587,784,659,784,1047].forEach((f,i)=>this.note(f,.36,.095,'triangle',i*.12));setTimeout(()=>this.meow(),780);}
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
  if(kind==='archer'){this.note(380,.065,.028,'triangle',0,150);this.rustle(.035,.018,2600);}
  if(kind==='ice'){this.note(1245,.16,.028,'sine');this.note(1865,.12,.02,'triangle',.035);}
  if(kind==='bomber'){this.rustle(.22,.075,650);this.note(105,.22,.055,'sine',0,36);}
  if(kind==='witch'){this.note(195,.2,.025,'sine',0,440);this.note(290,.12,.016,'triangle',.05,145);}
  if(kind==='knight'){this.rustle(.06,.032,3800);this.note(860,.07,.022,'triangle',0,460);}
  if(kind==='uia'){this.note(220,.15,.055,'triangle',0,440);this.note(330,.12,.035,'sine',.09,660);}
  if(kind==='bard'){this.note(392,.28,.038,'triangle');this.note(587,.18,.024,'sine',.035);}
  if(kind==='engineer'){this.note(160,.11,.028,'sawtooth',0,780);this.rustle(.05,.022,3400);}
  if(['adminMage','astronomer','allyDuchess'].includes(kind)){this.note(660,.19,.045,'sine',0,990);this.note(330,.24,.025,'triangle',.05);}
  if(['pirate','allyAdmiral','allyKing'].includes(kind)){this.rustle(.22,.055,920);this.note(115,.22,.048,'triangle',0,38);}
  if(['samurai','boxer','guardian','allyRatazao'].includes(kind))this.note(410,.085,.032,'triangle',0,125);
  if(['alchemist','gardener','chef','allyHydra','allyLegollas','allyVacuum'].includes(kind))this.note(540,.13,.036,'sine',0,260);
  if(kind==='monk'){this.note(440,.16,.038,'sine',0,880);this.rustle(.11,.022,1500);}
 }

 observe(s:State){
  if(s.time<this.observedTime){
   this.lastShot=0;this.bossPhase=-1;this.casts.clear();this.comedyAfter=0;
   this.previousKills=0;this.previousHp=100;this.previousWave=0;this.seenBoss=0;
  }
  this.observedTime=s.time;if(s.paused||s.status!=='playing')return;
  if(s.wave>this.previousWave){
   this.previousWave=s.wave;
   this.waveHorn();
  }
  const big=s.enemies.find(e=>ENEMIES[e.kind].boss);
  if(big&&big.id!==this.seenBoss){this.seenBoss=big.id;this.comedy('boom');this.comedyAfter=s.time+3;}
  else if(s.time>this.comedyAfter){
   if(s.hp<this.previousHp){this.comedy(s.hp<=30?'scratch':'bonk');this.comedyAfter=s.time+4;}
   else if(Math.floor(s.kills/12)>Math.floor(this.previousKills/12)){this.comedy('party');this.comedyAfter=s.time+7;}
  }
  if(s.kills>this.previousKills&&s.kills%2===1){
   this.coinChime();
  }
  this.previousKills=s.kills;this.previousHp=s.hp;
  let count=0;for(const p of s.projectiles)if(p.id>this.lastShot){if(count++<3)this.attack(p.kind);this.lastShot=Math.max(this.lastShot,p.id);}
  for(const t of s.towers)if(['uia','monk','knight'].includes(t.kind)){if(t.casts>(this.casts.get(t.id)||0))this.attack(t.kind);this.casts.set(t.id,t.casts);}
  const boss=s.enemies.find(e=>e.kind==='legollas');
  if(boss&&boss.phase!==this.bossPhase){
   this.bossPhase=boss.phase;
   if(boss.phase===2||boss.phase===4){this.rustle(.6,.08,650);[147,196,233].forEach((f,i)=>this.note(f,.7,.045,'triangle',i*.06));}
  }
 }

 update(active:boolean){
  const c=this.ctx;if(!active||!c||c.state!=='running')return;
  if(c.currentTime>this.nextBird){
   this.nextBird=c.currentTime+8+Math.random()*8;
   this.note(1500,.12,.016,'sine',0,2100,true);
   this.note(1900,.15,.011,'sine',.17,1350,true);
  }
  if(c.currentTime<this.nextBeat)return;
  this.nextBeat=c.currentTime+.28;
  const chords=[[196,247,294],[175,220,262],[165,196,247],[147,185,220]],chord=chords[Math.floor(this.beat/16)%4],index=this.beat%16;
  if(index%2===0)this.note(chord[(index/2)%3]*2,.38,.1,'triangle',0,undefined,true);
  if(index%4===0)this.note(chord[0]/2,.55,.11,'sine',0,undefined,true);
  if(index===6||index===12||index===14)this.note(chord[2]*4,.24,.045,'sine',0,undefined,true);
  this.beat++;
 }
}

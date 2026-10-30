import type {CatKind,EnemyKind} from './types';

function makeReadyPlaceholder():HTMLImageElement{
 const c=typeof document!=='undefined'?document.createElement('canvas'):null;
 if(c){c.width=256;c.height=256;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#1b2838';ctx.fillRect(0,0,256,256);}}
 const img=new Image();
 Object.defineProperty(img,'complete',{value:true,writable:false});
 Object.defineProperty(img,'naturalWidth',{value:256,writable:false});
 Object.defineProperty(img,'naturalHeight',{value:256,writable:false});
 return img;
}

export const art={
 coast:makeReadyPlaceholder(),archive:makeReadyPlaceholder(),laterBosses:makeReadyPlaceholder(),roster:makeReadyPlaceholder(),
 villains:makeReadyPlaceholder(),adminSpells:makeReadyPlaceholder(),cats:makeReadyPlaceholder(),evolved:makeReadyPlaceholder(),
 extra:makeReadyPlaceholder(),enemies:makeReadyPlaceholder(),terrain:makeReadyPlaceholder(),town:makeReadyPlaceholder(),
 night:makeReadyPlaceholder(),uia:makeReadyPlaceholder(),legollas:makeReadyPlaceholder(),elemental:makeReadyPlaceholder()
};

// Tag each sheet so atlas() knows which 16-bit Pixel Art RPG sprite sheet is being drawn
const sheetTag=new Map<HTMLImageElement,string>([
 [art.cats,'cats'],
 [art.evolved,'evolved'],
 [art.extra,'extra'],
 [art.roster,'roster'],
 [art.uia,'uia'],
 [art.adminSpells,'adminSpells'],
 [art.elemental,'elemental'],
 [art.enemies,'enemies'],
 [art.villains,'villains'],
 [art.laterBosses,'laterBosses'],
 [art.legollas,'legollas'],
]);

export const artReady=Promise.resolve();

export const catFrame:Partial<Record<CatKind,number>>={
 archer:0,ice:1,bomber:2,knight:3,witch:4,commander:5,bard:0,monk:3,engineer:2,uia:6
};

export const enemyFrame:Partial<Record<EnemyKind,number>>={
 rat:0,runner:1,dog:2,armored:3,swarm:4,elite:5,ratazao:6,vacuum:7,king:8
};

const spriteCache=new Map<string,HTMLCanvasElement>();

interface HeroPalette {
 fur:string;
 furShade:string;
 hat:string;
 cape:string;
 weapon:string;
 glow:string;
 style:'hood'|'wizard'|'bandana'|'helmet'|'witch'|'crown'|'beret'|'halo'|'goggles'|'vortex';
}

const HERO_PALETTES:Record<string,HeroPalette>={
 'cats:0': {fur:'#f4a261',furShade:'#c87333',hat:'#2a9d8f',cape:'#1d6f65',weapon:'#e9c46a',glow:'#80ffdb',style:'hood'},      // Archer
 'cats:1': {fur:'#e2eafc',furShade:'#a3b8e0',hat:'#3a86ff',cape:'#1d4e89',weapon:'#72efdd',glow:'#90e0ef',style:'wizard'},    // Ice Mage
 'cats:2': {fur:'#6c757d',furShade:'#495057',hat:'#e63946',cape:'#9d0208',weapon:'#ffbe0b',glow:'#ff9f1c',style:'bandana'},   // Bomber
 'cats:3': {fur:'#f8f9fa',furShade:'#adb5bd',hat:'#ffd166',cape:'#264653',weapon:'#e0fbfc',glow:'#ffd166',style:'helmet'},    // Knight
 'cats:4': {fur:'#2b2d42',furShade:'#161724',hat:'#7209b7',cape:'#3c096c',weapon:'#f72585',glow:'#b5179e',style:'witch'},     // Witch
 'cats:5': {fur:'#e09f3e',furShade:'#9e6416',hat:'#d62828',cape:'#780000',weapon:'#fcbf49',glow:'#eae2b7',style:'crown'},     // Commander
 'cats:6': {fur:'#fff3b0',furShade:'#d4b459',hat:'#9b5de5',cape:'#f15bb5',weapon:'#00bbf9',glow:'#00f5d4',style:'vortex'},    // Uia
 'extra:0':{fur:'#f3c68f',furShade:'#b8844c',hat:'#06d6a0',cape:'#118ab2',weapon:'#ffd166',glow:'#83c5be',style:'beret'},     // Bard
 'extra:1':{fur:'#f4d58d',furShade:'#bf9742',hat:'#ff9f1c',cape:'#e76f51',weapon:'#70e000',glow:'#ccff33',style:'halo'},      // Monk
 'extra:2':{fur:'#bc6c25',furShade:'#7f4f24',hat:'#fca311',cape:'#14213d',weapon:'#4cc9f0',glow:'#a8dadc',style:'goggles'},   // Engineer
};

function buildPixelSprite(sheet:string,frame:number):HTMLCanvasElement{
 const key=`${sheet}:${frame}`;
 const cached=spriteCache.get(key);
 if(cached)return cached;

 const G=24; // 24x24 true 16-bit pixel grid scaled up crisply
 const work=document.createElement('canvas');
 work.width=G;work.height=G;
 const g=work.getContext('2d')!;
 g.imageSmoothingEnabled=false;

 const px=(x:number,y:number,w:number,h:number,col:string)=>{
  g.fillStyle=col;
  g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
 };

 const isEnemy=sheet==='enemies'||sheet==='villains'||sheet==='laterBosses'||sheet==='legollas';

 if(!isEnemy){
  // Determine Hero Palette
  const basePal=HERO_PALETTES[key]||HERO_PALETTES[`cats:${frame%6}`]||HERO_PALETTES['cats:0'];
  const isEvolved=sheet==='evolved'||sheet==='adminSpells'||sheet==='roster';
  const fur=basePal.fur,shade=basePal.furShade;
  const hat=isEvolved?'#ffd166':basePal.hat;
  const cape=isEvolved?'#7209b7':basePal.cape;
  const weapon=basePal.weapon,glow=basePal.glow;
  const bob=(frame%2===1)?-1:0;

  // Evolutions get a glowing pixel halo behind them
  if(isEvolved||sheet==='uia'||sheet==='elemental'){
   px(5,4+bob,14,14,glow+'44');
   px(4,9+bob,1,6,glow);
   px(19,9+bob,1,6,glow);
  }

  // Cape / Cloak back
  px(6,13+bob,12,7,cape);
  px(5,15+bob,14,5,cape);

  // Boots / Paws
  px(8,20,3,2,'#2b2538');
  px(13,20,3,2,'#2b2538');

  // Tunic / Armor Torso
  px(8,13+bob,8,7,hat);
  px(9,14+bob,6,5,cape);
  px(10,15+bob,4,2,'#ffd166'); // Belt buckle

  // Cat Ears
  px(7,5+bob,3,3,shade);
  px(8,6+bob,1,2,'#ff99ac');
  px(14,5+bob,3,3,shade);
  px(15,6+bob,1,2,'#ff99ac');

  // Cat Head
  px(7,7+bob,10,6,fur);
  px(7,11+bob,10,2,shade);

  // Expressive Pixel Eyes & Whiskers
  px(9,9+bob,2,2,'#141824');
  px(9,9+bob,1,1,'#ffffff');
  px(14,9+bob,2,2,'#141824');
  px(14,9+bob,1,1,'#ffffff');
  px(11,11+bob,2,1,'#ff758f'); // Nose

  // Class Hat / Helmet
  if(basePal.style==='wizard'||basePal.style==='witch'){
   px(5,6+bob,14,2,hat);
   px(8,4+bob,8,2,hat);
   px(10,2+bob,4,2,hat);
   px(11,1+bob,3,1,glow);
  }else if(basePal.style==='crown'||isEvolved){
   px(7,4+bob,10,3,'#ffd166');
   px(7,3+bob,2,1,'#ffd166');
   px(11,2+bob,2,2,'#ff0054');
   px(15,3+bob,2,1,'#ffd166');
  }else if(basePal.style==='helmet'){
   px(7,5+bob,10,3,'#ced4da');
   px(11,3+bob,2,3,glow);
  }else if(basePal.style==='hood'){
   px(6,5+bob,12,3,hat);
   px(6,7+bob,2,4,hat);
  }else{
   px(7,5+bob,10,2,hat);
   px(16,6+bob,3,2,glow);
  }

  // Right-hand Pixel Weapon / Arcane Implement
  px(18,10+bob,2,9,'#6c462f'); // Staff/Bow shaft
  px(17,8+bob,4,3,weapon);
  px(18,7+bob,2,2,glow);
  // Left-hand Shield or Orb
  px(4,13+bob,3,4,weapon);
  px(5,14+bob,1,2,glow);
 }else{
  // Enemy 16-bit Pixel Art Monster Sprites
  const enemyPalettes=[
   {body:'#7f8c8d',armor:'#c0392b',eye:'#ffbe0b',horn:'#bdc3c7',boss:false}, // 0: Rat Raider
   {body:'#5c6b73',armor:'#00b4d8',eye:'#90e0ef',horn:'#e0fbfc',boss:false}, // 1: Swift Runner
   {body:'#8d5524',armor:'#495057',eye:'#ff595e',horn:'#adb5bd',boss:false}, // 2: Hound / Boar
   {body:'#4a4e69',armor:'#9a8c98',eye:'#ff9f1c',horn:'#f2e9e4',boss:false}, // 3: Iron Armored
   {body:'#3c096c',armor:'#9d4edd',eye:'#00f5d4',horn:'#e0aaff',boss:false}, // 4: Void Swarm
   {body:'#6a040f',armor:'#faa307',eye:'#ff0054',horn:'#ffba08',boss:true},  // 5: Elite Warlord
   {body:'#370617',armor:'#dc2f02',eye:'#ffbe0b',horn:'#ffd166',boss:true},  // 6: Ratazao Brute
   {body:'#1d3557',armor:'#457b9d',eye:'#00f5d4',horn:'#a8dadc',boss:true},  // 7: Clockwork Golem
   {body:'#240046',armor:'#ffd166',eye:'#ff007f',horn:'#00f5d4',boss:true},  // 8: Rat King Boss
  ];
  const ep=enemyPalettes[frame%enemyPalettes.length];
  const isBoss=ep.boss||sheet==='laterBosses';

  // Monster Horns / Crown
  if(isBoss){
   px(6,3,12,3,'#ffd166');
   px(6,2,2,1,'#ffd166');
   px(11,1,2,2,'#ff0054');
   px(16,2,2,1,'#ffd166');
  }else{
   px(6,5,3,3,ep.horn);
   px(15,5,3,3,ep.horn);
  }

  // Hulking Body & Armor
  px(5,12,14,8,ep.armor);
  px(6,7,12,7,ep.body);
  px(7,19,4,3,'#1b1f2a');
  px(13,19,4,3,'#1b1f2a');

  // Glowing Menacing Eyes & Fangs
  px(8,9,3,2,ep.eye);
  px(13,9,3,2,ep.eye);
  px(9,12,1,2,'#ffffff');
  px(14,12,1,2,'#ffffff');

  // Monster Weapon (Spiked Club / Halberd)
  px(2,8,3,10,'#5c4033');
  px(1,6,5,4,ep.horn);
  px(18,11,4,5,ep.armor);
 }

 // Pass 2: Crisp 1px Dark Pixel Outline around all opaque pixels
 const imgData=g.getImageData(0,0,G,G),d=imgData.data;
 const alpha=new Uint8Array(G*G);
 for(let i=0;i<d.length;i+=4){
  if(d[i+3]>40)alpha[i>>2]=1;
 }
 for(let y=1;y<G-1;y++){
  for(let x=1;x<G-1;x++){
   const idx=y*G+x;
   if(alpha[idx])continue;
   if(alpha[idx-1]||alpha[idx+1]||alpha[idx-G]||alpha[idx+G]){
    const p=idx*4;
    d[p]=14;d[p+1]=18;d[p+2]=28;d[p+3]=255;
   }
  }
 }
 g.putImageData(imgData,0,0);

 // Upscale 3x with nearest-neighbor to 72x72 cached canvas for ultra-sharp blitting
 const out=document.createElement('canvas');
 out.width=72;out.height=72;
 const oc=out.getContext('2d')!;
 oc.imageSmoothingEnabled=false;
 oc.drawImage(work,0,0,72,72);

 spriteCache.set(key,out);
 return out;
}

export function atlas(
 c:CanvasRenderingContext2D,img:HTMLImageElement,_cols:number,_rows:number,
 frame:number,x:number,y:number,width:number,height:number
){
 const tag=sheetTag.get(img)||'cats';
 const sprite=buildPixelSprite(tag,frame);
 const prev=c.imageSmoothingEnabled;
 c.imageSmoothingEnabled=false;
 c.drawImage(sprite,Math.round(x),Math.round(y),Math.round(width),Math.round(height));
 c.imageSmoothingEnabled=prev;
}

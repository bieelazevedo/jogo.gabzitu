type Contact={id:number;clientX:number;clientY:number};
type Surface=EventTarget&{setPointerCapture?:(id:number)=>void};
type Hooks={start:(x:number,y:number)=>void;move:(x:number,y:number)=>void;end:()=>void};
/** Touch owns the gesture on Safari; pointer capture remains a fallback, never a second owner. */
export function bindThumbstick(surface:Surface,documentEvents:EventTarget,lifecycle:EventTarget,hooks:Hooks){
 let owner:{kind:'pointer'|'touch';id:number;touch?:boolean}|null=null;
 const disposers:(()=>void)[]=[];
 const listen=(target:EventTarget,type:string,listener:(e:any)=>void)=>{target.addEventListener(type,listener,{capture:true,passive:false});disposers.push(()=>target.removeEventListener(type,listener,true));};
 const prevent=(e:Event)=>{if(e.cancelable)e.preventDefault();};
 const reset=()=>{if(!owner)return;owner=null;hooks.end();};
 listen(surface,'pointerdown',(e:PointerEvent)=>{if(owner||e.pointerType==='mouse'&&e.button!==0)return;prevent(e);owner={kind:'pointer',id:e.pointerId,touch:e.pointerType==='touch'};hooks.start(e.clientX,e.clientY);hooks.move(e.clientX,e.clientY);try{surface.setPointerCapture?.(e.pointerId);}catch{/* document listeners keep the gesture alive */}});
 listen(surface,'touchstart',(e:TouchEvent)=>{if(owner&&!(owner.kind==='pointer'&&owner.touch))return;const t=Array.from(e.changedTouches)[0];if(!t)return;prevent(e);const alreadyStarted=!!owner;owner={kind:'touch',id:t.identifier};if(!alreadyStarted)hooks.start(t.clientX,t.clientY);hooks.move(t.clientX,t.clientY);});
 listen(documentEvents,'pointermove',(e:PointerEvent)=>{if(owner?.kind!=='pointer'||owner.id!==e.pointerId)return;prevent(e);hooks.move(e.clientX,e.clientY);});
 const pointerEnd=(e:PointerEvent)=>{if(owner?.kind==='pointer'&&owner.id===e.pointerId)reset();};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(documentEvents,type,pointerEnd);
 listen(documentEvents,'touchmove',(e:TouchEvent)=>{if(owner?.kind!=='touch')return;const id=owner.id,t=Array.from(e.changedTouches).find(t=>t.identifier===id);if(!t)return;prevent(e);hooks.move(t.clientX,t.clientY);});
 const touchEnd=(e:TouchEvent)=>{if(owner?.kind!=='touch')return;const id=owner.id;if(Array.from(e.changedTouches).some(t=>t.identifier===id))reset();};
 for(const type of ['touchend','touchcancel'])listen(documentEvents,type,touchEnd);
 listen(lifecycle,'blur',reset);
 listen(documentEvents,'visibilitychange',()=>{if((documentEvents as Document).hidden)reset();});
 return ()=>{reset();disposers.forEach(dispose=>dispose());};
}

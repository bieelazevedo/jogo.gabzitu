import {it,expect} from 'vitest';
import {bindThumbstick} from '../src/thumbstick-input';
import {nightMovement} from '../src/night-camera';
import {createNight,nightIdle,nightStep} from '../src/night-simulation';
it('o gesto Safari chega à simulação mesmo após pointercancel e toque do ataque',()=>{
 const pad=new EventTarget(),doc=new EventTarget(),win=new EventTarget(),input=nightIdle();
 const state=createNight([{id:'human',name:'Teste',classId:'blade',bot:false}]);const start={x:state.players[0].x,z:state.players[0].z};
 const stop=bindThumbstick(pad,doc,win,{start:()=>{},move:(x,y)=>Object.assign(input,nightMovement(x/52,y/52,0)),end:()=>{input.x=input.z=0;}});
 const fire=(target:EventTarget,type:string,props:Record<string,unknown>)=>target.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),props));
 fire(pad,'pointerdown',{pointerId:2,pointerType:'touch',clientX:0,clientY:0});fire(pad,'touchstart',{changedTouches:[{identifier:0,clientX:0,clientY:0}]});fire(doc,'pointercancel',{pointerId:2});
 fire(doc,'touchmove',{changedTouches:[{identifier:0,clientX:0,clientY:-52}]});fire(doc,'touchend',{changedTouches:[{identifier:1}]});
 for(let i=0;i<20;i++)nightStep(state,[input],.05);
 expect(Math.hypot(state.players[0].x-start.x,state.players[0].z-start.z)).toBeGreaterThan(2);expect(input.z).toBe(-1);fire(doc,'touchend',{changedTouches:[{identifier:0}]});expect(input.z).toBe(0);stop();
});

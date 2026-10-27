import {it,expect,vi} from 'vitest';
import {bindThumbstick} from '../src/thumbstick-input';
function fixture(){const pad=new EventTarget(),doc=new EventTarget(),win=new EventTarget(),hooks={start:vi.fn(),move:vi.fn(),end:vi.fn()},stop=bindThumbstick(pad,doc,win,hooks);return {pad,doc,win,hooks,stop};}
function fire(target:EventTarget,type:string,props:Record<string,unknown>){const event=Object.assign(new Event(type,{cancelable:true}),props);target.dispatchEvent(event);return event;}
const finger=(identifier:number,x=10,y=20)=>({identifier,clientX:x,clientY:y});
it('Safari transfere pointer para touch sem reiniciar e ignora pointercancel posterior',()=>{
 const {pad,doc,hooks}=fixture();fire(pad,'pointerdown',{pointerId:7,pointerType:'touch',clientX:10,clientY:20});fire(pad,'touchstart',{changedTouches:[finger(0)]});
 fire(doc,'pointercancel',{pointerId:7});fire(doc,'touchmove',{changedTouches:[finger(0,40,60)]});expect(hooks.start).toHaveBeenCalledTimes(1);expect(hooks.end).not.toHaveBeenCalled();expect(hooks.move).toHaveBeenLastCalledWith(40,60);
 fire(doc,'touchend',{changedTouches:[finger(0)]});expect(hooks.end).toHaveBeenCalledTimes(1);
});
it('o dedo do ataque não termina nem rouba o dedo do movimento',()=>{
 const {pad,doc,hooks}=fixture();fire(pad,'touchstart',{changedTouches:[finger(0)]});fire(pad,'touchstart',{changedTouches:[finger(1,200,200)]});fire(doc,'touchend',{changedTouches:[finger(1)]});expect(hooks.end).not.toHaveBeenCalled();fire(doc,'touchmove',{changedTouches:[finger(0,30,40)]});expect(hooks.move).toHaveBeenLastCalledWith(30,40);
});
it('perder foco liberta e permite um novo gesto; limpeza retira listeners',()=>{
 const {pad,doc,win,hooks,stop}=fixture();const down=()=>fire(pad,'pointerdown',{pointerId:4,pointerType:'mouse',button:0,clientX:0,clientY:0});down();fire(win,'blur',{});expect(hooks.end).toHaveBeenCalledTimes(1);down();expect(hooks.start).toHaveBeenCalledTimes(2);stop();const count=hooks.move.mock.calls.length;fire(doc,'pointermove',{pointerId:4,clientX:40,clientY:50});expect(hooks.move).toHaveBeenCalledTimes(count);
});
it('continua fora da área inicial com pointer sem exigir captura disponível',()=>{
 const {pad,doc,hooks}=fixture();fire(pad,'pointerdown',{pointerId:8,pointerType:'touch',clientX:10,clientY:20});fire(doc,'pointermove',{pointerId:8,clientX:120,clientY:180});expect(hooks.move).toHaveBeenLastCalledWith(120,180);fire(doc,'pointerup',{pointerId:8});expect(hooks.end).toHaveBeenCalledOnce();
});

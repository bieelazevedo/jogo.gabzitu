/** Suppress browser magnification on game surfaces; leave login and ordinary pages accessible. */
export function installGameTouchGuard(){
 const gameSelector='.game-shell,.hunt,.farm';
 const inGame=(event:Event)=>{const target=event.target;return target instanceof Element?!!target.closest(gameSelector):!!document.querySelector(gameSelector);};
 const cancelGesture=(event:Event)=>{if(inGame(event)&&event.cancelable)event.preventDefault();};
 // Safari's native pinch events are separate from pointer events used by the game camera.
 for(const type of ['gesturestart','gesturechange','gestureend','dblclick'])document.addEventListener(type,cancelGesture,{capture:true,passive:false});
 return ()=>{for(const type of ['gesturestart','gesturechange','gestureend','dblclick'])document.removeEventListener(type,cancelGesture,true);};
}

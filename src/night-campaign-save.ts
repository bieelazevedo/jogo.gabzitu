import {validNightState,type NightState} from './night-simulation';
const key=(identity?:string)=>'night-campaign-checkpoint-v1:'+(identity||'guest');
const unfinished=(s:NightState)=>['explore','boss','sanctuary'].includes(s.phase)&&s.players.some(p=>p.hp>0);
/** Local, account-scoped solo checkpoint. No account tokens or network state are persisted. */
export function saveNightCampaign(identity:string|undefined,state:NightState){
 if(!identity)return false;
 if(!unfinished(state)||!validNightState(state))return false;
 try{const text=JSON.stringify({format:1,savedAt:new Date().toISOString(),state});if(text.length>180000)return false;localStorage.setItem(key(identity),text);return true;}catch{return false;}
}
export function readNightCampaign(identity?:string):{savedAt:string;state:NightState}|null{
 if(!identity)return null;
 try{const text=localStorage.getItem(key(identity));if(!text||text.length>180000)return null;const value=JSON.parse(text);return value.format===1&&typeof value.savedAt==='string'&&validNightState(value.state)&&unfinished(value.state)?value:null;}catch{return null;}
}
export function clearNightCampaign(identity?:string){try{localStorage.removeItem(key(identity));}catch{}}

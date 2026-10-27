import {it,expect,vi,afterEach} from 'vitest';
import {createNight} from '../src/night-simulation';
import {saveNightCampaign,readNightCampaign,clearNightCampaign} from '../src/night-campaign-save';
afterEach(()=>vi.unstubAllGlobals());
it('guarda uma campanha inacabada por conta e recusa estados terminados ou corrompidos',()=>{
 const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)});
 const s=createNight([{id:'hero',name:'Teste',classId:'blade',bot:false}]);s.players[0].gold=321;
 expect(saveNightCampaign('a',s)).toBe(true);expect(readNightCampaign('a')!.state.players[0].gold).toBe(321);expect(readNightCampaign('b')).toBe(null);
 s.phase='won';expect(saveNightCampaign('a',s)).toBe(false);clearNightCampaign('a');expect(readNightCampaign('a')).toBe(null);
 data.set('night-campaign-checkpoint-v1:a','{broken');expect(readNightCampaign('a')).toBe(null);
});

import {it,expect,vi,afterEach} from 'vitest';
import {fresh,load,persist,setSaveScope} from '../src/persistence';
import {readCheckpoint,storeCheckpoint} from '../src/checkpoint';
import {createNight} from '../src/night-simulation';
import {readNightCampaign,saveNightCampaign} from '../src/night-campaign-save';
afterEach(()=>{setSaveScope(null);vi.unstubAllGlobals();});
it('convidados não leem nem escrevem progresso de contas ou sessões anteriores',()=>{
 const getItem=vi.fn(),setItem=vi.fn(),removeItem=vi.fn();vi.stubGlobal('localStorage',{getItem,setItem,removeItem});
 setSaveScope(null,true);expect(load().stars).toEqual({});const save=fresh();save.stars[1]=3;expect(persist(save)).toBe(true);
 expect(readCheckpoint()).toBeNull();storeCheckpoint(null);expect(readNightCampaign()).toBeNull();expect(saveNightCampaign(undefined,createNight([{id:'guest',name:'Guest',classId:'blade',bot:false}]))).toBe(false);
 expect(getItem).not.toHaveBeenCalled();expect(setItem).not.toHaveBeenCalled();expect(removeItem).not.toHaveBeenCalled();
});
it('entrar numa conta volta a permitir a gravação apenas no espaço dessa conta',()=>{
 const setItem=vi.fn();vi.stubGlobal('localStorage',{getItem:vi.fn(),setItem});setSaveScope(null,true);persist(fresh());setSaveScope('account-id');persist(fresh());expect(setItem).toHaveBeenCalledTimes(1);expect(setItem.mock.calls[0][0]).toBe('muralhas-bigodes-v2:account-id');
});

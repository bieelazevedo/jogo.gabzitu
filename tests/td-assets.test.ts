import {it,expect,vi} from 'vitest';
import * as T from 'three';
const {urls}=vi.hoisted(()=>({urls:[] as string[]}));
vi.mock('../src/game-gltf',()=>({gameGLTFLoader:()=>({setMeshoptDecoder(){},loadAsync:async(url:string)=>{urls.push(url);return {scene:new T.Group(),animations:[]};}})}));
import {loadNightAssets,loadExtraPack,nightAssets} from '../src/night-assets';
it('Tower Defense não carrega heróis modernos nem os pacotes exclusivos do Nightreign',async()=>{const assets=await loadNightAssets('td');await loadExtraPack('hex','td');expect(assets.modern).toBeUndefined();expect(nightAssets()).toBeNull();expect(urls.some(u=>u.includes('/modern/'))).toBe(false);expect(urls.some(u=>/medieval|authored-weapons/.test(u))).toBe(false);expect(urls.some(u=>u.endsWith('/hex.glb'))).toBe(true);expect(urls.some(u=>u.endsWith('/Knight.glb'))).toBe(true);});

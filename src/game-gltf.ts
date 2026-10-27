import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
export function appleWebKit(nav:Pick<Navigator,'userAgent'|'platform'|'maxTouchPoints'>|undefined=typeof navigator==='undefined'?undefined:navigator){return !!nav&&(/iPad|iPhone|iPod/.test(nav.userAgent)||/Mac/.test(nav.platform)&&nav.maxTouchPoints>1||/Safari/.test(nav.userAgent)&&!/Chrome|Chromium|Android/.test(nav.userAgent));}
let active=0;const waiting:(()=>void)[]=[];
export async function limitModelLoads<A>(task:()=>Promise<A>):Promise<A>{if(active<3)active++;else await new Promise<void>(resolve=>waiting.push(resolve));try{return await task();}finally{const next=waiting.shift();if(next)next();else active--;}}
/** Keep Safari textures in HTMLImageElement storage, avoiding its ImageBitmap memory/black-texture path. */
export function gameGLTFLoader(){const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);if(appleWebKit())loader.register(parser=>{(parser as unknown as {textureLoader:T.TextureLoader}).textureLoader=new T.TextureLoader(loader.manager).setCrossOrigin(loader.crossOrigin).setRequestHeader(loader.requestHeader);return {name:'GAME_WEBKIT_IMAGE_LOADER'};});const load=loader.loadAsync.bind(loader);loader.loadAsync=(url,onProgress)=>limitModelLoads(()=>load(url,onProgress));return loader;}

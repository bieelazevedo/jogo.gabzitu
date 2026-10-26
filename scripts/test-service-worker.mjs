import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const handlers={},entries=new Map();let activated=false;const cache={put:async(k,r)=>entries.set(k,r),match:async k=>entries.get(typeof k==='string'?k:new URL(k.url).pathname)?.clone()};
const redirected=()=>{const r=new Response('<div id="app"></div>',{headers:{'Content-Type':'text/html'}});Object.defineProperty(r,'redirected',{value:true});return r;};
const context={Response,Headers,URL,Promise,Error,fetch:async()=>redirected(),caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},self:{location:{origin:'https://game.test'},addEventListener:(k,fn)=>handlers[k]=fn,skipWaiting:async()=>{activated=true;}}};
vm.runInNewContext(fs.readFileSync('dist/sw.js','utf8'),context);
let install;handlers.install({waitUntil:p=>install=p});await install;assert(activated);for(const r of entries.values())assert.equal(r.redirected,false);
async function navigate(){let result;handlers.fetch({request:{method:'GET',url:'https://game.test/',mode:'navigate'},respondWith:p=>result=p});const r=await result;assert.equal(r.redirected,false);assert.match(await r.text(),/id="app"/);}
await navigate();entries.set('/index.html',redirected());await navigate();context.fetch=async()=>{throw Error('offline')};await navigate();console.log('PASS: redirected precache, legacy cached navigation and offline fallback all return clean responses; repair activates without app boot.');

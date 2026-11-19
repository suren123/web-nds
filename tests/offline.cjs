const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'../dist')+'/',origin='https://court.test/';
(async()=>{
 const listeners={},cacheMap=new Map();let network=true;
 const caches={async open(name){if(!cacheMap.has(name))cacheMap.set(name,new Map());const c=cacheMap.get(name);return {async match(r){return c.get(typeof r==='string'?r:r.url)?.clone();},async put(r,v){c.set(typeof r==='string'?r:r.url,v.clone());}};},async keys(){return [...cacheMap.keys()];},async delete(k){return cacheMap.delete(k);}};
 const context={caches,URL,Request,DataView,Promise,fetch:async r=>{if(!network)throw Error('offline');const u=new URL(typeof r==='string'?r:r.url);const data=fs.readFileSync(root+u.pathname.slice(1));const res=new Response(data);Object.defineProperty(res,'url',{value:u.href});return res;},self:{registration:{scope:origin},location:{origin:'https://court.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(t,fn)=>listeners[t]=fn}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(root+'sw.js','utf8'),context);
 let p;listeners.install({waitUntil:x=>p=x});await p;listeners.activate({waitUntil:x=>p=x});await p;
 let status;listeners.message({data:{type:'status'},ports:[{postMessage:d=>status=d}],waitUntil:x=>p=x});await p;assert.equal(status.ready,true);
 network=false;
 let response;listeners.fetch({request:{url:origin,method:'GET',mode:'navigate'},respondWith:x=>response=x});assert.match(await(await response).text(),/随心掌机/);
 const files=['app.mjs?v=8','layout.mjs?v=8','editor.mjs?v=8','emulator.mjs','storage.mjs','nds-worker.js','audio-worklet.js','core/nds.js','core/nds.wasm'];for(const f of files){listeners.fetch({request:{url:origin+f,method:'GET'},respondWith:x=>response=x});assert.ok((await(await response).arrayBuffer()).byteLength>0);}
 let intercepted=false;listeners.fetch({request:{url:'https://elsewhere.test/auth',method:'GET'},respondWith(){intercepted=true;}});assert.equal(intercepted,false);
 cacheMap.values().next().value.delete(origin+'core/nds.wasm');listeners.message({data:{type:'status'},ports:[{postMessage:d=>status=d}],waitUntil:x=>p=x});await p;assert.equal(status.ready,false);
 network=true;listeners.message({data:{type:'status',repair:true},ports:[{postMessage:d=>status=d}],waitUntil:x=>p=x});await p;assert.equal(status.ready,true);
 listeners.fetch({request:{url:origin+'update.html?v=8',method:'GET',mode:'navigate'},respondWith:x=>response=x});assert.match(await(await response).text(),/NDS 游戏库 <span class="build-label">v8/);
 network=false;listeners.fetch({request:{url:origin+'update.html?v=8',method:'GET',mode:'navigate'},respondWith:x=>response=x});const updateHTML=await(await response).text();assert.ok(!updateHTML.includes('id="rotate"'));assert.match(updateHTML,/id="portraitHint"/);
 console.log('PASS update entry: new version online and cached fallback offline; no portrait blocking overlay');
 console.log('PASS offline handlers: complete local install, offline app/navigation/worker/WASM responses, missing cache detection, repair and origin isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});

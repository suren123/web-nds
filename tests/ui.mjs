import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {indexedDB} from 'fake-indexeddb';
import fs from 'node:fs';
const els=new Map(),arrays=new Map(),windowEvents={},documentEvents={};
class Element{
 constructor(tag='DIV'){this.tagName=tag;this.listeners={};this.children=[];this.value='';this.dataset={};this.open=false;const c=new Set();this.classList={add(...v){v.forEach(x=>c.add(x));},remove(...v){v.forEach(x=>c.delete(x));},contains:v=>c.has(v)};}
 set id(v){this._id=v;els.set('#'+v,this);}get id(){return this._id;}
 append(...children){this.children.push(...children);}replaceChildren(){this.children=[];}
 setAttribute(k,v){this[k]=v;}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}emit(k,e){for(const f of this.listeners[k]||[])f(e);}
 getBoundingClientRect(){return {left:0,top:0,width:874,height:402};}setPointerCapture(){}showModal(){this.open=true;}close(){this.open=false;this.emit('close',{});}click(){this.onclick?.();}
}
const el=id=>{if(!els.has(id))els.set(id,new Element());return els.get(id);};
for(const [key,values]of [['comboInput',['a','b','x','y','l','r','start','select']],['selectControl',['dpad','a','b','x','y','comboA','comboB','custom3','custom4','l','r','menu','select','start','swap']],['align',['horizontal','vertical','space-x','space-y']]]){
 const attr=key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),items=values.map(v=>{const e=new Element();e.dataset[key]=v;els.set('[data-'+attr+'="'+v+'"]',e);return e;});arrays.set('[data-'+attr+']',items);
}
const board=createCanvas(874,402);board.listeners={};for(const k of ['addEventListener','emit','getBoundingClientRect','setPointerCapture'])board[k]=Element.prototype[k];els.set('#board',board);
globalThis.document={querySelector:el,querySelectorAll:s=>arrays.get(s)||[],createElement:t=>t==='canvas'?createCanvas(1,1):new Element(t.toUpperCase()),body:new Element(),documentElement:new Element(),addEventListener(k,f){(documentEvents[k]??=[]).push(f);}};
globalThis.window={addEventListener(k,f){(windowEvents[k]??=[]).push(f);}};globalThis.indexedDB=indexedDB;globalThis.devicePixelRatio=1;
let frame,copied,worker,savedLayout;globalThis.requestAnimationFrame=f=>frame=f;globalThis.localStorage={getItem(){return null;},setItem(k,v){savedLayout=v;}};
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{async writeText(v){copied=JSON.parse(v);}}},configurable:true});
globalThis.Worker=class{constructor(){worker=this;this.messages=[];queueMicrotask(()=>this.onmessage({data:{type:'ready'}}));}postMessage(d){this.messages.push(d);if(d.type==='load')queueMicrotask(()=>this.onmessage({data:{type:'loaded'}}));if(d.type==='save')queueMicrotask(()=>this.onmessage({data:{type:'save',id:d.id,bytes:new Uint8Array()}}));}terminate(){}};
const {dbPut}=await import('../dist/storage.mjs');const header=new Uint8Array(1024),view=new DataView(header.buffer);view.setUint32(0x20,512,true);view.setUint32(0x2c,4,true);view.setUint32(0x30,516,true);view.setUint32(0x3c,4,true);const file=new File([header],'test.nds');await dbPut('recent',{file,name:file.name});
await import('../dist/app.mjs');
if(process.env.COURT_RENDER_PATH){frame();fs.writeFileSync(process.env.COURT_RENDER_PATH,board.toBuffer('image/png'));}
const exportState=async()=>{await el('#copy').onclick();return copied.layout;};const select=id=>el('#selected').onchange({target:{value:id}});const input=(id,value)=>el('#'+id).oninput({target:{value:String(value)}});
let s=await exportState();assert.equal(s.version,3);assert.equal(s.buttons.length,10);
select('custom4');assert.equal(el('#customEditor').hidden,false);
for(const box of arrays.get('[data-combo-input]'))box.checked=['x','y','l'].includes(box.dataset.comboInput);arrays.get('[data-combo-input]')[0].onchange();el('#customName').onchange({target:{value:'双打'}});s=await exportState();assert.deepEqual(s.buttons.find(b=>b.id==='custom4').inputs,['l','x','y']);assert.equal(s.buttons.find(b=>b.id==='custom4').customLabel,'双打');
input('c-circleSize',70);s=await exportState();assert.ok(s.faces.every(f=>f.size===70));assert.ok(s.buttons.filter(b=>['comboA','comboB','custom3','custom4'].includes(b.id)).every(b=>b.width===70&&b.height===70));
select('menu');input('c-width',90);s=await exportState();assert.ok(s.buttons.filter(b=>['menu','select','start','swap'].includes(b.id)).every(b=>b.width===90));select('l');input('c-height',48);s=await exportState();assert.ok(s.buttons.filter(b=>['l','r'].includes(b.id)).every(b=>b.height===48));
input('allOpacity',40);s=await exportState();assert.equal(s.controlsOpacity,40);assert.ok([...s.faces,...s.buttons].every(b=>b.opacity===40));
el('#eightRows').onclick();s=await exportState();const circles=[...s.faces.map(f=>({...f,width:f.size,height:f.size})),...s.buttons.filter(b=>['comboA','comboB','custom3','custom4'].includes(b.id))];assert.equal(new Set(circles.map(r=>r.y)).size,2);
frame();const bufferSize=[board.width,board.height];
// Rotation changes CSS geometry, never the backing store or saved layout coordinates.
const layoutBeforeRotation=await exportState();
for(const [width,height]of [[402,185],[650,299],[874,402]]){board.getBoundingClientRect=()=>({left:0,top:0,width,height});frame();assert.deepEqual([board.width,board.height],bufferSize);}
assert.deepEqual(await exportState(),layoutBeforeRotation);
const event=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,preventDefault(){}}),center=id=>{const b=circles.find(r=>r.id===id);return{x:b.x+b.width/2,y:b.y+b.height/2};};
await el('#recentROM').onclick();const lastInput=()=>worker.messages.filter(m=>m.type==='input').at(-1);
const a=center('comboA'),b=center('comboB');board.emit('pointerdown',event(a.x,a.y,1));assert.equal(lastInput().mask,(1<<7)|(1<<10)|(1<<11));board.emit('pointerdown',event(b.x,b.y,2));assert.equal(lastInput().mask,(1<<7)|(1<<6)|(1<<10)|(1<<11));board.emit('pointerup',event(a.x,a.y,1));assert.equal(lastInput().mask,(1<<6)|(1<<10)|(1<<11));board.emit('pointerup',event(b.x,b.y,2));assert.equal(lastInput().mask,0);
const c=center('custom4');board.emit('pointerdown',event(c.x,c.y,3));assert.equal(lastInput().mask,(1<<8)|(1<<9)|(1<<10));board.emit('pointerup',event(c.x,c.y,3));
// Editor controls and drag keep position independent from group size.
el('#open').onclick();el('#snapEnabled').onchange({target:{checked:false}});el('#editPositions').onclick();const originalA=circles.find(r=>r.id==='a'),ap=center('a');board.emit('pointerdown',event(ap.x,ap.y));board.emit('pointermove',event(ap.x-20,ap.y-10));board.emit('pointerup',event(ap.x-20,ap.y-10));s=await exportState();assert.equal(s.faces.find(r=>r.id==='a').x,originalA.x-20);assert.equal(s.faces.find(r=>r.id==='a').y,originalA.y-10);
el('#selectEight').onclick();el('[data-align="horizontal"]').onclick();s=await exportState();assert.equal(new Set([...s.faces,...s.buttons.filter(b=>['comboA','comboB','custom3','custom4'].includes(b.id))].map(b=>b.y)).size,1);
el('#undo').onclick();el('#close').onclick();assert.equal(worker.messages.at(-1).type,'resume');
// Exported schema can be imported without losing assignments or group dimensions.
const exported=await exportState();el('#file').onchange({target:{files:[{size:1000,async text(){return JSON.stringify({layout:exported});}}],value:''}});await new Promise(r=>setTimeout(r,0));assert.deepEqual(await exportState(),exported);
frame();console.log('PASS UI: custom checkbox assignment/name, synchronized dimension groups, opacity, eight-key preset, real input bridge/shared release, free dragging, multiselect alignment/undo and JSON round trip');


await new Promise(r=>setTimeout(r,200));assert.deepEqual(JSON.parse(savedLayout),await exportState());console.log('PASS local layout persistence and stable canvas buffers through rotation');

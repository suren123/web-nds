/* 随心掌机 adapter. DeSmuME-wasm core: see core/NOTICE.html. */
let ready=false,loaded=false,running=false,mask=0,touch=null,next=0,timer,frames=0,fpsStart=0,saveDirty=false,loading=false;
const FRAME_MS=1000/60;
var Module={locateFile:p=>'core/'+p,print:()=>{},printErr:()=>{},onAbort:()=>postMessage({type:'error',message:'模拟器内核停止，请重新载入游戏'})};
function wasmReady(){ready=true;postMessage({type:'ready'});}
importScripts('core/nds.js');
function sendSave(id){if(!loaded){postMessage({type:'save',id,bytes:new Uint8Array(0)});return;}const size=Module._savGetSize();if(size){const p=Module._savGetPointer(0),bytes=Module.HEAPU8.slice(p,p+size);postMessage({type:'save',id,bytes},[bytes.buffer]);}else postMessage({type:'save',id,bytes:new Uint8Array(0)});saveDirty=false;}
function loop(){
 if(!running)return;
 try{
  const now=performance.now();if(now<next){timer=setTimeout(loop,next-now);return;}
  if(now-next>100)next=now;
  Module._runFrame(1,mask,touch?1:0,touch?.x||0,touch?.y||0);
  const p=Module._getSymbol(4),pixels=Module.HEAPU8.slice(p,p+256*384*4);
  const count=Module._fillAudioBuffer(4096),a=Module._getSymbol(6);
  const audio=new Int16Array(Module.HEAPU8.buffer,a,count*2).slice();
  postMessage({type:'frame',pixels,audio},[pixels.buffer,audio.buffer]);
  if(Module._savUpdateChangeFlag())saveDirty=true;
  frames++;if(frames%120===0){const t=performance.now();postMessage({type:'fps',value:120000/(t-fpsStart)});fpsStart=t;if(saveDirty)sendSave();}
  next+=FRAME_MS;timer=setTimeout(loop,Math.max(0,next-performance.now()));
 }catch(e){running=false;postMessage({type:'error',message:'游戏运行失败：'+e.message});}
}
onmessage=async({data:d})=>{
 try{
  if(d.type==='load'){
   if(!ready||loading||loaded)throw Error('内核尚未准备好');loading=true;
   const ptr=Module._prepareRomBuffer(d.file.size);if(!ptr)throw Error('内存不足，请关闭其他页面');
   for(let n=0;n<d.file.size;n+=4194304){const b=await d.file.slice(n,n+4194304).arrayBuffer();Module.HEAPU8.set(new Uint8Array(b),ptr+n);}
   if(d.save?.length)Module.HEAPU8.set(d.save,Module._savGetPointer(d.save.length));
   Module._savUpdateChangeFlag();const code=Module._loadROM(d.file.size);
   if(code!==1)throw Error(code===-1001?'此游戏文件已加密，当前内核无法读取':'游戏载入失败，代码 '+code);
   loading=false;loaded=true;postMessage({type:'loaded'});
  }else if(d.type==='input'){mask=d.mask;touch=d.touch;}
  else if(d.type==='resume'&&loaded&&!running){running=true;next=performance.now();fpsStart=next;frames=0;loop();}
  else if(d.type==='pause'){running=false;clearTimeout(timer);mask=0;touch=null;if(loaded)sendSave(d.id);}
  else if(d.type==='save')sendSave(d.id);
 }catch(e){loading=false;postMessage({type:'error',message:e.message});}
};
